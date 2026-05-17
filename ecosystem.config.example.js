'use strict';

/**
 * ecosystem.config.example.js
 *
 * PM2 ecosystem config example for Spancle Sports OS.
 * Copy to ecosystem.config.js and fill in real values from your secret manager.
 * Never commit ecosystem.config.js with real secrets.
 *
 * Usage:
 *   cp ecosystem.config.example.js ecosystem.config.js
 *   # edit ecosystem.config.js with real values
 *   pm2 start ecosystem.config.js --env production
 */

const BASE = '/var/www/spancle';

module.exports = {
  apps: [

    // ── NestJS Services ──────────────────────────────────────────────────────

    {
      name:               'spancle-identity',
      cwd:                `${BASE}/services/identity-service`,
      script:             'dist/main.js',
      instances:          1,
      exec_mode:          'fork',
      autorestart:        true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV:       'production',
        PORT:           4001,
        SERVICE_NAME:   'identity-service',
        DATABASE_URL:   'postgresql://spancle:<password>@127.0.0.1:5432/spancle_identity',
        REDIS_URL:      'redis://:<password>@127.0.0.1:6379',
        JWT_SECRET:     'replace_with_secret',
        ENCRYPTION_KEY: 'replace_with_32_byte_hex',
        CORS_ORIGINS:   'https://app.example.com,https://admin.example.com',
      },
    },

    {
      name:               'spancle-saas-platform',
      cwd:                `${BASE}/services/saas-platform-service`,
      script:             'dist/main.js',
      instances:          1,
      exec_mode:          'fork',
      autorestart:        true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV:       'production',
        PORT:           4002,
        SERVICE_NAME:   'saas-platform-service',
        DATABASE_URL:   'postgresql://spancle:<password>@127.0.0.1:5432/spancle_saas',
        REDIS_URL:      'redis://:<password>@127.0.0.1:6379',
        JWT_SECRET:     'replace_with_secret',
        ENCRYPTION_KEY: 'replace_with_32_byte_hex',
        CORS_ORIGINS:   'https://app.example.com,https://admin.example.com',
      },
    },

    {
      name:               'spancle-booking',
      cwd:                `${BASE}/services/booking-service`,
      script:             'dist/main.js',
      instances:          1,
      exec_mode:          'fork',
      autorestart:        true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV:       'production',
        PORT:           4003,
        SERVICE_NAME:   'booking-service',
        DATABASE_URL:   'postgresql://spancle:<password>@127.0.0.1:5432/spancle_booking',
        REDIS_URL:      'redis://:<password>@127.0.0.1:6379',
        JWT_SECRET:     'replace_with_secret',
        ENCRYPTION_KEY: 'replace_with_32_byte_hex',
        CORS_ORIGINS:   'https://app.example.com',
      },
    },

    // ── Next.js Apps ─────────────────────────────────────────────────────────

    {
      name:               'spancle-web-public',
      cwd:                `${BASE}/apps/public-website`,
      script:             '.next/standalone/server.js',
      instances:          1,
      exec_mode:          'fork',
      autorestart:        true,
      max_memory_restart: '768M',
      env: {
        NODE_ENV:               'production',
        PORT:                   3000,
        HOSTNAME:               '127.0.0.1',
        NEXTAUTH_SECRET:        'replace_with_secret',
        NEXTAUTH_URL:           'https://example.com',
        NEXT_PUBLIC_API_URL:    'https://api.example.com',
        NEXT_PUBLIC_SITE_URL:   'https://example.com',
        NEXT_PUBLIC_BASE_DOMAIN:'example.com',
      },
    },

    {
      name:               'spancle-web-admin',
      cwd:                `${BASE}/apps/superadmin-portal`,
      script:             '.next/standalone/server.js',
      instances:          1,
      exec_mode:          'fork',
      autorestart:        true,
      max_memory_restart: '768M',
      env: {
        NODE_ENV:            'production',
        PORT:                3001,
        HOSTNAME:            '127.0.0.1',
        NEXTAUTH_SECRET:     'replace_with_secret',
        NEXTAUTH_URL:        'https://manage.example.com',
        NEXT_PUBLIC_API_URL: 'https://api.example.com',
      },
    },

    {
      name:               'spancle-web-tenant',
      cwd:                `${BASE}/apps/tenant-portal`,
      script:             '.next/standalone/server.js',
      instances:          1,
      exec_mode:          'fork',
      autorestart:        true,
      max_memory_restart: '768M',
      env: {
        NODE_ENV:            'production',
        PORT:                3002,
        HOSTNAME:            '127.0.0.1',
        NEXTAUTH_SECRET:     'replace_with_secret',
        NEXTAUTH_URL:        'https://app.example.com',
        NEXT_PUBLIC_API_URL: 'https://api.example.com',
      },
    },

    {
      name:               'spancle-web-booking',
      cwd:                `${BASE}/apps/consumer-booking`,
      script:             '.next/standalone/server.js',
      instances:          1,
      exec_mode:          'fork',
      autorestart:        true,
      max_memory_restart: '768M',
      env: {
        NODE_ENV:            'production',
        PORT:                3003,
        HOSTNAME:            '127.0.0.1',
        NEXTAUTH_SECRET:     'replace_with_secret',
        NEXTAUTH_URL:        'https://book.example.com',
        NEXT_PUBLIC_API_URL: 'https://api.example.com',
      },
    },

  ],
};
