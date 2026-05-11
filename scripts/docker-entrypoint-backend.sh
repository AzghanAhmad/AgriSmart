#!/usr/bin/env sh
set -e

echo "[backend] startup"

exec python -m Backend.app
