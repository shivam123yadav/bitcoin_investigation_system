"""Minimal API-token protection for the SIH demo deployment.

Only state-changing ``/api/v1`` endpoints (case creation/deletion, analysis
runs and dataset ingestion) require a token. Read-only dashboard/entity
endpoints stay public so the demo interface keeps working.

The token is read from the ``SIH_API_TOKEN`` environment variable and can be
sent by clients either as an ``X-API-Token`` header or as an
``Authorization: Bearer <token>`` header.

When ``SIH_API_TOKEN`` is not configured the protection is disabled
(development mode) and a warning is logged at startup. No database and no user
accounts are involved: this is deliberately a single shared deployment secret.
"""

from __future__ import annotations

import logging
import secrets
from typing import Annotated

from fastapi import Header, HTTPException, status

from app.config import settings


logger = logging.getLogger("bitcoin-intelligence-backend")

#: Environment variable holding the shared deployment token.
API_TOKEN_ENV_VAR = "SIH_API_TOKEN"

#: Primary request header used by the frontend.
API_TOKEN_HEADER = "X-API-Token"

_UNAUTHORIZED_HEADERS = {"WWW-Authenticate": "Bearer"}


def configured_api_token() -> str | None:
    """Return the configured deployment token, or ``None`` when disabled."""

    token = settings.api_token
    return token if token else None


def token_protection_enabled() -> bool:
    """Whether token checks are enforced for state-changing endpoints."""

    return configured_api_token() is not None


def extract_api_token(
    x_api_token: str | None,
    authorization: str | None,
) -> str | None:
    """Read a token from either supported request header."""

    if x_api_token and x_api_token.strip():
        return x_api_token.strip()

    if authorization:
        scheme, _, credentials = authorization.partition(" ")
        if scheme.lower() == "bearer" and credentials.strip():
            return credentials.strip()

    return None


def require_api_token(
    x_api_token: Annotated[
        str | None,
        Header(alias=API_TOKEN_HEADER, description="Shared deployment API token."),
    ] = None,
    authorization: Annotated[
        str | None,
        Header(description="Alternative to X-API-Token: 'Bearer <token>'."),
    ] = None,
) -> None:
    """FastAPI dependency guarding destructive / state-changing endpoints.

    Raises HTTP 401 when no token is supplied and HTTP 403 when the supplied
    token does not match the configured value.
    """

    expected = configured_api_token()

    # Development mode: no token configured, so nothing to enforce.
    if expected is None:
        return

    provided = extract_api_token(x_api_token, authorization)

    if not provided:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"API token required: send the {API_TOKEN_HEADER} header",
            headers=_UNAUTHORIZED_HEADERS,
        )

    if not secrets.compare_digest(provided, expected):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API token",
        )


__all__ = [
    "API_TOKEN_ENV_VAR",
    "API_TOKEN_HEADER",
    "configured_api_token",
    "extract_api_token",
    "require_api_token",
    "token_protection_enabled",
]
