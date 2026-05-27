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


def fetch_repo_issues(repo: str, max_items: int = 25) -> list[dict[str, Any]]:
    url = f"{GITHUB_API_BASE}/repos/{repo}/issues"
    items = _paginate(url, max_items=max_items, params={"state": "all"})

    issues: list[dict[str, Any]] = []

    for item in items:

        # GitHub's issues endpoint returns PRs too, so skipping those here
        if "pull_request" in item:
            continue

        issue = {
            "type": "issue",
            "repo": repo,
            "id": item["number"],
            "title": item.get("title") or "",
            "body": item.get("body") or "",
            "url": item["html_url"],
            "created_at": item["created_at"],
            "updated_at": item["updated_at"],
            "labels": _labels(item),
        }

        issues.append(issue)

        # Fetch comments of issues in repo
        if item.get("comments", 0) > 0:
            issues.extend(fetch_issue_comments(repo, item["number"], max_items=10))

    return issues


def fetch_pr_review_comments(repo: str, pull_number: int, max_items: int = 20) -> list[dict[str, Any]]:
    """Get all comments from a given PR."""

    url = f"{GITHUB_API_BASE}/repos/{repo}/pulls/{pull_number}/comments"
    comments = _paginate(url, max_items=max_items)

    return [
        {
            "type": "pr_review_comment",
            "repo": repo,
            "id": comment["id"],
            "title": f"Review comment on PR #{pull_number}",
            "body": comment.get("body") or "",
            "url": comment["html_url"],
            "created_at": comment["created_at"],
            "updated_at": comment["updated_at"],
            "labels": [],
        }
        for comment in comments
    ]


def fetch_repo_prs(repo: str, max_items: int = 25) -> list[dict[str, Any]]:
    url = f"{GITHUB_API_BASE}/repos/{repo}/pulls"
    items = _paginate(url, max_items=max_items, params={"state": "all"})

    prs: list[dict[str, Any]] = []

    for item in items:
        pr = {
            "type": "pull_request",
            "repo": repo,
            "id": item["number"],
            "title": item.get("title") or "",
            "body": item.get("body") or "",
            "url": item["html_url"],
            "created_at": item["created_at"],
            "updated_at": item["updated_at"],
            "labels": [],
        }

        prs.append(pr)
        
        # Add comments of PR while keeping store as a flat list
        prs.extend(fetch_pr_review_comments(repo, item["number"], max_items=10))

    return prs


def fetch_repo_readme(repo: str) -> dict[str, Any]:
    url = f"{GITHUB_API_BASE}/repos/{repo}/readme"
    readme = _get(url)

    return {
        "type": "readme",
        "repo": repo,
        "id": "README",
        "title": "README",
        "body": requests.get(readme["download_url"], timeout=30).text,
        "url": readme["html_url"],
        "created_at": None,
        "updated_at": None,
        "labels": [],
    }