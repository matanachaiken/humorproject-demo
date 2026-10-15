import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { CACHE_FOREVER, getPublicRiff } from "@/lib/publicRiff";

// A share-ready card (Instagram portrait, 4:5): the image, its caption, and
// Daily Riff branding. `?download=1` saves it as a file instead of showing it.
const WIDTH = 1080;
const HEIGHT = 1350;

const LOGO = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="9" fill="#ff5a1f"/><path d="M11 7h10a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-6.5L10 25v-4.2A4 4 0 0 1 7 17v-6a4 4 0 0 1 4-4z" fill="#fff"/><path d="M16 9.5l1.3 3.2 3.2 1.3-3.2 1.3-1.3 3.2-1.3-3.2-3.2-1.3 3.2-1.3z" fill="#ff5a1f"/></svg>'
)}`;

// The site's display font, trimmed by Google Fonts to just the characters used.
async function loadDisplayFont(text: string) {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700&text=${encodeURIComponent(text)}`
    ).then((r) => r.text());
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    return url ? await fetch(url).then((r) => r.arrayBuffer()) : null;
  } catch {
    return null; // Falls back to the default font.
  }
}

export async function GET(req: NextRequest, ctx: RouteContext<"/g/[id]/card">) {
  const riff = await getPublicRiff((await ctx.params).id);
  if (!riff) return new Response("Not found", { status: 404 });

  const footer = `by ${riff.creator_name} · ${riff.theme}`;
  const font = await loadDisplayFont(`${riff.caption}${footer}Daily Riff…`);
  const download = req.nextUrl.searchParams.has("download");

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#faf7f2",
        padding: 40,
        fontFamily: font ? "Bricolage" : undefined,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={riff.imageUrl}
        alt=""
        width={1000}
        height={1000}
        style={{ borderRadius: 36, objectFit: "cover" }}
      />
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          padding: "0 8px",
          fontSize: riff.caption.length > 90 ? 38 : 46,
          fontWeight: 700,
          lineHeight: 1.18,
          color: "#1c1917",
        }}
      >
        {riff.caption}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "0 8px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO} alt="" width={44} height={44} />
        <div style={{ fontSize: 30, fontWeight: 700, color: "#1c1917" }}>Daily Riff</div>
        <div
          style={{
            marginLeft: "auto",
            maxWidth: 640,
            fontSize: 24,
            color: "#6b635b",
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          {footer}
        </div>
      </div>
    </div>,
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: font ? [{ name: "Bricolage", data: font, weight: 700, style: "normal" }] : undefined,
      headers: {
        "Cache-Control": CACHE_FOREVER,
        ...(download && {
          "Content-Disposition": `attachment; filename="daily-riff-${riff.id}.png"`,
        }),
      },
    }
  );
}
