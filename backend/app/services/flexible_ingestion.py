from __future__ import annotations

import csv
import json
import re
import uuid
import xml.etree.ElementTree as ET
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import pandas as pd
try:
    from app.services.geoip import GeoIPService
except ModuleNotFoundError:
    from backend.app.services.geoip import GeoIPService

CANONICAL_ALIASES = {
    "timestamp": [
        "timestamp", "time", "datetime", "date_time", "event_time",
        "block_time", "transaction_time"
    ],
    "src_ip": [
        "src_ip", "source_ip", "srcip", "sourceip", "sender_ip",
        "origin_ip", "client_ip"
    ],
    "dst_ip": [
        "dst_ip", "destination_ip", "dstip", "dest_ip", "destinationip",
        "receiver_ip", "server_ip"
    ],
    "src_port": ["src_port", "source_port", "srcport", "sourceport"],
    "dst_port": ["dst_port", "destination_port", "dstport", "dest_port"],
    "txid": [
        "txid", "tx_id", "transaction_id", "transactionid",
        "hash", "tx_hash", "transaction_hash"
    ],
    "input_addresses": [
        "input_addresses", "input_address", "inputs", "input",
        "from_addresses", "source_addresses"
    ],
    "output_addresses": [
        "output_addresses", "output_address", "outputs", "output",
        "to_addresses", "destination_addresses"
    ],
    "input_amounts": [
        "input_amounts", "input_amount", "input_value",
        "input_values", "in_amount", "in_btc"
    ],
    "output_amounts": [
        "output_amounts", "output_amount", "output_value",
        "output_values", "out_amount", "out_btc"
    ],
    "geo_country": [
        "geo_country", "country", "country_code", "src_country",
        "source_country", "ip_country"
    ],
    "asn": ["asn", "source_asn", "src_asn", "autonomous_system"],
    "fee": ["fee", "fees", "fee_btc", "transaction_fee"],
    "script_type": ["script_type", "script", "address_type", "output_type"],
}

NETWORK_FIELDS = {"src_ip", "dst_ip", "src_port", "dst_port"}
BLOCKCHAIN_FIELDS = {
    "txid", "input_addresses", "output_addresses",
    "input_amounts", "output_amounts", "fee", "script_type"
}


@dataclass
class IngestionResult:
    dataset_id: str
    filename: str
    format: str
    records: int
    columns: list[str]
    canonical_mapping: dict[str, str]
    unmapped_columns: list[str]
    available_canonical_fields: list[str]
    missing_canonical_fields: list[str]
    analysis_mode: str
    warnings: list[str]
    normalized_path: str
    geoip: dict[str, Any]


def _clean_name(value: Any) -> str:
    value = str(value).strip().lower()
    value = re.sub(r"[^a-z0-9]+", "_", value)
    return value.strip("_")


def _scalarize(value: Any) -> Any:
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)
    return value


def _read_csv(path: Path) -> pd.DataFrame:
    return pd.read_csv(path, low_memory=False)


def _read_json(path: Path) -> pd.DataFrame:
    raw = json.loads(path.read_text(encoding="utf-8"))

    if isinstance(raw, list):
        records = raw
    elif isinstance(raw, dict):
        # Common API/data-export shapes.
        for key in ("data", "records", "transactions", "items", "results"):
            if isinstance(raw.get(key), list):
                records = raw[key]
                break
        else:
            records = [raw]
    else:
        raise ValueError("JSON root must be an object or array")

    if not records:
        return pd.DataFrame()

    return pd.json_normalize(records, sep=".")


def _xml_record_elements(root: ET.Element) -> list[ET.Element]:
    # Prefer repeated children as records.
    children = list(root)
    if not children:
        return [root]

    tags = [child.tag.split("}")[-1] for child in children]
    if len(set(tags)) == 1:
        return children

    # Search one level down for repeated elements.
    for parent in children:
        grandchildren = list(parent)
        if grandchildren:
            gtags = [x.tag.split("}")[-1] for x in grandchildren]
            if len(gtags) >= 2 and len(set(gtags)) == 1:
                return grandchildren

    return children


def _xml_element_to_dict(element: ET.Element) -> dict[str, Any]:
    result: dict[str, Any] = {}

    for key, value in element.attrib.items():
        result[_clean_name(key)] = value

    for child in list(element):
        key = _clean_name(child.tag.split("}")[-1])
        children = list(child)

        if children:
            result[key] = _xml_element_to_dict(child)
        else:
            result[key] = child.text.strip() if child.text else None

    if not result and element.text:
        result[_clean_name(element.tag.split("}")[-1])] = element.text.strip()

    return result


def _read_xml(path: Path) -> pd.DataFrame:
    root = ET.parse(path).getroot()
    records = _xml_record_elements(root)
    return pd.DataFrame([_xml_element_to_dict(x) for x in records])


def read_any(path: Path) -> tuple[pd.DataFrame, str]:
    suffix = path.suffix.lower()

    if suffix == ".csv":
        return _read_csv(path), "csv"
    if suffix == ".json":
        return _read_json(path), "json"
    if suffix == ".xml":
        return _read_xml(path), "xml"

    raise ValueError("Unsupported format. Use CSV, JSON or XML.")


def _find_mapping(columns: list[str]) -> tuple[dict[str, str], list[str]]:
    normalized = {_clean_name(c): c for c in columns}
    mapping: dict[str, str] = {}
    used: set[str] = set()

    for canonical, aliases in CANONICAL_ALIASES.items():
        for alias in aliases:
            alias_clean = _clean_name(alias)

            if alias_clean in normalized and normalized[alias_clean] not in used:
                mapping[canonical] = normalized[alias_clean]
                used.add(normalized[alias_clean])
                break

    unmapped = [c for c in columns if c not in used]
    return mapping, unmapped


def _mode(fields: set[str]) -> str:
    has_network = bool(fields & NETWORK_FIELDS)
    has_chain = bool(fields & BLOCKCHAIN_FIELDS)

    if has_network and has_chain:
        return "full_correlation"

    if has_chain:
        return "blockchain_graph"

    if has_network:
        return "network_anomaly"

    return "generic_metadata"

def _enrich_geoip(
    canonical: pd.DataFrame,
    geoip: GeoIPService,
) -> dict[str, Any]:
    """Enrich missing country/ASN values using the local MMDB databases."""

    stats = {
        "mode": "offline_local_mmdb",
        "provider": "DB-IP Lite",
        "country_database": str(geoip.country_db_path),
        "asn_database": str(geoip.asn_db_path),
        "records_checked": 0,
        "country_enriched": 0,
        "asn_enriched": 0,
        "records_with_geoip_enrichment": 0,
        "supplied_country": 0,
        "supplied_asn": 0,
        "not_found": 0,
        "non_public_ip": 0,
        "missing_ip": 0,
        "database_unavailable": 0,
    }

    if "geo_country" not in canonical.columns:
        canonical["geo_country"] = pd.NA

    if "asn" not in canonical.columns:
        canonical["asn"] = pd.NA

    has_src_ip = "src_ip" in canonical.columns
    has_dst_ip = "dst_ip" in canonical.columns

    if not has_src_ip and not has_dst_ip:
        stats["status"] = "no_ip_fields"
        return stats

    for index in canonical.index:
        supplied_country = (
            pd.notna(canonical.at[index, "geo_country"])
            and str(canonical.at[index, "geo_country"]).strip() != ""
        )
        supplied_asn = (
            pd.notna(canonical.at[index, "asn"])
            and str(canonical.at[index, "asn"]).strip() != ""
        )

        if supplied_country:
            stats["supplied_country"] += 1

        if supplied_asn:
            stats["supplied_asn"] += 1

        if supplied_country and supplied_asn:
            continue

        ip_value = None

        if has_src_ip and pd.notna(canonical.at[index, "src_ip"]):
            candidate = str(canonical.at[index, "src_ip"]).strip()
            if candidate:
                ip_value = candidate

        if not ip_value and has_dst_ip and pd.notna(canonical.at[index, "dst_ip"]):
            candidate = str(canonical.at[index, "dst_ip"]).strip()
            if candidate:
                ip_value = candidate

        stats["records_checked"] += 1

        result = geoip.lookup(ip_value)

        if result.country_found and not supplied_country:
            canonical.at[index, "geo_country"] = result.country
            stats["country_enriched"] += 1

        if result.asn_found and not supplied_asn:
            canonical.at[index, "asn"] = result.asn
            stats["asn_enriched"] += 1

        if result.country_found or result.asn_found:
            stats["records_with_geoip_enrichment"] += 1
        elif result.status == "not_found":
            stats["not_found"] += 1
        elif result.status == "non_public_ip":
            stats["non_public_ip"] += 1
        elif result.status == "missing_ip":
            stats["missing_ip"] += 1
        elif result.status == "database_unavailable":
            stats["database_unavailable"] += 1

    stats["status"] = (
        "enriched"
        if stats["records_with_geoip_enrichment"] > 0
        else "no_enrichment"
    )

    return stats

def ingest_file(
    source_path: str | Path,
    storage_root: str | Path,
) -> IngestionResult:
    source = Path(source_path)
    storage = Path(storage_root)

    if not source.is_file():
        raise FileNotFoundError(source)

    df, fmt = read_any(source)

    original_columns = [str(c) for c in df.columns]
    mapping, unmapped = _find_mapping(original_columns)

    canonical = pd.DataFrame(index=df.index)

    for target, source_column in mapping.items():
        canonical[target] = df[source_column].map(_scalarize)

    # Preserve non-canonical fields as evidence columns using their cleaned names.
    for column in unmapped:
        cleaned = _clean_name(column) or "unnamed"
        if cleaned not in canonical.columns:
            canonical[cleaned] = df[column].map(_scalarize)

    # Perform local-only GeoIP/ASN enrichment.
    geoip_service = GeoIPService()
    try:
        geoip_metadata = _enrich_geoip(canonical, geoip_service)
    finally:
        geoip_service.close()

    dataset_id = "ds-" + uuid.uuid4().hex[:12]
    destination = storage / dataset_id
    destination.mkdir(parents=True, exist_ok=False)

    normalized_path = destination / "normalized.csv"
    canonical.to_csv(normalized_path, index=False)

    available = sorted(mapping.keys())
    missing = sorted(set(CANONICAL_ALIASES) - set(available))

    warnings: list[str] = []

    if "txid" not in mapping:
        warnings.append("No transaction identifier was detected.")
    if not (set(available) & NETWORK_FIELDS):
        warnings.append("No network-layer IP/port fields were detected.")
    if not (set(available) & BLOCKCHAIN_FIELDS):
        warnings.append("No blockchain transaction fields were detected.")
    if "timestamp" not in mapping:
        warnings.append(
            "No timestamp was detected; temporal correlation may be unavailable."
        )

    return IngestionResult(
        dataset_id=dataset_id,
        filename=source.name,
        format=fmt,
        records=len(canonical),
        columns=original_columns,
        canonical_mapping=mapping,
        unmapped_columns=unmapped,
        available_canonical_fields=available,
        missing_canonical_fields=missing,
        analysis_mode=_mode(set(available)),
        warnings=warnings,
        normalized_path=str(normalized_path),
        geoip=geoip_metadata,
    )
    


def result_to_dict(result: IngestionResult) -> dict[str, Any]:
    return asdict(result)
