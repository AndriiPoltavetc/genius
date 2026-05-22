import { motion } from 'framer-motion';

interface TimerProps {
  currentMs: number;
  isActive: boolean;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function Timer({ currentMs, isActive }: TimerProps) {
  const isLow = currentMs < 30_000;

  return (
    <motion.div
      className={`font-mono text-xl md:text-3xl font-bold px-3 py-1.5 md:px-4 md:py-2 rounded-lg tabular-nums ${
        isLow ? 'bg-red-900 text-red-200' : 'bg-gray-800 text-white'
      }`}
      animate={isLow && isActive ? { scale: [1, 1.02, 1] } : {}}
      transition={{ repeat: Infinity, duration: 1 }}
    >
      {formatTime(currentMs)}
    </motion.div>
  );
}
