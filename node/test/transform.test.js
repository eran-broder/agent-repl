'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { startRepl } = require('../src/manager.js');
const client = require('../src/client.js');

async function withRepl(fn) {
  const port = await startRepl();
  try { return await fn(port); }
  finally {
    try { await client.quitServer(port); } catch { /* ignore */ }
  }
}

test('multi-statement with await persists declared state', async () => {
  await withRepl(async (port) => {
    const r = await client.execute(port, 'const a = await Promise.resolve(10); const b = a + 5; b');
    assert.strictEqual(r.error, null);
    assert.strictEqual(r.result, '15');

    const r2 = await client.execute(port, 'a + b');
    assert.strictEqual(r2.error, null);
    assert.strictEqual(r2.result, '25');
  });
});

test('multi-statement without await still works', async () => {
  await withRepl(async (port) => {
    const r = await client.execute(port, 'let x = 1; let y = 2; x + y');
    assert.strictEqual(r.error, null);
    assert.strictEqual(r.result, '3');
  });
});

test('const with await persists', async () => {
  await withRepl(async (port) => {
    await client.execute(port, 'const fetched = await Promise.resolve("hello")');
    const r = await client.execute(port, 'fetched');
    assert.strictEqual(r.error, null);
    assert.strictEqual(r.result, "'hello'");
  });
});

test('object destructuring with await persists each name', async () => {
  await withRepl(async (port) => {
    const r = await client.execute(
      port,
      'const { a, b } = await Promise.resolve({ a: 1, b: 2 })',
    );
    assert.strictEqual(r.error, null);
    const ra = await client.execute(port, 'a');
    const rb = await client.execute(port, 'b');
    assert.strictEqual(ra.result, '1');
    assert.strictEqual(rb.result, '2');
  });
});

test('object destructuring with rename and default', async () => {
  await withRepl(async (port) => {
    const r = await client.execute(
      port,
      'const { x: renamed, y = 99 } = await Promise.resolve({ x: 1 })',
    );
    assert.strictEqual(r.error, null);
    const a = await client.execute(port, 'renamed');
    const b = await client.execute(port, 'y');
    assert.strictEqual(a.result, '1');
    assert.strictEqual(b.result, '99');
  });
});

test('array destructuring with await persists each element', async () => {
  await withRepl(async (port) => {
    const r = await client.execute(port, 'const [first, second] = await Promise.resolve([10, 20])');
    assert.strictEqual(r.error, null);
    const a = await client.execute(port, 'first + second');
    assert.strictEqual(a.result, '30');
  });
});

test('array destructuring with rest', async () => {
  await withRepl(async (port) => {
    const r = await client.execute(port, 'const [head, ...rest] = await Promise.resolve([1, 2, 3, 4])');
    assert.strictEqual(r.error, null);
    const a = await client.execute(port, 'rest');
    assert.strictEqual(a.result, '[ 2, 3, 4 ]');
  });
});

test('multi-var declaration with await persists each name', async () => {
  await withRepl(async (port) => {
    await client.execute(port, 'const m = 3, n = await Promise.resolve(4)');
    const r = await client.execute(port, 'm * n');
    assert.strictEqual(r.error, null);
    assert.strictEqual(r.result, '12');
  });
});

test('function declaration with await context persists', async () => {
  await withRepl(async (port) => {
    await client.execute(
      port,
      'async function doubler(x) { return x * 2 }; const v = await doubler(21); v',
    );
    const r = await client.execute(port, 'await doubler(50)');
    assert.strictEqual(r.error, null);
    assert.strictEqual(r.result, '100');
  });
});

test('class declaration with await context persists', async () => {
  await withRepl(async (port) => {
    await client.execute(
      port,
      'class Counter { constructor(n) { this.n = n } }; const c = new Counter(await Promise.resolve(7))',
    );
    const r = await client.execute(port, 'c.n');
    assert.strictEqual(r.result, '7');
    const r2 = await client.execute(port, 'new Counter(99).n');
    assert.strictEqual(r2.result, '99');
  });
});

test('nested let in a block does not leak to global', async () => {
  await withRepl(async (port) => {
    const r = await client.execute(port, 'if (true) { let inner = 42 }');
    assert.strictEqual(r.error, null);
    const r2 = await client.execute(port, 'typeof inner');
    assert.strictEqual(r2.result, "'undefined'");
  });
});

test('last expression value is returned from block-wrap', async () => {
  await withRepl(async (port) => {
    const r = await client.execute(port, 'const u = await Promise.resolve(2); u + u');
    assert.strictEqual(r.error, null);
    assert.strictEqual(r.result, '4');
  });
});

test('plain await + side-effect chain works', async () => {
  await withRepl(async (port) => {
    await client.execute(port, 'globalThis.log = []');
    const r = await client.execute(
      port,
      'log.push(await Promise.resolve(1)); log.push(await Promise.resolve(2)); log.length',
    );
    assert.strictEqual(r.error, null);
    assert.strictEqual(r.result, '2');
    const r2 = await client.execute(port, 'log');
    assert.strictEqual(r2.result, '[ 1, 2 ]');
  });
});

test('let without initializer still becomes global', async () => {
  await withRepl(async (port) => {
    const r = await client.execute(port, 'let placeholder = await Promise.resolve(undefined); placeholder = 5; placeholder');
    assert.strictEqual(r.error, null);
    assert.strictEqual(r.result, '5');
  });
});

test('syntax errors still surface clearly', async () => {
  await withRepl(async (port) => {
    const r = await client.execute(port, 'const = 5');
    assert.notStrictEqual(r.error, null);
    assert.match(r.error, /SyntaxError/);
  });
});
