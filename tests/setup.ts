/**
 * Spancle Sports OS — Global Test Setup
 * tests/setup.ts
 *
 * Executed once before all test suites via jest globalSetup
 * or via setupFilesAfterFramework in per-workspace configs.
 */

// Enforce test environment
if (process.env['NODE_ENV'] !== 'test') {
  process.env['NODE_ENV'] = 'test';
}

// Suppress console.log in tests unless LOG_TESTS=true
if (!process.env['LOG_TESTS']) {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'debug').mockImplementation(() => undefined);
  jest.spyOn(console, 'info').mockImplementation(() => undefined);
  // Keep console.warn and console.error — these are signals during tests
}

// Increase default timeout for integration tests
jest.setTimeout(30_000);

// Global test tenant context — used by tenant isolation tests
export const TEST_TENANT_ID = 'test-tenant-uuid-0000-0000-000000000001';
export const TEST_TENANT_ID_B = 'test-tenant-uuid-0000-0000-000000000002';

// Global test user context
export const TEST_USER_ID = 'test-user-uuid-00000-0000-000000000001';
export const TEST_ADMIN_USER_ID = 'test-admin-uuid-0000-0000-000000000001';

// Reset all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
