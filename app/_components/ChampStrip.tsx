import Link from "next/link";
import { formatDay } from "@/lib/day";

// A one-line shout-out to the most recent daily winner.
export default function ChampStrip({
  id,
  day,
  caption,
  creator,
  score,
  imageUrl,
}: {
  id: number;
  day: string;
  caption: string;
  creator: string;
  score: number;
  imageUrl: string;
}) {
  return (
    <Link
      href={`/g/${id}`}
      className="group flex items-center gap-4 rounded-3xl border border-amber-300/60 bg-amber-50 p-3 pr-5 transition-colors hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:hover:bg-amber-500/15"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold tracking-wider text-amber-700 uppercase dark:text-amber-400">
          🏆 Champ of {formatDay(day)}
        </p>
        <p className="truncate font-semibold">{caption}</p>
        <p className="truncate text-sm text-muted">
          by {creator} · +{score}
        </p>
      </div>
      <span className="hidden text-sm font-medium text-amber-700 group-hover:underline sm:inline dark:text-amber-400">
        Hall of Fame →
      </span>
    </Link>
  );
}
