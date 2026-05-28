"""Promote validated LightRAG staging storage to live storage, while keeping previous live folder as a backup."""

from dataclasses import dataclass
from pathlib import Path
import shutil

from config import load_settings


@dataclass(frozen=True)
class PromotionResult:
    promoted: bool
    live_path: str
    staging_path: str
    backup_path: str
    message: str


def _has_files(path: Path) -> bool:
    return path.exists() and any(path.iterdir())


def promote_staging_to_live() -> PromotionResult:
    """Replace live LightRAG storage with staging storage."""

    settings = load_settings(require_secrets=False)

    live_path = settings.lightrag_live_dir
    staging_path = settings.lightrag_staging_dir
    backup_path = settings.lightrag_backup_dir
    live_next_path = live_path.parent / "live_next"

    if not _has_files(staging_path):
        return PromotionResult(
            promoted=False,
            live_path=str(live_path),
            staging_path=str(staging_path),
            backup_path=str(backup_path),
            message="Staging storage is empty or missing.",
        )

    if live_next_path.exists():
        shutil.rmtree(live_next_path)

    shutil.copytree(staging_path, live_next_path)

    if backup_path.exists():
        shutil.rmtree(backup_path)

    if live_path.exists():
        shutil.move(str(live_path), str(backup_path))

    shutil.move(str(live_next_path), str(live_path))

    return PromotionResult(
        promoted=True,
        live_path=str(live_path),
        staging_path=str(staging_path),
        backup_path=str(backup_path),
        message="Staging storage promoted to live.",
    )

