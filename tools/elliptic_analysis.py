from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.metrics import (
    average_precision_score,
    classification_report,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "backend" / "data" / "elliptic"

FEATURES = DATA / "elliptic_ml_features.csv"
EDGES = DATA / "elliptic_transaction_edges.csv"

OUT_SUMMARY = DATA / "elliptic_analysis_summary.json"
OUT_RANKING = DATA / "elliptic_risk_ranking.csv"
OUT_GRAPH = DATA / "elliptic_graph_features.csv"

RANDOM_STATE = 26146


def load_data():
    if not FEATURES.exists():
        raise FileNotFoundError(f"Missing {FEATURES}")
    if not EDGES.exists():
        raise FileNotFoundError(f"Missing {EDGES}")

    df = pd.read_csv(FEATURES)
    edges = pd.read_csv(EDGES)

    df["txid"] = df["txid"].astype(str)
    edges["source_txid"] = edges["source_txid"].astype(str)
    edges["target_txid"] = edges["target_txid"].astype(str)

    return df, edges


def build_graph_features(df: pd.DataFrame, edges: pd.DataFrame) -> pd.DataFrame:
    in_degree = edges["target_txid"].value_counts()
    out_degree = edges["source_txid"].value_counts()

    graph = df[["txid"]].copy()
    graph["graph_in_degree"] = graph["txid"].map(in_degree).fillna(0)
    graph["graph_out_degree"] = graph["txid"].map(out_degree).fillna(0)
    graph["graph_total_degree"] = (
        graph["graph_in_degree"] + graph["graph_out_degree"]
    )

    # A simple flow-through indicator: transactions appearing on both sides
    # of the transaction graph.
    graph["graph_is_bridge"] = (
        (graph["graph_in_degree"] > 0) & (graph["graph_out_degree"] > 0)
    ).astype(int)

    return graph


def make_feature_matrix(df: pd.DataFrame, graph: pd.DataFrame):
    merged = df.merge(graph, on="txid", how="left")

    exclude = {"txid", "label"}
    numeric_cols = [
        c for c in merged.columns
        if c not in exclude and pd.api.types.is_numeric_dtype(merged[c])
    ]

    X = merged[numeric_cols].replace([np.inf, -np.inf], np.nan)
    X = X.fillna(X.median(numeric_only=True))
    X = X.fillna(0)

    return merged, X, numeric_cols


def main():
    print("=" * 72)
    print("ELLIPTIC++ REAL-DATA ANALYSIS")
    print("=" * 72)

    df, edges = load_data()

    print(f"Transactions: {len(df):,}")
    print(f"Edges:        {len(edges):,}")

    graph = build_graph_features(df, edges)
    merged, X, feature_cols = make_feature_matrix(df, graph)

    # ---------------------------------------------------------------
    # 1. Unsupervised anomaly detection
    # ---------------------------------------------------------------
    print("\n[1/4] Isolation Forest anomaly detection")

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    iso = IsolationForest(
        n_estimators=200,
        contamination="auto",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )
    iso.fit(X_scaled)

    decision = iso.decision_function(X_scaled)
    anomaly = -decision

    # Percentile-based 0-100 display score. This is an anomaly ranking score,
    # not a probability of illicit activity.
    order = np.argsort(anomaly)
    ranks = np.empty_like(order)
    ranks[order] = np.arange(len(order))
    anomaly_score = ranks / max(1, len(order) - 1) * 100.0

    # ---------------------------------------------------------------
    # 2. Supervised evaluation on known labels
    # ---------------------------------------------------------------
    print("[2/4] Labelled ML evaluation")

    known_mask = merged["label"].isin(["illicit", "licit"])
    known = merged.loc[known_mask].copy()
    X_known = X.loc[known_mask]
    y = (known["label"] == "illicit").astype(int)

    X_train, X_test, y_train, y_test, ids_train, ids_test = train_test_split(
        X_known,
        y,
        known["txid"],
        test_size=0.25,
        random_state=RANDOM_STATE,
        stratify=y,
    )

    clf = RandomForestClassifier(
        n_estimators=200,
        random_state=RANDOM_STATE,
        n_jobs=-1,
        class_weight="balanced",
        max_depth=18,
        min_samples_leaf=2,
    )
    clf.fit(X_train, y_train)

    prob = clf.predict_proba(X_test)[:, 1]
    pred = (prob >= 0.5).astype(int)

    precision = precision_score(y_test, pred, zero_division=0)
    recall = recall_score(y_test, pred, zero_division=0)
    f1 = f1_score(y_test, pred, zero_division=0)
    roc_auc = roc_auc_score(y_test, prob)
    pr_auc = average_precision_score(y_test, prob)

    print(f"Known labelled transactions: {len(known):,}")
    print(f"Test transactions:            {len(y_test):,}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1:        {f1:.4f}")
    print(f"ROC-AUC:   {roc_auc:.4f}")
    print(f"PR-AUC:    {pr_auc:.4f}")

    # ---------------------------------------------------------------
    # 3. Produce investigation ranking
    # ---------------------------------------------------------------
    print("[3/4] Building ranked investigation leads")

    ranking = merged[
        [
            "txid",
            "time_step",
            "total_btc",
            "fee_btc",
            "input_count",
            "output_count",
            "label",
        ]
    ].copy()

    ranking["anomaly_score"] = anomaly_score

    # The supervised model is evaluated only on known labels, then used
    # to score every transaction. Unknown transactions are allowed to
    # receive a model score, but are never treated as ground truth.
    all_prob = clf.predict_proba(X)[:, 1]
    ranking["illicit_model_score"] = all_prob * 100.0

    # Combined investigation score:
    # 60% supervised model score + 40% anomaly score.
    # This is a prioritization score, NOT a probability.
    ranking["investigation_score"] = (
        0.60 * ranking["illicit_model_score"]
        + 0.40 * ranking["anomaly_score"]
    )

    ranking = ranking.sort_values(
        ["investigation_score", "anomaly_score"],
        ascending=False,
    ).reset_index(drop=True)

    ranking["rank"] = np.arange(1, len(ranking) + 1)

    ranking.to_csv(OUT_RANKING, index=False)
    graph.to_csv(OUT_GRAPH, index=False)

    # ---------------------------------------------------------------
    # 4. Summary
    # ---------------------------------------------------------------
    print("[4/4] Saving results")

    summary = {
        "dataset": "Elliptic++ Transactions Dataset",
        "transactions": int(len(df)),
        "edges": int(len(edges)),
        "labels": {
            "illicit": int((df["label"] == "illicit").sum()),
            "licit": int((df["label"] == "licit").sum()),
            "unknown": int((df["label"] == "unknown").sum()),
        },
        "features_used": int(len(feature_cols)),
        "graph_features": [
            "graph_in_degree",
            "graph_out_degree",
            "graph_total_degree",
            "graph_is_bridge",
        ],
        "unsupervised": {
            "model": "IsolationForest",
            "n_estimators": 200,
            "random_state": RANDOM_STATE,
            "score_semantics": "0-100 anomaly ranking score; not illicit probability",
        },
        "supervised": {
            "model": "RandomForestClassifier",
            "class_weight": "balanced",
            "known_label_rows": int(len(known)),
            "test_rows": int(len(y_test)),
            "positive_class": "illicit",
            "metrics": {
                "precision": float(precision),
                "recall": float(recall),
                "f1": float(f1),
                "roc_auc": float(roc_auc),
                "pr_auc": float(pr_auc),
            },
        },
        "ranking": {
            "formula": "0.60 * illicit_model_score + 0.40 * anomaly_score",
            "score_semantics": "investigation prioritization score; not probability",
            "rows": int(len(ranking)),
        },
        "outputs": {
            "risk_ranking": str(OUT_RANKING),
            "graph_features": str(OUT_GRAPH),
            "summary": str(OUT_SUMMARY),
        },
        "limitations": [
            "Elliptic++ transaction files do not provide src_ip/dst_ip, ports, GeoIP or ASN.",
            "Raw input/output address lists are not exposed in the downloaded transaction files.",
            "Time step is retained as a dataset index and is not converted to a fake calendar timestamp.",
            "Metrics are evaluated on this published dataset and split, not claimed as real-world deployment accuracy.",
        ],
    }

    OUT_SUMMARY.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print("\nTOP 10 INVESTIGATION LEADS")
    print(
        ranking[
            [
                "rank",
                "txid",
                "label",
                "investigation_score",
                "illicit_model_score",
                "anomaly_score",
            ]
        ].head(10).to_string(index=False)
    )

    print("\nRESULTS SAVED:")
    print(OUT_SUMMARY)
    print(OUT_RANKING)
    print(OUT_GRAPH)
    print("=" * 72)


if __name__ == "__main__":
    main()
