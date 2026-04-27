'use client';

import { useState } from 'react';
import { Clock } from 'lucide-react';
import { ClockModal } from './clock-modal';
import { useLanguage } from '@/lib/language-context';

export function WorkerGrid() {
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col items-center justify-center py-16">
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-200 p-12 flex flex-col items-center gap-5 hover:scale-105 active:scale-95 border-2 border-transparent hover:border-blue-400"
        >
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
            <Clock className="w-12 h-12 text-blue-600" />
          </div>
          <span className="text-2xl font-semibold text-gray-800">{t('tapToClockIn')}</span>
        </button>
      </div>

      <ClockModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
