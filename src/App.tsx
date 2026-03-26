import { useState, useEffect } from 'react';
import { DiscogsProvider, useDiscogs } from './DiscogsContext';
import { SetupScreen } from './components/SetupScreen';
import { ChatUI } from './components/ChatUI';

function AppContent({ darkMode, onToggleDarkMode }: { darkMode: boolean; onToggleDarkMode: () => void }) {
  const { connection } = useDiscogs();

  if (!connection?.connected) {
    return <SetupScreen darkMode={darkMode} onToggleDarkMode={onToggleDarkMode} />;
  }

  return <ChatUI darkMode={darkMode} onToggleDarkMode={onToggleDarkMode} />;
}

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  return (
    <DiscogsProvider>
      <AppContent darkMode={darkMode} onToggleDarkMode={() => setDarkMode((d) => !d)} />
    </DiscogsProvider>
  );
}

export default App;
