---
name: python-repl
description: Use a persistent Python REPL for multi-step computations, data analysis, and stateful code execution. Invoke when you need to run Python code that builds on previous results, define reusable functions, or work with data across multiple steps.
argument-hint: "[code or 'new' or 'show' or 'reset' or 'destroy']"
---

# Python REPL Skill

Use this skill when you need **persistent Python state** across multiple executions. The REPL maintains variables, functions, and classes between calls.

## When to Use

- Multi-step computations where results build on each other
- Data analysis and exploration
- Defining and testing functions iteratively
- Working with state that persists across commands
- Quick prototyping without creating files

## How to Use

**If MCP tools are available** (check for `python_repl_create` tool):

```
python_repl_create() → {"port": 12345}
python_repl_exec(port=12345, code="x = 42") → {"result": null, "stdout": "", "error": null}
python_repl_exec(port=12345, code="x * 2") → {"result": "84", "stdout": "", "error": null}
python_repl_show(port=12345) → {"namespace": "x: int = 42"}
python_repl_destroy(port=12345) → {"ok": true}
```

**If using CLI via Bash** (fallback):

```bash
repl create                    # Returns port number
repl exec <port> "x = 42"      # Execute code
repl exec <port> "x * 2"       # Returns 84
repl show <port>               # Show variables
repl destroy <port>            # Cleanup
```

## MCP Tools Reference

| Tool | Parameters | Description |
|------|------------|-------------|
| `python_repl_create` | none | Create new REPL, returns port |
| `python_repl_exec` | `port`, `code` | Execute Python code |
| `python_repl_show` | `port` | Show namespace variables |
| `python_repl_reset` | `port` | Clear namespace |
| `python_repl_check` | `port` | Check if REPL is alive |
| `python_repl_destroy` | `port` | Destroy REPL |

## CLI Commands Reference

| Command | Description |
|---------|-------------|
| `repl create` | Create new REPL, prints port number |
| `repl exec <port> "<code>"` | Execute Python code |
| `repl show <port>` | Show namespace (variables, functions) |
| `repl reset <port>` | Clear namespace, keep REPL alive |
| `repl check <port>` | Check if REPL is alive |
| `repl destroy <port>` | Shut down REPL |

## Built-in Tools in REPL Namespace

The REPL has these tools pre-loaded:

| Tool | Usage |
|------|-------|
| `Bash(cmd)` | Execute shell command |
| `Read(path)` | Read file contents |
| `Write(path, content)` | Write to file |
| `Edit(path, old, new)` | Replace text in file |
| `Glob(pattern, path?)` | Find files by pattern |
| `Grep(pattern, path?)` | Search file contents |
| `Ls(path?)` | List directory |
| `Cd(path)` | Change directory |
| `Cwd()` | Get current directory |
| `Env(name)` | Get environment variable |

## Standard Library

Pre-imported: `os`, `sys`, `json`, `re`, `math`, `pathlib`, `datetime`, `collections`, `itertools`, `functools`, `random`, `Path`

## Workflow Pattern

1. **Start**: Create REPL → save the port
2. **Work**: Execute code repeatedly, building on previous results
3. **Check**: Show namespace to see current state
4. **Finish**: Destroy REPL when done

## Examples

### Data Analysis (MCP tools)

```
python_repl_create() → port=54321
python_repl_exec(54321, "data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]")
python_repl_exec(54321, "avg = sum(data) / len(data)")
python_repl_exec(54321, "f'Mean: {avg}'") → "Mean: 5.5"
python_repl_destroy(54321)
```

### File Processing (CLI)

```bash
PORT=$(repl create)
repl exec $PORT "files = Glob('*.py')"
repl exec $PORT "contents = {f: Read(f) for f in files[:5]}"
repl exec $PORT "line_counts = {f: len(c.splitlines()) for f, c in contents.items()}"
repl exec $PORT "sorted(line_counts.items(), key=lambda x: -x[1])"
repl destroy $PORT
```

### Define Functions

```
python_repl_create() → port=54321
python_repl_exec(54321, "def factorial(n): return 1 if n <= 1 else n * factorial(n-1)")
python_repl_exec(54321, "factorial(10)") → "3628800"
python_repl_destroy(54321)
```

## Tips

- Always save the port from create
- Use show to inspect current state when debugging
- Use reset to clear variables without restarting
- Always destroy REPLs when done to free resources
- Each agent/subagent should create its own REPL

## Installation

```bash
# With MCP server support (recommended)
pip install "agent-repl[mcp-server] @ git+https://github.com/eran-broder/agent-repl.git"

# CLI only
pip install git+https://github.com/eran-broder/agent-repl.git
```

Configure MCP server in `~/.claude.json`:

```json
{
  "mcpServers": {
    "python-repl": {
      "command": "agent-repl-mcp"
    }
  }
}
```
