import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useLoginMutation } from '../features/auth/authApi';
import { setCredentials } from '../features/auth/authSlice';
import { initSocket } from '../features/game/socket';
import { useAppDispatch } from '../app/hooks';

export default function LoginPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [login, { isLoading }] = useLoginMutation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const result = await login({ email, password }).unwrap();
      dispatch(setCredentials(result));
      initSocket(result.accessToken);
      void navigate('/lobby');
    } catch {
      setError(t('auth.invalidCredentials'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          ♟ {t('auth.loginTitle')}
        </h1>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <div>
            <label className="block text-gray-400 text-sm mb-1">{t('auth.email')}</label>
            <input
              type="email"
              className="input-field"
              style={{ fontSize: '16px' }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1">{t('auth.password')}</label>
            <input
              type="password"
              className="input-field"
              style={{ fontSize: '16px' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={isLoading} className="btn-primary w-full py-3">
            {isLoading ? t('common.loading') : t('auth.login')}
          </button>
        </form>
        <p className="text-gray-400 text-center mt-4 text-sm">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-primary-400 hover:underline">
            {t('auth.register')}
          </Link>
        </p>
      </div>
    </div>
  );
}
