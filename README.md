# AI-Powered Monitoring & Analysis of Bitcoin Transaction Traffic

Smart India Hackathon (SIH) Prototype - Problem Statement 26146

---

## 1. SIH Problem
Cryptocurrency ledgers like Bitcoin record every transaction publicly, but pseudonymous alphanumeric addresses conceal the identities and operational structures behind financial flows. Investigators face severe challenges when attempting to track illicit funds, identify money laundering patterns (such as peeling chains, mixing services, and fan-out distribution), and correlate peer-to-peer network-layer observations (IP addresses, autonomous system numbers, geographic locations) with on-chain transactional behaviour.

The SIH 26146 challenge requires an offline, privacy-preserving, AI-assisted investigation tool capable of:
- Ingesting multi-format network observation records (CSV, JSON/NDJSON, XML).
- Correlating transaction flows with observing network nodes.
- Detecting anomalies and behavioral patterns without relying on live blockchain APIs or cloud AI services.
- Providing explainable, ranked investigative leads to human analysts.

## 2. Solution
This repository contains a prototype investigative workbench built specifically to address SIH Problem 26146. It combines deterministic pattern detection heuristics, machine learning models (unsupervised anomaly scoring and clustering), and offline network enrichment within an analyst-centric web application.

The solution enables law enforcement and forensic analysts to:
1. Ingest raw Bitcoin network observation logs offline.
2. Enrich network entities with offline GeoIP and ASN data.
3. Automatically detect suspicious transaction-flow topologies (peeling chains, mixing-like consolidation/fanout, repeated fanout).
4. Run unsupervised anomaly detection (Isolation Forest) and behavioral grouping (DBSCAN) across normalized transaction and network metrics.
5. Surface ranked, multi-criteria investigative leads with human-readable evidence summaries.
6. Explore entity neighborhoods, transaction flows, and graph topologies visually.
7. Manage cases and export structured findings without external data leaks.

## 3. Key Capabilities
- **CSV/JSON/XML Ingestion**: Offline parsing and schema validation of CSV, NDJSON/JSON, and XML observation datasets.
- **Network + Blockchain Correlation**: Unifies P2P network telemetry (`src_ip`, `dst_ip`, ports, timestamps) with on-chain transactional graph structures (`txid`, inputs, outputs, values).
- **IP/Wallet/Transaction Graph**: NetworkX-powered multigraph modeling IP endpoints, Bitcoin wallet addresses, and transactions as distinct nodes with directional edges.
- **Isolation Forest Anomaly Detection**: Unsupervised tabular anomaly scoring isolating statistical outliers across entity-level feature vectors.
- **DBSCAN Clustering**: Density-based spatial clustering grouping wallets and IPs exhibiting similar multi-dimensional behavioral profiles.
- **Peeling Detection**: Deterministic graph algorithm tracking consecutive, value-continuous hops where a single dominant change output is systematically stripped.
- **Mixing-Like Detection**: Deterministic multi-criteria identification of high-degree fan-in/fan-out transactions featuring uniform output distributions and approximate value conservation.
- **Repeated Fanout Detection**: Deterministic detector identifying automated 1-to-N or low-input/high-output disbursements reusing target recipient wallet pools within bounded temporal windows.
- **Explainable Ranked Leads**: Multi-channel composite ranking scoring entities based on anomaly scores, pattern involvement, high-connectivity false-positive suppression, and evidence breadth.
- **Offline GeoIP/ASN Enrichment**: Fully offline IP geolocation and Autonomous System resolution powered by locally installed DB-IP Lite MMDB databases.
- **Investigation Workflow**: Seamless analyst progression from macro dataset summaries to ranked leads, deep entity dossier inspection, neighborhood graphs, and transaction flow tracking.
- **Case Management**: Built-in evidence saving, case tracking, and local investigative documentation.
- **Offline Linux Operation**: Zero dependencies on cloud services, external LLMs, live RPC nodes, external CDNs, or remote fonts.



## 4. Architecture
The pipeline processes raw data through deterministic and statistical stages to transform high-volume traffic observations into focused investigative leads:

```text
Input (CSV / JSON / XML)
  |
  v
Normalization & Validation (DuckDB / PyArrow / Pandas)
  |
  +---------------------------------------------+
  |                                             |
  v                                             v
Feature Engineering                     Heterogeneous Graph Construction
(Wallet & IP Metrics)                   (NetworkX Multigraph: IP / Wallet / Tx)
  |                                             |
  v                                             v
Machine Learning (Statistical)          Pattern Detection (Deterministic)
- Isolation Forest (Anomaly Score)      - Peeling-Chain Detector
- DBSCAN (Behavioral Clusters)          - Mixing-Like Flow Detector
  |                                     - Repeated High-Fanout Detector
  +---------------------+-----------------------+
                        |
                        v
             Priority & Lead Ranking
             (Multi-Channel Scoring & Explanations)
                        |
                        v
             Analyst Workbench / UI
             (React + TypeScript + Vite + Tailwind CSS)
```

### Architectural Distinction: ML vs. Deterministic Heuristics
A central design principle is strict clarity between statistical inference and deterministic graph algorithms:
- **Isolation Forest / DBSCAN = ML**: Statistical algorithms operating over multi-dimensional feature distributions. Isolation Forest isolates outliers across velocity, degree, and amount spaces. DBSCAN clusters entities by spatial behavioral density.
- **Peeling / Mixing / Repeated-Fanout = Deterministic Analysis**: Deterministic graph algorithms verifying explicit topology rules, value conservation thresholds, output amount uniformity, and timestamp windows. These candidate patterns highlight structural signatures that warrant analyst verification.

## 5. Technology Stack
### Backend:
- Python
- FastAPI
- pandas
- DuckDB
- PyArrow
- NetworkX
- scikit-learn

### Frontend:
- React
- TypeScript
- Vite
- Tailwind CSS

### GeoIP:
- DB-IP Lite MMDB
- maxminddb

## 6. Project Structure
```text
SIH_Prototype/
├── README.md                           # Evaluator entry point and project manual
├── EVALUATION_README.md                # Evaluation methodology and reproduction guide
├── command.txt                         # Shell execution reference and deployment commands
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI application factory and route registration
│   │   ├── config.py                   # Environment settings and paths
│   │   ├── api/                        # API route controllers (v1 endpoints)
│   │   └── services/
│   │       ├── analysis.py             # Pipeline orchestrator
│   │       ├── correlation.py          # Network-to-blockchain correlation engine
│   │       ├── flexible_ingestion.py   # Multi-format parser & GeoIP enrichment
│   │       ├── geoip.py                # Offline DB-IP Lite MMDB reader service
│   │       ├── graph.py                # NetworkX multigraph builder
│   │       ├── ml.py                   # Isolation Forest & DBSCAN pipeline
│   │       └── patterns.py             # Peeling, mixing, and repeated fanout detectors
│   ├── data/                           # Local runtime artifacts (normalized parquet, runs)
│   ├── scripts/                        # Verification and evaluation CLI utilities
│   ├── tests/                          # Backend unit and regression test suite
│   └── requirements.txt                # Python backend dependencies
├── datasets/
│   ├── generated/                      # Synthetic benchmark transaction logs (v1.0.0)
│   ├── geoip/                          # Local DB-IP Lite MMDB database files
│   ├── metadata/                       # Manifest, scenario labels, entity catalogs
│   └── validation/                     # Determinism and schema validation reports
├── docs/                               # Detailed technical specifications (01 through 17)
├── frontend/
│   ├── src/                            # React application components, hooks, and services
│   ├── package.json                    # Node.js dependencies and build scripts
│   └── vite.config.ts                  # Vite build configuration
└── tools/                              # Offline dataset generator and adapter scripts
```

## 7. Linux Setup
Follow these verified steps on a Linux environment (Ubuntu 22.04 / 24.04 or WSL2):

### 1. Python Virtual Environment & Backend Requirements
```bash
# From project root
python3 -m venv .venv-linux313
source .venv-linux313/bin/activate
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt
```

### 2. Frontend Dependencies
Ensure Node.js (v18+ or v20+) and npm are installed:
```bash
cd frontend
npm ci
cd ..
```

### 3. GeoIP Database Placement
Ensure the offline DB-IP Lite MMDB database files are placed under `datasets/geoip/`:
```text
datasets/geoip/
├── dbip-country-lite-2026-08.mmdb
└── dbip-asn-lite-2026-08.mmdb
```

### 4. Environment Configuration
The backend runs with default local settings. Copy `.env.example` to `.env` in `backend/` if custom origins or ports are required:
```bash
cd backend
cp .env.example .env
cd ..
```

**Deployment API token (minimal demo protection).** `SIH_API_TOKEN` (documented in `backend/.env.example`) enables a single shared secret for the destructive/state-changing endpoints:
- Protected: `POST /api/v1/analysis/run`, `POST /api/v1/cases`, `DELETE /api/v1/cases/{case_id}`, `POST /api/v1/cases/from-lead/{lead_id}`, `POST /api/v1/flexible-dataset/upload`, `POST /api/v1/flexible-dataset/{dataset_id}/analyze`.
- Public: every read-only GET endpoint (dashboard, leads, clusters, patterns, graph, entities, health).
- Send the token as `X-API-Token: <token>` or `Authorization: Bearer <token>`. Missing token → HTTP 401, wrong token → HTTP 403.
- Unset the variable for local development: protection is then disabled and a startup warning is logged.

```bash
# Linux / macOS
export SIH_API_TOKEN="$(python -c 'import secrets;print(secrets.token_urlsafe(32))')"
```
```powershell
# Windows PowerShell
$env:SIH_API_TOKEN = (python -c "import secrets;print(secrets.token_urlsafe(32))")
```
The frontend passes the same value through `VITE_API_TOKEN` in `frontend/.env`. The application reads the process environment, so exporting the variable in the shell (or exporting it from `backend/.env`) is what enables the guard.

## 8. Running the Backend
From the project root:
```bash
cd backend
source ../.venv-linux313/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Health Check:
```bash
curl http://127.0.0.1:8000/api/v1/health
```

Expected response:
```json
{"status":"ok","version":"1.0.0"}
```

## 9. Running the Frontend
The real FastAPI backend must be running.

In `frontend/.env` (or `frontend/.env.example`), verify:
```ini
VITE_USE_MOCK=false
VITE_BACKEND_ORIGIN=http://127.0.0.1:8000
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Start the frontend development server:
```bash
cd frontend
npm run dev -- --host 127.0.0.1
```

Or build for production:
```bash
cd frontend
npm run build
```

## 10. Dataset
- **Synthetic Dataset**: Designed per `docs/17_SYNTHETIC_DATASET.md` for reproducible testing and evaluation.
- **Observations**: 48,000 observations (46,977 unique transactions, 10,713 wallets, 3,800 IPs).
- **Dataset Version**: `1.0.0`.
- **Synthetic Benchmark**: Sized for local execution on normal workstations, covering multiple behavioral topologies.
- **Validation / Determinism Evidence**: Stored in `datasets/validation/` and `datasets/metadata/` with checksum manifests confirming byte-level determinism.

*Important: Do NOT present synthetic benchmark performance as real-world illicit-activity detection accuracy.*

## 11. ML Pipeline
- **Feature Engineering**: Calculates continuous behavioral metrics per entity (transaction volume, velocity, degree centrality, counterparty counts, geographic spread, ASN count).
- **Isolation Forest**: Unsupervised tree ensemble isolating numeric outliers across entity feature vectors; generates continuous anomaly scores.
- **DBSCAN**: Density-based clustering discovering behavioral groupings across feature distributions without imposing arbitrary cluster counts.
- **Anomaly Scoring**: Calibrates and standardizes Isolation Forest scores into percentile rankings.
- **Clustering**: Assigns entities into behavioral clusters or identifies them as noise.

*Note: Deterministic pattern heuristics are kept strictly distinct from ML models.*


## 12. Pattern Detection
The system implements three deterministic candidate-pattern detectors:
- **Peeling-Chain Detection**: Detects sequential output-to-input transaction hops with amount continuity where one change output is repeatedly spent.
- **Mixing-Like Detection**: Detects multi-input/multi-output transactions with near-identical output amounts and approximate value conservation.
- **Repeated Fanout Detection**: Detects automated low-input/high-output bursts reusing recipient wallet pools within bounded temporal windows.

*Analyst Note: These detectors function as deterministic candidate-pattern detectors requiring analyst review, not proof of illicit activity.*

## 13. GeoIP / ASN
- **DB-IP Lite Country MMDB**: `datasets/geoip/dbip-country-lite-2026-08.mmdb`
- **DB-IP Lite ASN MMDB**: `datasets/geoip/dbip-asn-lite-2026-08.mmdb`
- **Local-Only Lookup**: Enriches IP endpoints in-memory using Python's `maxminddb` reader.
- **Offline Operation**: No external network requests, WHOIS queries, or cloud APIs are queried.
- **August 2026 Database Files**: The prototype uses August 2026 database files for offline consistency.
- **MMDB Placement**: MMDB files are excluded from Git and must be supplied separately for an offline deployment.
- **Attribution & Licensing**: GeoIP data is sourced from DB-IP Lite (https://db-ip.com), licensed under the Creative Commons Attribution 4.0 International License (CC BY 4.0).

## 14. Investigation Workflow
The analyst workflow follows a clear hierarchical progression:
```text
Dataset
→ Analysis
→ Leads
→ Entity
→ Evidence
→ Graph
→ Transaction Flow
→ Case
```

## 15. Evaluation
The repository includes an offline post-hoc evaluation framework (`backend/scripts/evaluate_detection.py`) measuring detection against planted ground truth in dataset v1.0.0:

| Top-K Leads | Scenario Associated Rate | Core Rate | Background Rate | Average Precision | NDCG |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **K = 10** | 100.00% | 100.00% | 0.00% | 1.0000 | 1.0000 |
| **K = 25** | 76.00% | 76.00% | 24.00% | 0.9798 | 0.9956 |
| **K = 50** | 50.00% | 50.00% | 50.00% | 0.9136 | 0.9806 |
| **K = 100** | 59.00% | 59.00% | 41.00% | 0.6878 | 0.9243 |
| **K = 150** | 72.00% | 72.00% | 28.00% | 0.6770 | 0.9211 |

**Pattern Metrics**:
- Mixing Candidates: 24 candidates, 7 scenario E-related (29.17% relevance, 87.50% instance coverage).
- Peeling Candidates: 0 candidates at current strict threshold on this synthetic baseline.

*Important: This evaluation uses the project's synthetic dataset and should not be interpreted as real-world Bitcoin illicit-activity detection accuracy.*

## 16. Offline Design
Normal runtime operation does not require:
- Cloud AI (no OpenAI, Anthropic, or external inference APIs)
- Blockchain RPC/API (no Infura, Blockstream, or live node queries)
- External GeoIP API (no external HTTP lookups)
- External CDN (all assets bundled locally via Vite)
- External fonts (local styling and typography via Tailwind)

## 17. Limitations
- **Synthetic Dataset**: Built on synthetic benchmark logs; mainnet traffic contains higher noise and varied protocol scripts.
- **Candidate Patterns Require Analyst Review**: Peeling, mixing-like, and fan-out structures also occur in legitimate exchange hot-wallet management and consolidation.
- **No Claim of Real-World Classification Accuracy**: The system flags behavioral anomalies and topological patterns; it does not claim real-world classification accuracy.
- **No Certain Criminal Attribution**: The prototype does not identify criminal activity with certainty.
- **Local Prototype Security / Authentication**: No multi-tenant user authentication, RBAC, or production credential vaults are implemented; intended for local workstation analysis. A single shared deployment secret (`SIH_API_TOKEN`, documented in `backend/.env.example`) guards the destructive/state-changing endpoints only (case create/delete, analysis runs, dataset uploads); read-only endpoints remain public and the guard is disabled when the variable is unset.

## 18. SIH Demo Flow
Evaluator-oriented walk-through flow:
Dataset → Analysis → Leads → Entity → Graph → Pattern → Evidence → Case

## 19. Troubleshooting
- **Backend Port Conflict**: Ensure port 8000 is free (`uvicorn app.main:app --port 8000`).
- **GeoIP Database Missing**: Verify `dbip-country-lite-2026-08.mmdb` and `dbip-asn-lite-2026-08.mmdb` are in `datasets/geoip/`.
- **Frontend Fails to Reach API**: Ensure FastAPI is running and `VITE_USE_MOCK=false` is set in `frontend/.env`.
- **Memory Consumption**: Analysis on 48,000 observations takes ~2 GB of memory; use `--api-only` with `backend/scripts/verify_analysis.py` if testing an already running instance.

## 20. Documentation
For deep technical documentation and component specifications, consult the `docs/` directory:
- `docs/PROJECT.md`: Project charter and requirements
- `docs/01_PROJECT_OVERVIEW.md`: System mission
- `docs/02_ARCHITECTURE.md`: Architecture diagrams and module interactions
- `docs/03_DATA_SCHEMA.md`: Observation schema
- `docs/07_ML_SPECIFICATION.md`: ML feature engineering and scoring
- `docs/08_PATTERN_DETECTION.md`: Pattern algorithms
- `docs/10_API_CONTRACT.md`: API route contracts
- `docs/13_GEOIP_OFFLINE.md`: Offline GeoIP integration
- `docs/17_SYNTHETIC_DATASET.md`: Synthetic dataset specification
- `EVALUATION_README.md`: Post-hoc evaluation guide

