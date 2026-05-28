"""Braintrust logging for eval runs."""

from typing import Any

from config import load_settings
import braintrust


PROJECT_NAME = "devbase"


def log_eval_summary(summary: dict[str, Any]) -> None:
    """Log eval results to Braintrust."""

    settings = load_settings(require_secrets=False)

    if not settings.braintrust_api_key:
        return

    experiment = braintrust.init(
                                project=PROJECT_NAME,
                                experiment="change-risk-local-eval",
                                api_key=settings.braintrust_api_key,
                            )

    for result in summary["results"]:
        experiment.log(
            input={
                "change_description": result["change_description"],
            },

            output={
                "actual_sources": result["actual_sources"],
            },

            expected={
                "expected_source_urls": result["expected_source_urls"],
            },

            scores={
                "citation_hit": 1 if result["citation_hit"] else 0,
                "blocked": 1 if result["blocked"] else 0,
            },

            metadata={
                "eval_type": "change_risk_citation",
            },
        )

    experiment.log(
        input={"eval_summary": True},

        output={
            "total": summary["total"],
            "citation_hits": summary["citation_hits"],
            "citation_rate": summary["citation_rate"],
            "passed": summary["passed"],
        },

        scores={
            "citation_rate": summary["citation_rate"],
            "passed": 1 if summary["passed"] else 0,
        },
        
        metadata={
            "eval_type": "summary",
        },
    )