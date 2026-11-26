export const PRICE_FREEZE_START = {
  year: 2024,
  month: 8,
  day: 1,
};

const TUCUMAN_OFFSET_MS = -3 * 60 * 60 * 1000;

function getTucumanCalendarDate(date) {
  const shifted = new Date(date.getTime() + TUCUMAN_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function isBeforeStartDate(current, start) {
  if (current.year !== start.year) return current.year < start.year;
  if (current.month !== start.month) return current.month < start.month;
  return current.day < start.day;
}

export function getPriceFreezeDuration(now = new Date()) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    return { years: 0, months: 0, days: 0 };
  }

  const current = getTucumanCalendarDate(now);
  if (isBeforeStartDate(current, PRICE_FREEZE_START)) {
    return { years: 0, months: 0, days: 0 };
  }

  let years = current.year - PRICE_FREEZE_START.year;
  let months = current.month - PRICE_FREEZE_START.month;
  let days = current.day - PRICE_FREEZE_START.day;

  if (days < 0) {
    months -= 1;
    const daysInPreviousMonth = new Date(Date.UTC(current.year, current.month - 1, 0)).getUTCDate();
    days += daysInPreviousMonth;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years, months, days };
}

export function formatFreezeUnit(value, singular, plural) {
  return value === 1 ? singular : plural;
}
