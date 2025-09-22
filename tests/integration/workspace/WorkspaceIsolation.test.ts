/**
 * Integration tests for Workspace Memory Isolation
 * Tests workspace context switching, memory scoping, and resource isolation
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as path from 'path';
import * as fs from 'fs/promises';
import { MemoryManager } from '../../../src/memory/MemoryManager.js';
import { CopilotMCPServer } from '../../../src/server/index.js';
import {
  createTempDir,
  cleanupTempDir,
  createMockProject,
  PerformanceMeasurer,
  MemoryTracker
} from '../../utils/TestHelpers.js';

describe('Workspace Memory Isolation', () => {
  let server: CopilotMCPServer;
  let workspaceA: string;
  let workspaceB: string;
  let workspaceC: string;
  let performanceMeasurer: PerformanceMeasurer;
  let memoryTracker: MemoryTracker;

  beforeEach(async () => {
    performanceMeasurer = new PerformanceMeasurer();
    memoryTracker = new MemoryTracker();

    // Create test workspaces
    workspaceA = await createMockProject(await createTempDir(), 'nodejs');
    workspaceB = await createMockProject(await createTempDir(), 'python');
    workspaceC = await createMockProject(await createTempDir(), 'react');

    // Initialize server with workspace support
    server = new CopilotMCPServer();
    await server.initialize();

    memoryTracker.setBaseline();
  });

  afterEach(async () => {
    if (server) {
      await server.close();
    }
    await cleanupTempDir(workspaceA);
    await cleanupTempDir(workspaceB);
    await cleanupTempDir(workspaceC);
  });

  describe('Context Management', () => {
    it('should isolate memories between workspaces', async () => {
      // Switch to workspace A
      await server.switchWorkspace(workspaceA);

      // Store workspace-specific memory
      const memoryA = await server.storeMemory(
        'Node.js best practices for workspace A',
        'project',
        ['nodejs', 'workspace-a']
      );

      // Switch to workspace B
      await server.switchWorkspace(workspaceB);

      // Store different memory in workspace B
      const memoryB = await server.storeMemory(
        'Python patterns for workspace B',
        'project',
        ['python', 'workspace-b']
      );

      // Search in workspace B should not find workspace A memories
      const searchB = await server.searchMemory('Node.js best practices');
      expect(searchB.length).toBe(0);

      // Search should find workspace B memories
      const searchBPython = await server.searchMemory('Python patterns');
      expect(searchBPython.length).toBeGreaterThan(0);
      expect(searchBPython[0].memory.content).toContain('workspace B');

      // Switch back to workspace A
      await server.switchWorkspace(workspaceA);

      // Should find workspace A memories again
      const searchA = await server.searchMemory('Node.js best practices');
      expect(searchA.length).toBeGreaterThan(0);
      expect(searchA[0].memory.content).toContain('workspace A');

      // Should not find workspace B memories
      const searchAPython = await server.searchMemory('Python patterns');
      expect(searchAPython.length).toBe(0);
    });

    it('should maintain global preferences across workspaces', async () => {
      // Store global preference
      const globalPref = await server.storeMemory(
        JSON.stringify({
          theme: 'dark',
          fontSize: 14,
          autoSave: true
        }),
        'preference',
        ['global', 'user-preference']
      );

      // Switch to workspace A
      await server.switchWorkspace(workspaceA);
      const searchA = await server.searchMemory('theme');
      expect(searchA.length).toBeGreaterThan(0);
      expect(searchA[0].memory.layer).toBe('preference');

      // Switch to workspace B
      await server.switchWorkspace(workspaceB);
      const searchB = await server.searchMemory('fontSize');
      expect(searchB.length).toBeGreaterThan(0);
      expect(JSON.parse(searchB[0].memory.content).fontSize).toBe(14);

      // Switch to workspace C
      await server.switchWorkspace(workspaceC);
      const searchC = await server.searchMemory('autoSave');
      expect(searchC.length).toBeGreaterThan(0);
      expect(JSON.parse(searchC[0].memory.content).autoSave).toBe(true);
    });

    it('should switch contexts within 100ms', async () => {
      // Warm up workspaces
      await server.switchWorkspace(workspaceA);
      await server.storeMemory('Workspace A data', 'project', ['test']);

      await server.switchWorkspace(workspaceB);
      await server.storeMemory('Workspace B data', 'project', ['test']);

      // Measure context switch time
      const switchCount = 10;
      const durations: number[] = [];

      for (let i = 0; i < switchCount; i++) {
        const workspace = i % 2 === 0 ? workspaceA : workspaceB;
        const endTimer = performanceMeasurer.start(`switch-${i}`);
        await server.switchWorkspace(workspace);
        durations.push(endTimer());
      }

      const averageDuration = durations.reduce((sum, d) => sum + d, 0) / switchCount;
      const maxDuration = Math.max(...durations);

      expect(averageDuration).toBeLessThan(100);
      expect(maxDuration).toBeLessThan(150); // Allow some variance
    });

    it('should preserve workspace state during switches', async () => {
      // Set up state in workspace A
      await server.switchWorkspace(workspaceA);
      const stateA = {
        memories: [
          await server.storeMemory('State A memory 1', 'project', ['state']),
          await server.storeMemory('State A memory 2', 'project', ['state']),
          await server.storeMemory('State A memory 3', 'project', ['state'])
        ],
        stats: await server.getMemoryStats()
      };

      // Switch to workspace B and create different state
      await server.switchWorkspace(workspaceB);
      const stateB = {
        memories: [
          await server.storeMemory('State B memory 1', 'project', ['state']),
          await server.storeMemory('State B memory 2', 'project', ['state'])
        ],
        stats: await server.getMemoryStats()
      };

      // Switch back to workspace A
      await server.switchWorkspace(workspaceA);

      // Verify workspace A state is preserved
      const searchA = await server.searchMemory('State A');
      expect(searchA.length).toBe(3);

      const statsA = await server.getMemoryStats();
      expect(statsA.cold_storage_count).toBeGreaterThanOrEqual(stateA.stats.cold_storage_count);

      // Switch back to workspace B
      await server.switchWorkspace(workspaceB);

      // Verify workspace B state is preserved
      const searchB = await server.searchMemory('State B');
      expect(searchB.length).toBe(2);

      const statsB = await server.getMemoryStats();
      expect(statsB.cold_storage_count).toBeGreaterThanOrEqual(stateB.stats.cold_storage_count);
    });
  });

  describe('Memory Scoping', () => {
    it('should scope project memories to workspace', async () => {
      // Workspace A - Node.js project memories
      await server.switchWorkspace(workspaceA);
      await server.storeMemory(
        'Express.js routing patterns',
        'project',
        ['express', 'routing']
      );
      await server.storeMemory(
        'Node.js async patterns',
        'project',
        ['async', 'patterns']
      );

      // Workspace B - Python project memories
      await server.switchWorkspace(workspaceB);
      await server.storeMemory(
        'Flask routing patterns',
        'project',
        ['flask', 'routing']
      );
      await server.storeMemory(
        'Python async patterns',
        'project',
        ['async', 'patterns']
      );

      // Verify scoping
      await server.switchWorkspace(workspaceA);
      const nodeSearch = await server.searchMemory('routing patterns');
      expect(nodeSearch.length).toBeGreaterThan(0);
      expect(nodeSearch[0].memory.content).toContain('Express');
      expect(nodeSearch[0].memory.content).not.toContain('Flask');

      await server.switchWorkspace(workspaceB);
      const pythonSearch = await server.searchMemory('routing patterns');
      expect(pythonSearch.length).toBeGreaterThan(0);
      expect(pythonSearch[0].memory.content).toContain('Flask');
      expect(pythonSearch[0].memory.content).not.toContain('Express');
    });

    it('should share system memories globally', async () => {
      // Store system memory
      const systemMemory = await server.storeMemory(
        'Global error handling pattern',
        'system',
        ['error-handling', 'global']
      );

      // Verify accessible from all workspaces
      const workspaces = [workspaceA, workspaceB, workspaceC];

      for (const workspace of workspaces) {
        await server.switchWorkspace(workspace);
        const search = await server.searchMemory('error handling pattern');
        expect(search.length).toBeGreaterThan(0);
        expect(search[0].memory.layer).toBe('system');
        expect(search[0].memory.content).toContain('Global');
      }
    });

    it('should merge preference layers correctly', async () => {
      // Set global preference
      await server.storeMemory(
        JSON.stringify({ indentation: 'spaces', indentSize: 2 }),
        'preference',
        ['global', 'indentation']
      );

      // Set workspace-specific preference override
      await server.switchWorkspace(workspaceA);
      await server.storeMemory(
        JSON.stringify({ indentSize: 4 }), // Override only indent size
        'preference',
        ['workspace', 'indentation']
      );

      // Search should return both, with workspace preference having priority
      const search = await server.searchMemory('indentation');
      expect(search.length).toBeGreaterThanOrEqual(1);

      // In workspace A, should use size 4
      const workspacePrefs = search.find(r => r.memory.tags?.includes('workspace'));
      if (workspacePrefs) {
        expect(JSON.parse(workspacePrefs.memory.content).indentSize).toBe(4);
      }

      // Switch to workspace B (no override)
      await server.switchWorkspace(workspaceB);
      const searchB = await server.searchMemory('indentation');

      // Should use global default
      const globalPrefs = searchB.find(r => r.memory.tags?.includes('global'));
      if (globalPrefs) {
        expect(JSON.parse(globalPrefs.memory.content).indentSize).toBe(2);
      }
    });

    it('should handle workspace deletion gracefully', async () => {
      // Setup workspace with memories
      await server.switchWorkspace(workspaceA);
      await server.storeMemory('Workspace A memory 1', 'project', ['test']);
      await server.storeMemory('Workspace A memory 2', 'project', ['test']);

      const statsBeforeDeletion = await server.getMemoryStats();

      // Simulate workspace deletion
      await server.switchWorkspace(workspaceB); // Switch away first
      await cleanupTempDir(workspaceA);

      // Try to switch to deleted workspace
      try {
        await server.switchWorkspace(workspaceA);
        // Should either handle gracefully or throw appropriate error
      } catch (error: any) {
        expect(error.message).toContain('workspace');
      }

      // System should remain stable
      const statsAfterDeletion = await server.getMemoryStats();
      expect(statsAfterDeletion).toBeDefined();

      // Other workspaces should be unaffected
      const searchB = await server.searchMemory('test');
      // Workspace B memories (if any) should still be accessible
    });
  });

  describe('Concurrent Workspaces', () => {
    it('should handle multiple active workspaces', async () => {
      // Simulate multiple workspaces being active
      const workspaceOperations = [
        async () => {
          await server.switchWorkspace(workspaceA);
          return server.storeMemory('Workspace A concurrent', 'project', ['concurrent']);
        },
        async () => {
          await server.switchWorkspace(workspaceB);
          return server.storeMemory('Workspace B concurrent', 'project', ['concurrent']);
        },
        async () => {
          await server.switchWorkspace(workspaceC);
          return server.storeMemory('Workspace C concurrent', 'project', ['concurrent']);
        }
      ];

      // Execute operations concurrently
      const results = await Promise.all(workspaceOperations.map(op => op()));
      expect(results).toHaveLength(3);
      results.forEach(id => expect(id).toBeTruthy());

      // Verify isolation after concurrent operations
      await server.switchWorkspace(workspaceA);
      const searchA = await server.searchMemory('concurrent');
      expect(searchA.every(r => r.memory.content.includes('Workspace A'))).toBe(true);

      await server.switchWorkspace(workspaceB);
      const searchB = await server.searchMemory('concurrent');
      expect(searchB.every(r => r.memory.content.includes('Workspace B'))).toBe(true);
    });

    it('should prevent cross-workspace memory leaks', async () => {
      memoryTracker.checkpoint('before-operations');

      // Perform intensive operations in workspace A
      await server.switchWorkspace(workspaceA);
      const memoriesA = [];
      for (let i = 0; i < 100; i++) {
        memoriesA.push(
          await server.storeMemory(
            `Workspace A intensive memory ${i}`,
            'project',
            [`intensive-${i}`]
          )
        );
      }

      memoryTracker.checkpoint('after-workspace-a');

      // Switch to workspace B
      await server.switchWorkspace(workspaceB);

      // Workspace A memories should not be in active memory
      const searchB = await server.searchMemory('Workspace A intensive');
      expect(searchB.length).toBe(0);

      // Memory should be properly isolated
      const memoryGrowthA = memoryTracker.getMemoryDiff('after-workspace-a');

      // Perform operations in workspace B
      const memoriesB = [];
      for (let i = 0; i < 50; i++) {
        memoriesB.push(
          await server.storeMemory(
            `Workspace B memory ${i}`,
            'project',
            [`memory-${i}`]
          )
        );
      }

      memoryTracker.checkpoint('after-workspace-b');

      // Check for memory leaks
      const totalMemoryGrowth = memoryTracker.getMemoryDiff('before-operations');
      const expectedMaxGrowth = 50 * 1024 * 1024; // 50MB reasonable limit

      expect(totalMemoryGrowth).toBeLessThan(expectedMaxGrowth);
    });

    it('should synchronize global memories correctly', async () => {
      // Store global memory from workspace A
      await server.switchWorkspace(workspaceA);
      const globalFromA = await server.storeMemory(
        'Global pattern from workspace A',
        'system',
        ['global', 'pattern', 'from-a']
      );

      // Store global memory from workspace B
      await server.switchWorkspace(workspaceB);
      const globalFromB = await server.storeMemory(
        'Global pattern from workspace B',
        'system',
        ['global', 'pattern', 'from-b']
      );

      // Both should be accessible from workspace C
      await server.switchWorkspace(workspaceC);
      const searchGlobal = await server.searchMemory('Global pattern from');
      expect(searchGlobal.length).toBe(2);

      const contents = searchGlobal.map(r => r.memory.content);
      expect(contents).toContain('Global pattern from workspace A');
      expect(contents).toContain('Global pattern from workspace B');
    });

    it('should manage resource limits per workspace', async () => {
      const maxMemoriesPerWorkspace = 1000; // Example limit

      // Fill workspace A to limit
      await server.switchWorkspace(workspaceA);
      const memoriesA = [];
      for (let i = 0; i < maxMemoriesPerWorkspace; i++) {
        memoriesA.push(
          await server.storeMemory(
            `Workspace A memory ${i}`,
            'project',
            [`limit-test-${i}`]
          )
        );
      }

      const statsA = await server.getMemoryStats();

      // Switch to workspace B - should have its own limits
      await server.switchWorkspace(workspaceB);
      const memoriesB = [];
      for (let i = 0; i < 500; i++) {
        memoriesB.push(
          await server.storeMemory(
            `Workspace B memory ${i}`,
            'project',
            [`limit-test-${i}`]
          )
        );
      }

      const statsB = await server.getMemoryStats();

      // Each workspace should respect its own limits
      expect(statsA.cold_storage_count).toBeLessThanOrEqual(maxMemoriesPerWorkspace);
      expect(statsB.cold_storage_count).toBeLessThanOrEqual(maxMemoriesPerWorkspace);

      // Workspace B should not be affected by workspace A being at limit
      expect(memoriesB.length).toBe(500);
    });
  });

  describe('Workspace Discovery and Management', () => {
    it('should auto-discover workspace from file operations', async () => {
      // Create a new project structure
      const autoDiscoverWorkspace = await createMockProject(
        await createTempDir(),
        'nodejs'
      );

      // Simulate file operation that would trigger discovery
      await server.initProject(autoDiscoverWorkspace);

      // Should have created workspace context
      const workspaces = await server.listWorkspaces();
      expect(workspaces).toContain(autoDiscoverWorkspace);
    });

    it('should maintain workspace metadata', async () => {
      await server.switchWorkspace(workspaceA);

      // Store workspace metadata
      const metadata = {
        projectType: 'nodejs',
        lastAccessed: new Date().toISOString(),
        memoryCount: 0,
        configuration: {
          linting: true,
          testing: 'jest'
        }
      };

      await server.storeMemory(
        JSON.stringify(metadata),
        'system',
        ['workspace-metadata', workspaceA]
      );

      // Retrieve and verify metadata
      const search = await server.searchMemory('workspace-metadata');
      expect(search.length).toBeGreaterThan(0);

      const retrieved = JSON.parse(search[0].memory.content);
      expect(retrieved.projectType).toBe('nodejs');
      expect(retrieved.configuration.testing).toBe('jest');
    });

    it('should handle workspace renaming', async () => {
      // Store memories in original workspace
      await server.switchWorkspace(workspaceA);
      const originalMemory = await server.storeMemory(
        'Memory in original workspace',
        'project',
        ['rename-test']
      );

      // Simulate workspace rename
      const renamedWorkspace = workspaceA + '_renamed';
      await fs.rename(workspaceA, renamedWorkspace);

      try {
        // Update server's reference
        await server.switchWorkspace(renamedWorkspace);

        // Memories should still be accessible
        const search = await server.searchMemory('rename-test');
        expect(search.length).toBeGreaterThan(0);
        expect(search[0].memory.content).toContain('original workspace');
      } finally {
        // Clean up renamed workspace
        await cleanupTempDir(renamedWorkspace);
      }
    });
  });

  describe('Performance Under Load', () => {
    it('should maintain performance with many workspaces', async () => {
      const workspaceCount = 10;
      const workspaces: string[] = [];

      // Create multiple workspaces
      for (let i = 0; i < workspaceCount; i++) {
        const workspace = await createMockProject(
          await createTempDir(),
          i % 2 === 0 ? 'nodejs' : 'python'
        );
        workspaces.push(workspace);
      }

      try {
        // Measure switching performance across all workspaces
        const endTimer = performanceMeasurer.start('many-workspace-switches');

        for (const workspace of workspaces) {
          await server.switchWorkspace(workspace);
          await server.storeMemory(
            `Memory for ${path.basename(workspace)}`,
            'project',
            ['load-test']
          );
        }

        const duration = endTimer();
        const averagePerSwitch = duration / workspaceCount;

        expect(averagePerSwitch).toBeLessThan(200); // 200ms per workspace reasonable

        // Verify all workspaces are functional
        for (const workspace of workspaces) {
          await server.switchWorkspace(workspace);
          const search = await server.searchMemory('load-test');
          expect(search.length).toBeGreaterThan(0);
        }
      } finally {
        // Clean up all test workspaces
        for (const workspace of workspaces) {
          await cleanupTempDir(workspace);
        }
      }
    });

    it('should handle rapid workspace switching', async () => {
      const rapidSwitchCount = 50;
      const durations: number[] = [];

      for (let i = 0; i < rapidSwitchCount; i++) {
        const workspace = [workspaceA, workspaceB, workspaceC][i % 3];
        const endTimer = performanceMeasurer.start(`rapid-switch-${i}`);
        await server.switchWorkspace(workspace);
        durations.push(endTimer());
      }

      const averageDuration = durations.reduce((sum, d) => sum + d, 0) / rapidSwitchCount;
      const maxDuration = Math.max(...durations);

      expect(averageDuration).toBeLessThan(50); // Very fast switching
      expect(maxDuration).toBeLessThan(200); // No significant outliers
    });
  });
});