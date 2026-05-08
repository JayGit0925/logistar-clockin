import { describe, it, expect } from 'vitest';
import {
  calculateTotalHours,
  shiftSpansLunchWindow,
  applyPaidLunchStamps,
} from './total-hours';

const D = (s: string) => new Date(s);

describe('calculateTotalHours — paidLunch=false (default)', () => {
  it('returns null when clockOut missing', () => {
    expect(
      calculateTotalHours({
        clockIn: D('2026-05-08T13:00:00Z'),
        clockOut: null,
        lunchOut: null,
        lunchIn: null,
        paidLunch: false,
      })
    ).toBeNull();
  });

  it('subtracts lunch interval when both lunchOut and lunchIn set', () => {
    expect(
      calculateTotalHours({
        clockIn: D('2026-05-08T13:00:00Z'),
        clockOut: D('2026-05-08T21:00:00Z'),
        lunchOut: D('2026-05-08T16:00:00Z'),
        lunchIn: D('2026-05-08T16:30:00Z'),
        paidLunch: false,
      })
    ).toBe(7.5);
  });

  it('does not subtract when lunch fields null', () => {
    expect(
      calculateTotalHours({
        clockIn: D('2026-05-08T13:00:00Z'),
        clockOut: D('2026-05-08T21:00:00Z'),
        lunchOut: null,
        lunchIn: null,
        paidLunch: false,
      })
    ).toBe(8);
  });

  it('clamps negative durations to 0', () => {
    expect(
      calculateTotalHours({
        clockIn: D('2026-05-08T21:00:00Z'),
        clockOut: D('2026-05-08T13:00:00Z'),
        lunchOut: null,
        lunchIn: null,
        paidLunch: false,
      })
    ).toBe(0);
  });
});

describe('calculateTotalHours — paidLunch=true', () => {
  it('ignores lunch fields entirely (full shift counted)', () => {
    expect(
      calculateTotalHours({
        clockIn: D('2026-05-08T13:00:00Z'),
        clockOut: D('2026-05-08T21:00:00Z'),
        lunchOut: D('2026-05-08T16:30:00Z'),
        lunchIn: D('2026-05-08T17:00:00Z'),
        paidLunch: true,
      })
    ).toBe(8);
  });

  it('returns full shift even when lunch fields null', () => {
    expect(
      calculateTotalHours({
        clockIn: D('2026-05-08T13:00:00Z'),
        clockOut: D('2026-05-08T21:00:00Z'),
        lunchOut: null,
        lunchIn: null,
        paidLunch: true,
      })
    ).toBe(8);
  });
});

describe('shiftSpansLunchWindow (America/New_York 12:30–13:00)', () => {
  it('true when shift fully spans 12:30–13:00 ET', () => {
    expect(
      shiftSpansLunchWindow(D('2026-05-08T13:00:00Z'), D('2026-05-08T21:00:00Z'))
    ).toBe(true);
  });

  it('false when shift starts after 12:30 ET', () => {
    expect(
      shiftSpansLunchWindow(D('2026-05-08T17:30:00Z'), D('2026-05-08T22:00:00Z'))
    ).toBe(false);
  });

  it('false when shift ends before 13:00 ET', () => {
    expect(
      shiftSpansLunchWindow(D('2026-05-08T13:00:00Z'), D('2026-05-08T16:45:00Z'))
    ).toBe(false);
  });
});

describe('applyPaidLunchStamps', () => {
  it('stamps 12:30 and 13:00 ET when paidLunch=true and shift spans', () => {
    const result = applyPaidLunchStamps({
      clockIn: D('2026-05-08T13:00:00Z'),
      clockOut: D('2026-05-08T21:00:00Z'),
      paidLunch: true,
    });
    expect(result.lunchOut?.toISOString()).toBe('2026-05-08T16:30:00.000Z');
    expect(result.lunchIn?.toISOString()).toBe('2026-05-08T17:00:00.000Z');
  });

  it('returns nulls when paidLunch=false', () => {
    const result = applyPaidLunchStamps({
      clockIn: D('2026-05-08T13:00:00Z'),
      clockOut: D('2026-05-08T21:00:00Z'),
      paidLunch: false,
    });
    expect(result.lunchOut).toBeNull();
    expect(result.lunchIn).toBeNull();
  });

  it('returns nulls when shift does not span window', () => {
    const result = applyPaidLunchStamps({
      clockIn: D('2026-05-08T18:00:00Z'),
      clockOut: D('2026-05-08T22:00:00Z'),
      paidLunch: true,
    });
    expect(result.lunchOut).toBeNull();
    expect(result.lunchIn).toBeNull();
  });
});
