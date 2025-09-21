#!/bin/bash

# Copilot MCP Toolset - Standalone Server Installation Script
# This script installs the MCP server with multiple installation options

set -e

echo "🚀 Installing Copilot MCP Server..."

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
MIN_VERSION="18.0.0"

if [ "$(printf '%s\n' "$MIN_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$MIN_VERSION" ]; then
    echo "❌ Node.js $MIN_VERSION or higher is required. Found: $NODE_VERSION"
    exit 1
fi

echo "✅ Node.js version: $NODE_VERSION"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
npm run build

echo ""
echo "🔧 Installation Options:"
echo "1. Local installation (recommended)"
echo "2. User-global installation (no sudo required)"
echo "3. System-global installation (requires sudo)"
echo ""

# Check if running in CI or non-interactive mode
if [ -t 0 ]; then
    read -p "Choose installation method (1-3) [1]: " choice
    choice=${choice:-1}
else
    echo "Running in non-interactive mode, using local installation..."
    choice=1
fi

case $choice in
    1)
        echo "🏠 Installing locally..."
        # Create a local bin directory if it doesn't exist
        mkdir -p ~/.local/bin
        
        # Create a wrapper script
        cat > ~/.local/bin/copilot-mcp-server << EOF
#!/bin/bash
exec node "$(pwd)/dist/server/index.js" "\$@"
EOF
        
        chmod +x ~/.local/bin/copilot-mcp-server
        
        # Add to PATH if not already there
        if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
            echo ""
            echo "⚠️  Add ~/.local/bin to your PATH by adding this to your ~/.bashrc or ~/.zshrc:"
            echo "export PATH=\"\$HOME/.local/bin:\$PATH\""
            echo ""
            echo "Or run: echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.bashrc"
            echo "Then restart your terminal or run: source ~/.bashrc"
        fi
        
        INSTALL_PATH="$HOME/.local/bin/copilot-mcp-server"
        INSTALL_TYPE="local"
        ;;
    2)
        echo "👤 Installing to user directory..."
        # Configure npm to install globally to user directory
        npm config set prefix ~/.npm-global
        npm install -g .
        
        # Add to PATH if not already there
        if [[ ":$PATH:" != *":$HOME/.npm-global/bin:"* ]]; then
            echo ""
            echo "⚠️  Add ~/.npm-global/bin to your PATH by adding this to your ~/.bashrc or ~/.zshrc:"
            echo "export PATH=\"\$HOME/.npm-global/bin:\$PATH\""
            echo ""
            echo "Or run: echo 'export PATH=\"\$HOME/.npm-global/bin:\$PATH\"' >> ~/.bashrc"
            echo "Then restart your terminal or run: source ~/.bashrc"
        fi
        
        INSTALL_PATH="$HOME/.npm-global/bin/copilot-mcp-server"
        INSTALL_TYPE="user-global"
        ;;
    3)
        echo "🌍 Installing globally (requires sudo)..."
        sudo npm install -g .
        INSTALL_PATH="/usr/local/bin/copilot-mcp-server"
        INSTALL_TYPE="system-global"
        ;;
    *)
        echo "❌ Invalid choice. Exiting."
        exit 1
        ;;
esac

# Verify installation
echo ""
echo "🔍 Verifying installation..."

if [ "$choice" = "1" ]; then
    # For local installation, check if the wrapper script exists
    if [ -f "$INSTALL_PATH" ]; then
        echo "✅ Server installed successfully at $INSTALL_PATH"
        INSTALL_SUCCESS=true
    else
        echo "❌ Installation failed"
        INSTALL_SUCCESS=false
    fi
elif command -v copilot-mcp-server &> /dev/null; then
    echo "✅ Server installed successfully!"
    INSTALL_SUCCESS=true
else
    echo "❌ Installation failed or PATH not updated"
    echo "💡 You may need to restart your terminal or update your PATH"
    INSTALL_SUCCESS=false
fi

if [ "$INSTALL_SUCCESS" = true ]; then
    echo ""
    echo "🎯 Next steps:"
    echo "1. Configure VS Code with the MCP server"
    echo "2. Add to your .vscode/mcp.json:"
    echo ""
    echo '{'
    echo '  "mcpServers": {'
    echo '    "copilot-toolset": {'
    echo '      "type": "stdio",'
    
    if [ "$choice" = "1" ]; then
        echo "      \"command\": \"$INSTALL_PATH\""
    else
        echo '      "command": "copilot-mcp-server"'
    fi
    
    echo '    }'
    echo '  }'
    echo '}'
    echo ""
    echo "3. Restart VS Code and GitHub Copilot will have access to MCP tools"
    
    if [ "$choice" = "1" ]; then
        echo ""
        echo "📝 Alternative: You can also use npx to run without installation:"
        echo "   npx --yes $(pwd) in your MCP configuration"
    fi
else
    echo ""
    echo "🔧 Alternative options:"
    echo "1. Use npx directly: npx --yes $(pwd)"
    echo "2. Run locally: node $(pwd)/dist/server/index.js"
    echo "3. Try running the script again with sudo for global installation"
    exit 1
fi