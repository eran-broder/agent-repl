---
name: node-repl
description: Use a persistent Node.js REPL for multi-step JavaScript computations and stateful execution. Invoke when you need to run JS that builds on previous results, define reusable functions/classes, or work with data across multiple steps.
argument-hint: "[code or 'new' or 'show' or 'reset' or 'destroy']"
allowed-tools: Bash(nrepl *)
---

# Node.js REPL Skill

Use this skill when you need **persistent JavaScript state** across multiple executions. The REPL maintains variables, functions, and classes between calls — `let`, `const`, and `class` all persist.

## When to Use

- Multi-step computations where results build on each other
- Data analysis and exploration
- Defining and testing functions iteratively
- Working with state that persists across commands
- Quick prototyping without creating files

## Quick Start

```bash
# Create a new REPL (returns port number)
nrepl create

# Execute code (use the port from create)
nrepl exec <port> "let x = 42"
nrepl exec <port> "x * 2"  # Returns 84

# Show all user-defined names
nrepl show <port>

# When done
nrepl destroy <port>
```

## Commands

| Command | Description |
|---------|-------------|
| `nrepl create` | Create new REPL, prints port number |
| `nrepl exec <port> "<code>"` | Execute JavaScript code |
| `nrepl show <port>` | Show namespace (user-defined identifiers) |
| `nrepl reset <port>` | Clear namespace, keep REPL alive |
| `nrepl check <port>` | Check if REPL is alive |
| `nrepl destroy <port>` | Shut down REPL |

## Built-in Tools in REPL Namespace

The REPL has these tools pre-loaded:

| Tool | Usage |
|------|-------|
| `Bash(cmd)` | Execute shell command |
| `Read(path)` | Read file contents |
| `Write(path, content)` | Write to file |
| `Edit(path, old, new)` | Replace text in file |
| `Glob(pattern, path?)` | Find files by pattern |
| `Grep(pattern, { path, glob, ignoreCase, context, maxMatches })` | Search file contents |
| `Ls(path?)` | List directory |
| `Cd(path)` | Change directory |
| `Cwd()` | Get current directory |
| `Env(name)` | Get environment variable |

## Pre-loaded Modules

Available without `require`: `fs`, `path`, `os`, `crypto`, `util`, `url`, `child_process`. Globals like `Buffer`, `process`, `URL`, `fetch`, `setTimeout` are also available.

## Workflow Pattern

1. **Start**: `nrepl create` → save the port
2. **Work**: `nrepl exec <port> "<code>"` repeatedly
3. **Check**: `nrepl show <port>` to see state
4. **Finish**: `nrepl destroy <port>` when done

## Examples

### Data Analysis

```bash
PORT=$(nrepl create)
nrepl exec $PORT "const data = [1,2,3,4,5,6,7,8,9,10]"
nrepl exec $PORT "const avg = data.reduce((a,b)=>a+b,0)/data.length"
nrepl exec $PORT "const variance = data.reduce((s,x)=>s+(x-avg)**2,0)/data.length"
nrepl exec $PORT "\`Mean: \${avg}, Std Dev: \${Math.sqrt(variance).toFixed(2)}\`"
nrepl destroy $PORT
```

### File Processing

```bash
PORT=$(nrepl create)
nrepl exec $PORT "const files = Glob('*.js')"
nrepl exec $PORT "const contents = Object.fromEntries(files.slice(0,5).map(f => [f, Read(f)]))"
nrepl exec $PORT "const lineCounts = Object.fromEntries(Object.entries(contents).map(([f,c]) => [f, c.split('\\n').length]))"
nrepl exec $PORT "Object.entries(lineCounts).sort((a,b)=>b[1]-a[1])"
nrepl destroy $PORT
```

### Async/Await

```bash
PORT=$(nrepl create)
nrepl exec $PORT "const res = await fetch('https://api.github.com')"
nrepl exec $PORT "res.status"
nrepl destroy $PORT
```

## Tips

- Always save the port from `nrepl create`
- Quote code properly: `nrepl exec $PORT "code here"`
- Use `nrepl show` to inspect current state
- Use `nrepl reset` to clear variables without restarting
- Destroy REPLs when done to free resources
- Each agent/subagent should create its own REPL
- Top-level `await` is supported
