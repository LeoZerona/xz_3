<template>
  <div class="theme-page">
    <div class="theme-nav">
      <div class="back-button" role="button" tabindex="0" aria-label="返回" @click="goBack" @keydown.enter="goBack" @keydown.space.prevent="goBack">‹</div>
      <span class="nav-title">主题设置</span>
      <div class="nav-space"></div>
    </div>

    <div class="theme-content">
      <div class="theme-heading">
        <span class="theme-title">选择你喜欢的配色</span>
        <span class="theme-description">切换后立即生效，并会保留到下次打开。</span>
      </div>

      <div class="theme-list" role="radiogroup" aria-label="主题列表">
        <div
          v-for="item in themes"
          :key="item.id"
          class="theme-card"
          :class="{ 'is-active': item.id === selectedThemeId }"
          :aria-checked="item.id === selectedThemeId"
          role="radio"
          tabindex="0"
          @click="chooseTheme(item.id)"
          @keydown.enter="chooseTheme(item.id)"
          @keydown.space.prevent="chooseTheme(item.id)"
        >
          <div class="theme-preview" :style="previewStyle(item)" aria-hidden="true">
            <div class="preview-topbar"></div>
            <div class="preview-body">
              <div class="preview-line preview-line-long"></div>
              <div class="preview-line"></div>
              <div class="preview-actions"><div></div><div></div></div>
            </div>
          </div>
          <div class="theme-copy">
            <div class="theme-name-row">
              <span class="theme-name">{{ item.name }}</span>
              <span v-if="item.seasonal" class="seasonal-label">节日</span>
            </div>
            <span class="theme-card-description">{{ item.description }}</span>
          </div>
          <div class="choice-dot" aria-hidden="true"><div class="choice-dot-fill"></div></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useThemeStore } from '../../stores/theme'
import { themes } from '../../theme/themes'
import type { ThemeDefinition } from '../../theme/types'

const themeStore = useThemeStore()
const { currentThemeId: selectedThemeId } = storeToRefs(themeStore)

function chooseTheme(themeId: string) {
  themeStore.selectTheme(themeId)
}

function previewStyle(theme: ThemeDefinition) {
  return {
    '--preview-primary': theme.tokens.primary,
    '--preview-soft': theme.tokens.primarySoft,
    '--preview-page': theme.tokens.page,
    '--preview-surface': theme.tokens.surface,
    '--preview-text': theme.tokens.text,
    '--preview-muted': theme.tokens.textMuted,
  }
}

function goBack() {
  if (getCurrentPages().length > 1) {
    uni.navigateBack({ delta: 1, fail: () => uni.reLaunch({ url: '/pages/index/index' }) })
    return
  }
  uni.reLaunch({ url: '/pages/index/index' })
}
</script>

<style scoped>
.theme-page { width: min(100%, 560px); min-height: 100vh; min-height: 100dvh; margin: 0 auto; background: var(--color-page); color: var(--color-text); }
.theme-nav { height: calc(64px + env(safe-area-inset-top)); padding: env(safe-area-inset-top) 12px 0; display: grid; grid-template-columns: 46px 1fr 46px; align-items: center; border-bottom: 1px solid var(--color-border); background: var(--color-surface); }
.back-button { width: 44px; height: 44px; margin: 0; padding: 0; color: var(--color-text); background: transparent; font-size: 42px; font-weight: 300; line-height: 38px; cursor: pointer; }
.nav-title { font-size: 18px; font-weight: 700; text-align: center; }
.theme-content { padding: 28px 16px calc(32px + env(safe-area-inset-bottom)); }
.theme-heading { margin-bottom: 24px; }
.theme-title { display: block; font-size: 22px; font-weight: 700; }
.theme-description { display: block; margin-top: 8px; color: var(--color-text-secondary); font-size: 14px; }
.theme-list { display: flex; flex-direction: column; gap: 14px; }
.theme-card { width: 100%; min-height: 118px; margin: 0; padding: 14px; display: flex; align-items: center; gap: 15px; border: 1.5px solid var(--color-border); border-radius: 12px; background: var(--color-surface); color: var(--color-text); text-align: left; box-shadow: 0 4px 16px var(--color-shadow); cursor: pointer; }
.theme-card.is-active { border-color: var(--color-primary); box-shadow: 0 0 0 2px var(--color-primary-soft); }
.theme-card:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.theme-preview { flex: none; width: 82px; height: 88px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--preview-text) 12%, transparent); border-radius: 8px; background: var(--preview-page); }
.preview-topbar { height: 20px; background: var(--preview-soft); }
.preview-body { padding: 11px 9px; }
.preview-line { width: 38px; height: 5px; margin-top: 6px; border-radius: 4px; background: var(--preview-muted); opacity: .65; }
.preview-line-long { width: 55px; margin-top: 0; background: var(--preview-text); opacity: .82; }
.preview-actions { margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
.preview-actions div { height: 17px; border-radius: 4px; background: var(--preview-primary); }
.preview-actions div + div { background: var(--preview-soft); }
.theme-copy { min-width: 0; flex: 1; }
.theme-name-row { display: flex; align-items: center; gap: 7px; }
.theme-name { font-size: 17px; font-weight: 700; }
.seasonal-label { padding: 2px 6px; border-radius: 10px; background: var(--color-primary-soft); color: var(--color-primary); font-size: 10px; }
.theme-card-description { display: block; margin-top: 7px; color: var(--color-text-secondary); font-size: 13px; line-height: 1.45; }
.choice-dot { flex: none; width: 20px; height: 20px; padding: 4px; border: 1.5px solid var(--color-text-muted); border-radius: 50%; }
.choice-dot-fill { width: 100%; height: 100%; border-radius: 50%; background: var(--color-primary); opacity: 0; transform: scale(.35); transition: opacity .15s ease, transform .15s ease; }
.theme-card.is-active .choice-dot { border-color: var(--color-primary); }
.theme-card.is-active .choice-dot-fill { opacity: 1; transform: scale(1); }
@supports not (color: color-mix(in srgb, black, white)) { .theme-preview { border-color: var(--color-border); } }
</style>
