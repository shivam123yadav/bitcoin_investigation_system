from __future__ import annotations

import ipaddress
from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    from importlib import import_module

    maxminddb = import_module("maxminddb")
except ImportError:  # GeoIP is unavailable until its optional dependency is installed.
    maxminddb = None

try:
    from app.config import settings
except ModuleNotFoundError:
    from backend.app.config import settings

@dataclass(frozen=True)
class GeoIPResult:
    country: str | None
    asn: str | None
    country_found: bool
    asn_found: bool
    status: str
    source: str


class GeoIPService:
    """Local-only GeoIP/ASN enrichment using MMDB databases."""

    def __init__(
        self,
        country_db_path: str | Path | None = None,
        asn_db_path: str | Path | None = None,
    ) -> None:
        self.country_db_path = self._resolve_path(
            country_db_path or settings.geoip_country_db
        )
        self.asn_db_path = self._resolve_path(
            asn_db_path or settings.geoip_asn_db
        )

        self._country_reader = self._open_reader(self.country_db_path)
        self._asn_reader = self._open_reader(self.asn_db_path)

    @staticmethod
    def _resolve_path(path: str | Path) -> Path:
        candidate = Path(path)

        if candidate.is_absolute():
            return candidate

        project_root = Path(__file__).resolve().parents[3]
        return project_root / candidate

    @staticmethod
    def _open_reader(path: Path) -> Any | None:
        if maxminddb is None or not path.is_file():
            return None

        return maxminddb.open_database(str(path))

    @staticmethod
    def _is_public_ip(value: str) -> bool:
        try:
            address = ipaddress.ip_address(value)
        except ValueError:
            return False

        return not (
            address.is_private
            or address.is_loopback
            or address.is_link_local
            or address.is_multicast
            or address.is_reserved
            or address.is_unspecified
        )

    def lookup(self, ip: str | None) -> GeoIPResult:
        """Perform a local-only lookup for one IP address."""

        if not ip:
            return GeoIPResult(
                country=None,
                asn=None,
                country_found=False,
                asn_found=False,
                status="missing_ip",
                source="none",
            )

        ip_value = str(ip).strip()

        if not self._is_public_ip(ip_value):
            return GeoIPResult(
                country=None,
                asn=None,
                country_found=False,
                asn_found=False,
                status="non_public_ip",
                source="none",
            )

        country = None
        asn = None
        country_found = False
        asn_found = False

        if self._country_reader is not None:
            try:
                record = self._country_reader.get(ip_value)

                if isinstance(record, dict):
                    country_data = record.get("country", {})
                    if isinstance(country_data, dict):
                        country = country_data.get("iso_code")

                    if country:
                        country = str(country).upper()
                        country_found = True
            except Exception:
                country = None

        if self._asn_reader is not None:
            try:
                record = self._asn_reader.get(ip_value)

                if isinstance(record, dict):
                    autonomous_system_number = record.get(
                        "autonomous_system_number"
                    )

                    if autonomous_system_number is not None:
                        asn = f"AS{autonomous_system_number}"
                        asn_found = True
            except Exception:
                asn = None

        if country_found or asn_found:
            status = "enriched"
            source = "dbip-mmdb"
        elif self._country_reader is None and self._asn_reader is None:
            status = "database_unavailable"
            source = "none"
        else:
            status = "not_found"
            source = "dbip-mmdb"

        return GeoIPResult(
            country=country,
            asn=asn,
            country_found=country_found,
            asn_found=asn_found,
            status=status,
            source=source,
        )

    def status(self) -> dict[str, Any]:
        """Return local database availability and metadata."""

        return {
            "enabled": self._country_reader is not None
            or self._asn_reader is not None,
            "country_database": {
                "path": str(self.country_db_path),
                "available": self.country_db_path.is_file(),
            },
            "asn_database": {
                "path": str(self.asn_db_path),
                "available": self.asn_db_path.is_file(),
            },
            "mode": "offline_local_mmdb",
            "provider": "DB-IP Lite",
        }

    def close(self) -> None:
        if self._country_reader is not None:
            self._country_reader.close()

        if self._asn_reader is not None:
            self._asn_reader.close()


def create_geoip_service() -> GeoIPService:
    return GeoIPService()