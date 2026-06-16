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
              v-html="enrichedQuoteText"
            >
            </div>

            <!-- Author attribution -->
            <p
              v-if="quote.author"
              class="mx-5 mb-5 text-right text-[13px] text-stone-400 italic tracking-wide"
            >
              — {{ quote.author }}
            </p>
            <div v-else class="mb-5" />

            <!-- Attached image -->
            <div v-if="attachedImageUrl" class="mx-5 mb-5 rounded-xl overflow-hidden border border-stone-100">
              <img :src="attachedImageUrl" class="w-full h-auto block" @error="attachedImageError = true" />
            </div>

            <!-- Action item: done toggle -->
            <!-- <div v-if="quote.color === 1" class="flex items-center gap-3 mx-5 mb-5">
              <button
                class="w-6 h-6 rounded border-2 flex items-center justify-center transition-all shrink-0"
                :class="isDone ? 'bg-red-500 border-red-500' : 'bg-white border-red-400'"
                @click="store.toggleDone(quote.id)"
              >
                <span v-if="isDone" class="text-white text-[13px] font-bold leading-none">✓</span>
              </button>
              <span class="text-[13px] text-red-400">{{ isDone ? 'Marked as done' : 'Mark as done' }}</span>
            </div> -->

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

            <!-- Group section: links to / from other quotes and context snippets -->
            <GroupSection
              :quote="quote"
              @navigate="onNavigateToQuote"
              @open-picker="emit('open-picker')"
            />

            <!-- Edit toggle -->
            <div class="flex justify-center px-5 pt-2.5 pb-1 border-t border-stone-100 mb-5">
              <button
                class="text-[12px] rounded-full px-4 py-1.5 transition-colors"
                :class="isOnline ?  'text-stone-900' : 'text-stone-400'"
                @click="toggleEdit"
              >
              <span v-if="connectHint" class="block min-h-6">Connect to Kobo to edit</span>
              <Edit v-else/></button>
            </div>

            <div v-if="editMode">
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
              <!-- Tabs -->
              <div class="flex gap-1 px-5 mb-3.5 border-b border-stone-100">
                <button
                  v-for="t in tabs"
                  :key="t.id"
                  class="flex-1 py-2.5 text-[13px] font-medium border-b-2 transition-colors"
                  :class="activeTab === t.id ? 'text-stone-900 border-stone-900' : 'text-stone-400 border-transparent'"
                  @click="activeTab = t.id"
                >{{ t.label }}</button>
              </div>

              <ContextTab v-if="activeTab === 'context'" :quote="quote" />
              <ImagesTab v-else-if="activeTab === 'images'" :quote="quote" />
              <TagsTab v-else-if="activeTab === 'tags'" :quote="quote" />
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
import { useQuoteContext } from '@/composables/UseQuoteContext.ts'
import GroupSection from '@/components/GroupSection.vue'
import ContextTab from '@/components/ContextTab.vue'
import ImagesTab from '@/components/ImagesTab.vue'
import TagsTab from '@/components/TagsTab.vue'
import nlp from 'compromise';
import { Edit } from '@lucide/vue'

const props = defineProps<{
  quote: Quote | null
  currentIndex: number
  total: number
  isOnline: boolean
}>()

const emit = defineEmits<{
  close: []
  navigate: [direction: number]
  'navigate-to-quote': [bookmarkId: string]
  'open-picker': []
}>()

const CONNECTORS = new Set([
  'of','the','and','in','for','to','a','an','or','with','on','at','by','de','du','la','le','von','van'
])

function extractEntities(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const entities: string[] = []
  let i = 0

  while (i < words.length) {
    const clean = words[i]?.replace(/[.,;:!?"')\]]+$/, '') ?? ''

    if (/^[A-ZÀ-Ÿ]/.test(clean) && !isSentenceStart(words, i)) {
      const parts: string[] = [clean]
      let j = i + 1

      while (j < words.length) {
        const cj = words[j]?.replace(/[.,;:!?"')\]]+$/, '') ?? ''

        if (/^[A-ZÀ-Ÿ]/.test(cj)) {
          parts.push(cj)
          j++
        } else if (
          CONNECTORS.has(cj.toLowerCase()) &&
          j + 1 < words.length &&
          /^[A-ZÀ-Ÿ]/.test(words[j + 1]?.replace(/[.,;:!?"')\]]+$/, '') ?? '')
        ) {
          parts.push(cj)
          j++
        } else {
          break
        }
      }

      if (parts.length >= 2) {
        entities.push(parts.join(' '))
      }
      i = j
    } else {
      i++
    }
  }

  const doc = nlp(text)
  const places: string[] = doc.places().out('array').map((item: string) => item.replace(/\.$/, ''))

  return [...new Set([...entities, ...places])]
}

function isSentenceStart(words: string[], i: number): boolean {
  if (i === 0) return true
  return /[.!?]["')\]]*$/.test(words[i - 1] ?? '')
}

const enrichedQuoteText = computed(() => {
  const text = props.quote?.text
  if (!props.quote?.isBlue) return props.quote?.text
  if (!text) return ''

  const nouns = extractEntities(text)

  // Sort longest first so "Dr. Michael Eades" gets matched before "Michael"
  const sorted = [...new Set(nouns)].sort((a, b) => (b as String).length - (a as String).length)
  let result = text
  for (let noun of sorted) {
    const escaped = (noun as String).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(
      new RegExp(`\\b(${escaped})\\b`, 'g'),
      '<a class="proper-noun" target="blank" href="https://www.google.com/search?q=$1">$1</a>'
    )
  }
  return result
})



const store = useQuotesStore()
const { chapterImageUrl } = useQuoteContext()
const copied = ref(false)
const coverError = ref(false)
const attachedImageError = ref(false)

// ── Edit mode + tabs ─────────────────────────────────────
const editMode = ref(false)
const connectHint = ref(false)
const activeTab = ref<'context' | 'images' | 'tags'>('context')

const tabs = [
  { id: 'context' as const, label: 'Context' },
  { id: 'images' as const, label: 'Images' },
  { id: 'tags' as const, label: 'Tags' },
]

function toggleEdit() {
  if (!props.isOnline) {
    connectHint.value = true
    setTimeout(() => { connectHint.value = false }, 1800)
    return
  }
  editMode.value = !editMode.value
}

function onNavigateToQuote(bookmarkId: string) {
  emit('navigate-to-quote', bookmarkId)
}

// Reset cover error and edit/tab state when quote changes
watch(() => props.quote, () => {
  coverError.value = false
  attachedImageError.value = false
  editMode.value = false
  connectHint.value = false
  activeTab.value = 'context'
})

const attachedImageUrl = computed(() => {
  if (!props.quote?.attachedImage || attachedImageError.value) return null
  return chapterImageUrl(props.quote.bookmarkId, props.quote.attachedImage)
})

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


<style>

.proper-noun {
  font-weight: bold;
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 3px;
  text-decoration-color: rgba(0,0,0,0.25);
}
</style>