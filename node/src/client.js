'use strict';

const net = require('node:net');
const { Action } = require('./actions.js');

const TIMEOUT_MS = 300_000;
const RECOVERABLE_QUIT_ERRORS = new Set(['ECONNREFUSED', 'ECONNRESET', 'EPIPE']);

function sendCommand(port, action, payload = {}) {
  return new Promise((resolve, reject) => {
    const message = JSON.stringify({ action, ...payload });
    const sock = net.createConnection({ host: '127.0.0.1', port });
    const chunks = [];
    let settled = false;
    const fail = (err) => {
      if (settled) return;
      settled = true;
      sock.destroy();
      reject(err);
    };
    const succeed = (val) => {
      if (settled) return;
      settled = true;
      resolve(val);
    };
    sock.setTimeout(TIMEOUT_MS);
    sock.once('connect', () => sock.write(message, 'utf8'));
    sock.on('data', (c) => chunks.push(c));
    sock.once('end', () => {
      const data = Buffer.concat(chunks).toString('utf8');
      sock.destroy();
      try { succeed(JSON.parse(data)); }
      catch { fail(new Error(`Bad JSON from server: ${data.slice(0, 200)}`)); }
    });
    sock.once('error', (err) => fail(err));
    sock.once('timeout', () => fail(new Error('REPL request timed out')));
  });
}

async function execute(port, code) {
  return await sendCommand(port, Action.Exec, { code });
}

async function show(port) {
  const r = await sendCommand(port, Action.Show);
  return r.namespace || '';
}

async function reset(port) {
  const r = await sendCommand(port, Action.Reset);
  return Boolean(r.ok);
}

async function quitServer(port) {
  try {
    const r = await sendCommand(port, Action.Quit);
    return Boolean(r.ok);
  } catch (err) {
    if (err && RECOVERABLE_QUIT_ERRORS.has(err.code)) return true;
    return false;
  }
}

module.exports = { sendCommand, execute, show, reset, quitServer };
