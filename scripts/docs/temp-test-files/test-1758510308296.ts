const PerformanceTargets = {
  memory: {
    store: { p50: 5, p95: 10, p99: 50 }, // milliseconds
    search: { p50: 10, p95: 50, p99: 100 },
    stats: { p50: 5, p95: 20, p99: 50 }
  },
  workspace: {
    switch: { p50: 20, p95: 50, p99: 100 },
    init: { p50: 100, p95: 500, p99: 1000 }
  },
  scale: {
    memories: 1000000, // Support 1M memories
    workspaces: 100,   // Support 100 workspaces
    concurrent: 1000    // 1000 concurrent operations
  }
};