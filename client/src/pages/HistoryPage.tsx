import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';

import { useAppSelector } from '../app/hooks';
import type { GameResult } from '../shared-types';

interface GameHistoryItem {
  id: string;
  gameType?: string;
  result: GameResult;
  resultReason: string;
  isAiGame: boolean;
  startedAt: string;
  endedAt: string | null;
  whitePlayer?: { id: string; username: string; rating: number } | null;
  blackPlayer?: { id: string; username: string; rating: number } | null;
  whiteRatingBefore?: number | null;
  blackRatingBefore?: number | null;
  whiteRatingAfter?: number | null;
  blackRatingAfter?: number | null;
  _count: { moves: number };
}

export default function HistoryPage() {
  const user = useAppSelector((s) => s.auth.user);
  const token = useAppSelector((s) => s.auth.accessToken);
  const [activeTab, setActiveTab] = useState<'chess' | 'checkers'>('chess');
  const [games, setGames] = useState<GameHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const gameType = activeTab === 'checkers' ? 'CHECKERS' : 'CHESS';
    void fetch(
      `${import.meta.env['VITE_API_URL'] as string}/api/games/history?gameType=${gameType}`,
      { headers: { Authorization: `Bearer ${token ?? ''}` } },
    )
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: { games: GameHistoryItem[] }) => {
        setGames(data.games ?? []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        console.error('History fetch error:', err);
        setError('Не вдалося завантажити історію партій.');
        setLoading(false);
      });
  }, [token, activeTab]);

  const getResultLabel = (game: GameHistoryItem): { label: string; color: string } => {
    const isWhite = game.whitePlayer?.id === user?.id;
    const myResult =
      game.result === 'DRAW'
        ? 'draw'
        : (game.result === 'WHITE_WIN') === isWhite
        ? 'win'
        : 'loss';
    return {
      win: { label: 'Перемога', color: 'text-green-400' },
      loss: { label: 'Поразка', color: 'text-red-400' },
      draw: { label: 'Нічия', color: 'text-yellow-400' },
    }[myResult];
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Header title="Історія ігор" showBack />
      <div className="flex-1 px-4 py-8">
      <div className="max-w-3xl mx-auto">

        {/* Game type tabs */}
        <div className="flex rounded-lg overflow-hidden border border-gray-700 mb-6">
          {(['chess', 'checkers'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab ? 'btn-primary' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'chess' ? '♟ Шахи' : '🔴 Шашки'}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-400">Завантаження...</p>
        ) : error ? (
          <div className="card text-center">
            <p className="text-red-400 mb-3">{error}</p>
            <Link to="/lobby" className="btn-primary inline-block">До лобі</Link>
          </div>
        ) : games.length === 0 ? (
          <div className="card text-center">
            <p className="text-gray-400">
              {activeTab === 'checkers'
                ? 'Ви ще не зіграли жодної партії в шашки.'
                : 'Ви ще не зіграли жодної партії.'}
            </p>
            <Link
              to={`/lobby?game=${activeTab}`}
              className="btn-primary mt-4 inline-block"
            >
              Зіграти першу гру
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {games.map((game) => {
              const resultInfo = getResultLabel(game);
              const opponent =
                game.whitePlayer?.id === user?.id ? game.blackPlayer : game.whitePlayer;
              const myRatingBefore =
                game.whitePlayer?.id === user?.id ? game.whiteRatingBefore : game.blackRatingBefore;
              const myRatingAfter =
                game.whitePlayer?.id === user?.id ? game.whiteRatingAfter : game.blackRatingAfter;
              const ratingDelta =
                myRatingAfter != null && myRatingBefore != null
                  ? myRatingAfter - myRatingBefore
                  : null;

              const isCheckers = game.gameType === 'CHECKERS';
              const cardClass = "card flex items-center justify-between hover:border-primary-600 transition-colors";
              const inner = (
                <>
                  <div>
                    <span className={`font-bold ${resultInfo.color}`}>{resultInfo.label}</span>
                    <span className="text-gray-400 text-sm ml-2">({game.resultReason})</span>
                    <p className="text-gray-400 text-sm mt-1">
                      {game.isAiGame ? '🤖 Проти ШІ' : `vs ${opponent?.username ?? '?'}`}
                      {!isCheckers && <>{' · '}{game._count.moves} ходів</>}
                    </p>
                  </div>
                  <div className="text-right">
                    {ratingDelta !== null && !game.isAiGame && (
                      <p className={`font-bold ${ratingDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {ratingDelta >= 0 ? '+' : ''}{ratingDelta} ELO
                      </p>
                    )}
                    <p className="text-gray-500 text-xs">
                      {new Date(game.startedAt).toLocaleDateString('uk-UA')}
                    </p>
                  </div>
                </>
              );
              return isCheckers ? (
                <div key={game.id} className={cardClass}>{inner}</div>
              ) : (
                <Link key={game.id} to={`/game/${game.id}`} className={cardClass}>{inner}</Link>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
