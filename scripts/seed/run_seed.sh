#!/usr/bin/env bash
# =============================================================================
# scripts/seed/run_seed.sh
# Master seed runner for Spancle Sports OS — Phase 1 demo data.
#
# Usage:
#   ./scripts/seed/run_seed.sh [--reset]
#
# Options:
#   --reset   Drop and re-insert all seed data (runs DELETE before INSERT).
#             Without --reset, the seed is fully idempotent (ON CONFLICT safety).
#
# Environment variables (defaults shown):
#   IDENTITY_DB_URL   postgres://postgres:postgres@localhost:5432/spancle_identity
#   BOOKING_DB_URL    postgres://postgres:postgres@localhost:5432/spancle_booking
#   FINANCE_DB_URL    postgres://postgres:postgres@localhost:5432/spancle_finance
#
# Requirements: psql in PATH
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Database connection URLs ──────────────────────────────────────────────────
IDENTITY_DB_URL="${IDENTITY_DB_URL:-postgres://postgres:postgres@localhost:5432/spancle_identity}"
BOOKING_DB_URL="${BOOKING_DB_URL:-postgres://postgres:postgres@localhost:5432/spancle_booking}"
FINANCE_DB_URL="${FINANCE_DB_URL:-postgres://postgres:postgres@localhost:5432/spancle_finance}"

# ── Flags ─────────────────────────────────────────────────────────────────────
RESET=false
for arg in "$@"; do
  [[ "$arg" == "--reset" ]] && RESET=true
done

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

log()  { echo -e "${GREEN}[seed]${NC} $*"; }
warn() { echo -e "${YELLOW}[seed]${NC} $*"; }
err()  { echo -e "${RED}[seed]${NC} $*" >&2; }

# ── Connectivity checks ───────────────────────────────────────────────────────
check_db() {
  local url="$1" name="$2"
  if ! psql "$url" -c '\q' 2>/dev/null; then
    err "Cannot connect to $name: $url"
    err "Set the ${name}_DB_URL environment variable or ensure the database is running."
    exit 1
  fi
  log "Connected to $name"
}

log "Checking database connectivity..."
check_db "$IDENTITY_DB_URL" "IDENTITY"
check_db "$BOOKING_DB_URL"  "BOOKING"
check_db "$FINANCE_DB_URL"  "FINANCE"

# ── Optional reset ────────────────────────────────────────────────────────────
if [[ "$RESET" == "true" ]]; then
  warn "⚠️  --reset flag detected: deleting existing seed data..."

  psql "$IDENTITY_DB_URL" <<'SQL'
  DELETE FROM identities WHERE id LIKE '00000000-0000-0000-0001-%' OR id LIKE '00000000-0000-0000-0000-%';
  DELETE FROM users      WHERE id LIKE '00000000-0000-0000-0001-%' OR id LIKE '00000000-0000-0000-0000-%';
  DELETE FROM roles      WHERE id LIKE '00000000-0000-0000-0001-%' OR id LIKE '00000000-0000-0000-0000-%';
  DELETE FROM sport_branches WHERE id LIKE '00000000-0000-0000-0001-%';
  DELETE FROM sports     WHERE id LIKE '00000000-0000-0000-0001-%';
  DELETE FROM courts     WHERE id LIKE '00000000-0000-0000-0001-%';
  DELETE FROM branches   WHERE id LIKE '00000000-0000-0000-0001-%';
  DELETE FROM tenants    WHERE id LIKE '00000000-0000-0000-0001-%' OR id LIKE '00000000-0000-0000-0000-%';
SQL

  psql "$BOOKING_DB_URL" <<'SQL'
  DELETE FROM booking_logs WHERE id LIKE '00000000-0000-0000-0001-%';
  DELETE FROM bookings     WHERE id LIKE '00000000-0000-0000-0001-%';
  DELETE FROM slots        WHERE id LIKE '00000000-0000-0000-0001-%';
  DELETE FROM pricing_rules WHERE id LIKE '00000000-0000-0000-0001-%';
SQL

  psql "$FINANCE_DB_URL" <<'SQL'
  DELETE FROM invoices          WHERE id LIKE '00000000-0000-0000-0001-%';
  DELETE FROM invoice_sequences WHERE id LIKE '00000000-0000-0000-0001-%';
SQL

  warn "Reset complete."
fi

# ── Seed execution ────────────────────────────────────────────────────────────
log "Starting Phase 1 seed..."

run_identity() {
  local file="$1"
  log "  [identity] $(basename "$file")"
  psql "$IDENTITY_DB_URL" -f "$file" --set ON_ERROR_STOP=1 2>&1 | grep -E "NOTICE|ERROR" || true
}

run_booking() {
  local file="$1"
  log "  [booking]  $(basename "$file")"
  psql "$BOOKING_DB_URL" -f "$file" --set ON_ERROR_STOP=1 2>&1 | grep -E "NOTICE|ERROR" || true
}

run_finance() {
  local file="$1"
  log "  [finance]  $(basename "$file")"
  psql "$FINANCE_DB_URL" -f "$file" --set ON_ERROR_STOP=1 2>&1 | grep -E "NOTICE|ERROR" || true
}

run_saas() {
  local file="$1"
  log "  [saas]     $(basename "$file")"
  psql "$SAAS_DB_URL" -f "$file" --set ON_ERROR_STOP=1 2>&1 | grep -E "NOTICE|ERROR" || true
}

# 00 — shared config (identity DB for extensions)
run_identity "$SCRIPT_DIR/00_config.sql"

# 01 — Superadmin (identity DB)
run_identity "$SCRIPT_DIR/01_superadmin.sql"

# 02 — Demo tenant (identity DB)
run_identity "$SCRIPT_DIR/02_demo_tenant.sql"

# 03 — Tenant admin (identity DB)
run_identity "$SCRIPT_DIR/03_tenant_admin.sql"

# 04 — Branch (identity DB)
run_identity "$SCRIPT_DIR/04_branch.sql"

# 05 — Sports (identity DB)
run_identity "$SCRIPT_DIR/05_sports.sql"

# 06 — Courts (identity DB)
run_identity "$SCRIPT_DIR/06_courts.sql"

# 07 — Pricing rules (booking DB)
run_booking  "$SCRIPT_DIR/07_pricing_rules.sql"

# 08 — Customers (identity DB)
run_identity "$SCRIPT_DIR/08_customers.sql"

# 09 — Slots + bookings (booking DB)
run_booking  "$SCRIPT_DIR/09_bookings.sql"

# 10 — Invoices (finance DB)
run_finance  "$SCRIPT_DIR/10_invoices.sql"

# 11 — Homepage CMS sections (saas-platform DB)
run_saas     "$SCRIPT_DIR/11_homepage_sections.sql"

# ── Summary ───────────────────────────────────────────────────────────────────
log ""
log "╔══════════════════════════════════════════════════╗"
log "║         Phase 1 Demo Seed — Complete             ║"
log "╠══════════════════════════════════════════════════╣"
log "║  Tenant: Ace Sports Club (ace-sports-club)       ║"
log "╠══════════════════════════════════════════════════╣"
log "║  SUPERADMIN LOGIN:                               ║"
log "║    Email:    superadmin@spancle.io               ║"
log "║    Password: SuperAdmin@2024!                    ║"
log "╠══════════════════════════════════════════════════╣"
log "║  TENANT ADMIN LOGIN:                             ║"
log "║    Email:    admin@acesportsclub.in              ║"
log "║    Password: TenantAdmin@2024!                   ║"
log "╠══════════════════════════════════════════════════╣"
log "║  BRANCH MANAGER LOGIN:                           ║"
log "║    Email:    manager@acesportsclub.in            ║"
log "║    Password: TenantAdmin@2024!                   ║"
log "╠══════════════════════════════════════════════════╣"
log "║  CUSTOMER LOGINS (password: Customer@2024!):     ║"
log "║    rohan.mehta@example.com   (member)            ║"
log "║    sneha.iyer@example.com    (member)            ║"
log "║    karan.bhatia@example.com  (member)            ║"
log "║    divya.pillai@example.com  (member)            ║"
log "║    amit.joshi@example.com    (member)            ║"
log "╠══════════════════════════════════════════════════╣"
log "║  DATA:                                           ║"
log "║    1 branch  (Koramangala, Bengaluru)            ║"
log "║    3 sports  (Badminton, Squash, TT)             ║"
log "║    8 courts  (B1–B4, S1–S2, TT1–TT2)            ║"
log "║    7 pricing rules (base + peak + member)        ║"
log "║    10 slots  (past + future)                     ║"
log "║    9 bookings (completed/no-show/cancelled/conf) ║"
log "║    7 invoices (paid / outstanding / draft)       ║"
log "╚══════════════════════════════════════════════════╝"
