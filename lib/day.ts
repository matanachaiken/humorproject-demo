// "Today" means today in New York, where our users live.
const TIME_ZONE = "America/New_York";

// Today's date in New York as YYYY-MM-DD.
export function nyToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now);
}

// The instant today started in New York, as an ISO string for queries.
export function nyDayStart(now = new Date()) {
  const offset = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    timeZoneName: "shortOffset",
  })
    .formatToParts(now)
    .find((part) => part.type === "timeZoneName")!.value; // e.g. "GMT-4"

  const match = offset.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  const isoOffset = match
    ? `${match[1]}${match[2].padStart(2, "0")}:${match[3] ?? "00"}`
    : "Z";

  return new Date(`${nyToday(now)}T00:00:00${isoOffset}`).toISOString();
}

// The instant the next New York day starts (when the new theme drops).
// 30 hours after today's start always lands in tomorrow, even across DST.
export function nyNextDayStart(now = new Date()) {
  return nyDayStart(new Date(Date.parse(nyDayStart(now)) + 30 * 3_600_000));
}

// "2026-10-14" -> "Tue, Oct 14". Dates are calendar days, so format in UTC.
export function formatDay(day: string, style: "short" | "long" = "short") {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: style === "long" ? "long" : "short",
    month: style === "long" ? "long" : "short",
    day: "numeric",
  }).format(new Date(`${day}T00:00:00Z`));
}
