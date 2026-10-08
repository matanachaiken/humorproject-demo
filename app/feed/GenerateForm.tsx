"use client";

import { useActionState } from "react";
import { createGeneration, type GenerateState } from "./actions";

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
  const outOfCreations = remaining <= 0;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Your idea</span>
        <input
          name="idea"
          required
          minLength={3}
          maxLength={200}
          disabled={pending || outOfCreations}
          placeholder="a pigeon conductor apologizing over the intercom"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <button
          disabled={pending || outOfCreations}
          className="rounded-lg bg-black px-5 py-3 font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
        >
          {pending ? "Cooking… (~15s)" : "Create image"}
        </button>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {outOfCreations
            ? "You've used today's creations. New ones at midnight."
            : `${remaining} of ${limit} creations left today`}
        </span>
      </div>
      {state?.error && (
        <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}
      {state?.success && !pending && (
        <p className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
          {state.success}
        </p>
      )}
    </form>
  );
}
