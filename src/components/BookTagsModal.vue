<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[100] bg-black/50 flex items-end justify-center" @click.self="emit('close')">
      <div class="bg-white rounded-t-[20px] w-full max-w-[430px] max-h-[85vh] overflow-y-auto pb-10">
        <div class="w-10 h-1 bg-stone-200 rounded-full mx-auto mt-3 mb-5" />

        <div class="px-5 mb-4">
          <p class="text-[11px] text-stone-400 uppercase tracking-widest mb-1">Book tags</p>
          <p class="text-[16px] font-medium text-stone-900 leading-snug">{{ book.title }}</p>
        </div>

        <div class="px-5 mb-6">
          <TagSelector :model-value="tags" @update:model-value="onUpdate" />
        </div>

        <div class="px-5">
          <button class="w-full bg-stone-900 text-white rounded-xl py-3.5 text-[15px] font-medium active:opacity-80" @click="emit('close')">Done</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useQuotesStore } from '@/stores/quotes'
import TagSelector from './TagSelector.vue'

const props = defineProps<{ book: { title: string; volumeId: string } }>()
const emit = defineEmits<{ close: [] }>()

const store = useQuotesStore()
const tags = ref<string[]>(store.getBookTags(props.book.title))

function onUpdate(newTags: string[]) {
  tags.value = newTags
  store.setBookTags(props.book.title, newTags)
}
</script>
