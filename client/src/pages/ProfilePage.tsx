import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import type { UserPublic } from '../shared-types';
import Header from '../components/Header';
import { useAppSelector, useAppDispatch } from '../app/hooks';
import { updateUser } from '../features/auth/authSlice';

// ── Public profile view ────────────────────────────────────────────────────
function PublicProfileView({ userId }: { userId: string }) {
  const [user, setUser] = useState<UserPublic | null>(null);

  useEffect(() => {
    void fetch(`${import.meta.env['VITE_API_URL'] as string}/api/users/${userId}`)
      .then((r) => r.json())
      .then((data: UserPublic) => setUser(data));
  }, [userId]);

  if (!user) return <div className="flex-1 flex items-center justify-center text-gray-400">Завантаження...</div>;

  const winRate = user.gamesPlayed > 0 ? Math.round((user.gamesWon / user.gamesPlayed) * 100) : 0;

  return (
    <div className="flex-1 px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center text-2xl font-bold text-white">
              {user.username[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{user.username}</h1>
              <p className="text-gray-400 text-sm">
                Зареєстрований: {new Date(user.createdAt).toLocaleDateString('uk-UA')}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-3xl font-bold text-primary-400">{user.rating}</p>
              <p className="text-gray-400 text-sm">ELO</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Партій', value: user.gamesPlayed },
            { label: 'Перемог', value: user.gamesWon },
            { label: 'Поразок', value: user.gamesLost },
            { label: 'Нічиїх', value: user.gamesDrawn },
          ].map(({ label, value }) => (
            <div key={label} className="card text-center">
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-gray-400 text-sm">{label}</p>
            </div>
          ))}
        </div>

        <div className="card">
          <p className="text-gray-400 text-sm mb-1">Відсоток перемог</p>
          <div className="bg-gray-800 rounded-full h-3">
            <div className="bg-primary-500 h-3 rounded-full transition-all" style={{ width: `${winRate}%` }} />
          </div>
          <p className="text-white font-bold mt-1">{winRate}%</p>
        </div>

        {user.aiStats && (
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Статистика проти ШІ</h3>
            <div className="grid grid-cols-3 gap-3">
              {([
                { label: 'Легкий', stats: user.aiStats.easy },
                { label: 'Середній', stats: user.aiStats.medium },
                { label: 'Важкий', stats: user.aiStats.hard },
              ] as const).map(({ label, stats }) => (
                <div key={label} className="bg-gray-800 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">{label}</p>
                  <p className="text-lg font-bold text-white">{stats.played}</p>
                  <p className="text-xs text-gray-500">{stats.wins} пер.</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Own settings view ──────────────────────────────────────────────────────
const COLOR_PREFS = [
  { id: 'any', label: 'Без різниці' },
  { id: 'white', label: 'Білі' },
  { id: 'black', label: 'Чорні' },
];

function OwnSettingsView() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const token = useAppSelector((s) => s.auth.accessToken);

  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState(user?.username ?? '');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSaving, setUsernameSaving] = useState(false);

  const [colorPref, setColorPref] = useState(() => localStorage.getItem('genius_color_pref') ?? 'any');

  const applyColorPref = (c: string) => {
    setColorPref(c);
    localStorage.setItem('genius_color_pref', c);
  };

  const saveUsername = async () => {
    const trimmed = usernameInput.trim();
    if (trimmed.length < 2 || trimmed.length > 20) {
      setUsernameError('Нікнейм 2–20 символів');
      return;
    }
    setUsernameError(null);
    setUsernameSaving(true);
    try {
      const res = await fetch(`${import.meta.env['VITE_API_URL'] as string}/api/users/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token ?? ''}`,
        },
        body: JSON.stringify({ username: trimmed }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        setUsernameError(body.error ?? 'Помилка збереження');
        return;
      }
      const body = await res.json() as { username: string };
      if (user) dispatch(updateUser({ ...user, username: body.username }));
      setEditingUsername(false);
    } catch {
      setUsernameError('Помилка мережі');
    } finally {
      setUsernameSaving(false);
    }
  };

  return (
    <div className="flex-1 px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Section 1 — Basic info */}
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Основна інформація</h2>

          {editingUsername ? (
            <div className="space-y-2">
              <input
                className="input-field"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void saveUsername(); if (e.key === 'Escape') setEditingUsername(false); }}
                autoFocus
                maxLength={20}
              />
              {usernameError && <p className="text-red-400 text-sm">{usernameError}</p>}
              <div className="flex gap-2">
                <button onClick={() => void saveUsername()} disabled={usernameSaving} className="btn-primary text-sm px-3 py-1.5">
                  {usernameSaving ? 'Збереження...' : 'Зберегти'}
                </button>
                <button onClick={() => { setEditingUsername(false); setUsernameError(null); setUsernameInput(user?.username ?? ''); }} className="btn-secondary text-sm px-3 py-1.5">
                  Скасувати
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Нікнейм</p>
                <p className="text-white font-semibold text-lg">{user?.username}</p>
              </div>
              <button onClick={() => { setEditingUsername(true); setUsernameInput(user?.username ?? ''); }} className="btn-secondary text-sm px-3 py-1.5">
                Змінити
              </button>
            </div>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-gray-800">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Рейтинг</p>
              <p className="text-primary-400 font-bold text-lg">{user?.rating} ELO</p>
            </div>
          </div>
        </div>

        {/* Section 2 — Game preferences */}
        <div className="card space-y-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Уподобання гри</h2>

          <section>
            <h3 className="text-xs font-semibold text-gray-400 mb-3">Колір в онлайн матчі</h3>
            <div className="space-y-2">
              {COLOR_PREFS.map((c) => (
                <label key={c.id} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="color-pref"
                    value={c.id}
                    checked={colorPref === c.id}
                    onChange={() => applyColorPref(c.id)}
                    className="accent-primary-500"
                  />
                  <span className="text-white text-sm group-hover:text-primary-300 transition-colors">{c.label}</span>
                </label>
              ))}
            </div>
          </section>

        </div>

      </div>
    </div>
  );
}

// ── Page root ──────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const currentUser = useAppSelector((s) => s.auth.user);
  const isOwn = !!userId && userId === currentUser?.id;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Header title={isOwn ? 'Налаштування профілю' : 'Профіль'} showBack />
      {isOwn
        ? <OwnSettingsView />
        : <PublicProfileView userId={userId ?? ''} />}
    </div>
  );
}
