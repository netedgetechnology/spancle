#!/usr/bin/env bash
# =============================================================================
# SPANCLE SPORTS OS — Production Deploy Script
# scripts/deploy.sh
#
# Usage:
#   ./scripts/deploy.sh [--env staging|production] [--skip-migrate] [--skip-build]
#
# What it does:
#   1. Validates environment and dependencies
#   2. Pulls latest code (or uses current if --no-pull)
#   3. Installs/updates dependencies
#   4. Builds all NestJS services and NextJS apps
#   5. Runs database migrations (unless --skip-migrate)
#   6. Performs zero-downtime PM2 reload
#   7. Validates all processes are healthy
#
# Requirements:
#   - Ubuntu 22.04+
#   - Node.js 20.x installed
#   - pnpm installed globally
#   - PM2 installed globally
#   - PostgreSQL running
#   - Redis running
# =============================================================================

set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC}  $(date '+%H:%M:%S') $1"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $(date '+%H:%M:%S') $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $(date '+%H:%M:%S') $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $(date '+%H:%M:%S') $1"; exit 1; }
log_step()    { echo -e "\n${CYAN}══════════════════════════════════════════════${NC}"; \
                echo -e "${CYAN}  STEP: $1${NC}"; \
                echo -e "${CYAN}══════════════════════════════════════════════${NC}"; }

# ── Argument parsing ──────────────────────────────────────────────────────────
DEPLOY_ENV="production"
SKIP_MIGRATE=false
SKIP_BUILD=false
NO_PULL=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --env)         DEPLOY_ENV="$2";    shift 2 ;;
    --skip-migrate) SKIP_MIGRATE=true; shift ;;
    --skip-build)   SKIP_BUILD=true;   shift ;;
    --no-pull)      NO_PULL=true;      shift ;;
    *) log_error "Unknown argument: $1" ;;
  esac
done

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="/var/log/spancle"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DEPLOY_LOG="$LOG_DIR/deploy_${TIMESTAMP}.log"

cd "$ROOT_DIR"

# ── Banner ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}  Spancle Sports OS — Deploy${NC}"
echo -e "${CYAN}  Environment: ${YELLOW}${DEPLOY_ENV}${NC}"
echo -e "${CYAN}  Timestamp:   ${TIMESTAMP}${NC}"
echo ""

# ── Step 1: Pre-flight checks ─────────────────────────────────────────────────
log_step "Pre-flight checks"

command -v node  >/dev/null 2>&1 || log_error "Node.js not found"
command -v pnpm  >/dev/null 2>&1 || log_error "pnpm not found"
command -v pm2   >/dev/null 2>&1 || log_error "PM2 not found"

REQUIRED_NODE="20"
CURRENT_NODE="$(node -v | sed 's/v//' | cut -d. -f1)"
[[ "$CURRENT_NODE" -ge "$REQUIRED_NODE" ]] || log_error "Node.js >= 20 required (found v$CURRENT_NODE)"

# Validate environment file exists
ENV_FILE="/etc/spancle/.env.${DEPLOY_ENV}"
[[ -f "$ENV_FILE" ]] || log_error "Environment file not found: $ENV_FILE"
log_success "Environment file found: $ENV_FILE"

# Ensure log directory exists
mkdir -p "$LOG_DIR"
log_success "All pre-flight checks passed"

# ── Step 2: Pull latest code ──────────────────────────────────────────────────
log_step "Code update"

if [[ "$NO_PULL" = false ]]; then
  log_info "Pulling latest code..."
  git fetch origin
  git pull origin "$(git branch --show-current)" 2>&1 | tee -a "$DEPLOY_LOG"
  log_success "Code updated to $(git rev-parse --short HEAD)"
else
  log_warn "Skipping git pull (--no-pull)"
  log_info "Current commit: $(git rev-parse --short HEAD)"
fi

# ── Step 3: Install dependencies ─────────────────────────────────────────────
log_step "Dependency installation"
log_info "Installing dependencies with pnpm..."
pnpm install --frozen-lockfile 2>&1 | tee -a "$DEPLOY_LOG"
log_success "Dependencies installed"

# ── Step 4: Build ─────────────────────────────────────────────────────────────
log_step "Build"

if [[ "$SKIP_BUILD" = true ]]; then
  log_warn "Skipping build (--skip-build)"
else
  export NODE_ENV="$DEPLOY_ENV"

  log_info "Building shared packages..."
  pnpm turbo run build --filter='./packages/*' 2>&1 | tee -a "$DEPLOY_LOG"
  log_success "Packages built"

  log_info "Building NestJS services..."
  pnpm turbo run build --filter='./services/*' 2>&1 | tee -a "$DEPLOY_LOG"
  log_success "Services built"

  log_info "Building NextJS apps..."
  pnpm turbo run build --filter='./apps/*' 2>&1 | tee -a "$DEPLOY_LOG"
  log_success "Apps built"
fi

# ── Step 5: Database migrations ───────────────────────────────────────────────
log_step "Database migrations"

if [[ "$SKIP_MIGRATE" = true ]]; then
  log_warn "Skipping migrations (--skip-migrate)"
else
  # Load database URL from env file
  DATABASE_URL=$(grep '^DATABASE_URL=' "$ENV_FILE" | cut -d= -f2-)
  export DATABASE_URL

  log_info "Running migrations for all services..."

  SERVICES=(
    "identity-service"
    "saas-platform-service"
    "booking-service"
    "finance-service"
    "tournament-service"
    "academy-service"
    "communication-service"
    "reporting-service"
  )

  for SVC in "${SERVICES[@]}"; do
    SVC_DIR="$ROOT_DIR/services/$SVC"
    if [[ -d "$SVC_DIR/dist/migrations" ]]; then
      log_info "Migrating $SVC..."
      (cd "$SVC_DIR" && \
        SERVICE_NAME="$SVC" \
        NODE_ENV="$DEPLOY_ENV" \
        ./node_modules/.bin/typeorm migration:run -d dist/ormconfig.js \
        2>&1 | tee -a "$DEPLOY_LOG") || log_warn "$SVC migration failed — check logs"
    else
      log_warn "No migrations found for $SVC (dist/migrations missing)"
    fi
  done

  log_success "Migrations complete"
fi

# ── Step 6: PM2 reload ────────────────────────────────────────────────────────
log_step "PM2 zero-downtime reload"

PM2_CONFIG="$ROOT_DIR/infrastructure/pm2/ecosystem.${DEPLOY_ENV}.config.js"
[[ -f "$PM2_CONFIG" ]] || log_error "PM2 config not found: $PM2_CONFIG"

log_info "Reloading PM2 processes..."
pm2 reload "$PM2_CONFIG" --update-env 2>&1 | tee -a "$DEPLOY_LOG"
log_success "PM2 reload complete"

# ── Step 7: Health validation ─────────────────────────────────────────────────
log_step "Health validation"

log_info "Waiting 10s for processes to stabilise..."
sleep 10

UNHEALTHY=0
SERVICES_PORTS=(3001 3002 3003 3004 3005 3006 3007 3008)
SERVICES_NAMES=("identity" "saas-platform" "booking" "finance" "tournament" "academy" "communication" "reporting")

for i in "${!SERVICES_PORTS[@]}"; do
  PORT="${SERVICES_PORTS[$i]}"
  NAME="${SERVICES_NAMES[$i]}"
  if curl -sf "http://localhost:${PORT}/health" >/dev/null 2>&1; then
    log_success "$NAME-service (port $PORT): healthy"
  else
    log_warn "$NAME-service (port $PORT): not responding"
    UNHEALTHY=$((UNHEALTHY + 1))
  fi
done

if [[ "$UNHEALTHY" -gt 0 ]]; then
  log_warn "$UNHEALTHY service(s) not responding. Check: pm2 logs"
fi

# ── Summary ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Deploy complete${NC}"
echo -e "${GREEN}  Environment:   ${DEPLOY_ENV}${NC}"
echo -e "${GREEN}  Commit:        $(git rev-parse --short HEAD)${NC}"
echo -e "${GREEN}  Deploy log:    ${DEPLOY_LOG}${NC}"
echo -e "${GREEN}══════════════════════════════════════════════${NC}"
echo ""
