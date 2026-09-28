"""Regression tests for the minimal deployment token protection.

These tests are deliberately lightweight: they exercise the FastAPI dependency
directly and inspect the route decorators with :mod:`ast`, so no DuckDB /
pandas backed service is imported and no HTTP client (httpx) is needed.

Run from the project root with:
    python -m unittest backend.tests.test_api_token_auth

Run from the backend/ directory with:
    python -m unittest discover tests/
"""
from __future__ import annotations

import ast
import inspect
import sys
import unittest
from dataclasses import replace
from pathlib import Path
from typing import get_type_hints
from unittest.mock import patch

from fastapi import HTTPException
from fastapi.params import Header as HeaderParam

# The backend is imported as "app.*". Running from the project root needs the
# backend/ directory on sys.path; running from backend/ already has it.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.config import settings
from app.core import security


API_DIR = BACKEND_ROOT / "app" / "api"

# HTTP methods that change state and therefore must be token protected.
STATE_CHANGING_METHODS = {"post", "put", "patch", "delete"}

# The complete set of state-changing /api/v1 endpoints of the demo.
EXPECTED_PROTECTED_ROUTES = {
    ("POST", "/api/v1/analysis/run"),
    ("POST", "/api/v1/cases"),
    ("DELETE", "/api/v1/cases/{case_id}"),
    ("POST", "/api/v1/cases/from-lead/{lead_id}"),
    ("POST", "/api/v1/flexible-dataset/upload"),
    ("POST", "/api/v1/flexible-dataset/{dataset_id}/analyze"),
}

VALID_TOKEN = "demo-secret-token"

FUNCTION_NODES = (ast.FunctionDef, ast.AsyncFunctionDef)


def _router_prefix(tree: ast.Module) -> str:
    for node in tree.body:
        if (
            isinstance(node, ast.Assign)
            and isinstance(node.value, ast.Call)
            and getattr(node.value.func, "id", "") == "APIRouter"
        ):
            for keyword in node.value.keywords:
                if keyword.arg == "prefix" and isinstance(
                    keyword.value, ast.Constant
                ):
                    return str(keyword.value.value)
    return ""


def collect_routes(path: Path) -> list[tuple[str, str, bool]]:
    """Return (METHOD, full_path, is_token_protected) for a router module."""

    tree = ast.parse(path.read_text(encoding="utf-8"))
    prefix = _router_prefix(tree)

    routes: list[tuple[str, str, bool]] = []

    for node in tree.body:
        if not isinstance(node, FUNCTION_NODES):
            continue

        for decorator in node.decorator_list:
            if not isinstance(decorator, ast.Call):
                continue

            attribute = decorator.func
            method = getattr(attribute, "attr", "").lower()
            owner = getattr(getattr(attribute, "value", None), "id", "")

            if owner != "router" or method not in STATE_CHANGING_METHODS:
                continue

            route_path = (
                str(decorator.args[0].value)
                if decorator.args and isinstance(decorator.args[0], ast.Constant)
                else ""
            )

            routes.append(
                (
                    method.upper(),
                    f"{prefix}{route_path}",
                    "require_api_token" in ast.unparse(decorator),
                )
            )

    return routes


def collect_read_routes(path: Path) -> list[tuple[str, str, str]]:
    """Return (METHOD, full_path, decorator_source) for GET routes."""

    tree = ast.parse(path.read_text(encoding="utf-8"))
    prefix = _router_prefix(tree)

    routes: list[tuple[str, str, str]] = []

    for node in tree.body:
        if not isinstance(node, FUNCTION_NODES):
            continue

        for decorator in node.decorator_list:
            if not isinstance(decorator, ast.Call):
                continue

            attribute = decorator.func
            if getattr(attribute, "attr", "").lower() != "get":
                continue
            if getattr(getattr(attribute, "value", None), "id", "") != "router":
                continue

            route_path = (
                str(decorator.args[0].value)
                if decorator.args and isinstance(decorator.args[0], ast.Constant)
                else ""
            )

            routes.append(("GET", f"{prefix}{route_path}", ast.unparse(decorator)))

    return routes


class ApiTokenDependencyTests(unittest.TestCase):
    """Verify the 401 / 403 behaviour of the token dependency."""

    def _patch_token(self, token: str | None):
        return patch.object(security, "settings", replace(settings, api_token=token))

    def test_missing_token_is_rejected_with_401(self):
        with self._patch_token(VALID_TOKEN):
            with self.assertRaises(HTTPException) as raised:
                security.require_api_token()

        self.assertEqual(raised.exception.status_code, 401)
        self.assertEqual(raised.exception.headers, {"WWW-Authenticate": "Bearer"})

    def test_blank_token_is_rejected_with_401(self):
        with self._patch_token(VALID_TOKEN):
            with self.assertRaises(HTTPException) as raised:
                security.require_api_token(x_api_token="   ")

        self.assertEqual(raised.exception.status_code, 401)

    def test_invalid_token_is_rejected_with_403(self):
        with self._patch_token(VALID_TOKEN):
            with self.assertRaises(HTTPException) as raised:
                security.require_api_token(x_api_token="not-the-token")

        self.assertEqual(raised.exception.status_code, 403)

    def test_invalid_bearer_token_is_rejected_with_403(self):
        with self._patch_token(VALID_TOKEN):
            with self.assertRaises(HTTPException) as raised:
                security.require_api_token(authorization="Bearer not-the-token")

        self.assertEqual(raised.exception.status_code, 403)

    def test_valid_token_header_is_accepted(self):
        with self._patch_token(VALID_TOKEN):
            self.assertIsNone(security.require_api_token(x_api_token=VALID_TOKEN))

    def test_valid_bearer_token_is_accepted(self):
        with self._patch_token(VALID_TOKEN):
            self.assertIsNone(
                security.require_api_token(authorization=f"Bearer {VALID_TOKEN}")
            )

    def test_non_bearer_authorization_is_ignored(self):
        with self._patch_token(VALID_TOKEN):
            with self.assertRaises(HTTPException) as raised:
                security.require_api_token(authorization=f"Basic {VALID_TOKEN}")

        self.assertEqual(raised.exception.status_code, 401)

    def test_protection_disabled_when_token_is_unconfigured(self):
        with self._patch_token(None):
            self.assertFalse(security.token_protection_enabled())
            self.assertIsNone(security.configured_api_token())
            self.assertIsNone(security.require_api_token())

    def test_header_names_are_declared(self):
        hints = get_type_hints(security.require_api_token, include_extras=True)

        primary = [
            item.alias
            for item in hints["x_api_token"].__metadata__
            if isinstance(item, HeaderParam)
        ]
        fallback = [
            item
            for item in hints["authorization"].__metadata__
            if isinstance(item, HeaderParam)
        ]

        self.assertIn("X-API-Token", primary)
        self.assertTrue(fallback)

    def test_dependency_signature_matches_fastapi_injection(self):
        signature = inspect.signature(security.require_api_token)

        self.assertEqual(
            list(signature.parameters),
            ["x_api_token", "authorization"],
        )


class StateChangingRouteProtectionTests(unittest.TestCase):
    """Every state-changing /api/v1 route must be token protected."""

    def _state_changing_routes(self):
        routes = []
        for module in sorted(API_DIR.glob("*.py")):
            routes.extend(collect_routes(module))
        return routes

    def test_every_state_changing_route_requires_the_token(self):
        unprotected = [
            f"{method} {path}"
            for method, path, protected in self._state_changing_routes()
            if not protected
        ]

        self.assertEqual(
            unprotected,
            [],
            f"State-changing endpoints without require_api_token: {unprotected}",
        )

    def test_expected_route_set_is_fully_protected(self):
        protected = {
            (method, path)
            for method, path, is_protected in self._state_changing_routes()
            if is_protected
        }

        self.assertEqual(protected, EXPECTED_PROTECTED_ROUTES)

    def test_read_only_routes_stay_public(self):
        for module in sorted(API_DIR.glob("*.py")):
            for method, path, decorator in collect_read_routes(module):
                self.assertNotIn(
                    "require_api_token",
                    decorator,
                    f"Read-only endpoint must stay public: {method} {path}",
                )


if __name__ == "__main__":
    unittest.main()

