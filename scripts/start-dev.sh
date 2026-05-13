#!/usr/bin/env bash
# =============================================================================
# SPANCLE SPORTS OS — Development Start Script
# scripts/start-dev.sh
#
# Starts all services in dependency order for local development.
# Uses PM2 in development mode (no cluster, full logging).
#
# Prerequisites:
#   - PostgreSQL running (localhost:5432)
#   - Redis running (localhost:6379)
#   - Dependencies installed: pnpm install
#   - Services built: pnpm build (or run in watch mode below)
#
# Usage:
#   ./scripts/start-dev.sh           — starts all processes
#   ./scripts/start-dev.sh --watch   — starts in watch mode (ts-node, not dist/)
#   ./scripts/start-dev.sh --stop    — stops all spancle processes
#   ./scripts/start-dev.sh --logs    — tails all process logs
# =============================================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Argument parsing ──────────────────────────────────────────────────────────
MODE="start"
while [[ $# -gt 0 ]]; do
  case $1 in
    --watch) MODE="watch"; shift ;;
    --stop)  MODE="stop";  shift ;;
    --logs)  MODE="logs";  shift ;;
    *) log_error "Unknown argument: $1" ;;
  esac
done

# ── Stop mode ─────────────────────────────────────────────────────────────────
if [[ "$MODE" = "stop" ]]; then
  log_info "Stopping all Spancle processes..."
  pm2 delete ecosystem.config.js 2>/dev/null || true
  log_success "All Spancle processes stopped"
  exit 0
fi

# ── Logs mode ─────────────────────────────────────────────────────────────────
if [[ "$MODE" = "logs" ]]; then
  pm2 logs --lines 50
  exit 0
fi

# ── Dependency checks ─────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}  Spancle Sports OS — Development Start${NC}"
echo ""

log_info "Checking prerequisites..."

command -v node >/dev/null 2>&1 || log_error "Node.js not found"
command -v pnpm >/dev/null 2>&1 || log_error "pnpm not found"
command -v pm2  >/dev/null 2>&1 || log_error "PM2 not found. Install: npm install -g pm2"

# Check PostgreSQL
if pg_isready -h localhost -p 5432 -q 2>/dev/null; then
  log_success "PostgreSQL: running"
else
  log_warn "PostgreSQL: not responding on localhost:5432"
  log_warn "Start PostgreSQL or run: sudo systemctl start postgresql"
fi

# Check Redis
if redis-cli -h localhost -p 6379 ping >/dev/null 2>&1; then
  log_success "Redis: running"
else
  log_warn "Redis: not responding on localhost:6379"
  log_warn "Start Redis or run: sudo systemctl start redis"
fi

# ── Load dev environment ──────────────────────────────────────────────────────
DEV_ENV="$ROOT_DIR/infrastructure/environments/.env.development"
if [[ -f "$DEV_ENV" ]]; then
  log_success "Environment: $DEV_ENV"
else
  log_warn "Dev environment file not found: $DEV_ENV"
  log_warn "Copy from .env.example and configure"
fi

# ── Start processes ───────────────────────────────────────────────────────────
cd "$ROOT_DIR"

if [[ "$MODE" = "watch" ]]; then
  log_info "Starting in watch mode (pnpm turbo dev)..."
  log_warn "Watch mode runs NestJS with ts-node — no PM2 process management"
  export NODE_ENV=development
  pnpm turbo run dev --parallel
else
  log_info "Building before start..."
  pnpm turbo run build --filter='./services/*' --filter='./apps/*' 2>/dev/null || \
    log_warn "Build errors — some services may not start"

  log_info "Starting all processes with PM2..."
  pm2 start "$ROOT_DIR/infrastructure/pm2/ecosystem.config.js" \
    --env development \
    --update-env

  log_info "Waiting 8s for services to initialise..."
  sleep 8

  log_info "Process status:"
  pm2 list

  echo ""
  log_success "Development environment started"
  echo ""
  echo "  Services:         http://localhost:3001 → 3008"
  echo "  Public website:   http://localhost:3010"
  echo "  Superadmin:       http://localhost:3011"
  echo "  Tenant portal:    http://localhost:3012"
  echo "  Consumer booking: http://localhost:3013"
  echo "  MailHog UI:       http://localhost:8025"
  echo "  RedisInsight:     http://localhost:8001"
  echo ""
  echo "  Logs: pm2 logs"
  echo "  Stop: ./scripts/start-dev.sh --stop"
  echo ""
fi
