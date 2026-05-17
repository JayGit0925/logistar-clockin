import { describe, it, expect } from 'vitest';
import { buildTimeEntryCsv, type CsvEntry } from './csv';

const baseEntry: CsvEntry = {
  clockIn: new Date('2026-05-16T13:00:00Z'),
  lunchOut: new Date('2026-05-16T16:00:00Z'),
  lunchIn: new Date('2026-05-16T16:30:00Z'),
  clockOut: new Date('2026-05-16T21:00:00Z'),
  totalHours: 7.5,
  worker: {
    name: 'Jay Li',
    employeeId: '001',
    company: 'Logistar',
    payType: 'HOURLY',
    hourlyRate: '25.00',
    annualSalary: null,
  },
};

describe('buildTimeEntryCsv', () => {
  it('emits the header row', () => {
    const csv = buildTimeEntryCsv([]);
    expect(csv.split('\n')[0]).toBe(
      'Worker Name,Employee ID,Company,Shift Start,Lunch Out,Lunch In,Shift End,Total Hours,Pay Type,Rate,Gross Pay'
    );
  });

  it('computes gross pay for hourly workers as hours * rate', () => {
    const csv = buildTimeEntryCsv([baseEntry]);
    const cells = csv.split('\n')[1].split(',');
    expect(cells[8]).toBe('"HOURLY"');
    expect(cells[9]).toBe('"25.00"');
    expect(cells[10]).toBe('"187.50"');
  });

  it('leaves gross pay blank for SALARY workers', () => {
    const csv = buildTimeEntryCsv([
      { ...baseEntry, worker: { ...baseEntry.worker, payType: 'SALARY', hourlyRate: null, annualSalary: '65000.00' } },
    ]);
    const cells = csv.split('\n')[1].split(',');
    expect(cells[8]).toBe('"SALARY"');
    expect(cells[9]).toBe('""');
    expect(cells[10]).toBe('""');
  });

  it('shows Active when clockOut is null and gross pay blank', () => {
    const csv = buildTimeEntryCsv([
      { ...baseEntry, clockOut: null, totalHours: null },
    ]);
    const cells = csv.split('\n')[1].split(',');
    expect(cells[6]).toBe('"Active"');
    expect(cells[7]).toBe('"-"');
    expect(cells[10]).toBe('""');
  });

  it('quotes commas inside worker name safely', () => {
    const csv = buildTimeEntryCsv([
      { ...baseEntry, worker: { ...baseEntry.worker, name: 'Doe, Jane' } },
    ]);
    expect(csv.split('\n')[1].startsWith('"Doe, Jane",')).toBe(true);
  });
});
