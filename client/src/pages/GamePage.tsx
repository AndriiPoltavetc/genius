import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Chessboard from '../features/game/components/Chessboard';
import MoveHistory from '../features/game/components/MoveHistory';
import Timer from '../features/game/components/Timer';
import ChatBox from '../features/game/components/ChatBox';
import ConfirmModal from '../components/ui/ConfirmModal';
import { getSocket } from '../features/game/socket';
import { moveMade, gameEnded } from '../features/game/gameSlice';
import { useAppDispatch, useAppSelector } from '../app/hooks';

export default function GamePage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const gameState = useAppSelector((s) => s.game.currentGame);
  const playerColor = useAppSelector((s) => s.game.playerColor);
  const opponentUsername = useAppSelector((s) => s.game.opponentUsername);
  const opponentRating = useAppSelector((s) => s.game.opponentRating);
  const gameEndResult = useAppSelector((s) => s.game.gameEndResult);
  const user = useAppSelector((s) => s.auth.user);

  const [showResignModal, setShowResignModal] = useState(false);

  useEffect(() => {
    if (!gameState) void navigate('/lobby');
  }, [gameState, navigate]);

  useEffect(() => {
    const socket = getSocket();

    socket.on('move', ({ gameState: newState }) => {
      dispatch(moveMade(newState));
    });

    socket.on('gameEnd', ({ result, resultReason, ratingChange }) => {
      dispatch(gameEnded({ result, resultReason, ratingDelta: ratingChange?.delta }));
    });

    return () => {
      socket.off('move');
      socket.off('gameEnd');
    };
  }, [dispatch]);

  if (!gameState) return null;

  const isMyTurn = gameState.turn === playerColor;
  const myTimeMs = playerColor === 'w' ? gameState.whiteTimeMs : gameState.blackTimeMs;
  const oppTimeMs = playerColor === 'w' ? gameState.blackTimeMs : gameState.whiteTimeMs;

  const handleResignConfirm = () => {
    setShowResignModal(false);
    getSocket().emit('resign');
  };

  const handleDrawOffer = () => {
    getSocket().emit('drawOffer');
  };

  return (
    <div className="h-screen bg-gray-950 flex overflow-hidden">
      <ConfirmModal
        isOpen={showResignModal}
        title="Здатися?"
        message="Ви впевнені, що хочете здатися? Це зарахується як поразка."
        confirmText="Здатися"
        cancelText="Скасувати"
        onConfirm={handleResignConfirm}
        onCancel={() => setShowResignModal(false)}
        variant="danger"
      />

      {/* Left column — board (60%) */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 min-w-0">
        {/* Opponent info + timer */}
        <div className="flex justify-between items-center bg-gray-900 rounded-lg p-3 w-full" style={{ maxWidth: 'min(55vw, 600px)' }}>
          <div>
            <p className="font-semibold text-white">{opponentUsername}</p>
            {opponentRating && <p className="text-gray-400 text-sm">{opponentRating} ELO</p>}
          </div>
          <Timer initialMs={oppTimeMs} isActive={!isMyTurn && !gameState.isGameOver} />
        </div>

        <Chessboard gameId={gameState.id} />

        {/* My info + timer */}
        <div className="flex justify-between items-center bg-gray-900 rounded-lg p-3 w-full" style={{ maxWidth: 'min(55vw, 600px)' }}>
          <div>
            <p className="font-semibold text-white">{user?.username}</p>
            <p className="text-gray-400 text-sm">{user?.rating} ELO</p>
          </div>
          <Timer initialMs={myTimeMs} isActive={isMyTurn && !gameState.isGameOver} />
        </div>
      </div>

      {/* Right column — sidebar (40%) */}
      <div className="w-80 flex flex-col gap-4 p-4 border-l border-gray-800 overflow-y-auto flex-shrink-0">
        <MoveHistory moves={gameState.moves} />

        {!gameState.isAiGame && <ChatBox gameId={gameState.id} />}

        <div className="flex gap-2">
          <button onClick={() => setShowResignModal(true)} className="btn-secondary flex-1 text-sm">
            Здатися
          </button>
          {!gameState.isAiGame && (
            <button onClick={handleDrawOffer} className="btn-secondary flex-1 text-sm">
              Нічия
            </button>
          )}
        </div>

        {gameEndResult && (
          <div className="card text-center">
            <p className="text-2xl mb-2">
              {gameEndResult.result === 'WHITE_WIN'
                ? playerColor === 'w' ? '🏆 Перемога!' : '😢 Поразка'
                : gameEndResult.result === 'BLACK_WIN'
                ? playerColor === 'b' ? '🏆 Перемога!' : '😢 Поразка'
                : '🤝 Нічия'}
            </p>
            <p className="text-gray-400 text-sm">{gameEndResult.resultReason}</p>
            {gameEndResult.ratingDelta !== undefined && (
              <p className={`text-lg font-bold ${gameEndResult.ratingDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {gameEndResult.ratingDelta >= 0 ? '+' : ''}{gameEndResult.ratingDelta} ELO
              </p>
            )}
            <button onClick={() => void navigate('/lobby')} className="btn-primary mt-3 w-full">
              До лобі
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
