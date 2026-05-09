import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'America/New_York';
export const LUNCH_START_HOUR = 12;
export const LUNCH_START_MIN = 30;
export const LUNCH_END_HOUR = 13;
export const LUNCH_END_MIN = 0;

export interface TotalHoursInput {
  clockIn: Date;
  clockOut: Date | null;
  lunchOut: Date | null;
  lunchIn: Date | null;
  paidLunch: boolean;
}

export function calculateTotalHours(input: TotalHoursInput): number | null {
  if (!input.clockOut) return null;
  const shiftMs = input.clockOut.getTime() - input.clockIn.getTime();
  let lunchMs = 0;
  if (!input.paidLunch) {
    if (input.lunchOut && input.lunchIn) {
      lunchMs = input.lunchIn.getTime() - input.lunchOut.getTime();
    } else if (input.lunchOut && !input.lunchIn) {
      lunchMs = input.clockOut.getTime() - input.lunchOut.getTime();
    }
  }
  const hours = (shiftMs - lunchMs) / (1000 * 60 * 60);
  return Math.max(0, Math.round(hours * 100) / 100);
}

export function shiftSpansLunchWindow(clockIn: Date, clockOut: Date): boolean {
  const day = dayjs(clockIn).tz(TZ);
  const lunchStart = day
    .hour(LUNCH_START_HOUR)
    .minute(LUNCH_START_MIN)
    .second(0)
    .millisecond(0);
  const lunchEnd = day
    .hour(LUNCH_END_HOUR)
    .minute(LUNCH_END_MIN)
    .second(0)
    .millisecond(0);
  return (
    (dayjs(clockIn).isBefore(lunchStart) || dayjs(clockIn).isSame(lunchStart))
    && (dayjs(clockOut).isAfter(lunchEnd) || dayjs(clockOut).isSame(lunchEnd))
  );
}

export interface PaidLunchStampInput {
  clockIn: Date;
  clockOut: Date | null;
  paidLunch: boolean;
}

export function applyPaidLunchStamps(input: PaidLunchStampInput): {
  lunchOut: Date | null;
  lunchIn: Date | null;
} {
  if (!input.paidLunch || !input.clockOut) {
    return { lunchOut: null, lunchIn: null };
  }
  if (!shiftSpansLunchWindow(input.clockIn, input.clockOut)) {
    return { lunchOut: null, lunchIn: null };
  }
  const day = dayjs(input.clockIn).tz(TZ);
  const lunchOut = day
    .hour(LUNCH_START_HOUR)
    .minute(LUNCH_START_MIN)
    .second(0)
    .millisecond(0)
    .toDate();
  const lunchIn = day
    .hour(LUNCH_END_HOUR)
    .minute(LUNCH_END_MIN)
    .second(0)
    .millisecond(0)
    .toDate();
  return { lunchOut, lunchIn };
}
