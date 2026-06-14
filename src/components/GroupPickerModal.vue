<template>
  <Teleport to="body">
    <Transition name="overlay">
      <div
        v-if="quote"
        class="fixed inset-0 z-[110] bg-black/50 flex items-end justify-center"
        @click.self="emit('close')"
      >
        <Transition name="sheet">
          <div class="bg-white rounded-t-[20px] w-full max-w-[430px] max-h-[80vh] flex flex-col">
            <div class="w-10 h-1 bg-stone-200 rounded-full mx-auto mt-3 mb-3 shrink-0" />

            <div class="px-5 pb-3 shrink-0">
              <input
                v-model="search"
                type="text"
                placeholder="Search quotes…"
                autocomplete="off"
                class="w-full bg-stone-50 border border-stone-200 rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-stone-400"
              />
            </div>

            <div class="flex-1 overflow-y-auto px-5 pb-3 flex flex-col gap-2">
              <div
                v-for="c in filtered"
                :key="c.bookmarkId"
                class="flex items-center gap-3 bg-stone-50 border rounded-xl px-3 py-2.5 cursor-pointer active:bg-stone-100"
                :class="isMember(c.bookmarkId) ? 'border-green-400' : 'border-stone-200'"
                @click="toggle(c.bookmarkId)"
              >
                <div class="flex-1 min-w-0">
                  <span class="block text-[10px] text-stone-400 uppercase tracking-wider mb-0.5 truncate">{{ c.book }}</span>
                  <span class="block text-[13px] text-stone-600 truncate">{{ c.text }}</span>
                </div>
                <div
                  class="w-5 h-5 rounded-full border flex items-center justify-center text-[11px] font-bold shrink-0"
                  :class="isMember(c.bookmarkId) ? 'bg-green-400 border-green-400 text-white' : 'border-stone-300 text-transparent'"
                >✓</div>
              </div>

              <div v-if="!filtered.length" class="text-[13px] text-stone-400 text-center py-6">No matching quotes.</div>
            </div>

            <div class="px-5 py-3 border-t border-stone-100 shrink-0">
              <button
                class="w-full bg-stone-900 text-white rounded-xl py-3 text-[15px] font-medium active:opacity-80"
                @click="emit('close')"
              >Done</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useQuotesStore, type Quote } from '@/stores/quotes'
import { useGroupsStore, normalizeForMatch } from '@/stores/groups'

const props = defineProps<{ quote: Quote | null }>()
const emit = defineEmits<{ close: [] }>()

const quotesStore = useQuotesStore()
const groupsStore = useGroupsStore()
const search = ref('')

// Reset search whenever a new master quote is being grouped
watch(() => props.quote, () => { search.value = '' })

const filtered = computed(() => {
  const q = props.quote
  if (!q) return []
  const members = new Set(groupsStore.getGroupMembers(q.bookmarkId))
  const term = normalizeForMatch(search.value)
  return quotesStore.allQuotes.filter(c => {
    if (c.bookmarkId === q.bookmarkId) return false
    // Masters-with-members can't themselves be picked (no nested groups),
    // unless they're already a member of THIS group (so they can be removed).
    if (groupsStore.isMasterWithMembers(c.bookmarkId) && !members.has(c.bookmarkId)) return false
    if (term) {
      return normalizeForMatch(c.text).includes(term) || normalizeForMatch(c.book).includes(term)
    }
    return true
  }).slice(0, 100)
})

function isMember(id: string): boolean {
  const q = props.quote
  if (!q) return false
  return groupsStore.getGroupMembers(q.bookmarkId).includes(id)
}

function toggle(id: string) {
  const q = props.quote
  if (!q) return
  if (isMember(id)) {
    groupsStore.removeFromGroup(q.bookmarkId, id)
  } else {
    groupsStore.addToGroup(q.bookmarkId, id)
  }
}
</script>

<style scoped>
.overlay-enter-active,
.overlay-leave-active { transition: opacity 0.2s ease; }
.overlay-enter-from,
.overlay-leave-to { opacity: 0; }

.sheet-enter-active,
.sheet-leave-active { transition: transform 0.25s ease; }
.sheet-enter-from,
.sheet-leave-to { transform: translateY(100%); }
</style>
