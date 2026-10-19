import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Serve runtime uploads independently of Next's public-directory startup index.
export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const match = /^([a-f0-9]{36})\.(png|jpg|webp|avif)$/.exec(filename);
  if (!match) return new Response(null, { status: 404 });
  try {
    const bytes = await fs.readFile(path.resolve(process.cwd(), "public/uploads/editorial", filename));
    return new Response(bytes, { headers: {
      "content-type": match[2] === "jpg" ? "image/jpeg" : `image/${match[2]}`,
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
      "content-length": String(bytes.length),
    } });
  } catch { return new Response(null, { status: 404 }); }
}
