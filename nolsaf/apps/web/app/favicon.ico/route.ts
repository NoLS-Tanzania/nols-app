import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

export async function GET() {
  const logoPath = path.join(process.cwd(), "public", "assets", "NoLS2025-04.png");
  const bytes = await fs.promises.readFile(logoPath);
  const body = new Uint8Array(bytes);

  return new Response(body, {
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
