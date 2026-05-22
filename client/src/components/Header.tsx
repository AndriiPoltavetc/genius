import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import SettingsPanel from './SettingsPanel';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
}

export default function Header({ title, showBack }: HeaderProps) {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <header className="flex items-center px-6 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0 gap-3">
        <Link
          to="/lobby"
          className="text-xl font-bold text-primary-400 tracking-tight hover:text-primary-300 transition-colors flex-shrink-0"
        >
          Genius
        </Link>

        {showBack && (
          <button
            onClick={() => navigate(-1)}
            style={{ color: 'var(--text-primary)' }}
            className="text-sm hover:opacity-70 transition-opacity flex-shrink-0"
          >
            ← Назад
          </button>
        )}

        {title
          ? <h1 className="flex-1 text-center text-base font-semibold text-white">{title}</h1>
          : <div className="flex-1" />
        }

        <button
          onClick={() => setShowSettings((p) => !p)}
          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors text-base leading-none flex-shrink-0"
          title="Налаштування"
        >
          ⚙️
        </button>
      </header>

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
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
              <h2 className="font-semibold text-white">Налаштування</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white transition-colors text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <SettingsPanel />
          </div>
        </div>
      )}
    </>
  );
}
