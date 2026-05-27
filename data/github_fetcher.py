"""GitHub REST API fetcher for public repository history.
"""

import time
from typing import Any

import requests

from config import load_settings


GITHUB_API_BASE = "https://api.github.com"

def _headers() -> dict[str, str]:
    settings = load_settings(require_secrets=False)

    headers = {
        "Accept": "application/vnd.github+json",
    }

    if settings.github_token:
        headers["Authorization"] = f"Bearer {settings.github_token}"

    return headers


def _get(url: str, params: dict[str, Any] | None = None) -> Any:
    """GET a GitHub API URL with rate-limit handling."""

    response = requests.get(url, headers=_headers(), params=params, timeout=30)

    if response.status_code == 403 and response.headers.get("X-RateLimit-Remaining") == "0":
        reset_at = int(response.headers.get("X-RateLimit-Reset", "0"))
        sleep_for = max(reset_at - int(time.time()), 1)

        print(f"GitHub rate limit reached. Sleeping for {sleep_for} seconds.")

        time.sleep(sleep_for)

        response = requests.get(url, headers=_headers(), params=params, timeout=30)

    response.raise_for_status()
    return response.json()


def _paginate(url: str, max_items: int, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    """Fetch paginated GitHub results up to max_items."""

    results: list[dict[str, Any]] = []
    page = 1

    while len(results) < max_items:
        page_params = {
            "per_page": min(100, max_items - len(results)),
            "page": page,
            **(params or {}),
        }

        batch = _get(url, page_params)

        if not batch:
            break

        results.extend(batch)
        page += 1

    return results[:max_items]


def _labels(item: dict[str, Any]) -> list[str]:
    """Normalise issue or PR with name of label, omitting other label attributes."""
    return [label["name"] for label in item.get("labels", [])]


def fetch_issue_comments(repo: str, issue_number: int, max_items: int = 20) -> list[dict[str, Any]]:
    """Get all comments for a given issue."""

    url = f"{GITHUB_API_BASE}/repos/{repo}/issues/{issue_number}/comments"
    comments = _paginate(url, max_items=max_items)

    return [
        {
            "type": "issue_comment",
            "repo": repo,
            "id": comment["id"],
            "title": f"Comment on issue #{issue_number}",
            "body": comment.get("body") or "",
            "url": comment["html_url"],
            "created_at": comment["created_at"],
            "updated_at": comment["updated_at"],
            "labels": [],
        }
        for comment in comments
    ]