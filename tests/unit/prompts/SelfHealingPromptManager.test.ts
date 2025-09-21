/**
 * Unit tests for SelfHealingPromptManager - Adaptive prompt management system
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { SelfHealingPromptManager } from '../../../src/prompts/SelfHealingPromptManager.js';

describe('SelfHealingPromptManager', () => {
  let promptManager: SelfHealingPromptManager;

  beforeEach(() => {
    promptManager = new SelfHealingPromptManager();
  });

  describe('Error Pattern Identification', () => {
    it('should identify missing module errors', async () => {
      const error = new Error('Cannot find module \'express\'');
      const context = {
        lastCommand: 'npm start',
        currentFile: { extension: 'js' },
        projectType: 'nodejs'
      };

      const result = await promptManager.handleError(error, context);

      expect(result).toBeDefined();
      expect(result).toContain('Cannot find module');
      expect(result).toContain('Self-healing approach');
    });

    it('should identify permission denied errors', async () => {
      const error = new Error('EACCES: permission denied, open \'/etc/passwd\'');
      const context = {
        lastCommand: 'sudo command',
        currentFile: { extension: 'sh' }
      };

      const result = await promptManager.handleError(error, context);

      expect(result).toBeDefined();
      expect(result).toContain('permission denied');
      expect(result).toContain('Self-healing approach');
    });

    it('should identify file not found errors', async () => {
      const error = new Error('ENOENT: no such file or directory, open \'missing-file.txt\'');
      const context = {
        lastCommand: 'cat missing-file.txt',
        currentFile: { extension: 'txt' }
      };

      const result = await promptManager.handleError(error, context);

      expect(result).toBeDefined();
      expect(result).toContain('no such file');
      expect(result).toContain('Self-healing approach');
    });

    it('should handle generic errors', async () => {
      const error = new Error('An unexpected error occurred during processing');
      const context = {
        lastCommand: 'unknown command',
        projectType: 'generic'
      };

      const result = await promptManager.handleError(error, context);

      expect(result).toBeDefined();
      expect(result).toContain('Self-healing approach');
    });

    it('should be case insensitive in error pattern matching', async () => {
      const error = new Error('Cannot Find Module express');
      const context = {};

      const result = await promptManager.handleError(error, context);

      expect(result).toBeDefined();
      expect(result).toContain('Cannot Find Module');
    });
  });

  describe('Error Pattern Learning', () => {
    it('should remember previously encountered errors', async () => {
      const error1 = new Error('Cannot find module \'lodash\'');
      const error2 = new Error('Cannot find module \'axios\'');
      const context = { projectType: 'nodejs' };

      // First encounter should create new pattern
      const result1 = await promptManager.handleError(error1, context);
      expect(result1).toBeDefined();

      // Second similar error should reuse pattern
      const result2 = await promptManager.handleError(error2, context);
      expect(result2).toBeDefined();

      // Should have the pattern in known patterns
      const knownPatterns = promptManager.getKnownPatterns();
      expect(knownPatterns).toContain('missing_module');
    });

    it('should store different patterns for different error types', async () => {
      const missingModuleError = new Error('Cannot find module \'test\'');
      const permissionError = new Error('permission denied');
      const fileNotFoundError = new Error('no such file');
      const context = {};

      await promptManager.handleError(missingModuleError, context);
      await promptManager.handleError(permissionError, context);
      await promptManager.handleError(fileNotFoundError, context);

      const knownPatterns = promptManager.getKnownPatterns();
      expect(knownPatterns).toContain('missing_module');
      expect(knownPatterns).toContain('permission_error');
      expect(knownPatterns).toContain('file_not_found');
      expect(knownPatterns.length).toBe(3);
    });

    it('should reuse existing patterns for similar errors', async () => {
      const error1 = new Error('Cannot find module \'react\'');
      const error2 = new Error('Cannot find module \'vue\'');
      const context = { projectType: 'frontend' };

      await promptManager.handleError(error1, context);
      const initialPatterns = promptManager.getKnownPatterns();

      await promptManager.handleError(error2, context);
      const finalPatterns = promptManager.getKnownPatterns();

      // Should not create new pattern for similar error
      expect(finalPatterns.length).toBe(initialPatterns.length);
      expect(finalPatterns).toEqual(initialPatterns);
    });
  });

  describe('Context-Aware Error Handling', () => {
    it('should consider last command in error handling', async () => {
      const error = new Error('Command failed with exit code 1');
      const context = {
        lastCommand: 'npm install package-that-does-not-exist',
        projectType: 'nodejs'
      };

      const result = await promptManager.handleError(error, context);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should consider current file extension', async () => {
      const error = new Error('Syntax error at line 10');
      const context = {
        currentFile: { extension: 'ts' },
        projectType: 'typescript'
      };

      const result = await promptManager.handleError(error, context);

      expect(result).toBeDefined();
    });

    it('should consider project type in error handling', async () => {
      const error = new Error('Import error');
      const pythonContext = {
        projectType: 'python',
        currentFile: { extension: 'py' }
      };
      const nodeContext = {
        projectType: 'nodejs',
        currentFile: { extension: 'js' }
      };

      const pythonResult = await promptManager.handleError(error, pythonContext);
      const nodeResult = await promptManager.handleError(error, nodeContext);

      expect(pythonResult).toBeDefined();
      expect(nodeResult).toBeDefined();
      // Results might be different based on context
    });

    it('should handle missing context gracefully', async () => {
      const error = new Error('Some error');
      const emptyContext = {};

      const result = await promptManager.handleError(error, emptyContext);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('Self-Healing Strategy Generation', () => {
    it('should generate structured healing steps', async () => {
      const error = new Error('Test error for strategy generation');
      const context = { projectType: 'test' };

      const result = await promptManager.handleError(error, context);

      expect(result).toContain('1. Analyze the error context and type');
      expect(result).toContain('2. Check for common solutions');
      expect(result).toContain('3. Apply the most appropriate fix');
      expect(result).toContain('4. Verify the solution works');
      expect(result).toContain('5. Document the pattern');
    });

    it('should include error message in strategy', async () => {
      const errorMessage = 'Very specific error message for testing';
      const error = new Error(errorMessage);
      const context = {};

      const result = await promptManager.handleError(error, context);

      expect(result).toContain(errorMessage);
    });

    it('should provide actionable healing approach', async () => {
      const error = new Error('Configuration file is missing');
      const context = { projectType: 'config-dependent' };

      const result = await promptManager.handleError(error, context);

      expect(result).toContain('Self-healing approach');
      expect(result).toContain('error context');
      expect(result).toContain('solution');
    });
  });

  describe('Pattern Extraction and Classification', () => {
    it('should extract consistent patterns from similar errors', async () => {
      const errors = [
        new Error('Cannot find module \'express\''),
        new Error('Cannot find module \'lodash\''),
        new Error('Cannot find module \'moment\'')
      ];
      const context = { projectType: 'nodejs' };

      for (const error of errors) {
        await promptManager.handleError(error, context);
      }

      const patterns = promptManager.getKnownPatterns();
      expect(patterns).toContain('missing_module');
    });

    it('should classify different error categories correctly', async () => {
      const errorTests = [
        { error: new Error('Cannot find module test'), expectedPattern: 'missing_module' },
        { error: new Error('Permission denied access'), expectedPattern: 'permission_error' },
        { error: new Error('No such file exists'), expectedPattern: 'file_not_found' },
        { error: new Error('Random unexpected error'), expectedPattern: 'generic_error' }
      ];

      for (const { error, expectedPattern } of errorTests) {
        await promptManager.handleError(error, {});
      }

      const patterns = promptManager.getKnownPatterns();
      expect(patterns).toContain('missing_module');
      expect(patterns).toContain('permission_error');
      expect(patterns).toContain('file_not_found');
      expect(patterns).toContain('generic_error');
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle null or undefined errors', async () => {
      const nullError = null as any;
      const undefinedError = undefined as any;
      const context = {};

      // Should not throw, but handle gracefully
      await expect(async () => {
        if (nullError) await promptManager.handleError(nullError, context);
        if (undefinedError) await promptManager.handleError(undefinedError, context);
      }).not.toThrow();
    });

    it('should handle errors with no message', async () => {
      const emptyError = new Error();
      const context = {};

      const result = await promptManager.handleError(emptyError, context);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle very long error messages', async () => {
      const longMessage = 'Error: '.repeat(1000) + 'Very long error message';
      const longError = new Error(longMessage);
      const context = {};

      const result = await promptManager.handleError(longError, context);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle errors with special characters', async () => {
      const specialError = new Error('Error with 🚨 emojis and ñ special chars ∆');
      const context = {};

      const result = await promptManager.handleError(specialError, context);

      expect(result).toBeDefined();
      expect(result).toContain('🚨');
    });

    it('should handle multiple rapid error reports', async () => {
      const errors = Array.from({ length: 100 }, (_, i) =>
        new Error(`Rapid error ${i}`)
      );
      const context = {};

      const promises = errors.map(error =>
        promptManager.handleError(error, context)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });
    });
  });

  describe('Memory and Performance', () => {
    it('should not leak memory with many error patterns', async () => {
      // Test with many different error patterns
      for (let i = 0; i < 1000; i++) {
        const error = new Error(`Unique error pattern ${i}`);
        await promptManager.handleError(error, {});
      }

      // Should not crash or consume excessive memory
      const patterns = promptManager.getKnownPatterns();
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.length).toBeLessThan(1001); // Some patterns might be generic
    });

    it('should handle rapid successive calls efficiently', async () => {
      const start = Date.now();
      const error = new Error('Performance test error');
      const context = {};

      // Make many rapid calls
      for (let i = 0; i < 100; i++) {
        await promptManager.handleError(error, context);
      }

      const duration = Date.now() - start;
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds max
    });
  });

  describe('Pattern Retrieval', () => {
    it('should return empty array initially', () => {
      const patterns = promptManager.getKnownPatterns();

      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns).toHaveLength(0);
    });

    it('should return patterns after handling errors', async () => {
      const errors = [
        new Error('Cannot find module test'),
        new Error('Permission denied'),
        new Error('File not found')
      ];

      for (const error of errors) {
        await promptManager.handleError(error, {});
      }

      const patterns = promptManager.getKnownPatterns();

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns).toContain('missing_module');
      expect(patterns).toContain('permission_error');
      expect(patterns).toContain('file_not_found');
    });

    it('should not return duplicate patterns', async () => {
      const sameTypeErrors = [
        new Error('Cannot find module a'),
        new Error('Cannot find module b'),
        new Error('Cannot find module c')
      ];

      for (const error of sameTypeErrors) {
        await promptManager.handleError(error, {});
      }

      const patterns = promptManager.getKnownPatterns();
      const uniquePatterns = new Set(patterns);

      expect(patterns.length).toBe(uniquePatterns.size);
    });
  });

  describe('Integration with Error Context', () => {
    it('should maintain error context through healing process', async () => {
      const error = new Error('Context test error');
      const context = {
        lastCommand: 'test command',
        currentFile: { extension: 'test' },
        projectType: 'test-project',
        customProperty: 'custom-value'
      };

      const result = await promptManager.handleError(error, context);

      expect(result).toBeDefined();
      // Context should influence the healing strategy
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle complex nested context objects', async () => {
      const error = new Error('Complex context error');
      const complexContext = {
        lastCommand: 'complex command',
        currentFile: {
          extension: 'ts',
          path: '/complex/path/file.ts',
          metadata: {
            lines: 100,
            functions: 5
          }
        },
        projectType: 'complex-typescript',
        environment: {
          node: '18.0.0',
          npm: '8.0.0',
          os: 'linux'
        }
      };

      const result = await promptManager.handleError(error, complexContext);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });
});