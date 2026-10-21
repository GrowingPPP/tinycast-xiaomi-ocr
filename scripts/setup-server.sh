#!/usr/bin/env bash
# Clone Xiaomi-OCR-0, prepare its Python environment, and install a launchd
# service for the demo server.
#
# Usage:
#   bash scripts/setup-server.sh [--dir PATH] [--port PORT] [--no-launchd]
#
# Environment:
#   XIAOMI_OCR_MODEL  Model tag used by the plist (default: longwayxu/xiaomi-ocr-0:bf16)
#   XIAOMI_OCR_HOME   Checkout directory (default: ~/Developer/Xiaomi-OCR-0)
set -euo pipefail

REPO_URL="https://github.com/SeerRay-Lab/Xiaomi-OCR-0.git"
MODEL="${XIAOMI_OCR_MODEL:-longwayxu/xiaomi-ocr-0:bf16}"
TARGET="${XIAOMI_OCR_HOME:-$HOME/Developer/Xiaomi-OCR-0}"
PORT=8787
INSTALL_LAUNCHD=1
LABEL="dev.local.xiaomi-ocr-demo"

usage() {
  sed -n '2,12p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

say() { printf '%s\n' "$*"; }
fail() { printf 'error: %s\n' "$*" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir) [[ $# -ge 2 ]] || fail "--dir needs a path"; TARGET="$2"; shift 2 ;;
    --port) [[ $# -ge 2 ]] || fail "--port needs a number"; PORT="$2"; shift 2 ;;
    --no-launchd) INSTALL_LAUNCHD=0; shift ;;
    -h|--help) usage; exit 0 ;;
    *) fail "unknown argument: $1" ;;
  esac
done

[[ "$(uname -s)" == "Darwin" ]] || fail "this script targets macOS"
[[ "$PORT" =~ ^[0-9]+$ ]] && (( PORT >= 1 && PORT <= 65535 )) || fail "--port must be 1-65535"

find_python() {
  local candidate
  for candidate in python3.13 python3.12 python3.11 python3.10 python3; do
    if command -v "$candidate" >/dev/null 2>&1 &&
      "$candidate" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' >/dev/null 2>&1; then
      command -v "$candidate"
      return 0
    fi
  done
  return 1
}

xml_escape() {
  printf '%s' "$1" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g'
}

PYTHON="$(find_python)" || fail "Python 3.10+ not found. Install it with Homebrew, e.g. brew install python@3.13"

if [[ -d "$TARGET/.git" ]]; then
  if ! git -C "$TARGET" remote get-url origin 2>/dev/null | grep -q "Xiaomi-OCR-0"; then
    fail "$TARGET is a git checkout of a different repository"
  fi
  say "Using existing checkout at $TARGET"
elif [[ -e "$TARGET" ]]; then
  fail "$TARGET exists and is not a git checkout"
else
  say "Cloning $REPO_URL into $TARGET"
  mkdir -p "$(dirname "$TARGET")"
  git clone --depth 1 "$REPO_URL" "$TARGET"
fi

if [[ ! -x "$TARGET/.venv/bin/python" ]]; then
  say "Creating virtual environment with $PYTHON"
  "$PYTHON" -m venv "$TARGET/.venv"
fi

say "Installing Python dependencies"
"$TARGET/.venv/bin/python" -m pip install --quiet --upgrade pip
"$TARGET/.venv/bin/python" -m pip install --quiet -r "$TARGET/requirements.txt"

if ! curl -fsS --max-time 2 "http://127.0.0.1:11434/api/version" >/dev/null 2>&1; then
  say "Warning: Ollama is not reachable. Run scripts/setup-ollama.sh first."
elif ! ollama list 2>/dev/null | awk 'NR > 1 { print $1 }' | grep -Fxq "$MODEL"; then
  say "Warning: model $MODEL is not installed. Run scripts/setup-ollama.sh first."
fi

if [[ "$INSTALL_LAUNCHD" -eq 0 ]]; then
  say ""
  say "Start the server manually:"
  say "  cd \"$TARGET\" && XIAOMI_OCR_BACKEND=ollama XIAOMI_OCR_MODEL=$MODEL XIAOMI_OCR_LOCAL_URL=http://127.0.0.1:11434/v1 .venv/bin/python demo/server.py --port $PORT"
  exit 0
fi

PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Library/Logs/xiaomi-ocr-demo.log"
mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"

say "Writing $PLIST"
cat >"$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$(xml_escape "$TARGET/.venv/bin/python")</string>
    <string>$(xml_escape "$TARGET/demo/server.py")</string>
    <string>--port</string>
    <string>$PORT</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$(xml_escape "$TARGET")</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>XIAOMI_OCR_BACKEND</key>
    <string>ollama</string>
    <key>XIAOMI_OCR_MODEL</key>
    <string>$(xml_escape "$MODEL")</string>
    <key>XIAOMI_OCR_LOCAL_URL</key>
    <string>http://127.0.0.1:11434/v1</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$(xml_escape "$LOG")</string>
  <key>StandardErrorPath</key>
  <string>$(xml_escape "$LOG")</string>
</dict>
</plist>
PLIST

launchctl bootout "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || true
sleep 1

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  OWNER_PID="$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t | head -1)"
  fail "port $PORT is already in use by PID $OWNER_PID"
fi

launchctl bootstrap "gui/$(id -u)" "$PLIST"

say "Waiting for http://127.0.0.1:$PORT/api/health"
READY=0
for _ in $(seq 1 30); do
  if curl -fsS --max-time 2 "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
done

if [[ "$READY" -ne 1 ]]; then
  fail "server did not respond. Check $LOG."
fi

say "Server is running at http://127.0.0.1:$PORT"
say "Logs: $LOG"
say "Stop with: launchctl bootout gui/$(id -u)/$LABEL"
