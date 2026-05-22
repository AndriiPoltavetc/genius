import Timer from './Timer';

interface TopBarProps {
  opponentName: string;
  botMs: number;
  isBotActive: boolean;
  isGameOver: boolean;
  onTogglePanel: () => void;
  onOpenSettings: () => void;
  onResign: () => void;
}

export default function TopBar({ opponentName, botMs, isBotActive, isGameOver, onTogglePanel, onOpenSettings, onResign }: TopBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 flex-shrink-0">
      <div className="flex items-center gap-3">
        <span className="font-semibold text-white">{opponentName}</span>
        <Timer currentMs={botMs} isActive={isBotActive} />
      </div>
      <div className="flex items-center gap-2">
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
      </div>
    </div>
  );
}
