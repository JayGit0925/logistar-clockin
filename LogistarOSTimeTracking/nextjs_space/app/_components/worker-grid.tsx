'use client';

import { useState } from 'react';
import { User } from 'lucide-react';
import { ClockModal } from './clock-modal';
import { useLanguage } from '@/lib/language-context';

interface Worker {
  id: string;
  name: string;
  employeeId: string | null;
}

interface WorkerGridProps {
  workers: Worker[];
}

export function WorkerGrid({ workers }: WorkerGridProps) {
  const { t } = useLanguage();
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleWorkerClick = (worker: Worker) => {
    setSelectedWorker(worker);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedWorker(null);
  };

  if (!workers || workers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">{t('noWorkers')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {workers.map((worker: Worker) => (
          <button
            key={worker.id}
            onClick={() => handleWorkerClick(worker)}
            className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-200 p-6 min-h-[120px] flex flex-col items-center justify-center gap-3 hover:scale-105 active:scale-95 border-2 border-transparent hover:border-blue-400"
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900">{worker.name}</h3>
              {worker.employeeId && (
                <p className="text-sm text-gray-500 mt-1">{worker.employeeId}</p>
              )}
            </div>
          </button>
        ))}
      </div>

      {selectedWorker && (
        <ClockModal
          worker={selectedWorker}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}
