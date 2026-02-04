"""CLI for REPL operations."""
from __future__ import annotations

import argparse

from . import client, manager


def format_result(response: dict) -> str:  # type: ignore[type-arg]
    """Format execution response for display."""
    parts = []

    if response.get("error"):
        parts.append(f"[ERROR]\n{response['error']}")
    else:
        if response.get("stdout"):
            parts.append(f"[stdout]\n{response['stdout']}")
        if response.get("stderr"):
            parts.append(f"[stderr]\n{response['stderr']}")
        if response.get("result"):
            parts.append(f"[result]\n{response['result']}")
        if not parts:
            parts.append("[OK]")

    return "\n\n".join(parts)


def cmd_create(enable_mcp: bool = False) -> None:
    """Create a new REPL, print its port."""
    port = manager.start_repl(enable_mcp=enable_mcp)
    print(port)


def cmd_exec(port: int, code: str) -> None:
    """Execute code in a REPL."""
    response = client.execute(port, code)
    print(format_result(response))


def cmd_show(port: int) -> None:
    """Show REPL namespace."""
    print(client.show(port))


def cmd_reset(port: int) -> None:
    """Reset REPL namespace."""
    if client.reset(port):
        print("[OK] Reset")
    else:
        print("[ERROR] Reset failed")


def cmd_destroy(port: int) -> None:
    """Destroy a REPL."""
    if client.quit_server(port):
        print(f"[OK] REPL {port} destroyed")
    else:
        print(f"[ERROR] Failed to destroy REPL {port}")


def cmd_check(port: int) -> None:
    """Check if a REPL is alive."""
    if manager.is_repl_alive(port):
        print(f"REPL {port}: alive")
    else:
        print(f"REPL {port}: dead")


def main() -> None:
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        prog="repl",
        description="Python REPL for AI agents",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("create", help="Create REPL, prints port")
    p.add_argument("--mcp", action="store_true", help="Enable MCP tools in REPL (slower startup)")

    p = sub.add_parser("exec", help="Execute code")
    p.add_argument("port", type=int)
    p.add_argument("code")

    p = sub.add_parser("show", help="Show namespace")
    p.add_argument("port", type=int)

    p = sub.add_parser("reset", help="Reset namespace")
    p.add_argument("port", type=int)

    p = sub.add_parser("destroy", help="Destroy REPL")
    p.add_argument("port", type=int)

    p = sub.add_parser("check", help="Check if alive")
    p.add_argument("port", type=int)

    args = parser.parse_args()

    if args.cmd == "create":
        cmd_create(enable_mcp=args.mcp)
    elif args.cmd == "exec":
        cmd_exec(args.port, args.code)
    elif args.cmd == "show":
        cmd_show(args.port)
    elif args.cmd == "reset":
        cmd_reset(args.port)
    elif args.cmd == "destroy":
        cmd_destroy(args.port)
    elif args.cmd == "check":
        cmd_check(args.port)


if __name__ == "__main__":
    main()
