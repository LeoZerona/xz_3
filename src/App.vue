<template>
  <view class="app-shell" :data-theme="currentThemeId"><slot /></view>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useThemeStore } from './stores/theme'

const themeStore = useThemeStore()
const { currentThemeId } = storeToRefs(themeStore)

onMounted(themeStore.initialize)
</script>

<style>
page { background: var(--color-page); }
</style>
