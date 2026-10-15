"use client";

import { useState } from "react";
import type { Riff } from "@/lib/generations";
import RiffDetails from "@/app/_components/RiffDetails";
import SignInPrompt from "@/app/_components/SignInPrompt";
import { useVotes } from "@/app/_components/useVotes";

export default function RiffView({
  riff,
  dayLabel,
  signedIn,
}: {
  riff: Riff;
  dayLabel: string;
  signedIn: boolean;
}) {
  const [signInReason, setSignInReason] = useState<string | null>(null);
  const votes = useVotes({ signedIn, onNeedSignIn: () => setSignInReason("Sign in to vote") });

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={riff.imageUrl}
        alt={riff.caption}
        className="aspect-square w-full rounded-[2rem] object-cover shadow-xl"
      />
      <div className="flex flex-col gap-4">
        <RiffDetails
          riff={riff}
          dayLabel={dayLabel}
          {...votes.tally(riff)}
          pending={votes.isPending(riff)}
          onVote={(value) => votes.vote(riff, value)}
        />
        {votes.error && (
          <p role="status" className="text-sm font-medium text-red-600 dark:text-red-400">
            {votes.error}
          </p>
        )}
      </div>
      <SignInPrompt reason={signInReason} onClose={() => setSignInReason(null)} />
    </div>
  );
}
