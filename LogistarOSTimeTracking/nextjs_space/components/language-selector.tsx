'use client';

import { useLanguage } from '@/lib/language-context';
import { Globe } from 'lucide-react';
import { Locale } from '@/lib/i18n';

const localeLabels: Record<Locale, string> = {
  en: 'EN',
  zh: '中文',
  es: 'ES',
};

export function LanguageSelector({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useLanguage();

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <Globe className="w-4 h-4 text-gray-500" />
      {(['en', 'zh', 'es'] as Locale[]).map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={`px-2.5 py-1 rounded-md text-sm font-medium transition-colors ${
            locale === l
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {localeLabels[l]}
        </button>
      ))}
    </div>
  );
}
