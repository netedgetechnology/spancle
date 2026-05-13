#!/usr/bin/env bash
# =============================================================================
# SPANCLE SPORTS OS — Database Migration Commands
# scripts/db-migrate.sh
#
# Runs TypeORM migrations for every service database in dependency order.
# Each service owns its own PostgreSQL database and migration table.
#
# Usage:
#   ./scripts/db-migrate.sh [COMMAND] [SERVICE]
#
# Commands:
#   run      (default) — apply all pending migrations
#   revert              — revert the last migration per service
#   show                — show migration status (pending/applied)
#   sync                — schema:sync — INITIAL SETUP ONLY, not for prod updates
#
# Service filter (optional):
#   identity | booking | finance | saas-platform | reporting |
#   tournament | academy | communication | all (default)
#
# Examples:
#   ./scripts/db-migrate.sh                           # run all
#   ./scripts/db-migrate.sh run identity              # run identity only
#   ./scripts/db-migrate.sh show                      # show all status
#   ./scripts/db-migrate.sh sync identity             # initial schema sync
#
# Environment:
#   Each service reads DATABASE_URL from:
#     /etc/spancle/.env.<service>   (production)
#     .env                          (local fallback)
# =============================================================================

set -euo pipefail

COMMAND="${1:-run}"
FILTER="${2:-all}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[migrate]${NC} $*"; }
warn() { echo -e "${YELLOW}[migrate]${NC} $*"; }
err()  { echo -e "${RED}[migrate]${NC} $*" >&2; exit 1; }
step() { echo -e "${CYAN}[migrate]${NC} ── $* ────────────────────────"; }

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_DIR="/etc/spancle"

# ── Validate command ──────────────────────────────────────────────────────────

case "$COMMAND" in
  run|revert|show|sync) ;;
  *) err "Unknown command: $COMMAND. Use: run | revert | show | sync" ;;
esac

if [[ "$COMMAND" == "sync" ]]; then
  warn "schema:sync will DROP and recreate tables to match entities."
  warn "This is destructive. Only use on a fresh database."
  read -rp "Continue? [y/N] " confirm
  [[ "${confirm,,}" == "y" ]] || { log "Aborted."; exit 0; }
fi

# ── Service definitions (name → relative path → env file) ──────────────────

declare -A SVC_PATH=(
  [identity]="services/identity-service"
  [saas-platform]="services/saas-platform-service"
  [booking]="services/booking-service"
  [finance]="services/finance-service"
  [tournament]="services/tournament-service"
  [academy]="services/academy-service"
  [communication]="services/communication-service"
  [reporting]="services/reporting-service"
)

# Execution order matters for FK dependencies:
#   identity → saas-platform → booking → finance → others
ORDERED_SERVICES=(
  identity
  saas-platform
  booking
  finance
  tournament
  academy
  communication
  reporting
)

# ── Resolve which services to run ────────────────────────────────────────────

if [[ "$FILTER" == "all" ]]; then
  RUN_SERVICES=("${ORDERED_SERVICES[@]}")
else
  # Validate filter
  [[ -v "SVC_PATH[$FILTER]" ]] || err "Unknown service: $FILTER. Valid: ${!SVC_PATH[*]}"
  RUN_SERVICES=("$FILTER")
fi

# ── Run migrations ────────────────────────────────────────────────────────────

FAILED=()
SUCCEEDED=()

for SVC in "${RUN_SERVICES[@]}"; do
  SVC_DIR="$ROOT_DIR/${SVC_PATH[$SVC]}"
  DIST_ORM="$SVC_DIR/dist/ormconfig.js"

  step "$SVC"

  # Load environment — check /etc/spancle first, fall back to repo root .env
  ENV_FILE="$ENV_DIR/.env.$SVC"
  if [[ -f "$ENV_FILE" ]]; then
    log "  Loading env from $ENV_FILE"
    set -a; source "$ENV_FILE"; set +a
  elif [[ -f "$ROOT_DIR/.env" ]]; then
    warn "  $ENV_FILE not found — using $ROOT_DIR/.env"
    set -a; source "$ROOT_DIR/.env"; set +a
  else
    err "  No env file found for $SVC. Create $ENV_FILE."
  fi

  # Verify DATABASE_URL is set
  [[ -n "${DATABASE_URL:-}" ]] || err "  DATABASE_URL is not set for $SVC"

  # Verify compiled ormconfig exists
  if [[ ! -f "$DIST_ORM" ]]; then
    warn "  $DIST_ORM not found — service not built? Skipping."
    FAILED+=("$SVC (not built)")
    continue
  fi

  TYPEORM_BIN="$SVC_DIR/node_modules/.bin/typeorm"
  [[ -f "$TYPEORM_BIN" ]] || TYPEORM_BIN="$(which typeorm 2>/dev/null)" || \
    err "  typeorm CLI not found in $SVC_DIR/node_modules/.bin/ or PATH"

  case "$COMMAND" in
    run)
      log "  Running pending migrations for $SVC..."
      (cd "$SVC_DIR" && "$TYPEORM_BIN" migration:run -d dist/ormconfig.js) && {
        log "  ✅ $SVC — migrations applied"
        SUCCEEDED+=("$SVC")
      } || {
        warn "  ❌ $SVC — migration failed"
        FAILED+=("$SVC")
      }
      ;;
    revert)
      log "  Reverting last migration for $SVC..."
      (cd "$SVC_DIR" && "$TYPEORM_BIN" migration:revert -d dist/ormconfig.js) && {
        log "  ✅ $SVC — last migration reverted"
        SUCCEEDED+=("$SVC")
      } || {
        warn "  ❌ $SVC — revert failed"
        FAILED+=("$SVC")
      }
      ;;
    show)
      log "  Migration status for $SVC:"
      (cd "$SVC_DIR" && "$TYPEORM_BIN" migration:show -d dist/ormconfig.js) || true
      ;;
    sync)
      log "  Running schema:sync for $SVC (DESTRUCTIVE)..."
      (cd "$SVC_DIR" && "$TYPEORM_BIN" schema:sync -d dist/ormconfig.js) && {
        log "  ✅ $SVC — schema synced"
        SUCCEEDED+=("$SVC")
      } || {
        warn "  ❌ $SVC — sync failed"
        FAILED+=("$SVC")
      }
      ;;
  esac

  echo ""
done

# ── Summary ───────────────────────────────────────────────────────────────────

if [[ "$COMMAND" != "show" ]]; then
  echo ""
  echo -e "${CYAN}─── Migration Summary ───────────────────────────────${NC}"
  echo -e "  Command:   ${COMMAND}"
  echo -e "  Succeeded: ${#SUCCEEDED[@]} service(s)"
  [[ ${#SUCCEEDED[@]} -gt 0 ]] && echo "    ✅ ${SUCCEEDED[*]}"
  echo -e "  Failed:    ${#FAILED[@]} service(s)"
  [[ ${#FAILED[@]} -gt 0 ]] && echo "    ❌ ${FAILED[*]}"
  echo -e "${CYAN}─────────────────────────────────────────────────────${NC}"

  [[ ${#FAILED[@]} -eq 0 ]] || exit 1
fi
