"use server";

import { auth } from "@/auth";

export type OgPreview = {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  site: string | null;
};

function pickMeta(html: string, ...names: string[]): string | null {
  for (const name of names) {
    // Match both property="..." and name="..."; allow attributes in either order.
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["']`,
      "i",
    );
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`,
      "i",
    );
    const m = html.match(re) ?? html.match(re2);
    if (m?.[1]) return decode(m[1]);
  }
  return null;
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export async function fetchOgPreview(
  rawUrl: string,
): Promise<{ ok: true; data: OgPreview } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Unauthorized" };
  }

  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return { ok: false, error: "Not a valid URL" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Only http(s) URLs supported" };
  }

  let html: string;
  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; NoriBot/0.1; +https://nori.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      // Don't hang forever on slow sites.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return { ok: false, error: `Server responded ${res.status}` };
    }
    // Cap response body — anti-DoS for huge HTML pages.
    const text = await res.text();
    html = text.slice(0, 250_000);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }

  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];

  const data: OgPreview = {
    url: url.toString(),
    title:
      pickMeta(html, "og:title", "twitter:title") ??
      (titleTag ? decode(titleTag.trim()) : null),
    description:
      pickMeta(html, "og:description", "twitter:description", "description") ??
      null,
    image: pickMeta(html, "og:image", "twitter:image") ?? null,
    site: pickMeta(html, "og:site_name") ?? url.hostname,
  };

  // Resolve relative image URLs against the base
  if (data.image && !data.image.startsWith("http")) {
    try {
      data.image = new URL(data.image, url).toString();
    } catch {
      data.image = null;
    }
  }

  return { ok: true, data };
}
