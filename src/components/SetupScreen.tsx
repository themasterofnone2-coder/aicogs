import { useState } from 'react';
import { Disc3, ExternalLink, Loader2, Eye, EyeOff, Sun, Moon, User, Key } from 'lucide-react';
import { useDiscogs } from '../DiscogsContext';
import { callDiscogsProxy } from '../utils/discogsProxy';

interface Props {
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export function SetupScreen({ darkMode, onToggleDarkMode }: Props) {
  const { setConnection } = useDiscogs();
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    if (!username.trim() || !token.trim()) {
      setError('Please enter both username and token');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await callDiscogsProxy('GET', `/users/${username}`, null, token);
      setConnection({ username, token, connected: true });
    } catch (err: any) {
      setError(err.message || 'Failed to connect to Discogs');
      setConnection(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-slate-50 to-indigo-100 dark:from-slate-950 dark:via-indigo-950/40 dark:to-slate-900 flex items-center justify-center p-4 relative">

      <button
        onClick={onToggleDarkMode}
        className="absolute top-5 right-5 p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition shadow-sm"
        title="Toggle theme"
      >
        {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <div className="w-full max-w-sm">
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-indigo-500/10 dark:shadow-black/40 border border-white dark:border-slate-700/50 p-8">

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl blur-xl opacity-50 scale-110" />
              <div className="relative bg-gradient-to-br from-indigo-500 to-violet-600 p-4 rounded-2xl shadow-xl">
                <Disc3 className="w-9 h-9 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Discogs Agent
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 text-center">
              AI-powered vinyl marketplace assistant
            </p>
          </div>

          {/* Form */}
          <div className="space-y-3">
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                placeholder="Discogs username"
                autoComplete="username"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-sm"
              />
            </div>

            <div className="relative">
              <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                placeholder="Discogs API token"
                autoComplete="current-password"
                className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-sm"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-xl p-3">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <button
              onClick={handleConnect}
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 disabled:shadow-none text-sm mt-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting…
                </>
              ) : (
                'Connect to Discogs'
              )}
            </button>

            <a
              href="https://www.discogs.com/settings/developers"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition pt-1"
            >
              <ExternalLink className="w-3 h-3" />
              Get your API token from Discogs
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-5">
          Token stored in memory only — never saved to disk
        </p>
      </div>
    </div>
  );
}
