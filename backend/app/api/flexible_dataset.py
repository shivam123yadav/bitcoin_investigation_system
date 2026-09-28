from __future__ import annotations

import json
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.core.security import require_api_token
from app.services.flexible_ingestion import ingest_file, result_to_dict

router = APIRouter(prefix="/api/v1/flexible-dataset", tags=["flexible-dataset"])

ROOT = Path(__file__).resolve().parents[2]
UPLOAD_ROOT = ROOT / "data" / "flexible_uploads"
INCOMING = UPLOAD_ROOT / "incoming"
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
INCOMING.mkdir(parents=True, exist_ok=True)


# Dataset ingestion writes to disk, so it requires the API token.
@router.post("/upload", dependencies=[Depends(require_api_token)])
async def upload_flexible_dataset(file: UploadFile = File(...)):
    filename = Path(file.filename or "").name
    suffix = Path(filename).suffix.lower()

    if suffix not in {".csv", ".json", ".xml"}:
        raise HTTPException(
            status_code=400,
            detail="Unsupported format. Upload CSV, JSON or XML.",
        )

    target = INCOMING / filename

    # Avoid overwriting another upload with the same filename.
    if target.exists():
        target = INCOMING / f"{target.stem}_{abs(hash(filename))}{target.suffix}"

    try:
        with target.open("wb") as output:
            shutil.copyfileobj(file.file, output)

        result = ingest_file(target, UPLOAD_ROOT)
        payload = result_to_dict(result)

        # Keep a machine-readable copy of the schema decision beside the
        # normalized dataset.
        dataset_dir = Path(payload["normalized_path"]).parent
        (dataset_dir / "ingestion.json").write_text(
            json.dumps(payload, indent=2),
            encoding="utf-8",
        )

        return {
            "success": True,
            **payload,
        }

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Dataset ingestion failed: {exc}",
        ) from exc
    finally:
        try:
            target.unlink(missing_ok=True)
        except Exception:
            pass


@router.get("/{dataset_id}")
def get_flexible_dataset(dataset_id: str):
    metadata = UPLOAD_ROOT / dataset_id / "ingestion.json"

    if not metadata.is_file():
        raise HTTPException(status_code=404, detail="Dataset not found")

    return json.loads(metadata.read_text(encoding="utf-8"))
