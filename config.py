"""Centralized runtime configuration for Devbase.

Secrets are optional by default.
"""

from dataclasses import dataclass
from pathlib import Path
import os

from dotenv import load_dotenv


load_dotenv()


@dataclass(frozen=True)
class Settings:
    hf_token: str
    hf_llm_model: str
    hf_embedding_model: str
    hf_provider: str

    github_token: str
    github_repo_list: list[str]

    braintrust_api_key: str | None

    lightrag_working_dir: Path
    audit_log_path: Path
    ingestion_manifest_path: Path


def _required(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def _optional(name: str, default: str | None = None) -> str | None:
    return os.getenv(name, default)


def load_settings(require_secrets: bool = True) -> Settings:
    hf_token = _required("HF_TOKEN") if require_secrets else os.getenv("HF_TOKEN", "")

    repo_list = os.getenv("GITHUB_REPO_LIST", "vercel/next.js")
    repos = [repo.strip() for repo in repo_list.split(",") if repo.strip()]

    return Settings(
        hf_token=hf_token,
        hf_llm_model=os.getenv("HF_LLM_MODEL", "meta-llama/Llama-3.1-8B-Instruct"),
        hf_embedding_model=os.getenv("HF_EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"),
        hf_provider=os.getenv("HF_PROVIDER", "auto"),
        github_token=os.getenv("GITHUB_TOKEN", ""),
        github_repo_list=repos,
        braintrust_api_key=_optional("BRAINTRUST_API_KEY"),
        lightrag_working_dir=Path(os.getenv("LIGHTRAG_WORKING_DIR", ".storage")),
        audit_log_path=Path(os.getenv("AUDIT_LOG_PATH", "./audit.jsonl")),
        ingestion_manifest_path=Path(os.getenv("INGESTION_MANIFEST_PATH", "./ingestion_manifest.json")),
    )


settings = load_settings(require_secrets=False)