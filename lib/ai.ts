import "server-only";

// Tried in order: free-tier Gemini models are often overloaded or out of quota,
// so we fall through to the next one. GEMINI_MODEL can put a preferred model first.
const TEXT_MODELS = [
  ...(process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : []),
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
];
export const IMAGE_MODEL = "@cf/black-forest-labs/flux-1-schnell";

// Images each user can create per day (New York time).
export const DAILY_LIMIT = 3;

// Who we're making content for. Shared by every prompt so the voice is consistent.
export const AUDIENCE = `The audience is Columbia College students like Sam: a junior who is \
chronically online, grew up in the Midwest, is still new to New York City, lives in \
the dorms, and explores the city on weekends. They love absurd, specific, \
internet-native humor about college life, NYC culture shock, and Midwest-vs-NYC contrasts.`;

type JsonSchema = Record<string, unknown>;

// Calls Gemini (Interactions API) and returns its reply parsed as JSON matching
// `schema`, plus the model that actually answered so we can save it.
export async function generateJson<T>(
  prompt: string,
  schema: JsonSchema
): Promise<{ result: T; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const errors: string[] = [];
  for (const model of TEXT_MODELS) {
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
      errors.push(`${model}: ${res.message}`);
      continue;
    }
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || data.error) {
      errors.push(`${model}: ${res.status} ${data?.error?.message ?? ""}`.trim());
      continue;
    }

    type Step = { type: string; content?: { type: string; text?: string }[] };
    const text = (data.steps as Step[] | undefined)
      ?.filter((step) => step.type === "model_output")
      .flatMap((step) => step.content ?? [])
      .find((part) => part.type === "text" && part.text)?.text;
    if (!text) {
      errors.push(`${model}: no text in response`);
      continue;
    }
    return { result: JSON.parse(text) as T, model };
  }
  throw new Error(`All Gemini models failed: ${errors.join(" | ")}`);
}

// Calls Cloudflare Workers AI (Flux 1 Schnell) and returns the JPEG bytes.
export async function generateImage(prompt: string): Promise<Buffer> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN is not set");
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${IMAGE_MODEL}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: prompt.slice(0, 2048), steps: 6 }),
      cache: "no-store",
    }
  );
  if (!res.ok) {
    throw new Error(`Cloudflare error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }

  const data = await res.json();
  const base64: string | undefined = data.result?.image ?? data.image;
  if (!base64) throw new Error("Cloudflare returned no image");
  return Buffer.from(base64, "base64");
}
