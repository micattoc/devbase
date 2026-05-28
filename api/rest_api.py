"""Exposing Devbase as a FastAPI REST API."""

from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from data.promote_storage import promote_staging_to_live
from eval.local_eval import run_eval
from workflow.graph import risk_workflow


app = FastAPI(title="Devbase", version="0.1.0")


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


# Test health of REST API
@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "devbase",
    }


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