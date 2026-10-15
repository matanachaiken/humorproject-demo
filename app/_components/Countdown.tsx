"use client";

import { useSyncExternalStore } from "react";

function subscribe(onTick: () => void) {
  const timer = setInterval(onTick, 1000);
  return () => clearInterval(timer);
}
const nowInSeconds = () => Math.floor(Date.now() / 1000);

// "New theme in 5h 12m", ticking. Renders nothing on the server so the
// server and browser clocks never disagree during hydration.
export default function Countdown({ until }: { until: string }) {
  const now = useSyncExternalStore(subscribe, nowInSeconds, () => null);
  if (now === null) return null;

  const left = Math.max(0, Math.floor(Date.parse(until) / 1000) - now);
  if (left === 0) return <>New theme is live. Refresh!</>;
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  return <>New theme in {h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`}</>;
}
