"use client";

import GoogleButton from "@/app/login/GoogleButton";
import { LogoMark } from "@/app/Logo";
import Modal from "./Modal";

export default function SignInPrompt({
  reason,
  onClose,
}: {
  reason: string | null;
  onClose: () => void;
}) {
  return (
    <Modal open={reason !== null} onClose={onClose} label="Sign in" className="w-[min(24rem,calc(100vw-2rem))]">
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <LogoMark className="h-12 w-12" />
        <h2 className="font-display text-2xl font-bold">{reason}</h2>
        <p className="text-muted">
          Sign in with Google to vote, pick winners and make your own AI riffs. It takes
          five seconds.
        </p>
        <GoogleButton />
        <button onClick={onClose} className="text-sm text-muted hover:text-ink">
          Keep browsing
        </button>
      </div>
    </Modal>
  );
}
