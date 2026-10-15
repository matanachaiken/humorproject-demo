// Shared by the page (server) and FeedTabs (client). It lives outside the
// "use client" file because the server only sees references to client exports.
export const TABS = {
  today: "Today's top",
  new: "Newest",
  all: "All-time top",
} as const;
export type Tab = keyof typeof TABS;
