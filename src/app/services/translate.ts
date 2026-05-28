// Lightweight VI <-> JA translator using the free MyMemory API (no key required).
// Detects source language by looking for Japanese characters; otherwise treats as Vietnamese.

type Lang = "vi" | "ja";

const cache = new Map<string, string>();

function detectLang(text: string): Lang {
  // Hiragana, Katakana, common CJK Unified Ideographs ranges
  return /[぀-ヿ一-龯]/.test(text) ? "ja" : "vi";
}

function pickPair(text: string, target?: Lang): { source: Lang; target: Lang } {
  const source = detectLang(text);
  const finalTarget: Lang = target && target !== source ? target : (source === "ja" ? "vi" : "ja");
  return { source, target: finalTarget };
}

export async function translateViJa(text: string, target?: Lang): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const { source, target: tgt } = pickPair(trimmed, target);
  const cacheKey = `${source}->${tgt}::${trimmed}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${source}|${tgt}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Translate failed: ${res.status}`);
    const data = await res.json();
    const translated: string =
      data?.responseData?.translatedText ||
      data?.matches?.[0]?.translation ||
      "";
    const result = translated || trimmed;
    cache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.error("Translation error:", err);
    return trimmed;
  }
}

export function detectMessageLang(text: string): Lang {
  return detectLang(text);
}
