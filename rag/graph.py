"""LightRAG setup.

This module owns the RAG instance, HuggingFace model adapters, and query helpers.
"""

import os
from typing import Any

import logging

import numpy as np
from huggingface_hub import InferenceClient
from lightrag import LightRAG, QueryParam
from lightrag.kg.shared_storage import initialize_pipeline_status
from lightrag.utils import EmbeddingFunc

from config import Settings, load_settings
from workflow.risk_prompt import build_change_risk_prompt

logging.getLogger("lightrag").setLevel(logging.ERROR)
logging.getLogger("nano-vectordb").setLevel(logging.ERROR)

EMBEDDING_DIM = 384
MAX_TOKEN_SIZE = 8192

def _client(settings: Settings) -> InferenceClient:
    return InferenceClient(
        provider=settings.hf_provider,
        api_key=settings.hf_token,
        timeout=60,
    )


async def llm_model_func(
    prompt: str,
    system_prompt: str | None = None,
    history_messages: list[dict[str, str]] | None = None,
    **kwargs: Any,
) -> str:
    """Generate text through HuggingFace's chat completion API."""

    settings = load_settings(require_secrets=True)
    client = _client(settings)

    messages: list[dict[str, str]] = []

    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})

    if history_messages:
        messages.extend(history_messages)

    messages.append({"role": "user", "content": prompt})

    # LightRAG may pass provider-specific kwargs, so keep only what this client needs
    kwargs.pop("stream", None)

    response = client.chat_completion(
        model=settings.hf_llm_model,
        messages=messages,
        max_tokens=kwargs.get("max_tokens", 800),
        temperature=kwargs.get("temperature", 0),
    )

    content = response.choices[0].message.content
    if not content:
        raise RuntimeError("HuggingFace LLM returned an empty response.")

    return content


async def embedding_func(texts: list[str]) -> np.ndarray:
    """Embed text batches via HuggingFace feature extraction."""

    settings = load_settings(require_secrets=True)
    client = _client(settings)

    vectors = client.feature_extraction(
        texts,
        model=settings.hf_embedding_model,
    )

    array = np.asarray(vectors, dtype=np.float32)

    if array.ndim == 1:
        array = array.reshape(1, -1)

    return array


async def create_rag(settings: Settings | None = None) -> LightRAG:
    """Initialise LightRAG instance."""

    settings = settings or load_settings(require_secrets=True)
    os.makedirs(settings.lightrag_working_dir, exist_ok=True)

    rag = LightRAG(
        working_dir=str(settings.lightrag_working_dir),
        llm_model_func=llm_model_func,
        embedding_func=EmbeddingFunc(
            embedding_dim=EMBEDDING_DIM,
            max_token_size=MAX_TOKEN_SIZE,
            func=embedding_func,
        ),
    )

    await rag.initialize_storages()
    await initialize_pipeline_status()

    return rag


async def insert_text(text: str) -> None:
    """Insert document to LightRAG store."""
    rag = await create_rag()

    try:
        await rag.ainsert(text)
    finally:
        await rag.finalize_storages()


async def query_change_risk(repo: str, change_description: str, mode: str = "hybrid") -> str:
    """Query LightRAG for historical context related to a planned development change."""
    
    rag = await create_rag()

    try:
        question = build_change_risk_prompt(repo, change_description)

        return await rag.aquery(question, param=QueryParam(mode=mode))
    
    finally:
        await rag.finalize_storages()

