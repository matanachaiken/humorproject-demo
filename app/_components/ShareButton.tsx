"use client";

import { useEffect, useRef, useState } from "react";

const icon = (d: string) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
);

const buttonClass =
  "inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium hover:bg-surface-2";

const isPhone = () => window.matchMedia("(pointer: coarse)").matches;

// Share and download a riff. On phones, Share sends the captioned image card
// itself to the share sheet (iMessage, Instagram...); elsewhere it copies the link.
export default function ShareButton({ id, caption }: { id: number; caption: string }) {
  const [copied, setCopied] = useState(false);
  const card = useRef<File | null>(null);

  // Fetch the card ahead of time: phones only allow sharing right after a tap,
  // so there's no time to download it once the button is pressed.
  useEffect(() => {
    if (!isPhone() || !navigator.canShare) return;
    let cancelled = false;
    fetch(`/g/${id}/card`)
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (!blob || cancelled) return;
        const file = new File([blob], `daily-riff-${id}.png`, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) card.current = file;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function share() {
    const url = `${window.location.origin}/g/${id}`;
    if (isPhone() && navigator.share) {
      const files = card.current ? [card.current] : undefined;
      await navigator
        .share({ title: caption, text: `${caption} ${url}`, files, url: files ? undefined : url })
        .catch(() => {});
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard blocked (permissions, older browsers): show the link instead.
      window.prompt("Copy this link:", url);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={share} className={buttonClass}>
        {icon("M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13")}
        {copied ? "Link copied!" : "Share"}
      </button>
      <a
        href={`/g/${id}/card?download=1`}
        download
        className={buttonClass}
        title="Image with caption, sized for Instagram"
      >
        {icon("M12 3v12M7 10l5 5 5-5M5 21h14")}
        Download
      </a>
      <a
        href={`/g/${id}/image`}
        download
        className="text-xs font-medium text-muted underline-offset-4 hover:text-ink hover:underline"
      >
        image only
      </a>
    </div>
  );
}
