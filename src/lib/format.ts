import { parseDay, type Day } from './dates';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "3 days", "1 day". */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count.toLocaleString()} ${count === 1 ? singular : pluralForm}`;
}

/** "Ada Lovelace" → "Ada". */
export function firstName(displayName: string | undefined | null): string {
  return displayName?.trim().split(/\s+/)[0] ?? '';
}

/** "July 2026". */
export function formatMonthYear(day: Day): string {
  const date = parseDay(day);
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** "July". */
export function formatMonth(day: Day): string {
  return MONTHS[parseDay(day).getMonth()] ?? '';
}
