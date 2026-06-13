<template>
  <div class="relative shrink-0 ml-2" @click.stop>
    <button
      v-if="hasInfo"
      class="w-[22px] h-[22px] rounded-full bg-stone-100 text-stone-500 text-[12px] font-semibold flex items-center justify-center active:bg-stone-200"
      @click="toggle"
    >i</button>

    <div
      v-if="open"
      class="absolute top-7 right-0 bg-stone-900 text-stone-100 rounded-xl px-3 py-2.5 text-[12px] leading-[1.7] whitespace-nowrap z-50 shadow-xl min-w-[160px]"
    >
      <div v-if="quote.author" class="flex gap-2">
        <span class="text-stone-400 text-[11px]">Author</span>
        <span>{{ quote.author }}</span>
      </div>
      <div v-if="quote.bookProgress" class="flex gap-2">
        <span class="text-stone-400 text-[11px]">Progress</span>
        <span>{{ quote.bookProgress }}% through book</span>
      </div>
      <div v-if="quote.date" class="flex gap-2">
        <span class="text-stone-400 text-[11px]">Highlighted</span>
        <span>{{ formatDate(quote.date) }}</span>
      </div>
      <div
        v-if="quote.annotation"
        class="mt-2 pt-2 border-t border-stone-700 italic text-stone-200 whitespace-normal max-w-[220px]"
      >
        "{{ quote.annotation }}"
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { type Quote } from '@/stores/quotes'

const props = defineProps<{
  quote: Quote
  idx: number
}>()

const open = ref(false)

const hasInfo = computed(() =>
  !!(props.quote.author || props.quote.bookProgress || props.quote.annotation)
)

function toggle() {
  open.value = !open.value
}

function closeOnOutside() {
  open.value = false
}

onMounted(() => document.addEventListener('click', closeOnOutside))
onUnmounted(() => document.removeEventListener('click', closeOnOutside))

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return d
  }
}
</script>