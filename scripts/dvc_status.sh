#!/usr/bin/env bash
set -euo pipefail

echo "[DVC] Repository status"
python -m dvc status
