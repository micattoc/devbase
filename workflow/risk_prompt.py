"""Prompt construction for change-risk reports."""


def build_change_risk_prompt(change_description: str) -> str:
    """Build the user-facing LightRAG query for a planned code change."""

    return f"""
            You are generating a change-risk report for a software engineering team.

            Planned change:
            {change_description}

            Use only retrieved GitHub repository context.

            Return the report in this exact structure:

            Summary:
            A concise 2-4 sentence explanation of the likely risk.

            Historical Context:
            - Cite relevant issues, pull requests, comments, or README details.
            - Explain why each source matters.
            - Include GitHub URLs.

            Risk Areas:
            - List concrete parts of the planned change that could break behavior.

            Review Checklist:
            - List practical checks a reviewer or implementer should perform.

            Sources:
            - List every GitHub URL used in the report.

            Rules:
            - Do not invent history.
            - If the available context is weak, say so.
            - Every historical claim must include a GitHub URL.
            - Prefer concise, actionable guidance.
            """.strip()