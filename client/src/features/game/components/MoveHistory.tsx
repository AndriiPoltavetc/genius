import { useEffect, useRef } from 'react';

import type { Move } from '@genius/shared';

interface MoveHistoryProps {
  moves: Move[];
}

export default function MoveHistory({ moves }: MoveHistoryProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [moves.length]);

  // Group moves into pairs (white, black)
  const movePairs: [Move, Move | undefined][] = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push([moves[i] as Move, moves[i + 1]]);
  }

  return (
    <div className="bg-gray-900 rounded-lg p-3 h-64 overflow-y-auto font-mono text-sm">
      <table className="w-full">
        <tbody>
          {movePairs.map(([whiteMove, blackMove], i) => (
            <tr key={i} className="hover:bg-gray-800 rounded">
              <td className="text-gray-500 w-8 pr-2 text-right">{i + 1}.</td>
              <td className="text-white px-2 py-0.5">{whiteMove.san}</td>
              <td className="text-white px-2 py-0.5">{blackMove?.san ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div ref={bottomRef} />
    </div>
  );
}
