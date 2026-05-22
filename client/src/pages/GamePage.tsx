import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Chessboard from '../features/game/components/Chessboard';
import MoveHistory from '../features/game/components/MoveHistory';
import Timer from '../features/game/components/Timer';
import ChatBox from '../features/game/components/ChatBox';
import ConfirmModal from '../components/ui/ConfirmModal';
import TopBar from '../features/game/components/TopBar';
import SidePanel from '../features/game/components/SidePanel';
import { getSocket } from '../features/game/socket';
import { moveMade, gameEnded } from '../features/game/gameSlice';
import { useAppDispatch, useAppSelector } from '../app/hooks';

export default function GamePage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const gameState = useAppSelector((s) => s.game.currentGame);
  const playerColor = useAppSelector((s) => s.game.playerColor);
  const opponentUsername = useAppSelector((s) => s.game.opponentUsername);
  const opponentRating = useAppSelector((s) => s.game.opponentRating);
  const gameEndResult = useAppSelector((s) => s.game.gameEndResult);
  const user = useAppSelector((s) => s.auth.user);

  const [showResignModal, setShowResignModal] = useState(false);
  const [showDrawOfferModal, setShowDrawOfferModal] = useState(false);
  const [drawDeclinedToast, setDrawDeclinedToast] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [sidePanelTab, setSidePanelTab] = useState<'moves' | 'settings'>('moves');

  // Server-authoritative timer values, updated via syncTime events
  const [whiteMs, setWhiteMs] = useState(() => gameState?.whiteTimeMs ?? 600_000);
  const [blackMs, setBlackMs] = useState(() => gameState?.blackTimeMs ?? 600_000);

  useEffect(() => {
    if (!gameState) void navigate('/lobby');
  }, [gameState, navigate]);

  // Block browser back button while game is active
  useEffect(() => {
    if (!gameState || gameState.isGameOver) return;
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [gameState?.isGameOver]);

  useEffect(() => {
    let socket: ReturnType<typeof getSocket> | null = null;
    try {
      socket = getSocket();
    } catch {
      return;
    }

    socket.on('move', ({ gameState: newState }) => {
      dispatch(moveMade(newState));
    });

    socket.on('gameEnd', ({ result, resultReason, ratingChange }) => {
      dispatch(gameEnded({ result, resultReason, ratingDelta: ratingChange?.delta }));
    });

    socket.on('syncTime', ({ whiteTimeMs, blackTimeMs }) => {
      setWhiteMs(whiteTimeMs);
      setBlackMs(blackTimeMs);
    });

    socket.on('drawOffer', () => {
      setShowDrawOfferModal(true);
    });

    socket.on('drawDeclined', () => {
      setDrawDeclinedToast(true);
      setTimeout(() => setDrawDeclinedToast(false), 3000);
    });

    return () => {
      socket?.off('move');
      socket?.off('gameEnd');
      socket?.off('syncTime');
      socket?.off('drawOffer');
      socket?.off('drawDeclined');
    };
  }, [dispatch]);

  if (!gameState) return null;

  const isMyTurn = gameState.turn === playerColor;
  const myMs = playerColor === 'w' ? whiteMs : blackMs;
  const oppMs = playerColor === 'w' ? blackMs : whiteMs;

  const handleResignConfirm = () => {
    setShowResignModal(false);
    getSocket().emit('resign');
  };

  const handleDrawOffer = () => {
    getSocket().emit('drawOffer');
  };

  const handleDrawAccept = () => {
    setShowDrawOfferModal(false);
    getSocket().emit('drawAccept');
  };

  const handleDrawDecline = () => {
    setShowDrawOfferModal(false);
    getSocket().emit('drawDecline');
  };

  const boardMaxWidth = 'min(90vmin, 600px)';

  // ── Game end result — fixed centered overlay ──────────────────────────────
  const GameEndModal = gameEndResult ? (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div className="card text-center p-8 max-w-sm w-full mx-4">
        <p className="text-3xl mb-3">
          {gameEndResult.result === 'WHITE_WIN'
            ? playerColor === 'w' ? '🏆 Перемога!' : '😢 Поразка'
            : gameEndResult.result === 'BLACK_WIN'
            ? playerColor === 'b' ? '🏆 Перемога!' : '😢 Поразка'
            : '🤝 Нічия'}
        </p>
        <p className="text-gray-400 text-sm mb-2">{gameEndResult.resultReason}</p>
        {gameEndResult.ratingDelta !== undefined && (
          <p className={`text-xl font-bold mb-4 ${gameEndResult.ratingDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {gameEndResult.ratingDelta >= 0 ? '+' : ''}{gameEndResult.ratingDelta} ELO
          </p>
        )}
        <button onClick={() => void navigate('/lobby')} className="btn-primary w-full">
          До лобі
        </button>
      </div>
    </div>
  ) : null;

  // ── Draw offer from opponent — modal ──────────────────────────────────────
  const DrawOfferModal = showDrawOfferModal ? (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.65)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div className="card text-center p-6 max-w-xs w-full mx-4">
        <p className="text-lg font-semibold text-white mb-1">🤝 Пропозиція нічиї</p>
        <p className="text-gray-400 text-sm mb-5">Суперник пропонує зіграти внічию</p>
        <div className="flex gap-3">
          <button onClick={handleDrawDecline} className="btn-secondary flex-1">Відхилити</button>
          <button onClick={handleDrawAccept} className="btn-primary flex-1">Прийняти</button>
        </div>
      </div>
    </div>
  ) : null;

  // ── "Draw declined" toast ─────────────────────────────────────────────────
  const DrawDeclinedToast = drawDeclinedToast ? (
    <div
      style={{
        position: 'fixed',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(239,68,68,0.9)',
        color: '#fff',
        padding: '10px 20px',
        borderRadius: '8px',
        zIndex: 60,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      ✗ Суперник відхилив нічию
    </div>
  ) : null;

  // ══════════════════════════════════════════════════════════════════════════
  // AI GAME — top bar + board + collapsible side panel
  // ══════════════════════════════════════════════════════════════════════════
  if (gameState.isAiGame) {
    return (
      <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
        {GameEndModal}
        <ConfirmModal
          isOpen={showResignModal}
          title="Здатися?"
          message="Ви впевнені, що хочете здатися? Це зарахується як поразка."
          confirmText="Здатися"
          cancelText="Скасувати"
          onConfirm={handleResignConfirm}
          onCancel={() => setShowResignModal(false)}
          variant="danger"
        />

        <TopBar
          opponentName={opponentUsername ?? 'AI'}
          botMs={oppMs}
          isBotActive={!isMyTurn && !gameState.isGameOver}
          isGameOver={gameState.isGameOver}
          onResign={() => setShowResignModal(true)}
          onTogglePanel={() => {
            if (showPanel && sidePanelTab === 'moves') { setShowPanel(false); }
            else { setShowPanel(true); setSidePanelTab('moves'); }
          }}
          onOpenSettings={() => {
            if (showPanel && sidePanelTab === 'settings') { setShowPanel(false); }
            else { setShowPanel(true); setSidePanelTab('settings'); }
          }}
        />

        <div className="flex flex-1 overflow-hidden">
          {/* Board column */}
          <div className="flex flex-col items-center justify-center flex-1 p-4 gap-2 min-w-0">
            <Chessboard gameId={gameState.id} />
            <div
              className="flex justify-between items-center bg-gray-900 rounded-lg px-3 py-2 w-full"
              style={{ maxWidth: boardMaxWidth }}
            >
              <div>
                <p className="font-semibold text-white">{user?.username}</p>
                <p className="text-gray-400 text-sm">{user?.rating} ELO</p>
              </div>
              <Timer currentMs={myMs} isActive={isMyTurn && !gameState.isGameOver} />
            </div>
          </div>

          {/* Side panel with slide animation */}
          <div
            style={{
              width: showPanel ? '280px' : '0px',
              transition: 'width 300ms ease',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <SidePanel
              moves={gameState.moves}
              activeTab={sidePanelTab}
              onTabChange={setSidePanelTab}
            />
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ONLINE GAME — board + sidebar
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="h-screen bg-gray-950 flex flex-col md:flex-row overflow-hidden">
      {GameEndModal}
      {DrawOfferModal}
      {DrawDeclinedToast}
      <ConfirmModal
        isOpen={showResignModal}
        title="Здатися?"
        message="Ви впевнені, що хочете здатися? Це зарахується як поразка."
        confirmText="Здатися"
        cancelText="Скасувати"
        onConfirm={handleResignConfirm}
        onCancel={() => setShowResignModal(false)}
        variant="danger"
      />

      {/* Board column */}
      <div className="flex flex-col items-center justify-center gap-2 p-2 md:p-6 md:flex-1 min-w-0">
        <div
          className="flex justify-between items-center bg-gray-900 rounded-lg px-3 py-2 w-full"
          style={{ maxWidth: boardMaxWidth }}
        >
          <div>
            <p className="font-semibold text-white">{opponentUsername}</p>
            {opponentRating && <p className="text-gray-400 text-sm">{opponentRating} ELO</p>}
          </div>
          <Timer currentMs={oppMs} isActive={!isMyTurn && !gameState.isGameOver} />
        </div>

        <Chessboard gameId={gameState.id} />

        <div
          className="flex justify-between items-center bg-gray-900 rounded-lg px-3 py-2 w-full"
          style={{ maxWidth: boardMaxWidth }}
        >
          <div>
            <p className="font-semibold text-white">{user?.username}</p>
            <p className="text-gray-400 text-sm">{user?.rating} ELO</p>
          </div>
          <Timer currentMs={myMs} isActive={isMyTurn && !gameState.isGameOver} />
        </div>
      </div>

      {/* Sidebar */}
      <div className="flex flex-col gap-3 p-3 md:p-4 border-t md:border-t-0 md:border-l border-gray-800 overflow-y-auto flex-shrink-0 md:w-80">
        <MoveHistory moves={gameState.moves} />
        <ChatBox gameId={gameState.id} />

        <div className="flex gap-2">
          <button
            onClick={() => setShowResignModal(true)}
            disabled={gameState.isGameOver}
            className="btn-secondary flex-1 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Здатися
          </button>
          <button
            onClick={handleDrawOffer}
            disabled={gameState.isGameOver}
            className="btn-secondary flex-1 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Нічия
          </button>
        </div>
      </div>
    </div>
  );
}
