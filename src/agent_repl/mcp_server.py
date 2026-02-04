"""MCP server exposing Python REPL as native tools."""
from __future__ import annotations

import logging
import sys
from typing import Any

# Configure logging to stderr (stdout is reserved for JSON-RPC)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    stream=sys.stderr,
)
logger = logging.getLogger("python-repl-mcp")

try:
    from mcp.server.fastmcp import FastMCP
except ImportError:
    logger.error("MCP SDK not installed. Run: pip install 'agent-repl[mcp-server]'")
    sys.exit(1)

from . import client, manager

# Initialize FastMCP server
mcp = FastMCP("python-repl")


@mcp.tool()
def python_repl_create() -> dict[str, Any]:
    """Create a new Python REPL with persistent state.

    Returns a port number to use with other REPL tools.
    The REPL has built-in tools (Bash, Read, Write, Glob, Grep, Edit, Ls, Cd, Cwd, Env)
    and standard library modules (os, sys, json, re, math, pathlib, datetime,
    collections, itertools, functools, random) pre-loaded.

    Use this when you need persistent Python state across multiple executions,
    such as data analysis, multi-step computations, or defining reusable functions.
    """
    try:
        port = manager.start_repl()
        logger.info(f"Created REPL on port {port}")
        return {"port": port, "status": "created"}
    except Exception as e:
        logger.error(f"Failed to create REPL: {e}")
        return {"error": str(e)}


@mcp.tool()
def python_repl_exec(port: int, code: str) -> dict[str, Any]:
    """Execute Python code in a REPL.

    The code runs in a persistent namespace - variables, functions, and classes
    defined in previous executions are available. Results are returned along
    with any stdout/stderr output.

    Args:
        port: The REPL port number from python_repl_create
        code: Python code to execute (can be expressions or statements)
    """
    try:
        response = client.execute(port, code)
        logger.info(f"Executed code on port {port}")
        return response
    except Exception as e:
        logger.error(f"Execution failed on port {port}: {e}")
        return {"error": str(e)}


@mcp.tool()
def python_repl_show(port: int) -> dict[str, Any]:
    """Show the namespace (variables, functions, classes) in a REPL.

    Returns a formatted string showing all user-defined names and their values.
    Built-in modules and tools are excluded from the output.

    Args:
        port: The REPL port number
    """
    try:
        namespace = client.show(port)
        logger.info(f"Showed namespace for port {port}")
        return {"namespace": namespace}
    except Exception as e:
        logger.error(f"Show failed on port {port}: {e}")
        return {"error": str(e)}


@mcp.tool()
def python_repl_reset(port: int) -> dict[str, Any]:
    """Reset a REPL's namespace, clearing all user-defined variables.

    The REPL remains running but all variables, functions, and classes are cleared.
    Built-in tools and modules are restored to their initial state.

    Args:
        port: The REPL port number
    """
    try:
        success = client.reset(port)
        logger.info(f"Reset namespace for port {port}: {success}")
        return {"ok": success}
    except Exception as e:
        logger.error(f"Reset failed on port {port}: {e}")
        return {"error": str(e)}


@mcp.tool()
def python_repl_destroy(port: int) -> dict[str, Any]:
    """Destroy a REPL and free all resources.

    The REPL process is terminated and the port is released.
    Always call this when done with a REPL to clean up resources.

    Args:
        port: The REPL port number
    """
    try:
        success = client.quit_server(port)
        logger.info(f"Destroyed REPL on port {port}: {success}")
        return {"ok": success, "port": port}
    except Exception as e:
        logger.error(f"Destroy failed on port {port}: {e}")
        return {"error": str(e)}


@mcp.tool()
def python_repl_check(port: int) -> dict[str, Any]:
    """Check if a REPL is alive and responding.

    Args:
        port: The REPL port number
    """
    try:
        alive = manager.is_repl_alive(port)
        return {"alive": alive, "port": port}
    except Exception as e:
        logger.error(f"Check failed on port {port}: {e}")
        return {"error": str(e)}


def main() -> None:
    """Run the MCP server."""
    logger.info("Starting Python REPL MCP server")
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
