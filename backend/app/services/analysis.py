from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import json
from pathlib import Path
import threading
import time
from typing import Any

import duckdb
import networkx as nx
import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from app.services.graph import GraphService
from app.services.paths import DATASET_MANIFEST_PATH, NORMALIZED_STORAGE_ROOT


class AnalysisError(RuntimeError):
    pass


@dataclass
class AnalysisState:
    run_id: str
    dataset_version: str
    started_at: str
    completed_at: str
    duration_ms: float
    stages: list[dict[str, Any]]
    summary: dict[str, Any]
    wallet_features: pd.DataFrame
    ip_features: pd.DataFrame
    leads: list[dict[str, Any]]
    clusters: list[dict[str, Any]]
    patterns: list[dict[str, Any]]
    evidence: dict[str, list[dict[str, Any]]]
    findings: dict[str, list[dict[str, Any]]]
    timelines: dict[str, list[dict[str, Any]]]
    flow_patterns: list[dict[str, Any]]

    def describe(self) -> dict[str, Any]:
        """Return a compact, JSON-serializable report of this run.

        Verification tooling, logs and diagnostics use this instead of the
        complete state object so that multi-megabyte frames of feature rows,
        leads and patterns are never dumped to a terminal or a log line.
        """
        summary = dict(self.summary)
        record_count = int(summary.get("recordsProcessed", 0))
        wallet_count = int(len(self.wallet_features))
        ip_count = int(len(self.ip_features))
        entity_count = wallet_count + ip_count
        transaction_count = int(summary.get("transactionsAnalyzed", 0))
        cluster_count = len(self.clusters)
        pattern_count = len(self.patterns)
        lead_count = len(self.leads)
        duration_ms = round(float(summary.get("durationMs", self.duration_ms)), 2)

        checks = {
            "records_loaded": record_count > 0,
            "entities_engineered": entity_count > 0,
            "transactions_analyzed": transaction_count > 0,
            "clusters_detected": cluster_count > 0,
            "patterns_detected": pattern_count > 0,
            "leads_generated": lead_count > 0,
            "anomaly_scores_present": (
                "anomaly_score" in self.wallet_features.columns
                and "anomaly_score" in self.ip_features.columns
            ),
            "all_stages_completed": all(
                stage.get("status") == "completed" for stage in self.stages
            ),
        }

        warnings = [
            f"verification check failed: {name}"
            for name, ok in checks.items()
            if not ok
        ]
        for label, reported, actual in (
            ("entitiesAnalyzed", summary.get("entitiesAnalyzed"), entity_count),
            ("clusterCount", summary.get("clusterCount"), cluster_count),
            ("patternCount", summary.get("patternCount"), pattern_count),
            ("leadsGenerated", summary.get("leadsGenerated"), lead_count),
        ):
            if reported is not None and int(reported) != actual:
                warnings.append(
                    f"summary field {label}={int(reported)} does not match the "
                    f"materialized state ({actual})"
                )

        errors = [str(stage["error"]) for stage in self.stages if stage.get("error")]

        return {
            "status": (
                "FAIL"
                if not all(checks.values())
                else "WARN"
                if warnings or errors
                else "PASS"
            ),
            "run_id": self.run_id,
            "dataset_version": self.dataset_version,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
            "duration_ms": duration_ms,
            "record_count": record_count,
            "entity_count": entity_count,
            "wallet_count": wallet_count,
            "ip_count": ip_count,
            "transaction_count": transaction_count,
            "cluster_count": cluster_count,
            "pattern_count": pattern_count,
            "lead_count": lead_count,
            "anomaly_count": int(summary.get("anomalyCount", 0)),
            "checks": checks,
            "stages": [
                {
                    "id": stage.get("id"),
                    "name": stage.get("name"),
                    "status": stage.get("status"),
                    "detail": stage.get("detail"),
                }
                for stage in self.stages
            ],
            "warnings": warnings,
            "errors": errors,
        }

    def __repr__(self) -> str:
        report = self.describe()
        return (
            f"AnalysisState(run_id={self.run_id!r}, status={report['status']!r}, "
            f"records={report['record_count']}, entities={report['entity_count']}, "
            f"transactions={report['transaction_count']}, clusters={report['cluster_count']}, "
            f"patterns={report['pattern_count']}, leads={report['lead_count']}, "
            f"duration_ms={report['duration_ms']})"
        )


class AnalysisService:
    def __init__(self) -> None:
        self._state: AnalysisState | None = None
        self._lock = threading.RLock()
        self._run_in_progress = False
        self.runs_root = Path(__file__).resolve().parents[2] / "data" / "runs"
        # Restore the most recent completed run when the API process restarts.
        # This keeps deployment simple: no external database or job queue is
        # required just to preserve the latest local analysis.
        self._restore_latest()

    def status(self) -> dict[str, Any]:
        with self._lock:
            if self._state is None:
                return {"status": "not_run", "run_id": None, "progress": 0, "stages": self._default_stages()}
            return {
                "status": "completed",
                "run_id": self._state.run_id,
                "progress": 100,
                "stages": self._state.stages,
            }

    def get_state(self) -> AnalysisState:
        with self._lock:
            if self._state is None:
                self.run()
            assert self._state is not None
            return self._state

    def load_observations(self, version: str | None = None) -> pd.DataFrame:
        """Load normalized observations for a dataset version.

        Public entry point for the API layer. The dataset version of the cached run
        is used when no version is supplied.
        """
        if version is None and self._state is not None:
            version = self._state.dataset_version
        if version is None:
            raise AnalysisError(
                "No analysis run is available to resolve the dataset version"
            )
        return self._load_observations(version)

    def run(self, force: bool = False) -> AnalysisState:
        with self._lock:
            if self._state is not None and not force:
                return self._state
            if self._run_in_progress:
                raise AnalysisError("Analysis is already running")
            self._run_in_progress = True
        started = time.perf_counter()
        started_at = datetime.now(timezone.utc).isoformat()
        try:
            manifest = self._manifest()
            version = str(manifest.get("dataset_version", "unknown"))
            stages = self._default_stages()
            self._mark(stages, 1, "processing")
            observations = self._load_observations(version)
            self._mark(stages, 1, "completed", detail=f"Loaded {len(observations):,} observations")

            self._mark(stages, 2, "processing")
            wallet_features, ip_features = self._features(observations)
            self._mark(stages, 2, "completed", detail=f"Engineered {len(wallet_features):,} wallet and {len(ip_features):,} IP feature rows")

            self._mark(stages, 3, "processing")
            self._anomaly(wallet_features, ip_features)
            self._mark(stages, 3, "completed", detail=f"Scored {len(wallet_features) + len(ip_features):,} entities")

            self._mark(stages, 4, "processing")
            clusters = self._clusters(wallet_features)
            self._mark(stages, 4, "completed", detail=f"Generated {len(clusters):,} behavioral clusters")

            self._mark(stages, 5, "processing")
            patterns, flow_patterns = self._patterns(observations)
            self._mark(stages, 5, "completed", detail=f"Detected {len(patterns):,} candidate patterns")

            self._mark(stages, 6, "processing")
            leads, evidence, findings, timelines = self._leads(wallet_features, ip_features, clusters, patterns, observations)
            self._mark(stages, 6, "completed", detail=f"Generated {len(leads):,} investigation leads")

            duration_ms = round((time.perf_counter() - started) * 1000, 2)
            completed_at = datetime.now(timezone.utc).isoformat()
            run_id = f"run-{version}-{int(time.time())}"
            summary = self._summary(observations, wallet_features, ip_features, clusters, patterns, leads, duration_ms)
            state = AnalysisState(run_id, version, started_at, completed_at, duration_ms, stages, summary, wallet_features, ip_features, leads, clusters, patterns, evidence, findings, timelines, flow_patterns)
            self._persist(state)
            with self._lock:
                self._state = state
            return state
        finally:
            with self._lock:
                self._run_in_progress = False

    def _manifest(self) -> dict[str, Any]:
        try:
            return json.loads(DATASET_MANIFEST_PATH.read_text(encoding="utf-8"))
        except Exception as exc:
            raise AnalysisError("Dataset manifest is unavailable") from exc

    def _load_observations(self, version: str) -> pd.DataFrame:
        path = NORMALIZED_STORAGE_ROOT / f"observations_v{version}.duckdb"
        if not path.is_file():
            raise AnalysisError(f"Normalized dataset storage not found: {path}")
        con = duckdb.connect(str(path), read_only=True)
        try:
            df = con.execute("SELECT * FROM observations ORDER BY timestamp, source_record_id").df()
        finally:
            con.close()
        for field in ("input_addresses", "output_addresses", "input_amounts", "output_amounts"):
            df[field] = df[field].map(lambda x: list(x) if x is not None else [])
        df["timestamp_dt"] = pd.to_datetime(df["timestamp"], utc=True)
        return df

    def _features(self, df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
        wallet: dict[str, dict[str, Any]] = {}
        ip: dict[str, dict[str, Any]] = {}
        for row in df.to_dict("records"):
            ts = pd.Timestamp(row["timestamp_dt"])
            ips = {str(row["src_ip"]), str(row["dst_ip"])}
            countries = {str(row["geo_country"])}
            asns = {str(row["asn"])}
            txid = str(row["txid"])
            ins = [str(x) for x in row["input_addresses"]]
            outs = [str(x) for x in row["output_addresses"]]
            in_amts = [float(x) for x in row["input_amounts"]]
            out_amts = [float(x) for x in row["output_amounts"]]
            for addr, amount in zip(ins, in_amts):
                rec = wallet.setdefault(addr, self._wallet_rec(addr))
                self._wallet_update(rec, txid, ts, ips, countries, asns, amount, 0.0, True)
            for addr, amount in zip(outs, out_amts):
                rec = wallet.setdefault(addr, self._wallet_rec(addr))
                self._wallet_update(rec, txid, ts, ips, countries, asns, 0.0, amount, False)
            for address in ips:
                rec = ip.setdefault(address, self._ip_rec(address))
                rec["transactions"].add(txid); rec["wallets"].update(ins + outs); rec["countries"].update(countries); rec["asns"].update(asns); rec["timestamps"].append(ts)
                rec["observation_count"] += 1
        wallet_df = self._finalize_wallet(wallet)
        ip_df = self._finalize_ip(ip)
        # Reuse the Stage-3 graph artifact for structural features required by the ML spec.
        try:
            graph = GraphService().get_graph()
            degrees = {a.get("entity_id"): graph.degree(n) for n, a in graph.nodes(data=True) if a.get("type") == "wallet"}
            neighbors = {a.get("entity_id"): len(set(graph.predecessors(n)) | set(graph.successors(n))) for n, a in graph.nodes(data=True) if a.get("type") == "wallet"}
            components = {}
            for component in nx.weakly_connected_components(graph):
                size = len(component)
                for node in component:
                    if graph.nodes[node].get("type") == "wallet":
                        components[graph.nodes[node].get("entity_id")] = size
            wallet_df["graph_degree"] = wallet_df["entity_id"].map(degrees).fillna(0).astype(int)
            wallet_df["graph_unique_neighbors"] = wallet_df["entity_id"].map(neighbors).fillna(0).astype(int)
            wallet_df["component_size"] = wallet_df["entity_id"].map(components).fillna(1).astype(int)
        except Exception:
            # ML remains usable if a stale/missing graph cache is encountered; the graph stage is independent.
            wallet_df["graph_degree"] = 0
            wallet_df["graph_unique_neighbors"] = 0
            wallet_df["component_size"] = 1
        return wallet_df, ip_df

    @staticmethod
    def _wallet_rec(address: str) -> dict[str, Any]:
        return {
            "entity_id": address,
            "transactions": set(),
            "input_transactions": set(),
            "output_transactions": set(),
            "ips": set(),
            "countries": set(),
            "asns": set(),
            "counterparties": set(),
            "input_volume": 0.0,
            "output_volume": 0.0,
            "fees": [],
            "timestamps": [],
            "transaction_timestamps": {},
            "max_transaction_amount": 0.0,
        }

    @staticmethod
    def _wallet_update(
        rec: dict[str, Any],
        txid: str,
        ts: pd.Timestamp,
        ips: set[str],
        countries: set[str],
        asns: set[str],
        in_amount: float,
        out_amount: float,
        is_input: bool,
    ) -> None:
        rec["transactions"].add(txid)
        rec["ips"].update(ips)
        rec["countries"].update(countries)
        rec["asns"].update(asns)
        rec["timestamps"].append(ts)
        rec["transaction_timestamps"][txid] = ts

        amount = float(in_amount if is_input else out_amount)
        rec["max_transaction_amount"] = max(
            rec["max_transaction_amount"],
            amount,
        )

        if is_input:
            rec["input_transactions"].add(txid)
            rec["input_volume"] += in_amount
        else:
            rec["output_transactions"].add(txid)
            rec["output_volume"] += out_amount

    @staticmethod
    def _ip_rec(address: str) -> dict[str, Any]:
        return {
            "entity_id": address,
            "transactions": set(),
            "wallets": set(),
            "countries": set(),
            "asns": set(),
            "timestamps": [],
            "observation_count": 0,
        }

    def _finalize_wallet(self, records: dict[str, dict[str, Any]]) -> pd.DataFrame:
        rows = []

        for rec in records.values():
            ts = sorted(rec["timestamps"])
            tx_count = len(rec["transactions"])

            duration = (
                max((ts[-1] - ts[0]).total_seconds(), 0)
                if ts
                else 0
            )

            active_days = duration / 86400 + 1 if ts else 0
            volume = rec["input_volume"] + rec["output_volume"]

            # Temporal burst features.
            tx_times = sorted(rec["transaction_timestamps"].values())

            intervals = [
                (tx_times[i] - tx_times[i - 1]).total_seconds()
                for i in range(1, len(tx_times))
            ]

            def count_in_window(seconds: int) -> int:
                if not tx_times:
                    return 0

                max_count = 1
                left = 0

                for right in range(len(tx_times)):
                    while (
                        tx_times[right] - tx_times[left]
                    ).total_seconds() > seconds:
                        left += 1
                    max_count = max(max_count, right - left + 1)

                return max_count

            tx_1h = count_in_window(3600)
            tx_6h = count_in_window(6 * 3600)
            tx_24h = count_in_window(24 * 3600)

            max_tx_per_hour = tx_1h

            median_inter_tx_seconds = (
                float(np.median(intervals))
                if intervals
                else 0.0
            )

            min_inter_tx_seconds = (
                float(min(intervals))
                if intervals
                else 0.0
            )

            # Compare the strongest 1-hour burst against the
            # average hourly activity over the entity's active period.
            average_hourly_rate = (
                tx_count / max(duration / 3600, 1.0)
            )

            burst_ratio = (
                max_tx_per_hour / max(average_hourly_rate, 1e-9)
            )

            rows.append(
                {
                    "entity_id": rec["entity_id"],
                    "transaction_count": tx_count,
                    "input_transaction_count": len(
                        rec["input_transactions"]
                    ),
                    "output_transaction_count": len(
                        rec["output_transactions"]
                    ),
                    "input_volume": rec["input_volume"],
                    "output_volume": rec["output_volume"],
                    "total_volume": volume,
                    "average_amount": volume / max(tx_count, 1),

                    # Actual maximum individual transaction amount.
                    "max_amount": rec["max_transaction_amount"],

                    "unique_ip_count": len(rec["ips"]),
                    "country_count": len(rec["countries"]),
                    "asn_count": len(rec["asns"]),
                    "active_duration_hours": duration / 3600,
                    "transactions_per_day": tx_count / active_days,

                    # Temporal features.
                    "tx_1h": tx_1h,
                    "tx_6h": tx_6h,
                    "tx_24h": tx_24h,
                    "max_tx_per_hour": max_tx_per_hour,
                    "median_inter_tx_seconds": median_inter_tx_seconds,
                    "min_inter_tx_seconds": min_inter_tx_seconds,
                    "burst_ratio": burst_ratio,

                    "in_out_ratio": (
                        rec["input_volume"]
                        / max(rec["output_volume"], 1e-9)
                    ),
                    "first_seen": (
                        ts[0].isoformat()
                        if ts
                        else None
                    ),
                    "last_activity": (
                        ts[-1].isoformat()
                        if ts
                        else None
                    ),
                    "ips": sorted(rec["ips"]),
                    "countries": sorted(rec["countries"]),
                    "asns": sorted(rec["asns"]),
                    "transaction_ids": sorted(
                        rec["transactions"]
                    ),
                }
            )

        return pd.DataFrame(rows)

    def _finalize_ip(self, records: dict[str, dict[str, Any]]) -> pd.DataFrame:
        rows=[]
        for rec in records.values():
            ts=sorted(rec["timestamps"])
            rows.append({"entity_id":rec["entity_id"],"observation_count":rec["observation_count"],"transaction_count":len(rec["transactions"]),"wallet_count":len(rec["wallets"]),"country_count":len(rec["countries"]),"asn_count":len(rec["asns"]),"first_seen":ts[0].isoformat() if ts else None,"last_activity":ts[-1].isoformat() if ts else None,"countries":sorted(rec["countries"]),"asns":sorted(rec["asns"]),"wallets":sorted(rec["wallets"]),"transactions":sorted(rec["transactions"])})
        return pd.DataFrame(rows)

    def _anomaly(self, wallet_df: pd.DataFrame, ip_df: pd.DataFrame) -> None:
        # Isolation Forest now sees both aggregate and temporal behavior.
        # anomaly_score remains a population-relative anomaly score,
        # not a probability of illicit activity.
        wallet_cols=[
            "transaction_count",
            "input_volume",
            "output_volume",
            "average_amount",
            "max_amount",
            "unique_ip_count",
            "country_count",
            "asn_count",
            "active_duration_hours",
            "transactions_per_day",
            "tx_1h",
            "tx_6h",
            "tx_24h",
            "max_tx_per_hour",
            "median_inter_tx_seconds",
            "min_inter_tx_seconds",
            "burst_ratio",
            "in_out_ratio",
            "graph_degree",
            "graph_unique_neighbors",
            "component_size",
        ]
        ip_cols=["observation_count","transaction_count","wallet_count","country_count","asn_count"]
        for df, cols in ((wallet_df,wallet_cols),(ip_df,ip_cols)):
            x=df[cols].replace([np.inf,-np.inf],np.nan).fillna(0).astype(float)
            x=np.log1p(x)
            model=IsolationForest(n_estimators=200, contamination="auto", random_state=26146, n_jobs=-1)
            model.fit(x)
            raw=-model.decision_function(x)
            lo,hi=float(raw.min()),float(raw.max())
            score=(raw-lo)/(hi-lo) if hi>lo else np.zeros(len(raw))
            df["anomaly_score"]=np.clip(score,0,1)
            df["anomaly_level"]=pd.cut(df["anomaly_score"],bins=[-0.01,.45,.70,1.01],labels=["LOW","MEDIUM","HIGH"]).astype(str)

    def _clusters(self, wallet_df: pd.DataFrame) -> list[dict[str, Any]]:
        cols=["transaction_count","input_volume","output_volume","unique_ip_count","country_count","asn_count","transactions_per_day","in_out_ratio","anomaly_score"]
        x=wallet_df[cols].replace([np.inf,-np.inf],np.nan).fillna(0).astype(float)
        x=np.log1p(x)
        x=StandardScaler().fit_transform(x)
        labels=DBSCAN(eps=1.45,min_samples=5,n_jobs=-1).fit_predict(x)
        wallet_df["cluster_label"]=labels
        clusters=[]
        for label, group in wallet_df[wallet_df["cluster_label"]>=0].groupby("cluster_label"):
            members=group.sort_values("anomaly_score",ascending=False)
            ips=sorted({ip for values in members["ips"] for ip in values})
            countries=sorted({c for values in members["countries"] for c in values})
            tags=[]
            if members["transactions_per_day"].mean()>20: tags.append("high velocity")
            if members["unique_ip_count"].mean()>2: tags.append("network diversity")
            if members["anomaly_score"].mean()>.45: tags.append("anomalous behavior")
            if not tags: tags.append("behavioral similarity")
            cid=f"C-{int(label):03d}"
            clusters.append({"id":cid,"name":f"Behavioral cluster {int(label):03d}","walletCount":len(members),"ipCount":len(ips),"countries":len(countries),"countriesList":countries,"totalVolumeBtc":float(members["total_volume"].sum()),"avgAnomalyScore":float(members["anomaly_score"].mean()),"behavioralTags":tags,"memberWalletIds":members["entity_id"].tolist(),"associatedIpIds":ips,"associatedTxIds":sorted({t for values in members["transaction_ids"] for t in values})[:500],"created":datetime.now(timezone.utc).isoformat()})
        clusters.sort(key=lambda x:x["avgAnomalyScore"], reverse=True)
        wallet_df["cluster_id"]=wallet_df["cluster_label"].map(lambda x: f"C-{int(x):03d}" if int(x)>=0 else "")
        return clusters

    def _patterns(self, df: pd.DataFrame) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        """Detect explainable transaction-flow patterns.

        The detector deliberately keeps three distinct families:
        * peeling: repeated output-to-input value continuity across hops;
        * classic mixing-like: one transaction with substantial fan-in/fan-out;
        * repeated-fanout: repeated high fan-out transactions reusing the same
          output set and similar output amounts.  This catches structured
          distribution behaviour that a 4-input/4-output-only detector misses.

        These are investigative candidates, not proof of illicit activity.
        """
        peel: list[dict[str, Any]] = []
        mix: list[dict[str, Any]] = []
        txs: list[dict[str, Any]] = []

        for row in df.to_dict("records"):
            txs.append({
                "txid": str(row["txid"]),
                "timestamp": pd.Timestamp(row["timestamp"]),
                "inputs": [str(x) for x in (row.get("input_addresses") or [])],
                "outputs": [str(x) for x in (row.get("output_addresses") or [])],
                "input_amounts": [float(x) for x in (row.get("input_amounts") or [])],
                "output_amounts": [float(x) for x in (row.get("output_amounts") or [])],
                "fee": float(row.get("fee", 0.0)),
            })
        txs.sort(key=lambda x: (x["timestamp"], x["txid"]))

        # Address -> spending transactions with amount information.
        by_input: dict[str, list[tuple[dict[str, Any], float | None]]] = {}
        for tx in txs:
            for i, address in enumerate(tx["inputs"]):
                amount = (
                    tx["input_amounts"][i]
                    if i < len(tx["input_amounts"])
                    else None
                )
                by_input.setdefault(address, []).append((tx, amount))

        def next_spend(address: str, amount: float, after_ts: pd.Timestamp) -> list[dict[str, Any]]:
            if amount <= 0:
                return []
            matches: list[dict[str, Any]] = []
            for nxt, in_amount in by_input.get(address, []):
                if nxt["timestamp"] <= after_ts:
                    continue
                if (nxt["timestamp"] - after_ts).total_seconds() > 72 * 3600:
                    continue
                if in_amount is None:
                    continue
                if abs(float(in_amount) - amount) <= max(1e-8, abs(amount) * 0.002):
                    matches.append(nxt)
            return sorted(matches, key=lambda x: (x["timestamp"], x["txid"]))

        # ------------------------------------------------------------------
        # Peeling chains: amount-continuous output -> input hops.
        # ------------------------------------------------------------------
        seen_peel: set[tuple[str, ...]] = set()
        for start_tx in txs:
            if len(start_tx["outputs"]) < 2:
                continue
            for oi, address in enumerate(start_tx["outputs"]):
                amount = (
                    start_tx["output_amounts"][oi]
                    if oi < len(start_tx["output_amounts"])
                    else 0.0
                )
                if amount <= 0:
                    continue
                largest = max(start_tx["output_amounts"] or [amount])
                if amount >= largest * 0.98:
                    continue
                first = next_spend(address, amount, start_tx["timestamp"])
                if not first:
                    continue

                seq = [start_tx, first[0]]
                bridges = [address]
                while len(seq) < 6:
                    current = seq[-1]
                    options: list[tuple[dict[str, Any], str]] = []
                    seq_ids = {x["txid"] for x in seq}
                    for oi2, address2 in enumerate(current["outputs"]):
                        amount2 = (
                            current["output_amounts"][oi2]
                            if oi2 < len(current["output_amounts"])
                            else 0.0
                        )
                        if amount2 <= 0:
                            continue
                        if (
                            len(current["outputs"]) >= 2
                            and amount2 >= max(current["output_amounts"]) * 0.98
                        ):
                            continue
                        for nxt in next_spend(address2, amount2, current["timestamp"]):
                            if nxt["txid"] not in seq_ids:
                                options.append((nxt, address2))
                    if not options:
                        break
                    nxt, bridge = min(options, key=lambda x: (x[0]["timestamp"], x[0]["txid"]))
                    seq.append(nxt)
                    bridges.append(bridge)

                if len(seq) < 3:
                    continue
                key = tuple(x["txid"] for x in seq)
                if key in seen_peel:
                    continue
                seen_peel.add(key)

                gaps = [
                    (seq[i]["timestamp"] - seq[i - 1]["timestamp"]).total_seconds() / 3600
                    for i in range(1, len(seq))
                ]
                non_dom = sum(
                    1
                    for tx in seq
                    if len(tx["outputs"]) >= 2
                    and any(
                        a > 0 and a < max(tx["output_amounts"]) * 0.98
                        for a in tx["output_amounts"]
                    )
                )
                median_gap = float(np.median(gaps)) if gaps else 0.0
                score = (
                    min(len(seq) - 1, 5) / 5 * 0.45
                    + non_dom / len(seq) * 0.35
                    + min(1 / (max(median_gap, 0.25) / 24), 1) * 0.20
                )

                steps = []
                for i, tx in enumerate(seq):
                    bridge = bridges[i] if i < len(bridges) else (
                        tx["outputs"][0] if tx["outputs"] else "unknown"
                    )
                    bridge_amount = 0.0
                    if bridge in tx["outputs"]:
                        idx = tx["outputs"].index(bridge)
                        if idx < len(tx["output_amounts"]):
                            bridge_amount = tx["output_amounts"][idx]
                    steps.append({
                        "id": f"{tx['txid']}:bridge:{i}",
                        "walletId": bridge,
                        "walletLabel": bridge,
                        "amount": float(bridge_amount),
                        "txId": tx["txid"],
                        "timestamp": tx["timestamp"].isoformat(),
                        "fee": tx["fee"],
                    })

                peel.append({
                    "kind": "peeling",
                    "confidence": "high" if len(seq) >= 5 and score >= 0.65 else "medium",
                    "description": "Candidate peeling chain with repeated output-to-input value continuation.",
                    "observations": [
                        f"{len(seq) - 1} continuation hops observed",
                        "Continuation address and amount matched across hops",
                        f"Median hop gap {median_gap:.1f} hours",
                        "Non-dominant continuation outputs observed",
                        "Pattern requires analyst review",
                    ],
                    "steps": steps,
                    "pattern_type": "peeling-chain",
                    "pattern_score": round(float(score), 4),
                    "hop_count": len(seq) - 1,
                })
                break
            if len(peel) >= 80:
                break

        peel.sort(key=lambda p: (-p["pattern_score"], -p["hop_count"], p["steps"][0]["txId"]))
        peel = peel[:40]
        for i, pattern in enumerate(peel, 1):
            pattern["id"] = f"PAT-PEEL-{i:04d}"

        # ------------------------------------------------------------------
        # Classic mixing-like candidates: substantial fan-in/fan-out,
        # similar-valued outputs and approximate value conservation.
        # ------------------------------------------------------------------
        for tx in txs:
            ni, no = len(tx["inputs"]), len(tx["outputs"])
            if ni < 4 or no < 4:
                continue
            ins = [x for x in tx["input_amounts"] if x > 0]
            outs = [x for x in tx["output_amounts"] if x > 0]
            if len(ins) < 4 or len(outs) < 4:
                continue
            med = float(np.median(outs))
            if med <= 0:
                continue
            sim = sum(abs(x - med) / med <= 0.12 for x in outs) / len(outs)
            cv = float(np.std(outs) / max(med, 1e-9))
            conservation = sum(outs) / max(sum(ins), 1e-9)
            if sim < 0.75 or cv > 0.18 or conservation < 0.70 or conservation > 1.001:
                continue
            score = (
                min(ni / 8, 1) * 0.25
                + min(no / 8, 1) * 0.25
                + sim * 0.30
                + max(0, 1 - cv / 0.18) * 0.20
            )
            steps = []
            for i, wallet in enumerate(tx["inputs"][:8]):
                steps.append({
                    "id": f"{tx['txid']}:in:{i}",
                    "walletId": wallet,
                    "walletLabel": wallet,
                    "amount": float(tx["input_amounts"][i] if i < len(tx["input_amounts"]) else 0),
                    "txId": tx["txid"],
                    "timestamp": tx["timestamp"].isoformat(),
                    "direction": "input",
                    "fee": tx["fee"],
                })
            for i, wallet in enumerate(tx["outputs"][:8]):
                steps.append({
                    "id": f"{tx['txid']}:out:{i}",
                    "walletId": wallet,
                    "walletLabel": wallet,
                    "amount": float(tx["output_amounts"][i] if i < len(tx["output_amounts"]) else 0),
                    "txId": tx["txid"],
                    "timestamp": tx["timestamp"].isoformat(),
                    "direction": "output",
                    "fee": tx["fee"],
                })
            mix.append({
                "kind": "mixing",
                "confidence": "high" if score >= 0.80 and ni >= 5 and no >= 5 else "medium",
                "description": "Candidate mixing-like fan-in/fan-out transaction with similar-value outputs.",
                "observations": [
                    f"{ni} inputs and {no} outputs",
                    f"{sim * 100:.0f}% of outputs are within 12% of median output value",
                    f"Output/input value ratio {conservation:.3f}",
                    f"Output-value coefficient of variation {cv:.3f}",
                    "Pattern requires analyst review",
                ],
                "steps": steps,
                "pattern_type": "mixing-like",
                "pattern_score": round(float(score), 4),
                "input_count": ni,
                "output_count": no,
                "output_similarity": round(float(sim), 4),
                "value_conservation": round(float(conservation), 6),
            })

        # ------------------------------------------------------------------
        # Repeated high-fanout detector.
        #
        # Some structured distribution patterns are 1->N rather than N->N.
        # We group transactions by the exact set of output wallets, then require
        # repeated observations, similar amounts, approximate conservation and
        # a bounded time span.  This is deliberately conservative and produces
        # an explainable candidate rather than a definitive classification.
        # ------------------------------------------------------------------
        fanout_groups: dict[tuple[str, ...], list[dict[str, Any]]] = {}
        for tx in txs:
            ni, no = len(tx["inputs"]), len(tx["outputs"])
            if ni < 1 or ni > 3 or no < 8 or no > 50:
                continue
            outputs = [str(x) for x in tx["outputs"]]
            if len(set(outputs)) != len(outputs):
                continue
            key = tuple(sorted(outputs))
            fanout_groups.setdefault(key, []).append(tx)

        repeated_patterns: list[dict[str, Any]] = []
        for output_set, group in fanout_groups.items():
            group = sorted(group, key=lambda x: (x["timestamp"], x["txid"]))
            if len(group) < 3:
                continue

            # Split very long-lived groups into local windows so unrelated
            # reuse of the same address set does not become one giant pattern.
            windows: list[list[dict[str, Any]]] = []
            current: list[dict[str, Any]] = []
            for tx in group:
                if not current or (tx["timestamp"] - current[0]["timestamp"]).total_seconds() <= 72 * 3600:
                    current.append(tx)
                else:
                    if len(current) >= 3:
                        windows.append(current)
                    current = [tx]
            if len(current) >= 3:
                windows.append(current)

            for window in windows:
                similarity_values: list[float] = []
                cvs: list[float] = []
                conservations: list[float] = []
                valid_txs: list[dict[str, Any]] = []
                for tx in window:
                    outs = [x for x in tx["output_amounts"] if x > 0]
                    ins = [x for x in tx["input_amounts"] if x > 0]
                    if len(outs) < 8 or not ins:
                        continue
                    med = float(np.median(outs))
                    if med <= 0:
                        continue
                    similarity = sum(abs(x - med) / med <= 0.15 for x in outs) / len(outs)
                    cv = float(np.std(outs) / max(med, 1e-9))
                    conservation = sum(outs) / max(sum(ins), 1e-9)
                    if similarity < 0.75 or cv > 0.25 or conservation < 0.70 or conservation > 1.005:
                        continue
                    similarity_values.append(float(similarity))
                    cvs.append(cv)
                    conservations.append(conservation)
                    valid_txs.append(tx)

                if len(valid_txs) < 3:
                    continue

                span_hours = (valid_txs[-1]["timestamp"] - valid_txs[0]["timestamp"]).total_seconds() / 3600
                gaps = [
                    (valid_txs[i]["timestamp"] - valid_txs[i - 1]["timestamp"]).total_seconds() / 3600
                    for i in range(1, len(valid_txs))
                ]
                median_gap = float(np.median(gaps)) if gaps else 0.0
                avg_similarity = float(np.mean(similarity_values))
                avg_cv = float(np.mean(cvs))
                avg_conservation = float(np.mean(conservations))
                repeat_strength = min(len(valid_txs) / 8.0, 1.0)
                fanout_strength = min(len(output_set) / 20.0, 1.0)
                reuse_strength = 1.0  # exact output-set reuse by construction
                temporal_strength = 1.0 if span_hours <= 24 else max(0.0, 1.0 - (span_hours - 24) / 48)
                amount_strength = max(0.0, min(1.0, avg_similarity * (1.0 - min(avg_cv / 0.25, 1.0))))
                score = (
                    repeat_strength * 0.25
                    + fanout_strength * 0.20
                    + reuse_strength * 0.25
                    + temporal_strength * 0.10
                    + amount_strength * 0.20
                )

                steps: list[dict[str, Any]] = []
                for tx in valid_txs:
                    for i, wallet in enumerate(tx["inputs"]):
                        steps.append({
                            "id": f"{tx['txid']}:in:{i}",
                            "walletId": wallet,
                            "walletLabel": wallet,
                            "amount": float(tx["input_amounts"][i] if i < len(tx["input_amounts"]) else 0),
                            "txId": tx["txid"],
                            "timestamp": tx["timestamp"].isoformat(),
                            "direction": "input",
                            "fee": tx["fee"],
                        })
                    for i, wallet in enumerate(tx["outputs"]):
                        steps.append({
                            "id": f"{tx['txid']}:out:{i}",
                            "walletId": wallet,
                            "walletLabel": wallet,
                            "amount": float(tx["output_amounts"][i] if i < len(tx["output_amounts"]) else 0),
                            "txId": tx["txid"],
                            "timestamp": tx["timestamp"].isoformat(),
                            "direction": "output",
                            "fee": tx["fee"],
                        })

                repeated_patterns.append({
                    "kind": "mixing",
                    "confidence": "high" if score >= 0.80 and len(valid_txs) >= 5 else "medium",
                    "description": "Candidate repeated high-fanout distribution pattern with reused outputs and similar values.",
                    "observations": [
                        f"{len(valid_txs)} repeated transactions share the same {len(output_set)}-wallet output set",
                        "100% output-set reuse across the candidate transactions",
                        f"Average output similarity {avg_similarity * 100:.0f}% within 15% of median",
                        f"Average output-value coefficient of variation {avg_cv:.3f}",
                        f"Average output/input value ratio {avg_conservation:.3f}",
                        f"Median transaction gap {median_gap:.2f} hours",
                        f"Observation span {span_hours:.2f} hours",
                        "Pattern requires analyst review",
                    ],
                    "steps": steps,
                    "pattern_type": "repeated-fanout",
                    "pattern_score": round(float(score), 4),
                    "input_count_min": min(len(tx["inputs"]) for tx in valid_txs),
                    "input_count_max": max(len(tx["inputs"]) for tx in valid_txs),
                    "output_count": len(output_set),
                    "repeated_transaction_count": len(valid_txs),
                    "output_set_reuse": 1.0,
                    "output_similarity": round(avg_similarity, 4),
                    "value_conservation": round(avg_conservation, 6),
                    "median_gap_hours": round(median_gap, 4),
                    "observation_span_hours": round(span_hours, 4),
                })

        mix.extend(repeated_patterns)

        # Deduplicate classic candidates by transaction and repeated-fanout
        # candidates by their output set + transaction window.
        unique: dict[tuple[Any, ...], dict[str, Any]] = {}
        for pattern in mix:
            if pattern.get("pattern_type") == "repeated-fanout":
                wallets = tuple(sorted({
                    str(step.get("walletId"))
                    for step in pattern.get("steps", [])
                    if step.get("direction") == "output" and step.get("walletId")
                }))
                txids = tuple(sorted({str(step.get("txId")) for step in pattern.get("steps", [])}))
                key = ("fanout", wallets, txids)
            else:
                txids = tuple(sorted({str(step.get("txId")) for step in pattern.get("steps", [])}))
                key = ("classic", txids)
            if key not in unique or pattern["pattern_score"] > unique[key]["pattern_score"]:
                unique[key] = pattern

        mix = sorted(
            unique.values(),
            key=lambda p: (
                -float(p["pattern_score"]),
                0 if p.get("pattern_type") == "repeated-fanout" else 1,
                -int(p.get("repeated_transaction_count", 0)),
                -int(p.get("output_count", 0)),
                str(p["steps"][0]["txId"]),
            ),
        )[:60]
        for i, pattern in enumerate(mix, 1):
            pattern["id"] = f"PAT-MIX-{i:04d}"

        patterns = peel + mix
        return patterns, list(patterns)

    def _leads(self, wallet_df, ip_df, clusters, patterns, observations):
        """
        Generate investigation leads using rank-fused, multi-channel evidence.

        The score is an analyst-triage ranking, not a probability of illicit
        activity.  A small evidence-diversity reserve prevents a large
        population of high-ML-anomaly wallets from crowding out wallets that
        are unusual mainly because of temporal, network, graph, or flow
        evidence.
        """
        pattern_by_wallet = {}
        pattern_kind_by_wallet = {}
        # Count each pattern once per wallet, even if that wallet appears in
        # several steps of the same transaction/pattern.
        for p in patterns:
            kind = str(p.get("kind", "flow"))
            seen_wallets = set()
            for step in p.get("steps", []):
                wid = step.get("walletId")
                if not wid or wid in seen_wallets:
                    continue
                seen_wallets.add(wid)
                pattern_by_wallet.setdefault(wid, []).append(p)
                pattern_kind_by_wallet.setdefault(wid, set()).add(kind)

        cluster_map = {
            w: c["id"]
            for c in clusters
            for w in c["memberWalletIds"]
        }

        # Candidate pool: any independent evidence channel can nominate a
        # wallet.  Thresholds are intentionally permissive because the final
        # ranking below does the discrimination.
        anomaly_mask = wallet_df["anomaly_score"] >= 0.45
        temporal_mask = (
            (wallet_df["tx_1h"] >= 2)
            | (wallet_df["tx_6h"] >= 4)
            | (wallet_df["tx_24h"] >= 6)
            | (wallet_df["burst_ratio"] >= 2.0)
        )
        network_mask = (
            (wallet_df["unique_ip_count"] >= 2)
            | (wallet_df["country_count"] >= 2)
            | (wallet_df["asn_count"] >= 2)
        )
        graph_mask = (
            (wallet_df["graph_degree"] >= 3)
            | (wallet_df["graph_unique_neighbors"] >= 3)
            | (wallet_df["component_size"] >= 8)
        )

        candidate_ids = set()
        for mask in (anomaly_mask, temporal_mask, network_mask, graph_mask):
            candidate_ids.update(wallet_df.loc[mask, "entity_id"].tolist())
        candidate_ids.update(pattern_by_wallet.keys())

        candidates = wallet_df[
            wallet_df["entity_id"].isin(candidate_ids)
        ].copy()

        # Build comparable [0,1] channel strengths.  Using bounded feature
        # transforms instead of raw additive points prevents score saturation.
        scored = []
        for _, row in candidates.iterrows():
            wid = row["entity_id"]

            anomaly = float(row["anomaly_score"])
            tx_1h = int(row["tx_1h"])
            tx_6h = int(row["tx_6h"])
            tx_24h = int(row["tx_24h"])
            burst = float(row["burst_ratio"])
            ip_count = int(row["unique_ip_count"])
            country_count = int(row["country_count"])
            asn_count = int(row["asn_count"])
            graph_degree = int(row["graph_degree"])
            graph_neighbors = int(row["graph_unique_neighbors"])
            component_size = int(row["component_size"])

            anomaly_strength = max(0.0, min(1.0, (anomaly - 0.40) / 0.60))

            temporal_strength = max(
                0.0,
                min(
                    1.0,
                    max(
                        tx_1h / 6.0,
                        tx_6h / 12.0,
                        tx_24h / 24.0,
                        burst / 5.0,
                    ),
                ),
            )

            network_strength = max(
                0.0,
                min(
                    1.0,
                    max(
                        ip_count / 10.0,
                        country_count / 5.0,
                        asn_count / 4.0,
                    ),
                ),
            )

            graph_strength = max(
                0.0,
                min(
                    1.0,
                    max(
                        graph_degree / 12.0,
                        graph_neighbors / 12.0,
                        component_size / 40.0,
                    ),
                ),
            )

            wallet_patterns = pattern_by_wallet.get(wid, [])
            pattern_count = len(wallet_patterns)
            pattern_kinds = len(pattern_kind_by_wallet.get(wid, set()))
            best_pattern_score = max(
                (float(p.get("pattern_score", 0.0)) for p in wallet_patterns),
                default=0.0,
            )
            # A single strong, explainable pattern is itself a valid evidence
            # channel.  Do not require two patterns before the pattern channel
            # can become active, otherwise rare but high-quality flow findings
            # are systematically under-ranked.
            pattern_strength = max(
                0.0,
                min(
                    1.0,
                    0.55 * min(pattern_count / 2.0, 1.0)
                    + 0.20 * min(pattern_kinds / 2.0, 1.0)
                    + 0.25 * best_pattern_score,
                ),
            )

            channel_values = {
                "ml": anomaly_strength,
                "temporal": temporal_strength,
                "network": network_strength,
                "graph": graph_strength,
                "pattern": pattern_strength,
            }
            active_channels = [
                name for name, value in channel_values.items()
                if value >= 0.55
            ]

            # Weighted rank-fusion style score.  The channel weights sum to
            # 100, so the resulting score is directly interpretable as an
            # evidence-ranking score on a 0-100 scale.
            base_score = (
                30.0 * anomaly_strength
                + 25.0 * temporal_strength
                + 15.0 * network_strength
                + 15.0 * graph_strength
                + 15.0 * pattern_strength
            )

            # Independent channels reinforce one another, but the bonus is
            # deliberately small so that one noisy feature cannot dominate.
            diversity_bonus = min(8.0, max(0, len(active_channels) - 1) * 2.0)
            score = min(100.0, base_score + diversity_bonus)
            
            scored.append({
                "wid": wid,
                "row": row,
                "score": score,
                "channels": channel_values,
                "active_channels": active_channels,
            })

        # Primary ranking.
        scored.sort(
            key=lambda x: (
                -x["score"],
                -len(x["active_channels"]),
                -float(x["channels"]["ml"]),
                x["wid"],
            )
        )

        # Evidence-diversity reserve:
        # keep most slots globally ranked, but reserve a bounded set for
        # wallets whose strongest evidence is temporal/network/graph/pattern.
        #
        # This is not a claim that those wallets are more important; it is a
        # coverage mechanism for analyst triage.
        total_slots = min(150, len(scored))
        reserve_target = min(30, max(0, total_slots // 5))
        global_target = total_slots - reserve_target

        selected = []
        selected_ids = set()

        for item in scored[:global_target]:
            selected.append(item)
            selected_ids.add(item["wid"])

        reserve_specs = [
            ("temporal", 8),
            ("network", 8),
            ("graph", 7),
            ("pattern", 7),
        ]
        for channel, quota in reserve_specs:
            if len(selected) >= total_slots:
                break
            eligible = [
                x for x in scored
                if x["wid"] not in selected_ids
                and x["channels"][channel] >= 0.55
            ]
            for item in eligible[:quota]:
                if len(selected) >= total_slots:
                    break
                selected.append(item)
                selected_ids.add(item["wid"])

        # Fill any unused reserve slots from the remaining global ranking.
        if len(selected) < total_slots:
            for item in scored:
                if item["wid"] in selected_ids:
                    continue
                selected.append(item)
                selected_ids.add(item["wid"])
                if len(selected) >= total_slots:
                    break

        # Present the final list in score order while retaining a small marker
        # showing that a reserve slot was used when applicable.
        selected.sort(
            key=lambda x: (
                -x["score"],
                -len(x["active_channels"]),
                -float(x["channels"]["ml"]),
                x["wid"],
            )
        )

        leads = []
        evidence = {}
        findings = {}
        timelines = {}

        # -----------------------------------------
        # TRANSACTION LOOKUP FOR INVESTIGATION TIMELINES
        # -----------------------------------------
        transaction_lookup = {}

        for tx_row in (
            observations
            .drop_duplicates(subset=["txid"], keep="first")
            .to_dict("records")
        ):
            txid = str(tx_row.get("txid", ""))

            if txid:
                transaction_lookup[txid] = tx_row

        for rank, item in enumerate(selected, start=1):
            row = item["row"]
            wid = item["wid"]
            ch = item["channels"]
            signals = []
            ev = []

            def add_evidence(channel, condition, signal, title, description,
                             metric, severity="medium"):
                if not condition:
                    return
                signals.append(signal)
                ev.append({
                    "kind": channel,
                    "severity": severity,
                    "title": title,
                    "description": description,
                    "metric": metric,
                })

            add_evidence(
                "ML finding",
                ch["ml"] >= 0.55,
                "Elevated ML anomaly score",
                "ML anomaly score",
                "The entity is statistically unusual relative to the analyzed population.",
                f"{float(row['anomaly_score']):.2f}",
                "high" if ch["ml"] >= 0.80 else "medium",
            )
            add_evidence(
                "temporal",
                int(row["tx_1h"]) >= 2,
                "Short-window transaction activity",
                "1-hour transaction activity",
                f"Up to {int(row['tx_1h'])} transactions occurred within a 1-hour window.",
                str(int(row["tx_1h"])),
                "high" if int(row["tx_1h"]) >= 6 else "medium",
            )
            add_evidence(
                "temporal",
                int(row["tx_6h"]) >= 4,
                "Elevated 6-hour activity",
                "6-hour transaction activity",
                f"Up to {int(row['tx_6h'])} transactions occurred within a 6-hour window.",
                str(int(row["tx_6h"])),
            )
            add_evidence(
                "temporal",
                int(row["tx_24h"]) >= 6,
                "Elevated 24-hour activity",
                "24-hour transaction activity",
                f"Up to {int(row['tx_24h'])} transactions occurred within a 24-hour window.",
                str(int(row["tx_24h"])),
            )
            add_evidence(
                "temporal",
                float(row["burst_ratio"]) >= 2.0,
                "Burst-like activity profile",
                "Burst ratio",
                "Peak hourly activity is substantially above the entity's average hourly rate.",
                f"{float(row['burst_ratio']):.2f}x",
            )
            add_evidence(
                "network",
                int(row["unique_ip_count"]) >= 2,
                "Network diversity",
                "Multiple observed IPs",
                f"The wallet was observed with {int(row['unique_ip_count'])} IP addresses.",
                str(int(row["unique_ip_count"])),
            )
            add_evidence(
                "network",
                int(row["country_count"]) >= 2,
                "Cross-country activity",
                "Observed countries",
                f"The wallet was observed across {int(row['country_count'])} countries.",
                str(int(row["country_count"])),
            )
            add_evidence(
                "network",
                int(row["asn_count"]) >= 2,
                "Multiple network providers",
                "Observed ASNs",
                f"The wallet was associated with {int(row['asn_count'])} network providers.",
                str(int(row["asn_count"])),
            )
            add_evidence(
                "graph",
                int(row["graph_degree"]) >= 3,
                "High graph connectivity",
                "Graph degree",
                f"The wallet has {int(row['graph_degree'])} graph connections.",
                str(int(row["graph_degree"])),
            )
            add_evidence(
                "graph",
                int(row["graph_unique_neighbors"]) >= 3,
                "Many graph neighbors",
                "Unique graph neighbors",
                f"The wallet has {int(row['graph_unique_neighbors'])} unique graph neighbors.",
                str(int(row["graph_unique_neighbors"])),
            )
            add_evidence(
                "graph",
                int(row["component_size"]) >= 8,
                "Large connected component",
                "Connected component size",
                f"The wallet belongs to a component containing {int(row['component_size'])} entities.",
                str(int(row["component_size"])),
            )

            # Pattern evidence is kept specific to the detected pattern kind
            # rather than repeating a generic "candidate pattern" message.
            seen_kinds = set()
            for p in pattern_by_wallet.get(wid, [])[:3]:
                kind = str(p.get("kind", "flow"))
                if kind in seen_kinds:
                    continue
                seen_kinds.add(kind)
                pattern_type = str(p.get("pattern_type", ""))
                label = {
                    "peeling": "Peeling-chain candidate",
                    "mixing": "Mixing-like transaction candidate",
                }.get(kind, "Transaction-flow candidate")
                if pattern_type == "repeated-fanout":
                    label = "Repeated high-fanout candidate"
                signals.append(label)
                ev.append({
                    "kind": "pattern finding",
                    "severity": "medium",
                    "title": p.get("description", label),
                    "description": "; ".join(p.get("observations", [])),
                    "metric": p.get("id", ""),
                    "patternType": pattern_type or kind,
                    "patternScore": p.get("pattern_score", 0.0),
                })

            channel_count = len(item["active_channels"])
            # Evidence coverage, not probability of illicit activity.
            confidence = min(
                0.95,
                0.35 + channel_count * 0.10 + item["score"] / 500.0,
            )

            # Priority is a triage category relative to the selected lead set.
            # The underlying priorityScore remains the 0-100 evidence-ranking score.
            # Top 25% of selected leads -> high; remaining leads -> medium.
            high_cutoff = max(1, int(np.ceil(len(selected) * 0.25)))
            priority = "high" if rank <= high_cutoff else "medium"

            lead_id = f"LEAD-{rank:04d}"
            cluster = cluster_map.get(wid, "")

            leads.append({
                "rank": rank,
                "entityId": wid,
                "entityLabel": wid,
                "type": "wallet",
                "priority": priority,
                "priorityScore": item["score"],
                "anomalyScore": round(float(row["anomaly_score"]) * 100, 2),
                "mlAnomaly": str(row["anomaly_level"]),
                "clusterId": cluster,
                "signals": signals or ["Observed behavioral deviation"],
                "lastActivity": row["last_activity"],
                "confidence": round(confidence, 2),
                "confidenceType": "evidence_coverage",
                "channelCount": channel_count,
                "evidenceChannels": item["active_channels"],
                "leadId": lead_id,
            })

            evidence[wid] = ev or [{
                "kind": "observed_data",
                "severity": "low",
                "title": "Observed activity",
                "description": "The entity has activity in the analyzed dataset.",
                "metric": str(int(row["transaction_count"])),
            }]

            findings[wid] = [{
                "model": "IsolationForest",
                "metric": "anomaly_score",
                "value": float(row["anomaly_score"]),
                "label": str(row["anomaly_level"]),
                "description": (
                    "Relative anomaly score produced by the unsupervised model; "
                    "this is not a probability of illicit activity."
                ),
            }]

            # -----------------------------------------
            # REAL TRANSACTION TIMELINE
            # -----------------------------------------
            txids = list(row["transaction_ids"])

            timeline_records = []

            for tx in txids:
                tx_data = transaction_lookup.get(str(tx))

                if not tx_data:
                    continue

                input_addresses = [
                    str(x)
                    for x in (tx_data.get("input_addresses") or [])
                ]

                output_addresses = [
                    str(x)
                    for x in (tx_data.get("output_addresses") or [])
                ]

                input_amounts = [
                    float(x)
                    for x in (tx_data.get("input_amounts") or [])
                ]

                output_amounts = [
                    float(x)
                    for x in (tx_data.get("output_amounts") or [])
                ]

                # Determine how this wallet participated in the transaction.
                input_amount = sum(
                    amount
                    for address, amount in zip(input_addresses, input_amounts)
                    if address == wid
                )

                output_amount = sum(
                    amount
                    for address, amount in zip(output_addresses, output_amounts)
                    if address == wid
                )

                if input_amount > 0:
                    direction = "in"
                    amount = input_amount
                elif output_amount > 0:
                    direction = "out"
                    amount = output_amount
                else:
                    # Keep the transaction visible even if the wallet's
                    # address-level amount could not be resolved.
                    direction = "out"
                    amount = 0.0

                timestamp = tx_data.get("timestamp")
                fee = float(tx_data.get("fee", 0.0) or 0.0)

                timeline_records.append(
                    {
                        "id": f"{wid}:{tx}",
                        "timestamp": (
                            pd.Timestamp(timestamp).isoformat()
                            if timestamp is not None
                            else None
                        ),
                        "txId": str(tx),
                        "amount": float(amount),
                        "direction": direction,
                        "relatedEntity": wid,
                        "relatedEntityType": "wallet",
                        "fee": fee,
                    }
                )

            # Show the most recent 20 transactions.
            timeline_records.sort(
                key=lambda x: (
                    x["timestamp"] or "",
                    x["txId"],
                ),
                reverse=True,
            )

            timelines[wid] = timeline_records[:20]

        return leads, evidence, findings, timelines

    def _summary(self, obs,wallet,ip,clusters,patterns,leads,duration):
        return {"recordsProcessed":len(obs),"entitiesAnalyzed":len(wallet)+len(ip),"transactionsAnalyzed":int(obs["txid"].nunique()),"durationMs":duration,"leadsGenerated":len(leads),"clusterCount":len(clusters),"patternCount":len(patterns),"anomalyCount":int((wallet["anomaly_score"]>=.7).sum()),"completedAt":datetime.now(timezone.utc).isoformat()}

    @staticmethod
    def _default_stages():
        names=["Ingestion & validation","Feature engineering","Anomaly detection","Entity clustering","Pattern detection","Priority & lead generation"]
        return [{"id":i+1,"name":n,"status":"pending","description":n,"progress":0} for i,n in enumerate(names)]

    @staticmethod
    def _mark(stages, id, status, detail=None):
        stage=stages[id-1]; stage["status"]=status; stage["progress"]=100 if status=="completed" else 50 if status=="processing" else 0
        if detail: stage["detail"]=detail

    def _persist(self, state):
        self.runs_root.mkdir(parents=True, exist_ok=True)
        payload = {
            "run_id": state.run_id,
            "dataset_version": state.dataset_version,
            "started_at": state.started_at,
            "completed_at": state.completed_at,
            "duration_ms": state.duration_ms,
            "stages": state.stages,
            "summary": state.summary,
            "lead_count": len(state.leads),
            "cluster_count": len(state.clusters),
            "pattern_count": len(state.patterns),
        }
        state_payload = payload | {
            "leads": state.leads,
            "clusters": state.clusters,
            "patterns": state.patterns,
            "evidence": state.evidence,
            "findings": state.findings,
            "timelines": state.timelines,
            "flow_patterns": state.flow_patterns,
        }
        serialized = json.dumps(state_payload, indent=2, default=self._json_default)
        (self.runs_root / f"{state.run_id}.json").write_text(serialized, encoding="utf-8")
        state.wallet_features.to_parquet(
            self.runs_root / f"{state.run_id}_wallets.parquet", index=False
        )
        state.ip_features.to_parquet(
            self.runs_root / f"{state.run_id}_ips.parquet", index=False
        )
        (self.runs_root / "latest.json").write_text(serialized, encoding="utf-8")

    @staticmethod
    def _json_default(value):
        if isinstance(value, (np.integer,)):
            return int(value)
        if isinstance(value, (np.floating,)):
            return float(value)
        if isinstance(value, (np.bool_,)):
            return bool(value)
        if isinstance(value, (pd.Timestamp, datetime)):
            return value.isoformat()
        if isinstance(value, Path):
            return str(value)
        raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")

    def _restore_latest(self) -> None:
        """Restore the latest completed local run after an API restart."""
        latest = self.runs_root / "latest.json"
        if not latest.is_file():
            return
        try:
            payload = json.loads(latest.read_text(encoding="utf-8"))
            run_id = str(payload["run_id"])
            wallet_path = self.runs_root / f"{run_id}_wallets.parquet"
            ip_path = self.runs_root / f"{run_id}_ips.parquet"
            required = (
                "leads", "clusters", "patterns", "evidence",
                "findings", "timelines", "flow_patterns",
            )
            if not all(key in payload for key in required):
                return
            if not wallet_path.is_file() or not ip_path.is_file():
                return

            state = AnalysisState(
                run_id=run_id,
                dataset_version=str(payload["dataset_version"]),
                started_at=str(payload["started_at"]),
                completed_at=str(payload["completed_at"]),
                duration_ms=float(payload.get("duration_ms", 0.0)),
                stages=list(payload.get("stages", self._default_stages())),
                summary=dict(payload.get("summary", {})),
                wallet_features=pd.read_parquet(wallet_path),
                ip_features=pd.read_parquet(ip_path),
                leads=list(payload.get("leads", [])),
                clusters=list(payload.get("clusters", [])),
                patterns=list(payload.get("patterns", [])),
                evidence=dict(payload.get("evidence", {})),
                findings=dict(payload.get("findings", {})),
                timelines=dict(payload.get("timelines", {})),
                flow_patterns=list(payload.get("flow_patterns", [])),
            )
            if state.describe()["status"] != "FAIL":
                self._state = state
        except Exception:
            # A corrupt or incomplete cached run should never prevent the API
            # from starting. The next explicit analysis run will rebuild it.
            self._state = None


# Shared, process-wide analysis state. The API routes import this singleton from
# ``app.services.analysis`` and it is the only instance that runs the pipeline.
analysis_service = AnalysisService()
