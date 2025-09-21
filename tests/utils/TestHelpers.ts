/**
 * Test utilities and helpers for Copilot MCP Toolset
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

import {
  Memory,
  MemoryLayer,
  ProjectContext,
  ChatMode,
  ChatModeCreateRequest,
  MemoryStats,
  ServerConfig,
  StoragePaths
} from '../../src/types/index.js';

/**
 * Creates a temporary directory for testing
 */
export async function createTempDir(prefix = 'copilot-mcp-test-'): Promise<string> {
  const tempDir = path.join(tmpdir(), prefix + randomBytes(8).toString('hex'));
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
}

/**
 * Cleanup temporary directory
 */
export async function cleanupTempDir(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors in tests
  }
}

/**
 * Create test storage paths configuration
 */
export async function createTestStoragePaths(baseDir?: string): Promise<StoragePaths> {
  const root = baseDir || await createTempDir();

  const paths: StoragePaths = {
    root,
    database: path.join(root, 'database'),
    cache: path.join(root, 'cache'),
    modeDefinitions: path.join(root, 'modes'),
    projectContexts: path.join(root, 'projects'),
    backups: path.join(root, 'backups'),
    logs: path.join(root, 'logs')
  };

  // Create all directories
  for (const dirPath of Object.values(paths)) {
    if (dirPath !== root) {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  return paths;
}

/**
 * Create test server configuration
 */
export async function createTestServerConfig(): Promise<ServerConfig> {
  const storage = await createTestStoragePaths();

  return {
    name: 'test-copilot-mcp-server',
    version: '1.0.0-test',
    storage,
    logging: {
      level: 'error', // Reduce noise in tests
      file: path.join(storage.logs, 'test.log'),
      maxSize: 1024 * 1024, // 1MB
      maxFiles: 2,
      console: false
    },
    security: {
      encryptStorage: false,
      validateInputs: true,
      sandboxExecution: true,
      allowedPaths: [storage.root],
      maxFileSize: 1024 * 1024 // 1MB
    },
    performance: {
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
      cacheSize: 50,
      queryTimeout: 5000,
      backgroundTaskLimit: 2
    }
  };
}

/**
 * Create test logger that captures output
 */
export function createTestLogger(): {
  logger: any;
  logs: Array<{ level: string; message: string; meta?: any }>;
} {
  const logs: Array<{ level: string; message: string; meta?: any }> = [];

  const logger = {
    debug: (message: string, meta?: any) => logs.push({ level: 'debug', message, meta }),
    info: (message: string, meta?: any) => logs.push({ level: 'info', message, meta }),
    warn: (message: string, meta?: any) => logs.push({ level: 'warn', message, meta }),
    error: (message: string, error?: Error, meta?: any) => {
      logs.push({ level: 'error', message, meta: { error, ...meta } });
    }
  };

  return { logger, logs };
}

/**
 * Create mock memory with realistic data
 */
export function createMockMemory(overrides: Partial<Memory> = {}): Memory {
  const defaults: Memory = {
    id: `mock-memory-${randomBytes(4).toString('hex')}`,
    content: 'This is mock memory content for testing',
    layer: 'project' as MemoryLayer,
    tags: ['test', 'mock'],
    created_at: new Date(),
    accessed_at: new Date(),
    access_count: 1,
    metadata: {
      source: 'test',
      confidence: 0.8
    }
  };

  return { ...defaults, ...overrides };
}

/**
 * Create mock memory stats
 */
export function createMockMemoryStats(overrides: Partial<MemoryStats> = {}): MemoryStats {
  const defaults: MemoryStats = {
    core_memory_size: 10,
    warm_storage_count: 25,
    cold_storage_count: 100,
    total_access_count: 500,
    last_cleanup: new Date(),
    storage_size_bytes: 1024 * 50 // 50KB
  };

  return { ...defaults, ...overrides };
}

/**
 * Create mock project context
 */
export function createMockProjectContext(overrides: Partial<ProjectContext> = {}): any {
  const defaults = {
    type: 'nodejs',
    language: 'TypeScript/JavaScript',
    framework: 'Express.js',
    structure: 'src/\n  components/\n  utils/\n  types/',
    dependencies: [
      { name: 'express', version: '^4.18.0', type: 'prod' as const },
      { name: 'typescript', version: '^5.0.0', type: 'dev' as const }
    ],
    scripts: [
      { name: 'build', description: 'Build the project' },
      { name: 'test', description: 'Run tests' }
    ],
    conventions: 'Use functional programming patterns\nFollow ESLint rules',
    patterns: 'MVC architecture\nDependency injection',
    directories: new Map([
      ['src', {
        purpose: 'Source code',
        fileTypes: ['ts', 'js'],
        keyFiles: ['index.ts'],
        patterns: ['components', 'utils']
      }]
    ]),
    nodeVersion: 'v18.0.0',
    packageManager: 'npm'
  };

  return { ...defaults, ...overrides };
}

/**
 * Create mock chat mode
 */
export function createMockChatMode(overrides: Partial<ChatMode> = {}): ChatMode {
  const defaults: ChatMode = {
    name: `test-mode-${randomBytes(4).toString('hex')}`,
    description: 'Test chat mode for automated testing',
    systemPrompt: 'You are a test assistant for the Copilot MCP Toolset test suite.',
    tools: ['store_memory', 'retrieve_memory', 'analyze_project_structure'],
    enabled: true,
    builtIn: false,
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000,
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {
      testMode: true
    }
  };

  return { ...defaults, ...overrides };
}

/**
 * Create mock chat mode request
 */
export function createMockChatModeRequest(overrides: Partial<ChatModeCreateRequest> = {}): ChatModeCreateRequest {
  const defaults: ChatModeCreateRequest = {
    name: `test-request-${randomBytes(4).toString('hex')}`,
    description: 'Test mode request for automated testing',
    systemPrompt: 'You are a test mode for the test suite.',
    tools: ['store_memory', 'retrieve_memory'],
    temperature: 0.7,
    metadata: {
      testRequest: true
    }
  };

  return { ...defaults, ...overrides };
}

/**
 * Create a mock project directory structure
 */
export async function createMockProject(baseDir: string, type: 'nodejs' | 'python' | 'react' = 'nodejs'): Promise<string> {
  const projectDir = path.join(baseDir, `mock-project-${type}`);
  await fs.mkdir(projectDir, { recursive: true });

  switch (type) {
    case 'nodejs':
      await createNodeJSProject(projectDir);
      break;
    case 'python':
      await createPythonProject(projectDir);
      break;
    case 'react':
      await createReactProject(projectDir);
      break;
  }

  return projectDir;
}

async function createNodeJSProject(projectDir: string): Promise<void> {
  // Create package.json
  const packageJson = {
    name: 'mock-nodejs-project',
    version: '1.0.0',
    main: 'dist/index.js',
    scripts: {
      build: 'tsc',
      test: 'jest',
      start: 'node dist/index.js'
    },
    dependencies: {
      express: '^4.18.0',
      cors: '^2.8.5'
    },
    devDependencies: {
      typescript: '^5.0.0',
      '@types/node': '^20.0.0',
      '@types/express': '^4.17.0',
      jest: '^29.0.0'
    }
  };

  await fs.writeFile(
    path.join(projectDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Create tsconfig.json
  const tsConfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'commonjs',
      outDir: './dist',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist']
  };

  await fs.writeFile(
    path.join(projectDir, 'tsconfig.json'),
    JSON.stringify(tsConfig, null, 2)
  );

  // Create directory structure
  await fs.mkdir(path.join(projectDir, 'src'), { recursive: true });
  await fs.mkdir(path.join(projectDir, 'src/routes'), { recursive: true });
  await fs.mkdir(path.join(projectDir, 'src/middleware'), { recursive: true });
  await fs.mkdir(path.join(projectDir, 'tests'), { recursive: true });

  // Create some source files
  await fs.writeFile(
    path.join(projectDir, 'src/index.ts'),
    `import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Mock API Server' });
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
`
  );

  await fs.writeFile(
    path.join(projectDir, 'src/routes/users.ts'),
    `import { Router } from 'express';

const router = Router();

router.get('/users', (req, res) => {
  res.json({ users: [] });
});

export default router;
`
  );
}

async function createPythonProject(projectDir: string): Promise<void> {
  // Create requirements.txt
  const requirements = `flask==2.3.0
requests==2.31.0
pytest==7.4.0
black==23.7.0
mypy==1.5.0
`;

  await fs.writeFile(path.join(projectDir, 'requirements.txt'), requirements);

  // Create setup.py
  const setupPy = `from setuptools import setup, find_packages

setup(
    name="mock-python-project",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "flask==2.3.0",
        "requests==2.31.0",
    ],
    python_requires=">=3.8",
)
`;

  await fs.writeFile(path.join(projectDir, 'setup.py'), setupPy);

  // Create directory structure
  await fs.mkdir(path.join(projectDir, 'src'), { recursive: true });
  await fs.mkdir(path.join(projectDir, 'tests'), { recursive: true });

  // Create main application
  await fs.writeFile(
    path.join(projectDir, 'src/app.py'),
    `from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/')
def hello():
    return jsonify({"message": "Mock Python API"})

@app.route('/users')
def users():
    return jsonify({"users": []})

if __name__ == '__main__':
    app.run(debug=True)
`
  );
}

async function createReactProject(projectDir: string): Promise<void> {
  // Create package.json for React project
  const packageJson = {
    name: 'mock-react-project',
    version: '0.1.0',
    private: true,
    dependencies: {
      react: '^18.2.0',
      'react-dom': '^18.2.0',
      'react-router-dom': '^6.8.0',
      '@types/react': '^18.2.0',
      '@types/react-dom': '^18.2.0'
    },
    devDependencies: {
      '@vitejs/plugin-react': '^4.0.0',
      typescript: '^5.0.0',
      vite: '^4.4.0',
      '@types/node': '^20.0.0'
    },
    scripts: {
      dev: 'vite',
      build: 'tsc && vite build',
      preview: 'vite preview',
      test: 'vitest'
    }
  };

  await fs.writeFile(
    path.join(projectDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Create directory structure
  await fs.mkdir(path.join(projectDir, 'src'), { recursive: true });
  await fs.mkdir(path.join(projectDir, 'src/components'), { recursive: true });
  await fs.mkdir(path.join(projectDir, 'src/hooks'), { recursive: true });
  await fs.mkdir(path.join(projectDir, 'public'), { recursive: true });

  // Create React components
  await fs.writeFile(
    path.join(projectDir, 'src/App.tsx'),
    `import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
`
  );

  await fs.writeFile(
    path.join(projectDir, 'src/components/Home.tsx'),
    `import React from 'react';

const Home: React.FC = () => {
  return (
    <div>
      <h1>Mock React Application</h1>
      <p>This is a test React component.</p>
    </div>
  );
};

export default Home;
`
  );
}

/**
 * Wait for a condition to be true with timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Create performance measurement helper
 */
export class PerformanceMeasurer {
  private measurements: Map<string, number[]> = new Map();

  start(label: string): () => number {
    const startTime = process.hrtime.bigint();

    return () => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

      if (!this.measurements.has(label)) {
        this.measurements.set(label, []);
      }
      this.measurements.get(label)!.push(duration);

      return duration;
    };
  }

  getStats(label: string): { avg: number; min: number; max: number; count: number } | null {
    const measurements = this.measurements.get(label);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const avg = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
    const min = Math.min(...measurements);
    const max = Math.max(...measurements);
    const count = measurements.length;

    return { avg, min, max, count };
  }

  reset(label?: string): void {
    if (label) {
      this.measurements.delete(label);
    } else {
      this.measurements.clear();
    }
  }
}

/**
 * Memory leak detection helper
 */
export class MemoryTracker {
  private baseline: number = 0;
  private checkpoints: Map<string, number> = new Map();

  setBaseline(): void {
    this.baseline = process.memoryUsage().heapUsed;
  }

  checkpoint(label: string): void {
    this.checkpoints.set(label, process.memoryUsage().heapUsed);
  }

  getMemoryDiff(label?: string): number {
    const current = process.memoryUsage().heapUsed;
    const reference = label ? this.checkpoints.get(label) ?? this.baseline : this.baseline;
    return current - reference;
  }

  forceGC(): void {
    if (global.gc) {
      global.gc();
    }
  }
}

/**
 * MCP Protocol test helpers
 */
export class MCPTestHelper {
  static createRequest(method: string, params: any = {}, id: string | number = 1): any {
    return {
      jsonrpc: '2.0',
      method,
      params,
      id
    };
  }

  static createResponse(result: any, id: string | number = 1): any {
    return {
      jsonrpc: '2.0',
      result,
      id
    };
  }

  static createErrorResponse(code: number, message: string, id: string | number = 1): any {
    return {
      jsonrpc: '2.0',
      error: { code, message },
      id
    };
  }

  static validateResponse(response: any): boolean {
    return (
      response &&
      response.jsonrpc === '2.0' &&
      (response.result !== undefined || response.error !== undefined) &&
      response.id !== undefined
    );
  }
}