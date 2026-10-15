"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import ShareButton from "@/app/_components/ShareButton";
import { createGeneration, type GenerateState } from "./actions";

const COOKING_LINES = [
  "Reading your idea…",
  "Writing the perfect prompt…",
  "Sketching the scene…",
  "Adding questionable details…",
  "Workshopping the caption…",
  "Almost there…",
];

export default function GenerateForm({
  remaining,
  limit,
}: {
  remaining: number;
  limit: number;
}) {
  const [state, formAction, pending] = useActionState<GenerateState, FormData>(
    createGeneration,
    null
  );
  const [line, setLine] = useState(0);
  const outOfCreations = remaining <= 0;

  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => setLine((l) => l + 1), 2500);
    return () => {
      clearInterval(timer);
      setLine(0);
    };
  }, [pending]);

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-3">
        <label htmlFor="idea" className="text-sm font-semibold text-white/90">
          Your idea for today&apos;s theme
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="idea"
            name="idea"
            required
            minLength={3}
            maxLength={200}
            autoComplete="off"
            disabled={pending || outOfCreations}
            placeholder="a pigeon conductor apologizing over the intercom"
            className="min-w-0 flex-1 rounded-full border-0 bg-white px-5 py-3.5 text-base text-stone-900 shadow-inner placeholder:text-stone-400 focus:ring-4 focus:ring-brand/50 focus:outline-none disabled:opacity-60"
          />
          <button
            disabled={pending || outOfCreations}
            className="rounded-full bg-brand px-6 py-3.5 font-semibold whitespace-nowrap text-white shadow-lg shadow-brand/30 transition-colors hover:bg-brand-strong disabled:opacity-60"
          >
            {pending ? "Cooking…" : "✨ Make it"}
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm text-white/70">
          <span className="flex gap-1" aria-hidden="true">
            {Array.from({ length: limit }, (_, i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full ${i < remaining ? "bg-brand" : "bg-white/25"}`}
              />
            ))}
          </span>
          {outOfCreations
            ? "You've used today's creations. New theme and creations at midnight."
            : `${remaining} of ${limit} creations left today`}
        </div>
      </form>

      {pending && (
        <div className="flex animate-fade-in items-center gap-4 rounded-3xl bg-white/10 p-4" role="status">
          <div className="aspect-square w-24 shrink-0 animate-shimmer rounded-2xl bg-[linear-gradient(110deg,rgba(255,255,255,0.08)_30%,rgba(255,255,255,0.3)_50%,rgba(255,255,255,0.08)_70%)] bg-[length:200%_100%] sm:w-32" />
          <div>
            <p className="font-semibold">{COOKING_LINES[line % COOKING_LINES.length]}</p>
            <p className="mt-1 text-sm text-white/60">AI images take about 15 seconds.</p>
          </div>
        </div>
      )}

      {!pending && state && "error" in state && (
        <p className="rounded-2xl bg-red-500/20 px-4 py-3 text-sm text-red-100 ring-1 ring-red-400/40" role="alert">
          {state.error}
        </p>
      )}

      {!pending && state && "created" in state && (
        <div className="flex animate-fade-in flex-col gap-4 rounded-3xl bg-white p-4 text-stone-900 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={state.created.imageUrl}
            alt={state.created.caption}
            className="aspect-square w-full rounded-2xl object-cover sm:w-36"
          />
          <div className="flex flex-col gap-3">
            <p className="text-xs font-bold tracking-wider text-brand uppercase">🎉 Your riff is live</p>
            <p className="font-display text-xl leading-snug font-bold">{state.created.caption}</p>
            <div className="flex flex-wrap items-center gap-3">
              <ShareButton id={state.created.id} caption={state.created.caption} />
              <Link href={`/g/${state.created.id}`} className="text-sm font-medium underline underline-offset-4">
                Open page
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
