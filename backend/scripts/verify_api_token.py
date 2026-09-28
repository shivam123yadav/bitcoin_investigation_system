"""In-process smoke test for the minimal deployment token protection.

The script drives the real FastAPI application through the ASGI interface, so no
HTTP server, no network access and no HTTP client library (httpx) are required.
It answers the deployment questions the demo cares about:

* state-changing ``/api/v1`` endpoints reject a missing token with 401,
* they reject a wrong token with 403,
* a correct token is accepted (the request reaches the endpoint logic),
* read-only dashboard/entity endpoints stay public,
* with ``SIH_API_TOKEN`` unset the protection is disabled and nothing changes.

No state is mutated: every check targets resources that do not exist, so the
endpoints answer 404 instead of creating cases, deleting data or running the
analysis pipeline. For the same reason the disabled-mode checks reuse only
those non-mutating probes.

Commands (project virtual environment, run from the ``backend`` directory):

    python scripts/verify_api_token.py
    python scripts/verify_api_token.py --token my-deployment-token
    python scripts/verify_api_token.py --skip-disabled-mode

Exit code is 0 when every check passes and 2 when at least one check fails.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

#: Environment variable that switches the protection on.
TOKEN_ENV_VAR = "SIH_API_TOKEN"

#: Token used when the caller does not provide one.
DEFAULT_TOKEN = "verify-deployment-token"

#: Token that is guaranteed to be wrong for the configured value.
INVALID_TOKEN = "verify-invalid-token"

#: Request identifiers used by the valid-token checks. They deliberately point
#: at resources that do not exist so nothing is created or deleted.
MISSING_CASE = "CASE-DOES-NOT-EXIST"
MISSING_LEAD = "LEAD-DOES-NOT-EXIST"
MISSING_DATASET = "DS-DOES-NOT-EXIST"

#: Multipart body for the upload endpoint. The dependency rejects the request
#: before the body is used, so the payload only has to be well formed.
_UPLOAD_BOUNDARY = "----sih-verify-boundary"
_UPLOAD_BODY = (
    f"--{_UPLOAD_BOUNDARY}\r\n"
    'Content-Disposition: form-data; name="file"; filename="verify.csv"\r\n'
    "Content-Type: text/csv\r\n\r\n"
    "timestamp,src_ip,dst_ip,txid,value_btc\r\n"
    "2024-11-15T08:46:14Z,10.0.0.1,10.0.0.2,deadbeef,0.5\r\n"
    f"\r\n--{_UPLOAD_BOUNDARY}--\r\n"
).encode("utf-8")

_CASE_BODY = b'{"title":"verification case","description":"","priority":"medium"}'

#: (method, path, body, content_type) of every state-changing endpoint.
STATE_CHANGING_REQUESTS: tuple[tuple[str, str, bytes | None, str | None], ...] = (
    ("POST", "/api/v1/analysis/run", None, None),
    ("POST", "/api/v1/cases", _CASE_BODY, "application/json"),
    ("POST", f"/api/v1/cases/from-lead/{MISSING_LEAD}", None, None),
    ("DELETE", f"/api/v1/cases/{MISSING_CASE}", None, None),
    ("POST", f"/api/v1/flexible-dataset/{MISSING_DATASET}/analyze", None, None),
    (
        "POST",
        "/api/v1/flexible-dataset/upload",
        _UPLOAD_BODY,
        f"multipart/form-data; boundary={_UPLOAD_BOUNDARY}",
    ),
)

#: Probes that cannot create or delete anything, because they address resources
#: that do not exist. Used for the disabled-mode run, where the guard is off and
#: the endpoint logic really executes.
NON_MUTATING_REQUESTS: tuple[tuple[str, str], ...] = (
    ("DELETE", f"/api/v1/cases/{MISSING_CASE}"),
    ("POST", f"/api/v1/cases/from-lead/{MISSING_LEAD}"),
    ("POST", f"/api/v1/flexible-dataset/{MISSING_DATASET}/analyze"),
)

#: Read-only endpoints that must stay public.
PUBLIC_REQUESTS: tuple[tuple[str, str], ...] = (
    ("GET", "/api/v1/health"),
    ("GET", "/api/v1/analysis/status"),
    ("GET", "/api/v1/analysis/stages"),
    ("GET", "/api/v1/cases"),
    ("GET", "/api/v1/leads?limit=1"),
)


async def _request(
    method: str,
    path: str,
    headers: dict[str, str] | None = None,
    body: bytes | None = None,
) -> tuple[int, str]:
    """Call the ASGI application in-process and return (status, body text)."""

    from app.main import app

    request_path, _, query = path.partition("?")
    raw_headers = [
        (key.lower().encode("latin-1"), value.encode("latin-1"))
        for key, value in (headers or {}).items()
    ]

    status_code = 0
    chunks: list[bytes] = []

    async def receive() -> dict[str, Any]:
        return {"type": "http.request", "body": body or b"", "more_body": False}

    async def send(message: dict[str, Any]) -> None:
        nonlocal status_code
        if message["type"] == "http.response.start":
            status_code = int(message["status"])
        elif message["type"] == "http.response.body":
            chunks.append(message.get("body", b""))

    scope = {
        "type": "http",
        "asgi": {"version": "3.0", "spec_version": "2.3"},
        "http_version": "1.1",
        "method": method,
        "scheme": "http",
        "path": request_path,
        "raw_path": request_path.encode("utf-8"),
        "query_string": query.encode("utf-8"),
        "root_path": "",
        "headers": raw_headers,
        "client": ("127.0.0.1", 12345),
        "server": ("127.0.0.1", 8000),
    }

    await app(scope, receive, send)

    return status_code, b"".join(chunks).decode("utf-8", "replace")


class Results:
    """Collects PASS/FAIL lines and counts the failures."""

    def __init__(self) -> None:
        self.failures = 0

    def record(self, label: str, expected: tuple[int, ...], actual: int) -> None:
        passed = actual in expected
        if not passed:
            self.failures += 1
        expect_text = "/".join(str(code) for code in expected)
        print(
            f"  [{'PASS' if passed else 'FAIL'}] {label} "
            f"-> expected {expect_text}, got {actual}"
        )


def _headers_for(token: str | None) -> dict[str, str]:
    return {"X-API-Token": token} if token else {}


async def _enabled_mode_checks(token: str, results: Results) -> None:
    """Assert the 401 / 403 / pass-through behaviour with a token configured."""

    print(f"token protection ENABLED ({TOKEN_ENV_VAR} is set)")

    print("missing token:")
    for method, path, body, content_type in STATE_CHANGING_REQUESTS:
        headers: dict[str, str] = {}
        if content_type:
            headers["Content-Type"] = content_type
        status, _ = await _request(method, path, headers, body)
        results.record(f"{method} {path} without token", (401,), status)

    print("invalid token:")
    for method, path, body, content_type in STATE_CHANGING_REQUESTS:
        headers = _headers_for(INVALID_TOKEN)
        if content_type:
            headers["Content-Type"] = content_type
        status, _ = await _request(method, path, headers, body)
        results.record(f"{method} {path} with wrong token", (403,), status)

    print("valid token (404 means the token was accepted):")
    passthrough: tuple[tuple[str, str], ...] = (
        ("DELETE", f"/api/v1/cases/{MISSING_CASE}"),
        ("POST", f"/api/v1/cases/from-lead/{MISSING_LEAD}"),
        ("POST", f"/api/v1/flexible-dataset/{MISSING_DATASET}/analyze"),
    )
    for method, path in passthrough:
        status, _ = await _request(method, path, _headers_for(token))
        results.record(f"{method} {path} with valid token", (404,), status)

    # The Authorization: Bearer form is accepted as well.
    status, _ = await _request(
        "DELETE",
        f"/api/v1/cases/{MISSING_CASE}",
        {"Authorization": f"Bearer {token}"},
    )
    results.record(
        f"DELETE /api/v1/cases/{MISSING_CASE} with Bearer token",
        (404,),
        status,
    )

    print("read-only endpoints stay public:")
    for method, path in PUBLIC_REQUESTS:
        status, _ = await _request(method, path)
        results.record(f"{method} {path} without token", (200,), status)


async def _disabled_mode_checks(results: Results) -> None:
    """Assert that the protection is inert when the token is not configured.

    Only non-mutating probes are used, because with the guard disabled these
    requests really reach the endpoint logic.
    """

    print(f"token protection DISABLED ({TOKEN_ENV_VAR} is unset)")

    for method, path in NON_MUTATING_REQUESTS:
        status, _ = await _request(method, path)
        results.record(
            f"{method} {path} without token is not rejected as unauthorized",
            (404,),
            status,
        )


def _spawn(mode: str, token: str | None) -> int:
    """Run the checks in a child process so settings are read from the env."""

    env = dict(os.environ)
    if token is None:
        env.pop(TOKEN_ENV_VAR, None)
    else:
        env[TOKEN_ENV_VAR] = token

    print(f"\n=== {mode} mode ===")
    completed = subprocess.run(
        [sys.executable, str(Path(__file__).resolve()), "--mode", mode],
        env=env,
        check=False,
    )
    return completed.returncode


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Verify the minimal API token protection in-process.",
    )
    parser.add_argument(
        "--token",
        default=os.getenv(TOKEN_ENV_VAR) or DEFAULT_TOKEN,
        help=f"token treated as the valid value (default: ${TOKEN_ENV_VAR})",
    )
    parser.add_argument(
        "--skip-disabled-mode",
        action="store_true",
        help=f"skip the run with {TOKEN_ENV_VAR} unset",
    )
    parser.add_argument(
        "--mode",
        choices=("enabled", "disabled"),
        default=None,
        help=argparse.SUPPRESS,
    )
    args = parser.parse_args()

    if args.mode == "enabled":
        if args.token == INVALID_TOKEN:
            print(f"--token must differ from {INVALID_TOKEN!r}")
            return 2
        results = Results()
        asyncio.run(_enabled_mode_checks(args.token, results))
        return 2 if results.failures else 0

    if args.mode == "disabled":
        results = Results()
        asyncio.run(_disabled_mode_checks(results))
        return 2 if results.failures else 0

    failures = _spawn("enabled", args.token)
    if not args.skip_disabled_mode:
        failures += _spawn("disabled", None)

    print(f"\noverall status: {'FAIL' if failures else 'PASS'}")
    return 2 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
