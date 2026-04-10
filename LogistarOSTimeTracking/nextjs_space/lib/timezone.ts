import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = 'America/New_York';

export function getNowInET() {
  return dayjs().tz(TIMEZONE);
}

export function formatDateForDisplay(date: Date | string) {
  return dayjs(date).tz(TIMEZONE).format('MM/DD/YYYY h:mm A');
}

export function formatTimeOnly(date: Date | string) {
  return dayjs(date).tz(TIMEZONE).format('h:mm A');
}

export function formatDateOnly(date: Date | string) {
  return dayjs(date).tz(TIMEZONE).format('MM/DD/YYYY');
}

export function getDateString(date: Date | string) {
  return dayjs(date).tz(TIMEZONE).format('YYYY-MM-DD');
}

export function convertToET(date: Date | string) {
  return dayjs(date).tz(TIMEZONE).toDate();
}

export { TIMEZONE };
