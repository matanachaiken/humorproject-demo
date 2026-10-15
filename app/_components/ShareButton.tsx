"use client";

import { useState } from "react";

export default function ShareButton({ id, caption }: { id: number; caption: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/g/${id}`;
    // Phones get the native share sheet; desktops copy the link.
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      await navigator.share({ title: caption, url }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium hover:bg-surface-2"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" />
      </svg>
      {copied ? "Link copied!" : "Share"}
    </button>
  );
}
