# Bitcoin Intelligence Backend

FastAPI foundation for the Bitcoin Intelligence prototype.

## Setup

```bash
python -m venv ../.venv-linux313
source ../.venv-linux313/bin/activate
python -m pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

The service exposes:

- `GET /api/health`
- `GET /docs`

## Configuration

Copy `.env.example` to `.env` when environment-level configuration is needed. The default CORS origins are the standard Vite development origins:

- `http://localhost:5173`
- `http://127.0.0.1:5173`

`FRONTEND_CORS_ORIGINS` accepts a comma-separated list of explicit origins. Unrestricted wildcard CORS is rejected.

### Deployment API token

`SIH_API_TOKEN` enables a single shared-secret guard for the state-changing
`/api/v1` endpoints. It is documented in `.env.example`:

- protected: `POST /api/v1/analysis/run`, `POST /api/v1/cases`,
  `DELETE /api/v1/cases/{case_id}`, `POST /api/v1/cases/from-lead/{lead_id}`,
  `POST /api/v1/flexible-dataset/upload`,
  `POST /api/v1/flexible-dataset/{dataset_id}/analyze`
- public: all read-only dashboard/entity/lead/cluster/pattern/health endpoints

Clients send the token as `X-API-Token: <token>` or `Authorization: Bearer <token>`.
A missing token answers HTTP 401, a wrong token answers HTTP 403. When
`SIH_API_TOKEN` is unset the protection is disabled (local development) and a
warning is logged at startup.

```bash
# Linux / macOS
export SIH_API_TOKEN="$(python -c 'import secrets;print(secrets.token_urlsafe(32))')"
uvicorn app.main:app --host 127.0.0.1 --port 8000

# Windows PowerShell
$env:SIH_API_TOKEN = (python -c "import secrets;print(secrets.token_urlsafe(32))")
```

Setting the variable in `.env` alone is not enough: the application reads the
process environment, so export it in the shell (or export it from `.env`) before
starting `uvicorn`.

The frontend sends the same value via `VITE_API_TOKEN` (see
`frontend/.env.example`). Leave both unset for local development.

The protection is covered by regression tests and by an offline smoke test that
does not need a running server (no HTTP client required):

```bash
python -m unittest backend.tests.test_api_token_auth -v
python scripts/verify_api_token.py
```

## Stage 2 Dataset APIs

The local frozen dataset is ingested from `datasets/generated/synthetic_traffic_v1.0.0.csv` and validated against its manifest and validation report.

- `GET /api/v1/dataset/metadata`
- `GET /api/v1/dataset/ingestion`

Validated observations are stored locally as DuckDB and Parquet under `backend/data/normalized/`.

## Stage 3 Correlation and Graph APIs

The correlation service reads the normalized DuckDB table and builds an offline NetworkX multigraph with IP, wallet, and transaction nodes. Graph artifacts are cached under `backend/data/graph/`.

- `GET /api/v1/entities/{entity_type}/{entity_id}`
- `GET /api/v1/entities/{entity_type}/{entity_id}/neighbors`
- `GET /api/v1/transactions/{txid}`
- `GET /api/v1/graph/statistics`
- `GET /api/v1/graph/neighborhood/{entity_type}/{entity_id}`

Common-input edges are labeled as observed associations or cluster candidates, not confirmed ownership. ML, clustering, pattern detection, risk scoring, and investigative leads remain outside this stage.


## Phase 5 transaction-flow detection

The analysis pipeline now includes three explainable flow-pattern families:

- **Peeling-chain**: amount-continuous output-to-input hops across transactions.
- **Mixing-like**: substantial fan-in/fan-out with similar-valued outputs and approximate value conservation.
- **Repeated high-fanout**: repeated 1-to-N / low-input high-output transactions that reuse the same output-wallet set, with amount similarity, conservation and time-window checks.

Pattern findings are investigative candidates, not proof of illicit activity. Lead `confidence` is explicitly an evidence-coverage measure, not a probability of illicit activity.

A focused regression test covers the repeated-fanout detector and preserves the classic mixing detector:

```bash
python -m unittest backend.tests.test_patterns -v
```

After editing the backend, verify syntax with:

```bash
python -m py_compile app/services/analysis.py
```

### Restart-safe local analysis state

The latest completed analysis is persisted under `backend/data/runs/` and restored when the FastAPI process starts. This keeps the deployment simple and local: no Redis, Celery, or external database is required just to preserve the latest run. If no complete cached run exists, the backend starts normally and an explicit `/api/v1/analysis/run` rebuilds the state.

For a fresh deployment, run the analysis once after installing dependencies:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/analysis/run
```

Then a server restart should keep `GET /api/v1/analysis/status` at `completed`.

Then restart Uvicorn and run:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/analysis/run
curl -s http://127.0.0.1:8000/api/v1/patterns
```
