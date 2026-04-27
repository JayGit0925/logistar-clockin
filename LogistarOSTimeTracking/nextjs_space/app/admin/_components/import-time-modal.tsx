'use client';

import { useState, useRef } from 'react';
import { X, Upload, Download } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = 'America/New_York';

interface ImportTimeModalProps {
  onClose: () => void;
  onSaved: () => void;
}

interface ImportRow {
  workerName: string;
  date: string;
  clockIn: string;
  lunchOut?: string;
  lunchIn?: string;
  clockOut?: string;
}

export function ImportTimeModal({ onClose, onSaved }: ImportTimeModalProps) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [preview, setPreview] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState('');

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['workerName', 'date', 'clockIn', 'lunchOut', 'lunchIn', 'clockOut'],
      ['John Smith', '2026-04-27', '08:00', '12:00', '13:00', '17:00'],
      ['Jane Doe', '2026-04-27', '09:00', '', '', ''],
    ]);
    ws['!cols'] = [20, 12, 8, 8, 8, 8].map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(wb, ws, 'TimeEntries');
    XLSX.writeFile(wb, 'time-entry-template.xlsx');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      if (!sheet) {
        toast.error('No sheet found in Excel file');
        return;
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

      if (rows.length === 0) {
        toast.error('No data found in Excel file');
        return;
      }

      const importRows: ImportRow[] = rows
        .filter((row) => row.workerName || row.name)
        .map((row) => {
          const workerName = (row.workerName || row.name || '').toString().trim();
          const dateStr = parseExcelDate(row.date);
          const clockInStr = parseExcelTime(row.clockIn, dateStr);
          const lunchOutStr = row.lunchOut ? parseExcelTime(row.lunchOut, dateStr) : undefined;
          const lunchInStr = row.lunchIn ? parseExcelTime(row.lunchIn, dateStr) : undefined;
          const clockOutStr = row.clockOut ? parseExcelTime(row.clockOut, dateStr) : undefined;

          return {
            workerName,
            date: dateStr,
            clockIn: clockInStr,
            lunchOut: lunchOutStr,
            lunchIn: lunchInStr,
            clockOut: clockOutStr,
          };
        });

      setPreview(importRows);
      setFileName(file.name);
      toast.success(`Loaded ${importRows.length} rows`);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Failed to read Excel file');
    }
  };

  const parseExcelDate = (dateVal: any): string => {
    if (!dateVal) return '';

    if (typeof dateVal === 'string') {
      const d = dayjs(dateVal);
      if (d.isValid()) return d.format('YYYY-MM-DD');
    } else if (typeof dateVal === 'number') {
      const excelDate = new Date((dateVal - 25569) * 86400 * 1000);
      return dayjs(excelDate).format('YYYY-MM-DD');
    }
    return '';
  };

  const parseExcelTime = (timeVal: any, dateStr: string): string => {
    if (!timeVal || !dateStr) return '';

    if (typeof timeVal === 'string') {
      const d = dayjs.tz(`${dateStr} ${timeVal}`, 'YYYY-MM-DD HH:mm', TIMEZONE);
      if (d.isValid()) return d.toISOString();
    } else if (typeof timeVal === 'number') {
      const hours = Math.floor(timeVal * 24);
      const minutes = Math.floor((timeVal * 24 - hours) * 60);
      const d = dayjs.tz(`${dateStr} ${hours}:${minutes}`, 'YYYY-MM-DD HH:mm', TIMEZONE);
      if (d.isValid()) return d.toISOString();
    }
    return '';
  };

  const handleImport = async () => {
    if (preview.length === 0) {
      toast.error('No data to import');
      return;
    }

    setIsImporting(true);
    try {
      const response = await fetch('/api/admin/import-time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: preview,
          overwrite: true,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Imported ${result.count} entries successfully`);
        onSaved();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Import failed');
      }
    } catch (error) {
      console.error('Error importing:', error);
      toast.error('Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 z-10 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6 sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-900">{t('importTimeEntries')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {preview.length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
              <div className="flex flex-col items-center">
                <Upload className="w-12 h-12 text-gray-400 mb-3" />
                <p className="text-gray-600 text-sm mb-4">{t('selectExcelFile')}</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                >
                  {t('chooseFile')}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors text-sm mt-2"
                >
                  <Download className="w-4 h-4" />
                  {t('downloadTemplate')}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                {t('selectedFile')}: <strong>{fileName}</strong>
              </p>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left">Worker</th>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Clock In</th>
                      <th className="px-3 py-2 text-left">Lunch Out</th>
                      <th className="px-3 py-2 text-left">Lunch In</th>
                      <th className="px-3 py-2 text-left">Clock Out</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {preview.slice(0, 10).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-900">{row.workerName}</td>
                        <td className="px-3 py-2 text-gray-600">{row.date}</td>
                        <td className="px-3 py-2 text-gray-600 text-xs">
                          {row.clockIn ? dayjs(row.clockIn).format('HH:mm') : '-'}
                        </td>
                        <td className="px-3 py-2 text-gray-600 text-xs">
                          {row.lunchOut ? dayjs(row.lunchOut).format('HH:mm') : '-'}
                        </td>
                        <td className="px-3 py-2 text-gray-600 text-xs">
                          {row.lunchIn ? dayjs(row.lunchIn).format('HH:mm') : '-'}
                        </td>
                        <td className="px-3 py-2 text-gray-600 text-xs">
                          {row.clockOut ? dayjs(row.clockOut).format('HH:mm') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.length > 10 && (
                <p className="text-xs text-gray-500 text-center">
                  Showing 10 of {preview.length} entries
                </p>
              )}
              <p className="text-xs text-blue-600 bg-blue-50 p-3 rounded">
                {t('importWarning')}: {t('willOverwrite')}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6 sticky bottom-0 bg-white pt-4 border-t">
          {preview.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setPreview([]);
                setFileName('');
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              {t('selectDifferent')}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            {t('cancel')}
          </button>
          {preview.length > 0 && (
            <button
              type="button"
              onClick={handleImport}
              disabled={isImporting}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
            >
              {isImporting ? t('importing') : t('importNow')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
