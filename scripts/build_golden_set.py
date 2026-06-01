"""Build a reviewed golden test set from GitHub repo history."""

from config import load_settings
from data.github_fetcher import fetch_repo_issues, fetch_repo_prs
from eval.golden_set_builder import build_and_review_golden_set


def prompt_int(label: str, default: int) -> int:
    value = input(f"{label} [max: {default}]: ").strip()

    return int(value) if value else default


def main() -> None:
    load_settings(require_secrets=False)

    repo = input("Repository owner/repo: ").strip()
    if not repo:
        raise SystemExit("Repository is required, e.g. mockoon/mockoon.")

    issue_limit = prompt_int("Issues to fetch", 20)
    pr_limit = prompt_int("Pull requests to fetch", 20)

    records = []
    records.extend(fetch_repo_issues(repo, max_items=issue_limit))
    records.extend(fetch_repo_prs(repo, max_items=pr_limit))

    print(f"Fetched {len(records)} records from {repo}")

    build_and_review_golden_set(
        records=records,
        max_candidates=10,
        repo=repo,
    )


if __name__ == "__main__":
    main()
