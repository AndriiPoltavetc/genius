import { useEffect, useRef } from 'react';

import type { Move } from '../../../shared-types';

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
              <td className="text-white px-2 py-0.5">{getMoveDisplay(whiteMove)}</td>
              <td className="text-white px-2 py-0.5">{blackMove ? getMoveDisplay(blackMove) : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div ref={bottomRef} />
    </div>
  );
}
