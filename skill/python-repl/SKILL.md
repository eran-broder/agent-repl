---
name: python-repl
description: Use a persistent Python REPL for multi-step computations, data analysis, and stateful code execution. Invoke when you need to run Python code that builds on previous results, define reusable functions, or work with data across multiple steps.
argument-hint: "[code or 'new' or 'show' or 'reset' or 'destroy']"
allowed-tools: Bash(repl *)
---

# Python REPL Skill

Use this skill when you need **persistent Python state** across multiple executions. The REPL maintains variables, functions, and classes between calls.

## When to Use

- Multi-step computations where results build on each other
- Data analysis and exploration
- Defining and testing functions iteratively
- Working with state that persists across commands
- Quick prototyping without creating files

## Quick Start

```bash
# Create a new REPL (returns port number)
repl create

# Execute code (use the port from create)
repl exec <port> "x = 42"
repl exec <port> "x * 2"  # Returns 84

# Show all variables
repl show <port>

# When done
repl destroy <port>
```

## Commands

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

1. **Start**: `repl create` → save the port
2. **Work**: `repl exec <port> "<code>"` repeatedly
3. **Check**: `repl show <port>` to see state
4. **Finish**: `repl destroy <port>` when done

## Examples

### Data Analysis

```bash
PORT=$(repl create)
repl exec $PORT "data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]"
repl exec $PORT "avg = sum(data) / len(data)"
repl exec $PORT "variance = sum((x - avg) ** 2 for x in data) / len(data)"
repl exec $PORT "import math; std_dev = math.sqrt(variance)"
repl exec $PORT "f'Mean: {avg}, Std Dev: {std_dev:.2f}'"
repl destroy $PORT
```

### File Processing

```bash
PORT=$(repl create)
repl exec $PORT "files = Glob('*.py')"
repl exec $PORT "contents = {f: Read(f) for f in files[:5]}"
repl exec $PORT "line_counts = {f: len(c.splitlines()) for f, c in contents.items()}"
repl exec $PORT "sorted(line_counts.items(), key=lambda x: -x[1])"
repl destroy $PORT
```

### Define and Test Functions

```bash
PORT=$(repl create)
repl exec $PORT "def factorial(n):
    if n <= 1: return n
    return n * factorial(n-1)"
repl exec $PORT "[factorial(i) for i in range(1, 11)]"
repl destroy $PORT
```

## Tips

- Always save the port from `repl create`
- Quote code properly: `repl exec $PORT "code here"`
- Use `repl show` to inspect current state
- Use `repl reset` to clear variables without restarting
- Destroy REPLs when done to free resources
- Each agent/subagent should create its own REPL

## Installation

```bash
pip install git+https://github.com/eran-broder/agent-repl.git
```
