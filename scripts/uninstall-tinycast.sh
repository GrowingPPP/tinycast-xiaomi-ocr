#!/usr/bin/env bash
set -euo pipefail

BUNDLE_ID="${TINYCAST_BUNDLE_ID:-com.tinycast.app}"
DEST="${TINYCAST_EXTENSIONS_DIR:-$HOME/Library/Application Support/$BUNDLE_ID/extensions}/xiaomi-ocr-local"

if [[ -d "$DEST" ]]; then
  rm -rf "$DEST"
  echo "已移除 $DEST"
else
  echo "未找到 $DEST"
fi
