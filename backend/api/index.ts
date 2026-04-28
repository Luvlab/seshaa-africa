import type { IncomingMessage, ServerResponse } from 'http';

let handler: ((req: IncomingMessage, res: ServerResponse) => void) | null = null;
let initError: Error | null = null;

try {
  const mod = require('../src/index');
  handler = mod.default ?? mod;
  console.log('[seshaa-api] loaded ok, handler type:', typeof handler);
} catch (e: unknown) {
  initError = e as Error;
  console.error('[seshaa-api] INIT ERROR:', initError?.message);
  console.error(initError?.stack);
}

export default function (req: IncomingMessage, res: ServerResponse) {
  if (initError || !handler) {
    const msg = JSON.stringify({ error: 'Server init failed', detail: initError?.message });
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(msg);
    return;
  }
  handler(req, res);
}
