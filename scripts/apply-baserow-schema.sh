#!/usr/bin/env bash
# Wrapper áp Baserow schema + seed (logic ở apply-baserow-schema.mjs, zero-dep Node ESM).
# Env: BASEROW_API_URL, BASEROW_EMAIL+BASEROW_PASSWORD (schema) hoặc BASEROW_API_TOKEN (seed).
# Xem scripts/apply-baserow-schema.mjs để biết đầy đủ env + cờ (--schema/--seed/--dry-run).
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$DIR/apply-baserow-schema.mjs" "$@"
