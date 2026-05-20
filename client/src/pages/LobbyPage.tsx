import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

import { getSocket } from '../features/game/socket';
import { gameStarted, searchStarted, searchCancelled } from '../features/game/gameSlice';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import type { AiLevel } from '../shared-types';

const AI_LEVELS: { level: AiLevel; label: string; ratingRange: string; depth: number }[] = [
  { level: 'EASY', label: '🟢 Легкий', ratingRange: '800–1000 ELO', depth: 2 },
  { level: 'MEDIUM', label: '🟡 Середній', ratingRange: '1200–1400 ELO', depth: 3 },
  { level: 'HARD', label: '🔴 Важкий', ratingRange: '1500–1700 ELO', depth: 4 },
];

export default function LobbyPage() {
  useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isSearching = useAppSelector((s) => s.game.isSearching);
  const user = useAppSelector((s) => s.auth.user);

  const startAiGame = (level: AiLevel) => {
    const socket = getSocket();
    socket.once('gameStart', (payload) => {
      dispatch(
        gameStarted({
          gameState: payload.gameState,
          playerColor: payload.playerColor,
          opponentUsername: `AI (${level})`,
        }),
      );
      void navigate(`/game/${payload.gameId}`);
    });
    socket.emit('startAiGame', { level });
  };

  const searchGame = () => {
    const socket = getSocket();
    dispatch(searchStarted());
    socket.emit('joinQueue');

    socket.once('gameStart', (payload) => {
      dispatch(
        gameStarted({
          gameState: payload.gameState,
          playerColor: payload.playerColor,
          opponentUsername: payload.opponent?.username,
          opponentRating: payload.opponent?.rating,
        }),
      );
      void navigate(`/game/${payload.gameId}`);
    });
  };

  const cancelSearch = () => {
    getSocket().emit('leaveQueue');
    dispatch(searchCancelled());
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-8">
      <h1 className="text-4xl font-bold text-white mb-2">Вітаємо, {user?.username}!</h1>
      <p className="text-gray-400 mb-10">Рейтинг: {user?.rating} ELO</p>

      <div className="grid md:grid-cols-2 gap-6 w-full max-w-3xl">
        {/* AI Game */}
        <div className="card">
          <h2 className="text-xl font-bold text-white mb-4">🤖 Гра проти ШІ</h2>
          <p className="text-gray-400 text-sm mb-4">
            Minimax + Alpha-Beta, три рівні складності. Не впливає на рейтинг.
          </p>
          <div className="space-y-2">
            {AI_LEVELS.map(({ level, label, ratingRange, depth }) => (
              <motion.button
                key={level}
                onClick={() => startAiGame(level)}
                className="btn-secondary w-full text-left flex justify-between items-center"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span>{label}</span>
                <span className="text-gray-400 text-xs">
                  {ratingRange} · глибина {depth}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Online Matchmaking */}
        <div className="card">
          <h2 className="text-xl font-bold text-white mb-4">⚡ Гра онлайн</h2>
          <p className="text-gray-400 text-sm mb-4">
            Матчмейкінг за рейтингом ELO. Часовий контроль 10+0.
          </p>
          {isSearching ? (
            <div className="text-center">
              <motion.div
                className="text-4xl mb-4"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              >
                ♟
              </motion.div>
              <p className="text-gray-400 mb-4">Шукаємо суперника...</p>
              <button onClick={cancelSearch} className="btn-secondary w-full">
                Скасувати
              </button>
            </div>
          ) : (
            <motion.button
              onClick={searchGame}
              className="btn-primary w-full py-4 text-lg"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              🔍 Знайти гру
            </motion.button>
          )}
        </div>
      </div>

      <div className="flex gap-4 mt-8 text-sm">
        <a href="/history" className="text-primary-400 hover:underline">Моя історія</a>
        <a href="/leaderboard" className="text-primary-400 hover:underline">Лідерборд</a>
        <a href={`/profile/${user?.id ?? ''}`} className="text-primary-400 hover:underline">Профіль</a>
      </div>
    </div>
  );
}
