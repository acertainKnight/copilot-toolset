/**
 * Logging utility for the Copilot MCP Toolset
 */

import { Logger } from '../types/index.js';

export class ConsoleLogger implements Logger {
  constructor(private prefix = '[CopilotMCP]') {}

  debug(message: string, meta?: any): void {
    console.debug(`${this.prefix} DEBUG: ${message}`, meta || '');
  }

  info(message: string, meta?: any): void {
    console.info(`${this.prefix} INFO: ${message}`, meta || '');
  }

  warn(message: string, meta?: any): void {
    console.warn(`${this.prefix} WARN: ${message}`, meta || '');
  }

  error(message: string, error?: Error, meta?: any): void {
    console.error(`${this.prefix} ERROR: ${message}`, error?.message || '', meta || '');
  }
}

export function createLogger(prefix?: string): Logger {
  return new ConsoleLogger(prefix);
}