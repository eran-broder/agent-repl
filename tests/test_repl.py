"""Tests for REPL functionality."""
from __future__ import annotations

import time

import pytest

from agent_repl import client, manager


@pytest.fixture
def repl_port() -> int:
    """Create a REPL and return its port."""
    port = manager.start_repl()
    yield port
    try:
        client.quit_server(port)
    except Exception:
        pass


def test_create_repl() -> None:
    """Test creating a REPL."""
    port = manager.start_repl()
    assert port > 0
    assert manager.is_repl_alive(port)
    client.quit_server(port)


def test_execute_expression(repl_port: int) -> None:
    """Test executing an expression."""
    response = client.execute(repl_port, "1 + 1")
    assert response["result"] == "2"
    assert response["error"] is None


def test_execute_statement(repl_port: int) -> None:
    """Test executing a statement."""
    response = client.execute(repl_port, "x = 42")
    assert response["error"] is None

    response = client.execute(repl_port, "x")
    assert response["result"] == "42"


def test_execute_print(repl_port: int) -> None:
    """Test capturing stdout."""
    response = client.execute(repl_port, "print('hello')")
    assert "hello" in response["stdout"]
    assert response["error"] is None


def test_execute_error(repl_port: int) -> None:
    """Test handling errors."""
    response = client.execute(repl_port, "1/0")
    assert response["error"] is not None
    assert "ZeroDivisionError" in response["error"]


def test_show_namespace(repl_port: int) -> None:
    """Test showing namespace."""
    client.execute(repl_port, "my_var = 'test'")
    ns = client.show(repl_port)
    assert "my_var" in ns
    assert "str" in ns


def test_reset_namespace(repl_port: int) -> None:
    """Test resetting namespace."""
    client.execute(repl_port, "my_var = 'test'")
    assert client.reset(repl_port)

    ns = client.show(repl_port)
    assert "my_var" not in ns


def test_builtin_tools(repl_port: int) -> None:
    """Test built-in tools are available."""
    response = client.execute(repl_port, "Cwd()")
    assert response["error"] is None
    assert response["result"] is not None


def test_modules_available(repl_port: int) -> None:
    """Test standard modules are available."""
    response = client.execute(repl_port, "json.dumps({'a': 1})")
    assert response["result"] == "'{\"a\": 1}'"

    response = client.execute(repl_port, "math.pi")
    assert "3.14" in response["result"]


def test_destroy_repl(repl_port: int) -> None:
    """Test destroying a REPL."""
    assert manager.is_repl_alive(repl_port)
    assert client.quit_server(repl_port)
    time.sleep(0.5)
    assert not manager.is_repl_alive(repl_port)
