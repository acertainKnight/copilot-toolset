// Get current workspace context
const context = this.getCurrentContext();
const memoryManager = context?.memoryManager || new MemoryManager();

// Switch workspace contexts
await this.getOrCreateWorkspaceContext(workspacePath);
this.state.currentWorkspace = workspacePath;