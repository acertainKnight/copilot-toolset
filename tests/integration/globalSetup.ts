/**
 * Global setup for integration tests
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';

export default async function globalSetup() {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.COPILOT_MCP_TEST = 'true';

  // Create test directories
  const testStorageDir = path.join(tmpdir(), 'copilot-mcp-integration-tests');
  await fs.mkdir(testStorageDir, { recursive: true });

  process.env.COPILOT_MCP_TEST_STORAGE = testStorageDir;

  console.log('Integration test environment initialized');
  console.log(`Test storage: ${testStorageDir}`);
}