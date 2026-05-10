'use strict';

const { execSync } = require('node:child_process');

function Bash(command, opts = {}) {
  const { timeout = 120_000, cwd } = opts;
  try {
    const out = execSync(command, {
      cwd,
      timeout,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });
    return out.trim();
  } catch (e) {
    let out = e.stdout ? String(e.stdout) : '';
    if (e.stderr) out += '\n[stderr]\n' + e.stderr;
    if (typeof e.status === 'number' && e.status !== 0) out += `\n[exit code: ${e.status}]`;
    else if (e.signal) out += `\n[signal: ${e.signal}]`;
    return out.trim();
  }
}

module.exports = { Bash };
