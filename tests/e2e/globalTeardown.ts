/**
 * Global teardown for E2E tests
 */

import * as fs from 'fs/promises';

export default async function globalTeardown() {
  const e2eTestDir = process.env.COPILOT_MCP_E2E_TEST_DIR;

  if (e2eTestDir) {
    try {
      await fs.rm(e2eTestDir, { recursive: true, force: true });
      console.log('E2E test cleanup completed');
    } catch (error) {
      console.warn('Failed to clean up E2E test directory:', error);
    }
  }

  // Clean up environment variables
  delete process.env.COPILOT_MCP_E2E_TEST;
  delete process.env.COPILOT_MCP_E2E_TEST_DIR;

  // Clean up global test config
  delete (global as any).__E2E_TEST_CONFIG__;
}