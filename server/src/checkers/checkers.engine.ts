export type PieceType = 'man' | 'king';
export type Color = 'white' | 'black';
export type Piece = { type: PieceType; color: Color } | null;
export type Board = Piece[][];
export type CheckersMove = {
  from: [number, number];
  to: [number, number];
  captures: [number, number][];
  path: [number, number][];
};

export function createInitialBoard(): Board {
  const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 !== 1) continue;
      if (row <= 2) board[row][col] = { type: 'man', color: 'black' };
      else if (row >= 5) board[row][col] = { type: 'man', color: 'white' };
    }
  }
  return board;
}

function opponent(color: Color): Color {
  return color === 'white' ? 'black' : 'white';
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

// Find all capture sequences for a piece at (row, col)
function findCaptures(
  board: Board,
  row: number,
  col: number,
  color: Color,
  pieceType: PieceType,
  capturedSoFar: [number, number][],
  visitedSquares: Set<string>,
): CheckersMove[] {
  const dirs = pieceType === 'king'
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    : color === 'white'
      ? [[-1, -1], [-1, 1]]        // white moves up (row decreases)
      : [[1, -1], [1, 1]];          // black moves down (row increases)

  // For kings, also look backwards
  const allDirs = pieceType === 'king'
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    : [[-1, -1], [-1, 1], [1, -1], [1, 1]]; // men can capture in all dirs

  const opp = opponent(color);
  const results: CheckersMove[] = [];

  if (pieceType === 'man') {
    for (const [dr, dc] of allDirs) {
      const mr = row + dr;
      const mc = col + dc;
      const lr = row + 2 * dr;
      const lc = col + 2 * dc;
      if (!inBounds(mr, mc) || !inBounds(lr, lc)) continue;
      const mid = board[mr][mc];
      const land = board[lr][lc];
      if (!mid || mid.color !== opp) continue;
      const captKey = `${mr},${mc}`;
      if (capturedSoFar.some(([r, c]) => r === mr && c === mc)) continue;
      if (land !== null) continue;

      // Temporarily apply for multi-capture
      const newBoard = board.map((r) => [...r]);
      newBoard[lr][lc] = { type: pieceType, color };
      newBoard[row][col] = null;
      newBoard[mr][mc] = null;

      // Check if becomes king (can still continue capturing as king)
      const becomesKing = (color === 'white' && lr === 0) || (color === 'black' && lr === 7);
      const newPieceType: PieceType = becomesKing ? 'king' : pieceType;
      if (becomesKing) newBoard[lr][lc] = { type: 'king', color };

      const newCaptured = [...capturedSoFar, [mr, mc] as [number, number]];
      const further = findCaptures(newBoard, lr, lc, color, newPieceType, newCaptured, visitedSquares);

      if (further.length === 0) {
        results.push({ from: [row, col] as [number, number], to: [lr, lc] as [number, number], captures: newCaptured, path: [] });
      } else {
        results.push(...further.map((m) => ({ from: [row, col] as [number, number], to: m.to, captures: m.captures, path: [[lr, lc] as [number, number], ...m.path] })));
      }
    }
  } else {
    // King captures: can jump over a piece at any range
    for (const [dr, dc] of allDirs) {
      let r = row + dr;
      let c = col + dc;
      let found: [number, number] | null = null;

      while (inBounds(r, c)) {
        const cell = board[r][c];
        if (cell) {
          if (cell.color === opp && !capturedSoFar.some(([cr, cc]) => cr === r && cc === c)) {
            found = [r, c];
          }
          break;
        }
        r += dr;
        c += dc;
      }

      if (!found) continue;

      // Land squares after captured piece
      let lr = found[0] + dr;
      let lc = found[1] + dc;
      while (inBounds(lr, lc) && board[lr][lc] === null) {
        const newBoard = board.map((row) => [...row]);
        newBoard[lr][lc] = { type: 'king', color };
        newBoard[row][col] = null;
        newBoard[found[0]][found[1]] = null;

        const newCaptured = [...capturedSoFar, found as [number, number]];
        const further = findCaptures(newBoard, lr, lc, color, 'king', newCaptured, visitedSquares);

        if (further.length === 0) {
          results.push({ from: [row, col] as [number, number], to: [lr, lc] as [number, number], captures: newCaptured, path: [] });
        } else {
          results.push(...further.map((m) => ({ from: [row, col] as [number, number], to: m.to, captures: m.captures, path: [[lr, lc] as [number, number], ...m.path] })));
        }

        lr += dr;
        lc += dc;
      }
    }
  }

  return results;
}

export function getValidMoves(board: Board, color: Color): CheckersMove[] {
  const captures: CheckersMove[] = [];
  const quietMoves: CheckersMove[] = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece || piece.color !== color) continue;

      // Captures
      const pCaptures = findCaptures(board, row, col, color, piece.type, [], new Set());
      captures.push(...pCaptures);

      // Quiet moves (only if no captures found globally — we check later)
      if (piece.type === 'man') {
        const dirs = color === 'white' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
        for (const [dr, dc] of dirs) {
          const nr = row + dr;
          const nc = col + dc;
          if (inBounds(nr, nc) && board[nr][nc] === null) {
            quietMoves.push({ from: [row, col], to: [nr, nc], captures: [], path: [] });
          }
        }
      } else {
        // King quiet moves
        for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
          let nr = row + dr;
          let nc = col + dc;
          while (inBounds(nr, nc) && board[nr][nc] === null) {
            quietMoves.push({ from: [row, col], to: [nr, nc], captures: [], path: [] });
            nr += dr;
            nc += dc;
          }
        }
      }
    }
  }

  return captures.length > 0 ? captures : quietMoves;
}

export function applyMove(board: Board, move: CheckersMove): Board {
  const newBoard = board.map((r) => [...r]);
  const piece = newBoard[move.from[0]][move.from[1]];
  if (!piece) return newBoard;

  newBoard[move.to[0]][move.to[1]] = piece;
  newBoard[move.from[0]][move.from[1]] = null;

  for (const [cr, cc] of move.captures) {
    newBoard[cr][cc] = null;
  }

  // Promotion
  if (piece.type === 'man') {
    if (piece.color === 'white' && move.to[0] === 0) {
      newBoard[move.to[0]][move.to[1]] = { type: 'king', color: 'white' };
    } else if (piece.color === 'black' && move.to[0] === 7) {
      newBoard[move.to[0]][move.to[1]] = { type: 'king', color: 'black' };
    }
  }

  return newBoard;
}

export function checkGameOver(
  board: Board,
  currentTurn: Color,
  movesSinceCapture: number,
): Color | 'draw' | null {
  if (movesSinceCapture >= 25) return 'draw';

  const moves = getValidMoves(board, currentTurn);
  if (moves.length === 0) return opponent(currentTurn); // current player can't move → loses

  return null;
}

export function isValidMove(board: Board, move: CheckersMove, color: Color): boolean {
  const valid = getValidMoves(board, color);
  return valid.some(
    (m) =>
      m.from[0] === move.from[0] &&
      m.from[1] === move.from[1] &&
      m.to[0] === move.to[0] &&
      m.to[1] === move.to[1],
  );
}

export function countPieces(board: Board): { white: number; black: number; whiteKings: number; blackKings: number } {
  let white = 0, black = 0, whiteKings = 0, blackKings = 0;
  for (const row of board) {
    for (const cell of row) {
      if (!cell) continue;
      if (cell.color === 'white') { white++; if (cell.type === 'king') whiteKings++; }
      else { black++; if (cell.type === 'king') blackKings++; }
    }
  }
  return { white, black, whiteKings, blackKings };
}

export function boardToString(board: Board): string {
  return board.map((r) => r.map((c) => (c ? `${c.color[0]}${c.type[0]}` : '--')).join(',')).join(';');
}
