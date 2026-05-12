#!/usr/bin/env sh
set -e

echo "[chatbot-service] startup"

# Avoid Chroma/posthog telemetry version skew and noisy outbound calls in containers
export ANONYMIZED_TELEMETRY="${ANONYMIZED_TELEMETRY:-false}"

# Persist HuggingFace/SentenceTransformers caches on the mounted /models volume
export HF_HOME="${HF_HOME:-/models/hf-home}"
export TRANSFORMERS_CACHE="${TRANSFORMERS_CACHE:-/models/hf-cache}"
export SENTENCE_TRANSFORMERS_HOME="${SENTENCE_TRANSFORMERS_HOME:-/models/st-cache}"
mkdir -p "$HF_HOME" "$TRANSFORMERS_CACHE" "$SENTENCE_TRANSFORMERS_HOME"

exec python -m chatbot_service.app
