// Shared constants, types, and pure validation for grill events.
// No mongoose, no server-only — safe to import from client components.

export const EVENT_STATUSES = ['scheduled', 'live', 'cancelled', 'completed'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_KIND = ['grill'] as const;
export type EventKind = (typeof EVENT_KIND)[number];

export const EVENT_MIN_START_HOUR = 10;
export const EVENT_MAX_END_HOUR = 15;
export const EVENT_MIN_DURATION_HOURS = 2;
export const EVENT_MAX_DURATION_HOURS = 5;
export const EVENT_MESSAGE_MAX = 200;

export const EVENT_SUMMER_START_MONTH = 5; // June (0-indexed)
export const EVENT_SUMMER_END_MONTH = 8;   // September

export const DEFAULT_EVENT_MESSAGE =
  'Grilling outside today — show your receipt to enjoy.';

/** Formats a 24-hour integer as "11 AM" / "12 PM" / "3 PM". */
export function formatGrillHour(h: number): string {
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

const LA_TZ = 'America/Los_Angeles';

export function nowInLA(now: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: LA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  return {
    year:  get('year'),
    month: get('month') - 1,
    day:   get('day'),
    hour:  get('hour'),
  };
}

/** Parses YYYY-MM-DD as midnight in America/Los_Angeles (stored as UTC). */
export function parseLaDayString(yyyyMmDd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyyMmDd);
  if (!m) return null;
  const [, y, mo, d] = m;
  return new Date(`${y}-${mo}-${d}T07:00:00.000Z`);
}

export type SerializedEvent = {
  _id: string;
  kind: EventKind;
  date: string;
  startHour: number;
  endHour: number;
  message: string;
  status: EventStatus;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type EventInput = {
  date: string;
  startHour: number;
  endHour: number;
  message?: string;
};

export type ValidationError = { field: string; message: string };

export function validateEventInput(
  input: EventInput,
  opts?: { allowPastForEdit?: boolean },
): ValidationError[] {
  const errors: ValidationError[] = [];
  const date = parseLaDayString(input.date);
  if (!date || Number.isNaN(date.getTime())) {
    errors.push({ field: 'date', message: 'Pick a valid date.' });
    return errors;
  }

  const laParts = nowInLA(date);
  if (laParts.month < EVENT_SUMMER_START_MONTH || laParts.month > EVENT_SUMMER_END_MONTH) {
    errors.push({ field: 'date', message: 'Grill events run June 1 – September 30 only.' });
  }

  // Saturday & Sunday only — weekday grilling is not permitted.
  const dow = new Date(Date.UTC(laParts.year, laParts.month, laParts.day)).getUTCDay();
  if (dow !== 0 && dow !== 6) {
    errors.push({ field: 'date', message: 'Grill events run on Saturdays and Sundays only.' });
  }

  if (!opts?.allowPastForEdit) {
    const todayLa = nowInLA();
    const dateKey = laParts.year * 10000 + laParts.month * 100 + laParts.day;
    const todayKey = todayLa.year * 10000 + todayLa.month * 100 + todayLa.day;
    if (dateKey < todayKey) {
      errors.push({ field: 'date', message: 'Event date cannot be in the past.' });
    }
  }

  if (!Number.isInteger(input.startHour) || input.startHour < EVENT_MIN_START_HOUR || input.startHour > EVENT_MAX_END_HOUR) {
    errors.push({ field: 'startHour', message: `Start hour must be ${EVENT_MIN_START_HOUR}–${EVENT_MAX_END_HOUR}.` });
  }
  if (!Number.isInteger(input.endHour) || input.endHour < EVENT_MIN_START_HOUR || input.endHour > EVENT_MAX_END_HOUR) {
    errors.push({ field: 'endHour', message: `End hour must be ${EVENT_MIN_START_HOUR}–${EVENT_MAX_END_HOUR}.` });
  }
  if (input.endHour <= input.startHour) {
    errors.push({ field: 'endHour', message: 'End hour must be after start hour.' });
  } else {
    const duration = input.endHour - input.startHour;
    if (duration < EVENT_MIN_DURATION_HOURS || duration > EVENT_MAX_DURATION_HOURS) {
      errors.push({
        field: 'endHour',
        message: `Event window must be ${EVENT_MIN_DURATION_HOURS}–${EVENT_MAX_DURATION_HOURS} hours.`,
      });
    }
  }

  if (input.message !== undefined && input.message.length > EVENT_MESSAGE_MAX) {
    errors.push({ field: 'message', message: `Message must be ${EVENT_MESSAGE_MAX} characters or fewer.` });
  }
  return errors;
}

/** Next Saturday inside the summer window, formatted YYYY-MM-DD. */
export function nextSaturdayInSummer(now: Date = new Date()): string {
  const la = nowInLA(now);
  let probe = new Date(`${la.year}-${String(la.month + 1).padStart(2, '0')}-${String(la.day).padStart(2, '0')}T07:00:00.000Z`);
  for (let i = 0; i < 400; i++) {
    const parts = nowInLA(probe);
    const dow = new Date(Date.UTC(parts.year, parts.month, parts.day)).getUTCDay();
    const inSummer = parts.month >= EVENT_SUMMER_START_MONTH && parts.month <= EVENT_SUMMER_END_MONTH;
    if (i > 0 && dow === 6 && inSummer) {
      return `${parts.year}-${String(parts.month + 1).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
    }
    probe = new Date(probe.getTime() + 86400000);
  }
  const fallbackYear = la.month > EVENT_SUMMER_END_MONTH ? la.year + 1 : la.year;
  return `${fallbackYear}-06-01`;
}
