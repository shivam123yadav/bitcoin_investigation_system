"""Focused regression tests for transaction-flow pattern detection.

Run from the project root with:
    python -m unittest backend.tests.test_patterns

The tests extract the AnalysisService._patterns implementation without importing
DuckDB-backed services, so they remain lightweight and offline.
"""
from __future__ import annotations

import ast
import unittest
from pathlib import Path

import numpy as np
import pandas as pd


ANALYSIS_PATH = Path(__file__).resolve().parents[1] / "app" / "services" / "analysis.py"


def load_patterns_method():
    source = ANALYSIS_PATH.read_text(encoding="utf-8")
    tree = ast.parse(source)
    cls = next(
        node for node in tree.body
        if isinstance(node, ast.ClassDef) and node.name == "AnalysisService"
    )
    fn = next(
        node for node in cls.body
        if isinstance(node, ast.FunctionDef) and node.name == "_patterns"
    )
    module = ast.Module(body=[fn], type_ignores=[])
    ast.fix_missing_locations(module)
    namespace = {"pd": pd, "np": np, "Any": object}
    exec(compile(module, str(ANALYSIS_PATH), "exec"), namespace)
    return namespace["_patterns"]


class DummyAnalysis:
    _patterns = load_patterns_method()


def tx(row: int, minute: int, outputs: list[str], amounts: list[float], input_amount: float):
    return {
        "txid": f"{row:064x}",
        "timestamp": pd.Timestamp("2024-11-15T08:46:14Z") + pd.Timedelta(minutes=minute),
        "input_addresses": [f"bc1qin{row:030d}"],
        "output_addresses": outputs,
        "input_amounts": [input_amount],
        "output_amounts": amounts,
        "fee": 0.001,
    }


class PatternDetectorTests(unittest.TestCase):
    def test_repeated_fanout_detects_reused_output_set(self):
        target = "bc1q006lqwcz2c7304twvf2jp9u2kdp53ge7gsqd40"
        outputs = [target] + [f"bc1q{i:038d}" for i in range(1, 15)]
        rows = []
        for i in range(9):
            amounts = [0.68 + (j % 5) * 0.01 + i * 0.001 for j in range(15)]
            rows.append(tx(i, i * 20, outputs, amounts, sum(amounts) * 1.001))

        patterns, _ = DummyAnalysis()._patterns(pd.DataFrame(rows))
        repeated = [p for p in patterns if p.get("pattern_type") == "repeated-fanout"]

        self.assertTrue(repeated)
        self.assertEqual(repeated[0]["repeated_transaction_count"], 9)
        self.assertIn(target, {step["walletId"] for step in repeated[0]["steps"]})

    def test_classic_mixing_detector_remains_available(self):
        outputs = [f"bc1q{i:038d}" for i in range(8)]
        amounts = [1.0] * 8
        row = {
            "txid": "1" * 64,
            "timestamp": pd.Timestamp("2024-11-15T08:00:00Z"),
            "input_addresses": [f"bc1qin{i:038d}" for i in range(8)],
            "output_addresses": outputs,
            "input_amounts": [1.0] * 8,
            "output_amounts": amounts,
            "fee": 0.001,
        }
        patterns, _ = DummyAnalysis()._patterns(pd.DataFrame([row]))
        classic = [p for p in patterns if p.get("pattern_type") == "mixing-like"]
        self.assertTrue(classic)


if __name__ == "__main__":
    unittest.main()
