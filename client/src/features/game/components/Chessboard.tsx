import { useState, useCallback, useEffect, useRef } from 'react';
import { Chessboard as ReactChessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';

import { getSocket } from '../socket';
import { useAppSelector } from '../../../app/hooks';

interface ChessboardProps {
  gameId: string;
}

type SquareStyles = Record<string, { background?: string; borderRadius?: string; backgroundColor?: string; outline?: string; outlineOffset?: string }>;

const PROMO_PIECES: { piece: 'q' | 'r' | 'b' | 'n'; whiteSymbol: string; blackSymbol: string; label: string }[] = [
  { piece: 'q', whiteSymbol: '♕', blackSymbol: '♛', label: 'Ферзь' },
  { piece: 'r', whiteSymbol: '♖', blackSymbol: '♜', label: 'Тура' },
  { piece: 'b', whiteSymbol: '♗', blackSymbol: '♝', label: 'Слон' },
  { piece: 'n', whiteSymbol: '♘', blackSymbol: '♞', label: 'Кінь' },
];

// ── Custom piece sets ──────────────────────────────────────────────────────
const UNICODE: Record<string, string> = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
};

function makePiece(code: string, style: 'minimalist' | 'classic') {
  const isWhite = code[0] === 'w';
  const symbol = UNICODE[code] ?? '?';
  return ({ squareWidth }: { squareWidth: number }) => (
    <svg viewBox="0 0 45 45" width={squareWidth} height={squareWidth}>
      {style === 'classic' && (
        <defs>
          <filter id={`shadow-${code}`}>
            <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="rgba(0,0,0,0.85)" />
          </filter>
        </defs>
      )}
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fontSize="32"
        fill={isWhite ? '#ffffff' : '#1a1a1a'}
        stroke={style === 'minimalist' ? undefined : isWhite ? '#333' : '#ccc'}
        strokeWidth={style === 'minimalist' ? undefined : '0.8'}
        paintOrder={style === 'minimalist' ? undefined : 'stroke'}
        filter={style === 'classic' ? `url(#shadow-${code})` : undefined}
      >
        {symbol}
      </text>
    </svg>
  );
}

const PIECE_SETS: Record<'minimalist' | 'classic', Record<string, ({ squareWidth }: { squareWidth: number }) => JSX.Element>> = {
  minimalist: Object.fromEntries(
    Object.keys(UNICODE).map((code) => [code, makePiece(code, 'minimalist')])
  ),
  classic: Object.fromEntries(
    Object.keys(UNICODE).map((code) => [code, makePiece(code, 'classic')])
  ),
};

function findKingSquare(chess: Chess, color: 'w' | 'b'): Square | null {
  const board = chess.board();
  for (const row of board) {
    for (const cell of row) {
      if (cell && cell.type === 'k' && cell.color === color) {
        return cell.square;
      }
    }
  }
  return null;
}

export default function Chessboard({ gameId }: ChessboardProps) {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [moveSquares, setMoveSquares] = useState<SquareStyles>({});
  const [checkSquare, setCheckSquare] = useState<Square | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingPromoMove, setPendingPromoMove] = useState<{ from: Square; to: Square } | null>(null);
  const pendingPromoRef = useRef<{ from: Square; to: Square } | null>(null);
  const prevFenRef = useRef<string | null>(null);

  // Reactive theme — update when data-theme attribute changes
  const [currentTheme, setCurrentTheme] = useState(
    () => document.documentElement.getAttribute('data-theme') ?? 'dark'
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setCurrentTheme(document.documentElement.getAttribute('data-theme') ?? 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Reactive piece style — update on settings change
  const [pieceStyle, setPieceStyle] = useState(
    () => localStorage.getItem('genius_pieces') ?? 'standard'
  );
  useEffect(() => {
    const handler = () => setPieceStyle(localStorage.getItem('genius_pieces') ?? 'standard');
    window.addEventListener('genius:settings-changed', handler);
    return () => window.removeEventListener('genius:settings-changed', handler);
  }, []);

  const gameState = useAppSelector((s) => s.game.currentGame);
  const playerColor = useAppSelector((s) => s.game.playerColor);
  const isMyTurn = gameState?.turn === playerColor;

  useEffect(() => {
    if (!gameState) return;
    const fen = gameState.fen;
    if (prevFenRef.current === null) { prevFenRef.current = fen; return; }
    if (prevFenRef.current === fen) return;
    prevFenRef.current = fen;

    const chess = new Chess(fen);
    if (chess.isCheckmate()) {
      const loserColor = chess.turn();
      const kingSq = findKingSquare(chess, loserColor);
      setCheckSquare(kingSq);
      setToast(playerColor === (loserColor === 'w' ? 'b' : 'w') ? '♟ Шах і мат — ви виграли!' : '♟ Шах і мат');
    } else if (chess.isDraw()) {
      setCheckSquare(null);
      setToast('🤝 Нічия');
    } else if (chess.isCheck()) {
      const inCheckColor = chess.turn();
      const kingSq = findKingSquare(chess, inCheckColor);
      setCheckSquare(kingSq);
      setToast('⚠️ Шах!');
    } else {
      setCheckSquare(null);
    }
  }, [gameState?.fen, playerColor]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  const isPromotionMove = useCallback(
    (from: Square, to: Square): boolean => {
      if (!gameState) return false;
      const chess = new Chess(gameState.fen);
      const piece = chess.get(from);
      if (!piece || piece.type !== 'p') return false;
      return (piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1');
    },
    [gameState],
  );

  const emitPromotion = useCallback(
    (from: Square, to: Square, piece: 'q' | 'r' | 'b' | 'n') => {
      getSocket().emit('move', { gameId, from, to, promotion: piece });
      setPendingPromoMove(null);
      pendingPromoRef.current = null;
      setSelectedSquare(null);
      setMoveSquares({});
    },
    [gameId],
  );

  const handleSquareClick = useCallback(
    (square: Square) => {
      if (!isMyTurn || !gameState) return;

      if (selectedSquare) {
        if (isPromotionMove(selectedSquare, square)) {
          setPendingPromoMove({ from: selectedSquare, to: square });
          setSelectedSquare(null);
          setMoveSquares({});
        } else {
          getSocket().emit('move', { gameId, from: selectedSquare, to: square });
          setSelectedSquare(null);
          setMoveSquares({});
        }
      } else {
        setSelectedSquare(square);
        const chess = new Chess(gameState.fen);
        const moves = chess.moves({ square, verbose: true });
        const highlights: SquareStyles = {};

        const normalGradient =
          currentTheme === 'light'
            ? 'radial-gradient(circle, rgba(180,0,0,0.5) 25%, transparent 25%)'
            : currentTheme === 'classic'
            ? 'radial-gradient(circle, rgba(0,80,0,0.6) 25%, transparent 25%)'
            : 'radial-gradient(circle, rgba(80,80,80,0.7) 25%, transparent 25%)';

        const captureOutlineColor =
          currentTheme === 'light' ? 'rgba(180,0,0,0.8)'
          : currentTheme === 'classic' ? 'rgba(0,100,0,0.8)'
          : 'rgba(120,120,120,0.9)';

        moves.forEach((m) => {
          const isCapture = m.flags.includes('c') || m.flags.includes('e');
          const isCastle = m.flags.includes('k') || m.flags.includes('q');
          if (isCastle) {
            highlights[m.to] = { backgroundColor: 'rgba(0, 100, 200, 0.4)' };
          } else if (isCapture) {
            highlights[m.to] = { outline: `3px solid ${captureOutlineColor}`, outlineOffset: '-3px' };
          } else {
            highlights[m.to] = { background: normalGradient };
          }
        });
        setMoveSquares(highlights);
      }
    },
    [isMyTurn, selectedSquare, gameId, gameState, isPromotionMove, currentTheme],
  );

  const handlePieceDrop = useCallback(
    (sourceSquare: Square, targetSquare: Square) => {
      if (!isMyTurn) return false;
      if (isPromotionMove(sourceSquare, targetSquare)) {
        pendingPromoRef.current = { from: sourceSquare, to: targetSquare };
        setSelectedSquare(null);
        setMoveSquares({});
        return true;
      }
      getSocket().emit('move', { gameId, from: sourceSquare, to: targetSquare });
      setSelectedSquare(null);
      setMoveSquares({});
      return true;
    },
    [isMyTurn, gameId, isPromotionMove],
  );

  const handlePromotionPieceSelect = useCallback(
    (piece?: string, from?: Square, to?: Square): boolean => {
      const pending = pendingPromoRef.current;
      const sourceSquare = from ?? pending?.from;
      const targetSquare = to ?? pending?.to;
      pendingPromoRef.current = null;
      if (!sourceSquare || !targetSquare) return false;
      const promotion = piece ? ((piece[1]?.toLowerCase() ?? 'q') as 'q' | 'r' | 'b' | 'n') : 'q';
      getSocket().emit('move', { gameId, from: sourceSquare, to: targetSquare, promotion });
      setSelectedSquare(null);
      setMoveSquares({});
      return true;
    },
    [gameId],
  );

  if (!gameState) return null;

  const lastMove = gameState.moves.at(-1) ?? null;
  const checkStyles: SquareStyles = checkSquare
    ? { [checkSquare]: { backgroundColor: 'rgba(220, 38, 38, 0.7)' } }
    : {};

  const customPieces =
    pieceStyle === 'minimalist' ? PIECE_SETS.minimalist :
    pieceStyle === 'classic' ? PIECE_SETS.classic :
    undefined;

  return (
    <div style={{ position: 'relative', width: 'min(90vmin, 600px)', aspectRatio: '1' }}>
      <div style={{ width: '100%', height: '100%', colorScheme: 'light' }}>
        <ReactChessboard
          position={gameState.fen}
          boardOrientation={playerColor === 'b' ? 'black' : 'white'}
          onSquareClick={handleSquareClick}
          onPieceDrop={handlePieceDrop}
          onPromotionPieceSelect={handlePromotionPieceSelect}
          arePiecesDraggable={isMyTurn}
          customPieces={customPieces}
          customSquareStyles={{
            ...checkStyles,
            ...(lastMove ? {
              [lastMove.from]: { backgroundColor: 'rgba(255, 255, 0, 0.3)' },
              [lastMove.to]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' },
            } : {}),
            ...moveSquares,
            ...(selectedSquare ? { [selectedSquare]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' } } : {}),
          }}
          customBoardStyle={{
            borderRadius: '4px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          }}
          customDarkSquareStyle={{ backgroundColor: '#b58863' }}
          customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
        />
      </div>

      {/* ── Promotion dialog (click-to-move path) ──────────────────── */}
      {pendingPromoMove && (
        <div
          style={{
            position: 'absolute', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.72)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 20, borderRadius: '4px',
          }}
          onClick={() => setPendingPromoMove(null)}
        >
          <div
            style={{
              backgroundColor: '#1e293b', borderRadius: '12px',
              padding: '16px 20px', display: 'flex', flexDirection: 'column',
              gap: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', margin: 0 }}>
              Обери фігуру
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              {PROMO_PIECES.map(({ piece, whiteSymbol, blackSymbol, label }) => (
                <button
                  key={piece}
                  title={label}
                  onClick={() => emitPromotion(pendingPromoMove.from, pendingPromoMove.to, piece)}
                  style={{
                    width: '56px', height: '56px', fontSize: '32px',
                    backgroundColor: '#334155', border: '2px solid #475569',
                    borderRadius: '8px', cursor: 'pointer', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0ea5e9';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#38bdf8';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#334155';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#475569';
                  }}
                >
                  {playerColor === 'b' ? blackSymbol : whiteSymbol}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0,0,0,0.82)', color: '#fff',
            padding: '10px 22px', borderRadius: '8px',
            fontSize: '16px', fontWeight: 600,
            pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 10,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
