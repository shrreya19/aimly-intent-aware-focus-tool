/**
 * Date and Timezone Utilities for Aimly
 * Ensures user's local date is used for all day-based streak and cap calculations.
 */

export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(str) {
  if (typeof str !== 'string' || !DATE_REGEX.test(str)) return false;
  const d = new Date(`${str}T00:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().startsWith(str);
}

export function formatDateString(d, timezone = null) {
  if (!d) return null;
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return null;

  if (timezone) {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(dateObj);
    } catch {
      // Fallback to UTC if invalid timezone
    }
  }
  return dateObj.toISOString().split('T')[0];
}

/**
 * Derives the local YYYY-MM-DD date for a user request
 * Priority: validated clientDate > user timezone > UTC fallback
 */
export function getLocalTodayString(clientDate = null, timezone = null) {
  if (clientDate && isValidDateString(clientDate)) {
    return clientDate;
  }
  return formatDateString(new Date(), timezone);
}

/**
 * Returns integer calendar days difference between dateA and dateB (B - A)
 * e.g. daysBetween('2026-11-17', '2026-11-18') === 1
 */
export function daysBetween(dateStrA, dateStrB) {
  if (!dateStrA || !dateStrB) return 0;
  const a = new Date(`${dateStrA}T00:00:00Z`);
  const b = new Date(`${dateStrB}T00:00:00Z`);
  const diffMs = b.getTime() - a.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Adds integer days to a YYYY-MM-DD string
 */
export function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

