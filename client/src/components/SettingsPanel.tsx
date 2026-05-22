import { useState } from 'react';

const THEMES = [
  { id: 'dark', label: '🌑 Темна' },
  { id: 'light', label: '🌕 Світла' },
  { id: 'classic', label: '♟️ Класична' },
];

export default function SettingsPanel() {
  const [theme, setTheme] = useState(() => localStorage.getItem('genius_theme') ?? 'dark');

  const applyTheme = (t: string) => {
    setTheme(t);
    localStorage.setItem('genius_theme', t);
    document.documentElement.setAttribute('data-theme', t);
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
    </div>
  );
}
