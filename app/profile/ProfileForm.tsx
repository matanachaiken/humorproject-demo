"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/auth";

const inputClass =
  "w-full rounded-2xl border border-line bg-surface px-4 py-3 focus:ring-4 focus:ring-brand/30 focus:outline-none";

export default function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(profile.first_name ?? "");
  const [lastName, setLastName] = useState(profile.last_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) {
      setStatus("Your first name is required.");
      return;
    }
    setSaving(true);
    setStatus(null);
    const supabase = createClient();

    let newAvatarUrl = avatarUrl;
    if (file) {
      // The image goes to Storage; only its public URL is saved in the table.
      const ext = file.name.split(".").pop() || "png";
      const path = `${profile.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type });
      if (uploadError) {
        setStatus(`Upload failed: ${uploadError.message}`);
        setSaving(false);
        return;
      }
      newAvatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data
        .publicUrl;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        avatar_url: newAvatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    setSaving(false);
    if (error) {
      setStatus(`Save failed: ${error.message}`);
      return;
    }
    setAvatarUrl(newAvatarUrl);
    setFile(null);
    setStatus("Saved!");
    router.refresh();
  }

  const preview = file ? URL.createObjectURL(file) : avatarUrl;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Profile photo"
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-soft font-display text-2xl font-bold text-brand-strong">
            {(firstName[0] ?? "?").toUpperCase()}
          </div>
        )}
        <label className="cursor-pointer rounded-full border border-line px-4 py-2 text-sm font-medium hover:bg-surface-2">
          Choose photo
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">First name</span>
        <input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Last name <span className="font-normal text-muted">(optional)</span></span>
        <input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className={inputClass}
        />
      </label>

      <div className="flex items-center gap-4">
        <button
          disabled={saving}
          className="rounded-full bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-strong disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
        {status && (
          <span className="text-sm text-muted">
            {status}
          </span>
        )}
      </div>
    </form>
  );
}
