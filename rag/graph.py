"""LightRAG setup.

This module owns the RAG instance, HuggingFace model adapters, and query helpers.
"""

from __future__ import annotations

import os
from typing import Any

import numpy as np
from huggingface_hub import InferenceClient
from lightrag import LightRAG, QueryParam
from lightrag.kg.shared_storage import initialize_pipeline_status
from lightrag.utils import EmbeddingFunc

from config import Settings, load_settings

EMBEDDING_DIM = 384
MAX_TOKEN_SIZE = 8192

def _client(settings: Settings) -> InferenceClient:
    return InferenceClient(
        provider=settings.hf_provider,
        api_key=settings.hf_token,
        timeout=60,
    )


# Generate text through HuggingFace's chat completion API
async def llm_model_func(
    prompt: str,
    system_prompt: str | None = None,
    history_messages: list[dict[str, str]] | None = None,
    **kwargs: Any,
) -> str:

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


# Embed text batches via HuggingFace feature extraction
async def embedding_func(texts: list[str]) -> np.ndarray:

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


# Initialise LightRAG instance
async def create_rag(settings: Settings | None = None) -> LightRAG:

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


# Insert document to LightRAG store
async def insert_text(text: str) -> None:

    rag = await create_rag()

    try:
        await rag.ainsert(text)
    finally:
        await rag.finalize_storages()

