"""Validated embeddings; original rule text remains the authoritative source."""

import math

from . import config


def embed_texts(texts):
    # Reuse the API's bounded provider client without importing it during startup.
    from .answers import provider_client

    # A UTF-8 byte bound is also a conservative BPE-token bound, including non-Latin rules.
    texts = [text.encode("utf-8")[:7500].decode("utf-8", errors="ignore") for text in texts]
    if not texts or any(not text.strip() for text in texts):
        raise ValueError("Empty embedding input")
    with provider_client() as client:
        result = client.embeddings.create(
            model=config.OPENAI_EMBEDDING_MODEL,
            input=texts,
            dimensions=config.EMBEDDING_DIMENSIONS,
            encoding_format="float",
        )
    vectors = [None] * len(texts)
    for item in result.data:
        vector = item.embedding
        if (
            item.index < 0
            or item.index >= len(texts)
            or vectors[item.index] is not None
            or len(vector) != config.EMBEDDING_DIMENSIONS
            or not all(math.isfinite(value) for value in vector)
            or not any(vector)
        ):
            raise ValueError("Invalid embedding response")
        vectors[item.index] = vector
    if any(vector is None for vector in vectors):
        raise ValueError("Missing embedding")
    return vectors
