'use client';

import { useEffect, useState } from 'react';
import { Filter } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';

interface FiltersProps {
  filters: {
    workerId: string;
    startDate: string;
    endDate: string;
  };
  setFilters: (filters: any) => void;
}

interface Worker {
  id: string;
  name: string;
}

export function Filters({ filters, setFilters }: FiltersProps) {
  const { t } = useLanguage();
  const [workers, setWorkers] = useState<Worker[]>([]);

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      const response = await fetch('/api/workers');
      if (response.ok) {
        const data = await response.json();
        setWorkers(data);
      }
    } catch (error) {
      console.error('Error fetching workers:', error);
    }
  };

  const handleReset = () => {
    setFilters({
      workerId: '',
      startDate: '',
      endDate: '',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-gray-700">
        <Filter className="w-4 h-4" />
        <span className="font-medium">{t('filters')}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('worker')}
          </label>
          <select
            value={filters.workerId}
            onChange={(e) => setFilters({ ...filters, workerId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">{t('allWorkers')}</option>
            {workers.map((worker: Worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('startDate')}
          </label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('endDate')}
          </label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={handleReset}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            {t('resetFilters')}
          </button>
        </div>
      </div>
    </div>
  );
}
