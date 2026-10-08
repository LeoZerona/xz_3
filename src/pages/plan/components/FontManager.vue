<script setup lang="ts">
import { storeToRefs } from 'pinia'
import FontCover from '../../../components/FontCover.vue'
import { useFontStore } from '../../../stores/fonts'

const emit = defineEmits<{
  (event: 'browse'): void
}>()

const fontStore = useFontStore()
const { addedFonts, currentFontId } = storeToRefs(fontStore)
</script>

<template>
  <section class="font-manager" aria-label="已添加字体">
    <div class="managed-font-list">
      <div
        v-for="font in addedFonts"
        :key="font.id"
        class="font-card"
        :class="{ 'is-current': font.id === currentFontId }"
        role="button"
        tabindex="0"
        :aria-label="`选择${font.name}`"
        @click="fontStore.selectFont(font.id)"
        @keydown.enter="fontStore.selectFont(font.id)"
        @keydown.space.prevent="fontStore.selectFont(font.id)"
      >
        <FontCover :font="font" size="large" />
        <div class="font-card-body">
          <div class="font-card-head">
            <span class="font-card-title">{{ font.name }}</span>
            <span v-if="font.id === currentFontId" class="current-label">当前在学</span>
            <div
              v-else
              class="delete-button"
              role="button"
              tabindex="0"
              :aria-label="`删除${font.name}`"
              @click.stop="fontStore.removeFont(font.id)"
              @keydown.enter.stop="fontStore.removeFont(font.id)"
              @keydown.space.stop.prevent="fontStore.removeFont(font.id)"
            >删除</div>
          </div>
          <span class="font-card-description">{{ font.description }}</span>
          <span class="font-card-meta">每日 {{ font.dailyCount }} 个，剩余 {{ font.remainingDays }} 天</span>
          <div class="font-progress" aria-hidden="true"><div class="font-progress-value" :style="{ width: `${font.progress}%` }" /></div>
          <div class="font-card-foot">
            <span><span class="progress-dot">•</span> 已学 {{ font.learned }}</span>
            <span>{{ font.total }}字</span>
          </div>
        </div>
      </div>
    </div>

    <div class="add-font-footer">
      <div
        class="add-font-button"
        role="button"
        tabindex="0"
        aria-label="添加字体"
        @click="emit('browse')"
        @keydown.enter="emit('browse')"
        @keydown.space.prevent="emit('browse')"
      >
        <span aria-hidden="true">＋</span>
        <span>添加字体</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.font-manager { height: calc(100vh - 58px - var(--app-top-safe-area)); height: calc(100dvh - 58px - var(--app-top-safe-area)); overflow: hidden; background: var(--color-surface-muted); }
.managed-font-list { height: 100%; padding: 16px 12px calc(92px + env(safe-area-inset-bottom)); overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
.font-card { min-height: 142px; padding: 16px; display: flex; gap: 14px; border: 1px solid transparent; border-radius: 8px; background: var(--color-surface); box-shadow: 0 3px 12px var(--color-shadow); cursor: pointer; }
.font-card + .font-card { margin-top: 12px; }
.font-card.is-current { border-color: var(--color-border); }
.font-card-body { min-width: 0; flex: 1; padding-top: 1px; }
.font-card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.font-card-title { overflow: hidden; font-size: 14px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.current-label { flex: none; color: var(--color-primary); font-size: 10px; }
.delete-button { flex: none; padding: 4px 0 4px 10px; color: var(--color-text-muted); font-size: 10px; line-height: 1; }
.font-card-description { display: -webkit-box; margin-top: 5px; overflow: hidden; color: var(--color-text-secondary); font-size: 9px; line-height: 1.4; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.font-card-meta { display: block; margin-top: 5px; color: var(--color-text-secondary); font-size: 9px; }
.font-progress { height: 4px; margin-top: 9px; overflow: hidden; border-radius: 4px; background: var(--color-border); }
.font-progress-value { height: 100%; border-radius: inherit; background: var(--color-progress); }
.font-card-foot { margin-top: 5px; display: flex; align-items: center; justify-content: space-between; color: var(--color-text-muted); font-size: 8px; }
.progress-dot { color: var(--color-progress); font-size: 15px; line-height: 0; }
.add-font-footer { position: fixed; z-index: 3; right: 0; bottom: 0; left: 0; padding: 10px 18px calc(10px + env(safe-area-inset-bottom)); background: var(--color-surface); box-shadow: 0 -5px 18px var(--color-shadow); }
.add-font-button { width: min(calc(100% - 36px), 524px); height: 52px; margin: 0 auto; display: flex; align-items: center; justify-content: center; gap: 5px; overflow: hidden; border: 1px solid var(--color-primary); border-radius: 8px; border-bottom-right-radius: 8px; border-bottom-left-radius: 8px; background: var(--color-primary); background-clip: border-box; color: var(--color-on-primary); font-size: 13px; font-weight: 600; cursor: pointer; }
@media (max-width: 370px) { .font-card { padding: 14px; gap: 12px; } }
</style>
