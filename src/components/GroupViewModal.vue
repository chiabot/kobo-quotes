<template>
  <Teleport to="body">
    <Transition name="overlay">
      <div
        v-if="master"
        class="fixed inset-0 z-[100] bg-black/50 flex items-end justify-center"
        @click.self="emit('close')"
      >
        <Transition name="sheet">
          <div class="bg-stone-50 rounded-t-[20px] w-full max-w-[430px] max-h-[85vh] flex flex-col pb-6">
            <div class="w-10 h-1 bg-stone-200 rounded-full mx-auto mt-3 mb-3 shrink-0" />

            <div class="flex-1 overflow-y-auto px-5 flex flex-col gap-3">
              <!-- Master -->
              <div
                class="bg-white border-l-[3px] border-amber-400 border-y border-r border-stone-200 rounded-2xl p-4 cursor-pointer active:border-stone-300"
                @click="goTo(master.bookmarkId)"
              >
                <div class="flex items-center justify-between gap-2 mb-2">
                  <span class="text-[11px] text-stone-400 uppercase tracking-widest truncate flex-1">{{ master.book }}</span>
                  <span v-if="masterColorDot" class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: masterColorDot }" />
                </div>
                <p class="font-serif text-[15px] leading-[1.7] text-stone-800">{{ master.text }}</p>
                <p v-if="master.author" class="text-right text-[12px] text-stone-400 italic mt-2">— {{ master.author }}</p>
              </div>

              <!-- Attached image -->
              <div v-if="imageUrl" class="border border-stone-200 bg-white">
                <img :src="imageUrl" class="w-full h-auto min-h-10 block rounded-xl" @error="imageError = true" />
              </div>

              <!-- Members -->
              <div
                v-for="(m, idx) in members"
                :key="idx"
                class="bg-white border border-stone-200 rounded-2xl p-3.5"
                :class="typeof m === 'string' ? 'cursor-pointer active:border-stone-300' : ''"
                @click="typeof m === 'string' && goTo(m)"
              >
                <span class="block text-[10px] text-stone-400 uppercase tracking-wider mb-1 truncate">{{ memberBook(m) }}</span>
                <p class="font-serif text-[14px] leading-[1.6] text-stone-600">{{ memberPreview(m) }}</p>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useGroupsStore, type GroupMember } from '@/stores/groups'
import { useQuotesStore } from '@/stores/quotes'
import { useQuoteContext } from '@/composables/UseQuoteContext.ts'

const props = defineProps<{ masterId: string | null }>()
const emit = defineEmits<{
  close: []
  navigate: [bookmarkId: string]
}>()

const groupsStore = useGroupsStore()
const quotesStore = useQuotesStore()
const { chapterImageUrl } = useQuoteContext()

const imageError = ref(false)
watch(() => props.masterId, () => { imageError.value = false })

const master = computed(() => props.masterId ? groupsStore.findQuoteByBookmarkId(props.masterId) : undefined)

const members = computed(() => {
  if (!props.masterId) return []
  return groupsStore.getGroupMembers(props.masterId)
    .filter(m => typeof m !== 'string' || !!groupsStore.findQuoteByBookmarkId(m))
})

const masterColorDot = computed(() => {
  const m = master.value
  if (!m || m.color < 0) return null
  return quotesStore.COLOR_MAP[String(m.color)] ?? null
})

const imageUrl = computed(() => {
  const m = master.value
  if (!m?.attachedImage || imageError.value) {
    return null;
    return 'https://imgs.search.brave.com/xGiQ4ZwMSCLFiwRn86hHTdh3I8vgFv7CVecGM4wQ4Ow/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9pbWFn/ZXMudGVtcGxhdGUu/bmV0L3dwLWNvbnRl/bnQvdXBsb2Fkcy8y/MDIyLzExL1Bpbmst/V2FsbHBhcGVyLUlt/YWdlcy5qcGc'
  }
  return chapterImageUrl(m.bookmarkId, m.attachedImage)
})

function goTo(bookmarkId: string) {
  emit('navigate', bookmarkId)
  emit('close')
}

function memberBook(m: GroupMember): string {
  if (typeof m === 'string') return groupsStore.findQuoteByBookmarkId(m)?.book ?? ''
  return m.book || ''
}

function memberPreview(m: GroupMember): string {
  if (typeof m === 'string') return groupsStore.findQuoteByBookmarkId(m)?.text ?? ''
  return m.text
}
</script>

<style scoped>
.overlay-enter-active,
.overlay-leave-active { transition: opacity 0.2s ease; }
.overlay-enter-from,
.overlay-leave-to { opacity: 0; }

.sheet-enter-active,
.sheet-leave-active { transition: transform 0.25s ease; }
.sheet-enter-from,
.sheet-leave-to { transform: translateY(100%); }
</style>
