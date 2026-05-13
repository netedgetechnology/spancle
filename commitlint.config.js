'use strict';

/**
 * Spancle Sports OS — Commit Message Convention
 *
 * Format: <type>(<scope>): <subject>
 *
 * Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
 * Scopes: auth, tenant, player, team, league, event, analytics, billing, infra, deps
 *
 * Examples:
 *   feat(tenant): add tenant provisioning service
 *   fix(auth): resolve JWT refresh token expiry bug
 *   chore(deps): upgrade NestJS to v11
 *   refactor(player): extract player stats calculation to domain service
 */

module.exports = {
  extends: ['@commitlint/config-conventional'],

  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation only
        'style',    // Formatting, missing semicolons — no logic change
        'refactor', // Code refactoring — no feature or fix
        'perf',     // Performance improvement
        'test',     // Adding or updating tests
        'build',    // Build system or external dependencies
        'ci',       // CI/CD configuration
        'chore',    // Other changes that don't modify src or test
        'revert',   // Reverts a previous commit
        'security', // Security-related changes (Spancle extension)
        'tenant',   // Tenant isolation changes (Spancle extension)
      ],
    ],

    'scope-enum': [
      1,           // Warning only — scopes grow as modules are added
      'always',
      [
        // Infrastructure
        'infra',
        'ci',
        'docker',
        'db',
        'redis',
        'deps',
        'config',
        'monorepo',

        // Platform domains (added incrementally each sprint)
        'auth',
        'tenant',
        'user',
        'player',
        'team',
        'league',
        'season',
        'fixture',
        'event',
        'analytics',
        'billing',
        'notification',
        'media',

        // App layers
        'api-gateway',
        'web',
        'admin',
        'mobile',

        // Shared packages
        'types',
        'utils',
        'ui',
        'sdk',
      ],
    ],

    'subject-case': [2, 'always', 'lower-case'],
    'subject-max-length': [2, 'always', 100],
    'subject-min-length': [2, 'always', 10],
    'body-max-line-length': [2, 'always', 120],
    'header-max-length': [2, 'always', 120],
    'footer-max-line-length': [2, 'always', 120],
  },
};
