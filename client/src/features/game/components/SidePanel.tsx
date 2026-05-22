import { useRef, useEffect } from 'react';

import type { Move } from '../../../shared-types';
import SettingsPanel from '../../../components/SettingsPanel';

const PIECE_ICONS = {
  w: { p: '♙', r: '♖', n: '♘', b: '♗', q: '♕', k: '♔' },
  b: { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚' },
};

function getMoveDisplay(move: Move): string {
  const color = move.moveNumber % 2 === 1 ? 'w' : 'b';
  const icons = PIECE_ICONS[color];
  let piece: keyof typeof icons = 'p';
  const san = move.san;
  if (san.startsWith('K') || san.startsWith('O')) piece = 'k';
  else if (san.startsWith('Q')) piece = 'q';
  else if (san.startsWith('R')) piece = 'r';
  else if (san.startsWith('B')) piece = 'b';
  else if (san.startsWith('N')) piece = 'n';
  const icon = icons[piece];
  if (san === 'O-O') return `${icon} O-O`;
  if (san === 'O-O-O') return `${icon} O-O-O`;
  const separator = san.includes('x') ? '×' : '→';
  const promoMatch = san.match(/=([QRBN])/);
  const suffix = promoMatch ? (icons[promoMatch[1].toLowerCase() as keyof typeof icons] ?? '') : '';
  return `${icon} ${move.from}${separator}${move.to}${suffix}`;
}

interface SidePanelProps {
  moves: Move[];
  activeTab: 'moves' | 'settings';
  onTabChange: (tab: 'moves' | 'settings') => void;
}

export default function SidePanel({ moves, activeTab, onTabChange }: SidePanelProps) {
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
                    <td className="text-white px-2 py-0.5">{getMoveDisplay(whiteMove)}</td>
                    <td className="text-white px-2 py-0.5">{blackMove ? getMoveDisplay(blackMove) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div ref={bottomRef} />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <SettingsPanel />
        </div>
      )}
    </div>
  );
}
