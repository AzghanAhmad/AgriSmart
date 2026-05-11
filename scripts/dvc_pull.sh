#!/usr/bin/env bash
set -euo pipefail

echo "[DVC] Pulling model artifacts..."
python -m dvc pull
echo "[DVC] Pull complete."
