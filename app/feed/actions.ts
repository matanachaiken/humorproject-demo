"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { getUserAndProfile, isProfileComplete } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AUDIENCE, AiBusyError, ImageBlockedError, generateImage, generateJson } from "@/lib/ai";
import {
  finishRequest,
  getRiffContext,
  pickRiffChain,
  render,
  startRequest,
  step,
  type Chain,
  type RequestStatus,
  type Step,
} from "@/lib/pipeline";
import { STYLES, dailyLimit, isStyleId, levelInfo, type StyleId } from "@/lib/progression";
import { readXp } from "@/lib/xp";
import { getTodaysTheme } from "@/lib/theme";
import { nyDayStart } from "@/lib/day";

export type GenerateState =
  | { error: string; offTheme?: boolean }
  | { created: { id: number; caption: string; imageUrl: string }; xp: number }
  | null;

const generationSchema = {
  type: "object",
  properties: {
    allowed: { type: "boolean" },
    on_theme: { type: "boolean" },
    nudge: { type: "string" },
    image_prompt: { type: "string" },
    caption: { type: "string" },
  },
  required: ["allowed", "on_theme", "nudge", "image_prompt", "caption"],
};

// How the image should look: the style the user picked, or the AI's choice.
// Filled into the {{style_line}} placeholder of the riff chain's first step.
function styleLine(style: StyleId) {
  const stylePrompt = STYLES[style].prompt;
  return stylePrompt
    ? `Render it as ${stylePrompt}. The user picked this style, so commit to it fully.`
    : `Describe the scene, subject, style (e.g. photorealistic, Renaissance oil painting, \
90s disposable camera, Pixar-style), lighting and composition.`;
}

const saferSchema = {
  type: "object",
  properties: { image_prompt: { type: "string" } },
  required: ["image_prompt"],
};

export async function createGeneration(
  _prev: GenerateState,
  formData: FormData
): Promise<GenerateState> {
  // Server actions are reachable by direct POST, so always check the session here.
  const { supabase, user, profile, progress } = await getUserAndProfile();
  if (!user || !progress) return { error: "Sign in to create images." };
  if (!isProfileComplete(profile)) return { error: "Finish your profile first." };

  const idea = String(formData.get("idea") ?? "").trim();
  if (idea.length < 3) return { error: "Give the AI a little more to work with." };
  if (idea.length > 200) return { error: "Keep your idea under 200 characters." };

  const { level } = levelInfo(progress.xp);
  const style = String(formData.get("style") ?? "classic");
  if (!isStyleId(style)) return { error: "Pick one of the art styles." };
  if (STYLES[style].level > level) {
    return { error: `${STYLES[style].label} unlocks at level ${STYLES[style].level}.` };
  }
  const limit = dailyLimit(level, progress.hasBonusCreation);

  const { count } = await supabase
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", nyDayStart());
  if ((count ?? 0) >= limit) {
    return { error: `You've used all ${limit} creations today. Come back tomorrow!` };
  }

  const admin = createAdminClient();
  if (!admin) return { error: "Image creation isn't set up yet (missing server key)." };

  const theme = await getTodaysTheme();
  let chain: Chain;
  let writeStep: Step, drawStep: Step, saferStep: Step;
  try {
    chain = await pickRiffChain();
    [writeStep, drawStep, saferStep] = [step(chain, 1), step(chain, 2), step(chain, 3)];
  } catch (error) {
    console.error("Couldn't load the riff prompt chain:", error);
    return { error: "The AI had a moment. Please try again." };
  }
  const llmPrompt = render(writeStep.template, {
    audience: AUDIENCE,
    theme: theme.theme,
    idea,
    style_line: styleLine(style),
    ...(await getRiffContext()),
  });

  // Logged from here on, whatever happens (see the admin area's Requests page).
  const request = await startRequest({
    user_id: user.id,
    chain_id: chain.id,
    theme_day: theme.day,
    theme: theme.theme,
    idea,
    style,
  });
  const at = (s: Step) => ({ chainId: chain.id, stepId: s.id, requestId: request?.id });
  const fail = async (status: RequestStatus, error: string, logged = error) => {
    await finishRequest(request, status, { error: logged });
    return { error };
  };

  let imagePrompt: string;
  let caption: string;
  let textModel: string;
  let imageModel: string;
  let image: Buffer;
  try {
    const { result, model } = await generateJson<{
      allowed: boolean;
      on_theme: boolean;
      nudge: string;
      image_prompt: string;
      caption: string;
    }>(llmPrompt, generationSchema, at(writeStep));
    if (!result.allowed) {
      return fail("rejected", "The AI won't make that one. Try a different idea.");
    }
    // Rejected ideas don't use up one of today's creations.
    if (!result.on_theme) {
      await finishRequest(request, "off_theme", { error: result.nudge.trim() || undefined });
      return {
        error: `🎯 That's off today's theme. ${result.nudge.trim() || "Try tying your idea to it."}`,
        offTheme: true,
      };
    }
    if (!result.image_prompt.trim()) {
      return fail("failed", "The AI had a moment. Please try again.", "Empty image prompt");
    }
    textModel = model;
    imagePrompt = result.image_prompt.trim();
    caption = result.caption.trim().slice(0, 140);
    try {
      ({ image, model: imageModel } = await generateImage(
        render(drawStep.template, { image_prompt: imagePrompt }),
        at(drawStep)
      ));
    } catch (error) {
      if (!(error instanceof ImageBlockedError)) throw error;
      // Flux's filter is stricter than ours, so ask once for a tamer prompt.
      const { result: safer } = await generateJson<{ image_prompt: string }>(
        render(saferStep.template, { image_prompt: imagePrompt }),
        saferSchema,
        at(saferStep)
      );
      imagePrompt = safer.image_prompt.trim();
      ({ image, model: imageModel } = await generateImage(
        render(drawStep.template, { image_prompt: imagePrompt }),
        at(drawStep)
      ));
    }
  } catch (error) {
    console.error("Generation failed:", error);
    const detail = error instanceof Error ? error.message : String(error);
    if (error instanceof ImageBlockedError) {
      return fail("blocked", "The image filter flagged that one. Try rewording your idea.", detail);
    }
    // Nothing was created, so this doesn't use up one of today's creations.
    if (error instanceof AiBusyError) {
      return fail("busy", "The AI is swamped right now. Your idea is saved, so try again in a bit.", detail);
    }
    return fail("failed", "The AI had a moment. Please try again.", detail);
  }

  const storagePath = `${user.id}/${randomUUID()}.jpg`;
  const { error: uploadError } = await admin.storage
    .from("generations")
    .upload(storagePath, image, { contentType: "image/jpeg" });
  if (uploadError) {
    console.error("Upload failed:", uploadError);
    return fail("failed", "Couldn't save the image. Please try again.", `Upload: ${uploadError.message}`);
  }

  // "Jane D.", or just "Jane" when there's no last name.
  const lastName = profile!.last_name?.trim();
  const creatorName = `${profile!.first_name!.trim()}${lastName ? ` ${lastName[0]}.` : ""}`;

  const { data: inserted, error: insertError } = await admin
    .from("generations")
    .insert({
      user_id: user.id,
      creator_name: creatorName,
      theme_day: theme.day,
      theme: theme.theme,
      user_input: idea,
      llm_prompt: llmPrompt,
      image_prompt: imagePrompt,
      caption,
      text_model: textModel,
      image_model: imageModel,
      storage_path: storagePath,
      style,
    })
    .select("id")
    .single();
  if (insertError || !inserted) {
    console.error("Insert failed:", insertError);
    await admin.storage.from("generations").remove([storagePath]);
    return fail("failed", "Couldn't save the image. Please try again.", `Insert: ${insertError?.message}`);
  }
  await finishRequest(request, "succeeded", { generation_id: inserted.id });

  refresh();
  return {
    created: {
      id: inserted.id,
      caption,
      imageUrl: admin.storage.from("generations").getPublicUrl(storagePath).data.publicUrl,
    },
    xp: await readXp(supabase, user.id),
  };
}

export type VoteResult = { ok: true; xp: number } | { ok: false; error: string };

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
    return error
      ? { ok: false, error: "Couldn't remove your vote." }
      : { ok: true, xp: await readXp(supabase, user.id) };
  }

  // First vote on this image: insert a new row.
  const { error: insertError } = await supabase
    .from("generation_votes")
    .insert({ generation_id: generationId, user_id: user.id, vote });
  if (!insertError) return { ok: true, xp: await readXp(supabase, user.id) };

  // Already voted (unique violation): switch the existing vote instead.
  if (insertError.code === "23505") {
    const { error } = await supabase
      .from("generation_votes")
      .update({ vote, updated_at: new Date().toISOString() })
      .eq("generation_id", generationId)
      .eq("user_id", user.id);
    return error
      ? { ok: false, error: "Couldn't change your vote." }
      : { ok: true, xp: await readXp(supabase, user.id) };
  }

  if (insertError.code === "23503") return { ok: false, error: "That riff doesn't exist anymore." };
  console.error("Vote failed:", insertError);
  return { ok: false, error: "Couldn't save your vote." };
}
