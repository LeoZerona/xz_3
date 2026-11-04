<script setup lang="ts">
import { openCharacterSearch } from '../search/navigation'
interface Props {
  iconSize?: number
}

withDefaults(defineProps<Props>(), {
  iconSize: 23,
})

function handleOpenSearch(): void {
  openCharacterSearch()
}
</script>

<template>
  <button class="character-search-button" role="button" tabindex="0" aria-label="搜索" title="搜索文字" @click.stop="handleOpenSearch" @keydown.enter.stop.prevent="handleOpenSearch" @keydown.space.stop.prevent="handleOpenSearch" @keyup.space.stop.prevent>
    <van-icon name="search" :size="iconSize" aria-hidden="true" />
  </button>
</template>

<style scoped lang="scss">
.character-search-button { display: grid; place-items: center; flex: none; width: 44px; min-width: 44px; height: 44px; min-height: 44px; margin: 0; padding: 0; border: 0; border-radius: var(--control-radius); background: transparent; color: var(--color-text); line-height: 1; }
.character-search-button::after { border: 0; }
.character-search-button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: -2px; }
.character-search-button:active { background: var(--color-primary-soft); }
</style>
