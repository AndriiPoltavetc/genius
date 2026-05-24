import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

import { getSocket } from '../game/socket';
import { useAppSelector } from '../../app/hooks';
import ConfirmModal from '../../components/ui/ConfirmModal';
import SettingsPanel from '../../components/SettingsPanel';
import CheckersBoard from './CheckersBoard';
import type { Board, Color, CheckersMove } from './CheckersBoard';
import type { CheckersBoardState } from '../../shared-types';

interface CheckersGamePageProps {
  mode: 'ai' | 'online';
}

export default function CheckersGamePage({ mode }: CheckersGamePageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const user = useAppSelector((s) => s.auth.user);
  // Pre-loaded game data passed from LobbyPage inline matchmaking
  const preloadedGame = (location.state as { gameData?: { gameId: string; playerColor: string; state: CheckersBoardState } } | null)?.gameData;

  const difficulty = (searchParams.get('difficulty') ?? 'medium') as 'easy' | 'medium' | 'hard';

  const [gameId, setGameId] = useState<string | null>(null);
  const [playerColor, setPlayerColor] = useState<Color>('white');
  const [state, setState] = useState<CheckersBoardState | null>(null);
  const [showResignModal, setShowResignModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [boardWidth, setBoardWidth] = useState(() => Math.min(window.innerWidth - 16, 560));
  const [isSearching, setIsSearching] = useState(mode === 'online');
  const [gameOver, setGameOver] = useState<{ winner: Color | 'draw'; reason?: string } | null>(null);

  // Move history for display
  const [moveHistory, setMoveHistory] = useState<Array<{ moveNum: number; color: Color; from: string; to: string }>>([]);
  const moveHistoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    moveHistoryRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [moveHistory.length]);

  useEffect(() => {
    const updateSize = () => setBoardWidth(Math.min(window.innerWidth - 16, 560));
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const socket = getSocket();

    if (mode === 'ai') {
      socket.emit('checkers:startAi', { difficulty, color: 'white' });
    } else if (preloadedGame) {
      setGameId(preloadedGame.gameId);
      setPlayerColor(preloadedGame.playerColor as Color);
      setState(preloadedGame.state);
      setIsSearching(false);
    } else {
      socket.emit('checkers:joinQueue');
    }

    socket.on('checkers:started', (data) => {
      setGameId(data.gameId);
      setPlayerColor(data.playerColor as Color);
      setState(data.state);
      setIsSearching(false);
    });

    socket.on('checkers:state', (data) => {
      setState((prev) => {
        if (prev && data.lastMove) {
          const color: Color = data.moveCount % 2 === 0 ? 'black' : 'white';
          const rc = (sq: [number, number]) => `${String.fromCharCode(97 + sq[1])}${8 - sq[0]}`;
          setMoveHistory((h) => [
            ...h,
            { moveNum: data.moveCount, color, from: rc(data.lastMove!.from), to: rc(data.lastMove!.to) },
          ]);
        }
        return data;
      });
    });

    socket.on('checkers:over', (data) => {
      setGameOver({ winner: data.winner as Color | 'draw', reason: data.reason });
    });

    socket.on('checkers:error', (data) => {
      console.warn('Checkers error:', data.message);
    });

    socket.on('checkers:queueJoined', () => {
      setIsSearching(true);
    });

    socket.on('checkers:opponentDisconnected', () => {
      setGameOver({ winner: playerColor, reason: 'Суперник відключився' });
    });

    return () => {
      socket.off('checkers:started');
      socket.off('checkers:state');
      socket.off('checkers:over');
      socket.off('checkers:error');
      socket.off('checkers:queueJoined');
      socket.off('checkers:opponentDisconnected');
    };
  }, [mode, difficulty]);

  const handleMove = useCallback(
    (move: CheckersMove) => {
      if (!gameId) return;
      const socket = getSocket();
      socket.emit('checkers:move', { gameId, move });
    },
    [gameId],
  );

  const handleResign = () => {
    if (!gameId) return;
    setShowResignModal(false);
    getSocket().emit('checkers:resign', { gameId });
  };

  const handleCancelSearch = () => {
    getSocket().emit('checkers:leaveQueue');
    void navigate('/lobby?game=checkers');
  };

  // ── Searching UI ───────────────────────────────────────────────────────
  if (isSearching) {
    return (
      <div className="h-screen bg-gray-950 flex flex-col items-center justify-center gap-6">
        <motion.div
          className="text-6xl"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
        >
          🔴
        </motion.div>
        <p className="text-white text-lg font-semibold">Шукаємо суперника...</p>
        <button onClick={handleCancelSearch} className="btn-secondary">
          Скасувати
        </button>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Завантаження...</p>
      </div>
    );
  }

  const isMyTurn = state.turn === playerColor && !state.isOver && !gameOver;
  const opponentLabel = mode === 'ai' ? `AI (${difficulty.toUpperCase()})` : 'Суперник';

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowSettings(false)}
        >
          <div
            className="w-72 bg-gray-900 border-l border-gray-800 h-full overflow-y-auto shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <h2 className="font-semibold text-white">Налаштування</h2>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white text-lg leading-none">✕</button>
            </div>
            <SettingsPanel />
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showResignModal}
        title="Здатися?"
        message="Ви впевнені, що хочете здатися?"
        confirmText="Здатися"
        cancelText="Скасувати"
        onConfirm={handleResign}
        onCancel={() => setShowResignModal(false)}
        variant="danger"
      />

      {/* Game over overlay */}
      {gameOver && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)',
          zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div className="card text-center p-8 max-w-sm w-full mx-4">
            <p className="text-3xl mb-3">
              {gameOver.winner === 'draw'
                ? '🤝 Нічия'
                : gameOver.winner === playerColor
                ? '🏆 Перемога!'
                : '😢 Поразка'}
            </p>
            {gameOver.reason && <p className="text-gray-400 text-sm mb-4">{gameOver.reason}</p>}
            <button onClick={() => void navigate('/lobby?game=checkers')} className="btn-primary w-full">
              До лобі
            </button>
          </div>
        </div>
      )}

      {/* TopBar */}
      <div className="flex items-center px-3 py-2 bg-gray-900 border-b border-gray-800 flex-shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: playerColor === 'black' ? '#1a1a1a' : '#f0f0f0', border: '2px solid #888' }}
          />
          <span className="font-semibold text-white text-sm truncate">{opponentLabel}</span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowPanel((p) => !p)}
            className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 text-white text-sm transition-colors"
            title="Ходи"
          >
            📋
          </button>
          <button
            onClick={() => setShowSettings((p) => !p)}
            className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 text-white text-sm transition-colors"
            title="Налаштування"
          >
            ⚙️
          </button>
          <button
            onClick={() => setShowResignModal(true)}
            disabled={!!gameOver || state.isOver}
            className="px-3 py-1 rounded bg-red-800 hover:bg-red-700 text-white text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Здатися
          </button>
          <div className="flex items-center gap-2 pl-2 border-l border-gray-700">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: playerColor === 'white' ? '#f0f0f0' : '#1a1a1a', border: '2px solid #888' }}
            />
            <span className="font-semibold text-white text-sm">{user?.username}</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Board */}
        <div className="flex flex-col items-center justify-center flex-1 p-2 md:p-4 min-w-0">
          <div className={`mb-3 text-sm font-semibold px-3 py-1 rounded-full ${
            isMyTurn ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400'
          }`}>
            {gameOver
              ? (gameOver.winner === 'draw' ? 'Нічия' : gameOver.winner === playerColor ? 'Ви виграли!' : 'Ви програли')
              : isMyTurn ? 'Ваш хід' : 'Хід суперника...'}
          </div>

          <CheckersBoard
            board={state.board as Board}
            playerColor={playerColor}
            turn={state.turn as Color}
            validMoves={state.isOver || !!gameOver ? [] : state.validMoves}
            lastMove={state.lastMove}
            isGameOver={state.isOver || !!gameOver}
            onMove={handleMove}
            size={boardWidth}
          />
        </div>

        {/* Side panel: move history */}
        {showPanel && (
          <div className="flex flex-col bg-gray-900 border-t md:border-t-0 md:border-l border-gray-800 flex-shrink-0 overflow-hidden w-full md:w-[200px] max-h-40 md:max-h-none">
            <div className="px-3 py-2 border-b border-gray-800 flex-shrink-0">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ходи</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 font-mono text-xs">
              {moveHistory.length === 0 && (
                <p className="text-gray-500 text-center mt-4">Ходів ще немає</p>
              )}
              <table className="w-full">
                <tbody>
                  {Array.from({ length: Math.ceil(moveHistory.length / 2) }, (_, i) => {
                    const white = moveHistory[i * 2];
                    const black = moveHistory[i * 2 + 1];
                    return (
                      <tr key={i} className="hover:bg-gray-800">
                        <td className="text-gray-500 pr-1 text-right w-6">{i + 1}.</td>
                        <td className="text-white px-1 py-0.5">{white ? `${white.from}→${white.to}` : ''}</td>
                        <td className="text-white px-1 py-0.5">{black ? `${black.from}→${black.to}` : ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div ref={moveHistoryRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
