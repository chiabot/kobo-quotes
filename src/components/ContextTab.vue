<template>
  <div class="px-5 mb-3.5 min-h-[80px]">
    <div v-if="loading" class="text-[13px] text-stone-400 py-5 text-center">Loading context…</div>
    <div v-else-if="ctx?.error" class="text-[13px] text-stone-400 py-4 text-center">{{ ctx.error }}</div>
    <template v-else-if="ctx?.data">
      <p v-for="(p, i) in ctx.data.before" :key="'b' + i" class="relative pr-7 text-[14px] leading-[1.7] text-stone-600 mb-2.5">
        {{ p }}
        <button
          v-if="canGroup"
          class="absolute right-0 top-0 w-[22px] h-[22px] rounded-full border text-[12px] flex items-center justify-center leading-none"
          :class="iconClass(p)"
          @click="link('before', i)"
        >{{ icon(p) }}</button>
      </p>

      <p class="font-serif text-[15px] leading-[1.75] text-stone-900 border-l-[3px] border-amber-300 pl-3 mb-2.5">{{ ctx.data.quote }}</p>

      <p v-for="(p, i) in ctx.data.after" :key="'a' + i" class="relative pr-7 text-[14px] leading-[1.7] text-stone-600 mb-2.5">
        {{ p }}
        <button
          v-if="canGroup"
          class="absolute right-0 top-0 w-[22px] h-[22px] rounded-full border text-[12px] flex items-center justify-center leading-none"
          :class="iconClass(p)"
          @click="link('after', i)"
        >{{ icon(p) }}</button>
      </p>

      <button
        v-if="canExpand"
        class="w-full bg-stone-50 border border-stone-200 rounded-[10px] py-2.5 text-[13px] text-stone-600 active:bg-stone-100 mt-1"
        @click="expand"
      >Show more context</button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useQuoteContext } from '@/composables/UseQuoteContext'
import { useGroupsStore } from '@/stores/groups'
import type { Quote } from '@/stores/quotes'

const props = defineProps<{ quote: Quote }>()

const { ensureContext, expandContext, getContextCache, canExpandContext } = useQuoteContext()
const groupsStore = useGroupsStore()

const loading = ref(false)

const ctx = computed(() => getContextCache(props.quote.bookmarkId))
const canExpand = computed(() => canExpandContext(props.quote.bookmarkId))

// A master-with-members can't itself be linked into another group, so its
// context paragraphs aren't shown as linkable.
const canGroup = computed(() => !groupsStore.findMasterFor(props.quote.bookmarkId))

async function load() {
  if (!getContextCache(props.quote.bookmarkId)) {
    loading.value = true
    await ensureContext(props.quote)
    loading.value = false
  }
}

onMounted(load)
watch(() => props.quote.bookmarkId, load)

async function expand() {
  loading.value = true
  await expandContext(props.quote)
  loading.value = false
}

function icon(text: string): string {
  const st = groupsStore.getCtxIconState(text, props.quote)
  return st.state === 'linked' ? '−' : st.state === 'match' ? '🔗' : '+'
}

function iconClass(text: string): string {
  const st = groupsStore.getCtxIconState(text, props.quote)
  return st.state === 'linked'
    ? 'bg-green-400 border-green-400 text-white'
    : 'bg-stone-50 border-stone-200 text-stone-400'
}

function link(section: 'before' | 'after', i: number) {
  const text = ctx.value?.data?.[section]?.[i]
  if (text === undefined) return
  const st = groupsStore.getCtxIconState(text, props.quote)

  if (st.state === 'linked') {
    if (st.kind === 'quote' && st.memberId) {
      groupsStore.removeFromGroup(props.quote.bookmarkId, st.memberId)
    } else if (st.index !== undefined) {
      groupsStore.removeMemberAt(props.quote.bookmarkId, st.index)
    }
  } else if (st.state === 'match' && st.memberId) {
    groupsStore.addToGroup(props.quote.bookmarkId, st.memberId)
  } else {
    groupsStore.addTextMember(props.quote.bookmarkId, text, props.quote.book)
  }
}
</script>
