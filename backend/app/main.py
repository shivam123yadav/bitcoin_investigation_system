from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import logging

from app.api.dataset import router as dataset_router
from app.api.entities import router as entities_router
from app.api.graph import router as graph_router
from app.api.health import router as health_router
from app.api.transactions import router as transactions_router
from app.api.analysis import router as analysis_router
from app.api.leads import router as leads_router
from app.api.clusters import router as clusters_router
from app.api.patterns import router as patterns_router
from app.api.dashboard import router as dashboard_router
from app.api.extra import router as extra_router
from app.config import settings
from app.core.logging import configure_logging
from app.core.security import (
    API_TOKEN_ENV_VAR,
    token_protection_enabled,
)
from app.api import cases
from app.api import flexible_dataset
from app.api import flexible_analysis



configure_logging(settings.log_level)

logger = logging.getLogger("bitcoin-intelligence-backend")

if token_protection_enabled():
    logger.info(
        "API token protection is ENABLED for state-changing /api/v1 endpoints"
    )
else:
    logger.warning(
        "API token protection is DISABLED: set %s to protect case deletion, "
        "case creation, analysis runs and dataset uploads",
        API_TOKEN_ENV_VAR,
    )

app = FastAPI(
    title="Bitcoin Intelligence Backend",
    version=settings.version,
)

# React production build location.
# Works both locally and on Railway because it is resolved
# relative to the project root, not the current working directory.
PROJECT_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"

@app.get("/api/v1/health")
def health_check():
    return {
        "status": "ok",
        "version": "1.0.0"
    }


# Single CORS configuration, driven by FRONTEND_CORS_ORIGINS.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(health_router)
app.include_router(dataset_router)

# The analysis-backed entity routes
# (/entities/{id}/evidence, /findings, /indicators, /timeline,
# /entities/wallet/{id}, /entities/ip/{id}) must be registered before
# the graph entity lookup routes.
app.include_router(extra_router)
app.include_router(entities_router)
app.include_router(graph_router)
app.include_router(transactions_router)
app.include_router(analysis_router)
app.include_router(leads_router)
app.include_router(clusters_router)
app.include_router(patterns_router)
app.include_router(dashboard_router)
app.include_router(cases.router)
app.include_router(flexible_dataset.router)
app.include_router(flexible_analysis.router)


logger.info(
    "Started %s version %s",
    settings.service_name,
    settings.version
)

# Serve the React production build from the same FastAPI service.
# This keeps the SIH deployment on a single Railway URL.
if FRONTEND_DIST.exists():
    app.mount(
        "/",
        StaticFiles(directory=FRONTEND_DIST, html=True),
        name="frontend",
    )
    logger.info("Serving React frontend from %s", FRONTEND_DIST)
else:
    logger.warning(
        "React production build not found at %s. "
        "Run 'npm run build' before starting the production server.",
        FRONTEND_DIST,
    )