import { useRef, useEffect } from 'react';
import { useState } from 'react';

import type { Move } from '../../../shared-types';

interface SidePanelProps {
  moves: Move[];
  onResign: () => void;
  isGameOver: boolean;
  activeTab: 'moves' | 'settings';
  onTabChange: (tab: 'moves' | 'settings') => void;
}

const THEMES = [
  { id: 'dark', label: '🌑 Темна' },
  { id: 'light', label: '🌕 Світла' },
  { id: 'classic', label: '♟️ Класична' },
];

const PIECE_STYLES = [
  { id: 'standard', label: 'Стандартний' },
  { id: 'minimalist', label: 'Мінімалістичний' },
  { id: 'classic', label: 'Класичний' },
];

const COLOR_PREFS = [
  { id: 'any', label: 'Без різниці' },
  { id: 'white', label: 'Білі' },
  { id: 'black', label: 'Чорні' },
];

function SettingsContent() {
  const [theme, setTheme] = useState(() => localStorage.getItem('genius_theme') ?? 'dark');
  const [pieces, setPieces] = useState(() => localStorage.getItem('genius_pieces') ?? 'standard');
  const [colorPref, setColorPref] = useState(() => localStorage.getItem('genius_color_pref') ?? 'any');

  const applyTheme = (t: string) => {
    setTheme(t);
    localStorage.setItem('genius_theme', t);
    document.documentElement.setAttribute('data-theme', t);
  };

  const applyPieces = (p: string) => {
    setPieces(p);
    localStorage.setItem('genius_pieces', p);
  };

  const applyColorPref = (c: string) => {
    setColorPref(c);
    localStorage.setItem('genius_color_pref', c);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Тема сайту</h3>
        <div className="space-y-2">
          {THEMES.map((t) => (
            <label key={t.id} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="radio"
                name="theme"
                value={t.id}
                checked={theme === t.id}
                onChange={() => applyTheme(t.id)}
                className="accent-primary-500"
              />
              <span className="text-white text-sm group-hover:text-primary-300 transition-colors">{t.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Стиль фігур</h3>
        <div className="space-y-2">
          {PIECE_STYLES.map((p) => (
            <label key={p.id} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="radio"
                name="pieces"
                value={p.id}
                checked={pieces === p.id}
                onChange={() => applyPieces(p.id)}
                className="accent-primary-500"
              />
              <span className="text-white text-sm group-hover:text-primary-300 transition-colors">{p.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Колір в онлайн матчі</h3>
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
  );
}

export default function SidePanel({ moves, onResign, isGameOver, activeTab, onTabChange }: SidePanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'moves') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [moves.length, activeTab]);

  const pairs: [Move, Move | undefined][] = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push([moves[i] as Move, moves[i + 1]]);
  }

  return (
    <div
      className="flex flex-col bg-gray-900 border-l border-gray-800 h-full overflow-hidden"
      style={{ minWidth: '280px' }}
    >
      <div className="flex border-b border-gray-800 flex-shrink-0">
        {(['moves', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`flex-1 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab === 'moves' ? 'Ходи' : 'Налаштування'}
          </button>
        ))}
      </div>

      {activeTab === 'moves' ? (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3 font-mono text-sm">
            {pairs.length === 0 && (
              <p className="text-gray-500 text-center mt-8 text-xs">Ходів ще немає</p>
            )}
            <table className="w-full">
              <tbody>
                {pairs.map(([whiteMove, blackMove], i) => (
                  <tr key={i} className="hover:bg-gray-800 rounded">
                    <td className="text-gray-500 w-8 pr-2 text-right select-none">{i + 1}.</td>
                    <td className="text-white px-2 py-0.5">{whiteMove.san}</td>
                    <td className="text-white px-2 py-0.5">{blackMove?.san ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div ref={bottomRef} />
          </div>
          <div className="p-3 border-t border-gray-800 flex-shrink-0">
            <button
              onClick={onResign}
              disabled={isGameOver}
              className="btn-secondary w-full text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Здатися
            </button>
          </div>
        </div>
      ) : (
        <SettingsContent />
      )}
    </div>
  );
}
