import { reactive } from "vue";
import { useQuotesStore, type Quote } from "@/stores/quotes.ts";

// ── Types ──────────────────────────────────────────────────
export interface ContextData {
  before: string[];
  quote: string;
  after: string[];
}

export interface ContextCache {
  radius: number;
  data: ContextData | null;
  error?: string;
}

export interface ImageCandidate {
  path: string;
  width: number;
  height: number;
}

export interface ImagesCache {
  candidates: ImageCandidate[];
  error?: string;
}

interface QuoteTabCache {
  context?: ContextCache;
  images?: ImagesCache;
}

const MAX_RADIUS = 10;
const DEFAULT_RADIUS = 2;

// Module-level cache, keyed by bookmarkId — persists across component
// instances and tab switches for the lifetime of the page (mirrors the
// prototype's global `tabCache`).
const cache = reactive<Record<string, QuoteTabCache>>({});

export function useQuoteContext() {
  const quotesStore = useQuotesStore();

  function getCache(bookmarkId: string): QuoteTabCache {
    if (!cache[bookmarkId]) cache[bookmarkId] = {};
    return cache[bookmarkId];
  }

  // ── Context ────────────────────────────────────────────
  function getContextCache(bookmarkId: string): ContextCache | undefined {
    return cache[bookmarkId]?.context;
  }

  async function fetchContext(q: Quote, radius: number) {
    const c = getCache(q.bookmarkId);
    const base = quotesStore.getBaseUrl();
    if (!base || !q.bookmarkId) {
      c.context = {
        radius,
        data: null,
        error: "Connect to Kobo to load context",
      };
      return;
    }
    try {
      const res = await fetch(
        `${base}/quote-context?bookmark_id=${encodeURIComponent(q.bookmarkId)}&radius=${radius}`,
        { signal: AbortSignal.timeout(8000) },
      );
      const data = await res.json();
      if (!res.ok) {
        c.context = { radius, data: null, error: data.error || "Not found" };
      } else {
        c.context = { radius, data };
      }
    } catch {
      c.context = { radius, data: null, error: "Could not reach Kobo" };
    }
  }

  // Loads context at the default radius if not already cached. Safe to
  // call every time the context tab becomes active.
  async function ensureContext(q: Quote) {
    if (!getCache(q.bookmarkId).context) {
      await fetchContext(q, DEFAULT_RADIUS);
    }
  }

  // Re-fetches at a larger radius, replacing the cached entry. "Show more
  // context" is hidden once radius reaches MAX_RADIUS.
  async function expandContext(q: Quote) {
    const current = getCache(q.bookmarkId).context?.radius ?? DEFAULT_RADIUS;
    const newRadius = Math.min(MAX_RADIUS, current + 2);
    await fetchContext(q, newRadius);
  }

  function canExpandContext(bookmarkId: string): boolean {
    const c = getContextCache(bookmarkId);
    return !!c && !c.error && c.radius < MAX_RADIUS;
  }

  // ── Images ─────────────────────────────────────────────
  function getImagesCache(bookmarkId: string): ImagesCache | undefined {
    return cache[bookmarkId]?.images;
  }

  async function fetchImages(q: Quote) {
    const c = getCache(q.bookmarkId);
    const base = quotesStore.getBaseUrl();
    if (!base || !q.bookmarkId) {
      c.images = { candidates: [], error: "Connect to Kobo to find images" };
      return;
    }
    try {
      const res = await fetch(
        `${base}/chapter-images?bookmark_id=${encodeURIComponent(q.bookmarkId)}&radius=6`,
        { signal: AbortSignal.timeout(10000) },
      );
      const data = await res.json();
      if (!res.ok) {
        c.images = { candidates: [], error: data.error || "Not found" };
      } else {
        c.images = { candidates: data.candidates || [] };
      }
    } catch {
      c.images = { candidates: [], error: "Could not reach Kobo" };
    }
  }

  async function ensureImages(q: Quote) {
    if (!getCache(q.bookmarkId).images) {
      await fetchImages(q);
    }
  }

  function chapterImageUrl(bookmarkId: string, path: string): string | null {
    const base = quotesStore.getBaseUrl();
    if (!base || !path) return null;
    return `${base}/chapter-image?bookmark_id=${encodeURIComponent(bookmarkId)}&path=${encodeURIComponent(path)}`;
  }

  // Toggles the attached image for a quote (tapping the already-selected
  // image clears it) and persists it server-side.
  async function selectImage(q: Quote, path: string) {
    const newPath = q.attachedImage === path ? "" : path;
    q.attachedImage = newPath;

    const base = quotesStore.getBaseUrl();
    if (base && q.bookmarkId) {
      try {
        await fetch(base + "/bookmark/image", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookmark_id: q.bookmarkId,
            image_path: newPath,
          }),
        });
      } catch (e) {
        console.error("selectImage failed", e);
      }
    }
  }

  return {
    // context
    ensureContext,
    expandContext,
    getContextCache,
    canExpandContext,
    // images
    ensureImages,
    getImagesCache,
    chapterImageUrl,
    selectImage,
  };
}
