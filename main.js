const { app, BrowserWindow, ipcMain, screen } = require('electron');
const bot = require('./bot');

let win;

app.whenReady().then(createWindow);

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  win = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
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

  win.setIgnoreMouseEvents(true, { forward: true });
  win.setAlwaysOnTop(true, 'screen-saver', 1);
  win.loadFile('overlay.html');
}

bot.on('status', msg => win?.webContents.send('status', msg));
bot.on('move', info => win?.webContents.send('move', info));
bot.on('board', rect => win?.webContents.send('board', rect));

ipcMain.on('set-click-through', (_, val) => {
  if (val) {
    win.setIgnoreMouseEvents(true, { forward: true });
  } else {
    win.setIgnoreMouseEvents(false);
  }
});

ipcMain.on('detect', () => bot.detectBoard());
ipcMain.on('start', () => bot.start('cq'));
ipcMain.on('stop', () => bot.stop());
ipcMain.on('kill', () => {
  bot.stop();
  setTimeout(() => app.quit(), 200);
});

app.on('window-all-closed', () => app.quit());
