<template>
  <div class="px-5 mb-3.5 min-h-[80px]">
    <TagSelector :model-value="quote.tags" @update:model-value="onUpdate" />
  </div>
</template>

<script setup lang="ts">
import { useQuotesStore, type Quote } from '@/stores/quotes'
import TagSelector from './TagSelector.vue'

const props = defineProps<{ quote: Quote }>()
const store = useQuotesStore()

async function persist() {
  const base = store.getBaseUrl()
  if (!base || !props.quote.bookmarkId) return
  try {
    await fetch(base + '/bookmark/tags', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookmark_id: props.quote.bookmarkId, tags: props.quote.tags }),
    })
  } catch (e) {
    console.error('saveTags failed', e)
  }
}

function onUpdate(tags: string[]) {
  props.quote.tags = tags
  persist()
}
</script>
