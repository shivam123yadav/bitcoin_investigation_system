# Flexible Bitcoin dataset ingestion

This package adds a dataset-agnostic ingestion layer.

Supported input:
- CSV
- JSON
- XML

The service:
1. Reads the uploaded structure.
2. Detects common aliases for Bitcoin/network fields.
3. Maps them to a canonical schema.
4. Preserves unknown columns instead of dropping them.
5. Never fabricates missing fields.
6. Determines the available analysis mode.

Modes:
- `full_correlation`
- `blockchain_graph`
- `network_anomaly`
- `generic_metadata`

Canonical fields:
timestamp, src_ip, dst_ip, src_port, dst_port, txid,
input_addresses, output_addresses, input_amounts, output_amounts,
geo_country, asn, fee, script_type

## Installation

Copy:

`backend/app/services/flexible_ingestion.py`

and

`backend/app/api/flexible_dataset.py`

into the corresponding folders.

Then register the router in `backend/app/main.py`:

    from app.api import flexible_dataset
    app.include_router(flexible_dataset.router)

The new endpoint is:

    POST /api/v1/flexible-dataset/upload

It accepts multipart form field `file`.

The response contains:
- detected format
- record count
- canonical field mapping
- unmapped fields
- missing canonical fields
- selected analysis mode
- warnings
- normalized output path

This is intentionally separate from the existing fixed SIH dataset route.
Once verified, the frontend can be switched to this endpoint.
