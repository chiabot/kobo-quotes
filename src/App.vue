<template>
  <div class="min-h-screen bg-stone-50 font-sans pb-20">

    <!-- Cache status bar -->
    <div
      v-if="store.isConnected"
      class="flex items-center justify-between px-4 py-2 text-[12px]"
      :class="store.isLive ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'"
    >
      <span class="flex items-center gap-1.5">
        <span
          class="w-1.5 h-1.5 rounded-full"
          :class="store.isLive ? 'bg-emerald-500' : 'bg-stone-400'"
        />
        {{ store.isLive ? 'Live from Kobo' : 'Showing cached data' }}
      </span>
      <div class="flex gap-2">
        <button class="border border-stone-300 rounded-lg px-2.5 py-1 text-[12px] text-stone-500 active:bg-stone-200" @click="store.tryReconnect()">
          Refresh
        </button>
        <button class="border border-red-200 rounded-lg px-2.5 py-1 text-[12px] text-red-400 active:bg-red-50" @click="store.reset()">
          Reset
        </button>
      </div>
    </div>

    <!-- Connect panel -->
    <ConnectPanel v-if="!store.isConnected" />

    <!-- Main content -->
    <template v-else>
      <TopBar />

      <!-- Quotes list -->
      <div class="px-4 pt-3 flex flex-col gap-2.5">
        <TransitionGroup name="list">
          <QuoteCard
            v-for="(quote, idx) in store.filtered"
            :key="quote.bookmarkId || quote.id"
            :quote="quote"
            :idx="idx"
            :search-query="store.searchQuery"
            @open="openModal(idx)"
          />
        </TransitionGroup>

        <!-- Empty state -->
        <div
          v-if="store.filtered.length === 0"
          class="text-center py-16 text-stone-400 text-[15px] leading-relaxed"
        >
          No quotes found.<br>Try a different search.
        </div>
      </div>
    </template>

    <!-- Modal -->
    <QuoteModal
      :quote="modalQuote"
      :current-index="modalIndex"
      :total="store.filtered.length"
      :is-online="isOnline"
      @close="closeModal"
      @navigate="navigateModal"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuotesStore, type Quote } from '@/stores/quotes'
import ConnectPanel from '@/components/ConnectPanel.vue'
import TopBar from '@/components/TopBar.vue'
import QuoteCard from '@/components/QuoteCard.vue'
import QuoteModal from '@/components/QuoteModal.vue'

const store = useQuotesStore()

// ── Modal state ────────────────────────────────────────────
const modalIndex = ref(-1)

const modalQuote = computed<Quote | null>(() =>
  modalIndex.value >= 0 ? store.filtered[modalIndex.value] ?? null : null
)

function openModal(idx: number) {
  modalIndex.value = idx
}

function closeModal() {
  modalIndex.value = -1
}

function navigateModal(direction: number) {
  const next = modalIndex.value + direction
  if (next >= 0 && next < store.filtered.length) {
    modalIndex.value = next
  }
}

// ── Online check ───────────────────────────────────────────
const isOnline = ref(false)

async function checkOnline() {
  const ip = localStorage.getItem('kobo_ip_v3')
  if (!ip) { isOnline.value = false; return }
  const base = ip.startsWith('http') ? ip : 'http://' + ip
  try {
    const res = await fetch(base + '/ip', { signal: AbortSignal.timeout(2000) })
    isOnline.value = res.ok
  } catch {
    isOnline.value = false
  }
}

// ── Init ───────────────────────────────────────────────────
onMounted(async () => {
  const restored = store.loadFromCache()
  if (restored) {
    store.tryReconnect()
    checkOnline()
  }
  // Re-check online status every 30s
  setInterval(checkOnline, 30_000)
})
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;1,400&family=DM+Sans:wght@300;400;500&display=swap');

.font-serif { font-family: 'Lora', serif; }
.font-sans { font-family: 'DM Sans', sans-serif; }

.list-enter-active { transition: all 0.2s ease; }
.list-enter-from { opacity: 0; transform: translateY(8px); }
.list-leave-active { transition: all 0.15s ease; }
.list-leave-to { opacity: 0; }
</style>