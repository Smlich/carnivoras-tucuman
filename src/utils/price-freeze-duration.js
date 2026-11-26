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

function normalizeStartDate(startDate) {
  if (!startDate) return PRICE_FREEZE_START;

  if (typeof startDate === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate.trim());
    if (!match) return PRICE_FREEZE_START;
    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
    };
  }

  if (
    Number.isInteger(startDate.year)
    && Number.isInteger(startDate.month)
    && Number.isInteger(startDate.day)
  ) {
    return startDate;
  }

  return PRICE_FREEZE_START;
}

function isBeforeStartDate(current, start) {
  if (current.year !== start.year) return current.year < start.year;
  if (current.month !== start.month) return current.month < start.month;
  return current.day < start.day;
}

export function getPriceFreezeDuration(now = new Date(), startDate = PRICE_FREEZE_START) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    return { years: 0, months: 0, days: 0 };
  }

  const start = normalizeStartDate(startDate);
  const current = getTucumanCalendarDate(now);
  if (isBeforeStartDate(current, start)) {
    return { years: 0, months: 0, days: 0 };
  }

  let years = current.year - start.year;
  let months = current.month - start.month;
  let days = current.day - start.day;

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
