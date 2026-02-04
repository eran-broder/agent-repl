# agent-repl

A Python REPL for AI agents with built-in tools and MCP integration.

## Features

- **Process-based isolation**: Each REPL runs as a separate process with its own namespace
- **Built-in tools**: Bash, Read, Write, Edit, Glob, Grep, Ls, Cd, Cwd, Env
- **MCP server**: Expose REPL as native MCP tools (not just CLI)
- **MCP client**: Auto-discovers MCP servers from `~/.claude.json`
- **Socket communication**: REPLs communicate via localhost TCP sockets
- **No persistence**: State lives only in running processes (radical simplicity)

## Installation

### Option 1: Claude Code Plugin (Recommended)

Install as a Claude Code plugin to get the `/python-repl` skill:

```bash
/plugin install agent-repl@github:eran-broder/agent-repl
```

This installs both the CLI tool and the skill that teaches Claude how to use it.

### Option 2: Skill Only

Copy the skill to your personal skills folder:

```bash
# Clone and copy skill
git clone https://github.com/eran-broder/agent-repl.git
cp -r agent-repl/skill/python-repl ~/.claude/skills/

# Install the CLI
pip install git+https://github.com/eran-broder/agent-repl.git
```

### Option 3: CLI Only

```bash
pip install git+https://github.com/eran-broder/agent-repl.git
```

Or install from source:

```bash
git clone https://github.com/eran-broder/agent-repl.git
cd agent-repl
pip install -e .
```

## Usage

### CLI Commands

```bash
# Create a new REPL (prints port number)
repl create

# Execute code in a REPL
repl exec <port> "x = 42"
repl exec <port> "print(x)"

# Show namespace variables
repl show <port>

# Reset namespace
repl reset <port>

# Check if REPL is alive
repl check <port>

# Destroy REPL
repl destroy <port>
```

### Example Session

```bash
$ repl create
52341

$ repl exec 52341 "x = [1, 2, 3]"
[OK]

$ repl exec 52341 "sum(x)"
[result]
6

$ repl exec 52341 "files = Glob('*.py')"
[OK]

$ repl exec 52341 "content = Read('setup.py')"
[OK]

$ repl show 52341
x: list = [1, 2, 3]
files: list = ['setup.py', 'test.py']
content: str = '# setup...'

$ repl destroy 52341
[OK] REPL 52341 destroyed
```

### Built-in Tools

All tools are available in the REPL namespace:

| Tool | Description |
|------|-------------|
| `Bash(cmd)` | Execute shell command, returns stdout |
| `Read(path)` | Read file contents |
| `Write(path, content)` | Write content to file |
| `Edit(path, old, new)` | Replace text in file |
| `Glob(pattern, path?)` | Find files matching pattern |
| `Grep(pattern, path?)` | Search file contents |
| `Ls(path?)` | List directory contents |
| `Cd(path)` | Change working directory |
| `Cwd()` | Get current working directory |
| `Env(name, default?)` | Get environment variable |

### MCP Integration

If you have MCP servers configured in `~/.claude.json`, they are automatically available:

```python
# Access MCP tools via the mcp namespace
mcp.filesystem.read_file(path="/tmp/test.txt")
mcp.memory.store(key="data", value="hello")
```

## Claude Code Skill

When installed as a plugin or skill, Claude Code learns how to use the REPL automatically.

**Invoke manually:**
```
/python-repl new           # Create a REPL
/python-repl show          # Show current state
/python-repl reset         # Reset namespace
/python-repl destroy       # Destroy REPL
```

**Or let Claude decide:** Just ask Claude to do multi-step Python work and it will use the REPL when appropriate.

## MCP Server (Native Tools)

For the best experience, run agent-repl as an MCP server. This exposes REPL operations as native tools instead of CLI commands.

### Install with MCP server support

```bash
pip install "agent-repl[mcp-server] @ git+https://github.com/eran-broder/agent-repl.git"
```

### Configure in Claude Code

Add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "python-repl": {
      "command": "agent-repl-mcp"
    }
  }
}
```

Or with full path:

```json
{
  "mcpServers": {
    "python-repl": {
      "command": "python",
      "args": ["-m", "agent_repl.mcp_server"]
    }
  }
}
```

### Available MCP Tools

Once configured, these tools are available natively:

| Tool | Description |
|------|-------------|
| `python_repl_create()` | Create new REPL, returns port |
| `python_repl_exec(port, code)` | Execute Python code |
| `python_repl_show(port)` | Show namespace variables |
| `python_repl_reset(port)` | Clear namespace |
| `python_repl_check(port)` | Check if REPL is alive |
| `python_repl_destroy(port)` | Destroy REPL |

Claude will call these directly as tools, not via Bash.

## For AI Agents

This REPL is designed for AI agents like Claude Code. Agents can:

**Via MCP tools (recommended):**
1. `python_repl_create()` → returns `{port: 12345}`
2. `python_repl_exec(12345, "x = 42")` → execute code
3. `python_repl_show(12345)` → see variables
4. `python_repl_destroy(12345)` → cleanup

**Via CLI (fallback):**
1. `Bash("repl create")` → returns port
2. `Bash("repl exec <port> '<code>'")`  → execute code
3. `Bash("repl destroy <port>")` → cleanup

Each agent (including subagents) can create its own REPL instance.

## Requirements

- Python 3.11+
- No external dependencies for CLI
- Optional: `mcp[cli]>=1.2.0` for MCP server

## License

MIT
