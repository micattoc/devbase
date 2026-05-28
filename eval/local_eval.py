"""Local eval gate for Devbase reports.

Runs reviewed golden-set cases through the workflow and checks whether expected
GitHub sources appear in the generated report.
"""

import asyncio
import json
from pathlib import Path
from typing import Any

from workflow.graph import risk_workflow
from eval.braintrust import log_eval_summary


GOLDEN_SET_PATH = Path("data/golden_test_set.jsonl")
PASSING_CITATION_RATE = 0.80


def load_golden_set(path: Path = GOLDEN_SET_PATH) -> list[dict[str, Any]]:
    """Load reviewed eval cases from JSONL."""

    if not path.exists():
        raise FileNotFoundError(
            f"Golden set not found at {path}."
        )

    cases: list[dict[str, Any]] = []

    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue

        cases.append(json.loads(line))

    return cases


def citation_hit(expected_urls: list[str], actual_urls: list[str]) -> bool:
    """Return True if at least one expected URL appears in actual sources."""

    actual = set(actual_urls)
    return any(url in actual for url in expected_urls)


async def run_eval(path: Path = GOLDEN_SET_PATH) -> dict[str, Any]:
    """Run the golden set in LightRAG's workflow and return pass/fail metrics."""

    cases = load_golden_set(path)

    results: list[dict[str, Any]] = []
    hits = 0

    for case in cases:
        result = await risk_workflow.ainvoke(
            {
                "repo": case["repo"],
                "user_description": case["change_description"],
            }
        )

        actual_sources = result.get("sources", [])
        hit = citation_hit(case["expected_source_urls"], actual_sources)

        if hit:
            hits += 1

        results.append(
            {
                "change_description": case["change_description"],
                "report": result.get("report"),
                "expected_source_urls": case["expected_source_urls"],
                "actual_sources": actual_sources,
                "citation_hit": hit,
                "blocked": result.get("is_blocked", False),
            }
        )

    citation_rate = hits / len(cases) if cases else 0.0

    return {
        "total": len(cases),
        "citation_hits": hits,
        "citation_rate": citation_rate,
        "passed": citation_rate >= PASSING_CITATION_RATE,
        "results": results,
    }


async def main() -> None:
    summary = await run_eval()

    # Log eval run for Braintrust analysis
    log_eval_summary(summary)

    print(json.dumps(summary, indent=2))

    if not summary["passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(main())