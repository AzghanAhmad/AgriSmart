#!/usr/bin/env sh
set -e

echo "[yolo-service] startup"

MODEL_DIR="${MODEL_DIR:-/models}"
mkdir -p "$MODEL_DIR/wheat" "$MODEL_DIR/rice" "$MODEL_DIR/cotton"

# Writable Ultralytics settings (avoids /root/.config warnings in read-only images)
export YOLO_CONFIG_DIR="${YOLO_CONFIG_DIR:-/models/ultralytics-settings}"
# Ultralytics writes under $YOLO_CONFIG_DIR/Ultralytics; ensure it exists and is writable.
mkdir -p "$YOLO_CONFIG_DIR/Ultralytics"

_download_if_missing() {
  crop="$1"
  url="$2"
  dst="$MODEL_DIR/$crop/best.pt"

  if [ -f "$dst" ]; then
    echo "[yolo-service] model present: $dst"
    return 0
  fi

  if [ -z "$url" ]; then
    echo "[yolo-service] model missing: $dst (no download URL configured)"
    return 0
  fi

  echo "[yolo-service] downloading $crop model -> $dst"
  curl -fL --retry 3 --retry-delay 2 -o "$dst" "$url"
}

# Provide presigned S3 URLs or HF release asset URLs via env
_download_if_missing "wheat"  "${MODEL_DOWNLOAD_URL_WHEAT:-}"
_download_if_missing "rice"   "${MODEL_DOWNLOAD_URL_RICE:-}"
_download_if_missing "cotton" "${MODEL_DOWNLOAD_URL_COTTON:-}"

exec python -m yolo_service.app
