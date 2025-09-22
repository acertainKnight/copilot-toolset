#!/usr/bin/env tsx

/**
 * Setup script for the Copilot MCP Toolset
 * Initializes the development environment and storage directories
 */

import { mkdir, writeFile, access } from 'fs/promises';
import { join } from 'path';
import { createConfig, validateConfig } from '@/config';
import chalk from 'chalk';
import ora from 'ora';

interface SetupOptions {
  force?: boolean;
  verbose?: boolean;
}

async function ensureDirectory(path: string, description: string): Promise<void> {
  try {
    await access(path);
    console.log(chalk.green(`✓ ${description} exists: ${path}`));
  } catch {
    await mkdir(path, { recursive: true });
    console.log(chalk.blue(`✓ Created ${description}: ${path}`));
  }
}

async function createConfigFile(path: string, content: any, description: string): Promise<void> {
  try {
    await access(path);
    console.log(chalk.yellow(`⚠ ${description} already exists: ${path}`));
  } catch {
    await writeFile(path, JSON.stringify(content, null, 2));
    console.log(chalk.blue(`✓ Created ${description}: ${path}`));
  }
}

async function setupStorageDirectories(config: any): Promise<void> {
  const spinner = ora('Setting up storage directories...').start();

  try {
    await ensureDirectory(config.storage.basePath, 'Base storage directory');
    await ensureDirectory(config.storage.cachePath, 'Cache directory');
    await ensureDirectory(join(config.storage.basePath, 'modes'), 'Chat modes directory');
    await ensureDirectory(join(config.storage.basePath, 'backups'), 'Backups directory');

    spinner.succeed('Storage directories setup complete');
  } catch (error) {
    spinner.fail(`Failed to setup storage directories: ${error}`);
    throw error;
  }
}

async function setupProjectDirectories(): Promise<void> {
  const spinner = ora('Setting up project directories...').start();

  try {
    const projectDirs = [
      'storage',
      'storage/cache',
      'storage/modes',
      'storage/backups',
      'logs',
    ];

    for (const dir of projectDirs) {
      await ensureDirectory(join(process.cwd(), dir), `Project ${dir} directory`);
    }

    spinner.succeed('Project directories setup complete');
  } catch (error) {
    spinner.fail(`Failed to setup project directories: ${error}`);
    throw error;
  }
}

async function setupDatabaseSchema(): Promise<void> {
  const spinner = ora('Setting up database schema...').start();

  try {
    // This would normally initialize the database schema
    // For now, we'll just create a placeholder file
    const schemaPath = join(process.cwd(), 'storage', 'schema.json');
    const schema = {
      version: '1.0.0',
      tables: ['memories', 'projects', 'modes', 'prompts'],
      created_at: new Date().toISOString(),
    };

    await createConfigFile(schemaPath, schema, 'Database schema');
    spinner.succeed('Database schema setup complete');
  } catch (error) {
    spinner.fail(`Failed to setup database schema: ${error}`);
    throw error;
  }
}

async function validateSetup(): Promise<void> {
  const spinner = ora('Validating setup...').start();

  try {
    const config = createConfig();
    validateConfig(config);

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);

    if (majorVersion < 18) {
      throw new Error(`Node.js version ${nodeVersion} is not supported. Please use Node.js 18 or higher.`);
    }

    spinner.succeed(`Setup validation complete (Node.js ${nodeVersion})`);
  } catch (error) {
    spinner.fail(`Setup validation failed: ${error}`);
    throw error;
  }
}

async function main(options: SetupOptions = {}): Promise<void> {
  console.log(chalk.bold.blue('\n🚀 Copilot MCP Toolset Setup\n'));

  try {
    // Load configuration
    const config = createConfig();

    if (options.verbose) {
      console.log(chalk.gray('Configuration:'));
      console.log(chalk.gray(JSON.stringify(config, null, 2)));
      console.log();
    }

    // Setup steps
    await setupProjectDirectories();
    await setupStorageDirectories(config);
    await setupDatabaseSchema();
    await validateSetup();

    console.log(chalk.bold.green('\n✅ Setup completed successfully!\n'));

    // Next steps
    console.log(chalk.bold('Next steps:'));
    console.log(chalk.white('1. Install dependencies: npm install'));
    console.log(chalk.white('2. Build the project: npm run build'));
    console.log(chalk.white('3. Run tests: npm test'));
    console.log(chalk.white('4. Start development: npm run dev'));
    console.log(chalk.white('5. Inspect MCP server: npm run inspect\n'));

  } catch (error) {
    console.error(chalk.red('\n❌ Setup failed:'), error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: SetupOptions = {
  force: args.includes('--force') || args.includes('-f'),
  verbose: args.includes('--verbose') || args.includes('-v'),
};

if (require.main === module) {
  main(options).catch(console.error);
}

export { main as setupProject };