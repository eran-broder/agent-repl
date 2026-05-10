#!/usr/bin/env node
'use strict';

const { startRepl, isReplAlive } = require('./manager.js');
const { execute, show, reset, quitServer } = require('./client.js');

function formatResult(r) {
  if (r.error) return `[ERROR]\n${r.error}`;
  const parts = [];
  if (r.stdout) parts.push(`[stdout]\n${r.stdout}`);
  if (r.stderr) parts.push(`[stderr]\n${r.stderr}`);
  if (r.result !== null && r.result !== undefined) parts.push(`[result]\n${r.result}`);
  return parts.length ? parts.join('\n\n') : '[OK]';
}

const COMMANDS = Object.freeze({
  create: async () => {
    console.log(await startRepl());
  },
  exec: async (port, code) => {
    console.log(formatResult(await execute(port, code)));
  },
  show: async (port) => {
    console.log(await show(port));
  },
  reset: async (port) => {
    const ok = await reset(port);
    console.log(ok ? '[OK] Reset' : '[ERROR] Reset failed');
  },
  destroy: async (port) => {
    const ok = await quitServer(port);
    console.log(ok ? `[OK] REPL ${port} destroyed` : `[ERROR] Failed to destroy REPL ${port}`);
  },
  check: async (port) => {
    const alive = await isReplAlive(port);
    console.log(`REPL ${port}: ${alive ? 'alive' : 'dead'}`);
  },
});

function usage() {
  return `Usage: nrepl <command> [args]

Commands:
  create              Create a REPL, prints port number
  exec <port> <code>  Execute JavaScript code
  show <port>         Show namespace (user-defined identifiers)
  reset <port>        Reset namespace (keep REPL alive)
  destroy <port>      Shut down REPL
  check <port>        Check if REPL is alive
`;
}

function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  if (!cmd || cmd === 'create') return { cmd, args: [] };
  const port = parseInt(rest[0], 10);
  if (cmd === 'exec') return { cmd, args: [port, rest[1]] };
  return { cmd, args: [port] };
}

function isHelp(cmd) {
  return cmd === '-h' || cmd === '--help' || cmd === 'help';
}

async function main() {
  const { cmd, args } = parseArgs(process.argv.slice(2));
  if (!cmd || isHelp(cmd)) {
    process.stdout.write(usage());
    process.exit(cmd ? 0 : 1);
  }
  const handler = COMMANDS[cmd];
  if (!handler) {
    process.stderr.write(`Unknown command: ${cmd}\n${usage()}`);
    process.exit(1);
  }
  if (cmd !== 'create' && (!Number.isInteger(args[0]) || args[0] <= 0)) {
    process.stderr.write(`Invalid port for '${cmd}'\n`);
    process.exit(2);
  }
  if (cmd === 'exec' && args[1] === undefined) {
    process.stderr.write(`Usage: nrepl exec <port> <code>\n`);
    process.exit(2);
  }
  try { await handler(...args); }
  catch (err) {
    process.stderr.write(`[ERROR] ${err && err.message ? err.message : err}\n`);
    process.exit(1);
  }
}

main();
