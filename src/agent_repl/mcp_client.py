"""MCP client for connecting to MCP servers and discovering tools."""
from __future__ import annotations

import json
import subprocess
import sys
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass
class MCPTool:
    """Represents an MCP tool."""

    name: str
    description: str
    parameters: dict[str, Any]


class StdioMCPClient:
    """Client for stdio-based MCP servers."""

    def __init__(
        self,
        name: str,
        command: str,
        args: list[str],
        env: dict[str, str] | None = None,
    ):
        self.name = name
        self.command = command
        self.args = args
        self.env = env or {}
        self._process: subprocess.Popen | None = None  # type: ignore[type-arg]
        self._request_id = 0
        self._lock = threading.Lock()
        self._tools: list[MCPTool] = []

    def connect(self) -> bool:
        """Start the MCP server process and initialize."""
        try:
            import os

            env = {**os.environ, **self.env}
            use_shell = sys.platform == "win32" and self.command in ("npx", "node", "npm")

            if use_shell:
                cmd = " ".join([self.command] + self.args)
                self._process = subprocess.Popen(
                    cmd,
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    env=env,
                    shell=True,
                    bufsize=1,
                )
            else:
                self._process = subprocess.Popen(
                    [self.command] + self.args,
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    env=env,
                    bufsize=1,
                )

            time.sleep(2)

            response = self._send_request(
                "initialize",
                {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {},
                    "clientInfo": {"name": "agent-repl", "version": "0.1.0"},
                },
            )

            if response and "result" in response:
                self._send_notification("notifications/initialized", {})
                return True

            return False
        except Exception as e:
            print(f"Failed to connect to MCP server {self.name}: {e}", file=sys.stderr)
            return False

    def disconnect(self) -> None:
        """Stop the MCP server process."""
        if self._process:
            self._process.terminate()
            try:
                self._process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self._process.kill()
            self._process = None

    def _send_request(
        self, method: str, params: dict[str, Any], timeout: float = 10.0
    ) -> dict[str, Any] | None:
        """Send a JSON-RPC request and wait for response."""
        if not self._process or not self._process.stdin or not self._process.stdout:
            return None

        with self._lock:
            self._request_id += 1
            request = {
                "jsonrpc": "2.0",
                "id": self._request_id,
                "method": method,
                "params": params,
            }

            try:
                self._process.stdin.write(json.dumps(request) + "\n")
                self._process.stdin.flush()

                result: list[str | None] = [None]

                def read_line() -> None:
                    try:
                        result[0] = self._process.stdout.readline()  # type: ignore[union-attr]
                    except Exception:
                        pass

                reader = threading.Thread(target=read_line, daemon=True)
                reader.start()
                reader.join(timeout=timeout)

                if result[0]:
                    return json.loads(result[0])

            except Exception as e:
                print(f"MCP request error: {e}", file=sys.stderr)

            return None

    def _send_notification(self, method: str, params: dict[str, Any]) -> None:
        """Send a JSON-RPC notification (no response expected)."""
        if not self._process or not self._process.stdin:
            return

        notification = {"jsonrpc": "2.0", "method": method, "params": params}

        try:
            self._process.stdin.write(json.dumps(notification) + "\n")
            self._process.stdin.flush()
        except Exception:
            pass

    def list_tools(self) -> list[MCPTool]:
        """Get list of available tools from the server."""
        response = self._send_request("tools/list", {})

        if response and "result" in response:
            tools = []
            for tool_data in response["result"].get("tools", []):
                tools.append(
                    MCPTool(
                        name=tool_data.get("name", ""),
                        description=tool_data.get("description", ""),
                        parameters=tool_data.get("inputSchema", {}),
                    )
                )
            self._tools = tools
            return tools

        return []

    def call_tool(self, tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        """Call a tool on the MCP server."""
        response = self._send_request(
            "tools/call", {"name": tool_name, "arguments": arguments}
        )

        if response and "result" in response:
            return response["result"]
        elif response and "error" in response:
            return {"error": response["error"]}

        return {"error": "No response from MCP server"}


def read_claude_config() -> dict[str, Any]:
    """Read MCP server configuration from ~/.claude.json."""
    config_path = Path.home() / ".claude.json"

    if not config_path.exists():
        return {}

    try:
        with open(config_path) as f:
            config = json.load(f)
            return config.get("mcpServers", {})
    except Exception as e:
        print(f"Error reading claude config: {e}", file=sys.stderr)
        return {}


def create_tool_proxy(client: StdioMCPClient, tool: MCPTool):  # type: ignore[no-untyped-def]
    """Create a callable proxy for an MCP tool."""

    def proxy(**kwargs: Any) -> Any:
        result = client.call_tool(tool.name, kwargs)

        if "content" in result:
            contents = result["content"]
            if isinstance(contents, list) and len(contents) > 0:
                first = contents[0]
                if isinstance(first, dict) and "text" in first:
                    return first["text"]
            return contents
        elif "error" in result:
            raise RuntimeError(f"MCP tool error: {result['error']}")

        return result

    proxy.__doc__ = f"{tool.description}\n\nParameters: {json.dumps(tool.parameters, indent=2)}"
    proxy.__name__ = tool.name

    return proxy


class MCPNamespace:
    """Namespace object that holds MCP tools as attributes."""

    def __init__(self) -> None:
        self._servers: dict[str, StdioMCPClient] = {}
        self._server_tools: dict[str, dict[str, Any]] = {}

    def _add_server(
        self, name: str, client: StdioMCPClient, tools: list[MCPTool]
    ) -> None:
        """Add a server and its tools to the namespace."""
        self._servers[name] = client
        self._server_tools[name] = {}

        for tool in tools:
            proxy = create_tool_proxy(client, tool)
            self._server_tools[name][tool.name] = proxy

    def __getattr__(self, name: str) -> Any:
        if name.startswith("_"):
            raise AttributeError(name)

        if name in self._server_tools:

            class ServerTools:
                pass

            st = ServerTools()
            for tool_name, proxy in self._server_tools[name].items():
                setattr(st, tool_name, proxy)

            return st

        raise AttributeError(f"No MCP server named '{name}'")

    def __dir__(self) -> list[str]:
        return list(self._server_tools.keys())

    def __repr__(self) -> str:
        servers = list(self._server_tools.keys())
        return f"<MCPNamespace servers={servers}>"


def discover_mcp_tools() -> MCPNamespace:
    """Discover and connect to MCP servers from ~/.claude.json."""
    mcp = MCPNamespace()
    config = read_claude_config()

    for server_name, server_config in config.items():
        server_type = server_config.get("type", "stdio")

        if server_type != "stdio":
            continue

        command = server_config.get("command")
        args = server_config.get("args", [])
        env = server_config.get("env", {})

        if not command:
            continue

        if server_name == "python-repl":
            continue

        client = StdioMCPClient(server_name, command, args, env)

        if client.connect():
            tools = client.list_tools()
            if tools:
                mcp._add_server(server_name, client, tools)
                print(
                    f"Connected to MCP server '{server_name}' with {len(tools)} tools",
                    file=sys.stderr,
                )
            else:
                client.disconnect()

    return mcp
