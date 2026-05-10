"""REPL process manager."""
from __future__ import annotations

import socket
import subprocess
import sys
import time

SERVER_MODULE = "agent_repl.server"
STARTUP_TIMEOUT = 30.0


def start_repl() -> int:
    """Start a new REPL server process. Returns the port number."""
    proc = subprocess.Popen(
        [sys.executable, "-m", SERVER_MODULE, "0"],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
    )

    start = time.time()
    while time.time() - start < STARTUP_TIMEOUT:
        if proc.stdout is None:
            raise RuntimeError("No stdout from server process")

        line = proc.stdout.readline().strip()
        if line:
            return int(line)

        if proc.poll() is not None:
            raise RuntimeError("Server process died during startup")

        time.sleep(0.1)

    proc.kill()
    raise RuntimeError("Server startup timed out")


def is_repl_alive(port: int) -> bool:
    """Check if a REPL server is responding."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(1.0)
            sock.connect(("127.0.0.1", port))
            return True
    except (ConnectionRefusedError, TimeoutError, OSError):
        return False
