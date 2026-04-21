'use client';

import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import toast from 'react-hot-toast';

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = 'America/New_York';

interface Worker {
  id: string;
  name: string;
  employeeId: string | null;
}

interface AddTimeModalProps {
  onClose: () => void;
  onSaved: () => void;
}

function toLocalInput(date: Date): string {
  return dayjs(date).tz(TIMEZONE).format('YYYY-MM-DDTHH:mm');
}

function fromLocalInput(localValue: string): string | null {
  if (!localValue) return null;
  return dayjs.tz(localValue, TIMEZONE).toISOString();
}

export function AddTimeModal({ onClose, onSaved }: AddTimeModalProps) {
  const { t } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);

  const now = toLocalInput(new Date());
  const [workerId, setWorkerId] = useState('');
  const [clockIn, setClockIn] = useState(now);
  const [lunchOut, setLunchOut] = useState('');
  const [lunchIn, setLunchIn] = useState('');
  const [clockOut, setClockOut] = useState('');

  useEffect(() => {
    fetch('/api/workers')
      .then((r) => r.json())
      .then(setWorkers)
      .catch(() => {});

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSave = async () => {
    if (!workerId) {
      toast.error(t('workerRequired'));
      return;
    }
    if (!clockIn) {
      toast.error(t('shiftStartRequired'));
      return;
    }

    const chain = [clockIn, lunchOut, lunchIn, clockOut].filter(Boolean);
    for (let i = 1; i < chain.length; i++) {
      const prev = dayjs.tz(chain[i - 1], TIMEZONE);
      const cur = dayjs.tz(chain[i], TIMEZONE);
      if (!cur.isAfter(prev)) {
        toast.error(t('timeOrderError'));
        return;
      }
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerId,
          clockIn: fromLocalInput(clockIn),
          lunchOut: fromLocalInput(lunchOut),
          lunchIn: fromLocalInput(lunchIn),
          clockOut: fromLocalInput(clockOut),
          force: true,
        }),
      });

      if (response.ok) {
        toast.success(t('entryAdded'));
        onSaved();
      } else {
        const data = await response.json();
        toast.error(data.error || t('entryAddFailed'));
      }
    } catch (error) {
      console.error('Error adding time entry:', error);
      toast.error(t('entryAddFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">{t('addTimeEntry')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('worker')} <span className="text-red-500">*</span>
            </label>
            <select
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="">{t('selectWorker')}</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}{w.employeeId ? ` (${w.employeeId})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('shiftStart')} <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={clockIn}
              onChange={(e) => setClockIn(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('lunchOut')}
            </label>
            <input
              type="datetime-local"
              value={lunchOut}
              onChange={(e) => setLunchOut(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('lunchIn')}
            </label>
            <input
              type="datetime-local"
              value={lunchIn}
              onChange={(e) => setLunchIn(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('shiftEnd')}
            </label>
            <input
              type="datetime-local"
              value={clockOut}
              onChange={(e) => setClockOut(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-3">{t('timezoneNote')}</p>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? t('loading') : t('addEntry')}
          </button>
        </div>
      </div>
    </div>
  );
}
