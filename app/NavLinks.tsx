"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const icons = {
  feed: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
  battle: <path d="M13 3 5 13h6l-1 8 8-10h-6l1-8z" />,
  trophy: (
    <path d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M8 20h8M9.5 17h5" />
  ),
  me: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0" />,
  room: (
    <path d="M4 10h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9zM4 10l1.5-5 15 3.5L20 10M9 5.6l-1 4.2M14 6.8l-1 3.2" />
  ),
};

type Item = {
  href: string;
  label: string;
  short?: string;
  icon: keyof typeof icons;
  locked?: boolean;
};

// "header" renders the inline desktop links; "tabbar" the phone tab bar. The
// tab bar must sit outside the header: the header's backdrop-filter would make
// it the containing block for `position: fixed`, pinning the bar to the header.
export default function NavLinks({
  signedIn,
  writersLocked,
  variant,
}: {
  signedIn: boolean;
  writersLocked: boolean;
  variant: "header" | "tabbar";
}) {
  const pathname = usePathname();
  const items: Item[] = [
    { href: "/feed", label: "Feed", icon: "feed" },
    { href: "/battle", label: "Which is funnier?", short: "Battle", icon: "battle" },
    { href: "/hall-of-fame", label: "Hall of Fame", icon: "trophy" },
    {
      href: "/writers-room",
      label: "Writers' Room",
      short: "Writers",
      icon: "room",
      locked: writersLocked,
    },
    signedIn
      ? { href: "/me", label: "My riffs", icon: "me" }
      : { href: "/login", label: "Sign in", icon: "me" },
  ];
  // Highlight the clicked item right away instead of after the page arrives.
  // Once the URL changes, `from` no longer matches and it's ignored.
  const [clicked, setClicked] = useState<{ from: string; to: string } | null>(null);
  const current = clicked?.from === pathname ? clicked.to : pathname;
  const isActive = (href: string) => current === href || current.startsWith(`${href}/`);

  if (variant === "header") {
    // Wide screens only. "Me" lives on the avatar instead.
    return (
      <nav className="hidden items-center gap-1 text-sm font-medium lg:flex">
        {items.slice(0, 4).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setClicked({ from: pathname, to: item.href })}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={`rounded-full px-3 py-2 whitespace-nowrap transition-colors xl:px-4 ${
              isActive(item.href)
                ? "bg-ink text-bg"
                : "text-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <span className="xl:hidden">{item.short ?? item.label}</span>
            <span className="hidden xl:inline">{item.label}</span>
            {item.locked && <span aria-label="locked"> 🔒</span>}
          </Link>
        ))}
      </nav>
    );
  }

  // Phones and tablets: a tab bar along the bottom, within thumb reach.
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setClicked({ from: pathname, to: item.href })}
          aria-current={isActive(item.href) ? "page" : undefined}
          className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
            isActive(item.href) ? "text-brand" : "text-muted"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {icons[item.icon]}
          </svg>
          {item.locked && (
            <span
              aria-label="locked"
              className="absolute top-1 right-[calc(50%-1.4rem)] text-[10px]"
            >
              🔒
            </span>
          )}
          {item.short ?? item.label}
        </Link>
      ))}
    </nav>
  );
}
