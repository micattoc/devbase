"""Exposing Devbase as a FastAPI REST API."""

import re
from typing import Any

import httpx
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import load_settings
from data.github_fetcher import fetch_github_source_detail, fetch_repo_records
from data.ingest import ingest_records, load_source_index, source_index_path
from data.rag_storage_status import read_rag_storage_status
from scripts.n8n_setup_status import read_n8n_setup_status
from data.promote_storage import promote_staging_to_live
from scripts.golden_set_status import read_golden_set_status
from eval.local_eval import run_eval
from workflows.graph import risk_workflow


app = FastAPI(title="Devbase", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


GITHUB_SOURCE_PATTERN = re.compile(
    r"https://github\.com/(?P<repo>[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)/(?:issues|pull)/(?P<number>\d+)"
)


""" Defining request and response bodies for specific actions """
class RiskRequest(BaseModel):
    repo: str = Field(default="mockoon/mockoon", min_length=1)
    change_description: str = Field(min_length=1)


class SourceDetail(BaseModel):
    title: str
    kind: str
    state: str
    url: str


class RiskResponse(BaseModel):
    report: str | None = None
    sources: list[str] = Field(default_factory=list)
    source_details: list[SourceDetail] = Field(default_factory=list)
    blocked: bool
    block_reason: str | None = None


class GitHubIngestRequest(BaseModel):
    repo: str = Field(default="mockoon/mockoon", min_length=1)
    pr_limit: int = Field(default=10, ge=0, le=20)
    issue_limit: int = Field(default=10, ge=0, le=20)


class GitHubIngestResponse(BaseModel):
    repo: str
    pr_limit: int
    issue_limit: int
    fetched: int
    inserted: int
    skipped: int
    inserted_prs: int
    inserted_issues: int


class PromotionResponse(BaseModel):
    promoted: bool
    live_path: str
    staging_path: str
    backup_path: str
    message: str

class QualityGateTriggerResponse(BaseModel):
    triggered: bool
    webhook_url: str
    status: str
    message: str


class N8nSetupResponse(BaseModel):
    imported: bool
    workflow_name: str | None = None
    imported_at: str | None = None


class RagStorageStatusResponse(BaseModel):
    exists: bool
    modified_at: str | None = None
    display_date: str | None = None
    days_ago: int | None = None


class GoldenSetStatusResponse(BaseModel):
    established: bool
    path: str
    case_count: int


def build_source_detail(url: str, source_index: dict[str, dict[str, str]]) -> SourceDetail:
    """Resolve cited GitHub source metadata for the UI."""

    indexed_source = source_index.get(url)

    indexed_title = indexed_source.get("title", "") if indexed_source else ""

    if indexed_source and not indexed_title.startswith(("Comment on ", "Review comment on ")):
        return SourceDetail(
            title=indexed_title,
            kind=indexed_source.get("kind", "pull_request" if "/pull/" in url else "issue"),
            state=indexed_source.get("state", "open"),
            url=url,
        )

    match = GITHUB_SOURCE_PATTERN.search(url)

    if match:
        kind = "pull_request" if "/pull/" in url else "issue"

        try:
            detail = fetch_github_source_detail(
                repo=match.group("repo"),
                kind=kind,
                number=match.group("number"),
            )

            return SourceDetail(
                title=detail["title"],
                kind=detail["kind"],
                state=detail["state"],
                url=url,
            )
        except requests.RequestException:
            pass

    return SourceDetail(
        title="",
        kind="pull_request" if "/pull/" in url else "issue",
        state="open",
        url=url,
    )


# Test health of REST API
@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "devbase",
    }


# Check if n8n workflow has been previously imported
@app.get("/n8n-setup", response_model=N8nSetupResponse)
async def n8n_setup() -> N8nSetupResponse:
    settings = load_settings(require_secrets=False)
    status = read_n8n_setup_status(settings.n8n_setup_status_path)

    return N8nSetupResponse(
        imported=status.imported,
        workflow_name=status.workflow_name,
        imported_at=status.imported_at,
    )


# Determine the last time RAG was updated
@app.get("/rag-storage-status", response_model=RagStorageStatusResponse)
async def rag_storage_status() -> RagStorageStatusResponse:
    settings = load_settings(require_secrets=False)
    status = read_rag_storage_status(settings.lightrag_live_dir)

    return RagStorageStatusResponse(
        exists=status.exists,
        modified_at=status.modified_at,
        display_date=status.display_date,
        days_ago=status.days_ago,
    )


# Check if a golden set is available for the eval to run
@app.get("/golden-set-status", response_model=GoldenSetStatusResponse)
async def golden_set_status() -> GoldenSetStatusResponse:
    status = read_golden_set_status()

    return GoldenSetStatusResponse(
        established=status.established,
        path=status.path,
        case_count=status.case_count,
    )


# Fetch GitHub data and ingest it into RAG staging
@app.post("/ingest-github", response_model=GitHubIngestResponse)
async def ingest_github(request: GitHubIngestRequest) -> GitHubIngestResponse:
    settings = load_settings(require_secrets=False)

    try:
        records = fetch_repo_records(
            repo=request.repo,
            pr_limit=request.pr_limit,
            issue_limit=request.issue_limit,
        )
        result = await ingest_records(records, settings.ingestion_manifest_path)

        return GitHubIngestResponse(
            repo=request.repo,
            pr_limit=request.pr_limit,
            issue_limit=request.issue_limit,
            fetched=result["fetched"],
            inserted=result["inserted"],
            skipped=result["skipped"],
            inserted_prs=result["inserted_prs"],
            inserted_issues=result["inserted_issues"],
        )
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=502,
            detail=f"GitHub fetch failed: {str(exc)}",
        ) from exc


# Invoke LightRAG workflow to process user's query for a given repo
@app.post("/change-risk", response_model=RiskResponse)
async def change_risk(request: RiskRequest) -> RiskResponse:
    settings = load_settings(require_secrets=False)
    result = await risk_workflow.ainvoke(
        {
            "repo": request.repo,
            "user_description": request.change_description,
        }
    )

    source_urls = result.get("sources", [])
    source_index = load_source_index(source_index_path(settings.ingestion_manifest_path))
    source_details = [build_source_detail(url, source_index) for url in source_urls]

    return RiskResponse(
        report=result.get("report"),
        sources=source_urls,
        source_details=source_details,
        blocked=result.get("is_blocked", False),
        block_reason=result.get("block_reason"),
    )


# Invoke eval on current golden set
@app.post("/run-eval")
async def run_eval_endpoint() -> dict[str, Any]:
    try:
        return await run_eval()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# Promote staging storage to live storage
@app.post("/promote-staging", response_model=PromotionResponse)
async def promote_staging() -> PromotionResponse:
    result = promote_staging_to_live()

    if not result.promoted:
        raise HTTPException(status_code=400, detail=result.message)

    return PromotionResponse(
        promoted=result.promoted,
        live_path=result.live_path,
        staging_path=result.staging_path,
        backup_path=result.backup_path,
        message=result.message,
    )


# Trigger the n8n quality gate workflow
@app.post("/trigger-quality-gate", response_model=QualityGateTriggerResponse)
async def trigger_quality_gate() -> QualityGateTriggerResponse:
    settings = load_settings(require_secrets=False)

    try:
        async with httpx.AsyncClient(timeout=300) as client:
            response = await client.post(
                settings.n8n_quality_gate_webhook_url,
                json={"source": "devbase-api"},
            )
        
        if response.status_code >= 400:
            raise HTTPException(
                status_code=502,
                detail=f"n8n webhook returned HTTP {response.status_code}: {response.text}",
            )
        
        payload = response.json()

        if isinstance(payload, list):
            payload = payload[0] if payload else {}

        return QualityGateTriggerResponse(
            triggered=True,
            webhook_url=settings.n8n_quality_gate_webhook_url,
            status=str(payload.get("status", "unknown")),
            message=str(payload.get("message", "")),
        )
    
    except HTTPException:
        raise

    except requests.RequestException as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Failed to trigger n8n quality gate: {str(exc)}",
        ) from exc
    
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected quality gate trigger failure: {type(exc).__name__}: {exc}",
        ) from exc
