"""Exposing Devbase as a FastAPI REST API."""

from typing import Any

import httpx
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import load_settings
from scripts.n8n_setup_status import read_n8n_setup_status
from data.promote_storage import promote_staging_to_live
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


""" Defining request and response bodies for specific actions """
class RiskRequest(BaseModel):
    repo: str = Field(default="mockoon/mockoon", min_length=1)
    change_description: str = Field(min_length=1)


class RiskResponse(BaseModel):
    report: str | None = None
    sources: list[str] = []
    blocked: bool
    block_reason: str | None = None


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


# Test health of REST API
@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "devbase",
    }


@app.get("/n8n-setup", response_model=N8nSetupResponse)
async def n8n_setup() -> N8nSetupResponse:
    settings = load_settings(require_secrets=False)
    status = read_n8n_setup_status(settings.n8n_setup_status_path)

    return N8nSetupResponse(
        imported=status.imported,
        workflow_name=status.workflow_name,
        imported_at=status.imported_at,
    )


# Invoke LightRAG workflow to process user's query for a given repo
@app.post("/change-risk", response_model=RiskResponse)
async def change_risk(request: RiskRequest) -> RiskResponse:
    result = await risk_workflow.ainvoke(
        {
            "repo": request.repo,
            "user_description": request.change_description,
        }
    )

    return RiskResponse(
        report=result.get("report"),
        sources=result.get("sources", []),
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

        return QualityGateTriggerResponse(
            triggered=True,
            webhook_url=settings.n8n_quality_gate_webhook_url,
            status=payload.get("status"),
            message=payload.get("message"),
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
