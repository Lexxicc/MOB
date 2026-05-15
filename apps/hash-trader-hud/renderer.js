// HUD renderer: WS client + DOM updates.
// Reads HT_WS_URL + HT_SECRET from process.env (Electron nodeIntegration is on
// for the PoC; harden later).

const { ipcRenderer } = require('electron');

const WS_URL = process.env.HT_WS_URL || 'ws://localhost:8000/hud/ws';
const SECRET = process.env.HT_SECRET || '';

const $ = id => document.getElementById(id);
const fmt = (n, d = 4) => (n == null || Number.isNaN(n)) ? '--' : Number(n).toFixed(d);

let ws = null;
let reconnectTimer = null;

function setConn(state) {
  const el = $('conn');
  el.textContent = state;
  el.className = state === 'live' ? 'ok' : (state === 'disconnected' ? 'bad' : '');
}

function shortKey(pk) {
  if (!pk) return '--';
  return pk.slice(0, 4) + '..' + pk.slice(-4);
}

function shortTx(tx) {
  if (!tx) return '--';
  return tx.slice(0, 6) + '..';
}

function render(snap) {
  const modeEl = $('mode');
  modeEl.textContent = snap.mode || '--';
  modeEl.className = 'mode ' + (snap.mode === 'LIVE' ? 'live' : 'paper');

  $('wallet-sol').textContent = snap.wallet_sol != null ? fmt(snap.wallet_sol, 6) + ' SOL' : (snap.wallet_error ? 'err' : '--');
  $('wallet-pubkey').textContent = shortKey(snap.wallet_pubkey);

  const pnl = snap.cum_pnl_usd ?? 0;
  const pnlEl = $('cum-pnl');
  pnlEl.textContent = (pnl >= 0 ? '+$' : '-$') + Math.abs(pnl).toFixed(4);
  pnlEl.className = 'val ' + (pnl > 0 ? 'pnl-pos' : (pnl < 0 ? 'pnl-neg' : 'pnl-zero'));

  $('trade-count').textContent = snap.live_trades ?? 0;
  $('daily-loss').textContent = fmt(snap.daily_loss_sol, 6) + ' SOL';

  const cbEl = $('cb');
  if (snap.circuit_breaker_open) {
    cbEl.textContent = 'OPEN';
    cbEl.className = 'val cb-open';
  } else {
    cbEl.textContent = 'closed';
    cbEl.className = 'val cb-ok';
  }

  const list = $('recent-list');
  list.innerHTML = '';
  for (const t of (snap.last_trades || [])) {
    const row = document.createElement('div');
    row.className = 'trade';
    const sigSpan = `<span class="${t.signal}">${t.signal.padEnd(4)}</span>`;
    const pnlStr = t.realised_pnl_usd != null ? (t.realised_pnl_usd >= 0 ? '+' : '') + t.realised_pnl_usd.toFixed(3) : '';
    const ts = (t.ts || '').slice(11, 19); // HH:MM:SS
    row.innerHTML = `<span>${ts} ${sigSpan} ${shortTx(t.tx_sig)}</span><span>${pnlStr}</span>`;
    list.appendChild(row);
  }
}

function connect() {
  setConn('connecting');
  const url = WS_URL + (SECRET ? ('?secret=' + encodeURIComponent(SECRET)) : '');
  ws = new WebSocket(url);

  ws.addEventListener('open', () => {
    setConn('live');
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  });
  ws.addEventListener('message', ev => {
    try { render(JSON.parse(ev.data)); } catch (e) { console.error(e); }
  });
  ws.addEventListener('close', () => {
    setConn('disconnected');
    if (!reconnectTimer) reconnectTimer = setTimeout(connect, 3000);
  });
  ws.addEventListener('error', () => { /* handled by close */ });
}

document.getElementById('btn-kill').addEventListener('click', () => {
  if (!confirm('Kill the trading bot? This writes /tmp/ht-stop and the process shuts down.')) return;
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ cmd: 'kill' }));
});

document.getElementById('btn-close').addEventListener('click', () => {
  ipcRenderer.send('hud-close');
});

connect();
