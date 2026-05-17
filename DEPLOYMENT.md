# Spancle Sports OS — Production Deployment Guide

Single-server deployment on Ubuntu 22.04 LTS with Node.js, PostgreSQL, Redis, PM2, and Nginx.

---

## Server requirements

| Component    | Minimum              | Recommended        |
|---|---|---|
| CPU          | 4 vCPU               | 8 vCPU             |
| RAM          | 8 GB                 | 16 GB              |
| Disk         | 40 GB SSD            | 100 GB SSD         |
| OS           | Ubuntu 22.04 LTS     | Ubuntu 22.04 LTS   |
| Node.js      | 20.x LTS             | 20.x LTS           |
| PostgreSQL   | 15+                  | 16+                |
| Redis        | 7+                   | 7+                 |
| Nginx        | 1.24+                | 1.24+              |

### Process memory budget (8 GB server)

```
8 NestJS services × 384 MB =  3.1 GB
4 Next.js apps    × 512 MB =  2.0 GB
PostgreSQL                  ~  1.5 GB
Redis                       ~  0.3 GB
OS + nginx + headroom       ~  1.1 GB
                            ──────────
Total                       ~  8.0 GB
```

---

## Port map

| Process              | Port | PM2 name                |
|---|---|---|
| identity-service     | 3001 | spancle-identity        |
| saas-platform-service| 3002 | spancle-saas-platform   |
| booking-service      | 3003 | spancle-booking         |
| finance-service      | 3004 | spancle-finance         |
| tournament-service   | 3005 | spancle-tournament      |
| academy-service      | 3006 | spancle-academy         |
| communication-service| 3007 | spancle-communication   |
| reporting-service    | 3008 | spancle-reporting       |
| public-website       | 3010 | spancle-web-public      |
| superadmin-portal    | 3011 | spancle-web-admin       |
| tenant-portal        | 3012 | spancle-web-tenant      |
| consumer-booking     | 3013 | spancle-web-booking     |

---

## First-time server setup

### 1. Create deploy user

```bash
sudo adduser deploy
sudo usermod -aG sudo deploy
# Add SSH key to /home/deploy/.ssh/authorized_keys
```

### 2. Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # should be v20.x
```

### 3. Install pnpm

```bash
npm install -g pnpm@9
pnpm --version
```

### 4. Install PM2

```bash
npm install -g pm2@latest
pm2 --version
```

### 5. Install PostgreSQL 16

```bash
sudo apt-get install -y postgresql-16 postgresql-client-16
sudo systemctl enable --now postgresql

# Create DB user and databases
sudo -u postgres psql << 'SQL'
CREATE USER spancle WITH PASSWORD 'CHANGE_ME_DB_PASSWORD';

CREATE DATABASE spancle_identity    OWNER spancle;
CREATE DATABASE spancle_saas        OWNER spancle;
CREATE DATABASE spancle_booking     OWNER spancle;
CREATE DATABASE spancle_finance     OWNER spancle;
CREATE DATABASE spancle_tournament  OWNER spancle;
CREATE DATABASE spancle_academy     OWNER spancle;
CREATE DATABASE spancle_communication OWNER spancle;
CREATE DATABASE spancle_reporting   OWNER spancle;

-- Grant pgcrypto for UUID generation (used by seed scripts)
\c spancle_identity
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\c spancle_booking
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\c spancle_finance
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
SQL
```

### 6. Install Redis 7

```bash
sudo apt-get install -y redis-server
sudo systemctl enable --now redis-server

# Set a password in /etc/redis/redis.conf
sudo sed -i 's/^# requirepass .*/requirepass CHANGE_ME_REDIS_PASSWORD/' /etc/redis/redis.conf
sudo systemctl restart redis-server

# Verify
redis-cli -a CHANGE_ME_REDIS_PASSWORD ping   # should return PONG
```

### 7. Install Nginx

```bash
sudo apt-get install -y nginx
sudo systemctl enable --now nginx
```

### 8. Create directories

```bash
sudo mkdir -p /etc/spancle
sudo mkdir -p /var/log/spancle
sudo mkdir -p /var/spancle/uploads

# Create log dirs for each process
for proc in spancle-identity spancle-saas-platform spancle-booking spancle-finance \
            spancle-tournament spancle-academy spancle-communication spancle-reporting \
            spancle-web-public spancle-web-admin spancle-web-tenant spancle-web-booking; do
  sudo mkdir -p /var/log/spancle/$proc
done

sudo chown -R deploy:deploy /var/log/spancle
sudo chown -R deploy:deploy /var/spancle
sudo chown -R deploy:deploy /etc/spancle
```

---

## Deployment steps

### Step 1: Clone the repository

```bash
cd /srv
sudo git clone https://github.com/your-org/spancle-sports-os.git
sudo chown -R deploy:deploy /srv/spancle-sports-os
cd /srv/spancle-sports-os
```

### Step 2: Configure environment variables

```bash
# Copy and edit the master production env file
sudo cp infrastructure/environments/.env.production.template /etc/spancle/.env.production
sudo nano /etc/spancle/.env.production

# Fill in ALL values marked CHANGE_ME:
#   CHANGE_ME_DB_PASSWORD     → PostgreSQL password
#   CHANGE_ME_REDIS_PASSWORD  → Redis password
#   CHANGE_ME_JWT_SECRET_*    → openssl rand -base64 48
#   CHANGE_ME_NEXTAUTH_SECRET → openssl rand -base64 48
#   CHANGE_ME_32_BYTE_HEX_*   → openssl rand -hex 32
#   SMTP_* credentials        → your email provider

sudo chmod 600 /etc/spancle/.env.production

# Generate per-service env files from master
sudo -u deploy ./scripts/gen-service-envs.sh
```

### Step 3: Build

```bash
cd /srv/spancle-sports-os
chmod +x scripts/build-production.sh
./scripts/build-production.sh
```

Individual build options:

```bash
# Build everything (packages → services → apps)
./scripts/build-production.sh

# Build one service after code change
./scripts/build-production.sh --service booking-service

# Build one app after code change
./scripts/build-production.sh --app tenant-portal

# Skip type checking (faster, not recommended for first deploy)
./scripts/build-production.sh --skip-typecheck

# Clean rebuild (delete all dist/ and .next/ first)
./scripts/build-production.sh --clean
```

### Step 4: Database schema setup (first deploy only)

```bash
chmod +x scripts/db-migrate.sh

# INITIAL SETUP: sync schema from TypeORM entities
# This creates all tables. Destructive — only run on empty databases.
./scripts/db-migrate.sh sync

# SUBSEQUENT DEPLOYS: run pending migrations only
./scripts/db-migrate.sh run
```

Single service:

```bash
./scripts/db-migrate.sh sync identity
./scripts/db-migrate.sh sync booking
./scripts/db-migrate.sh sync finance
./scripts/db-migrate.sh sync saas-platform
./scripts/db-migrate.sh sync reporting
./scripts/db-migrate.sh sync tournament
./scripts/db-migrate.sh sync academy
./scripts/db-migrate.sh sync communication
```

### Step 5: Seed demo data (optional)

```bash
# Load environment for seed script
source /etc/spancle/.env.production

chmod +x scripts/seed/run_seed.sh
./scripts/seed/run_seed.sh

# To reset and re-seed (destructive)
./scripts/seed/run_seed.sh --reset
```

Seed credentials after running:

| Role            | Email                        | Password          |
|---|---|---|
| Super Admin     | superadmin@spancle.io        | SuperAdmin@2024!  |
| Tenant Admin    | admin@acesportsclub.in       | TenantAdmin@2024! |
| Branch Manager  | manager@acesportsclub.in     | TenantAdmin@2024! |
| Customer        | rohan.mehta@example.com      | Customer@2024!    |

### Step 6: Start PM2 processes

```bash
# Start all processes with production config
pm2 start infrastructure/pm2/ecosystem.production.config.js --env production

# Save PM2 process list to survive reboots
pm2 save

# Generate and install systemd unit (run as root or with sudo)
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u deploy --hp /home/deploy
# Run the printed command, then:
pm2 save
```

Verify all processes started:

```bash
pm2 list
pm2 status
```

### Step 7: Configure Nginx

```bash
# Copy nginx configs
sudo cp infrastructure/nginx/nginx.conf /etc/nginx/nginx.conf
sudo cp infrastructure/nginx/conf.d/*.conf /etc/nginx/conf.d/
sudo mkdir -p /etc/nginx/snippets
sudo cp infrastructure/nginx/snippets/*.conf /etc/nginx/snippets/

# Test config
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

### Step 8: SSL certificates (after DNS is pointed)

```bash
# Install certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain certificates for all domains
sudo certbot --nginx \
  -d spancle.io \
  -d www.spancle.io \
  -d api.spancle.io \
  -d manage.spancle.com \
  -d app.spancle.io \
  -d book.spancle.io

# Auto-renewal is configured by certbot. Verify:
sudo certbot renew --dry-run
```

### Step 9: Verify health

```bash
# Check all service health endpoints
for port in 3001 3002 3003 3004 3005 3006 3007 3008; do
  echo -n "Port $port: "
  curl -sf http://localhost:$port/health | python3 -m json.tool 2>/dev/null || echo "FAILED"
done

# Check Next.js apps
for port in 3010 3011 3012 3013; do
  echo -n "Port $port: "
  curl -sf -o /dev/null -w "%{http_code}" http://localhost:$port/ || echo "FAILED"
  echo ""
done

# Full PM2 status
pm2 list
pm2 logs --lines 50
```

---

## Subsequent deploys

```bash
# Pull latest code
cd /srv/spancle-sports-os
git pull origin main

# Build (with cache — usually fast)
./scripts/build-production.sh

# Run new migrations
./scripts/db-migrate.sh run

# Zero-downtime reload all processes
./scripts/pm2-restart.sh all

# Or reload a specific service
./scripts/pm2-restart.sh booking
```

---

## PM2 management commands

```bash
# Status
pm2 list                        # all processes
pm2 status                      # same as list
pm2 monit                       # live monitoring dashboard

# Logs
pm2 logs                        # all logs
pm2 logs spancle-booking        # specific service
pm2 logs spancle-booking --lines 200
pm2 flush                       # clear all log files

# Restart / reload
./scripts/pm2-restart.sh all            # zero-downtime reload all
./scripts/pm2-restart.sh booking        # reload booking service
./scripts/pm2-restart.sh all --hard     # force restart (kills + starts)
pm2 reload all                          # direct PM2 reload (no env update)

# Start / stop
pm2 stop spancle-booking
pm2 start spancle-booking
pm2 delete spancle-booking              # remove from PM2 list
pm2 start infrastructure/pm2/ecosystem.production.config.js --env production

# Ecosystem
pm2 save                        # persist current process list
pm2 startup                     # regenerate systemd unit
```

---

## Nginx management commands

```bash
sudo nginx -t                   # test config syntax
sudo systemctl reload nginx     # reload without downtime
sudo systemctl restart nginx    # full restart
sudo nginx -s reload            # reload (alternative)
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

---

## Database management

```bash
# Connect to a service database
psql "$IDENTITY_DATABASE_URL"
psql "$BOOKING_DATABASE_URL"
psql "$FINANCE_DATABASE_URL"

# Run migrations
./scripts/db-migrate.sh run              # all services
./scripts/db-migrate.sh run identity     # single service
./scripts/db-migrate.sh show             # show pending/applied

# Revert last migration
./scripts/db-migrate.sh revert identity

# Manual backup
pg_dump "$BOOKING_DATABASE_URL" | gzip > /backups/booking_$(date +%Y%m%d_%H%M%S).sql.gz

# Backup all databases
for db in spancle_identity spancle_saas spancle_booking spancle_finance \
          spancle_tournament spancle_academy spancle_communication spancle_reporting; do
  pg_dump -U spancle -h 127.0.0.1 "$db" | gzip > "/backups/${db}_$(date +%Y%m%d_%H%M%S).sql.gz"
done
```

---

## Redis management

```bash
redis-cli -a "$REDIS_PASSWORD" ping
redis-cli -a "$REDIS_PASSWORD" info server
redis-cli -a "$REDIS_PASSWORD" info memory
redis-cli -a "$REDIS_PASSWORD" dbsize
redis-cli -a "$REDIS_PASSWORD" flushdb    # ⚠️  clears current DB
```

---

## Troubleshooting

### Service won't start

```bash
pm2 logs spancle-identity --lines 100
# Check: DATABASE_URL set, DB accessible, port not in use
ss -tlnp | grep 3001
```

### Port already in use

```bash
sudo fuser -k 3001/tcp   # kill process on port 3001
pm2 restart spancle-identity
```

### Out of memory

```bash
pm2 monit                        # live memory per process
# Edit max_memory_restart in ecosystem.production.config.js
# Increase server RAM, or reduce POOL_MAX
```

### Nginx 502 Bad Gateway

```bash
curl -sf http://localhost:3001/health   # test upstream directly
pm2 list                                # verify service is online
sudo tail -20 /var/log/nginx/error.log
```

### Database connection pool exhausted

```bash
# Lower DATABASE_POOL_MAX or restart the service
pm2 restart spancle-booking
# Or increase PostgreSQL max_connections in /etc/postgresql/16/main/postgresql.conf
```

### PM2 processes not starting on boot

```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u deploy --hp /home/deploy
pm2 save
sudo systemctl status pm2-deploy
```

---

## Environment variables reference

All environment variables are defined in:

```
/etc/spancle/.env.production          Master file (all services)
/etc/spancle/.env.identity            identity-service only
/etc/spancle/.env.saas-platform       saas-platform-service only
/etc/spancle/.env.booking             booking-service only
/etc/spancle/.env.finance             finance-service only
/etc/spancle/.env.tournament          tournament-service only
/etc/spancle/.env.academy             academy-service only
/etc/spancle/.env.communication       communication-service only
/etc/spancle/.env.reporting           reporting-service only
```

Template: `infrastructure/environments/.env.production.template`

Regenerate per-service files after editing master:

```bash
sudo ./scripts/gen-service-envs.sh
./scripts/pm2-restart.sh all
```

---

## File locations

| File                                                 | Purpose                          |
|---|---|
| `/etc/spancle/.env.production`                       | Master environment variables     |
| `/etc/spancle/.env.<service>`                        | Per-service env files            |
| `/var/log/spancle/<process>/out.log`                 | Stdout log                       |
| `/var/log/spancle/<process>/error.log`               | Stderr / error log               |
| `/var/log/nginx/access.log`                          | Nginx access log                 |
| `/var/log/nginx/error.log`                           | Nginx error log                  |
| `/var/spancle/uploads`                               | File uploads (local storage)     |
| `/srv/spancle-sports-os`                             | Application root                 |
| `/srv/spancle-sports-os/scripts/deploy.sh`           | Full deploy script               |
| `/srv/spancle-sports-os/scripts/build-production.sh` | Build script                     |
| `/srv/spancle-sports-os/scripts/db-migrate.sh`       | Migration runner                 |
| `/srv/spancle-sports-os/scripts/pm2-restart.sh`      | Restart/reload script            |
| `/srv/spancle-sports-os/scripts/seed/run_seed.sh`    | Demo data seed                   |
| `/srv/spancle-sports-os/infrastructure/pm2/`         | PM2 ecosystem configs            |
| `/srv/spancle-sports-os/infrastructure/nginx/`       | Nginx config files               |
