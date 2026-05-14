/**
 * PM2 Ecosystem Configuration — Base
 * infrastructure/pm2/ecosystem.config.js
 *
 * Single-server deployment for Spancle Sports OS on Ubuntu.
 * Runs all 8 NestJS services + 4 NextJS apps as PM2-managed processes.
 *
 * Usage:
 *   Development:  pm2 start ecosystem.config.js
 *   Staging:      pm2 start ecosystem.staging.config.js
 *   Production:   pm2 start ecosystem.production.config.js
 *
 * Process naming convention: spancle-{service-name}
 * Log directory: /var/log/spancle/{process-name}/
 *
 * Port map (mirrors packages/constants/src/api.constants.ts):
 *   identity-service:       3001
 *   saas-platform-service:  3002
 *   booking-service:        3003
 *   finance-service:        3004
 *   tournament-service:     3005
 *   academy-service:        3006
 *   communication-service:  3007
 *   reporting-service:      3008
 *   public-website:         3010
 *   superadmin-portal:      3011
 *   tenant-portal:          3012
 *   consumer-booking:       3013
 */

'use strict';

const path = require('path');

// ── Shared defaults ───────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '../..');
const LOG_DIR = '/var/log/spancle';

const sharedServiceDefaults = {
  interpreter:  'node',
  // NestJS services run from compiled dist/
  script:       'dist/main.js',
  // Single instance in base config — overridden in production config
  instances:    1,
  exec_mode:    'fork',
  // Restart policy
  autorestart:  true,
  watch:        false,
  max_restarts: 10,
  min_uptime:   '5s',
  restart_delay: 2000,
  // Memory threshold before automatic restart
  max_memory_restart: '512M',
  // Environment
  env: {
    NODE_ENV:  'development',
    LOG_LEVEL: 'debug',
  },
};

const sharedAppDefaults = {
  interpreter:  'node',
  // NextJS apps run via next start
  script:       'node_modules/.bin/next',
  args:         'start',
  instances:    1,
  exec_mode:    'fork',
  autorestart:  true,
  watch:        false,
  max_restarts: 10,
  min_uptime:   '10s',
  restart_delay: 3000,
  max_memory_restart: '768M',
  env: {
    NODE_ENV:  'development',
    LOG_LEVEL: 'debug',
  },
};

// ── NestJS service definitions ────────────────────────────────────────────────

const nestServices = [
  {
    name:  'spancle-identity',
    cwd:   path.join(ROOT, 'services/identity-service'),
    env: {
      PORT:         3001,
      SERVICE_NAME: 'identity-service',
    },
  },
  {
    name:  'spancle-saas-platform',
    cwd:   path.join(ROOT, 'services/saas-platform-service'),
    env: {
      PORT:         3002,
      SERVICE_NAME: 'saas-platform-service',
    },
  },
  {
    name:  'spancle-booking',
    cwd:   path.join(ROOT, 'services/booking-service'),
    env: {
      PORT:         3003,
      SERVICE_NAME: 'booking-service',
    },
  },
  // spancle-finance, spancle-tournament, spancle-academy,
  // spancle-communication, spancle-reporting — not yet deployable (dist/main.js absent).
];

// ── NextJS app definitions ─────────────────────────────────────────────────

const nextApps = [
  {
    name:  'spancle-web-public',
    cwd:   path.join(ROOT, 'apps/public-website'),
    args:  `start --port 3010`,
    env: {
      PORT:                 3010,
      NEXT_PUBLIC_API_URL:  'http://localhost:4000',
    },
  },
  {
    name:  'spancle-web-admin',
    cwd:   path.join(ROOT, 'apps/superadmin-portal'),
    args:  `start --port 3011`,
    env: {
      PORT:                 3011,
      NEXT_PUBLIC_API_URL:  'http://localhost:4000',
      NEXTAUTH_URL:         'http://localhost:3011',
      NEXTAUTH_SECRET:      'CHANGE_ME_NEXTAUTH_SECRET',
    },
  },
  {
    name:  'spancle-web-tenant',
    cwd:   path.join(ROOT, 'apps/tenant-portal'),
    args:  `start --port 3012`,
    env: {
      PORT:                     3012,
      NEXT_PUBLIC_API_URL:      'http://localhost:4000',
      NEXT_PUBLIC_BASE_DOMAIN:  'app.spancle.io',
      NEXTAUTH_URL:             'http://localhost:3012',
      NEXTAUTH_SECRET:          'CHANGE_ME_NEXTAUTH_SECRET',
    },
  },
  {
    name:  'spancle-web-booking',
    cwd:   path.join(ROOT, 'apps/consumer-booking'),
    args:  `start --port 3013`,
    env: {
      PORT:                     3013,
      NEXT_PUBLIC_API_URL:      'http://localhost:4000',
      NEXT_PUBLIC_BASE_DOMAIN:  'book.spancle.io',
      NEXTAUTH_URL:             'http://localhost:3013',
      NEXTAUTH_SECRET:          'CHANGE_ME_NEXTAUTH_SECRET',
    },
  },
];

// ── Assemble ──────────────────────────────────────────────────────────────────

const apps = [
  // NestJS services
  ...nestServices.map((svc) => ({
    ...sharedServiceDefaults,
    ...svc,
    error_file: path.join(LOG_DIR, svc.name, 'error.log'),
    out_file:   path.join(LOG_DIR, svc.name, 'out.log'),
    env: {
      ...sharedServiceDefaults.env,
      ...svc.env,
    },
  })),

  // NextJS apps
  ...nextApps.map((app) => ({
    ...sharedAppDefaults,
    ...app,
    error_file: path.join(LOG_DIR, app.name, 'error.log'),
    out_file:   path.join(LOG_DIR, app.name, 'out.log'),
    env: {
      ...sharedAppDefaults.env,
      ...app.env,
    },
  })),
];

module.exports = { apps };
