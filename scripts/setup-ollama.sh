#!/usr/bin/env bash
# Install Ollama, start it, and download the Xiaomi-OCR-0 model.
#
# Usage:
#   bash scripts/setup-ollama.sh
#
# Environment:
#   XIAOMI_OCR_MODEL  Ollama model tag (default: longwayxu/xiaomi-ocr-0:bf16)
#   OLLAMA_URL        Server address to probe (default: http://127.0.0.1:11434)
set -euo pipefail

MODEL="${XIAOMI_OCR_MODEL:-longwayxu/xiaomi-ocr-0:bf16}"
OLLAMA_URL="${OLLAMA_URL:-http://127.0.0.1:11434}"

say() { printf '%s\n' "$*"; }

probe() { curl -fsS --max-time 2 "$OLLAMA_URL/api/version" >/dev/null 2>&1; }

if [[ "$(uname -s)" != "Darwin" ]]; then
  say "This script targets macOS. Install Ollama manually on other systems."
  exit 1
fi

if ! command -v ollama >/dev/null 2>&1; then
  if ! command -v brew >/dev/null 2>&1; then
    say "Ollama is not installed and Homebrew was not found."
    say "Install Homebrew (https://brew.sh) or Ollama (https://ollama.com/download), then rerun."
    exit 1
  fi
  say "Installing Ollama…"
  brew install ollama
fi

if ! probe; then
  say "Starting Ollama…"
  if command -v brew >/dev/null 2>&1 && brew list ollama >/dev/null 2>&1; then
    brew services start ollama >/dev/null
  else
    nohup ollama serve >/dev/null 2>&1 &
  fi
  for _ in $(seq 1 30); do
    probe && break
    sleep 1
  done
fi

if ! probe; then
  say "Ollama did not start. Run 'ollama serve' in another terminal and rerun."
  exit 1
fi

if ollama list | awk 'NR > 1 { print $1 }' | grep -Fxq "$MODEL"; then
  say "Model $MODEL is already installed."
else
  say "Downloading $MODEL (about 1.8 GB, first run only)…"
  ollama pull "$MODEL"
fi

if ! ollama list | awk 'NR > 1 { print $1 }' | grep -Fxq "$MODEL"; then
  say "Model $MODEL is missing after the pull. Check 'ollama list'."
  exit 1
fi

say "Ollama is running and $MODEL is ready."
say "Next: start the demo server, see docs/server-setup.md."
