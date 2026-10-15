"use client";

import { useEffect, useRef } from "react";

// A native <dialog>: focus trapping, Esc to close and the backdrop come free.
export default function Modal({
  open,
  onClose,
  label,
  className = "",
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      // A click on the dialog element itself (not its contents) is a backdrop click.
      onClick={(e) => e.target === ref.current && onClose()}
      className={`m-auto max-h-[92dvh] max-w-none overflow-auto rounded-3xl bg-surface p-0 text-ink shadow-2xl ${className}`}
    >
      {open && children}
    </dialog>
  );
}
