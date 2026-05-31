"""LangGraph workflow for generating risk reports."""

import re
from typing import TypedDict


from langgraph.graph import END, StateGraph

from rag.graph import query_change_risk
from security.proxy import screen_query

GITHUB_ISSUE_OR_PULL_PATTERN = re.compile(
    r"https://github\.com/(?P<repo>[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)/(?:issues|pull)/(?P<number>\d+)"
)
TOOL_CALL_PLACEHOLDER_PATTERN = re.compile(r"(?:\[TOOL_CALLS\]\s*)+", re.IGNORECASE)

class RiskWorkflowState(TypedDict, total=False):
    repo: str
    user_description: str
    sanitized_user_description: str
    is_blocked: bool
    block_reason: str | None
    report: str
    sources: list[str]


async def security_check(state: RiskWorkflowState) -> RiskWorkflowState:
    """Screen the user provided description before retrieval."""

    result = screen_query(state["user_description"])

    return {
        **state,
        "sanitized_user_description": result.sanitized_query,
        "is_blocked": result.is_blocked,
        "block_reason": result.reason,
    }


async def retrieval_and_generation(state: RiskWorkflowState) -> RiskWorkflowState:
    """Retrieve historical context and generate the report."""

    report = await query_change_risk(
                                        state["repo"],
                                        state["sanitized_user_description"],
                                    )

    if TOOL_CALL_PLACEHOLDER_PATTERN.fullmatch(report.strip()):
        report = (
            "Summary:\n"
            "The model returned a tool-call placeholder instead of a risk report. "
            "Try generating the report again, or refresh the RAG data before retrying.\n\n"
            "Historical Context:\n"
            "- No usable historical context was returned.\n\n"
            "Risk Areas:\n"
            "- Unable to determine risk areas from the model response.\n\n"
            "Review Checklist:\n"
            "- Retry the report generation and verify the retrieved GitHub context."
        )

    return {
        **state,
        "report": report,
    }


def citation_validator(state: RiskWorkflowState) -> RiskWorkflowState:
    """Extract GitHub source URLs from the generated report."""

    report = state.get("report", "")

    seen: set[str] = set()
    sources: list[str] = []

    # Only issue and pull request URLs are valid UI sources.
    for match in GITHUB_ISSUE_OR_PULL_PATTERN.finditer(report):
        path_type = "pull" if "/pull/" in match.group(0) else "issues"

        url = f"https://github.com/{match.group('repo')}/{path_type}/{match.group('number')}"
        if url not in seen:
            seen.add(url)
            sources.append(url)

    return {
        **state,
        "sources": sources,
    }


def route_after_security(state: RiskWorkflowState) -> str:
    """Stop blocked requests before invoking retrieval."""

    if state.get("is_blocked"):
        return "blocked"

    return "allowed"


def build_workflow():
    """Build the compiled LangGraph workflow."""

    graph = StateGraph(RiskWorkflowState)

    graph.add_node("security_check", security_check)
    graph.add_node("retrieval_and_generation", retrieval_and_generation)
    graph.add_node("citation_validator", citation_validator)

    graph.set_entry_point("security_check")

    graph.add_conditional_edges(
        "security_check",
        route_after_security,
        {
            "blocked": END,
            "allowed": "retrieval_and_generation",
        },
    )

    graph.add_edge("retrieval_and_generation", "citation_validator")
    graph.add_edge("citation_validator", END)

    return graph.compile()


risk_workflow = build_workflow()
