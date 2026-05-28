"""Convert GitHub records into LightRAG documents.
"""

import asyncio
import json
from pathlib import Path
from typing import Any
from rag.graph import insert_text


def record_key(record: dict[str, Any]) -> str:
    """Build a stable ID, used to avoid inserting the same GitHub record twice."""

    return f"{record['repo']}::{record['type']}::{record['id']}"


def format_record_for_rag(record: dict[str, Any]) -> str:
    """Format a normalised GitHub record as retrieval text."""

    labels = ", ".join(record.get("labels", [])) or "none"
    body = record.get("body") or "No body provided."
    created_at = record.get("created_at") or "unknown"
    updated_at = record.get("updated_at") or "unknown"

    return f"""[{record['type'].upper()}] {record['id']} in {record['repo']}: {record['title']}
            URL: {record['url']}
            Created: {created_at}
            Updated: {updated_at}
            Labels: {labels}

            Content:
            {body}
            """


def load_manifest(path: Path) -> set[str]:
    """Load previously inserted record IDs from disk."""

    if not path.exists():
        return set()

    return set(json.loads(path.read_text(encoding="utf-8")))


def save_manifest(path: Path, keys: set[str]) -> None:
    """Persist inserted record IDs in sorted order to disk."""

    path.write_text(json.dumps(sorted(keys), indent=2), encoding="utf-8")


async def ingest_records(records: list[dict[str, Any]], manifest_path: Path) -> dict[str, int]:
    """Insert new GitHub records into RAG, skipping records already inserted."""

    inserted_keys = load_manifest(manifest_path)

    fetched = len(records)
    inserted = 0
    skipped = 0

    for record in records:
        key = record_key(record)

        if key in inserted_keys:
            skipped += 1
            continue

        text = format_record_for_rag(record)
        await insert_text(text)

        inserted_keys.add(key)
        inserted += 1

    save_manifest(manifest_path, inserted_keys)

    return {
        "fetched": fetched,
        "inserted": inserted,
        "skipped": skipped,
    }