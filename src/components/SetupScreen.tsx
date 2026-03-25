import { useState } from 'react';
import { Disc3, ExternalLink, Loader2 } from 'lucide-react';
import { useDiscogs } from '../DiscogsContext';
import { callDiscogsProxy } from '../utils/discogsProxy';

export function SetupScreen() {
  const { setConnection } = useDiscogs();
  const [username, setUsername] = useState('mdiggs');
  const [token, setToken] = useState('kGSZORckySelWYFEubafHDAXcugjgSDEGdZUBuxJ');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-blue-600 p-4 rounded-full">
              <Disc3 className="w-10 h-10 text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center mb-2 text-slate-900 dark:text-white">
            Discogs Seller Agent
          </h1>
          <p className="text-center text-slate-600 dark:text-slate-400 mb-8">
            AI-powered assistant for your vinyl marketplace
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Discogs Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                API Token
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-800 dark:text-red-200 whitespace-pre-wrap">{error}</p>
              </div>
            )}

            <button
              onClick={handleConnect}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect to Discogs'
              )}
            </button>

            <a
              href="https://www.discogs.com/settings/developers"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline mt-4"
            >
              <ExternalLink className="w-4 h-4" />
              Generate API token on Discogs
            </a>
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          Your token is only stored in memory and never saved permanently
        </p>
      </div>
    </div>
  );
}
