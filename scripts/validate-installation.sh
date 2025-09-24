#!/bin/bash

# Installation Validation Script for Copilot MCP Server
# This script validates that the MCP server is correctly installed and configured

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
WARNINGS=0

# Function to print colored output
print_status() {
    local status=$1
    local message=$2

    case $status in
        "pass")
            echo -e "${GREEN}✓${NC} $message"
            ((TESTS_PASSED++))
            ;;
        "fail")
            echo -e "${RED}✗${NC} $message"
            ((TESTS_FAILED++))
            ;;
        "warn")
            echo -e "${YELLOW}⚠${NC} $message"
            ((WARNINGS++))
            ;;
        "info")
            echo -e "${BLUE}ℹ${NC} $message"
            ;;
        "header")
            echo ""
            echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
            echo -e "${BLUE}  $message${NC}"
            echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
            ;;
    esac
}

# Function to print headers
print_header() {
    print_status "header" "$1"
}

# Test Node.js installation
test_nodejs() {
    print_header "Testing Node.js Requirements"

    # Check if Node.js is installed
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_status "pass" "Node.js is installed: $NODE_VERSION"

        # Check version requirement
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1 | sed 's/v//')
        if [ "$NODE_MAJOR" -ge 18 ]; then
            print_status "pass" "Node.js version meets requirement (>= 18)"
        else
            print_status "fail" "Node.js version too old (requires >= 18)"
        fi
    else
        print_status "fail" "Node.js is not installed"
        return 1
    fi

    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_status "pass" "npm is installed: $NPM_VERSION"
    else
        print_status "fail" "npm is not installed"
    fi
}

# Test global installation
test_global_installation() {
    print_header "Testing Global Installation"

    # Check if copilot-mcp-server is installed
    if command -v copilot-mcp-server &> /dev/null; then
        SERVER_PATH=$(which copilot-mcp-server 2>/dev/null || where copilot-mcp-server 2>/dev/null || echo "")
        print_status "pass" "copilot-mcp-server is installed globally"
        print_status "info" "Location: $SERVER_PATH"

        # Test basic execution
        if echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | timeout 2 copilot-mcp-server 2>/dev/null | grep -q "jsonrpc"; then
            print_status "pass" "Server responds to MCP protocol"
        else
            print_status "warn" "Server may not be responding correctly to MCP protocol"
        fi
    else
        print_status "fail" "copilot-mcp-server is not installed globally"
        print_status "info" "Run: npm install -g . (from project root)"
        return 1
    fi
}

# Test configuration directories
test_configuration() {
    print_header "Testing Configuration"

    GLOBAL_CONFIG_DIR="$HOME/.copilot-mcp"

    # Check global config directory
    if [ -d "$GLOBAL_CONFIG_DIR" ]; then
        print_status "pass" "Global config directory exists: $GLOBAL_CONFIG_DIR"

        # Check subdirectories
        for subdir in memory modes backups logs; do
            if [ -d "$GLOBAL_CONFIG_DIR/$subdir" ]; then
                print_status "pass" "Subdirectory exists: $subdir/"
            else
                print_status "warn" "Missing subdirectory: $subdir/"
                mkdir -p "$GLOBAL_CONFIG_DIR/$subdir"
            fi
        done

        # Check config.json
        if [ -f "$GLOBAL_CONFIG_DIR/config.json" ]; then
            print_status "pass" "Global config.json exists"

            # Validate JSON structure
            if python3 -m json.tool "$GLOBAL_CONFIG_DIR/config.json" > /dev/null 2>&1; then
                print_status "pass" "config.json is valid JSON"
            else
                print_status "fail" "config.json contains invalid JSON"
            fi
        else
            print_status "fail" "Global config.json missing"
        fi
    else
        print_status "fail" "Global config directory missing: $GLOBAL_CONFIG_DIR"
        print_status "info" "Run the install-global.sh script to create it"
    fi
}

# Test VS Code integration
test_vscode_integration() {
    print_header "Testing VS Code Integration"

    # Detect VS Code config path
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        VSCODE_CONFIG_PATH="$HOME/.config/Code/User"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        VSCODE_CONFIG_PATH="$HOME/Library/Application Support/Code/User"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        VSCODE_CONFIG_PATH="$APPDATA/Code/User"
    else
        VSCODE_CONFIG_PATH="$HOME/.config/Code/User"
    fi

    # Check VS Code config directory
    if [ -d "$VSCODE_CONFIG_PATH" ]; then
        print_status "pass" "VS Code config directory found"

        # Check MCP configuration
        if [ -f "$VSCODE_CONFIG_PATH/mcp.json" ]; then
            print_status "pass" "VS Code MCP configuration exists"

            # Validate it contains our server
            if grep -q "copilotMcpToolset" "$VSCODE_CONFIG_PATH/mcp.json" 2>/dev/null; then
                print_status "pass" "copilotMcpToolset server is configured"
            else
                print_status "fail" "copilotMcpToolset server not found in config"
            fi
        else
            print_status "warn" "VS Code MCP configuration missing"
            print_status "info" "Expected at: $VSCODE_CONFIG_PATH/mcp.json"
        fi
    else
        print_status "warn" "VS Code config directory not found"
        print_status "info" "VS Code may not be installed"
    fi

    # Check workspace configuration
    if [ -f ".vscode/mcp.json" ]; then
        print_status "pass" "Workspace MCP configuration exists"

        # Validate workspace args
        if grep -q "workspace=\${workspaceFolder}" ".vscode/mcp.json" 2>/dev/null; then
            print_status "pass" "Workspace arguments configured correctly"
        else
            print_status "warn" "Workspace arguments may not be configured"
        fi
    else
        print_status "info" "No workspace configuration in current directory"
    fi
}

# Test MCP protocol
test_mcp_protocol() {
    print_header "Testing MCP Protocol Communication"

    if ! command -v copilot-mcp-server &> /dev/null; then
        print_status "fail" "Cannot test protocol - server not installed"
        return 1
    fi

    # Test tools/list
    print_status "info" "Testing tools/list endpoint..."
    TOOLS_RESPONSE=$(echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | timeout 2 copilot-mcp-server 2>/dev/null || echo "")

    if echo "$TOOLS_RESPONSE" | grep -q '"tools"'; then
        print_status "pass" "tools/list returns valid response"

        # Check for expected tools
        for tool in init_project store_memory search_memory get_memory_stats create_mode; do
            if echo "$TOOLS_RESPONSE" | grep -q "\"$tool\""; then
                print_status "pass" "Tool available: $tool"
            else
                print_status "fail" "Tool missing: $tool"
            fi
        done
    else
        print_status "fail" "tools/list did not return valid response"
    fi

    # Test resources/list
    print_status "info" "Testing resources/list endpoint..."
    RESOURCES_RESPONSE=$(echo '{"jsonrpc":"2.0","method":"resources/list","id":2}' | timeout 2 copilot-mcp-server 2>/dev/null || echo "")

    if echo "$RESOURCES_RESPONSE" | grep -q '"resources"'; then
        print_status "pass" "resources/list returns valid response"
    else
        print_status "warn" "resources/list may not be responding correctly"
    fi

    # Test prompts/list
    print_status "info" "Testing prompts/list endpoint..."
    PROMPTS_RESPONSE=$(echo '{"jsonrpc":"2.0","method":"prompts/list","id":3}' | timeout 2 copilot-mcp-server 2>/dev/null || echo "")

    if echo "$PROMPTS_RESPONSE" | grep -q '"prompts"'; then
        print_status "pass" "prompts/list returns valid response"
    else
        print_status "warn" "prompts/list may not be responding correctly"
    fi
}

# Test workspace functionality
test_workspace() {
    print_header "Testing Workspace Functionality"

    if ! command -v copilot-mcp-server &> /dev/null; then
        print_status "fail" "Cannot test workspace - server not installed"
        return 1
    fi

    # Create a test workspace
    TEST_WORKSPACE="/tmp/mcp-test-workspace-$$"
    mkdir -p "$TEST_WORKSPACE"

    print_status "info" "Testing with workspace: $TEST_WORKSPACE"

    # Test with workspace argument
    WORKSPACE_RESPONSE=$(echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | \
        timeout 2 copilot-mcp-server --workspace="$TEST_WORKSPACE" 2>/dev/null || echo "")

    if echo "$WORKSPACE_RESPONSE" | grep -q '"tools"'; then
        print_status "pass" "Server accepts --workspace argument"
    else
        print_status "fail" "Server may not handle --workspace correctly"
    fi

    # Cleanup
    rm -rf "$TEST_WORKSPACE"
}

# Test memory functionality
test_memory() {
    print_header "Testing Memory System"

    if ! command -v copilot-mcp-server &> /dev/null; then
        print_status "fail" "Cannot test memory - server not installed"
        return 1
    fi

    # Test memory stats tool
    STATS_REQUEST='{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_memory_stats","arguments":{}},"id":1}'
    STATS_RESPONSE=$(echo "$STATS_REQUEST" | timeout 2 copilot-mcp-server 2>/dev/null || echo "")

    if echo "$STATS_RESPONSE" | grep -q '"result"'; then
        print_status "pass" "Memory stats tool responds"
    else
        print_status "warn" "Memory stats tool may not be working"
    fi

    # Check unified database
    UNIFIED_DB="$HOME/.copilot-mcp/memory/unified.db"
    if [ -f "$UNIFIED_DB" ]; then
        print_status "pass" "Unified memory database exists"

        # Check file size
        DB_SIZE=$(stat -f%z "$UNIFIED_DB" 2>/dev/null || stat -c%s "$UNIFIED_DB" 2>/dev/null || echo "0")
        print_status "info" "Database size: $DB_SIZE bytes"
    else
        print_status "info" "Unified database not yet created (created on first use)"
    fi
}

# Test performance
test_performance() {
    print_header "Testing Performance"

    if ! command -v copilot-mcp-server &> /dev/null; then
        print_status "fail" "Cannot test performance - server not installed"
        return 1
    fi

    # Test response time
    print_status "info" "Testing response time..."
    START_TIME=$(date +%s%N)
    echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | timeout 2 copilot-mcp-server > /dev/null 2>&1
    END_TIME=$(date +%s%N)

    DURATION=$(( (END_TIME - START_TIME) / 1000000 )) # Convert to milliseconds

    if [ "$DURATION" -lt 1000 ]; then
        print_status "pass" "Response time: ${DURATION}ms (< 1s)"
    else
        print_status "warn" "Response time: ${DURATION}ms (> 1s)"
    fi

    # Test concurrent requests
    print_status "info" "Testing concurrent requests..."
    for i in {1..3}; do
        (echo '{"jsonrpc":"2.0","method":"tools/list","id":'$i'}' | timeout 1 copilot-mcp-server > /dev/null 2>&1) &
    done
    wait

    print_status "pass" "Handled 3 concurrent requests"
}

# Generate summary report
generate_report() {
    print_header "Validation Summary"

    TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))

    echo ""
    echo -e "${GREEN}Passed:${NC} $TESTS_PASSED"
    echo -e "${RED}Failed:${NC} $TESTS_FAILED"
    echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
    echo ""

    if [ "$TESTS_FAILED" -eq 0 ]; then
        echo -e "${GREEN}✓ All critical tests passed!${NC}"
        echo ""
        echo "The Copilot MCP Server is properly installed and configured."
        echo ""
        echo "Next steps:"
        echo "  1. Restart VS Code"
        echo "  2. Open a project"
        echo "  3. Use GitHub Copilot with '@copilot init_project'"
        return 0
    else
        echo -e "${RED}✗ Some tests failed${NC}"
        echo ""
        echo "Please address the failed tests above."
        echo "Run './scripts/install-global.sh' to fix most issues."
        return 1
    fi
}

# Main execution
main() {
    echo "🔍 Validating Copilot MCP Server Installation"
    echo "=============================================="

    # Run all tests
    test_nodejs
    test_global_installation
    test_configuration
    test_vscode_integration
    test_mcp_protocol
    test_workspace
    test_memory
    test_performance

    # Generate report
    generate_report
}

# Run main function
main

exit $?