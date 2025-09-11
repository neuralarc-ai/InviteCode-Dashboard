'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { InviteCode } from '@/lib/types';

interface PreviewCode {
  code: string;
  maxUses: number;
  emailSentTo?: string[];
}

interface PreviewCodesContextType {
  previewCodes: PreviewCode[];
  addPreviewCodes: (codes: PreviewCode[]) => void;
  clearPreviewCodes: () => void;
  removePreviewCode: (code: string) => void;
}

const PreviewCodesContext = createContext<PreviewCodesContextType | undefined>(undefined);

export function PreviewCodesProvider({ children }: { children: ReactNode }) {
  const [previewCodes, setPreviewCodes] = useState<PreviewCode[]>([]);

  const addPreviewCodes = (codes: PreviewCode[]) => {
    setPreviewCodes(codes);
  };

  const clearPreviewCodes = () => {
    setPreviewCodes([]);
  };

  const removePreviewCode = (code: string) => {
    setPreviewCodes(prev => prev.filter(c => c.code !== code));
  };

  return (
    <PreviewCodesContext.Provider value={{
      previewCodes,
      addPreviewCodes,
      clearPreviewCodes,
      removePreviewCode,
    }}>
      {children}
    </PreviewCodesContext.Provider>
  );
}

export function usePreviewCodes() {
  const context = useContext(PreviewCodesContext);
  if (context === undefined) {
    throw new Error('usePreviewCodes must be used within a PreviewCodesProvider');
  }
  return context;
}
