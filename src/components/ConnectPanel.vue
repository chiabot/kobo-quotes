<template>
  <div class="px-4 pt-6">
    <div class="bg-white rounded-2xl border border-stone-200 p-5">

      <label class="block text-xs text-stone-400 uppercase tracking-widest mb-3">
        Connect to Kobo
      </label>

      <!-- IP input row -->
      <div class="flex gap-2">
        <div class="relative flex-1 min-w-0">
          <input
            v-model="ipPrefix"
            type="text"
            inputmode="numeric"
            autocomplete="off"
            autocorrect="off"
            placeholder="10.0.0"
            class="w-full bg-stone-50 border border-stone-200 rounded-xl text-[16px] px-3 py-3 pr-24 outline-none focus:border-stone-400 font-mono"
            @keydown.enter="handleConnect"
          />
          <span
            v-if="!ipPrefix.includes(':')"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-stone-300 text-[15px] font-mono pointer-events-none whitespace-nowrap"
          >
            .166:8080
          </span>
        </div>
        <button
          class="shrink-0 bg-stone-900 text-stone-50 rounded-xl text-[15px] font-medium px-4 py-3 active:opacity-80"
          :disabled="store.isLoading"
          @click="handleConnect"
        >
          Connect
        </button>
      </div>

      <!-- Scan button -->
      <button
        class="mt-2 w-full bg-stone-100 text-stone-600 border border-stone-200 rounded-xl text-[14px] py-3 active:opacity-80"
        :disabled="store.isLoading"
        @click="store.scan()"
      >
        {{ store.isLoading ? 'Scanning…' : 'Auto-scan for Kobo' }}
      </button>

      <!-- Error -->
      <p v-if="store.connError" class="mt-3 text-[13px] text-red-500 leading-relaxed">
        {{ store.connError }}
      </p>

      <!-- Hint -->
      <p v-else class="mt-3 text-[13px] text-stone-400 leading-relaxed">
        Enter the first part of your Kobo's IP, or tap scan.<br>
        <button class="text-green-700 underline" @click="loadDemo">Load demo data →</button>
      </p>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useQuotesStore } from '@/stores/quotes'

const store = useQuotesStore()

const ipPrefix = ref('')

onMounted(() => {
  const saved = store.savedIp
  if (saved) {
    ipPrefix.value = saved.replace(store.IP_SUFFIX, '').replace(/:\d+$/, '').split('.').slice(0, 3).join('.')
  }
})

function handleConnect() {
  store.connect(ipPrefix.value)
}

const DEMO = [
  { bookmark_id: '1', text: "I must not fear. Fear is the mind-killer.", book: "Dune", author: "Frank Herbert", date: "2024-10-12", color: 0, book_progress: 12, image_url: '', tags: ['philo'] },
  { bookmark_id: '2', text: "The mystery of life isn't a problem to solve, but a reality to experience.", book: "Dune", author: "Frank Herbert", date: "2024-10-14", color: 2, book_progress: 34, image_url: '' },
  { bookmark_id: '3', text: "You have power over your mind, not outside events.", book: "Meditations", author: "Marcus Aurelius", date: "2024-11-03", color: 1, book_progress: 8, image_url: '' },
  { bookmark_id: '4', text: "The impediment to action advances action.", book: "Meditations", author: "Marcus Aurelius", date: "2024-11-05", color: 0, book_progress: 45, image_url: '' },
  { bookmark_id: '5', text: "Waste no more time arguing about what a good man should be. Be one.", book: "Meditations", author: "Marcus Aurelius", date: "2024-11-07", color: 3, book_progress: 71, image_url: '' },
  { bookmark_id: '6', text: "Nothing in life is as important as you think it is, while you are thinking about it.", book: "Thinking, Fast and Slow", author: "Daniel Kahneman", date: "2024-09-20", color: 3, book_progress: 55, image_url: '' },
  { bookmark_id: '7', text: "Reading is faster than listening. Doing is faster than watching.", book: "Naval Ravikant", author: "Eric Jorgenson", date: "2024-08-15", color: 1, book_progress: 29, image_url: '' },
  { bookmark_id: '8', text: "We have a medical book published in 1822 passed down to Michael from his great-grandfather, a country doctor from the Ozark Mountains. A long section deals with yellow fever—in the 1800s no one knew what caused it or how it spread.", book: "Test", author: "Author Name", date: "2024-08-15", color: 2, book_progress: 29, image_url: '' },
  { bookmark_id: '9', text: "The history of dieting begins in 1825, when the Frenchman Jean-Anthelme Brillat-Savarin published an essay entitled “Preventative or Curative Treatment of Obesity” in his gastronomic classic The Physiology of Taste", book: "Test", author: "Author Name", date: "2024-08-15", color: 2, book_progress: 29, image_url: '' },
]

function loadDemo() {
  // @ts-ignore
  store.ingest(DEMO, false)
}
</script>
