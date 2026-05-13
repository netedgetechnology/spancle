#!/usr/bin/env bash
# =============================================================================
# SPANCLE SPORTS OS — PM2 Restart / Reload Commands
# scripts/pm2-restart.sh
#
# Usage:
#   ./scripts/pm2-restart.sh [TARGET] [--hard]
#
# TARGET (optional):
#   all                   Reload all Spancle processes (default, zero-downtime)
#   services              Reload all 8 NestJS services only
#   apps                  Reload all 4 Next.js apps only
#   identity              Reload spancle-identity
#   saas-platform         Reload spancle-saas-platform
#   booking               Reload spancle-booking
#   finance               Reload spancle-finance
#   tournament            Reload spancle-tournament
#   academy               Reload spancle-academy
#   communication         Reload spancle-communication
#   reporting             Reload spancle-reporting
#   web-public            Reload spancle-web-public
#   web-admin             Reload spancle-web-admin
#   web-tenant            Reload spancle-web-tenant
#   web-booking           Reload spancle-web-booking
#
# Flags:
#   --hard     Force restart (kills process, then starts) instead of reload.
#              Use when: process is stuck, port conflict, after major config change.
#   --env ENV  Environment file to reload (default: production)
#
# Examples:
#   ./scripts/pm2-restart.sh                              # reload all
#   ./scripts/pm2-restart.sh identity                     # reload identity only
#   ./scripts/pm2-restart.sh finance --hard               # hard restart finance
#   ./scripts/pm2-restart.sh apps                         # reload all Next.js apps
#   ./scripts/pm2-restart.sh all --env staging            # reload using staging env
# =============================================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[pm2]${NC} $*"; }
warn() { echo -e "${YELLOW}[pm2]${NC} $*"; }
err()  { echo -e "${RED}[pm2]${NC} $*" >&2; exit 1; }

TARGET="${1:-all}"
HARD=false
ENV="production"

# Parse remaining args
shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --hard) HARD=true ;;
    --env)  ENV="$2"; shift ;;
    *) err "Unknown option: $1" ;;
  esac
  shift
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PM2_CONFIG="$ROOT_DIR/infrastructure/pm2/ecosystem.${ENV}.config.js"
[[ -f "$PM2_CONFIG" ]] || err "PM2 config not found: $PM2_CONFIG"

# ── Process name map ─────────────────────────────────────────────────────────
declare -A PM2_NAMES=(
  [identity]="spancle-identity"
  [saas-platform]="spancle-saas-platform"
  [booking]="spancle-booking"
  [finance]="spancle-finance"
  [tournament]="spancle-tournament"
  [academy]="spancle-academy"
  [communication]="spancle-communication"
  [reporting]="spancle-reporting"
  [web-public]="spancle-web-public"
  [web-admin]="spancle-web-admin"
  [web-tenant]="spancle-web-tenant"
  [web-booking]="spancle-web-booking"
)

NEST_PROCESSES=(identity saas-platform booking finance tournament academy communication reporting)
NEXT_PROCESSES=(web-public web-admin web-tenant web-booking)

# ── Reload / restart function ─────────────────────────────────────────────────
reload_process() {
  local name="$1"
  if [[ "$HARD" = true ]]; then
    warn "Hard restarting $name..."
    pm2 restart "$name" --update-env
  else
    log "Zero-downtime reloading $name..."
    pm2 reload "$name" --update-env
  fi
}

# ── Execute ───────────────────────────────────────────────────────────────────
case "$TARGET" in
  all)
    log "Reloading all Spancle processes (env: $ENV)..."
    if [[ "$HARD" = true ]]; then
      pm2 restart "$PM2_CONFIG" --update-env
    else
      pm2 reload "$PM2_CONFIG" --update-env
    fi
    ;;

  services)
    log "Reloading all NestJS services..."
    for svc in "${NEST_PROCESSES[@]}"; do
      reload_process "${PM2_NAMES[$svc]}"
    done
    ;;

  apps)
    log "Reloading all Next.js apps..."
    for app in "${NEXT_PROCESSES[@]}"; do
      reload_process "${PM2_NAMES[$app]}"
    done
    ;;

  *)
    # Single process
    [[ -v "PM2_NAMES[$TARGET]" ]] || err "Unknown target: $TARGET. Run with no args for help."
    reload_process "${PM2_NAMES[$TARGET]}"
    ;;
esac

# ── Status check ─────────────────────────────────────────────────────────────
log "Waiting 5s for processes to stabilise..."
sleep 5

echo ""
pm2 list | grep spancle || true

echo ""
log "Done. Full logs: pm2 logs"
log "Status:          pm2 status"
log "Monit:           pm2 monit"
