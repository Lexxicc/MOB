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

// Disconnect tracking: once the WS has been down for >5s, the conn line
// switches from the silent grey "connecting" to a bold red, ticking
// "DISCONNECTED Ns" badge that persists across reconnect attempts until
// the socket actually re-opens.
const DC_BADGE_AFTER_MS = 5000;
let disconnectedSince = null;
let dcTicker = null;

function setConn(state) {
  const el = $('conn');
  el.textContent = state;
  el.className = state === 'live' ? 'ok' : (state === 'disconnected' ? 'bad' : '');
}

function renderDcBadge() {
  if (disconnectedSince == null) return;
  const gapMs = Date.now() - disconnectedSince;
  const el = $('conn');
  if (gapMs >= DC_BADGE_AFTER_MS) {
    const secs = Math.floor(gapMs / 1000);
    el.textContent = 'DISCONNECTED ' + secs + 's';
    el.className = 'dc-alert';
  } else {
    // Inside the grace window: keep the old subtle "connecting" look.
    el.textContent = 'connecting';
    el.className = '';
  }
}

function startDcTracking() {
  if (disconnectedSince == null) disconnectedSince = Date.now();
  if (dcTicker == null) {
    dcTicker = setInterval(renderDcBadge, 1000);
  }
  renderDcBadge();
}

function clearDcTracking() {
  disconnectedSince = null;
  if (dcTicker != null) { clearInterval(dcTicker); dcTicker = null; }
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
  // Only show the bare grey "connecting" on the very first attempt. Once a
  // disconnect is being tracked, the ticking badge owns the conn line so
  // reconnect attempts no longer flash it back to silent grey.
  if (disconnectedSince == null) setConn('connecting');
  const url = WS_URL + (SECRET ? ('?secret=' + encodeURIComponent(SECRET)) : '');
  ws = new WebSocket(url);

  ws.addEventListener('open', () => {
    clearDcTracking();
    setConn('live');
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  });
  ws.addEventListener('message', ev => {
    try { render(JSON.parse(ev.data)); } catch (e) { console.error(e); }
  });
  ws.addEventListener('close', () => {
    startDcTracking();
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
