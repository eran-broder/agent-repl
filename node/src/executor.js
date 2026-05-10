'use strict';

const vm = require('node:vm');
const util = require('node:util');
const {
  downgradeTopLevelLetConst,
  wrapForAsync,
  wrapForAsyncBlock,
  codeHasTopLevelAwait,
  isTopLevelAwaitError,
} = require('./transform.js');

const RUN_OPTIONS = Object.freeze({ filename: '<repl>', displayErrors: false });

function fmtArgs(args) {
  return args
    .map((a) => typeof a === 'string' ? a : util.inspect(a, { depth: 2, breakLength: Infinity }))
    .join(' ');
}

function makeCaptureConsole() {
  const out = { stdout: '', stderr: '' };
  const console = {
    log:   (...a) => { out.stdout += fmtArgs(a) + '\n'; },
    info:  (...a) => { out.stdout += fmtArgs(a) + '\n'; },
    debug: (...a) => { out.stdout += fmtArgs(a) + '\n'; },
    error: (...a) => { out.stderr += fmtArgs(a) + '\n'; },
    warn:  (...a) => { out.stderr += fmtArgs(a) + '\n'; },
    trace: (...a) => { out.stderr += fmtArgs(a) + '\n'; },
    dir:   (obj, opts) => { out.stdout += util.inspect(obj, opts) + '\n'; },
    table: (data) => { out.stdout += util.inspect(data, { depth: 2 }) + '\n'; },
    group: () => {},
    groupEnd: () => {},
    assert: () => {},
  };
  return { console, out };
}

function inspectValue(value) {
  if (value === undefined) return null;
  try {
    return util.inspect(value, {
      depth: 2,
      breakLength: Infinity,
      maxArrayLength: 200,
      maxStringLength: 10_000,
    });
  } catch {
    return '<inspect failed>';
  }
}

function ok(out, value) {
  return { stdout: out.stdout, stderr: out.stderr, result: inspectValue(value), error: null };
}

function fail(out, err) {
  return {
    stdout: out.stdout,
    stderr: out.stderr,
    result: null,
    error: err && err.stack ? err.stack : String(err),
  };
}

function runScript(code, ctx) {
  return vm.runInContext(code, ctx, RUN_OPTIONS);
}

async function tryWrappedExecution(ctx, code) {
  try {
    return await runScript(wrapForAsync(code), ctx);
  } catch (err) {
    if (err.name !== 'SyntaxError') throw err;
  }
  return await runScript(wrapForAsyncBlock(code), ctx);
}

async function evalCode(ctx, code) {
  if (codeHasTopLevelAwait(code)) {
    return tryWrappedExecution(ctx, code);
  }

  try {
    const value = runScript(downgradeTopLevelLetConst(code), ctx);
    return value && typeof value.then === 'function' ? await value : value;
  } catch (err) {
    if (!isTopLevelAwaitError(err)) throw err;
    return tryWrappedExecution(ctx, code);
  }
}

async function executeCode(state, code) {
  const { console: cap, out } = makeCaptureConsole();
  const prev = state.ctx.console;
  state.ctx.console = cap;
  try {
    const value = await evalCode(state.ctx, code);
    return ok(out, value);
  } catch (err) {
    return fail(out, err);
  } finally {
    state.ctx.console = prev;
  }
}

module.exports = { executeCode };
