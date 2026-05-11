// BIO Bomb-inoes adapter
//
// Architecture note (DOM vs canvas):
// BIO uses HTML div elements for tiles, not a canvas. Vision via screenshot
// pixel analysis is NOT the right approach here. Pip counting from a screenshot
// is fragile compared to DOM inspection.
//
// For DOM-based games, the preferred approach is a companion content-script
// injected into the browser page (via browser extension or Puppeteer/CDP) that
// reads G.h[0] (player hand), G.L, G.R (open ends) directly from the live JS
// game state and exposes them via a local WebSocket or postMessage to the bot.
//
// This adapter is structured around that interface: it expects a pre-parsed
// state object, not a raw screenshot. The shell (main.js, capture.js, etc.)
// remains identical — the "parse" step for DOM games swaps screenshot+vision
// for a state snapshot from a companion script.
//
// Shell vs adapter split verdict:
//   Reusable shell (main.js, overlay.html/js, capture.js, input.js, bot.js):
//     ~266 lines — unchanged for every new game
//   Game-specific layer (vision function OR state reader + adapter):
//     CQ: vision.js (90) + cq-adapter.js (78) = 168 lines (39% of 434)
//     BIO: bio-state.js (est ~30) + bio-adapter.js (est ~60) = 90 lines
//     Combined: 90 / (266 + 168 + 90) = 17% game-specific for the second game
//     Delta to add BIO: 90 / 524 = 17% — below the <20% target, close to <10%
//       for pure adapter code if the DOM reader is treated as infrastructure.

// --- State format ---
// parse(rect) returns a state object for DOM games via companion script:
// {
//   hand: Array<[number, number]>,  // player's tiles e.g. [[3,5],[0,2],...]
//   L: number | null,               // left open end pip count
//   R: number | null,               // right open end pip count
//   cur: number,                    // 0 = player turn, 1 = AI turn
//   over: boolean,
//   yardEmpty: boolean,
// }

// --- Move format ---
// { tileIndex: number, side: 'left'|'right'|'first' }
// tileIndex = index in hand array
// side = which end of the chain to play on ('first' = board is empty)

function getLegalMoves(state) {
  if (!state || state.over || state.cur !== 0) return [];
  const { hand, L, R } = state;

  if (L === null) {
    // Board is empty — any tile plays as first
    return hand.map((_, i) => ({ tileIndex: i, side: 'first' }));
  }

  const moves = [];
  for (let i = 0; i < hand.length; i++) {
    const [a, b] = hand[i];
    if (a === L || b === L) moves.push({ tileIndex: i, side: 'left' });
    if (a === R || b === R) moves.push({ tileIndex: i, side: 'right' });
  }
  return moves;
}

function pickMove(state) {
  const moves = getLegalMoves(state);
  if (!moves.length) return null; // no move = must draw (handled by bot loop)
  return moves[Math.floor(Math.random() * moves.length)];
}

// moveToScreen: translate a move to click coordinates.
// For BIO, clicking happens on:
//   (1) the tile element in the player's hand row
//   (2) the 'left' or 'right' placement button
//
// rect here is the hand area bounding box, not a grid.
// Tile width is approximately rect.w / hand.length.
// Placement buttons are fixed positions below/adjacent to the board — these
// need calibration as separate rect values (passed as rect.leftBtn, rect.rightBtn).
function moveToScreen(move, rect) {
  const { tileIndex, side } = move;
  const tileW = rect.w / (rect.handCount || 7);
  const tileX = Math.round(rect.x + tileIndex * tileW + tileW / 2);
  const tileY = Math.round(rect.y + rect.h / 2);

  if (side === 'first' || side === 'right') {
    return {
      fromX: tileX, fromY: tileY,
      toX: rect.rightBtnX, toY: rect.rightBtnY,
    };
  }
  return {
    fromX: tileX, fromY: tileY,
    toX: rect.leftBtnX, toY: rect.leftBtnY,
  };
}

module.exports = { getLegalMoves, pickMove, moveToScreen };
