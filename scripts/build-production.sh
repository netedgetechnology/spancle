#!/usr/bin/env bash
# =============================================================================
# SPANCLE SPORTS OS — Production Build Script
# scripts/build-production.sh
#
# Builds all packages, services, and Next.js apps for production deployment.
#
# Usage:
#   ./scripts/build-production.sh [options]
#
# Options:
#   --packages-only     Build only shared packages (auth-sdk, types, constants)
#   --services-only     Build only NestJS backend services
#   --apps-only         Build only Next.js frontend apps
#   --service NAME      Build a single service (e.g. --service identity-service)
#   --app NAME          Build a single app (e.g. --app tenant-portal)
#   --skip-typecheck    Skip TypeScript type-checking pass (faster)
#   --clean             Delete all dist/ and .next/ artifacts before building
#   --concurrency N     turbo --concurrency flag (default: 4)
#
# Prerequisites:
#   Node.js 20.x     node --version >= v20.0.0
#   pnpm 9.x         pnpm --version >= 9.0.0
#   Turbo            installed in devDependencies
#
# Environment:
#   NODE_ENV=production  set before calling this script, or pass via env
#
# Build outputs:
#   packages/*            dist/
#   services/*            dist/main.js  (entry point for PM2)
#   apps/*                .next/        (served by `next start`)
#   apps/*/standalone     .next/standalone/  (used when OUTPUT=standalone)
#
# Estimated build times on 4-core, 16GB RAM server:
#   Cold (no cache):  packages ~2m, services ~8m, apps ~12m  → total ~22m
#   Warm (with cache): ~30s (turbo cache hit)
# =============================================================================

set -euo pipefail

# ── Colours & helpers ─────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()   { echo -e "${GREEN}[build]${NC} $*"; }
warn()  { echo -e "${YELLOW}[build]${NC} $*"; }
err()   { echo -e "${RED}[build]${NC} $*" >&2; exit 1; }
step()  { echo -e "\n${CYAN}${BOLD}── $* ──────────────────────────────────${NC}"; }
timer() { echo -e "${CYAN}[build]${NC} $1: ${BOLD}$2${NC}"; }

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BUILD_START=$(date +%s)

# ── Parse arguments ───────────────────────────────────────────────────────────
PACKAGES_ONLY=false
SERVICES_ONLY=false
APPS_ONLY=false
SKIP_TYPECHECK=false
CLEAN=false
SINGLE_SERVICE=""
SINGLE_APP=""
CONCURRENCY="4"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --packages-only)   PACKAGES_ONLY=true ;;
    --services-only)   SERVICES_ONLY=true ;;
    --apps-only)       APPS_ONLY=true ;;
    --skip-typecheck)  SKIP_TYPECHECK=true ;;
    --clean)           CLEAN=true ;;
    --service)         SINGLE_SERVICE="$2"; shift ;;
    --app)             SINGLE_APP="$2"; shift ;;
    --concurrency)     CONCURRENCY="$2"; shift ;;
    *) err "Unknown option: $1" ;;
  esac
  shift
done

# ── Environment check ─────────────────────────────────────────────────────────
step "Pre-build checks"

NODE_VER=$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1) || err "Node.js not found"
[[ "$NODE_VER" -ge 20 ]] || err "Node.js 20+ required (found v${NODE_VER})"
log "Node.js: $(node --version)"

pnpm --version >/dev/null 2>&1 || err "pnpm not found. Install: npm install -g pnpm@9"
log "pnpm: $(pnpm --version)"

export NODE_ENV="${NODE_ENV:-production}"
export NEXT_TELEMETRY_DISABLED=1
export TURBO_TELEMETRY_DISABLED=1

log "NODE_ENV: $NODE_ENV"
log "Root: $ROOT_DIR"
log "Concurrency: $CONCURRENCY"

# ── Clean ─────────────────────────────────────────────────────────────────────
if [[ "$CLEAN" = true ]]; then
  step "Clean"
  log "Removing dist/ and .next/ artifacts..."
  find "$ROOT_DIR/services" -name "dist" -type d -not -path "*/node_modules/*" \
    -exec rm -rf {} + 2>/dev/null || true
  find "$ROOT_DIR/apps" -name ".next" -type d -not -path "*/node_modules/*" \
    -exec rm -rf {} + 2>/dev/null || true
  find "$ROOT_DIR/packages" -name "dist" -type d -not -path "*/node_modules/*" \
    -exec rm -rf {} + 2>/dev/null || true
  log "Clean complete"
fi

# ── Install dependencies ──────────────────────────────────────────────────────
step "Install dependencies"
log "Running pnpm install --frozen-lockfile..."
pnpm install --frozen-lockfile
log "Dependencies installed"

# ── Type check (optional) ─────────────────────────────────────────────────────
if [[ "$SKIP_TYPECHECK" = false ]]; then
  step "TypeScript type check"
  TC_START=$(date +%s)
  log "Running tsc --noEmit across workspace..."
  pnpm turbo run typecheck --concurrency="$CONCURRENCY" || {
    warn "Type errors found. Fix before deploying."
    exit 1
  }
  TC_END=$(date +%s)
  timer "Typecheck" "$((TC_END - TC_START))s"
fi

# ── Build ─────────────────────────────────────────────────────────────────────

# ── Single service/app mode ───────────────────────────────────────────────────
if [[ -n "$SINGLE_SERVICE" ]]; then
  step "Build: $SINGLE_SERVICE"
  SVC_START=$(date +%s)
  pnpm turbo run build \
    --filter="./packages/*" \
    --filter="./services/$SINGLE_SERVICE" \
    --concurrency="$CONCURRENCY"
  SVC_END=$(date +%s)
  timer "$SINGLE_SERVICE" "$((SVC_END - SVC_START))s"
  exit 0
fi

if [[ -n "$SINGLE_APP" ]]; then
  step "Build: $SINGLE_APP"
  APP_START=$(date +%s)
  pnpm turbo run build \
    --filter="./packages/*" \
    --filter="./apps/$SINGLE_APP" \
    --concurrency="$CONCURRENCY"
  APP_END=$(date +%s)
  timer "$SINGLE_APP" "$((APP_END - APP_START))s"
  exit 0
fi

# ── Full build ────────────────────────────────────────────────────────────────

if [[ "$APPS_ONLY" = false ]]; then
  # 1. Shared packages first (auth-sdk, types, constants, ui-kit)
  step "Build: packages"
  PKG_START=$(date +%s)
  log "Building shared packages..."
  pnpm turbo run build \
    --filter="./packages/*" \
    --concurrency="$CONCURRENCY"
  PKG_END=$(date +%s)
  timer "Packages" "$((PKG_END - PKG_START))s"
fi

if [[ "$PACKAGES_ONLY" = false && "$APPS_ONLY" = false ]]; then
  # 2. NestJS backend services
  step "Build: services"
  SVC_START=$(date +%s)
  log "Building NestJS services..."
  pnpm turbo run build \
    --filter="./services/*" \
    --concurrency="$CONCURRENCY"
  SVC_END=$(date +%s)
  timer "Services" "$((SVC_END - SVC_START))s"

  # Verify all service entry points exist
  log "Verifying service entry points..."
  SERVICES=(
    identity-service
    saas-platform-service
    booking-service
    finance-service
    tournament-service
    academy-service
    communication-service
    reporting-service
  )
  for SVC in "${SERVICES[@]}"; do
    MAIN="$ROOT_DIR/services/$SVC/dist/main.js"
    if [[ -f "$MAIN" ]]; then
      log "  ✅ $SVC/dist/main.js"
    else
      warn "  ❌ $SVC/dist/main.js not found"
    fi
  done
fi

if [[ "$PACKAGES_ONLY" = false && "$SERVICES_ONLY" = false ]]; then
  # 3. Next.js apps
  step "Build: apps"
  APP_START=$(date +%s)
  log "Building Next.js apps..."
  pnpm turbo run build \
    --filter="./apps/*" \
    --concurrency="$CONCURRENCY"
  APP_END=$(date +%s)
  timer "Apps" "$((APP_END - APP_START))s"

  # Verify Next.js build outputs
  log "Verifying Next.js build outputs..."
  APPS=(public-website superadmin-portal tenant-portal consumer-booking)
  for APP in "${APPS[@]}"; do
    if [[ -d "$ROOT_DIR/apps/$APP/.next" ]]; then
      log "  ✅ $APP/.next"
    else
      warn "  ❌ $APP/.next not found"
    fi
  done
fi

# ── Summary ───────────────────────────────────────────────────────────────────
BUILD_END=$(date +%s)
TOTAL_TIME=$((BUILD_END - BUILD_START))

echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  Build complete${NC}"
echo -e "${GREEN}${BOLD}  Total time: ${TOTAL_TIME}s${NC}"
echo -e "${GREEN}${BOLD}  NODE_ENV:   ${NODE_ENV}${NC}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "  1. Run migrations:  ./scripts/db-migrate.sh run"
echo "  2. Start processes: pm2 start infrastructure/pm2/ecosystem.production.config.js --env production"
echo "  3. Save PM2 list:   pm2 save"
echo ""
