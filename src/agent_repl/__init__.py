"""
Agent REPL - Python REPL for AI agents with built-in tools and MCP integration.

Create persistent Python environments that any AI agent can use.
State lives in memory - no file persistence.
"""
from .client import execute, quit_server, reset, show
from .manager import is_repl_alive, start_repl

__version__ = "0.1.0"
__all__ = ["start_repl", "execute", "show", "reset", "quit_server", "is_repl_alive"]
