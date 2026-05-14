#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Spancle Sports OS production deployment
# Usage: ./deploy.sh
# =============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "[deploy] Installing dependencies..."
pnpm install --frozen-lockfile

echo "[deploy] Building all packages, services, and apps..."
pnpm build

PM2_CONFIG="$ROOT_DIR/infrastructure/pm2/ecosystem.config.js"
if [ -f "$PM2_CONFIG" ]; then
  echo "[deploy] Restarting PM2 processes..."
  if pm2 list | grep -q "online"; then
    pm2 reload "$PM2_CONFIG" --update-env
  else
    pm2 start "$PM2_CONFIG"
  fi
  pm2 save
else
  echo "[deploy] Warning: $PM2_CONFIG not found — skipping PM2 restart."
fi

if command -v nginx &>/dev/null; then
  echo "[deploy] Reloading nginx..."
  sudo nginx -t && sudo systemctl reload nginx
else
  echo "[deploy] Warning: nginx not found — skipping reload."
fi

echo "[deploy] Deployment complete."
