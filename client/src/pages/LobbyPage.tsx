import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

import { getSocket } from '../features/game/socket';
import { gameStarted, searchStarted, searchCancelled } from '../features/game/gameSlice';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { logout, updateUser } from '../features/auth/authSlice';
import { useGetUserByIdQuery } from '../features/auth/authApi';
import type { AiLevel } from '../shared-types';

const AI_LEVELS: { level: AiLevel; label: string; description: string; depth: number }[] = [
  { level: 'EASY', label: '🟢 Легкий', description: 'Випадкові помилки', depth: 1 },
  { level: 'MEDIUM', label: '🟡 Середній', description: 'Стандартний', depth: 2 },
  { level: 'HARD', label: '🔴 Важкий', description: 'Сильний', depth: 3 },
];

export default function LobbyPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isSearching = useAppSelector((s) => s.game.isSearching);
  const user = useAppSelector((s) => s.auth.user);

  // Fetch fresh profile data and sync to store
  const { data: profileData } = useGetUserByIdQuery(user?.id ?? '', { skip: !user?.id });
  useEffect(() => {
    if (profileData) dispatch(updateUser(profileData));
  }, [profileData, dispatch]);

  // Single source of truth: fresh data when available, cached otherwise
  const profile = profileData ?? user;
  const winRate = profile && profile.gamesPlayed > 0
    ? Math.round((profile.gamesWon / profile.gamesPlayed) * 100)
    : 0;

  const handleLogout = () => {
    dispatch(logout());
    void navigate('/login');
  };

  const startAiGame = (level: AiLevel) => {
    const socket = getSocket();
    socket.off('gameStart');
    socket.once('gameStart', (payload) => {
      dispatch(gameStarted({
        gameState: payload.gameState,
        playerColor: payload.playerColor,
        opponentUsername: `AI (${level})`,
      }));
      void navigate(`/game/${payload.gameId}`);
    });
    socket.emit('startAiGame', { level });
  };

  const searchGame = () => {
    const socket = getSocket();
    socket.off('gameStart');
    dispatch(searchStarted());
    const colorPreference = (localStorage.getItem('genius_color_pref') ?? 'any') as 'white' | 'black' | 'any';
    socket.emit('joinQueue', { colorPreference });
    socket.once('gameStart', (payload) => {
      dispatch(gameStarted({
        gameState: payload.gameState,
        playerColor: payload.playerColor,
        opponentUsername: payload.opponent?.username,
        opponentRating: payload.opponent?.rating,
      }));
      void navigate(`/game/${payload.gameId}`);
    });
  };

  const cancelSearch = () => {
    getSocket().emit('leaveQueue');
    dispatch(searchCancelled());
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <span className="text-2xl font-bold text-primary-400 tracking-tight">Genius</span>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-semibold text-white leading-tight">{user?.username}</p>
            <p className="text-sm font-bold text-primary-400 leading-tight">{user?.rating} ELO</p>
          </div>
          <button onClick={handleLogout} className="btn-secondary text-sm px-3 py-1.5">
            Вийти
          </button>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
        <div className="grid md:grid-cols-2 gap-6">

          {/* ── LEFT column: game modes ──────────────────────────────── */}
          <div className="space-y-4">
            {/* Online Game */}
            <div className="card">
              <h2 className="text-xl font-bold text-white mb-2">⚡ Гра онлайн</h2>
              <p className="text-gray-400 text-sm mb-4">
                Матчмейкінг за рейтингом ELO. Часовий контроль 10+0.
              </p>
              {isSearching ? (
                <div className="text-center">
                  <motion.div
                    className="text-4xl mb-3"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  >
                    ♟
                  </motion.div>
                  <p className="text-gray-400 mb-3 text-sm">Шукаємо суперника...</p>
                  <button onClick={cancelSearch} className="btn-secondary w-full text-sm">
                    Скасувати
                  </button>
                </div>
              ) : (
                <motion.button
                  onClick={searchGame}
                  className="btn-primary w-full py-3 text-base"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  🔍 Знайти гру
                </motion.button>
              )}
            </div>

            {/* AI Game */}
            <div className="card">
              <h2 className="text-xl font-bold text-white mb-2">🤖 Гра проти ШІ</h2>
              <p className="text-gray-400 text-sm mb-4">
                Minimax + Alpha-Beta, три рівні. Не впливає на рейтинг.
              </p>
              <div className="space-y-2">
                {AI_LEVELS.map(({ level, label, description, depth }) => (
                  <motion.button
                    key={level}
                    onClick={() => startAiGame(level)}
                    className="btn-secondary w-full text-left flex justify-between items-center"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span>{label}</span>
                    <span className="text-gray-400 text-xs">{description} · глибина {depth}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT column: profile ────────────────────────────────── */}
          <div className="card flex flex-col gap-4">
            {/* Avatar + name */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
                {profile?.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{profile?.username}</h2>
                <p className="text-sm text-gray-400">
                  Зареєстрований:{' '}
                  {profile?.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString('uk-UA')
                    : '—'}
                </p>
                <p className="text-primary-400 font-bold text-lg">{profile?.rating} ELO</p>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Партій', value: profile?.gamesPlayed ?? 0 },
                { label: 'Перемог', value: profile?.gamesWon ?? 0 },
                { label: 'Поразок', value: profile?.gamesLost ?? 0 },
                { label: 'Нічиїх', value: profile?.gamesDrawn ?? 0 },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-800 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-white">{value}</p>
                  <p className="text-xs text-gray-400">{label}</p>
                </div>
              ))}
            </div>

            {/* Win rate bar */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Відсоток перемог</span>
                <span className="font-bold text-white">{winRate}%</span>
              </div>
              <div className="bg-gray-800 rounded-full h-2.5">
                <div
                  className="bg-primary-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${winRate}%` }}
                />
              </div>
            </div>

            {/* Links */}
            <div className="flex gap-4 pt-2 border-t border-gray-800">
              <Link
                to="/history"
                className="text-primary-400 hover:underline text-sm font-medium"
              >
                📋 Моя історія
              </Link>
              <Link
                to="/leaderboard"
                className="text-primary-400 hover:underline text-sm font-medium"
              >
                🏆 Лідерборд
              </Link>
              <Link
                to={`/profile/${user?.id ?? ''}`}
                className="text-gray-500 hover:text-gray-400 text-sm"
              >
                Повний профіль
              </Link>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
