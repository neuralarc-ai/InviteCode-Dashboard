'use client';

import { createContext, useContext } from 'react';

interface RefreshContextType {
  refreshInviteCodes: () => Promise<void>;
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

export function RefreshProvider({ 
  children, 
  refreshInviteCodes 
}: { 
  children: React.ReactNode;
  refreshInviteCodes: () => Promise<void>;
}) {
  return (
    <RefreshContext.Provider value={{ refreshInviteCodes }}>
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  const context = useContext(RefreshContext);
  if (context === undefined) {
    throw new Error('useRefresh must be used within a RefreshProvider');
  }
  return context;
}
