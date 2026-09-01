import { createContext, useContext, useState, type ReactNode } from 'react';

import type { Requester } from './RequesterSelection';

interface RequesterContextValue {
  requester: Requester | null;
  setRequester: (requester: Requester | null) => void;
}

const RequesterUserContext = createContext<RequesterContextValue | null>(null);

export function RequesterUserProvider({ children }: { children: ReactNode }) {
  const [requester, setRequester] = useState<Requester | null>(null);

  return (
    <RequesterUserContext.Provider value={{ requester, setRequester }}>
      {children}
    </RequesterUserContext.Provider>
  );
}

export function useRequester() {
  const context = useContext(RequesterUserContext);
  if (!context) {
    throw new Error('useRequester must be used within a RequesterUserProvider');
  }
  return context;
}