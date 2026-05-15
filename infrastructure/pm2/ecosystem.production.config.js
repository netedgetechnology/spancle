/**
 * PM2 Ecosystem Configuration — Production
 * infrastructure/pm2/ecosystem.production.config.js
 *
 * Production-hardened PM2 config for single Ubuntu server deployment.
 *
 * Process model:
 *   NestJS services  → fork mode, 1 instance each (single server constraint)
 *                      Switch to cluster mode when moving to multi-core VMs
 *   NextJS apps      → fork mode, 1 instance each
 *
 * Memory budgets (single server, 8GB RAM assumed):
 *   8 NestJS services × 384MB  = 3GB
 *   4 NextJS apps    × 512MB   = 2GB
 *   OS + PostgreSQL + Redis    = ~2GB
 *   Total                      = ~7GB (leaves ~1GB headroom)
 *
 * Scaling path:
 *   - Increase instances to max_instances when moving to dedicated service VMs
 *   - Switch NestJS to cluster mode when CPU-bound (exec_mode: 'cluster')
 *   - Add load balancer upstream in nginx when running 2+ instances
 *
 * Deploy:
 *   pm2 start infrastructure/pm2/ecosystem.production.config.js --env production
 *   pm2 save
 *   pm2 startup systemd   (generates systemd unit — run as root)
 */

'use strict';

const base   = require('./ecosystem.config');
const path   = require('path');

const ENV_FILE  = '/etc/spancle/.env.production';
const LOG_DIR   = '/var/log/spancle';

// How many CPU cores to use when running in cluster mode
// Set to 1 for single-server modular monolith
// Increase when scaling to dedicated service hosts
const NEST_INSTANCES = 1;
const NEXT_INSTANCES = 1;

const productionServiceOverride = {
  instances:          NEST_INSTANCES,
  exec_mode:          'fork',         // Switch to 'cluster' for multi-core scale
  max_memory_restart: '384M',
  max_restarts:       10,
  min_uptime:         '15s',
  restart_delay:      5000,
  // Kill timeout — give in-flight requests time to complete
  kill_timeout:       10000,
};

const productionAppOverride = {
  instances:          NEXT_INSTANCES,
  exec_mode:          'fork',
  max_memory_restart: '512M',
  max_restarts:       10,
  min_uptime:         '15s',
  restart_delay:      5000,
  kill_timeout:       15000,
};

const apps = base.apps.map((app) => {
  const isNextApp = typeof app.script === 'string' && app.script.includes('standalone/server.js');
  const override  = isNextApp ? productionAppOverride : productionServiceOverride;

  return {
    ...app,
    ...override,

    env_file: ENV_FILE,

    env: {
      ...app.env,
      NODE_ENV:  'production',
      LOG_LEVEL: 'error',
      ...(isNextApp ? {
        NEXT_TELEMETRY_DISABLED: '1',
      } : {}),
    },

    // Log configuration
    error_file:      path.join(LOG_DIR, app.name, 'error.log'),
    out_file:        path.join(LOG_DIR, app.name, 'out.log'),
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs:      false,

    // Graceful shutdown — allow in-flight requests to complete
    listen_timeout:  10000,

    // Source maps — for readable stack traces in production
    source_map_support: true,

    // Node.js flags — increase heap for large tenants
    node_args: [
      '--max-old-space-size=256',  // 256MB per NestJS process
    ],
  };
});

module.exports = { apps };
