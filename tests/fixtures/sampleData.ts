/**
 * Sample data fixtures for testing
 */

import { Memory, MemoryLayer, ChatMode, ProjectContext } from '../../src/types/index.js';

export const sampleMemories: Memory[] = [
  {
    id: 'sample-memory-1',
    content: 'TypeScript is a strongly typed programming language that builds on JavaScript.',
    layer: 'system' as MemoryLayer,
    tags: ['typescript', 'programming', 'javascript'],
    created_at: new Date('2024-01-01T10:00:00Z'),
    accessed_at: new Date('2024-01-01T10:00:00Z'),
    access_count: 1,
    metadata: {
      source: 'documentation',
      confidence: 0.9
    }
  },
  {
    id: 'sample-memory-2',
    content: 'React hooks allow you to use state and other React features without writing a class.',
    layer: 'prompt' as MemoryLayer,
    tags: ['react', 'hooks', 'javascript', 'frontend'],
    created_at: new Date('2024-01-01T11:00:00Z'),
    accessed_at: new Date('2024-01-01T11:30:00Z'),
    access_count: 3,
    metadata: {
      source: 'tutorial',
      confidence: 0.85,
      examples: ['useState', 'useEffect', 'useContext']
    }
  },
  {
    id: 'sample-memory-3',
    content: 'Express.js is a minimal and flexible Node.js web application framework.',
    layer: 'project' as MemoryLayer,
    tags: ['express', 'nodejs', 'backend', 'framework'],
    created_at: new Date('2024-01-01T09:00:00Z'),
    accessed_at: new Date('2024-01-01T09:15:00Z'),
    access_count: 2,
    metadata: {
      source: 'project-context',
      confidence: 0.95,
      version: '4.18.0'
    }
  },
  {
    id: 'sample-memory-4',
    content: 'User prefers functional programming style with immutable data structures.',
    layer: 'preference' as MemoryLayer,
    tags: ['preferences', 'functional-programming', 'immutable'],
    created_at: new Date('2024-01-01T08:00:00Z'),
    accessed_at: new Date('2024-01-01T16:00:00Z'),
    access_count: 5,
    metadata: {
      source: 'user-settings',
      confidence: 1.0,
      priority: 'high'
    }
  },
  {
    id: 'sample-memory-5',
    content: 'MongoDB is a document-oriented NoSQL database that uses JSON-like documents.',
    layer: 'system' as MemoryLayer,
    tags: ['mongodb', 'database', 'nosql', 'json'],
    created_at: new Date('2024-01-01T12:00:00Z'),
    accessed_at: new Date('2024-01-01T12:00:00Z'),
    access_count: 1,
    metadata: {
      source: 'documentation',
      confidence: 0.88
    }
  }
];

export const sampleChatModes: ChatMode[] = [
  {
    name: 'sample-react-expert',
    description: 'Expert in React development and modern frontend practices',
    systemPrompt: 'You are a React expert specializing in modern frontend development. Help with component design, hooks, state management, and performance optimization.',
    tools: ['store_memory', 'retrieve_memory', 'analyze_project_structure'],
    enabled: true,
    builtIn: false,
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
    metadata: {
      specialization: 'frontend',
      framework: 'react',
      experience_level: 'expert'
    }
  },
  {
    name: 'sample-backend-architect',
    description: 'Backend architecture and API design specialist',
    systemPrompt: 'You are a backend architecture expert. Help with API design, database architecture, microservices, and scalability patterns.',
    tools: ['store_memory', 'retrieve_memory', 'init_project'],
    enabled: true,
    builtIn: false,
    model: 'gpt-4',
    temperature: 0.8,
    maxTokens: 2500,
    createdAt: new Date('2024-01-01T11:00:00Z'),
    updatedAt: new Date('2024-01-01T11:30:00Z'),
    metadata: {
      specialization: 'backend',
      focus: 'architecture',
      patterns: ['microservices', 'event-driven', 'clean-architecture']
    }
  },
  {
    name: 'sample-devops-engineer',
    description: 'DevOps and infrastructure automation expert',
    systemPrompt: 'You are a DevOps engineer expert in CI/CD, containerization, cloud infrastructure, and automation.',
    tools: ['store_memory', 'retrieve_memory', 'heal_prompt'],
    enabled: true,
    builtIn: false,
    temperature: 0.6,
    createdAt: new Date('2024-01-01T09:00:00Z'),
    updatedAt: new Date('2024-01-01T09:00:00Z'),
    metadata: {
      specialization: 'devops',
      tools: ['docker', 'kubernetes', 'terraform', 'jenkins']
    }
  }
];

export const sampleProjectContexts = {
  nodejs: {
    type: 'nodejs',
    language: 'TypeScript/JavaScript',
    framework: 'Express.js',
    structure: 'src/\n  controllers/\n  models/\n  routes/\n  middleware/\ntests/',
    dependencies: [
      { name: 'express', version: '^4.18.0', type: 'prod' as const },
      { name: 'typescript', version: '^5.0.0', type: 'dev' as const },
      { name: 'jest', version: '^29.0.0', type: 'dev' as const }
    ],
    scripts: [
      { name: 'start', description: 'Start the production server' },
      { name: 'dev', description: 'Start development server with hot reload' },
      { name: 'test', description: 'Run test suite' },
      { name: 'build', description: 'Build for production' }
    ],
    conventions: 'Use TypeScript for type safety\nFollow Express.js patterns\nImplement proper error handling',
    patterns: 'MVC architecture\nDependency injection\nMiddleware pattern',
    directories: new Map([
      ['src', {
        purpose: 'Source code',
        fileTypes: ['ts', 'js'],
        keyFiles: ['index.ts', 'app.ts'],
        patterns: ['controllers', 'models', 'routes']
      }],
      ['tests', {
        purpose: 'Test files',
        fileTypes: ['test.ts', 'spec.ts'],
        keyFiles: ['setup.ts'],
        patterns: ['unit', 'integration', 'e2e']
      }]
    ]),
    nodeVersion: 'v18.0.0',
    packageManager: 'npm'
  },

  react: {
    type: 'react',
    language: 'TypeScript/JavaScript',
    framework: 'React',
    structure: 'src/\n  components/\n  hooks/\n  pages/\n  utils/\npublic/',
    dependencies: [
      { name: 'react', version: '^18.2.0', type: 'prod' as const },
      { name: 'react-dom', version: '^18.2.0', type: 'prod' as const },
      { name: 'vite', version: '^4.4.0', type: 'dev' as const }
    ],
    scripts: [
      { name: 'dev', description: 'Start Vite development server' },
      { name: 'build', description: 'Build for production' },
      { name: 'preview', description: 'Preview production build' },
      { name: 'test', description: 'Run component tests' }
    ],
    conventions: 'Use functional components with hooks\nFollow React best practices\nUse TypeScript for props',
    patterns: 'Component composition\nCustom hooks for logic reuse\nContext for global state',
    directories: new Map([
      ['src', {
        purpose: 'Source code',
        fileTypes: ['tsx', 'jsx', 'ts', 'js'],
        keyFiles: ['main.tsx', 'App.tsx'],
        patterns: ['components', 'hooks', 'pages']
      }],
      ['public', {
        purpose: 'Static assets',
        fileTypes: ['html', 'css', 'png', 'svg'],
        keyFiles: ['index.html'],
        patterns: ['assets', 'images']
      }]
    ]),
    nodeVersion: 'v18.0.0',
    packageManager: 'npm'
  },

  python: {
    type: 'python',
    language: 'Python',
    framework: 'Flask',
    structure: 'src/\n  models/\n  views/\n  utils/\ntests/',
    dependencies: [
      { name: 'flask', version: '^2.3.0', type: 'prod' as const },
      { name: 'pytest', version: '^7.4.0', type: 'dev' as const },
      { name: 'black', version: '^23.7.0', type: 'dev' as const }
    ],
    scripts: [
      { name: 'run', description: 'Start Flask development server' },
      { name: 'test', description: 'Run test suite with pytest' },
      { name: 'format', description: 'Format code with black' },
      { name: 'lint', description: 'Lint code with flake8' }
    ],
    conventions: 'Follow PEP 8 style guide\nUse type hints\nWrite comprehensive docstrings',
    patterns: 'MVC pattern\nBlueprints for organization\nFactory pattern for app creation',
    directories: new Map([
      ['src', {
        purpose: 'Source code',
        fileTypes: ['py'],
        keyFiles: ['app.py', '__init__.py'],
        patterns: ['models', 'views', 'utils']
      }],
      ['tests', {
        purpose: 'Test files',
        fileTypes: ['py'],
        keyFiles: ['conftest.py'],
        patterns: ['unit', 'integration']
      }]
    ]),
    packageManager: 'pip'
  }
};

export const sampleErrorPatterns = [
  {
    pattern: 'Cannot find module',
    category: 'missing_dependency',
    examples: [
      'Cannot find module \'express\'',
      'Cannot find module \'react\'',
      'Cannot find module \'lodash\''
    ],
    commonSolutions: [
      'Run npm install to install missing dependencies',
      'Check if the module name is correct',
      'Verify the module exists in package.json'
    ]
  },
  {
    pattern: 'Permission denied',
    category: 'file_permissions',
    examples: [
      'EACCES: permission denied, open \'/etc/passwd\'',
      'Permission denied: cannot create directory',
      'Access denied to file system resource'
    ],
    commonSolutions: [
      'Check file permissions with ls -la',
      'Run with appropriate user privileges',
      'Use sudo if administrative access is required'
    ]
  },
  {
    pattern: 'Port already in use',
    category: 'network_conflict',
    examples: [
      'EADDRINUSE: address already in use :::3000',
      'Port 8080 is already in use',
      'listen EADDRINUSE: address already in use'
    ],
    commonSolutions: [
      'Find and kill the process using the port',
      'Use a different port number',
      'Check for other running instances'
    ]
  },
  {
    pattern: 'Syntax error',
    category: 'code_syntax',
    examples: [
      'SyntaxError: Unexpected token',
      'SyntaxError: Invalid or unexpected token',
      'SyntaxError: missing ) after argument list'
    ],
    commonSolutions: [
      'Check for missing brackets or parentheses',
      'Verify proper syntax highlighting in editor',
      'Use a linter to identify syntax issues'
    ]
  }
];

export const sampleSearchQueries = [
  {
    query: 'react hooks',
    expectedResults: ['sample-memory-2'],
    category: 'frontend'
  },
  {
    query: 'typescript',
    expectedResults: ['sample-memory-1'],
    category: 'language'
  },
  {
    query: 'express',
    expectedResults: ['sample-memory-3'],
    category: 'framework'
  },
  {
    query: 'functional programming',
    expectedResults: ['sample-memory-4'],
    category: 'paradigm'
  },
  {
    query: 'database',
    expectedResults: ['sample-memory-5'],
    category: 'database'
  }
];

export const samplePerformanceThresholds = {
  memory: {
    storage: {
      single: 10, // ms per memory
      bulk_100: 500, // ms for 100 memories
      bulk_1000: 3000, // ms for 1000 memories
      bulk_10000: 25000 // ms for 10000 memories
    },
    search: {
      simple: 50, // ms for simple search
      complex: 200, // ms for complex search
      bulk_search: 1000 // ms for multiple searches
    },
    initialization: 2000, // ms for full initialization
    stats_generation: 500 // ms for generating stats
  },
  project: {
    small_init: 3000, // ms for small project initialization
    large_init: 15000, // ms for large project initialization
    concurrent_init: 20000 // ms for multiple concurrent initializations
  },
  chat_modes: {
    creation: 1000, // ms per mode creation
    listing: 500, // ms for listing all modes
    switching: 100, // ms per mode switch
    bulk_operations: 8000 // ms for bulk operations
  },
  error_handling: {
    single_error: 100, // ms per error processing
    pattern_learning: 200, // ms for learning new pattern
    pattern_reuse: 50, // ms for reusing existing pattern
    bulk_errors: 5000 // ms for processing many errors
  },
  integration: {
    simple_workflow: 5000, // ms for simple integrated workflow
    complex_workflow: 30000, // ms for complex integrated workflow
    sustained_load: 120000, // ms for sustained load test
    recovery: 5000 // ms for system recovery
  }
};

export const sampleMCPRequests = {
  tools: {
    list: {
      jsonrpc: '2.0',
      method: 'tools/list',
      id: 'test-tools-list-1'
    },
    call_init_project: {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'init_project',
        arguments: {
          project_path: '/test/project/path'
        }
      },
      id: 'test-init-project-1'
    },
    call_store_memory: {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'store_memory',
        arguments: {
          content: 'Test memory content',
          layer: 'project',
          tags: ['test', 'sample']
        }
      },
      id: 'test-store-memory-1'
    }
  },
  resources: {
    list: {
      jsonrpc: '2.0',
      method: 'resources/list',
      id: 'test-resources-list-1'
    },
    read_memory_stats: {
      jsonrpc: '2.0',
      method: 'resources/read',
      params: {
        uri: 'memory://stats'
      },
      id: 'test-memory-stats-1'
    }
  },
  prompts: {
    list: {
      jsonrpc: '2.0',
      method: 'prompts/list',
      id: 'test-prompts-list-1'
    },
    get_memory_context: {
      jsonrpc: '2.0',
      method: 'prompts/get',
      params: {
        name: 'memory_context',
        arguments: {
          task_type: 'testing'
        }
      },
      id: 'test-memory-context-1'
    }
  }
};

export const sampleProjectStructures = {
  nodejs_express: {
    'package.json': JSON.stringify({
      name: 'sample-express-app',
      version: '1.0.0',
      main: 'dist/index.js',
      scripts: {
        start: 'node dist/index.js',
        dev: 'nodemon src/index.ts',
        build: 'tsc',
        test: 'jest'
      },
      dependencies: {
        express: '^4.18.0',
        cors: '^2.8.5',
        helmet: '^7.0.0'
      },
      devDependencies: {
        '@types/express': '^4.17.0',
        '@types/node': '^20.0.0',
        nodemon: '^3.0.0',
        typescript: '^5.0.0',
        jest: '^29.0.0'
      }
    }, null, 2),
    'tsconfig.json': JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'commonjs',
        outDir: './dist',
        strict: true,
        esModuleInterop: true
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist']
    }, null, 2),
    'src/index.ts': `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Sample Express API' });
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`,
    'src/routes/users.ts': `import { Router } from 'express';

const router = Router();

router.get('/users', (req, res) => {
  res.json({ users: [] });
});

export default router;`
  },

  react_vite: {
    'package.json': JSON.stringify({
      name: 'sample-react-app',
      private: true,
      version: '0.1.0',
      scripts: {
        dev: 'vite',
        build: 'tsc && vite build',
        preview: 'vite preview'
      },
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0'
      },
      devDependencies: {
        '@types/react': '^18.2.0',
        '@types/react-dom': '^18.2.0',
        '@vitejs/plugin-react': '^4.0.0',
        typescript: '^5.0.0',
        vite: '^4.4.0'
      }
    }, null, 2),
    'vite.config.ts': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`,
    'src/main.tsx': `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,
    'src/App.tsx': `import React from 'react';

function App() {
  return (
    <div className="App">
      <h1>Sample React Application</h1>
      <p>Built with Vite and TypeScript</p>
    </div>
  );
}

export default App;`
  }
};