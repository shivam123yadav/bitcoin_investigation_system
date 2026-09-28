from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
from threading import RLock
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException
from app.core.security import require_api_token
from ..services.analysis import analysis_service


router = APIRouter(prefix="/api/v1/cases", tags=["cases"])


# Store cases locally with the rest of the backend data.
CASES_PATH = Path(__file__).resolve().parents[2] / "data" / "cases.json"

_lock = RLock()


class CreateCaseRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(default="", max_length=5000)
    priority: str = Field(default="medium")


def _ensure_storage() -> None:
    CASES_PATH.parent.mkdir(parents=True, exist_ok=True)

    if not CASES_PATH.exists():
        CASES_PATH.write_text("[]", encoding="utf-8")


def _read_cases() -> list[dict[str, Any]]:
    _ensure_storage()

    try:
        data = json.loads(CASES_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=500,
            detail="Case storage could not be read",
        ) from exc

    if not isinstance(data, list):
        raise HTTPException(
            status_code=500,
            detail="Case storage is invalid",
        )

    return data


def _write_cases(cases: list[dict[str, Any]]) -> None:
    _ensure_storage()

    temp_path = CASES_PATH.with_suffix(".tmp")

    try:
        temp_path.write_text(
            json.dumps(cases, indent=2),
            encoding="utf-8",
        )
        temp_path.replace(CASES_PATH)
    except OSError as exc:
        raise HTTPException(
            status_code=500,
            detail="Case could not be saved",
        ) from exc


@router.get("")
def get_cases():
    with _lock:
        cases = _read_cases()
        print("================================")
        print("CASES FILE:", CASES_PATH)
        print("FILE EXISTS:", CASES_PATH.exists())
        print("NUMBER OF CASES:", len(cases))
        print("================================")
        return cases

@router.get("/{case_id}")
def get_case(case_id: str):
    with _lock:
        cases = _read_cases()

    case = next(
        (item for item in cases if str(item.get("id", "")) == case_id),
        None,
    )

    if case is None:
        raise HTTPException(
            status_code=404,
            detail=f"Case {case_id} not found",
        )

    return case

# Destructive: removing a case requires the API token.
@router.delete("/{case_id}", dependencies=[Depends(require_api_token)])
def delete_case(case_id: str) -> dict[str, Any]:
    with _lock:
        cases = _read_cases()

        case_index = next(
            (
                index
                for index, case in enumerate(cases)
                if str(case.get("id", "")) == case_id
            ),
            None,
        )

        if case_index is None:
            raise HTTPException(
                status_code=404,
                detail=f"Case {case_id} not found",
            )

        deleted_case = cases.pop(case_index)

        _write_cases(cases)

    return {
        "success": True,
        "deleted": deleted_case,
    }

# Creating a case mutates case storage, so it requires the API token.
@router.post("", status_code=201, dependencies=[Depends(require_api_token)])
def create_case(payload: CreateCaseRequest) -> dict[str, Any]:
    priority = payload.priority.lower().strip()

    if priority not in {"high", "medium", "low"}:
        raise HTTPException(
            status_code=400,
            detail="Priority must be high, medium, or low",
        )

    now = datetime.now(timezone.utc).isoformat()

    with _lock:
        cases = _read_cases()

        next_number = len(cases) + 1

        case = {
            "id": f"CASE-{next_number:04d}",
            "primaryEntity": "",
            "priority": priority,
            "status": "open",
            "created": now,
            "updated": now,
            "analyst": "Local Analyst",
            "summary": payload.description.strip() or payload.title.strip(),
            "title": payload.title.strip(),
            "description": payload.description.strip(),
            "evidenceIds": [],
            "patternIds": [],
            "relatedEntities": [],
        }

        cases.append(case)
        _write_cases(cases)

        return case

@router.post("/from-lead/{lead_id}", dependencies=[Depends(require_api_token)])
def create_case_from_lead(lead_id: str):
    from datetime import datetime, timezone

    state = analysis_service.get_state()

    with _lock:
        existing_cases = _read_cases()

    existing_case = next(
        (
            case
            for case in existing_cases
            if str(case.get("leadId", "")) == lead_id
        ),
        None,
    )

    if existing_case:
        return existing_case

    lead = next(
        (
            x for x in state.leads
            if str(x.get("leadId", x.get("id", ""))) == lead_id
        ),
        None,
    )

    if not lead:
        raise HTTPException(
            status_code=404,
            detail="Investigation lead not found"
        )

    entity_id = str(
        lead.get("entityId")
        or lead.get("entity_id")
        or ""
    )

    priority = str(
        lead.get("priority", "medium")
    ).lower()

    if priority not in {"high", "medium", "low"}:
        priority = "medium"

    # -----------------------------------------
    # REAL INVESTIGATION EVIDENCE
    # -----------------------------------------
    evidence_items = state.evidence.get(entity_id, [])

    evidence_ids = []

    for item in evidence_items:
        if not isinstance(item, dict):
            continue

        kind = str(item.get("kind", "evidence"))

        metric = item.get("metric")
        title = str(item.get("title", ""))

        # Stable evidence reference.
        evidence_key = (
            item.get("id")
            or item.get("evidenceId")
            or item.get("evidence_id")
        )

        if not evidence_key:
            evidence_key = f"{kind}:{title}"

            if metric is not None:
                evidence_key += f":{metric}"

        evidence_ids.append(str(evidence_key))

    # -----------------------------------------
    # REAL PATTERN REFERENCES
    # -----------------------------------------
    pattern_ids = []

    for pattern in state.patterns:
        if not isinstance(pattern, dict):
            continue

        pattern_id = pattern.get("id")
        if not pattern_id:
            continue

        # A pattern belongs to this case when one of its steps
        # references the lead wallet.
        for step in pattern.get("steps", []):
            if not isinstance(step, dict):
                continue

            wallet_id = (
                step.get("walletId")
                or step.get("wallet_id")
                or step.get("wallet")
            )
            if wallet_id and str(wallet_id) == entity_id:
                pattern_ids.append(str(pattern_id))
                break

    # Preserve explicit pattern references in evidence records.
    for item in evidence_items:
        if not isinstance(item, dict):
            continue

        pattern_id = (
            item.get("patternId") or item.get("pattern_id")
            if item.get("patternType")
            else None
        )
        if not pattern_id and item.get("patternType"):
            pattern_id = item.get("metric")
        if pattern_id:
            pattern_ids.append(str(pattern_id))

    pattern_ids = list(dict.fromkeys(pattern_ids))

    # -----------------------------------------
    # REAL TIMELINE TRANSACTIONS
    # -----------------------------------------
    timeline_items = state.timelines.get(entity_id, [])

    transaction_ids = []

    for item in timeline_items:
        if not isinstance(item, dict):
            continue

        txid = item.get("txId")

        if txid:
            transaction_ids.append(str(txid))

    # Keep the case evidence references compact and unique.
    evidence_ids = list(dict.fromkeys(evidence_ids))
    pattern_ids = list(dict.fromkeys(pattern_ids))
    transaction_ids = list(dict.fromkeys(transaction_ids))

    # Add the actual transaction IDs as evidence references.
    evidence_ids.extend(
        txid for txid in transaction_ids
        if txid not in evidence_ids
    )

    # -----------------------------------------
    # RELATED ENTITIES
    # -----------------------------------------
    related_entities = []

    cluster_id = lead.get("clusterId")

    if cluster_id:
        related_entities.append(str(cluster_id))

    for item in timeline_items:
        if not isinstance(item, dict):
            continue

        related = item.get("relatedEntity")

        if related and str(related) != entity_id:
            related_entities.append(str(related))

    related_entities = list(dict.fromkeys(related_entities))

    # -----------------------------------------
    # CREATE CASE
    # -----------------------------------------
    now = datetime.now(timezone.utc).isoformat()

    with _lock:
        cases = _read_cases()

        case_number = len(cases) + 1
        case_id = f"CASE-{case_number:04d}"

        case = {
            "id": case_id,
            "title": f"Investigation of {entity_id}",
            "description": str(
                lead.get("explanation")
                or lead.get("description")
                or "Investigation case created from an investigative lead."
            ),
            "primaryEntity": entity_id,
            "priority": priority,
            "status": "open",
            "analyst": "Local Analyst",
            "created": now,
            "updated": now,

            # Lead that generated this case.
            "leadId": lead_id,

            # Actual evidence references.
            "evidenceIds": evidence_ids,

            # Actual detected patterns.
            "patternIds": pattern_ids,

            # Related entities discovered from the investigation.
            "relatedEntities": related_entities,

            # Useful for the report/evidence view.
            "transactionIds": transaction_ids,
        }

        cases.append(case)
        _write_cases(cases)

        return case