#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICES_DIR="$ROOT_DIR/services"

FORCE=0
if [[ "${1:-}" == "--force" || "${1:-}" == "-f" ]]; then
  FORCE=1
fi

for dir in "$SERVICES_DIR"/*/; do
  name="$(basename "$dir")"
  if [ "$name" = "template" ]; then
    continue
  fi
  if [ -f "$dir/docker-compose.yml" ]; then
    if [ "$FORCE" -eq 1 ]; then
      (cd "$dir" && docker compose down --remove-orphans --timeout 0)
    else
      (cd "$dir" && docker compose down)
    fi
  fi
done
