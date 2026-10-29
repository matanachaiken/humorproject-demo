import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// The AI pipeline as configured in the database (managed in the admin area):
// which models to call, the prompt chains and their templates, slang terms,
// example riffs, and logs of every request and AI call.

// Used only if the database can't be read, so riffs keep working.
const DEFAULT_TEXT_MODELS = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"];
const DEFAULT_IMAGE_MODEL = "@cf/black-forest-labs/flux-1-schnell";

// Admin changes show up within this long on each server instance.
const CACHE_MS = 30_000;

function cached<T>(load: () => Promise<T>) {
  let value: { at: number; data: Promise<T> } | null = null;
  return () => {
    if (!value || Date.now() - value.at > CACHE_MS) {
      const data = load();
      value = { at: Date.now(), data };
      // Don't keep a failure around for 30 seconds.
      data.catch(() => (value = null));
    }
    return value.data;
  };
}

type ModelRow = {
  model_key: string;
  kind: "text" | "image";
  priority: number;
  is_active: boolean;
  llm_providers: { slug: string; is_active: boolean } | null;
};

// Active models from active providers, in priority order. Gemini handles text
// and Cloudflare draws, since those are the APIs lib/ai.ts knows how to call.
export const getModels = cached(async () => {
  const admin = createAdminClient();
  const { data, error } = admin
    ? await admin
        .from("llm_models")
        .select("model_key, kind, priority, is_active, llm_providers (slug, is_active)")
        .eq("is_active", true)
        .order("priority")
        .order("id")
        .overrideTypes<ModelRow[], { merge: false }>()
    : { data: null, error: new Error("no server key") };
  if (error) console.warn("Couldn't read llm_models, using defaults:", error);

  const usable = (data ?? []).filter((m) => m.llm_providers?.is_active);
  const text = usable.filter((m) => m.kind === "text" && m.llm_providers?.slug === "google").map((m) => m.model_key);
  const image = usable.find((m) => m.kind === "image" && m.llm_providers?.slug === "cloudflare")?.model_key;
  return {
    text: data ? text : DEFAULT_TEXT_MODELS,
    image: data ? (image ?? null) : DEFAULT_IMAGE_MODEL,
  };
});

export type Step = { id: number; order: number; name: string; template: string };
export type Chain = { id: number; slug: string; name: string; steps: Step[] };

type ChainRow = {
  id: number;
  slug: string;
  name: string;
  purpose: string;
  prompt_chain_steps: { id: number; step_order: number; name: string; prompt_template: string }[];
  prompt_chain_mix: { weight: number } | null;
};

const getChains = cached(async () => {
  const admin = createAdminClient();
  if (!admin) throw new Error("Missing server key");
  const { data, error } = await admin
    .from("prompt_chains")
    .select("id, slug, name, purpose, prompt_chain_steps (id, step_order, name, prompt_template), prompt_chain_mix (weight)")
    .overrideTypes<ChainRow[], { merge: false }>();
  if (error) throw error;
  return data.map((c) => ({
    purpose: c.purpose,
    weight: c.prompt_chain_mix?.weight ?? 0,
    chain: {
      id: c.id,
      slug: c.slug,
      name: c.name,
      steps: c.prompt_chain_steps
        .map((s) => ({ id: s.id, order: s.step_order, name: s.name, template: s.prompt_template }))
        .sort((a, b) => a.order - b.order),
    } satisfies Chain,
  }));
});

// The chain for a one-of-a-kind job (theme, example ideas, Writers' Room).
export async function getChain(purpose: "theme" | "idea_examples" | "writers_room"): Promise<Chain> {
  const found = (await getChains()).find((c) => c.purpose === purpose);
  if (!found) throw new Error(`No prompt chain for ${purpose}`);
  return found.chain;
}

// A riff chain picked at random according to the mix weights.
export async function pickRiffChain(): Promise<Chain> {
  const riffs = (await getChains()).filter((c) => c.purpose === "riff");
  const total = riffs.reduce((sum, c) => sum + c.weight, 0);
  if (!riffs.length) throw new Error("No riff prompt chains");
  if (total <= 0) return riffs[0].chain;
  let roll = Math.random() * total;
  for (const c of riffs) {
    roll -= c.weight;
    if (roll < 0) return c.chain;
  }
  return riffs.at(-1)!.chain;
}

export function step(chain: Chain, order: number): Step {
  const found = chain.steps.find((s) => s.order === order);
  if (!found) throw new Error(`Chain ${chain.slug} has no step ${order}`);
  return found;
}

// Fills {{name}} placeholders. Unknown ones are left as-is so they're easy to spot.
export function render(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) => vars[name] ?? match);
}

// Slang and example riffs, as blocks ready to drop into the riff prompt.
export const getRiffContext = cached(async () => {
  const admin = createAdminClient();
  if (!admin) return { terms: "", examples: "" };
  const [{ data: terms }, { data: examples }] = await Promise.all([
    admin.from("terms").select("term, meaning").eq("is_active", true).order("term"),
    admin
      .from("generation_examples")
      .select("theme, idea, caption")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);
  return {
    terms: terms?.length
      ? `\nLocal lingo you can use when it fits (never force it):\n${terms.map((t) => `- ${t.term}: ${t.meaning}`).join("\n")}\n`
      : "",
    examples: examples?.length
      ? `\nRiffs people loved, to show the tone (never copy them):\n${examples
          .map((e) => `- Theme "${e.theme}", idea "${e.idea}" → caption "${e.caption}"`)
          .join("\n")}\n`
      : "",
  };
});

// Where an AI call came from, so its log row links back to the chain step
// and, for riffs, to the request.
export type CallContext = { chainId?: number; stepId?: number; requestId?: number | null };

export async function logLlmResponse(
  ctx: CallContext | undefined,
  row: {
    provider: string;
    model: string;
    prompt: string;
    response?: string | null;
    status: "ok" | "error";
    error?: string | null;
    latency_ms: number;
  }
) {
  const admin = createAdminClient();
  if (!admin) return;
  const { error } = await admin.from("llm_responses").insert({
    ...row,
    request_id: ctx?.requestId ?? null,
    chain_id: ctx?.chainId ?? null,
    step_id: ctx?.stepId ?? null,
  });
  if (error) console.warn("Couldn't log the AI call:", error);
}

export type RequestStatus = "succeeded" | "rejected" | "off_theme" | "blocked" | "busy" | "failed";

export async function startRequest(row: {
  user_id: string;
  chain_id: number;
  theme_day: string;
  theme: string;
  idea: string;
  style: string;
}) {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.from("generation_requests").insert(row).select("id").single();
  if (error) console.warn("Couldn't log the riff request:", error);
  return data ? { id: data.id as number, startedAt: Date.now() } : null;
}

export async function finishRequest(
  request: { id: number; startedAt: number } | null,
  status: RequestStatus,
  extra: { error?: string; generation_id?: number } = {}
) {
  const admin = createAdminClient();
  if (!admin || !request) return;
  const now = Date.now();
  const { error } = await admin
    .from("generation_requests")
    .update({
      status,
      error: extra.error ?? null,
      generation_id: extra.generation_id ?? null,
      duration_ms: now - request.startedAt,
      finished_at: new Date(now).toISOString(),
    })
    .eq("id", request.id);
  if (error) console.warn("Couldn't update the riff request:", error);
}
