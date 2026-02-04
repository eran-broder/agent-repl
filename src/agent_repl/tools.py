"""Built-in tools available in the REPL namespace."""
from __future__ import annotations

import os
import re
import subprocess
from pathlib import Path


def Bash(
    command: str,
    timeout: float = 120.0,
    cwd: str | Path | None = None,
) -> str:
    """
    Execute a shell command and return its output.

    Args:
        command: Shell command to execute
        timeout: Max seconds to wait (default 120)
        cwd: Working directory (default: current)

    Returns:
        Combined stdout and stderr

    Example:
        >>> Bash("ls -la")
        >>> Bash("git status")
    """
    result = subprocess.run(
        command,
        shell=True,
        capture_output=True,
        text=True,
        timeout=timeout,
        cwd=cwd,
    )
    output = result.stdout
    if result.stderr:
        output += "\n[stderr]\n" + result.stderr
    if result.returncode != 0:
        output += f"\n[exit code: {result.returncode}]"
    return output.strip()


def Read(path: str | Path, encoding: str = "utf-8") -> str:
    """
    Read a file and return its contents.

    Args:
        path: Path to file
        encoding: Text encoding (default utf-8)

    Returns:
        File contents as string
    """
    return Path(path).read_text(encoding=encoding)


def Write(path: str | Path, content: str, encoding: str = "utf-8") -> int:
    """
    Write content to a file.

    Args:
        path: Path to file (creates parent directories if needed)
        content: String content to write
        encoding: Text encoding (default utf-8)

    Returns:
        Number of bytes written
    """
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    return p.write_text(content, encoding=encoding)


def Glob(
    pattern: str,
    path: str | Path = ".",
    recursive: bool = True,
) -> list[str]:
    """
    Find files matching a glob pattern.

    Args:
        pattern: Glob pattern (e.g., "*.py", "**/*.txt")
        path: Base directory (default: current)
        recursive: If True, ** matches directories recursively

    Returns:
        List of matching file paths as strings
    """
    base = Path(path)
    if recursive and "**" not in pattern:
        pattern = "**/" + pattern
    matches = list(base.glob(pattern))
    return sorted(str(m) for m in matches if m.is_file())


def Grep(
    pattern: str,
    path: str | Path = ".",
    glob: str = "**/*",
    ignore_case: bool = False,
    context: int = 0,
    max_matches: int = 100,
) -> list[dict]:
    """
    Search for a regex pattern in files.

    Args:
        pattern: Regex pattern to search for
        path: Base directory (default: current)
        glob: File pattern to search in (default: all files)
        ignore_case: Case-insensitive search
        context: Lines of context around matches
        max_matches: Maximum matches to return

    Returns:
        List of dicts with keys: file, line, match, context
    """
    flags = re.IGNORECASE if ignore_case else 0
    regex = re.compile(pattern, flags)
    results: list[dict] = []
    base = Path(path)

    for filepath in base.glob(glob):
        if not filepath.is_file():
            continue
        try:
            lines = filepath.read_text(errors="ignore").splitlines()
        except Exception:
            continue

        for i, line in enumerate(lines):
            if regex.search(line):
                ctx_start = max(0, i - context)
                ctx_end = min(len(lines), i + context + 1)
                results.append({
                    "file": str(filepath),
                    "line": i + 1,
                    "match": line.strip(),
                    "context": lines[ctx_start:ctx_end] if context > 0 else None,
                })
                if len(results) >= max_matches:
                    return results
    return results


def Edit(
    path: str | Path,
    old: str,
    new: str,
    count: int = 1,
) -> bool:
    """
    Replace text in a file.

    Args:
        path: Path to file
        old: Text to find
        new: Text to replace with
        count: Max replacements (default 1, use -1 for all)

    Returns:
        True if any replacements made
    """
    p = Path(path)
    content = p.read_text()
    new_content = content.replace(old, new, count) if count != -1 else content.replace(old, new)

    if new_content != content:
        p.write_text(new_content)
        return True
    return False


def Ls(path: str | Path = ".", pattern: str = "*") -> list[str]:
    """List directory contents."""
    p = Path(path)
    return sorted(str(x.name) for x in p.glob(pattern))


def Cwd() -> str:
    """Get current working directory."""
    return os.getcwd()


def Cd(path: str | Path) -> str:
    """Change working directory."""
    os.chdir(path)
    return os.getcwd()


def Env(name: str | None = None, value: str | None = None) -> str | dict:
    """Get or set environment variables."""
    if name is None:
        return dict(os.environ)
    if value is not None:
        os.environ[name] = value
    return os.environ.get(name, "")


TOOLS = {
    "Bash": Bash,
    "Read": Read,
    "Write": Write,
    "Glob": Glob,
    "Grep": Grep,
    "Edit": Edit,
    "Ls": Ls,
    "Cwd": Cwd,
    "Cd": Cd,
    "Env": Env,
}
