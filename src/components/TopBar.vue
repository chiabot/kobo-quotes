<template>
  <div class="sticky top-0 z-20 bg-stone-50 border-b border-stone-200">

    <!-- Title row -->
    <div class="flex items-center justify-between px-4 pt-4 pb-3">
      <span class="font-serif text-[22px] font-medium tracking-tight text-stone-900">Kobo Quotes</span>
      <span class="text-[12px] text-stone-400 bg-stone-100 rounded-full px-3 py-1">
        {{ store.filtered.length }} {{ store.filtered.length === 1 ? 'quote' : 'quotes' }}
      </span>
    </div>

    <!-- Search -->
    <div class="relative px-4 mb-2 flex items-center gap-2">
      <input
        v-model="store.searchQuery"
        type="search"
        placeholder="Search quotes…"
        autocorrect="off"
        spellcheck="false"
        class="w-full bg-white border border-stone-200 rounded-xl text-[16px] px-3 py-[11px] pr-9 outline-none focus:border-stone-400"
      />
      <!-- Vertical Separator -->
    <div class="h-8 w-px bg-gray-300 mx-2"></div>
      <button
        v-if="store.searchQuery"
        class="absolute right-7 top-1/2 -translate-y-1/2 text-stone-400 text-lg px-1"
        @click="store.searchQuery = ''"
      ><X /></button>      
      <button @click="toggletagsFilter" :class="toggleWithTags || toggleWithTags === false ? 'text-stone-800' : 'text-stone-400'">
        <Tags v-if="toggleWithTags || toggleWithTags === null"/><SvgIcon name="tags-off" v-else/>
      </button>
      <button @click="filterWithImage" :class="typeof toggleWithImage === 'boolean' ? 'text-stone-800' : 'text-stone-400'">
        <Images v-if="toggleWithImage || toggleWithImage === null"/>
        <ImageOff v-else/>
      </button>
    </div>
    <div class="px-4 mb-2 flex flex-wrap gap-1.5" v-if="toggleWithTags">
      <button v-for="t in store.allTags" 
        :key="t"
        class="inline-flex items-center text-stone-400 text-base leading-none px-1" @click="toggleTag(t)">
      <span
        class="border border-stone-200 rounded-full px-1.5 py-1.5 text-[13px] text-stone-600"
        :class="{'bg-orange-500 text-white': tagsFilter.includes(t), 'bg-stone-50 text-stone-600': !tagsFilter.includes(t)}"
      >
        {{ t }}
      </span> 
      </button>
    </div>

    <!-- Filter row -->
    <div class="flex gap-2 px-4 pb-3 min-w-0">

      <!-- Book select -->
      <div class="flex-1 min-w-0">
        <button
          class="w-full bg-white border border-stone-200 rounded-xl text-[15px] px-3 py-[11px] pr-8 text-left outline-none truncate
                 bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%228%22%20viewBox%3D%220%200%2012%208%22%3E%3Cpath%20d%3D%22M1%201l5%205%205-5%22%20stroke%3D%22%23a09070%22%20stroke-width%3D%221.5%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fsvg%3E')
                 bg-no-repeat bg-[right_12px_center]"
          @click.stop="toggleBook"
        >
          {{ store.selectedBook || 'All books' }}
        </button>

        <!-- Book dropdown -->
        <Teleport to="body">
          <div
            v-if="bookOpen"
            class="fixed z-50 bg-white border border-stone-200 rounded-2xl shadow-xl overflow-hidden"
            :style="bookDropdownStyle"
          >
            <div class="overflow-y-auto max-h-[60vh]">
              <!-- All books -->
              <button
                class="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-left border-b border-stone-100"
                :class="!store.selectedBook ? 'bg-stone-50 font-medium' : ''"
                @click.stop="selectBook('')"
              >
                <span class="w-11 h-[60px] rounded bg-stone-100 flex items-center justify-center text-lg shrink-0">📚</span>
                <span>All books</span>
              </button>

              <!-- Book options -->
              <button
                v-for="b in store.books"
                :key="b.title"
                class="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-left border-b border-stone-100 last:border-0"
                :class="store.selectedBook === b.title ? 'bg-stone-50 font-medium' : ''"
                @click.stop="selectBook(b.title)"
              >
                <img
                  v-if="store.getCachedCover(b.volumeId)"
                  :src="store.getCachedCover(b.volumeId)!"
                  class="w-11 h-[60px] rounded object-cover shrink-0 shadow-sm"
                  @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
                />
                <span
                  v-else
                  class="w-11 h-[60px] rounded bg-stone-100 flex items-center justify-center text-lg shrink-0"
                >📖</span>
                <span class="truncate">{{ b.title }}</span>
              </button>
            </div>
          </div>
        </Teleport>
      </div>

      <!-- Color select -->
      <div class="shrink-0 w-[140px] relative">
        <button
          class="w-full bg-white border border-stone-200 rounded-xl text-[15px] px-3 py-[11px] pr-8 text-left outline-none flex items-center gap-2
                 bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%228%22%20viewBox%3D%220%200%2012%208%22%3E%3Cpath%20d%3D%22M1%201l5%205%205-5%22%20stroke%3D%22%23a09070%22%20stroke-width%3D%221.5%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fsvg%3E')
                 bg-no-repeat bg-[right_12px_center]"
          @click.stop="toggleColor"
        >
          <span
            v-if="store.selectedColor"
            class="w-2.5 h-2.5 rounded-full shrink-0"
            :style="{ background: store.COLOR_MAP[store.selectedColor] }"
          />
          <span class="truncate">{{ store.selectedColor ? store.COLOR_NAMES[store.selectedColor] : 'All colors' }}</span>
        </button>

        <!-- Color dropdown -->
        <div
          v-if="colorOpen"
          class="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-stone-200 rounded-xl shadow-lg z-50 overflow-hidden"
        >
          <button
            class="w-full flex items-center gap-2.5 px-3 py-[11px] text-[14px] text-left border-b border-stone-100"
            :class="!store.selectedColor ? 'bg-stone-50 font-medium' : ''"
            @click.stop="selectColor('')"
          >
            <span class="w-2.5 h-2.5 shrink-0" />
            All colors
          </button>
          <button
            v-for="(hex, val) in store.COLOR_MAP"
            :key="val"
            class="w-full flex items-center gap-2.5 px-3 py-[11px] text-[14px] text-left border-b border-stone-100 last:border-0"
            :class="store.selectedColor === val ? 'bg-stone-50 font-medium' : ''"
            @click.stop="selectColor(val)"
          >
            <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: hex }" />
            {{ store.COLOR_NAMES[val] }}
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useQuotesStore } from '@/stores/quotes'
import { X, Tags, Images, ImageOff } from '@lucide/vue'
import SvgIcon from './SvgIcon.vue';
const store = useQuotesStore()

const bookOpen = ref(false)
const colorOpen = ref(false)
const toggleWithTags = ref<boolean | null>(null);
const toggleWithImage = ref<boolean | null>(null);
const bookDropdownStyle = ref({})
const bookBtnRef = ref<HTMLElement | null>(null)
const tagsFilter = ref<String[] | false>([]);


function toggletagsFilter() {
  switch(toggleWithTags.value) {
    case null: 
     toggleWithTags.value = true;
     break;
    case true: 
     toggleWithTags.value = false;
      tagsFilter.value = false;
     break;
    case false: 
     toggleWithTags.value = null;
      tagsFilter.value = []
     break;
  }
  if (!toggleWithTags.value) {
    store.setTagsFilter(tagsFilter.value);
  }
}

function filterWithImage() {
  switch(toggleWithImage.value) {
    case null: 
     toggleWithImage.value = true
     break;
    case true: 
     toggleWithImage.value = false
     break;
    case false: 
     toggleWithImage.value = null
     break;
  }
  console.log(toggleWithImage.value)
  store.toggleImageFilter(toggleWithImage.value);
}

function toggleTag (tag: string) {
  const index = tagsFilter.value.indexOf(tag);
  if (index === -1) {
      tagsFilter.value.push(tag)
  } else {
    tagsFilter.value.splice(index, 1);
  }
  store.setTagsFilter(tagsFilter.value);
}

function toggleBook(e: MouseEvent) {
  colorOpen.value = false
  bookOpen.value = !bookOpen.value
  if (bookOpen.value) {
    const btn = (e.currentTarget as HTMLElement)
    const rect = btn.getBoundingClientRect()
    bookDropdownStyle.value = {
      top: `${rect.bottom + window.scrollY + 4}px`,
      left: '16px',
      right: '16px',
    }
  }
}

function toggleColor(e: MouseEvent) {
  e.stopPropagation()
  bookOpen.value = false
  colorOpen.value = !colorOpen.value
}

function selectBook(title: string) {
  store.selectedBook = title
  bookOpen.value = false
}

function selectColor(val: string) {
  store.selectedColor = val
  colorOpen.value = false
}

function closeAll() {
  bookOpen.value = false
  colorOpen.value = false
}

onMounted(() => document.addEventListener('click', closeAll))
onUnmounted(() => document.removeEventListener('click', closeAll))
</script>
