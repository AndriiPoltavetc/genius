interface PendingReady {
  timer: ReturnType<typeof setTimeout>;
  emit: () => void;
}

export const pendingGameReady = new Map<string, PendingReady>();
