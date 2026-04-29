#!/bin/sh
# 개발용 엔트리포인트.
# - package-lock.json 해시를 node_modules 안에 캐시해 두고
#   바뀐 경우에만 `npm ci` 를 다시 돌립니다.
# - 변경이 없으면 곧바로 CMD 로 넘어갑니다.

set -e

LOCK_FILE="package-lock.json"
LOCK_HASH_FILE="/app/node_modules/.dev-lock-hash"

hash_of() {
  if [ -f "$1" ]; then
    sha1sum "$1" | awk '{print $1}'
  else
    echo "missing"
  fi
}

ensure_node_modules() {
  needs_install=0

  if [ ! -d node_modules ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
    needs_install=1
  fi

  current_lock=$(hash_of "$LOCK_FILE")
  previous_lock=$(cat "$LOCK_HASH_FILE" 2>/dev/null || echo "none")
  if [ "$current_lock" != "$previous_lock" ]; then
    needs_install=1
  fi

  if [ "$needs_install" = "1" ]; then
    echo "[frontend dev-entrypoint] installing dependencies..."
    if [ -f "$LOCK_FILE" ]; then
      npm ci --no-audit --no-fund
    else
      npm install --no-audit --no-fund
    fi
    mkdir -p "$(dirname "$LOCK_HASH_FILE")"
    echo "$current_lock" > "$LOCK_HASH_FILE"
  else
    echo "[frontend dev-entrypoint] dependencies up-to-date, skipping install"
  fi
}

ensure_node_modules

exec "$@"
