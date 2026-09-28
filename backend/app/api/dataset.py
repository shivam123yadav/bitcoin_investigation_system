from fastapi import APIRouter, HTTPException
import logging

from app.models.schemas import DatasetMetadataResponse, IngestionStatusResponse
from app.services.ingestion import (
    DatasetIngestionError,
    DatasetIngestionService,
    DatasetNotFoundError,
    DatasetStructureError,
)
from app.services.paths import (
    DATASET_MANIFEST_PATH,
    DATASET_VALIDATION_PATH,
    DEFAULT_DATASET_PATH,
    NORMALIZED_STORAGE_ROOT,
)
from app.services.storage import NormalizedDatasetStorage


logger = logging.getLogger("bitcoin-intelligence-backend")

router = APIRouter(prefix="/api/v1/dataset")

ingestion_service = DatasetIngestionService(
    dataset_path=DEFAULT_DATASET_PATH,
    manifest_path=DATASET_MANIFEST_PATH,
    validation_report_path=DATASET_VALIDATION_PATH,
    storage=NormalizedDatasetStorage(NORMALIZED_STORAGE_ROOT),
)


def _read_manifest() -> dict[str, object]:
    import json

    if not DATASET_MANIFEST_PATH.is_file():
        raise HTTPException(status_code=404, detail="Dataset manifest not found")
    try:
        with DATASET_MANIFEST_PATH.open("r", encoding="utf-8") as file:
            manifest = json.load(file)
    except Exception as exc:
        logger.exception("Failed to read dataset manifest")
        raise HTTPException(
            status_code=500, detail="Failed to read dataset manifest"
        ) from exc
    if not isinstance(manifest, dict):
        raise HTTPException(status_code=500, detail="Dataset manifest is invalid")
    return manifest


@router.get("/metadata", response_model=DatasetMetadataResponse)
def get_dataset_metadata() -> DatasetMetadataResponse:
    try:
        result = ingestion_service.ingest()
        manifest = _read_manifest()
    except DatasetNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DatasetStructureError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except DatasetIngestionError as exc:
        logger.error("Dataset ingestion failed: %s", exc)
        raise HTTPException(status_code=500, detail="Dataset ingestion failed") from exc
    except Exception as exc:
        logger.exception("Unexpected dataset metadata error")
        raise HTTPException(
            status_code=500, detail="Dataset metadata is unavailable"
        ) from exc

    return DatasetMetadataResponse(
        dataset_id=DEFAULT_DATASET_PATH.stem,
        dataset_version=str(
            manifest.get("dataset_version", result.status.dataset_version)
        ),
        generator_version=str(manifest.get("generator_version", "unknown")),
        schema_version=str(manifest.get("schema_version", "unknown")),
        record_count=result.status.record_count,
        unique_txids=int(str(manifest.get("unique_txids", 0))),
        wallet_pool_count=int(str(manifest.get("wallet_pool_count", 0))),
        ip_pool_count=int(str(manifest.get("ip_pool_count", 0))),
        observed_country_count=int(str(manifest.get("observed_country_count", 0))),
        observed_asn_count=int(str(manifest.get("observed_asn_count", 0))),
        scenario_instance_count=int(str(manifest.get("scenario_instance_count", 0))),
        time_start=str(manifest.get("time_start", "")),
        time_end=str(manifest.get("time_end", "")),
        validation_status=str(manifest.get("validation_status", "UNKNOWN")),
        ingestion_status=result.status.status,
        valid_records=result.status.valid_records,
        invalid_records=result.status.invalid_records,
        missing_fields=result.status.missing_fields,
        load_time_ms=result.status.load_time_ms,
        reference_validation_status=result.reference_validation_status,
    )


@router.get("/ingestion", response_model=IngestionStatusResponse)
def get_ingestion_status() -> IngestionStatusResponse:
    try:
        result = ingestion_service.ingest()
    except DatasetNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DatasetStructureError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except DatasetIngestionError as exc:
        logger.error("Dataset ingestion failed: %s", exc)
        raise HTTPException(status_code=500, detail="Dataset ingestion failed") from exc
    except Exception as exc:
        logger.exception("Unexpected ingestion status error")
        raise HTTPException(
            status_code=500, detail="Ingestion status is unavailable"
        ) from exc

    return IngestionStatusResponse(
        status=result.status.status,
        record_count=result.status.record_count,
        valid_records=result.status.valid_records,
        invalid_records=result.status.invalid_records,
        missing_fields=result.status.missing_fields,
        load_time_ms=result.status.load_time_ms,
        dataset_version=result.status.dataset_version,
        reference_validation_status=result.reference_validation_status,
    )
