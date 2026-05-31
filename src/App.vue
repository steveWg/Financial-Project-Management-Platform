<script setup>
import { onMounted } from 'vue'
import { useProjectStore } from './store/projectStore'

const store = useProjectStore()

onMounted(() => {
  store.loadRemoteState()
})
</script>

<template>
  <router-view />
</template>
