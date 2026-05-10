'use strict';

const net = require('node:net');
const { Action } = require('./actions.js');
const { makeState } = require('./state.js');
const { makeHandlers, dispatch } = require('./handlers.js');

function tryParse(data) {
  try { return { msg: JSON.parse(data) }; }
  catch { return null; }
}

function readMessage(sock) {
  return new Promise((resolve) => {
    const chunks = [];
    const cleanup = () => {
      sock.removeListener('data', onData);
      sock.removeListener('end', onEnd);
      sock.removeListener('error', onError);
    };
    const onData = (c) => {
      chunks.push(c);
      const parsed = tryParse(Buffer.concat(chunks).toString('utf8'));
      if (parsed) { cleanup(); resolve(parsed); }
    };
    const onEnd = () => {
      cleanup();
      const data = Buffer.concat(chunks).toString('utf8');
      if (!data) return resolve({ empty: true });
      const parsed = tryParse(data);
      resolve(parsed || { error: 'Invalid JSON' });
    };
    const onError = () => { cleanup(); resolve({ error: 'connection error' }); };
    sock.on('data', onData);
    sock.once('end', onEnd);
    sock.once('error', onError);
  });
}

function writeResponse(sock, response) {
  sock.end(JSON.stringify(response));
}

function shutdownAfterAck(sock, server) {
  sock.once('close', () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 500).unref();
  });
}

async function handleConnection(sock, handlers, server) {
  const parsed = await readMessage(sock);
  if (parsed.empty) { sock.end(); return; }
  if (parsed.error) { writeResponse(sock, { error: parsed.error }); return; }
  const { msg } = parsed;
  if (msg.action === Action.Quit) {
    writeResponse(sock, { ok: true });
    shutdownAfterAck(sock, server);
    return;
  }
  writeResponse(sock, await dispatch(handlers, msg));
}

function runServer(port) {
  const stateRef = { state: makeState() };
  const handlers = makeHandlers(stateRef);

  const server = net.createServer((sock) => {
    sock.on('error', () => {});
    handleConnection(sock, handlers, server);
  });

  server.on('error', (err) => {
    process.stderr.write(`server error: ${err.message}\n`);
    process.exit(1);
  });

  server.listen(port, '127.0.0.1', () => {
    process.stdout.write(`${server.address().port}\n`);
  });
}

if (require.main === module) {
  const port = parseInt(process.argv[2] || '0', 10);
  runServer(port);
}

module.exports = { runServer };
