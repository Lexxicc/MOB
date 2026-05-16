// Hash-Trader HUD - thin always-on-top Electron overlay.
// Connects to the bot's /hud/ws WebSocket and renders wallet / PnL / kill.
//
// Run from MOB repo root:
//   npm run start:hud           (after `npm run start:hud` is added to package.json)
// Or directly:
//   ./node_modules/.bin/electron apps/hash-trader-hud/main.js
//
// Env:
//   HT_WS_URL      ws://localhost:8000/hud/ws    (default)
//   HT_SECRET      <WEBHOOK_SECRET>              (required - same as bot config)

const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let win;
let saveTimer;
let isSnapping = false;

const SNAP_PX = 18;

const STATE_FILE = () => path.join(app.getPath('userData'), 'hud-state.json');

function loadPos() {
  try {
    const s = JSON.parse(fs.readFileSync(STATE_FILE(), 'utf8'));
    if (Number.isFinite(s.x) && Number.isFinite(s.y)) return s;
  } catch {}
  return null;
}

function savePos(bounds) {
  try {
    fs.writeFileSync(STATE_FILE(), JSON.stringify({ x: bounds.x, y: bounds.y }));
  } catch (e) {
    console.warn('hud-state save failed:', e.message);
  }
}

function snapToDisplayEdges(b) {
  const display = screen.getDisplayMatching(b);
  const work = display.workArea;
  let x = b.x, y = b.y;

  if (Math.abs(b.x - work.x) < SNAP_PX) x = work.x;
  else if (Math.abs((b.x + b.width) - (work.x + work.width)) < SNAP_PX) {
    x = work.x + work.width - b.width;
  }

  if (Math.abs(b.y - work.y) < SNAP_PX) y = work.y;
  else if (Math.abs((b.y + b.height) - (work.y + work.height)) < SNAP_PX) {
    y = work.y + work.height - b.height;
  }

  return (x !== b.x || y !== b.y) ? { x, y, width: b.width, height: b.height } : null;
}

function createWindow() {
  const { width } = screen.getPrimaryDisplay().workAreaSize;
  const saved = loadPos();
  const x = saved ? saved.x : width - 300;
  const y = saved ? saved.y : 20;

  win = new BrowserWindow({
    width: 280,
    height: 360,
    x, y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver', 1);
  win.loadFile(path.join(__dirname, 'overlay.html'));

  win.on('move', () => {
    if (isSnapping) return;
    const snapped = snapToDisplayEdges(win.getBounds());
    if (snapped) {
      isSnapping = true;
      win.setBounds(snapped);
      setImmediate(() => { isSnapping = false; });
    }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => savePos(win.getBounds()), 400);
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());

ipcMain.on('hud-close', () => app.quit());
