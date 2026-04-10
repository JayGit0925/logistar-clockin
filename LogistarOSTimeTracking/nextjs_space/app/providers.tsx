'use client';

import { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { LanguageProvider } from '@/lib/language-context';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      {children}
      <Toaster position="top-center" />
    </LanguageProvider>
  );
}
