"""Regression tests for GeoIP enrichment during flexible dataset ingestion.

Run from the project root with:
    python -m unittest backend.tests.test_geoip_ingestion

Run from the backend/ directory with:
    python -m unittest discover tests/

These tests are fully offline -- they use the local DB-IP MMDB files and do
NOT make any external HTTP/API calls.
"""
from __future__ import annotations

import csv
import tempfile
import unittest
from pathlib import Path

try:
    from app.services.flexible_ingestion import ingest_file, result_to_dict
except ModuleNotFoundError:
    from backend.app.services.flexible_ingestion import ingest_file, result_to_dict


class GeoIPIngestionRegressionTests(unittest.TestCase):
    """Verify that the flexible ingestion pipeline enriches GeoIP fields
    from the local MMDB databases when they are absent in the source data."""

    def _make_csv(self, tmp_dir: Path, rows: list[dict]) -> Path:
        path = tmp_dir / "test_input.csv"
        fieldnames = list(rows[0].keys())
        with path.open("w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        return path

    def test_geoip_enriched_when_fields_absent(self):
        """8.8.8.8 (Google) must yield geo_country=US, asn=AS15169."""
        rows = [
            {
                "timestamp": "2026-09-27T12:00:00Z",
                "src_ip": "8.8.8.8",
                "dst_ip": "1.1.1.1",
                "txid": "test-geoip-001",
            }
        ]
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            csv_path = self._make_csv(tmp_path, rows)
            storage = tmp_path / "storage"
            storage.mkdir()

            result = ingest_file(csv_path, storage)

            normalized = Path(result.normalized_path)
            self.assertTrue(normalized.is_file(), "normalized.csv must exist")

            with normalized.open(encoding="utf-8") as fh:
                data = list(csv.DictReader(fh))

        self.assertEqual(result.geoip["status"], "enriched",
                         "Expected geoip.status=='enriched'")
        self.assertEqual(result.geoip["records_checked"], 1)
        self.assertGreaterEqual(result.geoip["country_enriched"], 1)
        self.assertGreaterEqual(result.geoip["asn_enriched"], 1)

        self.assertEqual(len(data), 1)
        row = data[0]
        self.assertIn("geo_country", row)
        self.assertIn("asn", row)
        self.assertEqual(row["geo_country"], "US",
                         f"Expected geo_country=US, got {row.get('geo_country')!r}")
        self.assertEqual(row["asn"], "AS15169",
                         f"Expected asn=AS15169, got {row.get('asn')!r}")

    def test_supplied_geoip_is_preserved(self):
        """Supplied geo_country/asn values must not be overwritten."""
        rows = [
            {
                "timestamp": "2026-09-27T12:00:00Z",
                "src_ip": "8.8.8.8",
                "dst_ip": "1.1.1.1",
                "txid": "test-geoip-002",
                "geo_country": "XX",
                "asn": "AS99999",
            }
        ]
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            csv_path = self._make_csv(tmp_path, rows)
            storage = tmp_path / "storage"
            storage.mkdir()

            result = ingest_file(csv_path, storage)

            normalized = Path(result.normalized_path)
            with normalized.open(encoding="utf-8") as fh:
                row = list(csv.DictReader(fh))[0]

        self.assertEqual(result.geoip["supplied_country"], 1)
        self.assertEqual(result.geoip["supplied_asn"], 1)
        self.assertEqual(result.geoip["country_enriched"], 0)
        self.assertEqual(result.geoip["asn_enriched"], 0)
        self.assertEqual(row["geo_country"], "XX")
        self.assertEqual(row["asn"], "AS99999")

    def test_private_ip_is_not_enriched(self):
        """RFC-1918 addresses must not produce GeoIP enrichment."""
        rows = [
            {
                "timestamp": "2026-09-27T12:00:00Z",
                "src_ip": "192.168.1.1",
                "dst_ip": "10.0.0.1",
                "txid": "test-geoip-003",
            }
        ]
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            csv_path = self._make_csv(tmp_path, rows)
            storage = tmp_path / "storage"
            storage.mkdir()

            result = ingest_file(csv_path, storage)

        self.assertEqual(result.geoip["non_public_ip"], 1)
        self.assertEqual(result.geoip["country_enriched"], 0)
        self.assertEqual(result.geoip["asn_enriched"], 0)

    def test_result_to_dict_contains_geoip(self):
        """result_to_dict must serialise the geoip field."""
        rows = [
            {
                "timestamp": "2026-09-27T12:00:00Z",
                "src_ip": "8.8.8.8",
                "dst_ip": "1.1.1.1",
                "txid": "test-geoip-004",
            }
        ]
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            csv_path = self._make_csv(tmp_path, rows)
            storage = tmp_path / "storage"
            storage.mkdir()

            result = ingest_file(csv_path, storage)
            d = result_to_dict(result)

        self.assertIn("geoip", d)
        self.assertIsInstance(d["geoip"], dict)
        self.assertEqual(d["geoip"]["status"], "enriched")


if __name__ == "__main__":
    unittest.main()
