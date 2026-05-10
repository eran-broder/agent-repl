'use strict';

const vm = require('node:vm');
const util = require('node:util');
const { TOOLS } = require('./tools/index.js');

const PRELOADED_MODULES = Object.freeze([
  'fs', 'path', 'os', 'crypto', 'util', 'url', 'child_process',
]);

const EXTRA_GLOBALS = Object.freeze([
  'console', 'process', 'Buffer',
  'setTimeout', 'setInterval', 'setImmediate',
  'clearTimeout', 'clearInterval', 'clearImmediate',
  'queueMicrotask',
  'URL', 'URLSearchParams',
  'TextEncoder', 'TextDecoder',
  'fetch', 'AbortController', 'AbortSignal',
]);

function injectGlobals(ctx) {
  for (const k of EXTRA_GLOBALS) {
    if (k in globalThis) ctx[k] = globalThis[k];
  }
  ctx.global = ctx;
  ctx.globalThis = ctx;
  ctx.require = require;
}

function injectModules(ctx) {
  for (const m of PRELOADED_MODULES) {
    try { ctx[m] = require(m); } catch {}
  }
}

function injectTools(ctx) {
  for (const [name, fn] of Object.entries(TOOLS)) {
    ctx[name] = fn;
  }
}

function makeContext() {
  const ctx = {};
  injectGlobals(ctx);
  injectModules(ctx);
  injectTools(ctx);
  vm.createContext(ctx);
  return ctx;
}

function makeState() {
  const ctx = makeContext();
  const builtinKeys = new Set(Object.keys(ctx));
  return { ctx, builtinKeys };
}

function describeValue(value) {
  const tn = typeof value;
  if (tn === 'function') return `function = [Function: ${value.name || 'anonymous'}]`;
  try {
    let repr = util.inspect(value, { depth: 1, breakLength: 80 });
    if (repr.length > 80) repr = repr.slice(0, 80) + '...';
    return `${tn} = ${repr}`;
  } catch {
    return `${tn} = <inspect failed>`;
  }
}

function isUserKey(key, builtinKeys) {
  return !builtinKeys.has(key) && !key.startsWith('_');
}

function formatNamespace(state) {
  const lines = [];
  for (const k of Object.keys(state.ctx).sort()) {
    if (!isUserKey(k, state.builtinKeys)) continue;
    try { lines.push(`${k}: ${describeValue(state.ctx[k])}`); }
    catch { lines.push(`${k}: <error>`); }
  }
  return lines.length ? lines.join('\n') : '(empty)';
}

module.exports = { makeState, formatNamespace };
