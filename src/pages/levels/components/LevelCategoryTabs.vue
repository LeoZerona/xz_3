<script setup lang="ts">
import { nextTick } from 'vue'
import { LEVEL_CATEGORIES } from '../../../study/levelData'
import type { LevelCategory } from '../../../study/levelData'

const props = defineProps<{ modelValue: LevelCategory }>()
const emit = defineEmits<{
  (event: 'update:modelValue', value: LevelCategory): void
}>()

async function handleKeydown(event: KeyboardEvent) {
  const index = LEVEL_CATEGORIES.findIndex((category) => category.key === props.modelValue)
  let nextIndex: number
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % LEVEL_CATEGORIES.length
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + LEVEL_CATEGORIES.length) % LEVEL_CATEGORIES.length
  else if (event.key === 'Home') nextIndex = 0
  else if (event.key === 'End') nextIndex = LEVEL_CATEGORIES.length - 1
  else return
  event.preventDefault()
  const category = LEVEL_CATEGORIES[nextIndex]
  if (!category) return
  emit('update:modelValue', category.key)
  // uni-view 的事件 target 不保证是 DOM；仅在 H5 更新页签后移动键盘焦点。
  // #ifdef H5
  await nextTick()
  document.getElementById(`category-${category.key}`)?.focus()
  // #endif
}
</script>

<template>
  <view class="category-tabs" role="tablist" aria-label="关卡分类">
    <view
      v-for="tab in LEVEL_CATEGORIES"
      :id="`category-${tab.key}`"
      :key="tab.key"
      class="category-tab"
      :class="{ 'is-active': modelValue === tab.key }"
      :data-category="tab.key"
      role="tab"
      :aria-label="tab.label"
      :aria-selected="modelValue === tab.key"
      aria-controls="level-stage-panel"
      :tabindex="modelValue === tab.key ? 0 : -1"
      @click="emit('update:modelValue', tab.key)"
      @keydown.enter="emit('update:modelValue', tab.key)"
      @keydown.space.prevent="emit('update:modelValue', tab.key)"
      @keydown="handleKeydown"
    >
      <text class="category-label">{{ tab.label }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.category-tabs {
  display: flex;
  width: fit-content;
  gap: 8px;
}
.category-tab {
  min-width: 104px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  border-radius: 14px;
  color: var(--color-text-secondary);
  font-size: 14px;
  white-space: nowrap;
  cursor: pointer;
}
.category-tab.is-active {
  background: var(--color-primary-soft);
  color: var(--color-text);
  font-weight: 650;
}
.category-tab:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
@media (max-width: 600px) {
  .category-tabs {
    width: 100%;
    gap: 4px;
  }
  .category-tab {
    flex: 1;
    min-width: 0;
    padding: 0 8px;
    font-size: 13px;
  }
}
</style>
