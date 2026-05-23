#!/usr/bin/env bash
# Monthly Pokemon cache refresh
# ─────────────────────────────
# Run manually:   bash scripts/update-pokemon-cache.sh
# Cron (monthly, 3am on the 1st):
#   0 3 1 * * cd /absolute/path/to/dxtr && bash scripts/update-pokemon-cache.sh >> /var/log/pokemon-cache.log 2>&1
# Windows Task Scheduler: run "pnpm db:update-pokemon" monthly.
#
# Pokemon Champions note: this script caches all canonical Pokemon from PokeAPI.
# When Pokemon Champions (Switch 2) publishes a version-group filter via PokeAPI,
# update fetchAllNames() in seed-pokemon-cache.ts to use:
#   /api/v2/pokemon?version-group=champions&limit=10000
# ─────────────────────────────

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting Pokemon cache update…"
pnpm db:update-pokemon
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Cache update complete."
