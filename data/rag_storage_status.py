"""Read local LightRAG storage freshness for the UI."""

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


@dataclass(frozen=True)
class RagStorageStatus:
    exists: bool
    modified_at: str | None = None
    display_date: str | None = None
    days_ago: int | None = None


def _latest_modified_path(path: Path) -> Path:
    latest_path = path
    latest_mtime = path.stat().st_mtime

    for child in path.rglob("*"):
        try:
            child_mtime = child.stat().st_mtime
        except OSError:
            continue

        if child_mtime > latest_mtime:
            latest_mtime = child_mtime
            latest_path = child

    return latest_path


def read_rag_storage_status(live_dir: Path) -> RagStorageStatus:
    if not live_dir.exists():
        return RagStorageStatus(exists=False)

    latest_path = _latest_modified_path(live_dir)
    modified_at = datetime.fromtimestamp(latest_path.stat().st_mtime).astimezone()
    days_ago = max((datetime.now().astimezone().date() - modified_at.date()).days, 0)

    return RagStorageStatus(
        exists=True,
        modified_at=modified_at.isoformat(),
        display_date=modified_at.strftime("%d/%m/%Y"),
        days_ago=days_ago,
    )
