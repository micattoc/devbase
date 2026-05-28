"""Exposing Devbase as a FastAPI REST API."""

from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from eval.local_eval import run_eval
from workflow.graph import risk_workflow


app = FastAPI(title="Devbase", version="0.1.0")


class Request(BaseModel):
    repo: str = Field(default="mockoon/mockoon", min_length=1)
    change_description: str = Field(min_length=1)


class Response(BaseModel):
    report: str | None = None
    sources: list[str] = []
    blocked: bool
    block_reason: str | None = None


# Test health of REST API
@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "devbase",
    }


# Invoke LightRAG workflow to process user's query for a given repo
@app.post("/change-risk", response_model=Response)
async def change_risk(request: Request) -> Response:
    result = await risk_workflow.ainvoke(
        {
            "repo": request.repo,
            "user_description": request.change_description,
        }
    )

    return Response(
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