<template>
  <div class="px-5 mb-3.5 min-h-[80px]">
    <div class="flex flex-wrap gap-1.5 mb-3">
      <span
        v-for="t in quote.tags"
        :key="t"
        class="inline-flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-full pl-3 pr-1.5 py-1.5 text-[13px] text-stone-600"
      >
        {{ t }}
        <button class="text-stone-400 text-base leading-none px-1" @click="remove(t)">×</button>
      </span>
      <span v-if="!quote.tags.length" class="text-[13px] text-stone-400 py-1">No tags yet</span>
    </div>
    <div class="flex gap-2">
      <input
        v-model="newTag"
        type="text"
        placeholder="Add tag…"
        autocomplete="off"
        class="flex-1 bg-stone-50 border border-stone-200 rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-stone-400"
        @keydown.enter="add"
      />
      <button class="bg-stone-900 text-white rounded-[10px] px-4 py-2.5 text-[14px] active:opacity-80" @click="add">Add</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useQuotesStore, type Quote } from '@/stores/quotes'

const props = defineProps<{ quote: Quote }>()
const store = useQuotesStore()
const newTag = ref('')

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

function add() {
  const val = newTag.value.trim()
  if (!val) return
  if (!props.quote.tags.includes(val)) {
    props.quote.tags = [...props.quote.tags, val]
    persist()
  }
  newTag.value = ''
}

function remove(tag: string) {
  props.quote.tags = props.quote.tags.filter(t => t !== tag)
  persist()
}
</script>
