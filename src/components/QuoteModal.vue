<template>
  <Teleport to="body">
    <Transition name="overlay">
      <div
        v-if="quote"
        class="fixed inset-0 z-[100] bg-black/50 flex items-end justify-center"
        @click.self="emit('close')"
      >
        <Transition name="sheet">
          <div
            class="bg-white rounded-t-[20px] w-full max-w-[430px] max-h-[85vh] overflow-y-auto pb-10"
            :class="sheetBorderClass"
          >
            <!-- Handle -->
            <div class="w-10 h-1 bg-stone-200 rounded-full mx-auto mt-3 mb-5" />

            <!-- Header: cover + title -->
            <div class="flex gap-3 px-5 mb-4 items-start">
              <div class="shrink-0">
                <img
                  v-if="coverSrc"
                  :src="coverSrc"
                  class="w-14 h-[76px] rounded object-cover shadow-md"
                  @error="coverError = true"
                />
                <div
                  v-else
                  class="w-14 h-[76px] rounded bg-stone-100 flex items-center justify-center text-2xl text-stone-300"
                >📖</div>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[11px] text-stone-400 uppercase tracking-widest mb-1 truncate">
                  {{ quote.book }}
                </p>
                <p
                  v-if="quote.bookProgress"
                  class="text-[11px] text-stone-400"
                >{{ quote.bookProgress }}% through book</p>
              </div>
            </div>

            <!-- Quote text -->
            <div
              class="mx-5 mb-2 pl-4 border-l-2 text-stone-800"
              :class="quoteClass"
            >
              {{ quote.text }}
            </div>

            <!-- Author attribution -->
            <p
              v-if="quote.author"
              class="mx-5 mb-5 text-right text-[13px] text-stone-400 italic tracking-wide"
            >
              — {{ quote.author }}
            </p>
            <div v-else class="mb-5" />

            <!-- Action item: done toggle -->
            <div v-if="quote.color === 1" class="flex items-center gap-3 mx-5 mb-5">
              <button
                class="w-6 h-6 rounded border-2 flex items-center justify-center transition-all shrink-0"
                :class="isDone ? 'bg-red-500 border-red-500' : 'bg-white border-red-400'"
                @click="store.toggleDone(quote.id)"
              >
                <span v-if="isDone" class="text-white text-[13px] font-bold leading-none">✓</span>
              </button>
              <span class="text-[13px] text-red-400">{{ isDone ? 'Marked as done' : 'Mark as done' }}</span>
            </div>

            <!-- Reference links -->
            <div v-if="quote.color === 2" class="flex gap-2 flex-wrap mx-5 mb-5">
              <a
                v-for="link in refLinks"
                :key="link.label"
                :href="link.url"
                target="_blank"
                class="text-[13px] px-3 py-2 rounded-full border border-blue-200 text-blue-600 bg-blue-50 active:bg-blue-100"
              >{{ link.label }}</a>
            </div>

            <!-- Annotation -->
            <div v-if="quote.annotation" class="mx-5 mb-5 p-3 bg-stone-50 rounded-xl border border-stone-100">
              <p class="text-[11px] text-stone-400 uppercase tracking-widest mb-1">Note</p>
              <p class="text-[14px] text-stone-700 italic leading-relaxed">{{ quote.annotation }}</p>
            </div>

            <!-- Reclassify (online only) -->
            <div v-if="isOnline" class="mx-5 mb-5 pt-4 border-t border-stone-100">
              <p class="text-[11px] text-stone-400 uppercase tracking-widest mb-3">Reclassify</p>
              <div class="flex gap-3 items-center">
                <button
                  v-for="(hex, val) in store.COLOR_MAP"
                  :key="val"
                  class="w-7 h-7 rounded-full border-2 transition-all active:scale-90"
                  :style="{ background: hex }"
                  :class="String(quote.color) === val ? 'border-stone-900 scale-110' : 'border-transparent'"
                  :title="store.COLOR_NAMES[val]"
                  @click="reassign(Number(val))"
                />
              </div>
            </div>

            <!-- Actions row -->
            <div class="flex gap-2.5 px-5">
              <button
                class="flex-1 bg-stone-900 text-stone-50 rounded-xl text-[15px] font-medium py-3.5 active:opacity-80"
                @click="copy"
              >{{ copied ? 'Copied!' : 'Copy quote' }}</button>
              <button
                class="flex-1 bg-stone-100 text-stone-600 rounded-xl text-[15px] py-3.5 active:opacity-80"
                @click="emit('close')"
              >Close</button>
            </div>

            <!-- Prev / Next navigation -->
            <div class="flex justify-between items-center px-5 mt-4">
              <button
                class="flex items-center gap-1 text-[13px] text-stone-400 active:text-stone-600 disabled:opacity-30"
                :disabled="currentIndex <= 0"
                @click="navigate(-1)"
              >← Previous</button>
              <span class="text-[12px] text-stone-300">{{ currentIndex + 1 }} / {{ total }}</span>
              <button
                class="flex items-center gap-1 text-[13px] text-stone-400 active:text-stone-600 disabled:opacity-30"
                :disabled="currentIndex >= total - 1"
                @click="navigate(1)"
              >Next →</button>
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

const props = defineProps<{
  quote: Quote | null
  currentIndex: number
  total: number
  isOnline: boolean
}>()

const emit = defineEmits<{
  close: []
  navigate: [direction: number]
}>()

const store = useQuotesStore()
const copied = ref(false)
const coverError = ref(false)

// Reset cover error when quote changes
watch(() => props.quote, () => { coverError.value = false })

const coverSrc = computed(() => {
  if (!props.quote || coverError.value) return null
  return store.getCachedCover(props.quote.volumeId)
})

const isDone = computed(() => props.quote ? store.isDone(props.quote.id) : false)

const sheetBorderClass = computed(() => {
  if (!props.quote) return ''
  const map: Record<number, string> = {
    0: 'border-t-4 border-amber-400',
    1: 'border-t-4 border-red-400',
    2: 'border-t-4 border-blue-400',
    3: 'border-t-4 border-green-400',
  }
  return map[props.quote.color] ?? ''
})

const quoteClass = computed(() => {
  if (!props.quote) return ''
  const map: Record<number, string> = {
    0: 'font-serif text-[18px] leading-[1.8] italic border-amber-300',
    1: 'text-[16px] leading-[1.65] border-red-200',
    2: 'text-[16px] leading-[1.65] border-blue-200',
    3: 'text-[16px] leading-[1.65] border-green-200',
  }
  return map[props.quote.color] ?? 'font-serif text-[17px] leading-[1.75] border-stone-200'
})

const refLinks = computed(() => {
  if (!props.quote) return []
  const q = encodeURIComponent(props.quote.text.slice(0, 80))
  return [
    { label: 'Google', url: `https://www.google.com/search?q=${q}` },
    { label: 'Wikipedia', url: `https://en.wikipedia.org/w/index.php?search=${q}` },
    { label: 'Scholar', url: `https://scholar.google.com/scholar?q=${q}` },
    { label: 'Goodreads', url: `https://www.goodreads.com/search?q=${q}` },
  ]
})

async function copy() {
  if (!props.quote) return
  await navigator.clipboard.writeText(`"${props.quote.text}"\n— ${props.quote.book}`)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

async function reassign(color: number) {
  if (!props.quote) return
  await store.updateColor(props.quote.bookmarkId, color)
}

function navigate(direction: number) {
  emit('navigate', direction)
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
