"""Security screening for user requests.

Redacts accidental PII, uses rules to block prompt-injection and
secret-exfiltration attempts before queries reach retrieval or the LLM.
"""

from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import json
import re

from presidio_analyzer import AnalyzerEngine, Pattern, PatternRecognizer
from presidio_anonymizer import AnonymizerEngine

from config import load_settings

# Common patterns for prompt injection and secret exfiltration
BLOCK_PATTERNS = {
    "prompt_injection": [
        r"\bignore (all )?(previous|prior) instructions\b",
        r"\bdisregard (all )?(previous|prior) instructions\b",
        r"\byou are now\b",
        r"\bpretend you are\b",
        r"\bdeveloper mode\b",
        r"\bdan mode\b",
    ],
    "secret_exfiltration": [
        r"\bsystem prompt\b",
        r"\bhidden instructions\b",
        r"\binternal instructions\b",
        r"\breveal .*instructions\b",
        r"\bshow .*instructions\b",
        r"\bapi key\b",
        r"\baccess token\b",
    ],
}


PII_ENTITIES = [
    "EMAIL_ADDRESS",
    "PHONE_NUMBER",

    # Custom PII entities to redact
    "API_TOKEN",
    "ACCESS_KEY",
    "SECRET_KEY",
]


@dataclass(frozen=True)
class ScreeningResult:
    is_blocked: bool
    reason: str | None
    sanitized_query: str


def _build_analyzer() -> AnalyzerEngine:
    """Build custom recognizers for more nuanced PII data."""
    analyzer = AnalyzerEngine()

    recognizers = [
        PatternRecognizer(
            supported_entity="API_TOKEN",
            patterns=[
                Pattern("prefixed_token", r"\b(?:gh[pousr]|github_pat|hf|sk)-?_[A-Za-z0-9_]{16,}\b", 0.85),
                Pattern("bearer_token", r"\bBearer\s+[A-Za-z0-9._~+/=-]{20,}\b", 0.8),
            ],
            context=["token", "api", "bearer", "authorization"],
        ),

        PatternRecognizer(
            supported_entity="ACCESS_KEY",
            patterns=[
                Pattern("access_key_assignment", r"\b[A-Z0-9_]*(?:ACCESS|PUBLIC)_KEY[A-Z0-9_]*\s*=\s*[A-Za-z0-9_./+=-]{16,}\b", 0.85),
                Pattern("aws_like_access_key", r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b", 0.8),
            ],
            context=["access", "public", "key"],
        ),

        PatternRecognizer(
            supported_entity="SECRET_KEY",
            patterns=[
                Pattern("secret_assignment", r"\b[A-Z0-9_]*(?:SECRET|PRIVATE)_KEY[A-Z0-9_]*\s*=\s*[A-Za-z0-9_./+=-]{16,}\b", 0.85),
                Pattern("generic_secret_context", r"\b[A-Za-z0-9_./+=-]{32,}\b", 0.45),
            ],
            context=["secret", "private", "credential"],
        ),
    ]

    for recognizer in recognizers:
        analyzer.registry.add_recognizer(recognizer)

    return analyzer


def _query_hash(query: str) -> str:
    return hashlib.sha256(query.encode("utf-8")).hexdigest()


def _write_audit_log(query: str, reason: str) -> None:
    settings = load_settings(require_secrets=False)

    event = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "query_hash": _query_hash(query),
        "reason": reason,
    }

    with settings.audit_log_path.open("a", encoding="utf-8") as file:
        file.write(json.dumps(event) + "\n")


def _block_reason(query: str) -> str | None:
    """Block query if matching pattern."""
    normalized = query.lower()

    for reason, patterns in BLOCK_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, normalized):
                return reason

    return None


def screen_query(query: str) -> ScreeningResult:
    """Redact PII and block unsafe user requests."""

    reason = _block_reason(query)

    if reason:
        _write_audit_log(query, reason)
        return ScreeningResult(
            is_blocked=True,
            reason=reason,
            sanitized_query="",
        )

    analyzer = _build_analyzer()
    anonymizer = AnonymizerEngine()

    analyzer_results = analyzer.analyze(
        text=query,
        language="en",
        entities=PII_ENTITIES,
    )

    anonymized = anonymizer.anonymize(
        text=query,
        analyzer_results=analyzer_results,
    )

    return ScreeningResult(
        is_blocked=False,
        reason=None,
        sanitized_query=anonymized.text,
    )
