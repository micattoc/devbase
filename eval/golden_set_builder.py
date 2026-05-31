"""Generate candidate golden-set cases from GitHub records for developer's review."""

import json
import re
from pathlib import Path
from typing import Any

DEFAULT_GOLDEN_SET_PATH = Path("data/golden_test_set.jsonl")

# Modifiable list of high signal words that candidate records should contain
HIGH_SIGNAL_KEYWORDS = [
    "bug",
    "regression",
    "breaking",
    "compatibility",
    "fix",
    "crash",
    "error",
    "route",
    "request",
    "response",
    "body",
    "header",
    "environment",
    "config",
    "migration",
]


def _text(record: dict[str, Any]) -> str:
    return f"{record.get('title', '')}\n{record.get('body', '')}".lower()


def score_record(record: dict[str, Any]) -> int:
    """Score whether a GitHub record is useful as an eval case."""

    text = _text(record)
    labels = " ".join(record.get("labels", [])).lower()

    score = 0

    # Assign score based on record's attributes
    for keyword in HIGH_SIGNAL_KEYWORDS:
        if keyword in text:
            score += 1
        if keyword in labels:
            score += 2

    if record.get("type") in {"issue", "pull_request"}:
        score += 1

    if re.search(r"(fixes|closes|resolves)\s+#\d+", text):
        score += 3

    if record.get("url"):
        score += 1

    return score


def build_change_description(record: dict[str, Any]) -> str:
    """Create an example planned-change user prompt from a GitHub record."""

    title = record.get("title") or "this area"
    repo = record.get("repo") or "the repository"

    return (
        f"I am modifying behavior related to: {title}. "
        f"What historical risks should I consider in {repo}?"
    )


def generate_candidates(
    records: list[dict[str, Any]],
    max_candidates: int = 10,
    min_score: int = 3,
) -> list[dict[str, Any]]:
    """Generate candidate golden-set cases from normalized GitHub records."""

    scored_records = [
        (score_record(record), record)
        for record in records
        if record.get("url")
    ]

    scored_records.sort(key=lambda item: item[0], reverse=True)

    candidates: list[dict[str, Any]] = []

    for score, record in scored_records:
        if score < min_score:
            continue

        candidates.append(
            {
                "repo": record["repo"],
                "change_description": build_change_description(record),
                "expected_source_urls": [record["url"]],
                "notes": f"Auto-generated from {record['type']} {record['id']} with score {score}.",
            }
        )

        if len(candidates) >= max_candidates:
            break

    return candidates


def save_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    """Save rows as JSONL."""

    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open("w", encoding="utf-8") as file:
        for row in rows:
            file.write(json.dumps(row) + "\n")


def review_candidates(candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Prompt the developer to approve, reject, or edit generated cases."""

    approved: list[dict[str, Any]] = []

    for index, candidate in enumerate(candidates, start=1):
        print("\n" + "=" * 80)
        print(f"Candidate {index}/{len(candidates)}")
        print(f"Repo: {candidate['repo']}")
        print(f"Change description:\n{candidate['change_description']}")
        print("Expected sources:")

        for source in candidate["expected_source_urls"]:
            print(f"- {source}")
        
        print(f"Notes: {candidate['notes']}")

        choice = input("\nApprove? [y]es / [n]o / [e]dit / [q]uit: ").strip().lower()

        if choice == "q":
            break

        if choice == "n":
            continue

        if choice == "e":
            edited = input("New change description: ").strip()

            if edited:
                candidate = {
                    **candidate,
                    "change_description": edited,
                    "notes": candidate["notes"] + " Edited during review.",
                }

        approved.append(candidate)

    return approved


def build_and_review_golden_set(
    records: list[dict[str, Any]],
    output_path: Path = DEFAULT_GOLDEN_SET_PATH,
    max_candidates: int = 10,
) -> list[dict[str, Any]]:
    """Generate candidates, allow developer to review them interactively, and save approved cases."""

    candidates = generate_candidates(records, max_candidates=max_candidates)

    if not candidates:
        print("No suitable golden-set candidates found.")
        return []

    approved = review_candidates(candidates)

    if approved:
        save_jsonl(output_path, approved)
        print(f"\nSaved {len(approved)} approved cases to {output_path}")
    else:
        print("\nNo cases approved. Golden set was not updated.")

    return approved
