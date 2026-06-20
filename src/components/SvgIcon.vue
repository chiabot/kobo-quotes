<template>
  <span v-html="svgContent" />
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, required: true }
})

const svgs = import.meta.glob('../assets/*.svg', { eager: true, query: '?raw', import: 'default' })

const svgContent = computed(() => svgs[`../assets/${props.name}.svg`] ?? '')
</script>
