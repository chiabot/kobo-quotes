<template>
  <div class="mx-5 mb-3">
    <button
      v-if="masterOf"
      class="w-full text-left bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-[13px] text-stone-600 active:bg-stone-100"
      @click="masterOf && emit('navigate', masterOf)"
    >🔗 Part of another group — view master</button>

    <template v-else>
      <div v-if="members.length" class="flex flex-col gap-1.5 mb-2">
        <template v-for="(m, idx) in members" :key="idx">
          <div
            v-if="typeof m !== 'string' || resolveMember(m)"
            class="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-2"
          >
            <div
              class="flex-1 min-w-0"
              :class="typeof m === 'string' ? 'cursor-pointer' : ''"
              @click="typeof m === 'string' && emit('navigate', m)"
            >
              <span class="block text-[10px] text-stone-400 uppercase tracking-wider mb-0.5 truncate">{{ memberBook(m) }}</span>
              <span class="block text-[13px] text-stone-600 truncate">{{ memberPreview(m) }}</span>
            </div>
            <button class="text-stone-400 text-base px-1 shrink-0" @click="groupsStore.removeMemberAt(quote.bookmarkId, idx)">×</button>
          </div>
        </template>
      </div>

      <button
        class="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-[13px] text-stone-600 active:bg-stone-100"
        @click="emit('open-picker')"
      >{{ members.length ? '+ Add another' : '🔗 Group with other quotes' }}</button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGroupsStore, type GroupMember } from '@/stores/groups'
import type { Quote } from '@/stores/quotes'

const props = defineProps<{ quote: Quote }>()
const emit = defineEmits<{
  navigate: [bookmarkId: string]
  'open-picker': []
}>()

const groupsStore = useGroupsStore()

const masterOf = computed(() => groupsStore.findMasterFor(props.quote.bookmarkId))
const members = computed(() => groupsStore.getGroupMembers(props.quote.bookmarkId))

function resolveMember(m: GroupMember): Quote | undefined {
  return typeof m === 'string' ? groupsStore.findQuoteByBookmarkId(m) : undefined
}

function memberBook(m: GroupMember): string {
  const mq = resolveMember(m)
  if (mq) return mq.book
  return typeof m === 'string' ? '' : m.book || ''
}

function memberPreview(m: GroupMember): string {
  const mq = resolveMember(m)
  const text = mq ? mq.text : (typeof m === 'string' ? '' : m.text)
  return text.length > 90 ? text.slice(0, 90) + '…' : text
}
</script>
