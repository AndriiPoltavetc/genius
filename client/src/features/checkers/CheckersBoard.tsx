import { useState, useCallback } from 'react';

export type PieceType = 'man' | 'king';
export type Color = 'white' | 'black';
export type Piece = { type: PieceType; color: Color } | null;
export type Board = Piece[][];
export type CheckersMove = {
  from: [number, number];
  to: [number, number];
  captures: [number, number][];
};

interface ValidMove {
  from: [number, number];
  to: [number, number];
  captures: [number, number][];
}

interface CheckersBoardProps {
  board: Board;
  playerColor: Color;
  turn: Color;
  validMoves: ValidMove[];
  lastMove: CheckersMove | null;
  isGameOver: boolean;
  onMove: (move: CheckersMove) => void;
}

const LIGHT_SQ = '#f0d9b5';
const DARK_SQ = '#b58863';
const SELECTED_SQ = 'rgba(255,255,0,0.45)';
const MOVE_DOT = 'rgba(0,180,0,0.55)';
const CAPTURE_RING = 'rgba(220,30,30,0.75)';
const LAST_FROM = 'rgba(255,255,0,0.25)';
const LAST_TO = 'rgba(255,255,0,0.4)';

export default function CheckersBoard({
  board,
  playerColor,
  turn,
  validMoves,
  lastMove,
  isGameOver,
  onMove,
}: CheckersBoardProps) {
  const [selected, setSelected] = useState<[number, number] | null>(null);

  const isMyTurn = turn === playerColor && !isGameOver;

  // Squares reachable from selected piece
  const reachable: Map<string, ValidMove> = new Map();
  const capturable = new Set<string>();

  if (selected) {
    for (const m of validMoves) {
      if (m.from[0] === selected[0] && m.from[1] === selected[1]) {
        reachable.set(`${m.to[0]},${m.to[1]}`, m);
        for (const [cr, cc] of m.captures) capturable.add(`${cr},${cc}`);
      }
    }
  }

  const handleSquareClick = useCallback(
    (row: number, col: number) => {
      if (!isMyTurn) return;
      const piece = board[row][col];
      const sqKey = `${row},${col}`;

      // Click on reachable square → execute move
      if (selected && reachable.has(sqKey)) {
        const move = reachable.get(sqKey)!;
        setSelected(null);
        onMove(move);
        return;
      }

      // Click own piece → select it
      if (piece && piece.color === playerColor) {
        const hasMoves = validMoves.some((m) => m.from[0] === row && m.from[1] === col);
        if (hasMoves) {
          setSelected([row, col]);
          return;
        }
      }

      // Deselect
      setSelected(null);
    },
    [isMyTurn, selected, reachable, board, playerColor, validMoves, onMove],
  );

  // Render board rows in correct orientation
  const rows = playerColor === 'white' ? [...Array(8).keys()] : [...Array(8).keys()].reverse();
  const cols = playerColor === 'black' ? [...Array(8).keys()].reverse() : [...Array(8).keys()];

  return (
    <div
      style={{
        display: 'inline-grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        width: 'min(90vmin, 560px)',
        aspectRatio: '1',
        borderRadius: '4px',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      }}
    >
      {rows.map((row) =>
        cols.map((col) => {
          const isDark = (row + col) % 2 === 1;
          const piece = board[row][col];
          const sqKey = `${row},${col}`;
          const isSelected = selected?.[0] === row && selected?.[1] === col;
          const isReachable = reachable.has(sqKey);
          const isCaptureSq = capturable.has(sqKey);
          const isLastFrom = lastMove?.from[0] === row && lastMove?.from[1] === col;
          const isLastTo = lastMove?.to[0] === row && lastMove?.to[1] === col;

          let bg = isDark ? DARK_SQ : LIGHT_SQ;
          if (isSelected) bg = SELECTED_SQ;
          else if (isLastFrom) bg = `linear-gradient(${LAST_FROM}, ${LAST_FROM}), ${isDark ? DARK_SQ : LIGHT_SQ}`;
          else if (isLastTo) bg = `linear-gradient(${LAST_TO}, ${LAST_TO}), ${isDark ? DARK_SQ : LIGHT_SQ}`;

          return (
            <div
              key={sqKey}
              onClick={() => handleSquareClick(row, col)}
              style={{
                background: bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isMyTurn && (piece?.color === playerColor || isReachable) ? 'pointer' : 'default',
                position: 'relative',
              }}
            >
              {/* Last move highlight overlay */}
              {(isLastFrom || isLastTo) && (
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundColor: isLastFrom ? LAST_FROM : LAST_TO,
                  pointerEvents: 'none',
                }} />
              )}

              {/* Capture ring on enemy pieces */}
              {isCaptureSq && piece && (
                <div style={{
                  position: 'absolute', inset: '4px',
                  border: `3px solid ${CAPTURE_RING}`,
                  borderRadius: '50%',
                  pointerEvents: 'none',
                  zIndex: 2,
                }} />
              )}

              {/* Move dot on empty squares */}
              {isReachable && !piece && (
                <div style={{
                  width: '30%', height: '30%',
                  borderRadius: '50%',
                  backgroundColor: MOVE_DOT,
                  zIndex: 2,
                }} />
              )}

              {/* Piece */}
              {piece && <CheckersPiece piece={piece} />}
            </div>
          );
        }),
      )}
    </div>
  );
}

function CheckersPiece({ piece }: { piece: { type: PieceType; color: Color } }) {
  const isWhite = piece.color === 'white';
  return (
    <div style={{
      width: '78%', height: '78%',
      borderRadius: '50%',
      backgroundColor: isWhite ? '#f0f0f0' : '#1a1a1a',
      border: `3px solid ${isWhite ? '#888' : '#555'}`,
      boxShadow: `0 3px 6px rgba(0,0,0,0.4), inset 0 1px 2px ${isWhite ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.1)'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '22px',
      lineHeight: 1,
      userSelect: 'none',
      zIndex: 1,
    }}>
      {piece.type === 'king' && (
        <span style={{ color: isWhite ? '#555' : '#ccc', fontSize: '16px' }}>♛</span>
      )}
    </div>
  );
}
