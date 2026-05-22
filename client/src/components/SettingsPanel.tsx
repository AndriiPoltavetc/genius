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

function PiecePreview({ styleId }: { styleId: string }) {
  const stroke = styleId === 'classic';
  const textStyle: React.CSSProperties = stroke
    ? { WebkitTextStroke: '0.5px #555', paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'] }
    : {};
  return (
    <span className="flex items-center gap-1 select-none" style={{ fontSize: '20px', ...textStyle }}>
      <span>♗</span>
      <span>♝</span>
    </span>
  );
}

export default function SettingsPanel() {
  const [theme, setTheme] = useState(() => localStorage.getItem('genius_theme') ?? 'dark');
  const [pieces, setPieces] = useState(() => localStorage.getItem('genius_pieces') ?? 'standard');

  const applyTheme = (t: string) => {
    setTheme(t);
    localStorage.setItem('genius_theme', t);
    document.documentElement.setAttribute('data-theme', t);
  };

  const applyPieces = (p: string) => {
    setPieces(p);
    localStorage.setItem('genius_pieces', p);
    window.dispatchEvent(new Event('genius:settings-changed'));
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
              <span className="text-white text-sm group-hover:text-primary-300 transition-colors flex-1">{p.label}</span>
              <PiecePreview styleId={p.id} />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
