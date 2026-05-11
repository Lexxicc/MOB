const { ipcRenderer } = require('electron');

const panel = document.getElementById('panel');
const elStatus = document.getElementById('status');
const elBoard = document.getElementById('board-info');
const elCount = document.getElementById('move-count');
const elLast = document.getElementById('last-move');
const moveBar = document.getElementById('move-bar');

let moveCount = 0;

// Dynamic click-through: disable when cursor is over the panel
document.addEventListener('mousemove', e => {
  const r = panel.getBoundingClientRect();
  const over = e.clientX >= r.left && e.clientX <= r.right &&
               e.clientY >= r.top  && e.clientY <= r.bottom;
  ipcRenderer.send('set-click-through', !over);
});

// Button handlers
document.getElementById('btn-detect').addEventListener('click', () => {
  ipcRenderer.send('detect');
});
document.getElementById('btn-start').addEventListener('click', () => {
  ipcRenderer.send('start');
});
document.getElementById('btn-stop').addEventListener('click', () => {
  ipcRenderer.send('stop');
});
document.getElementById('btn-kill').addEventListener('click', () => {
  ipcRenderer.send('kill');
});

// Status updates from main process
ipcRenderer.on('status', (_, msg) => {
  elStatus.textContent = msg;
});

ipcRenderer.on('board', (_, rect) => {
  elBoard.textContent = `${rect.w}x${rect.h} @(${rect.x},${rect.y})`;
});

ipcRenderer.on('move', (_, info) => {
  moveCount = info.count;
  elCount.textContent = moveCount;
  const from = `[${info.from[0]},${info.from[1]}]`;
  const to = `[${info.to[0]},${info.to[1]}]`;
  elLast.textContent = `${from}→${to}${info.captures > 0 ? ' ×' + info.captures : ''}`;
  moveBar.style.width = Math.min(100, moveCount * 4) + '%';
});
