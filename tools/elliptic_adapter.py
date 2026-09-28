"""
Elliptic++ transaction dataset adapter for SIH 26146.

Reads the official Elliptic++ transaction files without modifying them and
creates a normalized, SIH-safe representation for blockchain/graph/ML tests.

Important:
- Does NOT invent IPs, ports, GeoIP, ASN, or wallet address lists.
- "time_step" is kept as the dataset's time-step index; it is NOT converted
  into a fake calendar timestamp.
- Class labels are preserved: 1=illicit, 2=licit, 3=unknown.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd


REQUIRED = {
    "txs_features.csv",
    "txs_classes.csv",
    "txs_edgelist.csv",
}


def find_dataset(root: Path) -> Path:
    candidates = [
        root / "datasets" / "real" / "elliptic_transactions",
        root / "elliptic_transactions",
    ]
    for p in candidates:
        if all((p / name).exists() for name in REQUIRED):
            return p
    raise FileNotFoundError(
        "Could not find Elliptic++ files. Expected them under "
        "datasets/real/elliptic_transactions/"
    )


def normalize(root: Path, output: Path, chunksize: int = 20000) -> dict:
    data = find_dataset(root)
    output.mkdir(parents=True, exist_ok=True)

    features = data / "txs_features.csv"
    classes = data / "txs_classes.csv"
    edges = data / "txs_edgelist.csv"

    # Load the small label file and index it by TXID.
    labels = pd.read_csv(classes, usecols=["txId", "class"])
    labels["txId"] = labels["txId"].astype(str)
    labels["class"] = pd.to_numeric(labels["class"], errors="coerce").astype("Int64")

    normalized_path = output / "elliptic_transactions_normalized.csv"
    if normalized_path.exists():
        normalized_path.unlink()

    first = True
    total_rows = 0
    class_counts = {1: 0, 2: 0, 3: 0}

    # Keep only fields that have clear semantics for our normalized layer.
    usecols = [
        "txId",
        "Time step",
        "in_txs_degree",
        "out_txs_degree",
        "total_BTC",
        "fees",
        "size",
        "num_input_addresses",
        "num_output_addresses",
        "in_BTC_min",
        "in_BTC_max",
        "in_BTC_mean",
        "in_BTC_median",
        "in_BTC_total",
        "out_BTC_min",
        "out_BTC_max",
        "out_BTC_mean",
        "out_BTC_median",
        "out_BTC_total",
    ]

    for chunk in pd.read_csv(features, usecols=usecols, chunksize=chunksize):
        chunk = chunk.rename(
            columns={
                "txId": "txid",
                "Time step": "time_step",
                "in_txs_degree": "input_tx_degree",
                "out_txs_degree": "output_tx_degree",
                "total_BTC": "total_btc",
                "fees": "fee_btc",
                "num_input_addresses": "input_count",
                "num_output_addresses": "output_count",
            }
        )

        chunk["txid"] = chunk["txid"].astype(str)
        chunk = chunk.merge(labels, left_on="txid", right_on="txId", how="left")
        chunk = chunk.drop(columns=["txId"])

        chunk["label"] = chunk["class"].map(
            {1: "illicit", 2: "licit", 3: "unknown"}
        ).fillna("unlabeled")
        chunk = chunk.drop(columns=["class"])

        # Explicitly represent fields required by the SIH schema but absent
        # from Elliptic++ as null. Never fabricate these values.
        for col in [
            "timestamp",
            "src_ip",
            "dst_ip",
            "src_port",
            "dst_port",
            "geo_country",
            "asn",
            "input_addresses",
            "output_addresses",
            "input_amounts",
            "output_amounts",
            "script_type",
        ]:
            chunk[col] = pd.NA

        chunk.to_csv(
            normalized_path,
            mode="w" if first else "a",
            header=first,
            index=False,
        )
        first = False
        total_rows += len(chunk)

        counts = chunk["label"].value_counts()
        class_counts[1] += int(counts.get("illicit", 0))
        class_counts[2] += int(counts.get("licit", 0))
        class_counts[3] += int(counts.get("unknown", 0))

    # Normalize graph edges separately.
    edge_out = output / "elliptic_transaction_edges.csv"
    edge_df = pd.read_csv(edges, dtype={"txId1": str, "txId2": str})
    edge_df.columns = ["source_txid", "target_txid"]
    edge_df.to_csv(edge_out, index=False)

    # A compact feature-only file is useful for ML experiments.
    ml_out = output / "elliptic_ml_features.csv"
    ml_cols = [
        "txid",
        "time_step",
        "input_tx_degree",
        "output_tx_degree",
        "total_btc",
        "fee_btc",
        "size",
        "input_count",
        "output_count",
        "in_BTC_min",
        "in_BTC_max",
        "in_BTC_mean",
        "in_BTC_median",
        "in_BTC_total",
        "out_BTC_min",
        "out_BTC_max",
        "out_BTC_mean",
        "out_BTC_median",
        "out_BTC_total",
        "label",
    ]
    pd.read_csv(normalized_path, usecols=ml_cols).to_csv(ml_out, index=False)

    summary = {
        "dataset": "Elliptic++ Transactions Dataset",
        "source_directory": str(data),
        "transactions": total_rows,
        "edges": int(len(edge_df)),
        "labels": {
            "illicit": class_counts[1],
            "licit": class_counts[2],
            "unknown": class_counts[3],
        },
        "network_fields_available": False,
        "wallet_address_lists_available": False,
        "time_semantics": "Elliptic++ time-step index; not converted to calendar timestamps",
        "raw_files_modified": False,
        "outputs": {
            "normalized_transactions": str(normalized_path),
            "transaction_edges": str(edge_out),
            "ml_features": str(ml_out),
        },
    }

    (output / "elliptic_adapter_summary.json").write_text(
        json.dumps(summary, indent=2),
        encoding="utf-8",
    )
    return summary


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--root",
        default=".",
        help="SIH_Prototype project root",
    )
    parser.add_argument(
        "--output",
        default="backend/data/elliptic",
        help="Output directory",
    )
    args = parser.parse_args()

    summary = normalize(Path(args.root).resolve(), Path(args.output))
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
