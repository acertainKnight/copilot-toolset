# Copilot MCP Toolset - Test Suite

This comprehensive test suite ensures the reliability, performance, and quality of the Copilot MCP Toolset. The testing framework covers all major components with unit tests, integration tests, end-to-end tests, and performance benchmarks.

## Test Structure

```
tests/
├── unit/                    # Unit tests for individual components
│   ├── memory/             # Memory system tests
│   ├── project/            # Project initialization tests
│   ├── modes/              # Chat mode management tests
│   └── prompts/            # Self-healing prompt tests
├── integration/            # Integration tests
│   └── server/             # MCP server integration tests
├── e2e/                    # End-to-end workflow tests
│   └── workflows/          # Complete system workflows
├── performance/            # Performance benchmarks
│   ├── MemoryPerformance.perf.test.ts
│   ├── SystemPerformance.perf.test.ts
│   └── PerformanceReporter.ts
├── utils/                  # Test utilities and helpers
│   └── TestHelpers.ts      # Common testing utilities
├── fixtures/               # Test data and sample fixtures
│   └── sampleData.ts       # Sample data for tests
└── setup.ts               # Global test setup
```

## Running Tests

### All Tests
```bash
npm test                    # Run unit tests (default)
npm run test:all           # Run all test suites
```

### Specific Test Suites
```bash
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # End-to-end tests only
npm run test:performance  # Performance benchmarks only
```

### With Coverage
```bash
npm run test:coverage      # Generate coverage reports
```

### Watch Mode
```bash
npm run test:unit:watch    # Watch mode for development
```

### CI Pipeline
```bash
npm run test:ci           # Complete test suite for CI/CD
```

## Test Categories

### Unit Tests
Tests individual components in isolation:

- **MemoryManager**: Three-tier memory storage, search, and retrieval
- **ProjectInitializer**: Project analysis and COPILOT.md generation
- **ChatModeManager**: Dynamic mode creation and management
- **SelfHealingPromptManager**: Error pattern learning and recovery

**Coverage Target**: 80% minimum for all components

### Integration Tests
Tests component interactions and MCP protocol compliance:

- **MCP Server**: JSON-RPC 2.0 protocol implementation
- **Tool Execution**: End-to-end tool call workflows
- **Resource Handling**: Resource listing and retrieval
- **State Management**: Cross-request state persistence

**Focus**: Real protocol interactions and data flow

### End-to-End Tests
Tests complete user workflows:

- **Project Initialization**: Full project setup with memory integration
- **Chat Mode Workflows**: Mode creation, activation, and usage
- **Error Recovery**: Self-healing across system components
- **Memory Persistence**: Cross-session data retention
- **Performance under Load**: System behavior under realistic usage

**Environment**: Isolated test environment with sample projects

### Performance Tests
Benchmarks system performance and resource usage:

- **Memory System**: Storage, search, and retrieval performance
- **Project Operations**: Initialization and analysis timing
- **Concurrent Operations**: Multi-threaded performance
- **Resource Usage**: Memory consumption and cleanup
- **Sustained Load**: Long-running performance characteristics

**Thresholds**: Defined performance targets for each operation type

## Test Configuration

### Jest Configuration
Multiple Jest configurations for different test types:

- `jest.unit.config.js` - Unit tests with high coverage requirements
- `jest.integration.config.js` - Integration tests with longer timeouts
- `jest.e2e.config.js` - End-to-end tests running sequentially
- `jest.performance.config.js` - Performance tests with custom reporting

### Environment Variables
Tests use isolated environments:

```bash
NODE_ENV=test                    # Test environment
COPILOT_MCP_TEST=true           # Test mode flag
COPILOT_MCP_TEST_STORAGE=path   # Test storage location
```

## Test Utilities

### TestHelpers.ts
Comprehensive utilities for testing:

- **Environment Setup**: Temporary directories, test configurations
- **Mock Data**: Realistic test data generators
- **Performance Measurement**: Timing and memory tracking
- **MCP Protocol**: JSON-RPC 2.0 message helpers
- **Async Utilities**: Waiting, timeouts, and condition checking

### Sample Data
Pre-defined test fixtures:

- **Sample Memories**: Representative memory data across all layers
- **Chat Modes**: Example custom and built-in modes
- **Project Structures**: Complete project examples (Node.js, React, Python)
- **Error Patterns**: Common development errors and solutions
- **Performance Thresholds**: Expected performance benchmarks

## Writing Tests

### Test Patterns

#### Unit Test Structure
```typescript
describe('ComponentName', () => {
  let component: ComponentName;

  beforeEach(async () => {
    component = new ComponentName();
    await component.initialize();
  });

  afterEach(async () => {
    await component.cleanup();
  });

  describe('feature group', () => {
    it('should perform specific behavior', async () => {
      // Arrange
      const input = createTestInput();

      // Act
      const result = await component.performAction(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.property).toBe(expectedValue);
    });
  });
});
```

#### Performance Test Structure
```typescript
it('should complete operation within threshold', async () => {
  const endTimer = performanceMeasurer.start('operation-name');

  // Perform operation
  const result = await component.performOperation();

  const duration = endTimer();

  expect(result).toBeDefined();
  expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD);

  console.log(`Operation completed in ${duration.toFixed(2)}ms`);
});
```

### Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up resources (temp files, connections, etc.)
3. **Realistic Data**: Use representative test data that matches production usage
4. **Error Testing**: Test both success and failure scenarios
5. **Performance Awareness**: Include performance assertions for critical paths
6. **Documentation**: Clear test descriptions that explain the behavior being tested

### Adding New Tests

1. **Unit Tests**: Add to appropriate subdirectory under `tests/unit/`
2. **Integration Tests**: Add to `tests/integration/` with proper setup/teardown
3. **E2E Tests**: Add to `tests/e2e/workflows/` for complete user scenarios
4. **Performance Tests**: Add to `tests/performance/` with timing assertions

## Coverage Reports

Coverage reports are generated in multiple formats:
- **Text**: Console output during test runs
- **HTML**: `coverage/html/index.html` - Interactive browser report
- **LCOV**: `coverage/lcov.info` - For CI/CD integration
- **JSON**: `coverage/coverage-final.json` - Programmatic access

### Coverage Targets
- **Unit Tests**: 80% minimum (branches, functions, lines, statements)
- **Integration Tests**: Focus on critical paths
- **E2E Tests**: Business logic coverage
- **Performance Tests**: No coverage requirements

## Continuous Integration

The test suite is designed for CI/CD pipelines:

```yaml
# Example GitHub Actions integration
- name: Run Tests
  run: |
    npm run test:ci
    npm run test:coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

## Performance Monitoring

Performance tests generate detailed reports:
- **HTML Report**: `performance-reports/performance-report.html`
- **JSON Data**: `performance-reports/performance-metrics.json`
- **Console Summary**: Real-time performance feedback

### Performance Thresholds
- **Memory Operations**: < 10ms per operation
- **Project Initialization**: < 3s for small projects
- **Search Operations**: < 200ms for complex queries
- **Mode Operations**: < 1s for mode creation
- **System Recovery**: < 5s after peak load

## Troubleshooting

### Common Issues

#### Test Timeouts
- Increase timeout in Jest configuration
- Check for unresolved promises
- Verify proper cleanup in afterEach

#### Memory Leaks
- Use MemoryTracker utility to monitor usage
- Ensure all resources are properly closed
- Check for circular references

#### File System Issues
- Verify temp directory permissions
- Ensure proper cleanup of test files
- Use absolute paths in tests

#### Performance Test Failures
- Check system load during test execution
- Review performance thresholds for realism
- Consider environment-specific adjustments

### Debug Mode
```bash
# Run tests with debug output
DEBUG=true npm test

# Run specific test file
npm test -- tests/unit/memory/MemoryManager.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should handle errors"
```

## Contributing

When contributing tests:

1. Follow existing patterns and naming conventions
2. Include both positive and negative test cases
3. Add performance assertions for new features
4. Update this README for new test categories
5. Ensure tests pass in CI environment

## Maintenance

Regular test maintenance tasks:

1. **Update Thresholds**: Review performance benchmarks quarterly
2. **Refresh Sample Data**: Keep test fixtures current with real usage
3. **Dependency Updates**: Ensure test framework stays current
4. **Coverage Review**: Monitor and improve test coverage
5. **Performance Trends**: Track performance changes over time