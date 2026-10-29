import "server-only";
import { getModels, logLlmResponse, type CallContext } from "@/lib/pipeline";

// Who we're making content for. Shared by every prompt so the voice is consistent.
export const AUDIENCE = `The audience is Columbia College students like Sam: a junior who is \
chronically online, grew up in the Midwest, is still new to New York City, lives in \
the dorms, and explores the city on weekends. They love absurd, specific, \
internet-native humor about college life, NYC culture shock, and Midwest-vs-NYC contrasts.`;

type JsonSchema = Record<string, unknown>;

// Calls Gemini (Interactions API) and returns its reply parsed as JSON matching
// `schema`, plus the model that actually answered so we can save it. Models
// come from the llm_models table and are tried in priority order: free-tier
// Gemini models are often overloaded or out of quota, so we fall through to
// the next one. GEMINI_MODEL can put a preferred model first. Every attempt
// is logged to llm_responses.
export async function generateJson<T>(
  prompt: string,
  schema: JsonSchema,
  ctx?: CallContext
): Promise<{ result: T; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const { text } = await getModels();
  const models = [...new Set([...(process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : []), ...text])];
  if (!models.length) throw new Error("No active text models (see llm_models)");

  const errors: string[] = [];
  for (const model of models) {
    const started = Date.now();
    const fail = async (message: string) => {
      errors.push(`${model}: ${message}`);
      await logLlmResponse(ctx, {
        provider: "google",
        model,
        prompt,
        status: "error",
        error: message,
        latency_ms: Date.now() - started,
      });
    };
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        model,
        input: prompt,
        response_format: { type: "text", mime_type: "application/json", schema },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    }).catch((error: Error) => error);

    if (res instanceof Error) {
      await fail(res.message);
      continue;
    }
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || data.error) {
      await fail(`${res.status} ${data?.error?.message ?? ""}`.trim());
      continue;
    }

    type Step = { type: string; content?: { type: string; text?: string }[] };
    const reply = (data.steps as Step[] | undefined)
      ?.filter((step) => step.type === "model_output")
      .flatMap((step) => step.content ?? [])
      .find((part) => part.type === "text" && part.text)?.text;
    if (!reply) {
      await fail("no text in response");
      continue;
    }
    let result: T;
    try {
      result = JSON.parse(reply) as T;
    } catch {
      await fail(`invalid JSON: ${reply.slice(0, 200)}`);
      continue;
    }
    await logLlmResponse(ctx, {
      provider: "google",
      model,
      prompt,
      response: reply,
      status: "ok",
      latency_ms: Date.now() - started,
    });
    return { result, model };
  }
  const message = `All Gemini models failed: ${errors.join(" | ")}`;
  // Every model was rate-limited (free tier: 20 requests/day each) or overloaded.
  if (errors.every((e) => / (429|503) /.test(e))) throw new AiBusyError(message);
  throw new Error(message);
}

// All text models are out of quota or overloaded; worth trying again later.
export class AiBusyError extends Error {}

// Cloudflare's NSFW filter rejected the prompt. It is stricter than our own rules,
// so a prompt Gemini thought was fine can still trip it.
export class ImageBlockedError extends Error {}

// Calls Cloudflare Workers AI with the first active image model and returns
// the JPEG bytes plus the model's name. The call is logged to llm_responses.
export async function generateImage(
  prompt: string,
  ctx?: CallContext
): Promise<{ image: Buffer; model: string }> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN is not set");
  }
  const { image: model } = await getModels();
  if (!model) throw new Error("No active image model (see llm_models)");

  const started = Date.now();
  const log = (row: { status: "ok" | "error"; response?: string; error?: string }) =>
    logLlmResponse(ctx, { provider: "cloudflare", model, prompt, latency_ms: Date.now() - started, ...row });

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: prompt.slice(0, 2048), steps: 6 }),
      cache: "no-store",
    }
  );
  if (!res.ok) {
    const body = await res.text();
    await log({ status: "error", error: `${res.status}: ${body.slice(0, 300)}` });
    // 8007 is Workers AI's "Input prompt contains NSFW content".
    if (body.includes('"code":8007')) throw new ImageBlockedError(body.slice(0, 300));
    throw new Error(`Cloudflare error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const base64: string | undefined = data.result?.image ?? data.image;
  if (!base64) {
    await log({ status: "error", error: "no image in response" });
    throw new Error("Cloudflare returned no image");
  }
  const image = Buffer.from(base64, "base64");
  await log({ status: "ok", response: `[JPEG image, ${Math.round(image.length / 1024)} KB]` });
  return { image, model };
}
