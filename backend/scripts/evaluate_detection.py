#!/usr/bin/env python3
"""
Baseline evaluation for the SIH Bitcoin investigation prototype.

Run from the project root while the FastAPI backend is running:

    python backend/scripts/evaluate_detection.py

Optional:
    python backend/scripts/evaluate_detection.py --api-base http://127.0.0.1:8000
    python backend/scripts/evaluate_detection.py --top-k 10,25,50,100,150
    python backend/scripts/evaluate_detection.py --output-dir backend/data/evaluation

The evaluator DOES NOT use ground-truth labels during inference. Labels are used
only after the backend has produced its leads/patterns, so they cannot influence
the model or ranking.

It evaluates:
  1. Ranked lead quality at several K values.
  2. Background-only false-positive rate.
  3. Scenario-associated/core hit rate.
  4. Scenario-family coverage.
  5. Ground-truth scenario-instance coverage.
  6. Candidate peeling/mixing pattern coverage.
  7. Basic ranking metrics (average precision / NDCG) for entity-level labels.

Ground truth is read from:
  datasets/metadata/entity_labels.csv
  datasets/metadata/instance_catalog.csv

The script expects the existing API:
  GET /api/v1/analysis/result
  GET /api/v1/analysis/status
  GET /api/v1/leads
  GET /api/v1/patterns
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATASET_ROOT = PROJECT_ROOT / "datasets"
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "backend" / "data" / "evaluation"

SCENARIO_FAMILIES = tuple("BCDEFGH")
DEFAULT_TOP_K = (10, 25, 50, 100, 150)


class EvaluationError(RuntimeError):
    pass


def fetch_json(base_url: str, path: str, timeout: float = 30.0) -> Any:
    url = base_url.rstrip("/") + path
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise EvaluationError(f"{path}: HTTP {exc.code}: {body[:500]}") from exc
    except Exception as exc:
        raise EvaluationError(f"{path}: {type(exc).__name__}: {exc}") from exc


def read_csv(path: Path) -> list[dict[str, str]]:
    if not path.is_file():
        raise EvaluationError(f"Ground-truth file not found: {path}")
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def safe_float(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def dcg(relevances: list[int]) -> float:
    return sum(rel / math.log2(i + 2) for i, rel in enumerate(relevances))


def ndcg_at_k(relevances: list[int], k: int) -> float:
    vals = relevances[:k]
    if not vals:
        return 0.0
    ideal = sorted(vals, reverse=True)
    denom = dcg(ideal)
    return dcg(vals) / denom if denom else 0.0


def average_precision(relevances: list[int], k: int) -> float:
    vals = relevances[:k]
    total_relevant = sum(vals)
    if total_relevant == 0:
        return 0.0
    hits = 0
    score = 0.0
    for i, rel in enumerate(vals, start=1):
        if rel:
            hits += 1
            score += hits / i
    return score / total_relevant


def pct(n: float, d: float) -> float:
    return round((100.0 * n / d), 2) if d else 0.0


def build_entity_truth(rows: list[dict[str, str]]) -> dict[str, dict[str, Any]]:
    truth: dict[str, dict[str, Any]] = {}
    for row in rows:
        entity = row.get("address", "").strip()
        if not entity:
            continue
        family = row.get("family", "").strip() or "A"
        role = row.get("role", "").strip() or "background"
        expected_group = row.get("expected_group", "").strip()
        truth[entity] = {
            "family": family,
            "role": role,
            "expected_group": expected_group,
            "is_background": family == "A" or role == "background",
            "is_scenario": family in SCENARIO_FAMILIES,
            "is_core": role == "scenario_core",
        }
    return truth


def build_instance_counts(rows: list[dict[str, str]]) -> dict[str, int]:
    counts = {family: 0 for family in SCENARIO_FAMILIES}
    for row in rows:
        family = row.get("scenario_family", "").strip()
        if family in counts:
            counts[family] += 1
    return counts


def evaluate_leads(
    leads: list[dict[str, Any]],
    truth: dict[str, dict[str, Any]],
    instance_counts: dict[str, int],
    top_ks: tuple[int, ...],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    ranked = sorted(
        leads,
        key=lambda x: (
            safe_float(x.get("rank", 10**9)),
            -safe_float(x.get("priorityScore")),
        ),
    )

    per_lead = []
    for rank, lead in enumerate(ranked, start=1):
        entity = str(lead.get("entityId") or lead.get("entityLabel") or "")
        t = truth.get(entity, {
            "family": "UNKNOWN",
            "role": "unknown",
            "expected_group": "",
            "is_background": False,
            "is_scenario": False,
            "is_core": False,
        })
        per_lead.append({
            "rank": rank,
            "lead_id": lead.get("leadId", ""),
            "entity_id": entity,
            "priority": lead.get("priority", ""),
            "priority_score": safe_float(lead.get("priorityScore")),
            "ml_anomaly": lead.get("mlAnomaly", ""),
            "family": t["family"],
            "role": t["role"],
            "expected_group": t["expected_group"],
            "is_background": t["is_background"],
            "is_scenario": t["is_scenario"],
            "is_core": t["is_core"],
        })

    metrics = []
    for k in top_ks:
        top = per_lead[:k]
        if not top:
            continue

        scenario = [x for x in top if x["is_scenario"]]
        core = [x for x in top if x["is_core"]]
        background = [x for x in top if x["is_background"]]
        unknown = [x for x in top if x["family"] == "UNKNOWN"]

        families = sorted({x["family"] for x in scenario})
        groups_by_family = {
            family: sorted({
                x["expected_group"]
                for x in top
                if x["family"] == family and x["expected_group"]
            })
            for family in SCENARIO_FAMILIES
        }

        relevances = [1 if x["is_scenario"] else 0 for x in top]
        metrics.append({
            "k": k,
            "leads_available": len(leads),
            "scenario_associated_count": len(scenario),
            "scenario_associated_rate_pct": pct(len(scenario), len(top)),
            "core_count": len(core),
            "core_rate_pct": pct(len(core), len(top)),
            "background_count": len(background),
            "background_rate_pct": pct(len(background), len(top)),
            "unknown_count": len(unknown),
            "unknown_rate_pct": pct(len(unknown), len(top)),
            "scenario_family_count": len(families),
            "scenario_families": families,
            "average_precision": round(average_precision(relevances, k), 4),
            "ndcg": round(ndcg_at_k(relevances, k), 4),
            "instance_coverage": {
                family: {
                    "detected_instances": len(groups_by_family[family]),
                    "total_instances": instance_counts.get(family, 0),
                    "coverage_pct": pct(
                        len(groups_by_family[family]),
                        instance_counts.get(family, 0),
                    ),
                }
                for family in SCENARIO_FAMILIES
            },
        })

    return metrics, per_lead


def evaluate_patterns(
    patterns: list[dict[str, Any]],
    truth: dict[str, dict[str, Any]],
    instance_counts: dict[str, int],
) -> dict[str, Any]:
    summary = {
        "total_patterns": len(patterns),
        "by_kind": {},
        "peeling": {
            "candidate_count": 0,
            "scenario_D_related_count": 0,
            "scenario_D_related_rate_pct": 0.0,
            "detected_instances": [],
            "total_instances": instance_counts.get("D", 0),
            "instance_coverage_pct": 0.0,
        },
        "mixing": {
            "candidate_count": 0,
            "scenario_E_related_count": 0,
            "scenario_E_related_rate_pct": 0.0,
            "detected_instances": [],
            "total_instances": instance_counts.get("E", 0),
            "instance_coverage_pct": 0.0,
        },
        "notes": [
            "Pattern evaluation is post-hoc only; ground truth never affects detection.",
            "A candidate is considered scenario-related when at least one wallet in its steps maps to the corresponding labeled scenario family.",
            "This is a conservative attribution aid, not proof that the pattern itself is a true positive.",
        ],
    }

    details = []
    for pattern in patterns:
        kind = str(pattern.get("kind") or pattern.get("pattern_type") or "unknown")
        summary["by_kind"][kind] = summary["by_kind"].get(kind, 0) + 1

        wallets = []
        for step in pattern.get("steps", []) or []:
            wallet = str(step.get("walletId") or "").strip()
            if wallet:
                wallets.append(wallet)

        families = sorted({
            truth[w]["family"] for w in wallets
            if w in truth and truth[w]["family"] in SCENARIO_FAMILIES
        })
        groups = sorted({
            truth[w]["expected_group"] for w in wallets
            if w in truth and truth[w]["expected_group"]
        })

        related_D = "D" in families
        related_E = "E" in families

        if kind == "peeling":
            p = summary["peeling"]
            p["candidate_count"] += 1
            if related_D:
                p["scenario_D_related_count"] += 1
                p["detected_instances"].extend(
                    g for g in groups if g.startswith("D-")
                )
        elif kind == "mixing":
            p = summary["mixing"]
            p["candidate_count"] += 1
            if related_E:
                p["scenario_E_related_count"] += 1
                p["detected_instances"].extend(
                    g for g in groups if g.startswith("E-")
                )

        details.append({
            "pattern_id": pattern.get("id", ""),
            "kind": kind,
            "pattern_type": pattern.get("pattern_type", ""),
            "confidence": pattern.get("confidence", ""),
            "wallet_count": len(set(wallets)),
            "labeled_families": families,
            "expected_groups": groups,
        })

    for key in ("peeling", "mixing"):
        p = summary[key]
        p["detected_instances"] = sorted(set(p["detected_instances"]))
        p["scenario_D_related_rate_pct" if key == "peeling" else "scenario_E_related_rate_pct"] = pct(
            p["scenario_D_related_count"] if key == "peeling" else p["scenario_E_related_count"],
            p["candidate_count"],
        )
        p["instance_coverage_pct"] = pct(
            len(p["detected_instances"]),
            p["total_instances"],
        )

    return summary, details


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate current SIH Bitcoin detection output against synthetic ground truth.")
    parser.add_argument("--api-base", default="http://127.0.0.1:8000")
    parser.add_argument("--dataset-root", type=Path, default=DEFAULT_DATASET_ROOT)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--top-k", default="10,25,50,100,150")
    parser.add_argument("--timeout", type=float, default=30.0)
    args = parser.parse_args()

    top_ks = tuple(sorted({int(x) for x in args.top_k.split(",") if x.strip()},))
    if not top_ks or any(k <= 0 for k in top_ks):
        raise EvaluationError("--top-k must contain positive integers")

    entity_rows = read_csv(args.dataset_root / "metadata" / "entity_labels.csv")
    instance_rows = read_csv(args.dataset_root / "metadata" / "instance_catalog.csv")
    truth = build_entity_truth(entity_rows)
    instance_counts = build_instance_counts(instance_rows)

    status = fetch_json(args.api_base, "/api/v1/analysis/status", args.timeout)
    result = fetch_json(args.api_base, "/api/v1/analysis/result", args.timeout)
    leads = fetch_json(args.api_base, "/api/v1/leads", args.timeout)
    patterns = fetch_json(args.api_base, "/api/v1/patterns", args.timeout)

    if not isinstance(leads, list):
        raise EvaluationError("/api/v1/leads did not return a list")
    if not isinstance(patterns, list):
        raise EvaluationError("/api/v1/patterns did not return a list")

    lead_metrics, lead_details = evaluate_leads(
        leads, truth, instance_counts, top_ks
    )
    pattern_metrics, pattern_details = evaluate_patterns(
        patterns, truth, instance_counts
    )

    labeled_scenario_entities = sum(
        1 for x in truth.values() if x["is_scenario"]
    )
    labeled_core_entities = sum(
        1 for x in truth.values() if x["is_core"]
    )
    background_entities = sum(
        1 for x in truth.values() if x["is_background"]
    )

    report = {
        "evaluation": {
            "status": "PASS",
            "evaluator": "evaluate_detection.py",
            "ground_truth_used_only_after_inference": True,
            "api_base": args.api_base,
            "dataset_root": str(args.dataset_root),
        },
        "analysis_run": {
            "status": status,
            "result": result,
        },
        "ground_truth": {
            "entity_rows": len(entity_rows),
            "scenario_entities": labeled_scenario_entities,
            "scenario_core_entities": labeled_core_entities,
            "background_entities": background_entities,
            "scenario_instance_counts": instance_counts,
        },
        "lead_metrics": lead_metrics,
        "pattern_metrics": pattern_metrics,
    }

    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / "baseline_evaluation.json").write_text(
        json.dumps(report, indent=2), encoding="utf-8"
    )

    with (args.output_dir / "lead_rankings.csv").open(
        "w", encoding="utf-8", newline=""
    ) as f:
        if lead_details:
            writer = csv.DictWriter(f, fieldnames=lead_details[0].keys())
            writer.writeheader()
            writer.writerows(lead_details)

    with (args.output_dir / "pattern_evaluation.csv").open(
        "w", encoding="utf-8", newline=""
    ) as f:
        if pattern_details:
            writer = csv.DictWriter(f, fieldnames=pattern_details[0].keys())
            writer.writeheader()
            writer.writerows(pattern_details)

    print("\n=== SIH BITCOIN DETECTION BASELINE ===")
    print(f"Analysis status : {status.get('status', 'unknown') if isinstance(status, dict) else 'unknown'}")
    if isinstance(result, dict):
        print(f"Records         : {result.get('recordsProcessed', '?')}")
        print(f"Entities        : {result.get('entitiesAnalyzed', '?')}")
        print(f"Transactions    : {result.get('transactionsAnalyzed', '?')}")
        print(f"Clusters        : {result.get('clusterCount', '?')}")
        print(f"Patterns        : {result.get('patternCount', '?')}")
        print(f"Leads           : {result.get('leadsGenerated', '?')}")

    print("\nLead ranking:")
    print(" K   Scenario%   Core%   Background%   AP      NDCG")
    for row in lead_metrics:
        print(
            f"{row['k']:3d} "
            f"{row['scenario_associated_rate_pct']:10.2f}% "
            f"{row['core_rate_pct']:7.2f}% "
            f"{row['background_rate_pct']:11.2f}% "
            f"{row['average_precision']:.4f} "
            f"{row['ndcg']:.4f}"
        )

    print("\nPattern candidates:")
    p = pattern_metrics["peeling"]
    print(
        f" Peeling: {p['candidate_count']} candidates | "
        f"{p['scenario_D_related_count']} D-related | "
        f"{p['scenario_D_related_rate_pct']:.2f}% candidate relevance | "
        f"{p['instance_coverage_pct']:.2f}% instance coverage"
    )
    p = pattern_metrics["mixing"]
    print(
        f" Mixing : {p['candidate_count']} candidates | "
        f"{p['scenario_E_related_count']} E-related | "
        f"{p['scenario_E_related_rate_pct']:.2f}% candidate relevance | "
        f"{p['instance_coverage_pct']:.2f}% instance coverage"
    )

    print(f"\nReports written to: {args.output_dir}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except EvaluationError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(2)
