'use strict';

const BASE = '/var/www/spancle';

module.exports = {
  apps: [

    // ── NestJS Services ─────────────────────────────────────────────────────

    {
      name:               'spancle-identity',
      cwd:                `${BASE}/services/identity-service`,
      script:             'dist/main.js',
      instances:          1,
      exec_mode:          'fork',
      autorestart:        true,
      watch:              false,
      max_restarts:       10,
      min_uptime:         '5s',
      max_memory_restart: '512M',
      env: {
        NODE_ENV:     'production',
        PORT:         4001,
        SERVICE_NAME: 'identity-service',
      },
    },

    {
      name:               'spancle-saas-platform',
      cwd:                `${BASE}/services/saas-platform-service`,
      script:             'dist/main.js',
      instances:          1,
      exec_mode:          'fork',
      autorestart:        true,
      watch:              false,
      max_restarts:       10,
      min_uptime:         '5s',
      max_memory_restart: '512M',
      env: {
        NODE_ENV:     'production',
        PORT:         4002,
        SERVICE_NAME: 'saas-platform-service',
      },
    },

    {
      name:               'spancle-booking',
      cwd:                `${BASE}/services/booking-service`,
      script:             'dist/main.js',
      instances:          1,
      exec_mode:          'fork',
      autorestart:        true,
      watch:              false,
      max_restarts:       10,
      min_uptime:         '5s',
      max_memory_restart: '512M',
      env: {
        NODE_ENV:     'production',
        PORT:         4003,
        SERVICE_NAME: 'booking-service',
      },
    },

    // ── Next.js Apps ────────────────────────────────────────────────────────

    {
      name:               'spancle-web-public',
      cwd:                `${BASE}/apps/public-website`,
      script:             'pnpm',
      args:               'start',
      interpreter:        'none',
      instances:          1,
      exec_mode:          'fork',
      autorestart:        true,
      watch:              false,
      max_restarts:       10,
      min_uptime:         '10s',
      max_memory_restart: '768M',
      env: {
        NODE_ENV: 'production',
        PORT:     3000,
      },
    },

    {
      name:               'spancle-web-admin',
      cwd:                `${BASE}/apps/superadmin-portal`,
      script:             'pnpm',
      args:               'start',
      interpreter:        'none',
      instances:          1,
      exec_mode:          'fork',
      autorestart:        true,
      watch:              false,
      max_restarts:       10,
      min_uptime:         '10s',
      max_memory_restart: '768M',
      env: {
        NODE_ENV: 'production',
        PORT:     3001,
      },
    },

    {
      name:               'spancle-web-tenant',
      cwd:                `${BASE}/apps/tenant-portal`,
      script:             'pnpm',
      args:               'start',
      interpreter:        'none',
      instances:          1,
      exec_mode:          'fork',
      autorestart:        true,
      watch:              false,
      max_restarts:       10,
      min_uptime:         '10s',
      max_memory_restart: '768M',
      env: {
        NODE_ENV: 'production',
        PORT:     3002,
      },
    },

    {
      name:               'spancle-web-booking',
      cwd:                `${BASE}/apps/consumer-booking`,
      script:             'pnpm',
      args:               'start',
      interpreter:        'none',
      instances:          1,
      exec_mode:          'fork',
      autorestart:        true,
      watch:              false,
      max_restarts:       10,
      min_uptime:         '10s',
      max_memory_restart: '768M',
      env: {
        NODE_ENV: 'production',
        PORT:     3003,
      },
    },

  ],
};
