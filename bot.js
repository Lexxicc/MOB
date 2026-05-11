const { EventEmitter } = require('events');
const capture = require('./capture');
const vision = require('./vision');
const input = require('./input');

const INTER_MOVE_MS = 1600; // bot anim (180ms) + AI delay (500ms) + AI anim (180ms) + buffer
const SELECT_DELAY_MS = 250;

class Bot extends EventEmitter {
  constructor() {
    super();
    this.running = false;
    this.boardRect = null;
    this.adapter = null;
    this.timer = null;
    this.moveCount = 0;
  }

  async detectBoard() {
    this.emit('status', 'Scanning...');
    try {
      const rect = await vision.detectBoard();
      if (!rect) {
        this.emit('status', 'Board not found. Open CQ in browser and try again.');
        return;
      }
      this.boardRect = rect;
      this.emit('board', rect);
      this.emit('status', `Board: ${rect.w}x${rect.h} at (${rect.x},${rect.y})`);
    } catch (e) {
      this.emit('status', `Detect error: ${e.message}`);
    }
  }

  async start(gameName) {
    if (this.running) return;
    if (!this.boardRect) {
      this.emit('status', 'No board set. Run Detect first.');
      return;
    }
    this.adapter = require(`./games/${gameName}-adapter`);
    this.running = true;
    this.moveCount = 0;
    this.emit('status', 'Running');
    this._loop();
  }

  stop() {
    this.running = false;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.emit('status', 'Stopped');
  }

  async _loop() {
    if (!this.running) return;
    try {
      const board = await vision.parse(this.boardRect);
      const move = this.adapter.pickMove(board);

      if (!move) {
        this.emit('status', 'No legal moves — game over or waiting for AI.');
        this.timer = setTimeout(() => this._loop(), INTER_MOVE_MS);
        return;
      }

      const { fromX, fromY, toX, toY } = this.adapter.moveToScreen(move, this.boardRect);

      input.click(fromX, fromY, this.boardRect);
      await sleep(SELECT_DELAY_MS);
      input.click(toX, toY, this.boardRect);

      this.moveCount++;
      const caps = move.captures.length;
      const label = caps > 0 ? `+${caps} cap` : 'move';
      this.emit('move', { count: this.moveCount, from: move.from, to: move.to, captures: caps });
      this.emit('status', `Move ${this.moveCount} (${label}) done`);
    } catch (e) {
      this.emit('status', `ERR: ${e.message}`);
    }

    this.timer = setTimeout(() => this._loop(), INTER_MOVE_MS);
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = new Bot();
