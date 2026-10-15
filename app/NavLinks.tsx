"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const icons = {
  feed: (
    <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
  ),
  battle: (
    <path d="M13 3 5 13h6l-1 8 8-10h-6l1-8z" />
  ),
  trophy: (
    <path d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M8 20h8M9.5 17h5" />
  ),
  me: (
    <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0" />
  ),
};

type Item = { href: string; label: string; short?: string; icon: keyof typeof icons };

export default function NavLinks({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const items: Item[] = [
    { href: "/feed", label: "Feed", icon: "feed" },
    { href: "/battle", label: "Which is funnier?", short: "Battle", icon: "battle" },
    { href: "/hall-of-fame", label: "Hall of Fame", icon: "trophy" },
    signedIn
      ? { href: "/me", label: "My riffs", icon: "me" }
      : { href: "/login", label: "Sign in", icon: "me" },
  ];
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Desktop: inline in the header. "Me" lives on the avatar instead. */}
      <nav className="hidden items-center gap-1 text-sm font-medium sm:flex">
        {items.slice(0, 3).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={`rounded-full px-4 py-2 transition-colors ${
              isActive(item.href)
                ? "bg-ink text-bg"
                : "text-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Phones: a tab bar along the bottom, within thumb reach. */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
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
            {item.short ?? item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
