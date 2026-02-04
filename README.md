# agent-repl

A Python REPL for AI agents with persistent state across executions.

## Why?

AI agents using standard tools are **stateless** - each Python execution starts fresh. This forces agents to either:
- Write everything in one massive script
- Save/load state to files between calls
- Re-compute everything each time

**agent-repl solves this.** Variables, functions, and classes persist across calls:

```bash
PORT=$(repl create)
repl exec $PORT "data = [1, 2, 3, 4, 5]"           # Define data
repl exec $PORT "total = sum(data)"                # Use it later
repl exec $PORT "avg = total / len(data)"          # Build on results
repl exec $PORT "f'Average: {avg}'"                # Still accessible
# [result] 'Average: 3.0'
repl destroy $PORT
```

## Real Example: Multi-Step Codebase Analysis

```bash
PORT=$(repl create)

# Step 1: Find files (state: py_files)
repl exec $PORT "py_files = Glob('**/*.py', 'src')"

# Step 2: Define analyzer class (state: CodeAnalyzer)
repl exec $PORT "
class CodeAnalyzer:
    def __init__(self, path):
        self.content = Read(path)
    def line_count(self):
        return len(self.content.splitlines())
    def complexity(self):
        return sum(self.content.count(kw) for kw in ['if ', 'for ', 'while '])
"

# Step 3: Analyze all files (state: results)
repl exec $PORT "results = {f: CodeAnalyzer(f) for f in py_files}"

# Step 4: Generate report (uses all previous state!)
repl exec $PORT "
total_lines = sum(a.line_count() for a in results.values())
most_complex = max(results.items(), key=lambda x: x[1].complexity())
f'Total: {total_lines} lines, Most complex: {most_complex[0]}'
"

repl destroy $PORT
```

**Without REPL:** This would require passing all state as parameters, writing temp files, or cramming everything into one script.

## Installation

```bash
# Install the CLI
pip install git+https://github.com/eran-broder/agent-repl.git

# Install the Claude Code plugin
claude plugin marketplace add eran-broder/agent-repl && claude plugin install agent-repl
```

## Usage

### For Claude Code Users

After installing the plugin, just ask Claude to do multi-step Python work - it will use the REPL automatically. Or invoke explicitly:

```
/agent-repl:python-repl
```

### CLI Commands

```bash
repl create              # Create REPL, prints port
repl exec <port> "code"  # Execute code
repl show <port>         # Show all variables/functions
repl reset <port>        # Clear namespace
repl destroy <port>      # Shut down REPL
repl check <port>        # Check if alive
```

### Built-in Tools

Available in the REPL namespace - no imports needed:

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

### Pre-imported

`os`, `sys`, `json`, `re`, `math`, `pathlib.Path`, `datetime`, `collections`, `itertools`, `functools`, `random`

## Features

- **Persistent state**: Variables, functions, classes survive across `exec` calls
- **Process isolation**: Each REPL is a separate process with its own namespace
- **Built-in tools**: File operations, shell commands, glob/grep - ready to use
- **Zero dependencies**: Pure Python 3.11+
- **Agent-friendly**: Each agent/subagent can create its own isolated REPL

## License

MIT
