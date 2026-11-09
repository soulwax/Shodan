#!/usr/bin/env bash
# Start or restart the bot under oxmgr or pm2.
# Restarts wherever "Shodan" is already registered; otherwise starts it fresh,
# preferring oxmgr. Force a manager with PROCESS_MANAGER=oxmgr|pm2.
set -euo pipefail

NAME="${APP_NAME:-Shodan}"
ENTRY="dist/index.js"
cd "$(dirname "$0")/.."

has() { command -v "$1" >/dev/null 2>&1; }

ox_run() {
  if oxmgr status "$NAME" >/dev/null 2>&1; then
    echo "oxmgr: restarting $NAME"
    oxmgr restart "$NAME"
  else
    echo "oxmgr: starting $NAME"
    oxmgr start "node $ENTRY" --name "$NAME" --cwd "$PWD" --restart on-failure
  fi
}

pm2_run() {
  if pm2 describe "$NAME" >/dev/null 2>&1; then
    echo "pm2: restarting $NAME"
    pm2 restart "$NAME" --update-env
  else
    echo "pm2: starting $NAME"
    pm2 start "$ENTRY" --name "$NAME" --time
  fi
  pm2 save >/dev/null
}

case "${PROCESS_MANAGER:-auto}" in
  oxmgr) ox_run ;;
  pm2) pm2_run ;;
  auto)
    if has oxmgr && oxmgr status "$NAME" >/dev/null 2>&1; then ox_run
    elif has pm2 && pm2 describe "$NAME" >/dev/null 2>&1; then pm2_run
    elif has oxmgr; then ox_run
    elif has pm2; then pm2_run
    else
      echo "Neither oxmgr nor pm2 found in PATH" >&2
      exit 1
    fi
    ;;
  *)
    echo "Unknown PROCESS_MANAGER: $PROCESS_MANAGER (use oxmgr or pm2)" >&2
    exit 1
    ;;
esac
