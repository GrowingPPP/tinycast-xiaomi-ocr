#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUNDLE_ID="${TINYCAST_BUNDLE_ID:-com.tinycast.app}"
DEST="${TINYCAST_EXTENSIONS_DIR:-$HOME/Library/Application Support/$BUNDLE_ID/extensions}/xiaomi-ocr-local"

if [[ ! -f "$ROOT/build/ocr-screen.js" ]]; then
  echo "缺少构建产物，先运行 npm run build。" >&2
  exit 1
fi

mkdir -p "$DEST/assets"
cp "$ROOT/build/package.json" "$DEST/package.json"
cp "$ROOT/build/ocr-screen.js" "$DEST/ocr-screen.js"
cp "$ROOT/build/assets/command-icon.png" "$DEST/assets/command-icon.png"

echo "已安装到 $DEST"
echo "打开 Tinycast → Settings → Extensions 启用 Xiaomi OCR Local，再到 Settings → Shortcuts 绑定热键。"
