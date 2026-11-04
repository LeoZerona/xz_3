<script setup lang="ts">
defineProps<{ isFavorite: boolean }>()
const emit = defineEmits<{ (event: 'toggle-favorite'): void }>()
</script>

<template>
  <button class="character-favorite-button" :class="{ 'is-active': isFavorite }" role="button" tabindex="0"
    hover-class="none" :aria-label="isFavorite ? '取消收藏当前文字' : '收藏当前文字'"
    :aria-pressed="isFavorite" @click.stop="emit('toggle-favorite')"
    @keydown.enter.stop.prevent="emit('toggle-favorite')"
    @keydown.space.stop.prevent="emit('toggle-favorite')" @keyup.space.stop.prevent>
    <van-icon :name="isFavorite ? 'star' : 'star-o'" size="25" aria-hidden="true" />
  </button>
</template>

<style scoped>
.character-favorite-button { width: 44px; height: 44px; flex: none; margin: 0; padding: 0; display: grid; place-items: center; border: 0; border-radius: var(--control-radius); background: transparent; color: var(--color-text-secondary); line-height: 1; }
.character-favorite-button::after { border: 0; }
.character-favorite-button.is-active { color: var(--color-primary); }
.character-favorite-button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: -2px; }
</style>
