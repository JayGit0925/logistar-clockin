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

interface TimeEntry {
  id: string;
  clockIn: string;
  lunchOut: string | null;
  lunchIn: string | null;
  clockOut: string | null;
  totalHours: number | null;
  worker: {
    name: string;
    employeeId: string | null;
  };
}

interface EditTimeModalProps {
  entry: TimeEntry;
  onClose: () => void;
  onSaved: () => void;
}

function toLocalInput(isoString: string | null): string {
  if (!isoString) return '';
  return dayjs(isoString).tz(TIMEZONE).format('YYYY-MM-DDTHH:mm');
}

function fromLocalInput(localValue: string): string | null {
  if (!localValue) return null;
  return dayjs.tz(localValue, TIMEZONE).toISOString();
}

export function EditTimeModal({ entry, onClose, onSaved }: EditTimeModalProps) {
  const { t } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);

  const [clockIn, setClockIn] = useState(toLocalInput(entry.clockIn));
  const [lunchOut, setLunchOut] = useState(toLocalInput(entry.lunchOut));
  const [lunchIn, setLunchIn] = useState(toLocalInput(entry.lunchIn));
  const [clockOut, setClockOut] = useState(toLocalInput(entry.clockOut));

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSave = async () => {
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
      const response = await fetch(`/api/time-entries/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clockIn: fromLocalInput(clockIn),
          lunchOut: fromLocalInput(lunchOut),
          lunchIn: fromLocalInput(lunchIn),
          clockOut: fromLocalInput(clockOut),
        }),
      });

      if (response.ok) {
        toast.success(t('timeUpdated'));
        onSaved();
      } else {
        const data = await response.json();
        toast.error(data.error || t('timeUpdateFailed'));
      }
    } catch (error) {
      console.error('Error updating time entry:', error);
      toast.error(t('timeUpdateFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t('editTime')}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {entry.worker.name}
              {entry.worker.employeeId && ` (${entry.worker.employeeId})`}
            </p>
          </div>
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
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? t('loading') : t('saveChanges')}
          </button>
        </div>
      </div>
    </div>
  );
}
