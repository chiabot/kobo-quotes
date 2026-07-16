<template>
  <div>
    <div class="flex flex-wrap gap-1.5 mb-3">
      <button
        v-for="t in store.allTags"
        :key="t"
        class="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] border transition-colors"
        :class="isActive(t) ? 'bg-orange-500 text-white border-orange-500' : 'bg-stone-50 text-stone-600 border-stone-200'"
        @click="toggle(t)"
      >
        {{ t }}<span v-if="isActive(t)" class="text-[11px] opacity-80">×</span>
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
      <button class="bg-green-600 text-white rounded-[10px] px-4 py-2.5 text-[14px] active:opacity-80" @click="add">Add</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useQuotesStore } from '@/stores/quotes'

const props = defineProps<{ modelValue: string[] }>()
const emit = defineEmits<{ 'update:modelValue': [tags: string[]] }>()

const store = useQuotesStore()
const newTag = ref('')

const isActive = (tag: string) => props.modelValue.includes(tag)

function toggle(tag: string) {
  emit('update:modelValue', isActive(tag)
    ? props.modelValue.filter(t => t !== tag)
    : [...props.modelValue, tag]
  )
}

function add() {
  const val = newTag.value.trim()
  if (!val || props.modelValue.includes(val)) return
  emit('update:modelValue', [...props.modelValue, val])
  newTag.value = ''
}
</script>
