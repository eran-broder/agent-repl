'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { startRepl } = require('../src/manager.js');
const client = require('../src/client.js');

function quote(s) {
  return JSON.stringify(s);
}

async function withRepl(fn) {
  const port = await startRepl();
  try { return await fn(port); }
  finally { try { await client.quitServer(port); } catch {} }
}

function makeWorkspace() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-repl-test-'));
  return {
    dir,
    cleanup: () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} },
  };
}

test('Read returns file contents', async () => {
  const ws = makeWorkspace();
  try {
    const file = path.join(ws.dir, 'hello.txt');
    fs.writeFileSync(file, 'hi there');
    await withRepl(async (port) => {
      const r = await client.execute(port, `Read(${quote(file)})`);
      assert.strictEqual(r.error, null);
      assert.strictEqual(r.result, "'hi there'");
    });
  } finally { ws.cleanup(); }
});

test('Write creates file and returns byte count', async () => {
  const ws = makeWorkspace();
  try {
    const file = path.join(ws.dir, 'out.txt');
    await withRepl(async (port) => {
      const r = await client.execute(port, `Write(${quote(file)}, "abcdef")`);
      assert.strictEqual(r.error, null);
      assert.strictEqual(r.result, '6');
    });
    assert.strictEqual(fs.readFileSync(file, 'utf-8'), 'abcdef');
  } finally { ws.cleanup(); }
});

test('Write creates parent directories', async () => {
  const ws = makeWorkspace();
  try {
    const file = path.join(ws.dir, 'a', 'b', 'c.txt');
    await withRepl(async (port) => {
      await client.execute(port, `Write(${quote(file)}, "nested")`);
    });
    assert.strictEqual(fs.readFileSync(file, 'utf-8'), 'nested');
  } finally { ws.cleanup(); }
});

test('Edit replaces matching substring', async () => {
  const ws = makeWorkspace();
  try {
    const file = path.join(ws.dir, 'edit.txt');
    fs.writeFileSync(file, 'foo bar foo');
    await withRepl(async (port) => {
      const r = await client.execute(port, `Edit(${quote(file)}, "foo", "qux")`);
      assert.strictEqual(r.error, null);
      assert.strictEqual(r.result, 'true');
    });
    assert.strictEqual(fs.readFileSync(file, 'utf-8'), 'qux bar foo');
  } finally { ws.cleanup(); }
});

test('Edit returns false when nothing changes', async () => {
  const ws = makeWorkspace();
  try {
    const file = path.join(ws.dir, 'edit.txt');
    fs.writeFileSync(file, 'hello');
    await withRepl(async (port) => {
      const r = await client.execute(port, `Edit(${quote(file)}, "missing", "x")`);
      assert.strictEqual(r.result, 'false');
    });
  } finally { ws.cleanup(); }
});

test('Edit count=-1 replaces all', async () => {
  const ws = makeWorkspace();
  try {
    const file = path.join(ws.dir, 'edit.txt');
    fs.writeFileSync(file, 'x x x x');
    await withRepl(async (port) => {
      await client.execute(port, `Edit(${quote(file)}, "x", "y", -1)`);
    });
    assert.strictEqual(fs.readFileSync(file, 'utf-8'), 'y y y y');
  } finally { ws.cleanup(); }
});

test('Glob finds files matching pattern', async () => {
  const ws = makeWorkspace();
  try {
    fs.writeFileSync(path.join(ws.dir, 'a.txt'), '');
    fs.writeFileSync(path.join(ws.dir, 'b.md'), '');
    fs.mkdirSync(path.join(ws.dir, 'sub'));
    fs.writeFileSync(path.join(ws.dir, 'sub', 'c.txt'), '');
    await withRepl(async (port) => {
      const r = await client.execute(port, `Glob("*.txt", ${quote(ws.dir)}).length`);
      assert.strictEqual(r.error, null);
      assert.strictEqual(r.result, '2');
    });
  } finally { ws.cleanup(); }
});

test('Grep returns matching lines', async () => {
  const ws = makeWorkspace();
  try {
    fs.writeFileSync(path.join(ws.dir, 'data.txt'), 'apple\nbanana\ncherry\n');
    await withRepl(async (port) => {
      const r = await client.execute(
        port,
        `Grep("ban", { path: ${quote(ws.dir)} }).length`,
      );
      assert.strictEqual(r.error, null);
      assert.strictEqual(r.result, '1');
    });
  } finally { ws.cleanup(); }
});

test('Ls lists directory entries', async () => {
  const ws = makeWorkspace();
  try {
    fs.writeFileSync(path.join(ws.dir, 'one.txt'), '');
    fs.writeFileSync(path.join(ws.dir, 'two.txt'), '');
    await withRepl(async (port) => {
      const r = await client.execute(port, `Ls(${quote(ws.dir)}).join(",")`);
      assert.strictEqual(r.error, null);
      assert.match(r.result, /one\.txt/);
      assert.match(r.result, /two\.txt/);
    });
  } finally { ws.cleanup(); }
});

test('Cd changes working directory and Cwd reports it', async () => {
  const ws = makeWorkspace();
  try {
    await withRepl(async (port) => {
      const r = await client.execute(port, `Cd(${quote(ws.dir)})`);
      assert.strictEqual(r.error, null);
      const realDir = fs.realpathSync(ws.dir);
      const cwd = await client.execute(port, 'Cwd()');
      assert.strictEqual(cwd.result, `'${realDir.replace(/\\/g, '\\\\')}'`);
    });
  } finally { ws.cleanup(); }
});

test('Env can set and read variables inside the REPL', async () => {
  await withRepl(async (port) => {
    await client.execute(port, 'Env("AGENT_REPL_TEST_VAR", "sentinel-42")');
    const r = await client.execute(port, 'Env("AGENT_REPL_TEST_VAR")');
    assert.strictEqual(r.error, null);
    assert.match(r.result, /sentinel-42/);
  });
});

test('Bash runs shell command', async () => {
  await withRepl(async (port) => {
    const r = await client.execute(port, 'Bash("echo hello-bash")');
    assert.strictEqual(r.error, null);
    assert.match(r.result, /hello-bash/);
  });
});

test('user-defined function persists across calls', async () => {
  await withRepl(async (port) => {
    await client.execute(port, 'function double(x) { return x * 2 }');
    const r = await client.execute(port, 'double(21)');
    assert.strictEqual(r.error, null);
    assert.strictEqual(r.result, '42');
  });
});

test('errors do not break subsequent execution', async () => {
  await withRepl(async (port) => {
    const a = await client.execute(port, 'undefined_thing');
    assert.notStrictEqual(a.error, null);
    const b = await client.execute(port, '21 + 21');
    assert.strictEqual(b.error, null);
    assert.strictEqual(b.result, '42');
  });
});

test('reset preserves built-in tools', async () => {
  await withRepl(async (port) => {
    await client.execute(port, 'let foo = 1');
    await client.reset(port);
    const r = await client.execute(port, 'typeof Read');
    assert.strictEqual(r.result, "'function'");
  });
});

test('show excludes built-ins', async () => {
  await withRepl(async (port) => {
    const ns = await client.show(port);
    assert.doesNotMatch(ns, /^Bash:/m);
    assert.doesNotMatch(ns, /^fs:/m);
  });
});

test('large output is preserved', async () => {
  await withRepl(async (port) => {
    const r = await client.execute(port, 'Array(500).fill("x").join("")');
    assert.strictEqual(r.error, null);
    assert.strictEqual(r.result.length > 500, true);
  });
});

test('object literal expression evaluates', async () => {
  await withRepl(async (port) => {
    const r = await client.execute(port, '({ a: 1, b: 2 })');
    assert.strictEqual(r.error, null);
    assert.match(r.result, /a: 1/);
    assert.match(r.result, /b: 2/);
  });
});

test('nested object property access works', async () => {
  await withRepl(async (port) => {
    await client.execute(port, 'const data = { nested: { deep: 99 } }');
    const r = await client.execute(port, 'data.nested.deep');
    assert.strictEqual(r.result, '99');
  });
});

test('preloaded crypto module works', async () => {
  await withRepl(async (port) => {
    const r = await client.execute(port, 'crypto.createHash("sha256").update("x").digest("hex")');
    assert.strictEqual(r.error, null);
    assert.strictEqual(
      r.result,
      "'2d711642b726b04401627ca9fbac32f5c8530fb1903cc4db02258717921a4881'",
    );
  });
});
