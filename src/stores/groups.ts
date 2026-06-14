import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useQuotesStore, type Quote } from "./quotes";

// ── Types ──────────────────────────────────────────────────
// Group members are mixed: either a bookmarkId string (an existing Kobo
// highlight) or an inline { text, book } object (a context paragraph with
// no corresponding highlight, stored directly).

export interface TextMember {
  text: string;
  book: string;
}

export type GroupMember = string | TextMember;

export type Groups = Record<string, GroupMember[]>;

export interface CtxIconState {
  state: "linked" | "match" | "none";
  kind: "quote" | "text";
  memberId?: string;
  index?: number;
}

const GROUPS_KEY = "kobo_groups_v1";

export function normalizeForMatch(s: string): string {
  return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function isTextMember(m: GroupMember): m is TextMember {
  return typeof m === "object";
}

function loadGroups(): Groups {
  try {
    return JSON.parse(localStorage.getItem(GROUPS_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

export const useGroupsStore = defineStore("groups", () => {
  const quotesStore = useQuotesStore();

  // ── State ──────────────────────────────────────────────
  const groups = ref<Groups>(loadGroups());

  function persist() {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(groups.value));
  }

  // ── Getters ────────────────────────────────────────────
  function getGroupMembers(masterId: string): GroupMember[] {
    return groups.value[masterId] || [];
  }

  // bookmarkIds that are "members" — hidden from the main list, since
  // only their master shows there. Text-snippet members aren't real
  // quotes and never appear in the main list, so they're excluded.
  const allMemberIds = computed<Set<string>>(() => {
    const set = new Set<string>();
    Object.values(groups.value).forEach((members) =>
      members.forEach((m) => {
        if (typeof m === "string") set.add(m);
      }),
    );
    return set;
  });

  function findMasterFor(bookmarkId: string): string | null {
    for (const [master, members] of Object.entries(groups.value)) {
      if (members.includes(bookmarkId)) return master;
    }
    return null;
  }

  // A quote that is itself a member of one group cannot also be a master
  // of another — kept simple, no nested groups.
  function isMasterWithMembers(id: string): boolean {
    const m = groups.value[id];
    return !!(m && m.length > 0);
  }

  function findQuoteByBookmarkId(id: string): Quote | undefined {
    return quotesStore.allQuotes.find((q) => q.bookmarkId === id);
  }

  // ── Mutations ──────────────────────────────────────────
  function addToGroup(masterId: string, memberId: string) {
    if (masterId === memberId) return;
    const g: Groups = { ...groups.value };
    if (!g[masterId]) g[masterId] = [];
    if (!g[masterId].includes(memberId))
      g[masterId] = [...g[masterId], memberId];
    // A quote can only belong to one group at a time
    Object.keys(g).forEach((m) => {
      if (m === masterId) return;
      const members = g[m];
      if (members) g[m] = members.filter((id) => id !== memberId);
    });
    groups.value = g;
    persist();
  }

  function removeFromGroup(masterId: string, memberId: string) {
    const g: Groups = { ...groups.value };
    if (g[masterId]) {
      g[masterId] = g[masterId].filter((id) => id !== memberId);
      if (g[masterId].length === 0) delete g[masterId];
    }
    groups.value = g;
    persist();
  }

  function addTextMember(masterId: string, text: string, book: string) {
    const g: Groups = { ...groups.value };
    if (!g[masterId]) g[masterId] = [];
    g[masterId] = [...g[masterId], { text, book }];
    groups.value = g;
    persist();
  }

  function removeMemberAt(masterId: string, index: number) {
    const g: Groups = { ...groups.value };
    if (!g[masterId]) return;
    const members = [...g[masterId]];
    members.splice(index, 1);
    if (members.length === 0) delete g[masterId];
    else g[masterId] = members;
    groups.value = g;
    persist();
  }

  // ── Text matching ──────────────────────────────────────
  // Finds an existing highlight whose text overlaps with a context
  // paragraph — used to auto-suggest linking (🔗) instead of creating
  // a separate inline text member.
  function findMatchingQuote(paraText: string, masterQ: Quote): Quote | null {
    const target = normalizeForMatch(paraText);
    if (target.length < 10) return null;
    const eligible = (q: Quote) =>
      q.bookmarkId !== masterQ.bookmarkId && !isMasterWithMembers(q.bookmarkId);
    const matches = (q: Quote) => {
      const qn = normalizeForMatch(q.text);
      return qn.length >= 10 && (target.includes(qn) || qn.includes(target));
    };
    const allQuotes = quotesStore.allQuotes;
    const sameBook = allQuotes.find(
      (q) => eligible(q) && q.book === masterQ.book && matches(q),
    );
    if (sameBook) return sameBook;
    return allQuotes.find((q) => eligible(q) && matches(q)) || null;
  }

  // Determines the icon state for a context paragraph:
  // 'linked' (−) — already a member, either as a matched quote or as this
  //                exact paragraph stored as an inline text snippet
  // 'match'  (🔗) — a text match to an existing highlight exists but isn't linked yet
  // 'none'   (+)  — no match; tapping adds this paragraph itself as a text member
  function getCtxIconState(text: string, q: Quote): CtxIconState {
    const members = getGroupMembers(q.bookmarkId);

    const match = findMatchingQuote(text, q);
    if (match) {
      if (
        members.some((m) => typeof m === "string" && m === match.bookmarkId)
      ) {
        return { state: "linked", kind: "quote", memberId: match.bookmarkId };
      }
      return { state: "match", kind: "quote", memberId: match.bookmarkId };
    }

    const paraKey = normalizeForMatch(text);
    const idx = members.findIndex(
      (m) => isTextMember(m) && normalizeForMatch(m.text) === paraKey,
    );
    if (idx !== -1) return { state: "linked", kind: "text", index: idx };

    return { state: "none", kind: "text" };
  }

  return {
    groups,
    getGroupMembers,
    allMemberIds,
    findMasterFor,
    isMasterWithMembers,
    findQuoteByBookmarkId,
    addToGroup,
    removeFromGroup,
    addTextMember,
    removeMemberAt,
    findMatchingQuote,
    getCtxIconState,
  };
});
