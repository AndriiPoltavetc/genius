import { useState, useCallback, useEffect, useRef } from 'react';
import { Chessboard as ReactChessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';

import { getSocket } from '../socket';
import { useAppSelector } from '../../../app/hooks';

interface ChessboardProps {
  gameId: string;
}

type SquareStyles = Record<string, { background?: string; borderRadius?: string; backgroundColor?: string }>;

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
  const prevFenRef = useRef<string | null>(null);
  const pendingPromoRef = useRef<{ from: Square; to: Square } | null>(null);

  const gameState = useAppSelector((s) => s.game.currentGame);
  const playerColor = useAppSelector((s) => s.game.playerColor);

  const isMyTurn = gameState?.turn === playerColor;

  useEffect(() => {
    if (!gameState) return;
    const fen = gameState.fen;
    if (prevFenRef.current === null) {
      prevFenRef.current = fen;
      return;
    }
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

  const handleSquareClick = useCallback(
    (square: Square) => {
      if (!isMyTurn || !gameState) return;

      if (selectedSquare) {
        if (isPromotionMove(selectedSquare, square)) {
          // Auto-promote to queen for click-to-move
          getSocket().emit('move', { gameId, from: selectedSquare, to: square, promotion: 'q' });
        } else {
          getSocket().emit('move', { gameId, from: selectedSquare, to: square });
        }
        setSelectedSquare(null);
        setMoveSquares({});
      } else {
        setSelectedSquare(square);
        const chess = new Chess(gameState.fen);
        const moves = chess.moves({ square, verbose: true });
        const highlights: SquareStyles = {};
        moves.forEach((m) => {
          highlights[m.to] = {
            background: 'radial-gradient(circle, #646f40 25%, transparent 25%)',
            borderRadius: '50%',
          };
        });
        setMoveSquares(highlights);
      }
    },
    [isMyTurn, selectedSquare, gameId, gameState, isPromotionMove],
  );

  const handlePieceDrop = useCallback(
    (sourceSquare: Square, targetSquare: Square) => {
      if (!isMyTurn) return false;
      if (isPromotionMove(sourceSquare, targetSquare)) {
        // Store the pending move; react-chessboard will show the promotion dialog
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

      // piece format from react-chessboard: 'wQ', 'bN', etc.
      const promotion = piece ? ((piece[1]?.toLowerCase() ?? 'q') as 'q' | 'r' | 'b' | 'n') : 'q';
      getSocket().emit('move', { gameId, from: sourceSquare, to: targetSquare, promotion });
      setSelectedSquare(null);
      setMoveSquares({});
      return true;
    },
    [gameId],
  );

  if (!gameState) return null;

  const checkStyles: SquareStyles = checkSquare
    ? { [checkSquare]: { backgroundColor: 'rgba(220, 38, 38, 0.7)' } }
    : {};

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
          customSquareStyles={{
            ...checkStyles,
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

      {toast && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0,0,0,0.82)',
            color: '#fff',
            padding: '10px 22px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 600,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 10,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
