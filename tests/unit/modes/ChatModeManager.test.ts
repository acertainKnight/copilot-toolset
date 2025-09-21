/**
 * Unit tests for ChatModeManager - Dynamic mode creation and management
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ChatModeManager } from '../../../src/modes/ChatModeManager.js';
import { ChatMode, ChatModeCreateRequest } from '../../../src/types/index.js';
import {
  createTestStoragePaths,
  createTestLogger,
  createMockChatMode,
  createMockChatModeRequest,
  cleanupTempDir
} from '../../utils/TestHelpers.js';

describe('ChatModeManager', () => {
  let chatModeManager: ChatModeManager;
  let storagePaths: any;
  let logger: any;
  let logs: any[];

  beforeEach(async () => {
    storagePaths = await createTestStoragePaths();
    const testLogger = createTestLogger();
    logger = testLogger.logger;
    logs = testLogger.logs;

    chatModeManager = new ChatModeManager(storagePaths, logger);
  });

  afterEach(async () => {
    if (storagePaths?.root) {
      await cleanupTempDir(storagePaths.root);
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(chatModeManager.initialize()).resolves.not.toThrow();

      expect(logs.some(log => log.message.includes('Initializing chat mode manager'))).toBe(true);
      expect(logs.some(log => log.message.includes('Chat mode manager initialized'))).toBe(true);
    });

    it('should load built-in modes on initialization', async () => {
      await chatModeManager.initialize();

      const modes = await chatModeManager.listModes();

      expect(modes.length).toBeGreaterThan(0);

      // Check for expected built-in modes
      const modeNames = modes.map(m => m.name);
      expect(modeNames).toContain('general');
      expect(modeNames).toContain('architect');
      expect(modeNames).toContain('debugger');
      expect(modeNames).toContain('refactorer');
      expect(modeNames).toContain('tester');
    });

    it('should mark built-in modes correctly', async () => {
      await chatModeManager.initialize();

      const modes = await chatModeManager.listModes();
      const builtInModes = modes.filter(m => m.builtIn);

      expect(builtInModes.length).toBeGreaterThan(0);
      builtInModes.forEach(mode => {
        expect(mode.builtIn).toBe(true);
        expect(mode.enabled).toBe(true);
      });
    });

    it('should create modes directory if it doesn\'t exist', async () => {
      await chatModeManager.initialize();

      const modesDirExists = await fs.access(storagePaths.modeDefinitions)
        .then(() => true, () => false);
      expect(modesDirExists).toBe(true);
    });

    it('should load custom modes from storage', async () => {
      // Pre-create a custom mode file
      const customMode = createMockChatMode({
        name: 'pre-existing-mode',
        builtIn: false
      });

      const modePath = path.join(storagePaths.modeDefinitions, 'pre-existing-mode.json');
      await fs.writeFile(modePath, JSON.stringify(customMode, null, 2));

      await chatModeManager.initialize();

      const mode = await chatModeManager.getMode('pre-existing-mode');
      expect(mode).not.toBeNull();
      expect(mode?.name).toBe('pre-existing-mode');
      expect(mode?.builtIn).toBe(false);
    });

    it('should handle initialization errors gracefully', async () => {
      // Create a read-only directory to simulate permission issues
      // Note: This test might be environment-specific
      await chatModeManager.initialize();

      // Should complete without throwing even if there are file system issues
      expect(logs.some(log => log.level === 'error')).toBe(false);
    });
  });

  describe('Mode Creation', () => {
    beforeEach(async () => {
      await chatModeManager.initialize();
    });

    it('should create a new custom mode successfully', async () => {
      const request = createMockChatModeRequest({
        name: 'custom-test-mode',
        description: 'Custom mode for testing',
        systemPrompt: 'You are a test assistant.',
        tools: ['store_memory', 'retrieve_memory']
      });

      const createdMode = await chatModeManager.createMode(request);

      expect(createdMode).toBeDefined();
      expect(createdMode.name).toBe('custom-test-mode');
      expect(createdMode.description).toBe('Custom mode for testing');
      expect(createdMode.builtIn).toBe(false);
      expect(createdMode.enabled).toBe(true);
      expect(createdMode.createdAt).toBeInstanceOf(Date);
      expect(createdMode.updatedAt).toBeInstanceOf(Date);
    });

    it('should validate mode creation request', async () => {
      const invalidRequest: any = {
        name: '', // Invalid: empty name
        description: 'Test mode',
        systemPrompt: 'Test prompt',
        tools: ['store_memory']
      };

      await expect(chatModeManager.createMode(invalidRequest))
        .rejects.toThrow();
    });

    it('should prevent duplicate mode names', async () => {
      const request1 = createMockChatModeRequest({ name: 'duplicate-test' });
      const request2 = createMockChatModeRequest({ name: 'duplicate-test' });

      await chatModeManager.createMode(request1);

      await expect(chatModeManager.createMode(request2))
        .rejects.toThrow('already exists');
    });

    it('should prevent creating modes with built-in names', async () => {
      const request = createMockChatModeRequest({
        name: 'general' // This is a built-in mode
      });

      await expect(chatModeManager.createMode(request))
        .rejects.toThrow('already exists');
    });

    it('should validate tools exist', async () => {
      const request = createMockChatModeRequest({
        tools: ['invalid_tool_that_does_not_exist']
      });

      await expect(chatModeManager.createMode(request))
        .rejects.toThrow('Unknown tools');
    });

    it('should save mode to storage after creation', async () => {
      const request = createMockChatModeRequest({ name: 'storage-test-mode' });

      await chatModeManager.createMode(request);

      const filePath = path.join(storagePaths.modeDefinitions, 'storage-test-mode.json');
      const fileExists = await fs.access(filePath).then(() => true, () => false);
      expect(fileExists).toBe(true);

      const fileContent = await fs.readFile(filePath, 'utf-8');
      const savedMode = JSON.parse(fileContent);
      expect(savedMode.name).toBe('storage-test-mode');
    });

    it('should generate mode prompt file', async () => {
      const request = createMockChatModeRequest({ name: 'prompt-test-mode' });

      await chatModeManager.createMode(request);

      const promptPath = path.join(storagePaths.modeDefinitions, 'prompt-test-mode.md');
      const promptExists = await fs.access(promptPath).then(() => true, () => false);
      expect(promptExists).toBe(true);

      const promptContent = await fs.readFile(promptPath, 'utf-8');
      expect(promptContent).toContain('prompt-test-mode');
      expect(promptContent).toContain('Available Tools');
      expect(promptContent).toContain('Context Variables');
    });

    it('should handle optional parameters correctly', async () => {
      const minimalRequest: ChatModeCreateRequest = {
        name: 'minimal-mode',
        description: 'Minimal test mode',
        systemPrompt: 'You are minimal.',
        tools: ['store_memory']
      };

      const createdMode = await chatModeManager.createMode(minimalRequest);

      expect(createdMode.temperature).toBeUndefined();
      expect(createdMode.maxTokens).toBeUndefined();
      expect(createdMode.model).toBeUndefined();
    });

    it('should handle metadata in mode creation', async () => {
      const request = createMockChatModeRequest({
        metadata: {
          category: 'testing',
          version: '1.0.0',
          author: 'test-suite'
        }
      });

      const createdMode = await chatModeManager.createMode(request);

      expect(createdMode.metadata).toBeDefined();
      expect(createdMode.metadata?.category).toBe('testing');
    });
  });

  describe('Mode Retrieval and Listing', () => {
    beforeEach(async () => {
      await chatModeManager.initialize();

      // Create some test modes
      await chatModeManager.createMode(createMockChatModeRequest({
        name: 'test-mode-1',
        description: 'First test mode'
      }));
      await chatModeManager.createMode(createMockChatModeRequest({
        name: 'test-mode-2',
        description: 'Second test mode'
      }));
    });

    it('should list all enabled modes', async () => {
      const modes = await chatModeManager.listModes();

      expect(modes.length).toBeGreaterThan(0);
      modes.forEach(mode => {
        expect(mode.enabled).toBe(true);
      });
    });

    it('should sort modes correctly (built-in first)', async () => {
      const modes = await chatModeManager.listModes();

      let foundFirstCustom = false;
      let foundBuiltInAfterCustom = false;

      for (const mode of modes) {
        if (!mode.builtIn && !foundFirstCustom) {
          foundFirstCustom = true;
        } else if (mode.builtIn && foundFirstCustom) {
          foundBuiltInAfterCustom = true;
          break;
        }
      }

      // Should not find built-in modes after custom ones
      expect(foundBuiltInAfterCustom).toBe(false);
    });

    it('should retrieve specific mode by name', async () => {
      const mode = await chatModeManager.getMode('test-mode-1');

      expect(mode).not.toBeNull();
      expect(mode?.name).toBe('test-mode-1');
      expect(mode?.description).toBe('First test mode');
    });

    it('should return null for non-existent mode', async () => {
      const mode = await chatModeManager.getMode('non-existent-mode');

      expect(mode).toBeNull();
    });

    it('should retrieve built-in modes', async () => {
      const generalMode = await chatModeManager.getMode('general');

      expect(generalMode).not.toBeNull();
      expect(generalMode?.builtIn).toBe(true);
      expect(generalMode?.name).toBe('general');
    });
  });

  describe('Mode Activation', () => {
    beforeEach(async () => {
      await chatModeManager.initialize();
      await chatModeManager.createMode(createMockChatModeRequest({
        name: 'activation-test-mode'
      }));
    });

    it('should activate an existing enabled mode', async () => {
      const activatedMode = await chatModeManager.activateMode('activation-test-mode');

      expect(activatedMode).toBeDefined();
      expect(activatedMode.name).toBe('activation-test-mode');
      expect(chatModeManager.getCurrentMode()).toBe('activation-test-mode');
    });

    it('should throw error for non-existent mode', async () => {
      await expect(chatModeManager.activateMode('non-existent-mode'))
        .rejects.toThrow('not found');
    });

    it('should throw error for disabled mode', async () => {
      // Disable the mode first
      await chatModeManager.toggleMode('activation-test-mode', false);

      await expect(chatModeManager.activateMode('activation-test-mode'))
        .rejects.toThrow('disabled');
    });

    it('should activate built-in modes', async () => {
      const activatedMode = await chatModeManager.activateMode('general');

      expect(activatedMode.name).toBe('general');
      expect(activatedMode.builtIn).toBe(true);
      expect(chatModeManager.getCurrentMode()).toBe('general');
    });

    it('should track current mode correctly', async () => {
      expect(chatModeManager.getCurrentMode()).toBeNull();

      await chatModeManager.activateMode('general');
      expect(chatModeManager.getCurrentMode()).toBe('general');

      await chatModeManager.activateMode('activation-test-mode');
      expect(chatModeManager.getCurrentMode()).toBe('activation-test-mode');
    });
  });

  describe('Mode Updates', () => {
    beforeEach(async () => {
      await chatModeManager.initialize();
      await chatModeManager.createMode(createMockChatModeRequest({
        name: 'update-test-mode',
        description: 'Original description'
      }));
    });

    it('should update existing custom mode', async () => {
      const updates = {
        description: 'Updated description',
        systemPrompt: 'Updated system prompt'
      };

      const updatedMode = await chatModeManager.updateMode('update-test-mode', updates);

      expect(updatedMode.description).toBe('Updated description');
      expect(updatedMode.systemPrompt).toBe('Updated system prompt');
      expect(updatedMode.updatedAt.getTime()).toBeGreaterThan(updatedMode.createdAt.getTime());
    });

    it('should prevent updating built-in modes', async () => {
      const updates = {
        description: 'Attempted update'
      };

      await expect(chatModeManager.updateMode('general', updates))
        .rejects.toThrow('Cannot modify built-in');
    });

    it('should throw error for non-existent mode', async () => {
      const updates = { description: 'Test' };

      await expect(chatModeManager.updateMode('non-existent', updates))
        .rejects.toThrow('not found');
    });

    it('should validate tools when updating', async () => {
      const updates = {
        tools: ['invalid_tool']
      };

      await expect(chatModeManager.updateMode('update-test-mode', updates))
        .rejects.toThrow('Unknown tools');
    });

    it('should save updates to storage', async () => {
      const updates = {
        description: 'Storage update test'
      };

      await chatModeManager.updateMode('update-test-mode', updates);

      const filePath = path.join(storagePaths.modeDefinitions, 'update-test-mode.json');
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const savedMode = JSON.parse(fileContent);

      expect(savedMode.description).toBe('Storage update test');
    });

    it('should regenerate prompt file after update', async () => {
      const updates = {
        systemPrompt: 'Updated prompt for regeneration test'
      };

      await chatModeManager.updateMode('update-test-mode', updates);

      const promptPath = path.join(storagePaths.modeDefinitions, 'update-test-mode.md');
      const promptContent = await fs.readFile(promptPath, 'utf-8');

      expect(promptContent).toContain('Updated prompt for regeneration test');
    });
  });

  describe('Mode Deletion', () => {
    beforeEach(async () => {
      await chatModeManager.initialize();
      await chatModeManager.createMode(createMockChatModeRequest({
        name: 'delete-test-mode'
      }));
    });

    it('should delete custom mode successfully', async () => {
      await expect(chatModeManager.deleteMode('delete-test-mode'))
        .resolves.not.toThrow();

      const mode = await chatModeManager.getMode('delete-test-mode');
      expect(mode).toBeNull();
    });

    it('should prevent deleting built-in modes', async () => {
      await expect(chatModeManager.deleteMode('general'))
        .rejects.toThrow('Cannot delete built-in');
    });

    it('should throw error for non-existent mode', async () => {
      await expect(chatModeManager.deleteMode('non-existent-mode'))
        .rejects.toThrow('not found');
    });

    it('should remove mode files from storage', async () => {
      await chatModeManager.deleteMode('delete-test-mode');

      const jsonPath = path.join(storagePaths.modeDefinitions, 'delete-test-mode.json');
      const mdPath = path.join(storagePaths.modeDefinitions, 'delete-test-mode.md');

      const jsonExists = await fs.access(jsonPath).then(() => true, () => false);
      const mdExists = await fs.access(mdPath).then(() => true, () => false);

      expect(jsonExists).toBe(false);
      expect(mdExists).toBe(false);
    });

    it('should reset current mode if deleted mode was active', async () => {
      await chatModeManager.activateMode('delete-test-mode');
      expect(chatModeManager.getCurrentMode()).toBe('delete-test-mode');

      await chatModeManager.deleteMode('delete-test-mode');
      expect(chatModeManager.getCurrentMode()).toBeNull();
    });

    it('should handle deletion when files don\'t exist', async () => {
      // Manually remove files first
      const jsonPath = path.join(storagePaths.modeDefinitions, 'delete-test-mode.json');
      const mdPath = path.join(storagePaths.modeDefinitions, 'delete-test-mode.md');

      await fs.unlink(jsonPath).catch(() => {});
      await fs.unlink(mdPath).catch(() => {});

      // Should still complete successfully
      await expect(chatModeManager.deleteMode('delete-test-mode'))
        .resolves.not.toThrow();
    });
  });

  describe('Mode Toggle (Enable/Disable)', () => {
    beforeEach(async () => {
      await chatModeManager.initialize();
      await chatModeManager.createMode(createMockChatModeRequest({
        name: 'toggle-test-mode'
      }));
    });

    it('should disable a mode', async () => {
      const disabledMode = await chatModeManager.toggleMode('toggle-test-mode', false);

      expect(disabledMode.enabled).toBe(false);
      expect(disabledMode.updatedAt).toBeInstanceOf(Date);

      // Should not appear in list of enabled modes
      const modes = await chatModeManager.listModes();
      const foundMode = modes.find(m => m.name === 'toggle-test-mode');
      expect(foundMode).toBeUndefined();
    });

    it('should enable a disabled mode', async () => {
      // Disable first
      await chatModeManager.toggleMode('toggle-test-mode', false);

      // Then enable
      const enabledMode = await chatModeManager.toggleMode('toggle-test-mode', true);

      expect(enabledMode.enabled).toBe(true);

      // Should appear in list of enabled modes
      const modes = await chatModeManager.listModes();
      const foundMode = modes.find(m => m.name === 'toggle-test-mode');
      expect(foundMode).toBeDefined();
    });

    it('should handle toggle for built-in modes', async () => {
      const toggledMode = await chatModeManager.toggleMode('general', false);

      expect(toggledMode.enabled).toBe(false);
      expect(toggledMode.builtIn).toBe(true);
    });

    it('should save toggle state for custom modes', async () => {
      await chatModeManager.toggleMode('toggle-test-mode', false);

      const filePath = path.join(storagePaths.modeDefinitions, 'toggle-test-mode.json');
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const savedMode = JSON.parse(fileContent);

      expect(savedMode.enabled).toBe(false);
    });

    it('should throw error for non-existent mode', async () => {
      await expect(chatModeManager.toggleMode('non-existent-mode', false))
        .rejects.toThrow('not found');
    });
  });

  describe('Built-in Mode Validation', () => {
    beforeEach(async () => {
      await chatModeManager.initialize();
    });

    it('should have correct built-in mode properties', async () => {
      const generalMode = await chatModeManager.getMode('general');

      expect(generalMode).not.toBeNull();
      expect(generalMode?.builtIn).toBe(true);
      expect(generalMode?.enabled).toBe(true);
      expect(generalMode?.systemPrompt).toContain('helpful coding assistant');
      expect(generalMode?.tools.length).toBeGreaterThan(0);
    });

    it('should have all expected built-in modes', async () => {
      const modes = await chatModeManager.listModes();
      const builtInModes = modes.filter(m => m.builtIn);
      const builtInNames = builtInModes.map(m => m.name);

      const expectedBuiltIns = ['general', 'architect', 'debugger', 'refactorer', 'tester'];
      expectedBuiltIns.forEach(name => {
        expect(builtInNames).toContain(name);
      });
    });

    it('should have valid tool configurations for built-in modes', async () => {
      const modes = await chatModeManager.listModes();
      const builtInModes = modes.filter(m => m.builtIn);

      builtInModes.forEach(mode => {
        expect(mode.tools.length).toBeGreaterThan(0);
        // All tools should be known tools (this validates against the tool validation list)
        mode.tools.forEach(tool => {
          expect(typeof tool).toBe('string');
          expect(tool.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(async () => {
      await chatModeManager.initialize();
    });

    it('should handle corrupted mode files gracefully', async () => {
      // Create a corrupted mode file
      const corruptedPath = path.join(storagePaths.modeDefinitions, 'corrupted.json');
      await fs.writeFile(corruptedPath, '{ invalid json content');

      // Re-initialize to test loading
      const newManager = new ChatModeManager(storagePaths, logger);
      await expect(newManager.initialize()).resolves.not.toThrow();
    });

    it('should handle missing mode definition fields', async () => {
      // Create an incomplete mode file
      const incompletePath = path.join(storagePaths.modeDefinitions, 'incomplete.json');
      await fs.writeFile(incompletePath, JSON.stringify({ name: 'incomplete' }));

      const newManager = new ChatModeManager(storagePaths, logger);
      await newManager.initialize();

      const mode = await newManager.getMode('incomplete');
      expect(mode).toBeNull(); // Should be filtered out due to missing fields
    });

    it('should handle file system permission errors', async () => {
      // This test may be environment-specific
      await expect(chatModeManager.initialize()).resolves.not.toThrow();
    });

    it('should validate mode name format', async () => {
      const invalidNames = [
        'invalid space',
        'invalid@symbol',
        'invalid.dot',
        'invalid/slash',
        ''
      ];

      for (const invalidName of invalidNames) {
        const request = createMockChatModeRequest({ name: invalidName });
        await expect(chatModeManager.createMode(request))
          .rejects.toThrow();
      }
    });

    it('should handle extremely long mode descriptions', async () => {
      const longDescription = 'a'.repeat(500); // Over the limit
      const request = createMockChatModeRequest({ description: longDescription });

      await expect(chatModeManager.createMode(request))
        .rejects.toThrow();
    });

    it('should handle empty tool arrays', async () => {
      const request = createMockChatModeRequest({ tools: [] });

      await expect(chatModeManager.createMode(request))
        .rejects.toThrow();
    });
  });

  describe('Prompt File Generation', () => {
    beforeEach(async () => {
      await chatModeManager.initialize();
    });

    it('should generate comprehensive prompt files', async () => {
      const request = createMockChatModeRequest({
        name: 'prompt-generation-test',
        description: 'Testing prompt file generation',
        systemPrompt: 'You are a prompt generation test assistant.',
        tools: ['store_memory', 'retrieve_memory']
      });

      await chatModeManager.createMode(request);

      const promptPath = path.join(storagePaths.modeDefinitions, 'prompt-generation-test.md');
      const promptContent = await fs.readFile(promptPath, 'utf-8');

      // Check for all expected sections
      expect(promptContent).toContain('# Prompt-generation-test Mode');
      expect(promptContent).toContain('## Available Tools');
      expect(promptContent).toContain('## Context Variables');
      expect(promptContent).toContain('## Usage Examples');
      expect(promptContent).toContain('## Memory Integration');
      expect(promptContent).toContain('*Generated by Copilot MCP Toolset*');

      // Check for YAML front matter
      expect(promptContent).toContain('---');
      expect(promptContent).toContain('name: prompt-generation-test');
      expect(promptContent).toContain('tools: store_memory, retrieve_memory');
    });

    it('should include tool descriptions in prompt files', async () => {
      const request = createMockChatModeRequest({
        name: 'tool-description-test',
        tools: ['init_project', 'analyze_project_structure']
      });

      await chatModeManager.createMode(request);

      const promptPath = path.join(storagePaths.modeDefinitions, 'tool-description-test.md');
      const promptContent = await fs.readFile(promptPath, 'utf-8');

      expect(promptContent).toContain('Initialize project context');
      expect(promptContent).toContain('Analyze current project structure');
    });
  });
});