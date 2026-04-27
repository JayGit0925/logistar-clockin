'use client';

import { useEffect, useState } from 'react';
import { formatTimeOnly, formatDateOnly } from '@/lib/timezone';
import { Trash2, Pencil } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import { EditTimeModal } from './edit-time-modal';
import toast from 'react-hot-toast';

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

interface TimeEntriesTableProps {
  filters: {
    workerId: string;
    startDate: string;
    endDate: string;
  };
  refreshKey?: number;
}

export function TimeEntriesTable({ filters, refreshKey }: TimeEntriesTableProps) {
  const { t } = useLanguage();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalHours, setTotalHours] = useState(0);
  const [overtimeCount, setOvertimeCount] = useState(0);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  useEffect(() => {
    fetchEntries();
  }, [filters, refreshKey]);

  const fetchEntries = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.workerId) params.append('workerId', filters.workerId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/time-entries?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setEntries(data);

        const total = data.reduce((sum: number, entry: TimeEntry) => sum + (entry.totalHours || 0), 0);
        setTotalHours(total);
        setOvertimeCount(data.filter((e: TimeEntry) => (e.totalHours ?? 0) > 8).length);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
      toast.error('Failed to load time entries');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return;

    try {
      const response = await fetch(`/api/time-entries/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(t('deleteSuccess'));
        fetchEntries();
      } else {
        toast.error(t('deleteFailed'));
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error(t('deleteFailed'));
    }
  };

  const getStatus = (entry: TimeEntry) => {
    if (entry.clockOut) return null; // completed
    if (entry.lunchIn) return { label: t('backFromLunch'), color: 'bg-blue-100 text-blue-800' };
    if (entry.lunchOut) return { label: t('atLunch'), color: 'bg-orange-100 text-orange-800' };
    return { label: t('active'), color: 'bg-green-100 text-green-800' };
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-500 mt-4">{t('loadingEntries')}</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-500">{t('noEntries')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('worker')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('shiftStart')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('lunchOut')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('lunchIn')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('shiftEnd')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('totalHours')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {entries.map((entry: TimeEntry) => {
              const status = getStatus(entry);
              return (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {entry.worker?.name}
                      </div>
                      {entry.worker?.employeeId && (
                        <div className="text-xs text-gray-500">
                          {entry.worker.employeeId}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    <div>{formatDateOnly(entry.clockIn)}</div>
                    <div className="text-xs text-gray-500">{formatTimeOnly(entry.clockIn)}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {entry.lunchOut ? formatTimeOnly(entry.lunchOut) : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {entry.lunchIn ? formatTimeOnly(entry.lunchIn) : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {entry.clockOut ? (
                      formatTimeOnly(entry.clockOut)
                    ) : status ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {entry.totalHours !== null ? (
                      <div className="flex items-center gap-1.5">
                        <span>{entry.totalHours.toFixed(2)} hrs</span>
                        {entry.totalHours > 8 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700">
                            OT
                          </span>
                        )}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingEntry(entry)}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title={t('editTime')}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <span className="text-sm text-gray-600">
              {t('totalEntries')}: {entries.length}
            </span>
            {overtimeCount > 0 && (
              <span className="text-sm font-medium text-orange-600">
                OT entries: {overtimeCount}
              </span>
            )}
            <span className="text-sm font-semibold text-gray-900">
              {t('totalHours')}: {totalHours.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {editingEntry && (
        <EditTimeModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSaved={() => {
            setEditingEntry(null);
            fetchEntries();
          }}
        />
      )}
    </>
  );
}
