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
