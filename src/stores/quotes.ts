import { defineStore } from "pinia";
import { ref, computed } from "vue";

export type QuoteColor = 0 | 1 | 2 | 3 | -1;

export interface Quote {
  id: number;
  bookmarkId: string;
  text: string;
  book: string;
  volumeId: string;
  author: string;
  date: string;
  color: QuoteColor;
  bookProgress: number | null;
  annotation: string;
  chapterProgress: number;
  chapterTitle: string;
}

export const COLOR_MAP: Record<string, string> = {
  "0": "#f5c842",
  "1": "#e05555",
  "2": "#4a90d9",
  "3": "#4caa6e",
};

export const COLOR_NAMES: Record<string, string> = {
  "0": "Gold",
  "1": "Action items",
  "2": "References",
  "3": "Extras",
};

const STORAGE_KEY = "kobo_quotes_v3";
const IP_KEY = "kobo_ip_v3";
const COVERS_KEY = "kobo_covers_v1";
const DONE_KEY = "kobo_done_v1";
const SUBNETS_KEY = "kobo_known_subnets";

const SCAN_SUBNETS = [
  "10.0.0",
  "192.168.43",
  "172.20.10",
  "192.168.1",
  "10.42.0",
];

const IP_SUFFIX = ".166:8080";

export const useQuotesStore = defineStore("quotes", () => {
  // ── State ──────────────────────────────────────────────
  const allQuotes = ref<Quote[]>([]);
  const isLive = ref(false);
  const isConnected = ref(false);
  const isLoading = ref(false);
  const connError = ref("");
  const selectedBook = ref("");
  const selectedColor = ref("");
  const searchQuery = ref("");
  const coverCache = ref<Record<string, string>>({});
  const doneState = ref<Record<string, boolean>>({});

  // ── Getters ────────────────────────────────────────────
  const filtered = computed(() => {
    return allQuotes.value.filter((q) => {
      const bookMatch = !selectedBook.value || q.book === selectedBook.value;
      const colorMatch =
        selectedColor.value === "" || q.color === parseInt(selectedColor.value);
      const sq = searchQuery.value.toLowerCase();
      const textMatch =
        !sq ||
        q.text.toLowerCase().includes(sq) ||
        q.book.toLowerCase().includes(sq);
      return bookMatch && colorMatch && textMatch;
    });
  });

  const books = computed(() => {
    const map: Record<string, string> = {};
    allQuotes.value.forEach((q) => {
      if (!map[q.book]) map[q.book] = q.volumeId;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, volumeId]) => ({ title, volumeId }));
  });

  const savedIp = computed(() => localStorage.getItem(IP_KEY) || "");

  // ── Helpers ────────────────────────────────────────────
  function cleanBook(v: string): string {
    if (!v) return "Unknown";
    const parts = v.split("/");
    let name = parts[parts.length - 1] ?? "";
    name = name.replace(/\.(epub|mobi|pdf|azw3|kepub?)$/i, "");
    return name || v;
  }

  function getBaseUrl(): string {
    const ip = localStorage.getItem(IP_KEY) || "";
    if (!ip) return "";
    return ip.startsWith("http") ? ip : "http://" + ip;
  }

  function coverUrl(volumeId: string): string | null {
    const base = getBaseUrl();
    if (!base || !volumeId) return null;
    const path = volumeId
      .replace(/^file:\/\/\//, "/")
      .replace(/^file:\/\//, "");
    return base + "/cover?book=" + encodeURIComponent(path);
  }

  function getCachedCover(volumeId: string): string | null {
    if (!volumeId) return null;
    return coverCache.value[volumeId] || coverUrl(volumeId);
  }

  function getLearnedSubnets(): string[] {
    try {
      return JSON.parse(localStorage.getItem(SUBNETS_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveSubnet(subnet: string) {
    const learned = getLearnedSubnets();
    if (!learned.includes(subnet)) {
      learned.unshift(subnet);
      localStorage.setItem(SUBNETS_KEY, JSON.stringify(learned));
    }
  }

  function getAllSubnets(): string[] {
    return [...new Set([...getLearnedSubnets(), ...SCAN_SUBNETS])];
  }

  function getFullIp(raw: string): string {
    if (!raw) return "";
    if (raw.includes(":")) return raw;
    return raw + IP_SUFFIX;
  }

  // ── Data ingestion ─────────────────────────────────────
  function ingest(data: any[], live: boolean) {
    if (!data || !Array.isArray(data) || data.length === 0) return;

    allQuotes.value = data
      .map((q, i) => ({
        id: i,
        bookmarkId: q.bookmark_id || q.BookmarkID || "",
        text: q.text || q.Text || "",
        book: cleanBook(q.book || q.VolumeID || q.title || "Unknown"),
        volumeId: q.image_url || q.VolumeID || "",
        author: q.author || q.Author || "",
        date: q.date || q.DateCreated || "",
        color: q.color != null ? q.color : q.Color != null ? q.Color : -1,
        bookProgress: q.book_progress != null ? q.book_progress : null,
        annotation: q.annotation || q.Annotation || "",
        chapterProgress: q.chapter_progress || 0,
        chapterTitle: q.chapter_title || "",
      }))
      .filter((q: any) => q.text.trim());

    isLive.value = live;
    isConnected.value = true;
    connError.value = "";

    // Load persisted state
    try {
      coverCache.value = JSON.parse(localStorage.getItem(COVERS_KEY) || "{}");
    } catch {}
    try {
      doneState.value = JSON.parse(localStorage.getItem(DONE_KEY) || "{}");
    } catch {}

    if (live) fetchAndCacheCovers();
  }

  async function fetchAndCacheCovers() {
    const toFetch = books.value.filter(
      (b) => b.volumeId && !coverCache.value[b.volumeId],
    );
    if (!toFetch.length) return;

    const cache = { ...coverCache.value };
    await Promise.all(
      toFetch.map(async (b) => {
        const url = coverUrl(b.volumeId);
        if (!url) return;
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
          if (!res.ok) return;
          const blob = await res.blob();
          const b64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          cache[b.volumeId] = b64;
        } catch {}
      }),
    );

    coverCache.value = cache;
    localStorage.setItem(COVERS_KEY, JSON.stringify(cache));
  }

  // ── Connection ─────────────────────────────────────────
  async function tryUrl(
    url: string,
  ): Promise<{ url: string; data: any } | null> {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      return { url, data };
    } catch {
      return null;
    }
  }

  async function connect(rawIp: string) {
    const full = getFullIp(rawIp);
    if (!full) return;
    const base = full.startsWith("http") ? full : "http://" + full;
    const url = base.replace(/\/$/, "") + "/annotations.json";
    isLoading.value = true;
    connError.value = "";
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      localStorage.setItem(IP_KEY, full);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      const subnet = full
        .replace(IP_SUFFIX, "")
        .replace(/:\d+$/, "")
        .split(".")
        .slice(0, 3)
        .join(".");
      saveSubnet(subnet);
      ingest(data, true);
    } catch (e: any) {
      connError.value = e.message || "Connection failed";
    } finally {
      isLoading.value = false;
    }
  }

  const NTFY_TOPIC = "kobo-bg-f33434ce92b0ff19";

  async function fetchIpFromNtfy(): Promise<string | null> {
    try {
      const res = await fetch(`https://ntfy.sh/${NTFY_TOPIC}/json?poll=1`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return null;
      const text = await res.text();
      // Each line is a JSON event, take the last one
      const lines = text.trim().split("\n").filter(Boolean);
      if (!lines.length) return null;
      const last = JSON.parse(lines[lines.length - 1]!);
      const msg = JSON.parse(last.message);
      if (msg.ip) return msg.ip + ":8080";
      return null;
    } catch {
      return null;
    }
  }

  async function scan() {
    isLoading.value = true;
    connError.value = "";

    // Try ntfy first — fastest path
    const ntfyIp = await fetchIpFromNtfy();
    if (ntfyIp) {
      const url = `http://${ntfyIp}/annotations.json`;
      const result = await tryUrl(url);
      if (result) {
        const subnet = ntfyIp
          .replace(":8080", "")
          .split(".")
          .slice(0, 3)
          .join(".");
        const fullIp = ntfyIp;
        localStorage.setItem(IP_KEY, fullIp);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result.data));
        saveSubnet(subnet);
        isLoading.value = false;
        ingest(result.data, true);
        return;
      }
    }

    // Fallback — scan known subnets in parallel
    const subnets = getAllSubnets();
    const candidates = subnets.map(
      (s) => `http://${s}${IP_SUFFIX}/annotations.json`,
    );
    const results = await Promise.all(candidates.map(tryUrl));
    const match = results.find((r) => r !== null);
    isLoading.value = false;

    if (match) {
      const subnet = match.url
        .replace("http://", "")
        .replace(`${IP_SUFFIX}/annotations.json`, "");
      const fullIp = subnet + IP_SUFFIX;
      localStorage.setItem(IP_KEY, fullIp);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(match.data));
      saveSubnet(subnet);
      ingest(match.data, true);
    } else {
      connError.value =
        "Kobo not found. Make sure it is connected to the same network.";
    }
  }

  async function tryReconnect() {
    const raw = localStorage.getItem(IP_KEY);
    if (!raw) return;
    const base = raw.startsWith("http") ? raw : "http://" + raw;
    const url = base.replace(/\/$/, "") + "/annotations.json";
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      ingest(data, true);
    } catch {
      // Try ntfy first
      const ntfyIp = await fetchIpFromNtfy();
      if (ntfyIp) {
        const result = await tryUrl(`http://${ntfyIp}/annotations.json`);
        if (result) {
          const subnet = ntfyIp
            .replace(":8080", "")
            .split(".")
            .slice(0, 3)
            .join(".");
          localStorage.setItem(IP_KEY, ntfyIp);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(result.data));
          saveSubnet(subnet);
          ingest(result.data, true);
          return;
        }
      }
      // Fallback — scan known subnets
      const subnets = getAllSubnets();
      const candidates = subnets.map(
        (s) => `http://${s}${IP_SUFFIX}/annotations.json`,
      );
      const results = await Promise.all(candidates.map(tryUrl));
      const match = results.find((r) => r !== null);
      if (match) {
        const subnet = match.url
          .replace("http://", "")
          .replace(`${IP_SUFFIX}/annotations.json`, "");
        localStorage.setItem(IP_KEY, subnet + IP_SUFFIX);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(match.data));
        saveSubnet(subnet);
        ingest(match.data, true);
      }
    }
  }

  function loadFromCache() {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (!cached) return false;
    try {
      ingest(JSON.parse(cached), false);
      return true;
    } catch {
      return false;
    }
  }

  function reset() {
    localStorage.removeItem(IP_KEY);
    localStorage.removeItem(STORAGE_KEY);
    allQuotes.value = [];
    isConnected.value = false;
    isLive.value = false;
    selectedBook.value = "";
    selectedColor.value = "";
    searchQuery.value = "";
    connError.value = "";
  }

  // ── Done state ─────────────────────────────────────────
  function toggleDone(id: number) {
    doneState.value = { ...doneState.value, [id]: !doneState.value[id] };
    localStorage.setItem(DONE_KEY, JSON.stringify(doneState.value));
  }

  function isDone(id: number): boolean {
    return !!doneState.value[id];
  }

  // ── Color update ───────────────────────────────────────
  async function updateColor(bookmarkId: string, color: number) {
    const base = getBaseUrl();
    if (!base || !bookmarkId) return;
    try {
      await fetch(base + "/bookmark/color", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookmark_id: bookmarkId, color }),
      });
      // Update in memory
      const q = allQuotes.value.find((q) => q.bookmarkId === bookmarkId);
      if (q) q.color = color as QuoteColor;
    } catch (e) {
      console.error("updateColor failed", e);
    }
  }

  return {
    // State
    allQuotes,
    isLive,
    isConnected,
    isLoading,
    connError,
    selectedBook,
    selectedColor,
    searchQuery,
    coverCache,
    doneState,
    // Getters
    filtered,
    books,
    savedIp,
    // Actions
    connect,
    scan,
    tryReconnect,
    loadFromCache,
    reset,
    ingest,
    toggleDone,
    isDone,
    updateColor,
    getCachedCover,
    coverUrl,
    getFullIp,
    COLOR_MAP,
    COLOR_NAMES,
    IP_SUFFIX,
  };
});
