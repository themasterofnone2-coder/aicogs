import { DiscogsProvider, useDiscogs } from './DiscogsContext';
import { SetupScreen } from './components/SetupScreen';
import { ChatUI } from './components/ChatUI';

function AppContent() {
  const { connection } = useDiscogs();

  if (!connection?.connected) {
    return <SetupScreen />;
  }

  return <ChatUI />;
}

function App() {
  return (
    <DiscogsProvider>
      <AppContent />
    </DiscogsProvider>
  );
}

export default App;
