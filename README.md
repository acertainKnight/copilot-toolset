# Copilot MCP Toolset

**Transform GitHub Copilot into a context-aware coding assistant with persistent memory, custom chat modes, and intelligent project initialization.**

🧠 **Persistent Memory** - Unified database with dual-tier memory that learns your patterns and preferences
🤖 **Custom Chat Modes** - Create specialized AI assistants (Architect, Debugger, Tester, etc.)
🏗️ **Smart Project Setup** - Automatic context generation with `.github/copilot-instructions.md` support
⚡ **8 MCP Tools** - Project initialization, unified memory management, chat modes, and self-healing
🔒 **100% Local** - Complete privacy with single SQLite database, no external API calls

## ✨ What You Get

**Enhanced GitHub Copilot** with:
- 🧠 **Learns Your Style**: Remembers preferences and applies them across all projects
- 🤖 **Specialized Modes**: Architect, debugger, refactorer, tester modes available instantly
- 🏗️ **Auto Project Setup**: Creates context files GitHub Copilot uses automatically
- ⚡ **Unified Memory**: Dual-tier system (core/longterm) with global/project bifurcation
- 📁 **Context Awareness**: Single database storing all project patterns and decisions

## 🚀 Quick Demo (3 Commands)

### Step 1: Install & Setup
```bash
# Clone and install
git clone <repository-url>
cd copilot-mcp-toolset
npm install && npm run build
./scripts/install-global.sh
```
*Auto-configures VS Code - just restart after installation*

### Step 2: Initialize Any Project
```
@copilot Initialize this project
```
*Creates `.github/copilot-instructions.md`, context files, and initializes unified memory database*

### Step 3: Try the Magic
```
@copilot Remember: I prefer functional programming patterns
@copilot Create a "security" mode for security analysis
@copilot Show my memory stats
```

**Result**: GitHub Copilot now has persistent memory, specialized modes, and deep project understanding.

## 📖 Documentation

**Get Started:**
- [📦 Installation Guide](docs/INSTALLATION.md) - *Definitive setup and configuration guide*
- [⚡ API Reference](docs/API_REFERENCE.md) - *Complete MCP tools specification*

**Learn the System:**
- [🧠 Memory System](docs/MEMORY_SYSTEM.md) - *Authoritative memory architecture guide*
- [🤖 Chat Modes](docs/CHAT_MODES.md) - *Complete chat modes reference*
- [📚 User Guide](docs/USER_GUIDE.md) - *Comprehensive usage patterns*

**For Developers:**
- [🔧 Developer Guide](docs/DEVELOPER_GUIDE.md) - *Architecture and extension guide*
- [🛠️ Troubleshooting](docs/TROUBLESHOOTING.md) - *Common issues and solutions*
- [📝 Examples](examples/) - *Working examples and templates*

## 🚀 Installation

**Ready to upgrade your GitHub Copilot?**

👉 **[Complete Installation Guide](docs/INSTALLATION.md)** - Detailed setup for all platforms
👉 **[Quick Start Guide](docs/API_REFERENCE.md#quick-start)** - Get running in 5 minutes

**Need help?** Check our [Troubleshooting Guide](docs/TROUBLESHOOTING.md) for common setup issues.

## 🤝 Support & Community

**Get Help:**
- 📖 [Documentation](docs/) - Comprehensive guides and tutorials
- 🐛 [GitHub Issues](../../issues) - Bug reports and feature requests
- 💬 [Discussions](../../discussions) - Questions and community support

**Contributing:**
- 🔧 [Developer Guide](docs/DEVELOPER_GUIDE.md) - Architecture and development setup
- 🚀 [Contributing](docs/DEVELOPER_GUIDE.md#contributing) - How to contribute code

---

**🎯 Transform your GitHub Copilot today** - Built with ❤️ for developers who want intelligent, privacy-first AI assistance.

*MIT License - Complete privacy with 100% local operation*