<template>
  <div
    class="bg-white border border-stone-200 rounded-2xl p-4 cursor-pointer active:border-stone-300 transition-colors"
    @click="emit('open', quote)"
  >
    <!-- Top row: book title + color dot -->
    <div class="flex items-center justify-between mb-2 gap-2">
      <span class="text-[11px] text-stone-400 uppercase tracking-widest truncate flex-1">
        {{ quote.book }}
      </span>
      <span
        v-if="quote.color >= 0 && colorDot"
        class="w-2.5 h-2.5 rounded-full shrink-0"
        :style="{ background: colorDot }"
      />
    </div>

    <!-- Quote text -->
    <p
      class="font-serif text-[15px] leading-[1.7] text-stone-800 line-clamp-4"
      v-html="highlighted"
    />

    <!-- Bottom row: date -->
    <div class="flex items-center justify-between mt-2">
      <span v-if="quote.date" class="text-[11px] text-stone-300">
        {{ formatDate(quote.date) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useQuotesStore, type Quote } from '@/stores/quotes'

const props = defineProps<{
  quote: Quote
  idx: number
  searchQuery?: string
}>()

const emit = defineEmits<{
  open: [quote: Quote]
}>()

const store = useQuotesStore()

const colorDot = computed(() =>
  props.quote.color >= 0 ? store.COLOR_MAP[String(props.quote.color)] ?? null : null
)

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
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

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch { return d }
}
</script>
