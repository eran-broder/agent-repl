'use strict';

const { Action } = require('./actions.js');
const { executeCode } = require('./executor.js');
const { formatNamespace, makeState } = require('./state.js');

function makeHandlers(stateRef) {
  return Object.freeze({
    [Action.Exec]: (msg) => executeCode(stateRef.state, msg.code || ''),
    [Action.Show]: () => ({ namespace: formatNamespace(stateRef.state) }),
    [Action.Reset]: () => {
      stateRef.state = makeState();
      return { ok: true };
    },
  });
}

async function dispatch(handlers, msg) {
  const handler = handlers[msg.action];
  if (!handler) return { error: `Unknown action: ${msg.action}` };
  try { return await handler(msg); }
  catch (err) { return { error: err && err.stack ? err.stack : String(err) }; }
}

module.exports = { makeHandlers, dispatch };
