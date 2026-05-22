import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SettingsPanel from '../components/SettingsPanel';
import { motion } from 'framer-motion';

import { getSocket } from '../features/game/socket';
import { gameStarted, searchStarted, searchCancelled } from '../features/game/gameSlice';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { logout, updateUser } from '../features/auth/authSlice';
import { useGetUserByIdQuery } from '../features/auth/authApi';
import type { AiLevel, LeaderboardEntry } from '../shared-types';

const AI_LEVELS: { level: AiLevel; label: string; description: string; depth: number }[] = [
  { level: 'EASY', label: '🟢 Легкий', description: 'Випадкові помилки', depth: 1 },
  { level: 'MEDIUM', label: '🟡 Середній', description: 'Стандартний', depth: 2 },
  { level: 'HARD', label: '🔴 Важкий', description: 'Сильний', depth: 3 },
];

const TIME_OPTIONS: { label: string; seconds: number }[] = [
  { label: '3 хв', seconds: 3 * 60 },
  { label: '5 хв', seconds: 5 * 60 },
  { label: '10 хв', seconds: 10 * 60 },
  { label: '15 хв', seconds: 15 * 60 },
  { label: '30 хв', seconds: 30 * 60 },
  { label: '∞', seconds: 0 },
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

  const [showSettings, setShowSettings] = useState(false);
  const [pendingAiLevel, setPendingAiLevel] = useState<AiLevel | null>(null);

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);

  useEffect(() => {
    void fetch(`${import.meta.env['VITE_API_URL'] as string}/api/leaderboard`)
      .then((r) => r.json())
      .then((data: LeaderboardEntry[]) => {
        setLeaderboard(data.slice(0, 10));
        setLeaderboardLoading(false);
      })
      .catch(() => setLeaderboardLoading(false));
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    void navigate('/login');
  };

  const startAiGame = (level: AiLevel, timeLimitSeconds: number) => {
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
    socket.emit('startAiGame', { level, timeLimitSeconds });
    setPendingAiLevel(null);
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
      socket.emit('gameReady', { gameId: payload.gameId });
      void navigate(`/game/${payload.gameId}`);
    });
  };

  const cancelSearch = () => {
    getSocket().emit('leaveQueue');
    dispatch(searchCancelled());
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
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
      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <span className="text-2xl font-bold text-primary-400 tracking-tight">Genius</span>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-semibold text-white leading-tight">{user?.username}</p>
            <p className="text-sm font-bold text-primary-400 leading-tight">{user?.rating} ELO</p>
          </div>
          <button
            onClick={() => setShowSettings((p) => !p)}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors text-base leading-none"
            title="Налаштування"
          >
            ⚙️
          </button>
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

              {pendingAiLevel ? (
                <div>
                  <p className="text-sm text-gray-400 mb-3">
                    Рівень: <span className="font-semibold text-white">
                      {AI_LEVELS.find((l) => l.level === pendingAiLevel)?.label}
                    </span>. Оберіть час:
                  </p>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {TIME_OPTIONS.map(({ label, seconds }) => (
                      <motion.button
                        key={seconds}
                        onClick={() => startAiGame(pendingAiLevel, seconds)}
                        className="btn-primary text-sm py-2"
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                      >
                        {label}
                      </motion.button>
                    ))}
                  </div>
                  <button
                    onClick={() => setPendingAiLevel(null)}
                    className="btn-secondary w-full text-sm"
                  >
                    Скасувати
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {AI_LEVELS.map(({ level, label, description, depth }) => (
                    <motion.button
                      key={level}
                      onClick={() => setPendingAiLevel(level)}
                      className="btn-secondary w-full text-left flex justify-between items-center"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span>{label}</span>
                      <span className="text-gray-400 text-xs">{description} · глибина {depth}</span>
                    </motion.button>
                  ))}
                </div>
              )}
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

            {/* AI stats */}
            {profile?.aiStats && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Статистика проти ШІ</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { label: 'Легкий', stats: profile.aiStats.easy },
                    { label: 'Середній', stats: profile.aiStats.medium },
                    { label: 'Важкий', stats: profile.aiStats.hard },
                  ] as const).map(({ label, stats }) => (
                    <div key={label} className="bg-gray-800 rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{stats.played} ігор</p>
                      <p className="text-xs text-gray-500">{stats.wins} пер.</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            <div className="flex gap-4 pt-2 border-t border-gray-800">
              <Link
                to="/history"
                className="text-primary-400 hover:underline text-sm font-medium"
              >
                📋 Моя історія
              </Link>
              <button
                onClick={() => document.getElementById('leaderboard')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-primary-400 hover:underline text-sm font-medium bg-transparent border-none cursor-pointer p-0"
              >
                🏆 Лідерборд
              </button>
              <Link
                to={`/profile/${user?.id ?? ''}`}
                className="text-primary-400 hover:underline text-sm font-medium"
              >
                ⚙️ Налаштування
              </Link>
            </div>
          </div>

        </div>

        {/* ── Leaderboard section ───────────────────────────────────── */}
        <div id="leaderboard" className="mt-8">
          <h2 className="text-xl font-bold text-white mb-4">🏆 Лідерборд</h2>
          {leaderboardLoading ? (
            <p className="text-gray-400">Завантаження...</p>
          ) : leaderboard.length === 0 ? (
            <p className="text-gray-400">Немає даних.</p>
          ) : (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-400">#</th>
                    <th className="px-4 py-3 text-left text-gray-400">Гравець</th>
                    <th className="px-4 py-3 text-right text-gray-400">ELO</th>
                    <th className="px-4 py-3 text-right text-gray-400">Партій</th>
                    <th className="px-4 py-3 text-right text-gray-400">W%</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry) => (
                    <tr key={entry.userId} className="border-t border-gray-800 hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-gray-400">
                        {entry.rank <= 3 ? (['🥇', '🥈', '🥉'] as const)[entry.rank - 1] : entry.rank}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/profile/${entry.userId}`}
                          className="text-primary-400 hover:underline font-medium"
                        >
                          {entry.username}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-white">{entry.rating}</td>
                      <td className="px-4 py-3 text-right text-gray-400">{entry.gamesPlayed}</td>
                      <td className="px-4 py-3 text-right text-gray-400">{entry.winRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
