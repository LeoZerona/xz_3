<script setup lang="ts">
import { computed, ref } from 'vue'
import type { LearningFont } from '../fonts/types'
import type { StudyCharacterEntry } from '../study/types'

interface Props {
  characters: StudyCharacterEntry[]
  learningFont: LearningFont
  referenceFont: LearningFont
  title: string
  description: string
  canSlash?: boolean
}

const props = withDefaults(defineProps<Props>(), { canSlash: false })
const emit = defineEmits<{
  (event: 'open-detail', characterId: string): void
  (event: 'slash-character', characterId: string): void
}>()

const coveredFont = ref<'learning' | 'reference'>('reference')
const revealedCharacterIds = ref<string[]>([])
const areAllCharactersRevealed = computed(() => props.characters.length > 0
  && props.characters.every((entry) => isRevealed(entry.id)))
const coverToggleLabel = computed(() => areAllCharactersRevealed.value ? '全部遮盖' : '取消全部遮盖')

function swapCoveredFont() {
  coveredFont.value = coveredFont.value === 'learning' ? 'reference' : 'learning'
  revealedCharacterIds.value = []
}

function isRevealed(characterId: string): boolean {
  return revealedCharacterIds.value.includes(characterId)
}

function toggleCharacterCover(characterId: string) {
  revealedCharacterIds.value = isRevealed(characterId)
    ? revealedCharacterIds.value.filter((id) => id !== characterId)
    : [...revealedCharacterIds.value, characterId]
}

function toggleAllCovers() {
  revealedCharacterIds.value = areAllCharactersRevealed.value ? [] : props.characters.map((entry) => entry.id)
}
</script>

<template>
  <view class="study-preview-panel">
    <view class="preview-summary">
      <view class="summary-copy">
        <text class="summary-title">{{ title }}</text>
        <text class="summary-description">{{ description }}</text>
      </view>
      <view class="summary-actions">
        <button class="swap-button" role="button" aria-label="交换遮盖字体" @click="swapCoveredFont">
          <van-icon name="exchange" size="18" aria-hidden="true" />
        </button>
        <button class="cover-toggle-button" role="button" :aria-label="coverToggleLabel" @click="toggleAllCovers">
          <van-icon :name="areAllCharactersRevealed ? 'closed-eye' : 'eye-o'" size="19" aria-hidden="true" />
        </button>
      </view>
    </view>

    <view class="font-heading" :class="{ 'has-slash': canSlash }" aria-label="字体对照顺序">
      <view class="font-heading-item" :class="{ 'is-covered': coveredFont === 'learning' }">
        <text class="font-kind">学习字体</text>
        <text class="font-name">{{ learningFont.name }}</text>
      </view>
      <view class="font-heading-item" :class="{ 'is-covered': coveredFont === 'reference' }">
        <text class="font-kind">对照字体</text>
        <text class="font-name">{{ referenceFont.name }}</text>
      </view>
      <view class="detail-heading">{{ canSlash ? '操作' : '详情' }}</view>
    </view>

    <scroll-view class="character-scroll" scroll-y :show-scrollbar="false" :bounces="false" :enhanced="false">
      <view class="character-list">
        <view v-for="entry in characters" :key="entry.id" class="character-row" :class="{ 'has-slash': canSlash }">
          <button
            v-if="coveredFont === 'learning'"
            class="character-cell toggle-cell"
            :class="{ 'cover-cell': !isRevealed(entry.id) }"
            role="button"
            :aria-label="isRevealed(entry.id) ? `重新遮盖${entry.script_forms.simplified}的${learningFont.name}字形` : `显示${entry.script_forms.simplified}的${learningFont.name}字形`"
            @click="toggleCharacterCover(entry.id)"
          >
            <text v-if="isRevealed(entry.id)" class="character" :style="{ fontFamily: learningFont.fontFamily }">{{ entry.script_forms.simplified }}</text>
            <text v-else class="cover-hint">点击显示</text>
          </button>
          <view v-else class="character-cell">
            <text class="character" :style="{ fontFamily: learningFont.fontFamily }">{{ entry.script_forms.simplified }}</text>
          </view>

          <button
            v-if="coveredFont === 'reference'"
            class="character-cell toggle-cell"
            :class="{ 'cover-cell': !isRevealed(entry.id) }"
            role="button"
            :aria-label="isRevealed(entry.id) ? `重新遮盖${entry.script_forms.simplified}的${referenceFont.name}字形` : `显示${entry.script_forms.simplified}的${referenceFont.name}字形`"
            @click="toggleCharacterCover(entry.id)"
          >
            <text v-if="isRevealed(entry.id)" class="character" :style="{ fontFamily: referenceFont.fontFamily }">{{ entry.script_forms.simplified }}</text>
            <text v-else class="cover-hint">点击显示</text>
          </button>
          <view v-else class="character-cell">
            <text class="character" :style="{ fontFamily: referenceFont.fontFamily }">{{ entry.script_forms.simplified }}</text>
          </view>

          <button
            v-if="canSlash"
            class="slash-button"
            role="button"
            :aria-label="`斩掉${entry.script_forms.simplified}，后续关卡学习不再出现`"
            @click="emit('slash-character', entry.id)"
          >斩</button>
          <button
            class="detail-button"
            role="button"
            :aria-label="`查看${entry.script_forms.simplified}的文字详情`"
            @click="emit('open-detail', entry.id)"
          >
            <van-icon name="search" size="21" aria-hidden="true" />
          </button>
        </view>
        <view v-if="characters.length === 0" class="empty-characters" role="status">
          <text>暂无可学习文字</text>
          <text>可在文字详情页恢复已斩掉的文字</text>
        </view>
      </view>
    </scroll-view>

  </view>
</template>

<style scoped lang="scss">
.swap-button, .cover-toggle-button, .character-cell, .detail-button { margin: 0; padding: 0; border: 0; color: inherit; line-height: normal; }
.swap-button::after, .cover-toggle-button::after, .character-cell::after, .detail-button::after { border: 0; }
.preview-summary { min-height: 88px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--color-border); background: var(--color-surface); }
.summary-copy { min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.summary-title { font-size: 14px; font-weight: 700; }
.summary-description { overflow: hidden; color: var(--color-text-muted); font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.summary-actions { flex: none; display: flex; align-items: center; gap: 7px; }
.swap-button, .cover-toggle-button { width: 42px; height: 38px; display: grid; place-items: center; border-radius: 8px; }
.swap-button { background: var(--color-primary-soft); color: var(--color-primary); }
.cover-toggle-button { border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent); background: var(--color-surface); color: var(--color-primary); box-shadow: 0 3px 10px var(--color-shadow); }
.font-heading { min-height: 52px; padding: 0 10px 0 16px; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 46px; align-items: center; gap: 10px; border-bottom: 1px solid var(--color-border); background: var(--color-surface-muted); }
.font-heading-item { min-width: 0; display: flex; align-items: baseline; gap: 5px; }
.font-heading-item.is-covered .font-name::after { content: ' · 遮盖'; color: var(--color-primary); font-size: 8px; font-weight: 500; }
.font-kind { flex: none; color: var(--color-text-muted); font-size: 8px; }
.font-name { overflow: hidden; font-size: 10px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.detail-heading { color: var(--color-text-muted); font-size: 8px; text-align: center; }
.character-scroll { flex-basis: 0; min-height: 0; flex: 1; overflow-y: auto; overscroll-behavior: contain; overscroll-behavior-y: contain; -webkit-overflow-scrolling: touch; touch-action: pan-y; background: var(--color-surface); }
.character-list { padding-bottom: 6px; }
.empty-characters { min-height: 220px; padding: 30px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--color-text-muted); font-size: 11px; text-align: center; }
.character-row { min-height: 74px; padding: 10px 10px 10px 16px; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 46px; align-items: stretch; gap: 10px; border-bottom: 1px solid var(--color-border); }
.character-cell { min-width: 0; min-height: 54px; display: grid; place-items: center; border-radius: 7px; background: var(--color-surface-muted); }
.toggle-cell { cursor: pointer; }
.character { font-size: 30px; font-weight: 600; line-height: 1; }
.cover-cell { position: relative; overflow: hidden; background: color-mix(in srgb, var(--color-text-muted) 18%, var(--color-surface)); cursor: pointer; }
.cover-cell::before { content: ''; position: absolute; inset: 0; background: repeating-linear-gradient(135deg, transparent 0 8px, color-mix(in srgb, var(--color-text-muted) 8%, transparent) 8px 16px); }
.cover-hint { position: relative; z-index: 1; color: var(--color-text-muted); font-size: 8px; }
.detail-button { width: 46px; min-height: 54px; display: grid; place-items: center; background: transparent; color: var(--color-text-muted); }
@media (max-width: 360px) {
  .preview-summary { padding-right: 12px; padding-left: 12px; }
  .swap-button, .cover-toggle-button { width: 40px; height: 36px; }
  .font-heading, .character-row { padding-left: 12px; gap: 7px; }
  .character { font-size: 27px; }
}
@media (prefers-reduced-motion: reduce) { .study-preview-panel * { scroll-behavior: auto; } }
.study-preview-panel { min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.font-heading.has-slash, .character-row.has-slash { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 36px 36px; gap: 7px; }
.font-heading.has-slash .detail-heading { grid-column: 3 / 5; }
.has-slash .detail-button { width: 36px; }
.slash-button { width: 36px; min-height: 54px; margin: 0; padding: 0; display: grid; place-items: center; border: 0; border-radius: 7px; background: var(--color-primary-soft); color: var(--color-primary); font-size: 13px; font-weight: 700; line-height: normal; }
.slash-button::after { border: 0; }
button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: -2px; }

</style>
