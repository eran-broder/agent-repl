'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { setTimeout: sleep } = require('node:timers/promises');

const { startRepl, isReplAlive } = require('../src/manager.js');
const client = require('../src/client.js');

async function withRepl(fn) {
  const port = await startRepl();
  try { return await fn(port); }
  finally {
    try { await client.quitServer(port); } catch { /* ignore */ }
  }
}

test('create REPL returns a port and is alive', async () => {
  const port = await startRepl();
  assert.ok(port > 0);
  assert.ok(await isReplAlive(port));
  await client.quitServer(port);
});

test('execute expression returns result', async () => {
  await withRepl(async (port) => {
    const r = await client.execute(port, '1 + 1');
    assert.strictEqual(r.error, null);
    assert.strictEqual(r.result, '2');
  });
});

test('let declarations persist across executions', async () => {
  await withRepl(async (port) => {
    const a = await client.execute(port, 'let x = 42');
    assert.strictEqual(a.error, null);
    const b = await client.execute(port, 'x * 2');
    assert.strictEqual(b.error, null);
    assert.strictEqual(b.result, '84');
  });
});

test('const declarations persist', async () => {
  await withRepl(async (port) => {
    await client.execute(port, 'const greet = name => `hi ${name}`');
    const r = await client.execute(port, 'greet("node")');
    assert.strictEqual(r.error, null);
    assert.strictEqual(r.result, "'hi node'");
  });
});

test('console.log captured to stdout', async () => {
  await withRepl(async (port) => {
    const r = await client.execute(port, 'console.log("hello"); 1');
    assert.match(r.stdout, /hello/);
    assert.strictEqual(r.error, null);
  });
});

test('console.error captured to stderr', async () => {
  await withRepl(async (port) => {
    const r = await client.execute(port, 'console.error("oops")');
    assert.match(r.stderr, /oops/);
    assert.strictEqual(r.error, null);
  });
});

test('thrown errors are captured', async () => {
  await withRepl(async (port) => {
    const r = await client.execute(port, 'throw new Error("boom")');
    assert.notStrictEqual(r.error, null);
    assert.match(r.error, /boom/);
  });
});

test('show namespace lists user-defined identifiers', async () => {
  await withRepl(async (port) => {
    await client.execute(port, 'let myVar = "test"');
    const ns = await client.show(port);
    assert.match(ns, /myVar/);
  });
});

test('reset clears the namespace', async () => {
  await withRepl(async (port) => {
    await client.execute(port, 'let myVar = "test"');
    assert.ok(await client.reset(port));
    const ns = await client.show(port);
    assert.doesNotMatch(ns, /myVar/);
    const r = await client.execute(port, 'typeof myVar');
    assert.strictEqual(r.result, "'undefined'");
  });
});

test('built-in tools available (Cwd)', async () => {
  await withRepl(async (port) => {
    const r = await client.execute(port, 'Cwd()');
    assert.strictEqual(r.error, null);
    assert.ok(r.result && r.result.length > 2);
  });
});

test('preloaded modules available (path)', async () => {
  await withRepl(async (port) => {
    const r = await client.execute(port, 'path.posix.join("a","b","c")');
    assert.strictEqual(r.error, null);
    assert.strictEqual(r.result, "'a/b/c'");
  });
});

test('preloaded fs available', async () => {
  await withRepl(async (port) => {
    const r = await client.execute(port, 'typeof fs.readFileSync');
    assert.strictEqual(r.result, "'function'");
  });
});

test('async/await works at top level', async () => {
  await withRepl(async (port) => {
    const r = await client.execute(port, 'await Promise.resolve(7)');
    assert.strictEqual(r.error, null);
    assert.strictEqual(r.result, '7');
  });
});

test('destroy makes REPL dead', async () => {
  const port = await startRepl();
  assert.ok(await isReplAlive(port));
  assert.ok(await client.quitServer(port));
  await sleep(300);
  assert.strictEqual(await isReplAlive(port), false);
});

test('multiple REPLs are isolated', async () => {
  const portA = await startRepl();
  const portB = await startRepl();
  try {
    assert.notStrictEqual(portA, portB);
    await client.execute(portA, 'let tag = "A"');
    await client.execute(portB, 'let tag = "B"');
    const a = await client.execute(portA, 'tag');
    const b = await client.execute(portB, 'tag');
    assert.strictEqual(a.result, "'A'");
    assert.strictEqual(b.result, "'B'");
  } finally {
    await client.quitServer(portA);
    await client.quitServer(portB);
  }
});
