/** Calendar days are `YYYY-MM-DD` strings in the device's local timezone. */
export type Day = string;

const pad = (value: number) => String(value).padStart(2, '0');

export function toDay(date: Date = new Date()): Day {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDay(day: Day): Date {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, date ?? 1);
}

export function addDays(day: Day, amount: number): Day {
  const date = parseDay(day);
  date.setDate(date.getDate() + amount);
  return toDay(date);
}

export function today(): Day {
  return toDay();
}

export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Thursday" / "Today" / "Yesterday" / "Tomorrow". */
export function relativeDayName(day: Day): string {
  const now = today();
  if (day === now) return 'Today';
  if (day === addDays(now, -1)) return 'Yesterday';
  if (day === addDays(now, 1)) return 'Tomorrow';
  return WEEKDAYS[parseDay(day).getDay()] ?? '';
}

/** "Thu, Sep 25". */
export function formatDayShort(day: Day): string {
  const date = parseDay(day);
  return `${WEEKDAYS[date.getDay()]?.slice(0, 3)}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

/** "Sep 25". */
export function formatMonthDay(day: Day): string {
  const date = parseDay(day);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

/** Single-letter weekday for dot rows: M T W T F S S. */
export function weekdayInitial(day: Day): string {
  return (WEEKDAYS[parseDay(day).getDay()] ?? ' ').charAt(0);
}

/** "2m", "3h", "4d", then "Sep 2". */
export function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 7 * 86_400) return `${Math.floor(seconds / 86_400)}d`;
  return formatMonthDay(toDay(new Date(iso)));
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(day: Day): number {
  const weekday = parseDay(day).getDay();
  return weekday === 0 ? 7 : weekday;
}

/** Monday of the ISO week containing `day`. */
export function weekStart(day: Day): Day {
  return addDays(day, 1 - isoWeekday(day));
}

/** "Thursday, September 25". */
export function formatDayLong(day: Day): string {
  const date = parseDay(day);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

/** "Good morning" etc., by the device clock. */
export function greeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}
