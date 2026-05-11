#!/usr/bin/env bash
set -euo pipefail

echo "[DVC] Pushing model artifacts..."
python -m dvc push
echo "[DVC] Push complete."
