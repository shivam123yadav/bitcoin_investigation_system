from fastapi import APIRouter, HTTPException, Query
import logging

import duckdb

from app.models.schemas import (
    GraphNeighborhoodResponse,
    GraphStatisticsResponse,
)
from app.services.graph import (
    EntityNotFoundError,
    GraphDataError,
    GraphService,
    GraphStorage,
)
from app.services.paths import GRAPH_STORAGE_ROOT


logger = logging.getLogger("bitcoin-intelligence-backend")

router = APIRouter(prefix="/api/v1/graph")

graph_service = GraphService()


def _parse_filters(value: str | None) -> set[str] | None:
    if not value:
        return None
    return {item.strip() for item in value.split(",") if item.strip()}


def _safe_value(value):
    """
    Convert DuckDB values into JSON-safe values.
    """
    if value is None:
        return None

    if isinstance(value, (str, int, float, bool)):
        return value

    if hasattr(value, "item"):
        try:
            return value.item()
        except Exception:
            pass

    if hasattr(value, "tolist"):
        try:
            return value.tolist()
        except Exception:
            pass

    return str(value)


@router.get("")
def get_graph(
    node_limit: int = Query(default=500, ge=50, le=500),
    edge_limit: int = Query(default=1000, ge=100, le=1000),
):
    """
    Return a bounded graph for frontend visualization.

    This intentionally loads only a small number of nodes and edges
    directly from DuckDB. It never constructs the full NetworkX graph.
    """
    connection = None

    try:
        dataset_version = graph_service._dataset_version()

        storage = GraphStorage(
            GRAPH_STORAGE_ROOT,
            dataset_version,
        )

        if not storage.exists():
            raise GraphDataError("Graph cache is missing")

        connection = duckdb.connect(
            str(storage.paths.duckdb_path),
            read_only=True,
        )

        # Edge-first sampling: retrieve at most edge_limit edges.
        edge_result = connection.execute(
            """
            SELECT *
            FROM edges
            LIMIT ?
            """,
            [edge_limit],
        )

        edge_columns = [
            description[0]
            for description in edge_result.description
        ]

        edge_rows = edge_result.fetchall()

        if not edge_rows:
            logger.info(
                "Graph visualization returned %d nodes and %d edges",
                0,
                0,
            )

            return {
                "nodes": [],
                "edges": [],
            }

        # Collect distinct source and target IDs in edge order,
        # truncated to node_limit.
        try:
            source_idx = edge_columns.index("source")
        except ValueError:
            source_idx = 0
        try:
            target_idx = edge_columns.index("target")
        except ValueError:
            target_idx = 1 if len(edge_columns) > 1 else 0

        selected_ids: list = []
        seen_ids: set = set()
        for values in edge_rows:
            for idx in (source_idx, target_idx):
                raw_id = values[idx] if idx < len(values) else None
                if raw_id is None:
                    continue
                str_id = str(raw_id)
                if str_id not in seen_ids:
                    seen_ids.add(str_id)
                    selected_ids.append(raw_id)
                    if len(selected_ids) >= node_limit:
                        break
            if len(selected_ids) >= node_limit:
                break

        if not selected_ids:
            logger.info(
                "Graph visualization returned %d nodes and %d edges",
                0,
                0,
            )

            return {
                "nodes": [],
                "edges": [],
            }

        # Query the nodes table using only those selected IDs.
        placeholders = ", ".join(["?"] * len(selected_ids))
        node_result = connection.execute(
            f"""
            SELECT *
            FROM nodes
            WHERE id IN ({placeholders})
            """,
            selected_ids,
        )

        node_columns = [
            description[0]
            for description in node_result.description
        ]

        node_rows = node_result.fetchall()

        result_nodes = []

        for values in node_rows:
            row = {
                column: _safe_value(value)
                for column, value in zip(
                    node_columns,
                    values,
                )
            }

            node_id = str(row.get("id"))

            node_type = str(
                row.get("type")
                or "wallet"
            ).lower()

            if node_type not in {
                "wallet",
                "transaction",
                "ip",
                "cluster",
            }:
                node_type = "wallet"

            label = (
                row.get("address")
                or row.get("entity_id")
                or row.get("txid")
                or node_id
            )

            result_nodes.append(
                {
                    "id": node_id,
                    "label": str(label),
                    "type": node_type,
                    "clusterId": None,
                    "anomalyScore": None,
                }
            )

        # Only return edges whose endpoints are in the returned nodes.
        returned_ids = {node["id"] for node in result_nodes}

        result_edges = []

        for values in edge_rows:
            row = {
                column: _safe_value(value)
                for column, value in zip(
                    edge_columns,
                    values,
                )
            }

            source = str(row.get("source"))
            target = str(row.get("target"))

            if source not in returned_ids or target not in returned_ids:
                continue

            result_edges.append(
                {
                    "source": source,
                    "target": target,
                    "type": str(
                        row.get("relationship")
                        or row.get("relationship_class")
                        or "transaction"
                    ),
                    "weight": (
                        row.get("amount")
                        if row.get("amount") is not None
                        else None
                    ),
                }
            )

        logger.info(
            "Graph visualization returned %d nodes and %d edges",
            len(result_nodes),
            len(result_edges),
        )

        return {
            "nodes": result_nodes,
            "edges": result_edges,
        }

    except GraphDataError as exc:
        logger.error(
            "Graph visualization failed: %s",
            exc,
        )
        raise HTTPException(
            status_code=500,
            detail="Graph visualization is unavailable",
        ) from exc

    except Exception as exc:
        logger.exception(
            "Unexpected graph visualization error",
        )
        raise HTTPException(
            status_code=500,
            detail="Graph visualization is unavailable",
        ) from exc

    finally:
        if connection is not None:
            connection.close()

@router.get(
    "/statistics",
    response_model=GraphStatisticsResponse,
)
def get_graph_statistics() -> GraphStatisticsResponse:
    try:
        return GraphStatisticsResponse(
            **graph_service.statistics()
        )

    except GraphDataError as exc:
        logger.error(
            "Graph statistics failed: %s",
            exc,
        )
        raise HTTPException(
            status_code=500,
            detail="Graph statistics are unavailable",
        ) from exc

    except Exception as exc:
        logger.exception(
            "Unexpected graph statistics error"
        )
        raise HTTPException(
            status_code=500,
            detail="Graph statistics are unavailable",
        ) from exc


@router.get(
    "/neighborhood/{entity_type}/{entity_id}",
    response_model=GraphNeighborhoodResponse,
)
def get_graph_neighborhood(
    entity_type: str,
    entity_id: str,
    depth: int = Query(
        default=1,
        ge=1,
        le=2,
    ),
    node_types: str | None = Query(
        default=None,
    ),
    edge_types: str | None = Query(
        default=None,
    ),
    limit: int = Query(
        default=100,
        ge=1,
        le=500,
    ),
) -> GraphNeighborhoodResponse:
    try:
        return GraphNeighborhoodResponse(
            **graph_service.neighborhood(
                entity_type,
                entity_id,
                depth=depth,
                node_types=_parse_filters(node_types),
                edge_types=_parse_filters(edge_types),
                limit=limit,
            )
        )

    except EntityNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc

    except GraphDataError as exc:
        logger.error(
            "Graph neighborhood failed: %s",
            exc,
        )
        raise HTTPException(
            status_code=500,
            detail="Graph neighborhood is unavailable",
        ) from exc

    except Exception as exc:
        logger.exception(
            "Unexpected graph neighborhood error"
        )
        raise HTTPException(
            status_code=500,
            detail="Graph neighborhood is unavailable",
        ) from exc