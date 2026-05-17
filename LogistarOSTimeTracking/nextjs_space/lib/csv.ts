import { formatDateForDisplay } from './timezone';

export type CsvWorker = {
  name: string;
  employeeId: string | null;
  company: string | null;
  payType: 'HOURLY' | 'SALARY';
  hourlyRate: string | null;   // Decimal serialized
  annualSalary: string | null;
};

export type CsvEntry = {
  clockIn: Date;
  lunchOut: Date | null;
  lunchIn: Date | null;
  clockOut: Date | null;
  totalHours: number | null;
  worker: CsvWorker;
};

const HEADER =
  'Worker Name,Employee ID,Company,Shift Start,Lunch Out,Lunch In,Shift End,Total Hours,Pay Type,Rate,Gross Pay';

function q(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '""';
  return `"${String(v).replace(/"/g, '""')}"`;
}

function grossPay(entry: CsvEntry): string {
  if (entry.worker.payType !== 'HOURLY') return '';
  if (entry.totalHours === null || entry.worker.hourlyRate === null) return '';
  const rate = Number(entry.worker.hourlyRate);
  if (!Number.isFinite(rate)) return '';
  return (entry.totalHours * rate).toFixed(2);
}

export function buildTimeEntryCsv(entries: CsvEntry[]): string {
  const rows = entries.map((entry) => {
    const w = entry.worker;
    return [
      q(w.name),
      q(w.employeeId ?? ''),
      q(w.company ?? ''),
      q(formatDateForDisplay(entry.clockIn)),
      q(entry.lunchOut ? formatDateForDisplay(entry.lunchOut) : ''),
      q(entry.lunchIn ? formatDateForDisplay(entry.lunchIn) : ''),
      q(entry.clockOut ? formatDateForDisplay(entry.clockOut) : 'Active'),
      q(entry.totalHours !== null ? entry.totalHours.toFixed(2) : '-'),
      q(w.payType),
      q(w.hourlyRate ?? ''),
      q(grossPay(entry)),
    ].join(',');
  });
  return [HEADER, ...rows].join('\n');
}
