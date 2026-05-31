"""Prompt construction for change-risk reports."""


def build_change_risk_prompt(repo: str, change_description: str) -> str:
    """Build the user-facing LightRAG query for a planned code change."""

    return f"""
            You are generating a change-risk report for a software engineering team.

            Target repository:
            {repo}

            Planned change:
            {change_description}

            Use only retrieved GitHub context from the target repository.

            Return the report in this exact structure:

            Summary:
            A concise 2-4 sentence explanation of the likely risk.

            Historical Context:
            - Cite relevant issues, pull requests, or comments from the target repository only ({repo}).
            - Include only GitHub URLs that start with https://github.com/{repo}/.

            Risk Areas:
            - List concrete parts of the planned change that could break behavior.

            Review Checklist:
            - List practical checks a reviewer or implementer should perform.

            Rules:
            - Do not invent history.
            - Do not call tools.
            - Do not output tool-call placeholders such as [TOOL_CALLS].
            - If the available target-repository context is weak, say so.
            - Every historical claim must include a target-repository GitHub URL.
            - Include source URLs inline with the historical claim only.
            - Ignore external dependency changelog links unless a target-repository issue or PR discusses why they matter.
            - Prefer concise, actionable guidance.
            """.strip()
