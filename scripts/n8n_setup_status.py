"""Local status flag for one-time n8n workflow setup."""

import json
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path


@dataclass(frozen=True)
class N8nSetupStatus:
    imported: bool
    workflow_name: str | None = None
    imported_at: str | None = None


def read_n8n_setup_status(path: Path) -> N8nSetupStatus:
    if not path.exists():
        return N8nSetupStatus(imported=False)

    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return N8nSetupStatus(imported=False)

    return N8nSetupStatus(
        imported=bool(payload.get("imported")),
        workflow_name=payload.get("workflow_name"),
        imported_at=payload.get("imported_at"),
    )


def write_n8n_setup_status(path: Path, workflow_name: str) -> N8nSetupStatus:
    status = N8nSetupStatus(
        imported=True,
        workflow_name=workflow_name,
        imported_at=datetime.now(UTC).isoformat(),
    )

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(
            {
                "imported": status.imported,
                "workflow_name": status.workflow_name,
                "imported_at": status.imported_at,
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    return status
