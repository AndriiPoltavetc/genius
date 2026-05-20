import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import type { LeaderboardEntry } from '@genius/shared';

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch(`${import.meta.env['VITE_API_URL'] as string}/api/leaderboard`)
      .then((r) => r.json())
      .then((data: LeaderboardEntry[]) => {
        setEntries(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">🏆 Топ-100 гравців</h1>

        {loading ? (
          <p className="text-gray-400">Завантаження...</p>
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
                {entries.map((entry) => (
                  <tr key={entry.userId} className="border-t border-gray-800 hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-gray-400">
                      {entry.rank <= 3 ? ['🥇','🥈','🥉'][entry.rank - 1] : entry.rank}
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
    </div>
  );
}
