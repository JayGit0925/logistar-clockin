'use client';

import { Clock } from 'lucide-react';
import { LanguageSelector } from '@/components/language-selector';
import { useLanguage } from '@/lib/language-context';

export function HomeHeader() {
  const { t } = useLanguage();

  return (
    <div className="text-center mb-8">
      <div className="flex items-center justify-end mb-4">
        <LanguageSelector />
      </div>
      <div className="flex items-center justify-center gap-3 mb-2">
        <Clock className="w-10 h-10 text-blue-600" />
        <h1 className="text-4xl font-bold text-gray-900">{t('appTitle')}</h1>
      </div>
      <p className="text-gray-600 text-lg">{t('tapToStart')}</p>
    </div>
  );
}
