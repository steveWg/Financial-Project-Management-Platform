<script setup>
defineProps({
  label: String,
  value: [String, Number],
  tone: { type: String, default: 'blue' },
  caption: String
})
</script>

<template>
  <section class="metric-card" :class="`tone-${tone}`">
    <span>{{ label }}</span>
    <strong>{{ value }}</strong>
    <small>{{ caption }}</small>
  </section>
</template>
