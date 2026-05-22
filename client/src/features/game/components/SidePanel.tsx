import { useRef, useEffect } from 'react';

import type { Move } from '../../../shared-types';
import SettingsPanel from '../../../components/SettingsPanel';

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
                    <td className="text-white px-2 py-0.5">{whiteMove.san}</td>
                    <td className="text-white px-2 py-0.5">{blackMove?.san ?? ''}</td>
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
