# agent-repl

A Python REPL for AI agents with built-in tools and MCP client integration.

## Features

- **Process-based isolation**: Each REPL runs as a separate process with its own namespace
- **Built-in tools**: Bash, Read, Write, Edit, Glob, Grep, Ls, Cd, Cwd, Env
- **MCP client**: Auto-discovers MCP servers from `~/.claude.json` (optional)
- **Socket communication**: REPLs communicate via localhost TCP sockets
- **No persistence**: State lives only in running processes (radical simplicity)

## Installation

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

### MCP Integration (Optional)

If you have MCP servers configured in `~/.claude.json`, enable them with `--mcp`:

```bash
repl create --mcp
```

Then MCP tools are available via `mcp.<server>.<tool>()`:

```python
mcp.filesystem.read_file(path="/tmp/test.txt")
mcp.memory.store(key="data", value="hello")
```

Note: MCP discovery adds startup time, so it's disabled by default.

## For AI Agents

This REPL is designed for AI agents like Claude Code. Agents can:

1. `Bash("repl create")` → returns port
2. `Bash("repl exec <port> '<code>'")`  → execute code
3. `Bash("repl show <port>")` → see variables
4. `Bash("repl destroy <port>")` → cleanup

Each agent (including subagents) can create its own REPL instance.

## Claude Code Skill

Copy the skill to use with Claude Code:

```bash
cp -r agent-repl/skill/python-repl ~/.claude/skills/
```

Then use `/python-repl` or let Claude decide when to use it.

## Requirements

- Python 3.11+
- No external dependencies

## License

MIT
