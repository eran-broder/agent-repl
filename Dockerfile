# Bulletproof test environment for agent-repl
FROM python:3.11-slim

# Install Node.js for MCP servers (npx)
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -s /bin/bash testuser
USER testuser
WORKDIR /home/testuser

# Install agent-repl from GitHub (fresh install)
RUN pip install --user git+https://github.com/eran-broder/agent-repl.git

# Install pytest for testing
RUN pip install --user pytest

# Add local bin to PATH
ENV PATH="/home/testuser/.local/bin:${PATH}"

# Create a test MCP config (filesystem server)
RUN mkdir -p /home/testuser/.claude && \
    echo '{"mcpServers": {"filesystem": {"type": "stdio", "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/testuser"]}}}' > /home/testuser/.claude.json

# Create test directory structure
RUN mkdir -p /home/testuser/testdata && \
    echo "Hello from test file" > /home/testuser/testdata/hello.txt

# Copy test script
COPY --chown=testuser:testuser docker-test.py /home/testuser/docker-test.py

# Default command runs the test
CMD ["python", "/home/testuser/docker-test.py"]
