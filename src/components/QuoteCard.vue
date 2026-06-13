<template>
  <!-- Gold — Elegant Callout -->
  <div
    v-if="quote.color === 0"
    class="bg-amber-50 border border-amber-200 border-l-[3px] border-l-amber-400 rounded-2xl p-4 pl-5 cursor-pointer active:border-amber-300"
    @click="emit('open', quote)"
  >
    <div class="flex items-center justify-between mb-2">
      <span class="text-[10px] text-amber-600 uppercase tracking-widest truncate flex-1">{{ quote.book }}</span>
      <InfoButton :quote="quote" :idx="idx" />
    </div>
    <p
      class="font-serif text-[16px] leading-[1.8] text-stone-800 italic line-clamp-5"
      v-html="highlighted"
    />
  </div>

  <!-- Red — Action Item / Task Card -->
  <div
    v-else-if="quote.color === 1"
    class="rounded-2xl p-4 cursor-pointer active:border-red-200"
    :class="isDone ? 'bg-red-50/50 border border-red-100 opacity-60' : 'bg-red-50 border border-red-200'"
    @click="emit('open', quote)"
  >
    <div class="flex items-center justify-between mb-2">
      <span class="text-[10px] text-red-400 uppercase tracking-widest truncate flex-1">{{ quote.book }}</span>
      <InfoButton :quote="quote" :idx="idx" />
    </div>
    <div class="flex items-start gap-3">
      <button
        class="shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
        :class="isDone ? 'bg-red-500 border-red-500' : 'bg-white border-red-400'"
        @click.stop="store.toggleDone(quote.id)"
      >
        <span v-if="isDone" class="text-white text-[11px] font-bold leading-none">✓</span>
      </button>
      <p
        class="text-[15px] leading-[1.6] text-stone-800 line-clamp-4"
        :class="isDone ? 'line-through text-stone-400' : ''"
        v-html="highlighted"
      />
    </div>
    <p v-if="quote.date" class="text-[11px] text-red-300 mt-2">Highlighted {{ formatDate(quote.date) }}</p>
  </div>

  <!-- Blue — Reference Snippet -->
  <div
    v-else-if="quote.color === 2"
    class="bg-blue-50 border border-blue-200 rounded-2xl p-4 cursor-pointer active:border-blue-300"
    @click="emit('open', quote)"
  >
    <div class="flex items-center justify-between mb-2">
      <span class="text-[10px] text-blue-500 uppercase tracking-widest truncate flex-1">{{ quote.book }}</span>
      <InfoButton :quote="quote" :idx="idx" />
    </div>
    <p
      class="text-[15px] leading-[1.6] text-stone-800 line-clamp-4"
      v-html="highlighted"
    />
    <div class="flex gap-1.5 mt-3 flex-wrap">
      <a
        v-for="link in refLinks"
        :key="link.label"
        :href="link.url"
        target="_blank"
        class="text-[11px] px-2.5 py-1 rounded-full border border-blue-200 text-blue-600 bg-blue-100 whitespace-nowrap active:bg-blue-200"
        @click.stop
      >{{ link.label }}</a>
    </div>
  </div>

  <!-- Green — Extras -->
  <div
    v-else-if="quote.color === 3"
    class="bg-green-50 border border-green-200 rounded-2xl p-4 cursor-pointer active:border-green-300"
    @click="emit('open', quote)"
  >
    <div class="flex items-center justify-between mb-2">
      <span class="text-[10px] text-green-600 uppercase tracking-widest truncate flex-1">{{ quote.book }}</span>
      <InfoButton :quote="quote" :idx="idx" />
    </div>
    <p
      class="text-[15px] leading-[1.6] text-stone-800 line-clamp-4"
      v-html="highlighted"
    />
    <span class="inline-block mt-2 text-[11px] px-2.5 py-1 bg-green-100 text-green-700 rounded-full">Extra</span>
  </div>

  <!-- Default / no color -->
  <div
    v-else
    class="bg-white border border-stone-200 rounded-2xl p-4 cursor-pointer active:border-stone-300"
    @click="emit('open', quote)"
  >
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <span
          v-if="quote.color >= 0"
          class="w-2 h-2 rounded-full shrink-0"
          :style="{ background: store.COLOR_MAP[String(quote.color)] }"
        />
        <span class="text-[10px] text-stone-400 uppercase tracking-widest truncate">{{ quote.book }}</span>
      </div>
      <InfoButton :quote="quote" :idx="idx" />
    </div>
    <p
      class="font-serif text-[15px] leading-[1.7] text-stone-800 line-clamp-4"
      v-html="highlighted"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useQuotesStore, type Quote } from '@/stores/quotes'
import InfoButton from './InfoButton.vue'

const props = defineProps<{
  quote: Quote
  idx: number
  searchQuery?: string
}>()

const emit = defineEmits<{
  open: [quote: Quote]
}>()

const store = useQuotesStore()

const isDone = computed(() => store.isDone(props.quote.id))

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const highlighted = computed(() => {
  const text = escHtml(props.quote.text)
  const q = props.searchQuery?.trim().toLowerCase()
  if (!q) return text
  return text.replace(
    new RegExp(`(${escRegex(q)})`, 'gi'),
    '<mark class="bg-amber-100 text-amber-800 rounded px-0.5">$1</mark>'
  )
})

const refLinks = computed(() => {
  const q = encodeURIComponent(props.quote.text.slice(0, 80))
  return [
    { label: 'Google', url: `https://www.google.com/search?q=${q}` },
    { label: 'Wikipedia', url: `https://en.wikipedia.org/w/index.php?search=${q}` },
    { label: 'Scholar', url: `https://scholar.google.com/scholar?q=${q}` },
    { label: 'Goodreads', url: `https://www.goodreads.com/search?q=${q}` },
  ]
})

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return d
  }
}
</script>
