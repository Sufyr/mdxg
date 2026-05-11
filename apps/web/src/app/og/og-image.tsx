import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export { getPageTitle } from "@/lib/page-titles";

let fontCache: Buffer | null = null;

async function loadFont() {
  if (fontCache) return fontCache;
  fontCache = await readFile(join(process.cwd(), "public/Geist-Regular.ttf"));
  return fontCache;
}

export async function renderOgImage(title: string) {
  const geistRegular = await loadFont();

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "black",
        padding: "60px 80px",
      }}
    >
      {title.split("\n").map((line, i) => (
        <span
          key={i}
          style={{
            fontSize: 72,
            fontFamily: "Geist",
            fontWeight: 400,
            color: "white",
            letterSpacing: "-0.02em",
            textAlign: "center",
            lineHeight: 1.2,
          }}
        >
          {line}
        </span>
      ))}
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Geist",
          data: geistRegular.buffer as ArrayBuffer,
          style: "normal",
          weight: 400,
        },
      ],
    }
  );
}
