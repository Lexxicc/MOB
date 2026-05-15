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

let win;

function createWindow() {
  const { width } = screen.getPrimaryDisplay().workAreaSize;
  win = new BrowserWindow({
    width: 280,
    height: 360,
    x: width - 300,
    y: 20,
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
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());

ipcMain.on('hud-close', () => app.quit());
