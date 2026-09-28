# 13 --- Offline GeoIP Enrichment

## Requirement

The SIH problem statement calls for integration of an open-source
downloadable GeoIP database.

## Implementation

The prototype integrates **DB-IP Lite** as a locally stored GeoIP source.

The current SIH prototype uses:

- DB-IP Lite Country MMDB: `dbip-country-lite-2026-08.mmdb`
- DB-IP Lite ASN MMDB: `dbip-asn-lite-2026-08.mmdb`
- Python `maxminddb` reader
- Local-only MMDB lookups during ingestion

The database files are stored locally under:

```text
datasets/geoip/
├── dbip-country-lite-2026-08.mmdb
└── dbip-asn-lite-2026-08.mmdb
