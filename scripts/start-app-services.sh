#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICES_DIR="$ROOT_DIR/services"

if [ -f "$ROOT_DIR/.env" ]; then
  export $(grep -v '^#' "$ROOT_DIR/.env" | xargs)
fi

: "${TRAEFIK_PUBLIC_NETWORK:=web}"

if ! docker network inspect "$TRAEFIK_PUBLIC_NETWORK" >/dev/null 2>&1; then
  docker network create "$TRAEFIK_PUBLIC_NETWORK"
fi

for dir in "$SERVICES_DIR"/*/; do
  name="$(basename "$dir")"
  if [ "$name" = "template" ]; then
    continue
  fi
  if [ -f "$dir/docker-compose.yml" ]; then
    (cd "$dir" && docker compose up -d)
  fi
done
