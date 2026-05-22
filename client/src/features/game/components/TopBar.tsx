import Timer from './Timer';

interface TopBarProps {
  opponentName: string;
  opponentRating?: number;
  botMs: number;
  isBotActive: boolean;
  isGameOver: boolean;
  myName?: string;
  myRating?: number;
  onTogglePanel: () => void;
  onOpenSettings: () => void;
  onResign: () => void;
}

export default function TopBar({
  opponentName, opponentRating, botMs, isBotActive, isGameOver,
  myName, myRating,
  onTogglePanel, onOpenSettings, onResign,
}: TopBarProps) {
  return (
    <div className="flex items-center px-3 py-2 bg-gray-900 border-b border-gray-800 flex-shrink-0 gap-2">
      {/* Left: opponent info + bot timer */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-semibold text-white text-sm truncate">{opponentName}</span>
        {opponentRating && <span className="text-gray-400 text-xs">{opponentRating} ELO</span>}
        <Timer currentMs={botMs} isActive={isBotActive} />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: action buttons + my info */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onTogglePanel}
          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors text-base leading-none"
          title="Аналіз ходів"
        >
          📋
        </button>
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors text-base leading-none"
          title="Налаштування"
        >
          ⚙️
        </button>
        <button
          onClick={onResign}
          disabled={isGameOver}
          className="px-3 py-1 rounded bg-red-800 hover:bg-red-700 text-white text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Здатися
        </button>

        {myName && (
          <div className="text-right pl-2 border-l border-gray-700">
            <p className="font-semibold text-white text-sm leading-tight">{myName}</p>
            {myRating !== undefined && (
              <p className="text-gray-400 text-xs leading-tight">{myRating} ELO</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
