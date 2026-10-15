import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getUserAndProfile } from "@/lib/auth";
import { formatDay } from "@/lib/day";
import { generationColumns, toRiffs, type GenerationRow } from "@/lib/generations";
import RiffGrid from "@/app/_components/RiffGrid";
import RiffView from "./RiffView";

// Shared by generateMetadata and the page, so the riff is only fetched once.
const getRiff = cache(async (rawId: string) => {
  const id = Number(rawId);
  const { supabase, user } = await getUserAndProfile();
  if (!Number.isInteger(id) || id <= 0) return null;

  const { data } = await supabase
    .from("generations")
    .select(generationColumns(Boolean(user)))
    .eq("id", id)
    .maybeSingle<GenerationRow>();
  if (!data) return null;

  const [riff] = await toRiffs(supabase, user?.id ?? null, [data]);
  return { supabase, user, row: data, riff };
});

export async function generateMetadata({ params }: PageProps<"/g/[id]">): Promise<Metadata> {
  const found = await getRiff((await params).id);
  if (!found) return { title: "Riff not found" };
  const { riff } = found;
  const description = `“${riff.idea}” by ${riff.creator}, for the theme “${riff.theme}”. Vote on it on Daily Riff.`;
  return {
    title: riff.caption,
    description,
    openGraph: { title: riff.caption, description, images: [{ url: riff.imageUrl, width: 1024, height: 1024 }] },
    twitter: { card: "summary_large_image", title: riff.caption, description, images: [riff.imageUrl] },
  };
}

export default async function RiffPage({ params }: PageProps<"/g/[id]">) {
  const found = await getRiff((await params).id);
  if (!found) notFound();
  const { supabase, user, row, riff } = found;

  // A few more from the same day's theme, best first.
  const { data: siblings } = await supabase
    .from("generations")
    .select(generationColumns(Boolean(user)))
    .eq("theme", row.theme)
    .neq("id", row.id)
    .order("score", { ascending: false })
    .limit(6)
    .overrideTypes<GenerationRow[], { merge: false }>();
  const more = await toRiffs(supabase, user?.id ?? null, siblings ?? []);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <Link href="/feed" className="mb-6 inline-block text-sm font-medium text-muted hover:text-ink">
        ← Back to the feed
      </Link>
      <RiffView riff={riff} dayLabel={formatDay(riff.day, "long")} signedIn={Boolean(user)} />

      {more.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-5 font-display text-2xl font-bold">More riffs on “{riff.theme}”</h2>
          <RiffGrid riffs={more} signedIn={Boolean(user)} />
        </section>
      )}
    </main>
  );
}
