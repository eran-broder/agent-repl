"""Client for communicating with REPL servers."""
from __future__ import annotations

import json
import socket
from typing import Any

BUFFER_SIZE = 65536
TIMEOUT = 30.0


def send_command(port: int, action: str, **kwargs: Any) -> dict[str, Any]:
    """Send a command to a REPL server and return the response."""
    msg = {"action": action, **kwargs}

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(TIMEOUT)
        sock.connect(("127.0.0.1", port))
        sock.sendall(json.dumps(msg).encode("utf-8"))
        response = sock.recv(BUFFER_SIZE).decode("utf-8")

    return json.loads(response)


def execute(port: int, code: str) -> dict[str, Any]:
    """Execute code in a REPL."""
    return send_command(port, "exec", code=code)


def show(port: int) -> str:
    """Get namespace from a REPL."""
    response = send_command(port, "show")
    return response.get("namespace", "")


def reset(port: int) -> bool:
    """Reset a REPL's namespace."""
    response = send_command(port, "reset")
    return response.get("ok", False)


def quit_server(port: int) -> bool:
    """Tell a REPL server to shut down."""
    try:
        response = send_command(port, "quit")
        return response.get("ok", False)
    except (ConnectionRefusedError, ConnectionResetError):
        return True
