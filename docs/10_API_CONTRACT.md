# 10 --- API Contract

This is a proposed contract for frontend/backend integration. It must be
kept versioned and synchronized with implementation.

## Dataset

### GET /api/v1/datasets

List registered datasets.

### POST /api/v1/datasets/upload

Upload/register a dataset.

### GET /api/v1/datasets/{dataset_id}

Return dataset metadata and validation status.

## Analysis

### POST /api/v1/analysis

Start an analysis run for a dataset.

Request should identify: - dataset_id - analysis configuration

### GET /api/v1/analysis/{run_id}

Return run status and progress.

### GET /api/v1/analysis/{run_id}/summary

Return computed summary statistics.

## Leads

### GET /api/v1/leads

Query/filter investigation leads.

Supported filters should include: - priority - entity type - search
term - cluster - score range

### GET /api/v1/leads/{lead_id}

Return detailed lead evidence.

## Entity

### GET /api/v1/entities/{entity_id}

Return entity summary and evidence.

### GET /api/v1/entities/{entity_id}/timeline

Return entity activity timeline.

## Graph

### GET /api/v1/graph/{entity_id}

Return a focused investigation subgraph.

Optional query parameters: - depth - node_types - edge_types

## Patterns

### GET /api/v1/patterns

List detected candidate transaction patterns.

### GET /api/v1/patterns/{pattern_id}

Return pattern evidence.

## Clusters

### GET /api/v1/clusters

List entity clusters.

### GET /api/v1/clusters/{cluster_id}

Return cluster details.

## Cases

Cases may initially remain frontend/local until backend persistence is
required.

## Authentication

The deployment uses one shared secret, not user accounts. When the
`SIH_API_TOKEN` environment variable is set, every state-changing endpoint
requires it; when the variable is unset the guard is disabled (local
development) and a warning is logged at startup.

Protected (destructive / state-changing):

| Method | Path |
| :--- | :--- |
| `POST` | `/api/v1/analysis/run` |
| `POST` | `/api/v1/cases` |
| `DELETE` | `/api/v1/cases/{case_id}` |
| `POST` | `/api/v1/cases/from-lead/{lead_id}` |
| `POST` | `/api/v1/flexible-dataset/upload` |
| `POST` | `/api/v1/flexible-dataset/{dataset_id}/analyze` |

Public (read-only dashboards, leads, clusters, patterns, graph, entities,
transactions, dataset metadata, health): no token required.

Requests carry the token in either header:

```http
X-API-Token: <token>
Authorization: Bearer <token>
```

Responses:

- `401 Unauthorized` (with `WWW-Authenticate: Bearer`) when the token is missing.
- `403 Forbidden` when the token is present but wrong.

## API rules

-   JSON responses
-   Pydantic schemas
-   stable IDs
-   explicit error responses
-   no hidden mock data once real backend integration begins
