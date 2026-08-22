export function formatMoney(
  cents: number | null | undefined,
  currency = "USD",
) {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) {
    return "Unavailable";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }

  return `${value >= 0 ? "+" : ""}${Math.round(value)}%`;
}

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
const zoneLessIsoTimestampPattern =
  /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?)$/;

/**
 * Product release dates are calendar dates, not instants. Parse them at UTC
 * midnight so a `YYYY-MM-DD` value cannot move to the prior day west of UTC.
 * Zone-less ISO/SQLite timestamps are also treated as UTC for deterministic
 * server and browser output.
 */
function parseDisplayDate(value: string): Date | null {
  let normalized = value;
  if (dateOnlyPattern.test(value)) {
    normalized = `${value}T00:00:00.000Z`;
  } else {
    const zoneLessTimestamp = value.match(zoneLessIsoTimestampPattern);
    if (zoneLessTimestamp) {
      normalized = `${zoneLessTimestamp[1]}T${zoneLessTimestamp[2]}Z`;
    }
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  if (dateOnlyPattern.test(value) && date.toISOString().slice(0, 10) !== value) {
    return null;
  }
  return date;
}

const compactDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function formatCompactDate(value: string | null | undefined) {
  if (!value) return "Not updated";
  const date = parseDisplayDate(value);
  if (!date) return "Unknown date";

  return compactDateFormatter.format(date);
}

/**
 * Relative output must receive the server render's reference instant. Passing
 * it through the client-component props keeps SSR and hydration byte-for-byte
 * stable instead of consulting `Date.now()` independently in each runtime.
 */
export function formatRelativeDate(
  value: string | null | undefined,
  relativeTo: string | number | Date,
) {
  if (!value) return "Not updated";
  const date = parseDisplayDate(value);
  const referenceDate =
    relativeTo instanceof Date
      ? relativeTo
      : typeof relativeTo === "string"
        ? parseDisplayDate(relativeTo)
        : new Date(relativeTo);
  if (
    !date ||
    !referenceDate ||
    Number.isNaN(referenceDate.getTime())
  ) {
    return "Unknown date";
  }

  const deltaDays = Math.round(
    (date.getTime() - referenceDate.getTime()) / 86_400_000,
  );
  const formatter = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

  if (Math.abs(deltaDays) < 1) return "today";
  if (Math.abs(deltaDays) < 30) return formatter.format(deltaDays, "day");
  const deltaMonths = Math.round(deltaDays / 30);
  if (Math.abs(deltaMonths) < 12) return formatter.format(deltaMonths, "month");
  return formatter.format(Math.round(deltaMonths / 12), "year");
}

/** Formats an ISO timestamp for an admin `datetime-local` field interpreted as UTC. */
export function formatUtcDateTimeInput(value: string | null | undefined) {
  if (!value) return "";
  const date = parseDisplayDate(value);
  return date ? date.toISOString().slice(0, 16) : "";
}

/** Converts an admin UTC wall-time field back to an unambiguous ISO instant. */
export function utcDateTimeInputToIso(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = parseDisplayDate(trimmed);
  if (!date || date.toISOString().slice(0, 16) !== trimmed.slice(0, 16)) {
    return null;
  }
  return date.toISOString();
}

export function centsFromInput(value: string) {
  const trimmed = value.trim().replace(/[$,]/g, "");
  if (!trimmed) return null;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}
