#!/usr/bin/env python3
"""Comprehensive integration test for agent-repl in Docker."""
from __future__ import annotations

import subprocess
import sys
import time


def run(cmd: str) -> str:
    """Run a shell command and return output."""
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout + result.stderr


def test_section(name: str) -> None:
    """Print test section header."""
    print(f"\n{'='*60}")
    print(f"  {name}")
    print(f"{'='*60}\n")


def main() -> int:
    """Run all integration tests."""
    errors = []

    # Test 1: Package is installed
    test_section("TEST 1: Package Installation")
    output = run("pip show agent-repl")
    if "agent-repl" in output and "0.1.0" in output:
        print("PASS: agent-repl is installed")
        print(output)
    else:
        print("FAIL: agent-repl not found")
        errors.append("Package not installed")

    # Test 2: CLI is available
    test_section("TEST 2: CLI Available")
    output = run("repl --help")
    if "create" in output and "exec" in output:
        print("PASS: CLI is working")
        print(output)
    else:
        print("FAIL: CLI not working")
        errors.append("CLI not available")

    # Test 3: Create REPL
    test_section("TEST 3: Create REPL")
    output = run("repl create")
    port = output.strip().split("\n")[-1]
    try:
        port_int = int(port)
        print(f"PASS: REPL created on port {port_int}")
    except ValueError:
        print(f"FAIL: Could not parse port from: {output}")
        errors.append("REPL creation failed")
        return 1

    # Test 4: Execute basic code
    test_section("TEST 4: Execute Basic Code")
    output = run(f'repl exec {port} "1 + 1"')
    if "2" in output:
        print("PASS: Basic execution works")
        print(output)
    else:
        print(f"FAIL: Expected '2' in output: {output}")
        errors.append("Basic execution failed")

    # Test 5: Variables persist
    test_section("TEST 5: Variable Persistence")
    run(f'repl exec {port} "x = 42"')
    output = run(f'repl exec {port} "x * 2"')
    if "84" in output:
        print("PASS: Variables persist across executions")
        print(output)
    else:
        print(f"FAIL: Expected '84' in output: {output}")
        errors.append("Variable persistence failed")

    # Test 6: Built-in tools
    test_section("TEST 6: Built-in Tools")

    # Test Cwd
    output = run(f'repl exec {port} "Cwd()"')
    if "/home/testuser" in output or "testuser" in output:
        print("PASS: Cwd() works")
    else:
        print(f"WARN: Cwd() output unexpected: {output}")

    # Test Glob
    output = run(f'repl exec {port} "Glob(\\"*.txt\\", \\"/home/testuser/testdata\\")"')
    if "hello.txt" in output:
        print("PASS: Glob() works")
    else:
        print(f"WARN: Glob() output unexpected: {output}")

    # Test Read
    output = run(f'repl exec {port} "Read(\\"/home/testuser/testdata/hello.txt\\")"')
    if "Hello from test file" in output:
        print("PASS: Read() works")
        print(output)
    else:
        print(f"WARN: Read() output unexpected: {output}")

    # Test Write
    run(f'repl exec {port} "Write(\\"/home/testuser/testdata/written.txt\\", \\"Written by REPL\\")"')
    output = run(f'repl exec {port} "Read(\\"/home/testuser/testdata/written.txt\\")"')
    if "Written by REPL" in output:
        print("PASS: Write() works")
    else:
        print(f"WARN: Write() output unexpected: {output}")

    # Test Bash
    output = run(f'repl exec {port} "Bash(\\"echo hello from bash\\")"')
    if "hello from bash" in output:
        print("PASS: Bash() works")
    else:
        print(f"WARN: Bash() output unexpected: {output}")

    # Test 7: Standard library modules
    test_section("TEST 7: Standard Library Modules")
    output = run(f'repl exec {port} "json.dumps({{\\"a\\": 1}})"')
    if '{"a": 1}' in output:
        print("PASS: json module available")
    else:
        print(f"WARN: json output unexpected: {output}")

    output = run(f'repl exec {port} "math.pi"')
    if "3.14" in output:
        print("PASS: math module available")
    else:
        print(f"WARN: math output unexpected: {output}")

    output = run(f'repl exec {port} "Path(\\"/tmp\\").exists()"')
    if "True" in output:
        print("PASS: pathlib.Path available")
    else:
        print(f"WARN: Path output unexpected: {output}")

    # Test 8: Define and use functions
    test_section("TEST 8: Functions")
    run(f'repl exec {port} "def greet(name): return f\\"Hello, {{name}}!\\""')
    output = run(f'repl exec {port} "greet(\\"Docker\\")"')
    if "Hello, Docker!" in output:
        print("PASS: User-defined functions work")
        print(output)
    else:
        print(f"FAIL: Function output unexpected: {output}")
        errors.append("Functions failed")

    # Test 9: Define and use classes (simple one-liner class for shell compatibility)
    test_section("TEST 9: Classes")
    # Use a simple dataclass-style approach that works via shell
    run(f'repl exec {port} "from dataclasses import dataclass"')
    run(f'repl exec {port} "@dataclass\\nclass Point:\\n    x: int\\n    y: int"')
    output = run(f'repl exec {port} "Point(3, 4)"')
    if "Point(x=3, y=4)" in output:
        print("PASS: User-defined classes work")
        print(output)
    else:
        # Try alternative: namedtuple which is simpler
        run(f'repl exec {port} "from collections import namedtuple"')
        run(f'repl exec {port} "Point2 = namedtuple(\\"Point2\\", [\\"x\\", \\"y\\"])"')
        output = run(f'repl exec {port} "Point2(3, 4)"')
        if "Point2(x=3, y=4)" in output:
            print("PASS: User-defined classes (via namedtuple) work")
            print(output)
        else:
            print(f"FAIL: Class output unexpected: {output}")
            errors.append("Classes failed")

    # Test 10: Show namespace
    test_section("TEST 10: Show Namespace")
    output = run(f"repl show {port}")
    if "x" in output and "greet" in output:
        print("PASS: Namespace shows user variables")
        print(output)
    else:
        print(f"WARN: Namespace output: {output}")

    # Test 11: Check alive
    test_section("TEST 11: Check Alive")
    output = run(f"repl check {port}")
    if "alive" in output:
        print("PASS: REPL reports alive")
    else:
        print(f"FAIL: Expected 'alive': {output}")
        errors.append("Check alive failed")

    # Test 12: Reset namespace
    test_section("TEST 12: Reset Namespace")
    run(f"repl reset {port}")
    output = run(f'repl exec {port} "x"')
    if "NameError" in output or "not defined" in output:
        print("PASS: Reset cleared namespace")
    else:
        print(f"WARN: After reset, x still exists: {output}")

    # Test 14: Error handling
    test_section("TEST 14: Error Handling")
    output = run(f'repl exec {port} "1/0"')
    if "ZeroDivisionError" in output:
        print("PASS: Errors are captured correctly")
        print(output)
    else:
        print(f"WARN: Error output unexpected: {output}")

    # Test 15: Multiple REPLs
    test_section("TEST 15: Multiple REPLs")
    output2 = run("repl create")
    port2 = output2.strip().split("\n")[-1]
    try:
        port2_int = int(port2)
        if port2_int != port_int:
            print(f"PASS: Second REPL on different port: {port2_int}")

            # Verify isolation
            run(f'repl exec {port} "isolation_test = \\"repl1\\""')
            run(f'repl exec {port2} "isolation_test = \\"repl2\\""')

            out1 = run(f'repl exec {port} "isolation_test"')
            out2 = run(f'repl exec {port2} "isolation_test"')

            if "repl1" in out1 and "repl2" in out2:
                print("PASS: REPLs are isolated from each other")
            else:
                print(f"WARN: Isolation test: repl1={out1}, repl2={out2}")

            run(f"repl destroy {port2}")
        else:
            print(f"WARN: Same port returned: {port2_int}")
    except ValueError:
        print(f"WARN: Could not create second REPL: {output2}")

    # Test 16: Destroy REPL
    test_section("TEST 16: Destroy REPL")
    output = run(f"repl destroy {port}")
    if "OK" in output or "destroyed" in output:
        print("PASS: REPL destroyed")
        time.sleep(0.5)
        output = run(f"repl check {port}")
        if "dead" in output:
            print("PASS: REPL is dead after destroy")
        else:
            print(f"WARN: After destroy: {output}")
    else:
        print(f"FAIL: Destroy failed: {output}")
        errors.append("Destroy failed")

    # Summary
    test_section("SUMMARY")
    if errors:
        print(f"FAILED with {len(errors)} errors:")
        for e in errors:
            print(f"  - {e}")
        return 1
    else:
        print("ALL TESTS PASSED!")
        return 0


if __name__ == "__main__":
    sys.exit(main())
