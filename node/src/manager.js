'use strict';

const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');

const SERVER_PATH = path.join(__dirname, 'server.js');
const STARTUP_TIMEOUT_MS = 30_000;

function startRepl() {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [SERVER_PATH, '0'], {
      stdio: ['ignore', 'pipe', 'ignore'],
      detached: true,
      windowsHide: true,
      env: process.env,
    });

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error('Server startup timed out'));
    }, STARTUP_TIMEOUT_MS);

    let buf = '';
    const onData = (chunk) => {
      buf += chunk.toString('utf8');
      const nl = buf.indexOf('\n');
      if (nl !== -1) {
        const line = buf.slice(0, nl).trim();
        clearTimeout(timer);
        proc.stdout.removeListener('data', onData);
        proc.stdout.destroy();
        proc.unref();
        const port = parseInt(line, 10);
        if (Number.isNaN(port)) {
          reject(new Error(`Invalid port from server: ${line}`));
        } else {
          resolve(port);
        }
      }
    };
    proc.stdout.on('data', onData);
    proc.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Server process exited during startup (code ${code})`));
    });
    proc.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function isReplAlive(port) {
  return new Promise((resolve) => {
    const sock = net.createConnection({ host: '127.0.0.1', port });
    const done = (alive) => {
      sock.removeAllListeners();
      sock.destroy();
      resolve(alive);
    };
    sock.setTimeout(1000);
    sock.once('connect', () => done(true));
    sock.once('error', () => done(false));
    sock.once('timeout', () => done(false));
  });
}

module.exports = { startRepl, isReplAlive };
