import { useState } from 'react';

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

export default function SettingsPanel() {
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
    <div className="p-4 space-y-6">
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
