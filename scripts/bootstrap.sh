#!/usr/bin/env bash
# =============================================================================
# SPANCLE SPORTS OS — Developer Bootstrap Script
# scripts/bootstrap.sh
# =============================================================================
# Run once after cloning:
#   chmod +x scripts/bootstrap.sh && ./scripts/bootstrap.sh
# =============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

echo ""
echo "  ███████╗██████╗  █████╗ ███╗   ██╗ ██████╗██╗     ███████╗"
echo "  ██╔════╝██╔══██╗██╔══██╗████╗  ██║██╔════╝██║     ██╔════╝"
echo "  ███████╗██████╔╝███████║██╔██╗ ██║██║     ██║     █████╗  "
echo "  ╚════██║██╔═══╝ ██╔══██║██║╚██╗██║██║     ██║     ██╔══╝  "
echo "  ███████║██║     ██║  ██║██║ ╚████║╚██████╗███████╗███████╗"
echo "  ╚══════╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚══════╝╚══════╝"
echo "  Sports OS — Bootstrap"
echo ""

# --- Node Version Check ---
log_info "Checking Node.js version..."
REQUIRED_NODE="20.11.0"
CURRENT_NODE=$(node -v 2>/dev/null | tr -d 'v' || echo "none")

if [ "$CURRENT_NODE" = "none" ]; then
  log_error "Node.js not found. Install v${REQUIRED_NODE} via nvm: nvm install ${REQUIRED_NODE}"
fi

if [ "$CURRENT_NODE" != "$REQUIRED_NODE" ]; then
  log_warn "Node.js version mismatch. Required: ${REQUIRED_NODE}, Found: ${CURRENT_NODE}"
  log_warn "Run: nvm use"
fi
log_success "Node.js ${CURRENT_NODE}"

# --- pnpm Check ---
log_info "Checking pnpm..."
if ! command -v pnpm &> /dev/null; then
  log_warn "pnpm not found. Installing..."
  npm install -g pnpm@9
fi
log_success "pnpm $(pnpm -v)"

# --- Docker Check ---
log_info "Checking Docker..."
if ! command -v docker &> /dev/null; then
  log_warn "Docker not found. Docker is required for local infrastructure."
  log_warn "Install Docker Desktop: https://www.docker.com/products/docker-desktop"
else
  log_success "Docker $(docker -v | awk '{print $3}' | tr -d ',')"
fi

# --- Environment File ---
log_info "Checking environment file..."
if [ ! -f ".env" ]; then
  cp .env.example .env
  log_warn ".env created from .env.example — update with your local values before running."
else
  log_success ".env already exists"
fi

# --- Docker env file ---
if [ ! -f "infrastructure/docker/.env" ]; then
  cp infrastructure/docker/.env.docker infrastructure/docker/.env
  log_warn "infrastructure/docker/.env created — update passwords before running docker compose."
fi

# --- Install Dependencies ---
log_info "Installing dependencies..."
pnpm install --frozen-lockfile || pnpm install
log_success "Dependencies installed"

# --- Husky Setup ---
log_info "Setting up git hooks..."
pnpm husky || true
log_success "Git hooks installed"

# --- Summary ---
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_success "Bootstrap complete!"
echo ""
echo "  Next steps:"
echo "  1. Edit .env with your local configuration"
echo "  2. Start infrastructure:"
echo "     docker compose -f infrastructure/docker/docker-compose.yml up -d"
echo "  3. Start development:"
echo "     pnpm dev"
echo ""
echo "  Services:"
echo "  ├── PostgreSQL   → localhost:5432"
echo "  ├── Redis        → localhost:6379"
echo "  ├── MailHog UI   → http://localhost:8025"
echo "  └── RedisInsight → http://localhost:8001"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
