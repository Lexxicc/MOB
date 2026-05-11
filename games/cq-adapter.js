// CQ Chequers adapter — classic draughts rules
// Bot plays as CREAM (white). RED = AI opponent.
// Cream moves upward (decreasing row). Red moves downward.
// Mandatory capture enforced. Chained jumps supported.

const CREAM = 'cream';
const RED = 'red';

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function dirs(cell) {
  const up = [[-1, -1], [-1, 1]];
  const down = [[1, -1], [1, 1]];
  if (cell.king) return [...up, ...down];
  return cell.piece === CREAM ? up : down;
}

// Recursive chained capture generator.
// Returns array of complete move objects terminating at each possible chain end.
function getCaptures(board, origR, origC, atR, atC, captured, cell) {
  const moves = [];

  for (const [dr, dc] of dirs(cell)) {
    const er = atR + dr, ec = atC + dc; // enemy square
    if (!inBounds(er, ec)) continue;
    if (!board[er][ec] || board[er][ec].piece !== RED) continue;
    if (captured.some(([cr, cc]) => cr === er && cc === ec)) continue; // already jumped

    const lr = er + dr, lc = ec + dc; // landing square
    if (!inBounds(lr, lc) || (board[lr][lc] && board[lr][lc].piece)) continue;

    const newCap = [...captured, [er, ec]];
    const sub = getCaptures(board, origR, origC, lr, lc, newCap, cell);
    if (sub.length > 0) {
      moves.push(...sub);
    } else {
      moves.push({ from: [origR, origC], to: [lr, lc], captures: newCap });
    }
  }

  return moves;
}

function getLegalMoves(board) {
  const captures = [];
  const regular = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = board[r][c];
      if (!cell || cell.piece !== CREAM) continue;

      // Capture chains — getCaptures scans all directions internally
      const chains = getCaptures(board, r, c, r, c, [], cell);
      captures.push(...chains);

      // Collect regular moves for fallback (only used if no captures exist across all pieces)
      for (const [dr, dc] of dirs(cell)) {
        const tr = r + dr, tc = c + dc;
        if (!inBounds(tr, tc)) continue;
        if (!board[tr][tc].piece) {
          regular.push({ from: [r, c], to: [tr, tc], captures: [] });
        }
      }
    }
  }

  // Mandatory capture: if ANY piece can capture, only captures are legal
  if (captures.length > 0) return captures;
  return regular;
}

function pickMove(board) {
  const moves = getLegalMoves(board);
  if (!moves.length) return null;
  return moves[Math.floor(Math.random() * moves.length)];
}

function moveToScreen(move, rect) {
  const cs = rect.w / 8;
  const [fromRow, fromCol] = move.from;
  const [toRow, toCol] = move.to;
  return {
    fromX: Math.round(rect.x + fromCol * cs + cs / 2),
    fromY: Math.round(rect.y + fromRow * cs + cs / 2),
    toX: Math.round(rect.x + toCol * cs + cs / 2),
    toY: Math.round(rect.y + toRow * cs + cs / 2),
  };
}

module.exports = { getLegalMoves, pickMove, moveToScreen };
