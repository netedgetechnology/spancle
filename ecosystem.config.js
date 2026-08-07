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
        DATABASE_URL: process.env['IDENTITY_DATABASE_URL'] ?? process.env['DATABASE_URL'] ?? '',
        JWT_SECRET:   process.env['JWT_SECRET']   ?? '',
        JWT_ISSUER:   process.env['JWT_ISSUER']   ?? 'spancle-sports-os',
        REDIS_HOST:   process.env['REDIS_HOST']   ?? '127.0.0.1',
        REDIS_PORT:   process.env['REDIS_PORT']   ?? '6379',
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
        CORS_ORIGINS: 'https://spancle.com,https://www.spancle.com,https://manage.spancle.com,https://api.spancle.com',
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
        NODE_ENV:              'production',
        PORT:                  4003,
        SERVICE_NAME:          'booking-service',
        // Required — loaded from server environment (set via .env or shell before pm2 start)
        // DATABASE_URL, JWT_SECRET, JWT_ISSUER, QR_TOKEN_SECRET must be in the server env.
        // Explicitly forwarded here so pm2 includes them on restart:
        DATABASE_URL:          process.env['BOOKING_DATABASE_URL']   ?? '',
        JWT_SECRET:            process.env['JWT_SECRET']             ?? '',
        JWT_ISSUER:            process.env['JWT_ISSUER']             ?? 'spancle-sports-os',
        IDENTITY_SERVICE_URL:  process.env['IDENTITY_SERVICE_URL']   ?? 'http://127.0.0.1:4001',
        QR_TOKEN_SECRET:       process.env['QR_TOKEN_SECRET']        ?? '',
        REDIS_HOST:            process.env['REDIS_HOST']             ?? '127.0.0.1',
        REDIS_PORT:            process.env['REDIS_PORT']             ?? '6379',
        REDIS_PASSWORD:        process.env['REDIS_PASSWORD']         ?? '',
        // ── CORS (required — service throws on startup if NODE_ENV=production and unset)
        CORS_ORIGINS:          process.env['CORS_ORIGINS']           ?? 'https://manage.spancle.com,https://www.spancle.com,https://spancle.com,http://localhost:3000,http://localhost:3001',
        // ── Guest / QR session tokens
        GUEST_SESSION_SECRET:  process.env['GUEST_SESSION_SECRET']   ?? '',
        // ── Payment gateways (set whichever is active; both can coexist)
        PAYMENT_GATEWAY:       process.env['PAYMENT_GATEWAY']        ?? 'stripe',
        STRIPE_SECRET_KEY:     process.env['STRIPE_SECRET_KEY']      ?? '',
        STRIPE_WEBHOOK_SECRET: process.env['STRIPE_WEBHOOK_SECRET']  ?? '',
        STRIPE_CAPTURE_METHOD: process.env['STRIPE_CAPTURE_METHOD']  ?? 'automatic',
        RAZORPAY_KEY_ID:       process.env['RAZORPAY_KEY_ID']        ?? '',
        RAZORPAY_KEY_SECRET:   process.env['RAZORPAY_KEY_SECRET']    ?? '',
        RAZORPAY_WEBHOOK_SECRET: process.env['RAZORPAY_WEBHOOK_SECRET'] ?? '',
        RAZORPAY_CURRENCY:     process.env['RAZORPAY_CURRENCY']      ?? 'INR',
        // ── Webhook processing
        WEBHOOK_SYSTEM_ACTOR_ID:          process.env['WEBHOOK_SYSTEM_ACTOR_ID']          ?? 'system:webhook',
        WEBHOOK_TIMESTAMP_TOLERANCE_MS:   process.env['WEBHOOK_TIMESTAMP_TOLERANCE_MS']   ?? '300000',
        // ── Booking scheduler tuning (all optional — defaults in code)
        BOOKING_RESERVATION_TTL_MINS:     process.env['BOOKING_RESERVATION_TTL_MINS']     ?? '15',
        BOOKING_NO_SHOW_GRACE_MINS:       process.env['BOOKING_NO_SHOW_GRACE_MINS']       ?? '30',
        BOOKING_AUTOCOMPLETE_DELAY_MINS:  process.env['BOOKING_AUTOCOMPLETE_DELAY_MINS']  ?? '60',
        BOOKING_SCHEDULER_BATCH_SIZE:     process.env['BOOKING_SCHEDULER_BATCH_SIZE']     ?? '50',
        WAITLIST_RESERVATION_TTL_MINS:    process.env['WAITLIST_RESERVATION_TTL_MINS']    ?? '30',
        FINANCE_BOOKING_REFUND_JOB_LEASE_SECONDS: process.env['FINANCE_BOOKING_REFUND_JOB_LEASE_SECONDS'] ?? '600',
      },
    },

    // ── Next.js Apps ────────────────────────────────────────────────────────

    {
      name:               'spancle-web-public',
      cwd:                `${BASE}/apps/public-website`,
      script:             '.next/standalone/server.js',
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
        HOSTNAME: '127.0.0.1',
      },
    },

    {
      name:               'spancle-web-admin',
      cwd:                `${BASE}/apps/superadmin-portal`,
      script:             'node_modules/.bin/next',
      args:               'start',
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
        HOSTNAME: '127.0.0.1',
      },
    },

    {
      name:               'spancle-web-tenant',
      cwd:                `${BASE}/apps/tenant-portal`,
      script:             '.next/standalone/server.js',
      instances:          1,
      exec_mode:          'fork',
      autorestart:        true,
      watch:              false,
      max_restarts:       10,
      min_uptime:         '10s',
      max_memory_restart: '768M',
      env: {
        NODE_ENV:                   'production',
        PORT:                       3002,
        HOSTNAME:                   '127.0.0.1',
        // NEXT_PUBLIC_* vars must also be present at BUILD time (pnpm build).
        // These runtime values are used by SSR code paths only.
        NEXT_PUBLIC_API_URL:        process.env['NEXT_PUBLIC_API_URL']     ?? '',
        NEXT_PUBLIC_BOOKING_URL:    process.env['NEXT_PUBLIC_BOOKING_URL'] ?? '',
        BOOKING_SERVICE_URL:        process.env['BOOKING_SERVICE_URL']     ?? 'http://127.0.0.1:4003',
        NEXTAUTH_SECRET:            process.env['NEXTAUTH_SECRET']         ?? '',
        NEXTAUTH_URL:               process.env['NEXTAUTH_URL']            ?? '',
      },
    },

    {
      name:               'spancle-web-booking',
      cwd:                `${BASE}/apps/consumer-booking`,
      script:             '.next/standalone/server.js',
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
        HOSTNAME: '127.0.0.1',
      },
    },

  ],
};
