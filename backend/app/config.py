from dataclasses import dataclass, field
import os


DEFAULT_CORS_ORIGINS = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
)


def _frontend_cors_origins() -> list[str]:
    configured = os.getenv("FRONTEND_CORS_ORIGINS")
    if not configured:
        return list(DEFAULT_CORS_ORIGINS)

    origins = [origin.strip() for origin in configured.split(",") if origin.strip()]
    if not origins:
        return list(DEFAULT_CORS_ORIGINS)
    if "*" in origins:
        raise ValueError(
            "FRONTEND_CORS_ORIGINS must not contain an unrestricted wildcard"
        )
    return origins


def _api_token() -> str | None:
    """Read the deployment token guarding state-changing /api/v1 endpoints.

    Returns ``None`` when ``SIH_API_TOKEN`` is not configured, which disables
    token enforcement (local development mode).
    """
    token = os.getenv("SIH_API_TOKEN", "").strip()
    return token or None


@dataclass(frozen=True)
class Settings:
    service_name: str = os.getenv(
        "SERVICE_NAME",
        "bitcoin-intelligence-backend",
    )
    version: str = os.getenv(
        "SERVICE_VERSION",
        "1.0.0",
    )
    cors_origins: list[str] = field(
        default_factory=_frontend_cors_origins
    )
    log_level: str = os.getenv(
        "LOG_LEVEL",
        "INFO",
    ).upper()

    # Shared deployment secret guarding state-changing /api/v1 endpoints.
    # When unset, token protection is disabled (local development mode).
    api_token: str | None = field(
        default_factory=_api_token
    )

    geoip_country_db: str = os.getenv(
        "GEOIP_COUNTRY_DB",
        "datasets/geoip/dbip-country-lite-2026-08.mmdb",
    )
    geoip_asn_db: str = os.getenv(
        "GEOIP_ASN_DB",
        "datasets/geoip/dbip-asn-lite-2026-08.mmdb",
    )


settings = Settings()