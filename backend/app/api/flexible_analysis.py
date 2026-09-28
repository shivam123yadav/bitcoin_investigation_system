"""
Dataset-specific analysis endpoint for flexible CSV/JSON/XML uploads.

This module intentionally does NOT modify the existing SIH fixed-dataset
analysis pipeline. It analyzes the normalized uploaded dataset according to
the fields that were actually detected during ingestion.

Supported modes:
- full_correlation
- blockchain_graph
- network_anomaly
- generic_metadata
"""

from __future__ import annotations

import json
import math
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from app.core.security import require_api_token

try:
    import networkx as nx
except Exception:  # pragma: no cover
    nx = None


router = APIRouter(prefix="/api/v1/flexible-dataset", tags=["flexible-analysis"])

BACKEND_ROOT = Path(__file__).resolve().parents[2]
UPLOAD_ROOT = BACKEND_ROOT / "data" / "flexible_uploads"
_lock = threading.RLock()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _split_values(value: Any) -> list[str]:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return []
    if isinstance(value, (list, tuple, set)):
        return [str(x).strip() for x in value if str(x).strip()]
    s = str(value).strip()
    if not s:
        return []
    if s.startswith("[") and s.endswith("]"):
        try:
            parsed = json.loads(s)
            if isinstance(parsed, list):
                return [str(x).strip() for x in parsed if str(x).strip()]
        except Exception:
            pass
    for sep in (";", "|", ","):
        if sep in s:
            return [x.strip() for x in s.split(sep) if x.strip()]
    return [s]


def _float_value(value: Any) -> float:
    try:
        x = float(value)
        return x if math.isfinite(x) else 0.0
    except Exception:
        return 0.0


def _load_metadata(dataset_id: str) -> dict[str, Any]:
    path = UPLOAD_ROOT / dataset_id / "ingestion.json"
    if not path.is_file():
        raise HTTPException(status_code=404, detail=f"Dataset {dataset_id} not found")
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Dataset ingestion metadata is invalid") from exc
    if not isinstance(data, dict):
        raise HTTPException(status_code=500, detail="Dataset ingestion metadata is invalid")
    return data


def _load_frame(dataset_id: str) -> pd.DataFrame:
    path = UPLOAD_ROOT / dataset_id / "normalized.csv"
    if not path.is_file():
        raise HTTPException(status_code=404, detail=f"Normalized data for {dataset_id} not found")
    try:
        return pd.read_csv(path)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Normalized dataset could not be read") from exc


def _ml_scores(features: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    numeric = features.apply(pd.to_numeric, errors="coerce").replace([np.inf, -np.inf], np.nan).fillna(0.0)
    if len(numeric) < 8 or numeric.shape[1] == 0:
        return np.zeros(len(numeric)), np.zeros(len(numeric))

    X = StandardScaler().fit_transform(numeric)
    model = IsolationForest(
        n_estimators=150,
        contamination="auto",
        random_state=26146,
        n_jobs=-1,
    )
    model.fit(X)
    raw = -model.score_samples(X)
    lo, hi = float(raw.min()), float(raw.max())
    anomaly = np.zeros(len(raw)) if hi <= lo else (raw - lo) / (hi - lo)
    return raw, anomaly


def _network_analysis(df: pd.DataFrame) -> dict[str, Any]:
    work = df.copy()
    src = work.get("src_ip", pd.Series("", index=work.index)).fillna("").astype(str)
    dst = work.get("dst_ip", pd.Series("", index=work.index)).fillna("").astype(str)
    src_port = pd.to_numeric(work.get("src_port", pd.Series(0, index=work.index)), errors="coerce").fillna(0)
    dst_port = pd.to_numeric(work.get("dst_port", pd.Series(0, index=work.index)), errors="coerce").fillna(0)

    rows = []
    for ip, g in work.assign(_src=src, _dst=dst).groupby("_src"):
        if not ip or ip.lower() == "nan":
            continue
        rows.append({
            "entity_id": ip,
            "observation_count": len(g),
            "unique_destinations": g["_dst"].nunique(),
            "unique_dst_ports": dst_port.loc[g.index].nunique(),
            "unique_src_ports": src_port.loc[g.index].nunique(),
        })
    features = pd.DataFrame(rows)
    if features.empty:
        return {"entities": [], "entity_count": 0, "anomaly_count": 0}

    _, scores = _ml_scores(features.drop(columns=["entity_id"]))
    features["anomaly_score"] = scores
    features = features.sort_values("anomaly_score", ascending=False)
    return {
        "entities": features.head(100).to_dict(orient="records"),
        "entity_count": int(len(features)),
        "anomaly_count": int((features["anomaly_score"] >= 0.7).sum()),
    }


def _blockchain_analysis(df: pd.DataFrame) -> dict[str, Any]:
    wallets: dict[str, dict[str, Any]] = {}

    def rec(address: str) -> dict[str, Any]:
        return wallets.setdefault(address, {"entity_id": address, "transaction_count": 0,
                                            "input_count": 0, "output_count": 0,
                                            "input_volume": 0.0, "output_volume": 0.0})

    for _, row in df.iterrows():
        inputs = _split_values(row.get("input_addresses"))
        outputs = _split_values(row.get("output_addresses"))
        in_amounts = [_float_value(x) for x in _split_values(row.get("input_amounts"))]
        out_amounts = [_float_value(x) for x in _split_values(row.get("output_amounts"))]
        for i, address in enumerate(inputs):
            r = rec(address)
            r["transaction_count"] += 1
            r["input_count"] += 1
            r["input_volume"] += in_amounts[i] if i < len(in_amounts) else 0.0
        for i, address in enumerate(outputs):
            r = rec(address)
            r["transaction_count"] += 1
            r["output_count"] += 1
            r["output_volume"] += out_amounts[i] if i < len(out_amounts) else 0.0

    features = pd.DataFrame(list(wallets.values()))
    if features.empty:
        return {"entities": [], "entity_count": 0, "anomaly_count": 0, "graph": {"nodes": 0, "edges": 0}}

    _, scores = _ml_scores(features.drop(columns=["entity_id"]))
    features["anomaly_score"] = scores
    features["total_volume"] = features["input_volume"] + features["output_volume"]
    features = features.sort_values("anomaly_score", ascending=False)

    edge_count = 0
    if nx is not None:
        graph = nx.DiGraph()
        for _, row in df.iterrows():
            ins = _split_values(row.get("input_addresses"))
            outs = _split_values(row.get("output_addresses"))
            for a in ins:
                for b in outs:
                    if a and b:
                        graph.add_edge(a, b)
        edge_count = graph.number_of_edges()

    return {
        "entities": features.head(100).to_dict(orient="records"),
        "entity_count": int(len(features)),
        "anomaly_count": int((features["anomaly_score"] >= 0.7).sum()),
        "graph": {"nodes": int(len(features)), "edges": int(edge_count)},
    }


def _full_analysis(df: pd.DataFrame) -> dict[str, Any]:
    result = _blockchain_analysis(df)
    network = _network_analysis(df)
    result["network"] = network
    result["correlation"] = {
        "transactions_with_network_and_blockchain": int(
            df[["txid", "src_ip", "dst_ip"]].notna().all(axis=1).sum()
        ) if all(c in df.columns for c in ("txid", "src_ip", "dst_ip")) else 0,
        "unique_txids": int(df["txid"].nunique()) if "txid" in df.columns else 0,
        "unique_ips": int(pd.concat([
            df["src_ip"].dropna().astype(str) if "src_ip" in df.columns else pd.Series(dtype=str),
            df["dst_ip"].dropna().astype(str) if "dst_ip" in df.columns else pd.Series(dtype=str),
        ]).nunique()),
    }
    return result


# A run writes analysis artifacts for an uploaded dataset, so it requires the
# API token.
@router.post("/{dataset_id}/analyze", dependencies=[Depends(require_api_token)])
def analyze_uploaded_dataset(dataset_id: str) -> dict[str, Any]:
    with _lock:
        metadata = _load_metadata(dataset_id)
        mode = str(metadata.get("analysis_mode") or "generic_metadata")
        df = _load_frame(dataset_id)

        started = _now()
        if mode == "full_correlation":
            result = _full_analysis(df)
        elif mode == "blockchain_graph":
            result = _blockchain_analysis(df)
        elif mode == "network_anomaly":
            result = _network_analysis(df)
        else:
            result = {
                "entities": [],
                "entity_count": 0,
                "anomaly_count": 0,
                "message": "The uploaded schema does not expose enough network or blockchain fields for the supported ML pipelines.",
            }

        run_id = f"flex-{dataset_id}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        payload = {
            "status": "completed",
            "run_id": run_id,
            "dataset_id": dataset_id,
            "analysis_mode": mode,
            "started_at": started,
            "completed_at": _now(),
            "record_count": int(len(df)),
            "result": result,
        }
        out = UPLOAD_ROOT / dataset_id / f"{run_id}.json"
        out.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
        (UPLOAD_ROOT / dataset_id / "latest_analysis.json").write_text(
            json.dumps(payload, indent=2, default=str), encoding="utf-8"
        )
        return payload

@router.get("/{dataset_id}/analysis")
def get_latest_uploaded_analysis(dataset_id: str) -> dict[str, Any]:
    """Return the latest analysis result for an uploaded dataset."""
    with _lock:
        metadata = _load_metadata(dataset_id)
        path = UPLOAD_ROOT / dataset_id / "latest_analysis.json"
        if not path.is_file():
            raise HTTPException(status_code=404, detail=f"No analysis result for dataset {dataset_id}")
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            raise HTTPException(status_code=500, detail="Stored analysis result is invalid") from exc
        if not isinstance(payload, dict):
            raise HTTPException(status_code=500, detail="Stored analysis result is invalid")
        payload["filename"] = metadata.get("filename")
        payload["format"] = metadata.get("format")
        payload["available_canonical_fields"] = metadata.get("available_canonical_fields", [])
        payload["missing_canonical_fields"] = metadata.get("missing_canonical_fields", [])
        payload["warnings"] = metadata.get("warnings", [])
        return payload

