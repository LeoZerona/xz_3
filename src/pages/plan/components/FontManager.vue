<script setup lang="ts">
import { storeToRefs } from 'pinia'
import FontCover from '../../../components/FontCover.vue'
import { useFontStore } from '../../../stores/fonts'

const emit = defineEmits<{
  (event: 'browse'): void
}>()

const fontStore = useFontStore()
const {
  addedFonts,
  currentFont,
  currentFontId,
  referenceFont,
  referenceFontId,
} = storeToRefs(fontStore)

function isFontInUse(fontId: string): boolean {
  return fontId === currentFontId.value || fontId === referenceFontId.value
}
</script>

<template>
  <section class="font-manager" aria-label="字体设置">
    <div class="manager-scroll">
      <section class="pairing-section" aria-labelledby="pairing-title">
        <div class="section-heading">
          <div>
            <h2 id="pairing-title" class="section-title">当前字体搭配</h2>
            <p class="section-description">学习时会同时展示两种字形，便于观察笔画和结构差异。</p>
          </div>
          <button class="swap-button" type="button" role="button" aria-label="交换学习字体和对照字体" @click="fontStore.swapFonts">
            <van-icon name="exchange" size="15" aria-hidden="true" />
            <span>交换</span>
          </button>
        </div>

        <div class="pairing-grid" role="group" aria-label="当前学习字体和对照字体">
          <article class="role-card is-learning">
            <div class="role-card-head">
              <span class="role-label">学习字体</span>
              <span class="selected-mark" aria-hidden="true">主</span>
            </div>
            <span class="role-sample" :style="{ fontFamily: currentFont.fontFamily }">{{ currentFont.sample }}</span>
            <strong class="role-font-name">{{ currentFont.name }}</strong>
            <span class="role-hint">用于记忆与临摹</span>
          </article>

          <article class="role-card is-reference">
            <div class="role-card-head">
              <span class="role-label">对照字体</span>
              <span class="selected-mark" aria-hidden="true">辅</span>
            </div>
            <span class="role-sample" :style="{ fontFamily: referenceFont.fontFamily }">{{ referenceFont.sample }}</span>
            <strong class="role-font-name">{{ referenceFont.name }}</strong>
            <span class="role-hint">用于辨认与比较</span>
          </article>
        </div>
      </section>

      <section class="library-section" aria-labelledby="library-title">
        <div class="library-heading">
          <div>
            <h2 id="library-title" class="section-title">选择字体</h2>
            <p class="section-description">为每种字体指定用途；选择已占用的字体时会自动交换。</p>
          </div>
          <span class="font-count">{{ addedFonts.length }} 款</span>
        </div>

        <div class="managed-font-list">
          <article v-for="font in addedFonts" :key="font.id" class="font-card">
            <FontCover :font="font" />
            <div class="font-card-body">
              <div class="font-card-head">
                <div class="font-title-wrap">
                  <h3 class="font-card-title">{{ font.name }}</h3>
                  <span v-if="font.id === currentFontId" class="usage-tag is-learning">学习</span>
                  <span v-if="font.id === referenceFontId" class="usage-tag is-reference">对照</span>
                </div>
                <button
                  v-if="!isFontInUse(font.id)"
                  class="delete-button"
                  type="button"
                  role="button"
                  :aria-label="`删除${font.name}`"
                  @click="fontStore.removeFont(font.id)"
                >删除</button>
              </div>
              <p class="font-card-description">{{ font.description }}</p>
              <div class="role-actions" role="group" :aria-label="`设置${font.name}的用途`">
                <button
                  class="role-action"
                  :class="{ 'is-selected is-learning': font.id === currentFontId }"
                  type="button"
                  role="button"
                  :aria-pressed="font.id === currentFontId"
                  :aria-label="`将${font.name}设为学习字体`"
                  @click="fontStore.selectLearningFont(font.id)"
                >
                  <span v-if="font.id === currentFontId" aria-hidden="true">✓</span>
                  <span>{{ font.id === currentFontId ? '学习字体' : '设为学习' }}</span>
                </button>
                <button
                  class="role-action"
                  :class="{ 'is-selected is-reference': font.id === referenceFontId }"
                  type="button"
                  role="button"
                  :aria-pressed="font.id === referenceFontId"
                  :aria-label="`将${font.name}设为对照字体`"
                  @click="fontStore.selectReferenceFont(font.id)"
                >
                  <span v-if="font.id === referenceFontId" aria-hidden="true">✓</span>
                  <span>{{ font.id === referenceFontId ? '对照字体' : '设为对照' }}</span>
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>

    <div class="add-font-footer">
      <button class="add-font-button" type="button" role="button" aria-label="添加字体" @click="emit('browse')">
        <span aria-hidden="true">＋</span>
        <span>添加字体</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.font-manager { height: calc(100vh - 58px - var(--app-top-safe-area)); height: calc(100dvh - 58px - var(--app-top-safe-area)); overflow: hidden; background: var(--color-surface-muted); }
.manager-scroll { height: 100%; padding-bottom: calc(92px + env(safe-area-inset-bottom)); overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
.pairing-section { padding: 20px 16px 18px; border-bottom: 1px solid var(--color-border); background: var(--color-surface); }
.section-heading, .library-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.section-title { margin: 0; color: var(--color-text); font-size: 16px; font-weight: 700; line-height: 1.3; }
.section-description { max-width: 350px; margin: 5px 0 0; color: var(--color-text-secondary); font-size: 10px; line-height: 1.5; }
.swap-button { min-width: 60px; height: 32px; margin: 0; padding: 0 10px; flex: none; display: flex; align-items: center; justify-content: center; gap: 4px; border: 1px solid var(--color-border); border-radius: 16px; background: var(--color-surface-muted); color: var(--color-text-secondary); font-size: 10px; line-height: 1; }
.swap-button::after, .delete-button::after, .role-action::after, .add-font-button::after { border: 0; }
.pairing-grid { margin-top: 16px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.role-card { min-width: 0; min-height: 164px; padding: 12px; display: flex; flex-direction: column; align-items: center; border: 1px solid var(--color-border); border-radius: 14px; background: var(--color-surface-muted); }
.role-card.is-learning { border-color: color-mix(in srgb, var(--color-primary) 30%, var(--color-border)); background: linear-gradient(180deg, var(--color-primary-soft), var(--color-surface) 82%); }
.role-card-head { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.role-label { color: var(--color-text-secondary); font-size: 10px; font-weight: 600; }
.is-learning .role-label { color: var(--color-primary); }
.selected-mark { width: 20px; height: 20px; display: grid; place-items: center; border-radius: 50%; background: var(--color-surface); color: var(--color-text-muted); font-size: 8px; font-weight: 700; }
.is-learning .selected-mark { background: var(--color-primary); color: var(--color-on-primary); }
.role-sample { margin: 12px 0 7px; color: var(--color-text); font-size: 52px; font-weight: 500; line-height: 1; }
.role-font-name { max-width: 100%; overflow: hidden; color: var(--color-text); font-size: 13px; line-height: 1.4; text-overflow: ellipsis; white-space: nowrap; }
.role-hint { margin-top: 3px; color: var(--color-text-muted); font-size: 8px; }
.library-section { padding: 18px 12px 8px; }
.library-heading { padding: 0 4px 12px; }
.font-count { flex: none; padding: 4px 8px; border-radius: 12px; background: var(--color-surface); color: var(--color-text-muted); font-size: 9px; }
.managed-font-list { display: flex; flex-direction: column; gap: 10px; }
.font-card { min-height: 132px; padding: 14px; display: flex; align-items: flex-start; gap: 13px; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-surface); box-shadow: 0 4px 16px var(--color-shadow); }
.font-card-body { min-width: 0; flex: 1; }
.font-card-head { min-width: 0; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.font-title-wrap { min-width: 0; display: flex; align-items: center; gap: 5px; }
.font-card-title { min-width: 0; margin: 0; overflow: hidden; color: var(--color-text); font-size: 13px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.usage-tag { flex: none; padding: 3px 5px; border-radius: 8px; font-size: 8px; line-height: 1; }
.usage-tag.is-learning { background: var(--color-primary-soft); color: var(--color-primary); }
.usage-tag.is-reference { background: var(--color-surface-muted); color: var(--color-text-secondary); }
.delete-button { min-width: 36px; height: 28px; margin: -4px -6px -4px 0; padding: 0 6px; border: 0; background: transparent; color: var(--color-text-muted); font-size: 9px; }
.font-card-description { display: -webkit-box; margin: 5px 0 0; overflow: hidden; color: var(--color-text-secondary); font-size: 9px; line-height: 1.4; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.role-actions { margin-top: 10px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
.role-action { min-width: 0; height: 32px; margin: 0; padding: 0 6px; display: flex; align-items: center; justify-content: center; gap: 4px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-surface); color: var(--color-text-secondary); font-size: 9px; line-height: 1; white-space: nowrap; }
.role-action.is-selected.is-learning { border-color: var(--color-primary); background: var(--color-primary); color: var(--color-on-primary); }
.role-action.is-selected.is-reference { border-color: color-mix(in srgb, var(--color-text-secondary) 36%, var(--color-border)); background: var(--color-surface-muted); color: var(--color-text); }
.add-font-footer { position: fixed; z-index: 3; right: 0; bottom: 0; left: 0; padding: 10px 18px calc(10px + env(safe-area-inset-bottom)); background: var(--color-surface); box-shadow: 0 -5px 18px var(--color-shadow); }
.add-font-button { width: min(calc(100% - 36px), 524px); height: 52px; margin: 0 auto; padding: 0; display: flex; align-items: center; justify-content: center; gap: 5px; border: 1px solid var(--color-primary); border-radius: 8px; background: var(--color-primary); color: var(--color-on-primary); font-size: 13px; font-weight: 600; line-height: 1; }
button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
@media (max-width: 370px) { .pairing-section { padding-right: 12px; padding-left: 12px; } .role-card { padding: 10px; } .font-card { padding: 12px; gap: 10px; } .role-action { padding: 0 4px; font-size: 8px; } }
</style>
