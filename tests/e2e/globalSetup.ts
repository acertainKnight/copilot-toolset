/**
 * Global setup for E2E tests
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';

export default async function globalSetup() {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.COPILOT_MCP_E2E_TEST = 'true';

  // Create isolated test environment
  const e2eTestDir = path.join(tmpdir(), 'copilot-mcp-e2e-tests');
  await fs.mkdir(e2eTestDir, { recursive: true });

  process.env.COPILOT_MCP_E2E_TEST_DIR = e2eTestDir;

  // Create sample projects for testing
  const sampleProjectsDir = path.join(e2eTestDir, 'sample-projects');
  await fs.mkdir(sampleProjectsDir, { recursive: true });

  // Create a sample Node.js project
  const nodeProjectDir = path.join(sampleProjectsDir, 'sample-node-project');
  await fs.mkdir(nodeProjectDir, { recursive: true });

  const packageJson = {
    name: 'sample-node-project',
    version: '1.0.0',
    main: 'index.js',
    scripts: {
      start: 'node index.js',
      test: 'jest'
    },
    dependencies: {
      express: '^4.18.0'
    },
    devDependencies: {
      jest: '^29.0.0'
    }
  };

  await fs.writeFile(
    path.join(nodeProjectDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  await fs.writeFile(
    path.join(nodeProjectDir, 'index.js'),
    `const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Hello from sample project!' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(\`Server running on port \${port}\`);
});
`
  );

  // Create directory structure
  await fs.mkdir(path.join(nodeProjectDir, 'src'), { recursive: true });
  await fs.mkdir(path.join(nodeProjectDir, 'tests'), { recursive: true });

  // Create a sample React project
  const reactProjectDir = path.join(sampleProjectsDir, 'sample-react-project');
  await fs.mkdir(reactProjectDir, { recursive: true });

  const reactPackageJson = {
    name: 'sample-react-project',
    version: '0.1.0',
    private: true,
    dependencies: {
      react: '^18.2.0',
      'react-dom': '^18.2.0'
    },
    devDependencies: {
      '@vitejs/plugin-react': '^4.0.0',
      vite: '^4.4.0'
    },
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview'
    }
  };

  await fs.writeFile(
    path.join(reactProjectDir, 'package.json'),
    JSON.stringify(reactPackageJson, null, 2)
  );

  await fs.mkdir(path.join(reactProjectDir, 'src'), { recursive: true });
  await fs.writeFile(
    path.join(reactProjectDir, 'src/App.jsx'),
    `import React from 'react';

function App() {
  return (
    <div className="App">
      <h1>Sample React Project</h1>
      <p>This is a test React application.</p>
    </div>
  );
}

export default App;
`
  );

  console.log('E2E test environment initialized');
  console.log(`E2E test directory: ${e2eTestDir}`);
  console.log(`Sample projects: ${sampleProjectsDir}`);

  // Store paths for use in tests
  (global as any).__E2E_TEST_CONFIG__ = {
    testDir: e2eTestDir,
    sampleProjectsDir: sampleProjectsDir,
    nodeProjectDir: nodeProjectDir,
    reactProjectDir: reactProjectDir
  };
}