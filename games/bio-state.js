// BIO companion state reader
// For DOM-based games: reads G (game state) from the browser via a local HTTP
// polling endpoint exposed by a companion userscript / browser extension.
//
// Setup (manual, one-time):
//   1. Install Tampermonkey (Chrome/Firefox).
//   2. Add a userscript on http://localhost:*/BIO*/ that polls and serves G state:
//        window._mobState = () => ({ hand: G.h[0], L: G.L, R: G.R,
//          cur: G.cur, over: G.over, yardEmpty: G.yard.length === 0 });
//   3. The companion script below calls window._mobState() via CDP eval.
//      (CDP = Chrome DevTools Protocol — requires Chrome launched with --remote-debugging-port=9222)
//
// Alternative: run the game in Electron's own BrowserView to get direct webContents access.
//   This removes the CDP dependency at the cost of running the game inside MOB.

const http = require('http');

// Poll via CDP on localhost:9222 (Chrome must be running with --remote-debugging-port=9222).
async function readState() {
  // 1. Get list of targets
  const targets = await get('http://localhost:9222/json');
  const page = targets.find(t => t.url && /BIO|Bomb/i.test(t.url));
  if (!page) throw new Error('BIO tab not found on CDP port 9222');

  // 2. Open WebSocket to page debugger
  const ws = await cdpEval(page.webSocketDebuggerUrl, `
    (function() {
      if (typeof G === 'undefined') return null;
      return JSON.stringify({
        hand: G.h[0],
        L: G.L,
        R: G.R,
        cur: G.cur,
        over: G.over,
        yardEmpty: G.yard.length === 0
      });
    })()
  `);

  if (!ws) return null;
  return JSON.parse(ws);
}

function get(url) {
  return new Promise((res, rej) => {
    http.get(url, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => { try { res(JSON.parse(d)); } catch { rej(new Error('JSON parse failed')); } });
    }).on('error', rej);
  });
}

// Minimal CDP eval via raw WebSocket. Uses Node's built-in `ws` if available, else errors.
function cdpEval(wsUrl, expr) {
  return new Promise((res, rej) => {
    let ws;
    try { ws = new (require('ws'))(wsUrl); }
    catch { rej(new Error('ws package not installed — run: npm install ws')); return; }
    const id = Math.floor(Math.random() * 1e6);
    ws.once('open', () => ws.send(JSON.stringify({
      id, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true }
    })));
    ws.on('message', raw => {
      const msg = JSON.parse(raw);
      if (msg.id !== id) return;
      ws.close();
      const val = msg.result?.result?.value;
      res(val !== undefined ? val : null);
    });
    ws.on('error', rej);
    setTimeout(() => { ws.close(); rej(new Error('CDP timeout')); }, 3000);
  });
}

module.exports = { readState };
