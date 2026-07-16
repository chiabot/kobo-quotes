<template>
  <div>
    <div class="sticky top-0 z-20 bg-stone-50 border-b border-stone-200">
      <div class="flex items-center justify-between px-4 pt-4 pb-3">
        <span class="font-serif text-[22px] font-medium tracking-tight text-stone-900">
          {{ store.books.length }} {{ store.books.length === 1 ? 'Book' : 'Books' }}
        </span>
        <button class="text-[12px] text-stone-400 bg-stone-100 rounded-full px-3 py-1 active:bg-stone-200" @click="store.currentView = 'quotes'">
          ← Back
        </button>
      </div>
    </div>

    <div class="px-4 pt-3 flex flex-col gap-2.5 pb-20">
      <div
        v-for="b in store.books"
        :key="b.title"
        class="bg-white border border-stone-200 rounded-2xl p-4 cursor-pointer active:border-stone-300 flex items-center gap-3"
        @click="selectedBook = b"
      >
        <img
          v-if="store.getCachedCover(b.volumeId)"
          :src="store.getCachedCover(b.volumeId)!"
          class="w-11 h-15 rounded object-cover shrink-0 shadow-sm"
        />
        <span v-else class="w-11 h-15 rounded bg-stone-100 flex items-center justify-center text-xl shrink-0">📖</span>
        <div class="flex-1 min-w-0">
          <p class="text-[14px] font-medium text-stone-800 truncate">{{ b.title }}</p>
          <div class="flex flex-wrap gap-1 mt-1.5">
            <span
              v-for="t in store.getBookTags(b.title)"
              :key="t"
              class="text-[11px] bg-orange-100 text-orange-700 rounded-full px-2 py-0.5"
            >{{ t }}</span>
            <span v-if="!store.getBookTags(b.title).length" class="text-[11px] text-stone-300">No tags</span>
          </div>
        </div>
      </div>
    </div>

    <BookTagsModal v-if="selectedBook" :book="selectedBook" @close="selectedBook = null" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useQuotesStore } from '@/stores/quotes'
import BookTagsModal from './BookTagsModal.vue'

const store = useQuotesStore()
const selectedBook = ref<{ title: string; volumeId: string } | null>(null)
</script>
