import { LEVELS } from "@/lib/progression";

export default function LevelBadge({ level }: { level: number }) {
  const title = LEVELS.find((l) => l.level === level)?.title;
  return (
    <span
      title={`Level ${level}${title ? ` · ${title}` : ""}`}
      className={`inline-block rounded-full px-1.5 py-px align-[1px] text-[10px] font-bold tabular-nums ${
        level >= 10
          ? "bg-gradient-to-r from-pink-400 via-amber-300 to-cyan-400 text-black"
          : level >= 7
            ? "bg-amber-400 text-black"
            : level >= 5
              ? "bg-brand text-white"
              : "bg-surface-2 text-muted ring-1 ring-line"
      }`}
    >
      Lv {level}
    </span>
  );
}
