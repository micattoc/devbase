"""Prompt construction for change-risk reports."""


def build_change_risk_prompt(repo: str, change_description: str) -> str:
    """Build the user-facing LightRAG query for a planned code change."""

    return f"""
            You are generating a change-risk report for a software engineering team.

            Target repository:
            {repo}

            Planned change:
            {change_description}

            Use only retrieved GitHub issue and pull request context from the target repository.
            Ignore README, Code of Conduct, contributing guides, documentation pages, repository files, and repository root pages.

            Return the report in this exact structure:

            Summary:
            A concise 2-4 sentence explanation of the concrete risk. Do not restate the planned change.

            Historical Context:
            - Cite relevant issues, pull requests, or comments from the target repository only ({repo}).
            - Include only GitHub issue or pull request URLs that start with https://github.com/{repo}/issues/ or https://github.com/{repo}/pull/.
            - If many relevant records exist, prefer the most recently updated records.
            - Name the exact record number in prose, such as "Pull Request #2230" or "Issue #2186".
            - Do not write generic phrases like "a pull request", "an issue", "a related issue", or "a relevant PR" without the exact number.
            - When referring to comments, describe them as "a comment in Pull Request #123" or "a comment in Issue #123".
            - Never mention raw record labels like PR_REVIEW_COMMENT, ISSUE_COMMENT, PULL_REQUEST, or internal comment IDs.

            Risk Areas:
            - List concrete parts of the planned change that could break behavior.

            Review Checklist:
            - List practical checks a reviewer or implementer should perform.

            Rules:
            - Use at most the 10 most recently updated pull request sources and the 10 most recently updated issue sources.
            - Do not invent history.
            - Do not call tools.
            - Do not output tool-call placeholders such as [TOOL_CALLS].
            - Do not cite or summarize README, Code of Conduct, contributing guide, documentation, or repository file content.
            - If the available target-repository context is weak, say so.
            - Every historical claim must include a target-repository issue or pull request URL.
            - Include issue or pull request URLs inline with the historical claim only.
            - Do not say "this may be relevant", "which could be relevant", "this is useful", or similar relevance filler.
            - Do not explain why the retrieved record is relevant to the user's planned change; directly state the observed risk or lesson.
            - Do not repeat or paraphrase the user's planned change except where needed for a concrete checklist item.
            - Do not expose raw source record IDs or bracketed source labels in the report text.
            - Ignore external dependency changelog links unless a target-repository issue or PR discusses why they matter.
            - Prefer concise, actionable guidance.
            """.strip()
