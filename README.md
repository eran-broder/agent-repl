# agent-repl

A Python REPL for AI agents with built-in tools and persistent state.

## One-Command Installation

**Install everything with one command:**

```bash
pip install git+https://github.com/eran-broder/agent-repl.git && claude /plugin install agent-repl@github:eran-broder/agent-repl
```

Or step by step:

```bash
# 1. Install the CLI
pip install git+https://github.com/eran-broder/agent-repl.git

# 2. Install the Claude Code skill (inside Claude Code)
/plugin install agent-repl@github:eran-broder/agent-repl
```

## Features

- **Process-based isolation**: Each REPL runs as a separate process
- **Built-in tools**: Bash, Read, Write, Edit, Glob, Grep, Ls, Cd, Cwd, Env
- **Persistent state**: Variables, functions, classes persist across calls
- **No external dependencies**: Pure Python 3.11+

## Usage

After installation, use the skill in Claude Code:

```
/agent-repl:python-repl
```

Or just ask Claude to do multi-step Python work - it will use the REPL automatically.

### CLI Commands

```bash
repl create              # Create REPL, prints port
repl exec <port> "code"  # Execute code
repl show <port>         # Show namespace
repl reset <port>        # Clear namespace
repl destroy <port>      # Destroy REPL
repl check <port>        # Check if alive
```

### Example

```bash
$ PORT=$(repl create)
$ repl exec $PORT "x = 42"
[OK]
$ repl exec $PORT "x * 2"
[result]
84
$ repl exec $PORT "files = Glob('*.py')"
[OK]
$ repl destroy $PORT
[OK] REPL destroyed
```

### Built-in Tools (in REPL namespace)

| Tool | Description |
|------|-------------|
| `Bash(cmd)` | Execute shell command |
| `Read(path)` | Read file contents |
| `Write(path, content)` | Write to file |
| `Edit(path, old, new)` | Replace text in file |
| `Glob(pattern)` | Find files by pattern |
| `Grep(pattern)` | Search file contents |
| `Ls(path)` | List directory |
| `Cd(path)` | Change directory |
| `Cwd()` | Get current directory |
| `Env(name)` | Get environment variable |

## For AI Agents

Agents use the REPL via Bash:

```bash
PORT=$(repl create)
repl exec $PORT "x = 42"
repl exec $PORT "x * 2"   # Returns 84
repl destroy $PORT
```

Each agent can create its own isolated REPL instance.

## License

MIT
