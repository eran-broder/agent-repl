"""REPL server - a Python process that holds state and executes code."""
from __future__ import annotations

import json
import socket
import sys
import traceback
from io import StringIO
from typing import Any

from .tools import TOOLS

BUFFER_SIZE = 65536
_mcp_namespace: Any = None


def create_namespace(enable_mcp: bool = True) -> dict[str, Any]:
    """Create initial namespace with modules, tools, and MCP integration."""
    global _mcp_namespace

    ns: dict[str, Any] = {"__name__": "__repl__", "__builtins__": __builtins__}

    # Standard library modules
    for mod in (
        "os", "sys", "json", "re", "math", "pathlib",
        "datetime", "collections", "itertools", "functools", "random",
    ):
        try:
            ns[mod] = __import__(mod)
        except ImportError:
            pass

    ns["Path"] = __import__("pathlib").Path

    # Built-in tools
    ns.update(TOOLS)

    # MCP tools (lazy initialization)
    if enable_mcp:
        if _mcp_namespace is None:
            try:
                from .mcp_client import discover_mcp_tools

                _mcp_namespace = discover_mcp_tools()
            except Exception as e:
                print(f"MCP discovery failed: {e}", file=sys.stderr)
                _mcp_namespace = None

        if _mcp_namespace is not None:
            ns["mcp"] = _mcp_namespace

    return ns


def execute(code: str, namespace: dict[str, Any]) -> dict[str, Any]:
    """Execute code, capture output, return result."""
    stdout_capture = StringIO()
    stderr_capture = StringIO()
    old_stdout, old_stderr = sys.stdout, sys.stderr
    sys.stdout, sys.stderr = stdout_capture, stderr_capture

    result: str | None = None
    error: str | None = None

    try:
        try:
            compiled = compile(code, "<repl>", "eval")
            value = eval(compiled, namespace)
            if value is not None:
                result = repr(value)
        except SyntaxError:
            compiled = compile(code, "<repl>", "exec")
            exec(compiled, namespace)
    except Exception as e:
        error = "".join(traceback.format_exception(type(e), e, e.__traceback__))
    finally:
        sys.stdout, sys.stderr = old_stdout, old_stderr

    return {
        "stdout": stdout_capture.getvalue(),
        "stderr": stderr_capture.getvalue(),
        "result": result,
        "error": error,
    }


def format_namespace(namespace: dict[str, Any]) -> str:
    """Format user-defined variables."""
    skip = {
        "__name__", "__builtins__", "__doc__",
        "os", "sys", "json", "re", "math", "pathlib",
        "datetime", "collections", "itertools", "functools", "random", "Path", "mcp",
        *TOOLS.keys(),
    }
    lines = []
    for k, v in sorted(namespace.items()):
        if k not in skip and not k.startswith("__"):
            try:
                r = repr(v)
                if len(r) > 80:
                    r = r[:80] + "..."
            except Exception:
                r = "<repr failed>"
            lines.append(f"{k}: {type(v).__name__} = {r}")
    return "\n".join(lines) if lines else "(empty)"


def run_server(port: int) -> None:
    """Run the REPL server on given port."""
    namespace = create_namespace()

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind(("127.0.0.1", port))
        sock.listen(1)
        actual_port = sock.getsockname()[1]
        print(actual_port, flush=True)

        while True:
            conn, _ = sock.accept()
            with conn:
                data = conn.recv(BUFFER_SIZE).decode("utf-8")
                if not data:
                    continue

                try:
                    msg = json.loads(data)
                except json.JSONDecodeError:
                    conn.sendall(json.dumps({"error": "Invalid JSON"}).encode())
                    continue

                action = msg.get("action")

                if action == "exec":
                    response = execute(msg.get("code", ""), namespace)
                elif action == "show":
                    response = {"namespace": format_namespace(namespace)}
                elif action == "reset":
                    namespace = create_namespace()
                    response = {"ok": True}
                elif action == "quit":
                    conn.sendall(json.dumps({"ok": True}).encode())
                    break
                else:
                    response = {"error": f"Unknown action: {action}"}

                conn.sendall(json.dumps(response).encode())


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    run_server(port)
