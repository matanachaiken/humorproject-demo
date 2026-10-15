import type { NextRequest } from "next/server";
import { CACHE_FOREVER, getPublicRiff } from "@/lib/publicRiff";

// The AI image on its own, as a download. Served from our own domain so the
// browser honors the filename (it ignores `download` on cross-site links).
export async function GET(_req: NextRequest, ctx: RouteContext<"/g/[id]/image">) {
  const riff = await getPublicRiff((await ctx.params).id);
  if (!riff) return new Response("Not found", { status: 404 });

  const image = await fetch(riff.imageUrl);
  if (!image.ok) return new Response("Image unavailable", { status: 502 });
  return new Response(image.body, {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Disposition": `attachment; filename="daily-riff-${riff.id}.jpg"`,
      "Cache-Control": CACHE_FOREVER,
    },
  });
}
