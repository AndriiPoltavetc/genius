import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import type { UserPublic } from '@genius/shared';

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<UserPublic | null>(null);

  useEffect(() => {
    if (!userId) return;
    void fetch(`${import.meta.env['VITE_API_URL'] as string}/api/users/${userId}`)
      .then((r) => r.json())
      .then((data: UserPublic) => setUser(data));
  }, [userId]);

  if (!user) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Завантаження...</div>;

  const winRate = user.gamesPlayed > 0 ? Math.round((user.gamesWon / user.gamesPlayed) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="card mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center text-2xl font-bold text-white">
              {user.username[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{user.username}</h1>
              <p className="text-gray-400 text-sm">Зареєстрований: {new Date(user.createdAt).toLocaleDateString('uk-UA')}</p>
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

        <div className="card mt-4">
          <p className="text-gray-400 text-sm mb-1">Відсоток перемог</p>
          <div className="bg-gray-800 rounded-full h-3">
            <div
              className="bg-primary-500 h-3 rounded-full transition-all"
              style={{ width: `${winRate}%` }}
            />
          </div>
          <p className="text-white font-bold mt-1">{winRate}%</p>
        </div>
      </div>
    </div>
  );
}
