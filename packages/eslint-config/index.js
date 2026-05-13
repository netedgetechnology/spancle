'use strict';

/**
 * Spancle Sports OS — Shared ESLint Config
 *
 * Consumed by all apps and services:
 * {
 *   "extends": ["@spancle/eslint-config"]
 * }
 *
 * Apps/services add their own framework-specific overrides on top.
 */

module.exports = {
  extends: [require.resolve('../../.eslintrc.js')],
  rules: {
    // Workspace-specific overrides can be added here when needed.
    // Do NOT downgrade error rules to warnings without architectural review.
  },
};
