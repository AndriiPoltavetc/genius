import { useState, useCallback, useEffect } from 'react';

export type PieceType = 'man' | 'king';
export type Color = 'white' | 'black';
export type Piece = { type: PieceType; color: Color } | null;
export type Board = Piece[][];
export type CheckersMove = {
  from: [number, number];
  to: [number, number];
  captures: [number, number][];
  path?: [number, number][];
};

interface ValidMove {
  from: [number, number];
  to: [number, number];
  captures: [number, number][];
  path?: [number, number][];
}

interface CheckersBoardProps {
  board: Board;
  playerColor: Color;
  turn: Color;
  validMoves: ValidMove[];
  lastMove: CheckersMove | null;
  isGameOver: boolean;
  onMove: (move: CheckersMove) => void;
  size?: number;
}

const LIGHT_SQ = '#f0d9b5';
const DARK_SQ = '#b58863';
const SELECTED_SQ = 'rgba(255,255,0,0.45)';
const LAST_FROM = 'rgba(255,255,0,0.25)';
const LAST_TO = 'rgba(255,255,0,0.4)';

function getMoveHighlight(theme: string): string {
  return (
    {
      dark: 'radial-gradient(circle, rgba(80,80,80,0.7) 30%, transparent 30%)',
      light: 'radial-gradient(circle, rgba(180,0,0,0.5) 30%, transparent 30%)',
      classic: 'radial-gradient(circle, rgba(0,80,0,0.6) 30%, transparent 30%)',
    }[theme] ?? 'radial-gradient(circle, rgba(80,80,80,0.7) 30%, transparent 30%)'
  );
}


interface CaptureProgress {
  candidates: ValidMove[];
  stepIndex: number;
}

export default function CheckersBoard({
  board,
  playerColor,
  turn,
  validMoves,
  lastMove,
  isGameOver,
  onMove,
  size,
}: CheckersBoardProps) {
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [captureProgress, setCaptureProgress] = useState<CaptureProgress | null>(null);
  const [moveTrail, setMoveTrail] = useState<[number, number][]>([]);

  const [pieceStyle, setPieceStyle] = useState(
    () => localStorage.getItem('genius_pieces') ?? 'standard',
  );
  const [currentTheme, setCurrentTheme] = useState(
    () => document.documentElement.getAttribute('data-theme') ?? 'dark',
  );

  // Sync piece style whenever settings change
  useEffect(() => {
    const sync = () => setPieceStyle(localStorage.getItem('genius_pieces') ?? 'standard');
    window.addEventListener('genius:settings-changed', sync);
    window.addEventListener('pieceStyleChanged', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('genius:settings-changed', sync);
      window.removeEventListener('pieceStyleChanged', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  // Observe data-theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setCurrentTheme(document.documentElement.getAttribute('data-theme') ?? 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Reset capture progress when the board state changes (new move received)
  useEffect(() => {
    setCaptureProgress(null);
    setSelected(null);
  }, [board]);

  // Show multi-capture trail briefly after each move
  useEffect(() => {
    const path = lastMove?.path;
    if (path && path.length > 0) {
      setMoveTrail(path);
      const t = setTimeout(() => setMoveTrail([]), 800);
      return () => clearTimeout(t);
    } else {
      setMoveTrail([]);
    }
  }, [lastMove]);

  const isMyTurn = turn === playerColor && !isGameOver;

  const reachable = new Map<string, ValidMove>();
  const capturable = new Set<string>();

  if (captureProgress) {
    // Step-by-step multi-capture: show only current step's destination and captures
    const { candidates, stepIndex } = captureProgress;
    for (const m of candidates) {
      const stop = stepIndex < (m.path?.length ?? 0) ? m.path![stepIndex] : m.to;
      reachable.set(`${stop[0]},${stop[1]}`, m);
    }
    for (const m of candidates) {
      if (m.captures[stepIndex]) {
        const [cr, cc] = m.captures[stepIndex];
        capturable.add(`${cr},${cc}`);
      }
    }
  } else {
    // Normal mode: show first-step captures as red rings
    for (const m of validMoves) {
      if (m.captures.length > 0) {
        const [cr, cc] = m.captures[0];
        capturable.add(`${cr},${cc}`);
      }
    }
    if (selected) {
      for (const m of validMoves) {
        if (m.from[0] === selected[0] && m.from[1] === selected[1]) {
          reachable.set(`${m.to[0]},${m.to[1]}`, m);
        }
      }
    }
  }

  const handleSquareClick = useCallback(
    (row: number, col: number) => {
      if (!isMyTurn) return;
      const piece = board[row][col];
      const sqKey = `${row},${col}`;

      // ── Mid-capture step handling ────────────────────────────────────
      if (captureProgress) {
        if (reachable.has(sqKey)) {
          const { candidates, stepIndex } = captureProgress;
          const nextCandidates = candidates.filter((m) => {
            const stop = stepIndex < (m.path?.length ?? 0) ? m.path![stepIndex] : m.to;
            return stop[0] === row && stop[1] === col;
          });
          if (nextCandidates.length === 0) { setCaptureProgress(null); setSelected(null); return; }
          // A candidate is "done" when clicked square is its final destination
          const done = nextCandidates.find((m) => stepIndex >= (m.path?.length ?? 0));
          if (done) { setCaptureProgress(null); setSelected(null); onMove(done); return; }
          setCaptureProgress({ candidates: nextCandidates, stepIndex: stepIndex + 1 });
        } else {
          setCaptureProgress(null); setSelected(null);
        }
        return;
      }

      // ── Normal click ─────────────────────────────────────────────────
      if (selected && reachable.has(sqKey)) {
        const move = reachable.get(sqKey)!;
        setSelected(null);
        onMove(move);
        return;
      }

      if (piece && piece.color === playerColor) {
        const movesFromHere = validMoves.filter((m) => m.from[0] === row && m.from[1] === col);
        if (movesFromHere.length > 0) {
          setSelected([row, col]);
          if (movesFromHere.some((m) => (m.path?.length ?? 0) > 0)) {
            setCaptureProgress({ candidates: movesFromHere, stepIndex: 0 });
          } else {
            setCaptureProgress(null);
          }
          return;
        }
      }

      setSelected(null);
      setCaptureProgress(null);
    },
    [isMyTurn, selected, captureProgress, reachable, board, playerColor, validMoves, onMove],
  );

  const rows = playerColor === 'white' ? [...Array(8).keys()] : [...Array(8).keys()].reverse();
  const cols = playerColor === 'black' ? [...Array(8).keys()].reverse() : [...Array(8).keys()];

  return (
    <div
      style={{
        display: 'inline-grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        width: size ? `${size}px` : 'min(calc(100vw - 16px), 560px)',
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
          const isTrail = moveTrail.some(([tr, tc]) => tr === row && tc === col);

          const baseBg = isDark ? DARK_SQ : LIGHT_SQ;
          let bg = baseBg;
          if (isSelected) bg = SELECTED_SQ;
          else if (isLastFrom) bg = `linear-gradient(${LAST_FROM}, ${LAST_FROM}), ${baseBg}`;
          else if (isLastTo) bg = `linear-gradient(${LAST_TO}, ${LAST_TO}), ${baseBg}`;
          else if (isReachable && !piece) bg = `${getMoveHighlight(currentTheme)}, ${baseBg}`;

          return (
            <div
              key={sqKey}
              onClick={() => handleSquareClick(row, col)}
              style={{
                background: bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: captureProgress
                  ? (isReachable ? 'pointer' : 'not-allowed')
                  : isMyTurn && (piece?.color === playerColor || isReachable) ? 'pointer' : 'default',
                position: 'relative',
              }}
            >
              {/* Last move highlight overlay */}
              {(isLastFrom || isLastTo) && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: isLastFrom ? LAST_FROM : LAST_TO,
                    pointerEvents: 'none',
                  }}
                />
              )}

              {/* Multi-capture trail overlay */}
              {isTrail && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(255,165,0,0.4)',
                    pointerEvents: 'none',
                    zIndex: 1,
                  }}
                />
              )}

              {/* Capture highlight on enemy pieces */}
              {isCaptureSq && piece && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    outline: '4px solid rgba(220, 30, 30, 0.95)',
                    outlineOffset: '-4px',
                    backgroundColor: 'rgba(220, 30, 30, 0.15)',
                    pointerEvents: 'none',
                    zIndex: 10,
                  }}
                />
              )}

              {/* Piece */}
              {piece && <CheckersPiece piece={piece} pieceStyle={pieceStyle} />}
            </div>
          );
        }),
      )}
    </div>
  );
}

function CheckersPiece({
  piece,
  pieceStyle,
}: {
  piece: { type: PieceType; color: Color };
  pieceStyle: string;
}) {
  const isWhite = piece.color === 'white';

  let extraStyle: React.CSSProperties;
  if (pieceStyle === 'minimalist') {
    extraStyle = {
      backgroundColor: isWhite ? '#ffffff' : '#222222',
      border: `2px solid ${isWhite ? '#999' : '#666'}`,
    };
  } else if (pieceStyle === 'classic') {
    extraStyle = {
      backgroundColor: isWhite ? '#f5f5dc' : '#2c1810',
      border: '3px solid #8b7355',
      boxShadow: `inset 0 0 0 4px ${isWhite ? '#d4c5a9' : '#4a3728'}`,
    };
  } else {
    extraStyle = {
      backgroundColor: isWhite ? '#f0f0f0' : '#1a1a1a',
      border: `3px solid ${isWhite ? '#888' : '#555'}`,
      boxShadow: `0 3px 6px rgba(0,0,0,0.4), inset 0 1px 2px ${isWhite ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.1)'}`,
    };
  }

  return (
    <div
      style={{
        width: '75%',
        height: '75%',
        borderRadius: '50%',
        position: 'relative',
        flexShrink: 0,
        zIndex: 1,
        ...extraStyle,
      }}
    >
      {piece.type === 'king' && (
        <span
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 'clamp(12px, 2vw, 18px)',
            lineHeight: 1,
            pointerEvents: 'none',
            userSelect: 'none',
            color: isWhite ? '#555' : '#ccc',
          }}
        >
          ♛
        </span>
      )}
    </div>
  );
}
