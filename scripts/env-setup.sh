#!/usr/bin/env bash
# =============================================================================
# SPANCLE SPORTS OS — Server Environment Setup
# scripts/env-setup.sh
#
# First-time server provisioning for Ubuntu 22.04 LTS.
# Run ONCE on a fresh server as root or sudo-enabled user.
#
# What it provisions:
#   - Node.js 20.x (via NodeSource)
#   - pnpm
#   - PM2
#   - PostgreSQL 16
#   - Redis 7
#   - nginx
#   - Certbot (Let's Encrypt)
#   - System user 'spancle'
#   - Directory structure
#   - Log rotation config
#   - PM2 systemd startup
#
# Usage:
#   chmod +x scripts/env-setup.sh
#   sudo ./scripts/env-setup.sh
# =============================================================================

set -euo pipefail

# Must run as root
[[ "$EUID" -eq 0 ]] || { echo "Run as root: sudo $0"; exit 1; }

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
log_step()    { echo -e "\n${CYAN}══ $1 ══${NC}"; }

echo ""
echo -e "${CYAN}  Spancle Sports OS — Server Provisioning${NC}"
echo -e "${CYAN}  Ubuntu 22.04 LTS${NC}"
echo ""

# ── Step 1: System update ─────────────────────────────────────────────────────
log_step "System packages"
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
  curl wget git build-essential \
  ca-certificates gnupg lsb-release \
  ufw logrotate htop unzip
log_success "System packages updated"

# ── Step 2: Node.js 20.x ─────────────────────────────────────────────────────
log_step "Node.js 20.x"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
  log_success "Node.js $(node -v) installed"
else
  log_warn "Node.js already installed: $(node -v)"
fi

# ── Step 3: pnpm ─────────────────────────────────────────────────────────────
log_step "pnpm"
if ! command -v pnpm >/dev/null 2>&1; then
  npm install -g pnpm@9
  log_success "pnpm $(pnpm -v) installed"
else
  log_warn "pnpm already installed: $(pnpm -v)"
fi

# ── Step 4: PM2 ──────────────────────────────────────────────────────────────
log_step "PM2"
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
  log_success "PM2 $(pm2 -v) installed"
else
  log_warn "PM2 already installed: $(pm2 -v)"
fi

# ── Step 5: PostgreSQL 16 ─────────────────────────────────────────────────────
log_step "PostgreSQL 16"
if ! command -v psql >/dev/null 2>&1; then
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
  echo "deb [signed-by=/etc/apt/trusted.gpg.d/postgresql.gpg] \
    https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list
  apt-get update -qq
  apt-get install -y -qq postgresql-16 postgresql-client-16
  systemctl enable postgresql
  systemctl start postgresql
  log_success "PostgreSQL 16 installed and running"
else
  log_warn "PostgreSQL already installed"
fi

# Create application database and user
log_info "Creating PostgreSQL application user and databases..."
sudo -u postgres psql -c "
  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'spancle') THEN
      CREATE USER spancle WITH PASSWORD 'CHANGE_ME_IN_ENV_FILE';
    END IF;
  END
  \$\$;
" 2>/dev/null || true

sudo -u postgres psql -c "
  CREATE DATABASE spancle_production OWNER spancle;
  CREATE DATABASE spancle_staging    OWNER spancle;
  CREATE DATABASE spancle_test       OWNER spancle;
" 2>/dev/null || log_warn "Databases may already exist"

log_success "PostgreSQL databases provisioned"

# ── Step 6: Redis 7 ───────────────────────────────────────────────────────────
log_step "Redis 7"
if ! command -v redis-cli >/dev/null 2>&1; then
  curl -fsSL https://packages.redis.io/gpg \
    | gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
  echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] \
    https://packages.redis.io/deb $(lsb_release -cs) main" \
    > /etc/apt/sources.list.d/redis.list
  apt-get update -qq
  apt-get install -y -qq redis
  systemctl enable redis-server
  systemctl start redis-server
  log_success "Redis $(redis-cli --version) installed and running"
else
  log_warn "Redis already installed"
fi

# ── Step 7: nginx ─────────────────────────────────────────────────────────────
log_step "nginx"
if ! command -v nginx >/dev/null 2>&1; then
  apt-get install -y -qq nginx
  systemctl enable nginx
  log_success "nginx $(nginx -v 2>&1 | head -1) installed"
else
  log_warn "nginx already installed"
fi

# ── Step 8: Certbot ───────────────────────────────────────────────────────────
log_step "Certbot (Let's Encrypt)"
if ! command -v certbot >/dev/null 2>&1; then
  apt-get install -y -qq certbot python3-certbot-nginx
  log_success "Certbot installed"
else
  log_warn "Certbot already installed"
fi

# ── Step 9: System user ───────────────────────────────────────────────────────
log_step "System user: spancle"
if ! id "spancle" >/dev/null 2>&1; then
  useradd --system --shell /bin/bash --create-home --home-dir /home/spancle spancle
  log_success "User 'spancle' created"
else
  log_warn "User 'spancle' already exists"
fi

# ── Step 10: Directory structure ──────────────────────────────────────────────
log_step "Directory structure"

DIRS=(
  "/var/spancle/uploads"
  "/var/spancle/backups"
  "/var/log/spancle"
  "/etc/spancle"
)

for DIR in "${DIRS[@]}"; do
  mkdir -p "$DIR"
  chown spancle:spancle "$DIR"
  chmod 750 "$DIR"
  log_success "Created: $DIR"
done

# Secure /etc/spancle — only spancle user can read env files
chmod 700 /etc/spancle
log_success "Directory structure provisioned"

# ── Step 11: Log rotation ─────────────────────────────────────────────────────
log_step "Log rotation"
cat > /etc/logrotate.d/spancle << 'LOGROTATE'
/var/log/spancle/*/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
    postrotate
        pm2 reloadLogs 2>/dev/null || true
    endscript
}
LOGROTATE
log_success "Log rotation configured"

# ── Step 12: Firewall ─────────────────────────────────────────────────────────
log_step "Firewall (UFW)"
ufw --force reset >/dev/null 2>&1
ufw default deny incoming >/dev/null 2>&1
ufw default allow outgoing >/dev/null 2>&1
ufw allow ssh
ufw allow 'Nginx Full'   # 80 + 443
# Block direct access to Node.js ports from outside
# All traffic must go through nginx
ufw --force enable >/dev/null 2>&1
log_success "Firewall configured — ports 22, 80, 443 open"

# ── Step 13: PM2 startup ──────────────────────────────────────────────────────
log_step "PM2 systemd startup"
pm2 startup systemd -u spancle --hp /home/spancle | tail -1 | bash || \
  log_warn "PM2 startup command failed — run manually after deploying"
log_success "PM2 startup configured"

# ── Summary ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Server provisioning complete${NC}"
echo -e "${GREEN}══════════════════════════════════════════════${NC}"
echo ""
echo "  Next steps:"
echo "  1. Copy env template:  sudo cp infrastructure/environments/.env.production /etc/spancle/.env.production"
echo "  2. Edit secrets:       sudo nano /etc/spancle/.env.production"
echo "  3. Deploy app:         ./scripts/deploy.sh --env production"
echo "  4. Configure nginx:    sudo cp infrastructure/nginx/nginx.conf /etc/nginx/nginx.conf"
echo "  5. Provision SSL:      sudo certbot --nginx -d api.spancle.io"
echo ""
