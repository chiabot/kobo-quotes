<template>
  <div class="px-5 mb-3.5 min-h-[80px]">
    <div v-if="loading" class="text-[13px] text-stone-400 py-5 text-center">Finding images…</div>
    <div v-else-if="images?.error" class="text-[13px] text-stone-400 py-4 text-center">{{ images.error }}</div>
    <div v-else-if="!images?.candidates.length" class="text-[13px] text-stone-400 py-4 text-center">No images found near this quote.</div>
    <div v-else class="flex flex-col gap-3">
      <div
        v-for="c in images.candidates"
        :key="c.path"
        class="relative rounded-[10px] overflow-hidden border-2 cursor-pointer bg-stone-50"
        :class="quote.attachedImage === c.path ? 'border-green-400' : 'border-stone-200'"
        @click="selectImage(quote, c.path)"
      >
        <img :src="chapterImageUrl(quote.bookmarkId, c.path) ?? ''" loading="lazy" class="w-full h-auto block" />
        <div
          v-if="quote.attachedImage === c.path"
          class="absolute top-1.5 right-1.5 w-[22px] h-[22px] rounded-full bg-green-400 text-white flex items-center justify-center text-[12px] font-bold"
        >✓</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useQuoteContext } from '@/composables/UseQuoteContext'
import type { Quote } from '@/stores/quotes'

const props = defineProps<{ quote: Quote }>()

const { ensureImages, getImagesCache, chapterImageUrl, selectImage } = useQuoteContext()

const loading = ref(false)
const images = computed(() => getImagesCache(props.quote.bookmarkId))

async function load() {
  if (!getImagesCache(props.quote.bookmarkId)) {
    loading.value = true
    await ensureImages(props.quote)
    loading.value = false
  }
}

onMounted(load)
watch(() => props.quote.bookmarkId, load)
</script>
