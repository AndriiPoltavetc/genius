import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface TimerProps {
  initialMs: number;
  isActive: boolean;
  onTimeout?: () => void;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function Timer({ initialMs, isActive, onTimeout }: TimerProps) {
  const [remainingMs, setRemainingMs] = useState(initialMs);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setRemainingMs(initialMs);
  }, [initialMs]);

  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setRemainingMs((prev) => {
        if (prev <= 100) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onTimeout?.();
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, onTimeout]);

  const isLow = remainingMs < 30_000;

  return (
    <motion.div
      className={`font-mono text-3xl font-bold px-4 py-2 rounded-lg ${
        isLow ? 'bg-red-900 text-red-200' : 'bg-gray-800 text-white'
      }`}
      animate={isLow && isActive ? { scale: [1, 1.02, 1] } : {}}
      transition={{ repeat: Infinity, duration: 1 }}
    >
      {formatTime(remainingMs)}
    </motion.div>
  );
}
