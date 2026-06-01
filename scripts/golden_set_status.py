"""Read local golden-set for eval gating."""

import json
from dataclasses import dataclass
from pathlib import Path

from eval.local_eval import GOLDEN_SET_PATH


@dataclass(frozen=True)
class GoldenSetStatus:
    established: bool
    path: str
    case_count: int


def read_golden_set_status(
    path: Path = GOLDEN_SET_PATH,
    repo: str | None = None,
) -> GoldenSetStatus:
    if not path.exists():
        return GoldenSetStatus(established=False, path=str(path), case_count=0)

    case_count = 0

    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue

        try:
            case = json.loads(line)
        except json.JSONDecodeError:
            continue

        if repo and case.get("repo") != repo:
            continue

        case_count += 1

    return GoldenSetStatus(
        established=case_count > 0,
        path=str(path),
        case_count=case_count,
    )
