export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="9" fill="#ff5a1f" />
      <path
        d="M11 7h10a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-6.5L10 25v-4.2A4 4 0 0 1 7 17v-6a4 4 0 0 1 4-4z"
        fill="#fff"
      />
      <path
        d="M16 9.5l1.3 3.2 3.2 1.3-3.2 1.3-1.3 3.2-1.3-3.2-3.2-1.3 3.2-1.3z"
        fill="#ff5a1f"
      />
    </svg>
  );
}

export default function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="font-display text-xl font-extrabold tracking-tight">Daily Riff</span>
    </span>
  );
}
