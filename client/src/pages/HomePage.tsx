import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../app/hooks';

export default function HomePage() {
  const { t } = useTranslation();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-2xl"
      >
        <h1 className="text-6xl font-bold text-white mb-4">
          ♟ <span className="text-primary-500">Genius</span>
        </h1>
        <p className="text-xl text-gray-400 mb-8">{t('home.subtitle')}</p>

        <div className="flex gap-4 justify-center flex-wrap">
          {isAuthenticated ? (
            <Link to="/lobby" className="btn-primary text-lg px-8 py-3">
              {t('home.playNow')}
            </Link>
          ) : (
            <>
              <Link to="/register" className="btn-primary text-lg px-8 py-3">
                {t('home.getStarted')}
              </Link>
              <Link to="/login" className="btn-secondary text-lg px-8 py-3">
                {t('home.login')}
              </Link>
            </>
          )}
          <Link to="/leaderboard" className="btn-secondary text-lg px-8 py-3">
            {t('home.leaderboard')}
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-6 text-center">
          {[
            { icon: '🤖', title: t('home.feature.ai'), desc: t('home.feature.aiDesc') },
            { icon: '⚡', title: t('home.feature.realtime'), desc: t('home.feature.realtimeDesc') },
            { icon: '📊', title: t('home.feature.elo'), desc: t('home.feature.eloDesc') },
          ].map((f) => (
            <div key={f.title} className="card">
              <div className="text-3xl mb-2">{f.icon}</div>
              <h3 className="font-semibold text-white mb-1">{f.title}</h3>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
