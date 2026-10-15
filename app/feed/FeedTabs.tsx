"use client";

import Link from "next/link";
import { useState } from "react";
import { TABS, type Tab } from "./tabs";

export default function FeedTabs({ tab }: { tab: Tab }) {
  // Highlight the clicked tab right away instead of after the server answers.
  // Once the page arrives with the new tab, `from` no longer matches and it's ignored.
  const [clicked, setClicked] = useState<{ from: Tab; to: Tab } | null>(null);
  const active = clicked?.from === tab ? clicked.to : tab;

  return (
    <nav className="flex gap-1 rounded-full border border-line bg-surface p-1 text-sm font-medium">
      {(Object.keys(TABS) as Tab[]).map((key) => (
        <Link
          key={key}
          href={key === "today" ? "/feed" : `/feed?tab=${key}`}
          onClick={() => setClicked({ from: tab, to: key })}
          aria-current={active === key ? "page" : undefined}
          className={`rounded-full px-4 py-2 transition-colors ${
            active === key ? "bg-ink text-bg" : "text-muted hover:text-ink"
          }`}
        >
          {TABS[key]}
        </Link>
      ))}
    </nav>
  );
}
