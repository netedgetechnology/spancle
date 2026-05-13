/**
 * PM2 Ecosystem Configuration — Staging
 * infrastructure/pm2/ecosystem.staging.config.js
 *
 * Extends base ecosystem.config.js with staging-specific overrides:
 *   - NODE_ENV = staging
 *   - env_file pointed to /etc/spancle/.env.staging
 *   - Single instance per process (no cluster)
 *   - warn-level logging (less noise than dev, more than prod)
 *   - Moderate memory limits
 *
 * Deploy:
 *   pm2 start infrastructure/pm2/ecosystem.staging.config.js --env staging
 *   pm2 save
 *   pm2 startup
 */

'use strict';

const base   = require('./ecosystem.config');
const path   = require('path');

const ENV_FILE      = '/etc/spancle/.env.staging';
const LOG_DIR       = '/var/log/spancle';
const ROOT          = path.resolve(__dirname, '../..');

// Staging overrides applied to every app
const stagingOverride = {
  instances:          1,
  exec_mode:          'fork',
  max_memory_restart: '512M',
  max_restarts:       5,
  min_uptime:         '10s',
  restart_delay:      3000,
};

const apps = base.apps.map((app) => {
  const isNextApp = app.script === 'node_modules/.bin/next';

  return {
    ...app,
    ...stagingOverride,

    // PM2 env_file — loads /etc/spancle/.env.staging before process.env
    env_file: ENV_FILE,

    // Staging env vars — override base
    env: {
      ...app.env,
      NODE_ENV:              'staging',
      LOG_LEVEL:             'warn',
      // NextJS apps need absolute NEXTAUTH_URL in staging
      ...(isNextApp ? {
        NEXTAUTH_URL: `https://staging.spancle.io`,
      } : {}),
    },

    // Structured log rotation — logrotate handles the actual rotation
    error_file: path.join(LOG_DIR, app.name, 'error.log'),
    out_file:   path.join(LOG_DIR, app.name, 'out.log'),
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: false,
  };
});

module.exports = { apps };
