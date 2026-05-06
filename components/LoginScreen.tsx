import React, { useState } from 'react';
import { Lock, User, LogIn, AlertCircle, ShieldCheck } from 'lucide-react';
import { Language } from '../types';

interface Props {
  onLogin: () => void;
  language: Language;
}

export const LoginScreen: React.FC<Props> = ({ onLogin, language }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const t = {
    title: 'System Login',
    subtitle: 'AutoPPAP AI Audit Assistant',
    usernamePlaceholder: 'Username',
    passwordPlaceholder: 'Password',
    login: 'Login',
    error: 'Invalid username or password',
    registerHint: 'To register an account, please contact Lan Yuange(MA/PUQ-CN)',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'Admin' && password === 'MAPUQCN2026') {
      setError(false);
      onLogin();
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4 font-sans">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-700 animate-in slide-in-from-bottom-4 duration-500">
        <div className="p-8 pb-6 text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/20">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{t.title}</h2>
          <p className="text-slate-400 text-sm">{t.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 pt-0 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-in fade-in zoom-in-95">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{t.error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="w-5 h-5 text-slate-500" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-600 rounded-xl leading-5 bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                placeholder={t.usernamePlaceholder}
                required
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="w-5 h-5 text-slate-500" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-600 rounded-xl leading-5 bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                placeholder={t.passwordPlaceholder}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-900 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            {t.login}
          </button>
          
          <div className="text-center mt-6">
            <p className="text-sm text-slate-400">
              {t.registerHint}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
