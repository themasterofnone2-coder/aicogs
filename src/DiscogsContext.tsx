import { createContext, useContext, useState, ReactNode } from 'react';
import { DiscogsConnection } from './types';
import { callDiscogsProxy } from './utils/discogsProxy';

interface DiscogsContextType {
  connection: DiscogsConnection | null;
  setConnection: (connection: DiscogsConnection | null) => void;
  callDiscogsAPI: (method: string, path: string, body?: any) => Promise<any>;
}

const DiscogsContext = createContext<DiscogsContextType | undefined>(undefined);

export function DiscogsProvider({ children }: { children: ReactNode }) {
  const [connection, setConnection] = useState<DiscogsConnection | null>(null);

  const callDiscogsAPI = async (method: string, path: string, body?: any) => {
    if (!connection?.token) {
      throw new Error('Not connected to Discogs');
    }

    return await callDiscogsProxy(method, path, body, connection.token);
  };

  return (
    <DiscogsContext.Provider value={{ connection, setConnection, callDiscogsAPI }}>
      {children}
    </DiscogsContext.Provider>
  );
}

export function useDiscogs() {
  const context = useContext(DiscogsContext);
  if (!context) {
    throw new Error('useDiscogs must be used within DiscogsProvider');
  }
  return context;
}
