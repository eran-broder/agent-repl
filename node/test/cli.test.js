'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const CLI = path.join(__dirname, '..', 'src', 'cli.js');

function runCli(args) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
}

test('cli usage shows when no command', () => {
  const r = runCli([]);
  assert.match(r.stdout, /Usage: nrepl/);
  assert.notStrictEqual(r.status, 0);
});

test('cli help flag prints usage', () => {
  const r = runCli(['--help']);
  assert.match(r.stdout, /Commands:/);
  assert.strictEqual(r.status, 0);
});

test('cli unknown command errors', () => {
  const r = runCli(['frobnicate']);
  assert.match(r.stderr, /Unknown command/);
  assert.notStrictEqual(r.status, 0);
});

test('cli create + exec + destroy round trip', () => {
  const create = runCli(['create']);
  assert.strictEqual(create.status, 0);
  const port = parseInt(create.stdout.trim(), 10);
  assert.ok(port > 0);

  try {
    const exec = runCli(['exec', String(port), '40 + 2']);
    assert.strictEqual(exec.status, 0);
    assert.match(exec.stdout, /\[result\]/);
    assert.match(exec.stdout, /\b42\b/);

    const check = runCli(['check', String(port)]);
    assert.match(check.stdout, /alive/);
  } finally {
    const destroy = runCli(['destroy', String(port)]);
    assert.strictEqual(destroy.status, 0);
    assert.match(destroy.stdout, /destroyed/);
  }
});

test('cli show reflects user-defined state', () => {
  const port = parseInt(runCli(['create']).stdout.trim(), 10);
  try {
    runCli(['exec', String(port), 'let cliVar = 7']);
    const show = runCli(['show', String(port)]);
    assert.match(show.stdout, /cliVar/);
  } finally {
    runCli(['destroy', String(port)]);
  }
});

test('cli reset clears user-defined state', () => {
  const port = parseInt(runCli(['create']).stdout.trim(), 10);
  try {
    runCli(['exec', String(port), 'let cliVar = 99']);
    runCli(['reset', String(port)]);
    const after = runCli(['exec', String(port), 'typeof cliVar']);
    assert.match(after.stdout, /undefined/);
  } finally {
    runCli(['destroy', String(port)]);
  }
});

test('cli exec without args reports usage error', () => {
  const r = runCli(['exec']);
  assert.notStrictEqual(r.status, 0);
});

test('cli exec with invalid port errors', () => {
  const r = runCli(['exec', 'abc', '1 + 1']);
  assert.notStrictEqual(r.status, 0);
});
