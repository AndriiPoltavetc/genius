import { motion } from 'framer-motion';

interface TimerProps {
  currentMs: number;
  isActive: boolean;
  compact?: boolean;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function Timer({ currentMs, isActive, compact }: TimerProps) {
  const isLow = currentMs < 30_000;

  const sizeClasses = compact
    ? 'text-sm font-bold px-2 py-0.5 rounded'
    : 'text-xl md:text-3xl font-bold px-3 py-1.5 md:px-4 md:py-2 rounded-lg';

  return (
    <motion.div
      className={`font-mono tabular-nums ${sizeClasses} ${isLow ? 'bg-red-900 text-red-200' : 'bg-gray-800 text-white'}`}
      animate={isLow && isActive ? { scale: [1, 1.02, 1] } : {}}
      transition={{ repeat: Infinity, duration: 1 }}
    >
      {formatTime(currentMs)}
    </motion.div>
  );
}
