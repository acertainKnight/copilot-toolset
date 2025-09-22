/**
 * Global teardown for integration tests
 */

import * as fs from 'fs/promises';

export default async function globalTeardown() {
  // Clean up test environment
  const testStorageDir = process.env.COPILOT_MCP_TEST_STORAGE;

  if (testStorageDir) {
    try {
      await fs.rm(testStorageDir, { recursive: true, force: true });
      console.log('Integration test cleanup completed');
    } catch (error) {
      console.warn('Failed to clean up test storage:', error);
    }
  }

  // Clean up environment variables
  delete process.env.COPILOT_MCP_TEST;
  delete process.env.COPILOT_MCP_TEST_STORAGE;
}