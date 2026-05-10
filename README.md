# agent-repl

Persistent **Python** and **Node.js** REPLs for AI agents. Pick the one that fits the task — both ship in this repo with the same shape.

## Why?

AI agents using standard tools are **stateless** - each execution starts fresh. This forces agents to either:
- Write everything in one massive script
- Save/load state to files between calls
- Re-compute everything each time

**agent-repl solves this.** Variables, functions, and classes persist across calls.

```bash
# Python
PORT=$(repl create)
repl exec $PORT "data = [1, 2, 3, 4, 5]"
repl exec $PORT "total = sum(data)"
repl exec $PORT "f'Average: {total / len(data)}'"
repl destroy $PORT

# Node
PORT=$(nrepl create)
nrepl exec $PORT "const data = [1, 2, 3, 4, 5]"
nrepl exec $PORT "const total = data.reduce((a,b)=>a+b, 0)"
nrepl exec $PORT "\`Average: \${total / data.length}\`"
nrepl destroy $PORT
```

Two engines, same protocol, same CLI shape.

## Two REPLs, one repo

| Implementation | Language | CLI binaries | Path |
|----------------|----------|--------------|------|
| Python REPL    | Python 3.11+ | `repl`, `agent-repl` | `src/agent_repl/` |
| Node REPL      | Node 20+    | `nrepl`, `node-agent-repl` | `node/` |

Each is independent. Install one, the other, or both.

## Installation

### Python REPL
```bash
pip install git+https://github.com/eran-broder/agent-repl.git
```

### Node REPL
```bash
npm install -g github:eran-broder/agent-repl#main:/node
# or, from a clone:
cd node && npm install -g .
```

### Claude Code plugin
```bash
claude plugin marketplace add eran-broder/agent-repl
claude plugin install agent-repl
```

The plugin ships two skills — `python-repl` and `node-repl`. Pick whichever fits.

## CLI

Both implementations expose the same six subcommands:

```bash
<bin> create              # Create REPL, prints port
<bin> exec <port> "code"  # Execute code
<bin> show <port>         # Show user-defined names
<bin> reset <port>        # Clear namespace
<bin> destroy <port>      # Shut down REPL
<bin> check <port>        # Check if alive
```

`<bin>` is `repl` (Python) or `nrepl` (Node).

## Built-in tools

Each REPL exposes these tools in its namespace — no imports needed:

| Tool | Description |
|------|-------------|
| `Bash(cmd)` | Execute shell command |
| `Read(path)` | Read file contents |
| `Write(path, content)` | Write to file |
| `Edit(path, old, new)` | Replace text in file |
| `Glob(pattern, path?)` | Find files by pattern |
| `Grep(pattern, ...)` | Search file contents |
| `Ls(path?)` | List directory |
| `Cd(path)` | Change directory |
| `Cwd()` | Get current directory |
| `Env(name)` | Get/set environment variable |

## Pre-loaded modules

| Python | Node |
|--------|------|
| `os`, `sys`, `json`, `re`, `math`, `pathlib.Path`, `datetime`, `collections`, `itertools`, `functools`, `random` | `fs`, `path`, `os`, `crypto`, `util`, `url`, `child_process` (plus globals: `Buffer`, `process`, `URL`, `fetch`, `setTimeout`, ...) |

## Features

- **Persistent state**: variables, functions, classes survive across `exec` calls
- **Process isolation**: each REPL is its own process with its own namespace
- **Built-in tools**: file ops, shell, glob/grep — ready to use
- **Zero runtime dependencies**
- **Top-level await** (Node) and full statement/expression support (both)
- **Agent-friendly**: each agent/subagent can spin up its own isolated REPL

## License

MIT
