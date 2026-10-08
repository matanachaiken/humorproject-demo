"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { getUserAndProfile, isProfileComplete } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  AUDIENCE,
  DAILY_LIMIT,
  IMAGE_MODEL,
  generateImage,
  generateJson,
} from "@/lib/ai";
import { getTodaysTheme } from "@/lib/theme";
import { nyDayStart } from "@/lib/day";

export type GenerateState = { error?: string; success?: string } | null;

const generationSchema = {
  type: "object",
  properties: {
    allowed: { type: "boolean" },
    image_prompt: { type: "string" },
    caption: { type: "string" },
  },
  required: ["allowed", "image_prompt", "caption"],
};

function buildPrompt(theme: string, idea: string) {
  return `You are the comedy writer for a site where users create funny AI images.
${AUDIENCE}

Today's theme: "${theme}"
The user's idea: "${idea}"

1. Write a detailed prompt for an image model (Flux) that turns the idea into a funny, \
visually striking image that fits the theme. Describe the scene, subject, style \
(e.g. photorealistic, Renaissance oil painting, 90s disposable camera, Pixar-style), \
lighting and composition. Avoid text in the image. Under 120 words.
2. Write a short, punchy caption (max 100 characters) in the voice of a chronically \
online Columbia student. Lowercase is fine.

Keep everything PG-13. Never depict real, identifiable people, sexual content, gore, \
or anything hateful or demeaning toward a group. If the idea asks for any of that, \
set allowed to false and leave the other fields empty.`;
}

export async function createGeneration(
  _prev: GenerateState,
  formData: FormData
): Promise<GenerateState> {
  // Server actions are reachable by direct POST, so always check the session here.
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) return { error: "Sign in to create images." };
  if (!isProfileComplete(profile)) return { error: "Finish your profile first." };

  const idea = String(formData.get("idea") ?? "").trim();
  if (idea.length < 3) return { error: "Give the AI a little more to work with." };
  if (idea.length > 200) return { error: "Keep your idea under 200 characters." };

  const { count } = await supabase
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", nyDayStart());
  if ((count ?? 0) >= DAILY_LIMIT) {
    return { error: `You've used all ${DAILY_LIMIT} creations today. Come back tomorrow!` };
  }

  const admin = createAdminClient();
  if (!admin) return { error: "Image creation isn't set up yet (missing server key)." };

  const theme = await getTodaysTheme();
  const llmPrompt = buildPrompt(theme.theme, idea);

  let imagePrompt: string;
  let caption: string;
  let textModel: string;
  let image: Buffer;
  try {
    const { result, model } = await generateJson<{
      allowed: boolean;
      image_prompt: string;
      caption: string;
    }>(llmPrompt, generationSchema);
    if (!result.allowed || !result.image_prompt.trim()) {
      return { error: "The AI won't make that one. Try a different idea." };
    }
    textModel = model;
    imagePrompt = result.image_prompt.trim();
    caption = result.caption.trim().slice(0, 140);
    image = await generateImage(imagePrompt);
  } catch (error) {
    console.error("Generation failed:", error);
    return { error: "The AI had a moment. Please try again." };
  }

  const storagePath = `${user.id}/${randomUUID()}.jpg`;
  const { error: uploadError } = await admin.storage
    .from("generations")
    .upload(storagePath, image, { contentType: "image/jpeg" });
  if (uploadError) {
    console.error("Upload failed:", uploadError);
    return { error: "Couldn't save the image. Please try again." };
  }

  const { error: insertError } = await admin.from("generations").insert({
    user_id: user.id,
    creator_name: `${profile!.first_name!.trim()} ${profile!.last_name!.trim()[0]}.`,
    theme_day: theme.day,
    theme: theme.theme,
    user_input: idea,
    llm_prompt: llmPrompt,
    image_prompt: imagePrompt,
    caption,
    text_model: textModel,
    image_model: IMAGE_MODEL,
    storage_path: storagePath,
  });
  if (insertError) {
    console.error("Insert failed:", insertError);
    await admin.storage.from("generations").remove([storagePath]);
    return { error: "Couldn't save the image. Please try again." };
  }

  refresh();
  return { success: "Posted! Scroll down to see it." };
}

export type VoteResult = { ok: true } | { ok: false; error: string };

// vote: 1 = upvote, -1 = downvote, 0 = take your vote back.
export async function castVote(generationId: number, vote: number): Promise<VoteResult> {
  // Server actions are reachable by direct POST, so always check the session here.
  // RLS enforces the same rule in the database as a second line of defense.
  const { supabase, user } = await getUserAndProfile();
  if (!user) return { ok: false, error: "Sign in to vote." };
  if (!Number.isInteger(generationId) || ![-1, 0, 1].includes(vote)) {
    return { ok: false, error: "Invalid vote." };
  }

  if (vote === 0) {
    const { error } = await supabase
      .from("generation_votes")
      .delete()
      .eq("generation_id", generationId)
      .eq("user_id", user.id);
    return error ? { ok: false, error: "Couldn't remove your vote." } : { ok: true };
  }

  // First vote on this image: insert a new row.
  const { error: insertError } = await supabase
    .from("generation_votes")
    .insert({ generation_id: generationId, user_id: user.id, vote });
  if (!insertError) return { ok: true };

  // Already voted (unique violation): switch the existing vote instead.
  if (insertError.code === "23505") {
    const { error } = await supabase
      .from("generation_votes")
      .update({ vote, updated_at: new Date().toISOString() })
      .eq("generation_id", generationId)
      .eq("user_id", user.id);
    return error ? { ok: false, error: "Couldn't change your vote." } : { ok: true };
  }

  console.error("Vote failed:", insertError);
  return { ok: false, error: "Couldn't save your vote." };
}
