'use strict';

/**
 * Spancle Sports OS — lint-staged Configuration
 *
 * Runs on pre-commit hook via Husky.
 * Only processes staged files — keeps commits fast.
 */

module.exports = {
  // TypeScript source files — lint + format
  '**/*.{ts,tsx}': [
    'eslint --fix --max-warnings=0',
    'prettier --write',
  ],

  // JavaScript config files — format only
  '**/*.{js,cjs,mjs}': [
    'prettier --write',
  ],

  // JSON, YAML, Markdown — format only
  '**/*.{json,yaml,yml,md}': [
    'prettier --write',
  ],

  // Package.json files — format only (do NOT lint these)
  '**/package.json': [
    'prettier --write',
  ],
};
