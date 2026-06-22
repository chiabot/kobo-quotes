<template>
  <div class="px-5 mb-3.5 min-h-[80px]">
    <div class="flex flex-wrap gap-1.5 mb-3">
      <button
        v-for="t in store.allTags"
        :key="t"
        class="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] border transition-colors"
        :class="isActive(t)
          ? 'bg-orange-500 text-white border-orange-500'
          : 'bg-stone-50 text-stone-600 border-stone-200'"
        @click="toggle(t)"
      >
        {{ t }}<span v-if="isActive(t)" class="text-[11px] leading-none opacity-80">×</span>
      </button>
      <span v-if="!store.allTags.length" class="text-[13px] text-stone-400 py-1">No tags yet</span>
    </div>
    <div class="flex gap-2">
      <input
        v-model="newTag"
        type="text"
        placeholder="New tag…"
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

const isActive = (tag: string) => props.quote.tags.includes(tag)

function toggle(tag: string) {
  props.quote.tags = isActive(tag)
    ? props.quote.tags.filter(t => t !== tag)
    : [...props.quote.tags, tag]
  persist()
}

function add() {
  const val = newTag.value.trim()
  if (!val || props.quote.tags.includes(val)) return
  props.quote.tags = [...props.quote.tags, val]
  persist()
  newTag.value = ''
}
</script>
