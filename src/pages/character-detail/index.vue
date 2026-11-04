<script setup lang="ts">
import DatabaseStatus from '../../components/DatabaseStatus.vue'

import { computed, onBeforeUnmount, ref } from 'vue'
import { onBackPress, onLoad } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { getCharacter } from '../../database/catalog'
import { useDatabaseTask } from '../../database/useDatabaseTask'
import { useCharacterLearningStore } from '../../stores/characterLearning'
import { useFontStore } from '../../stores/fonts'
import { useThemeStore } from '../../stores/theme'
import type { StudyCharacterEntry } from '../../study/types'
import type { LevelCategory } from '../../study/levelData'
import CharacterDetailContent from './components/CharacterDetailContent.vue'
import CharacterSlashMark from '../../components/CharacterSlashMark.vue'
import { openCharacterSearch } from '../../search/navigation'

const characterId = ref('')
const preferencesStore = useCharacterLearningStore()
const { favoriteIds, excludedIds } = storeToRefs(preferencesStore)
const { currentFont, referenceFont } = storeToRefs(useFontStore())
const { themeStyle } = storeToRefs(useThemeStore())
const stageContext = ref<{ category: LevelCategory; stageId: string } | null>(null)
const stageCharacter = ref<StudyCharacterEntry | null>(null)
const isCharacterLoading = ref(false)
const characterLoadError = ref('')
let characterRequestId = 0

const character = computed(() => stageCharacter.value)
const isFavorite = computed(() => Boolean(character.value && favoriteIds.value.includes(character.value.id)))
const isExcluded = computed(() => Boolean(character.value && excludedIds.value.includes(character.value.id)))
const previewUrl = computed(() => stageContext.value
  ? `/pages/level-study/index?category=${stageContext.value.category}&stageId=${encodeURIComponent(stageContext.value.stageId)}`
  : '/pages/study-preview/index')

async function loadCharacterDetail() {
  const requestId = ++characterRequestId
  const requestedId = characterId.value
  isCharacterLoading.value = true
  characterLoadError.value = ''
  try {
    const entry = await getCharacter(requestedId)
    if (requestId !== characterRequestId) return
    stageCharacter.value = entry
  } catch (error) {
    if (requestId !== characterRequestId) return
    characterLoadError.value = error instanceof Error ? error.message : '文字详情加载失败，请重试'
  } finally {
    if (requestId === characterRequestId) isCharacterLoading.value = false
  }
}

onBeforeUnmount(() => { characterRequestId += 1 })
useDatabaseTask(loadCharacterDetail)

function goBack() {
  if (getCurrentPages().length > 1) {
    uni.navigateBack({ delta: 1, fail: () => uni.reLaunch({ url: previewUrl.value }) })
    return
  }
  uni.reLaunch({ url: previewUrl.value })
}

onBackPress((event) => {
  if (event.from === 'navigateBack') return false
  goBack()
  return true
})

function openSearch() {
  let returnUrl = `/pages/character-detail/index?id=${encodeURIComponent(characterId.value)}`
  if (stageContext.value) returnUrl += `&category=${stageContext.value.category}&stageId=${encodeURIComponent(stageContext.value.stageId)}`
  openCharacterSearch(returnUrl)
}

function toggleFavorite() {
  const currentCharacter = character.value
  if (!currentCharacter) return
  preferencesStore.toggleFavorite(currentCharacter.id)
  uni.showToast({ title: preferencesStore.isFavorite(currentCharacter.id) ? '已收藏' : '已取消收藏', icon: 'none' })
}

function toggleExcluded() {
  const currentCharacter = character.value
  if (!currentCharacter) return
  preferencesStore.toggleExcluded(currentCharacter.id)
  uni.showToast({
    title: preferencesStore.isExcluded(currentCharacter.id) ? '后续学习将不再出现' : '已恢复到学习列表',
    icon: 'none',
  })
}

onLoad((options) => {
  characterId.value = typeof options?.id === 'string' ? options.id : ''
  const category = options?.category
  if ((category === 'radical' || category === 'level1' || category === 'level2' || category === 'level3')
    && typeof options?.stageId === 'string') {
    stageContext.value = { category, stageId: options.stageId }
  }
})
</script>

<template>
  <view class="detail-page" :style="themeStyle">
    <DatabaseStatus />
    <view class="detail-header">
      <button class="header-button back-button" role="button" aria-label="返回" @click="goBack">
        <text aria-hidden="true">‹</text>
      </button>
      <view aria-hidden="true" />
      <view class="header-actions">
        <button class="header-button" role="button" aria-label="搜索" @click="openSearch">
          <van-icon name="search" size="22" aria-hidden="true" />
        </button>
        <button class="header-button exclude-button" :class="{ 'is-active': isExcluded }" role="button" :disabled="!character" :aria-label="isExcluded ? '恢复当前文字到学习列表' : '斩掉当前文字，后续学习不再出现'" :aria-pressed="isExcluded" @click="toggleExcluded">
          <CharacterSlashMark :active="isExcluded" />
        </button>
      </view>
    </view>

    <scroll-view class="character-detail-scroll" scroll-y :bounces="false" role="region" tabindex="0" aria-label="文字详情内容">
      <CharacterDetailContent
        v-if="character"
        :character="character"
        :learning-font="currentFont"
        :reference-font="referenceFont"
        can-favorite
        :is-favorite="isFavorite"
        @toggle-favorite="toggleFavorite"
      />

      <view v-else class="empty-state" role="status">
        <van-icon name="warning-o" size="34" color="var(--color-text-muted)" aria-hidden="true" />
        <text class="empty-title">{{ isCharacterLoading ? '正在加载文字详情' : '没有找到这个文字' }}</text>
        <text v-if="characterLoadError">{{ characterLoadError }}</text>
        <button v-if="characterLoadError" class="return-button" role="button" @click="loadCharacterDetail">重试</button>
        <button class="return-button" role="button" @click="goBack">返回预览</button>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
/* 全局锁定外层滚动，长详情须由视口内有明确高度的 scroll-view 承担。 */
.detail-page { width: min(100%, 560px); height: 100vh; height: 100dvh; margin: 0 auto; display: flex; flex-direction: column; overflow: hidden; background: radial-gradient(circle at 90% 0, var(--color-primary-soft) 0, transparent 34%), linear-gradient(180deg, var(--color-topbar) 0, var(--color-page) 48%, var(--color-surface-muted) 100%); color: var(--color-text); }
.detail-header { flex: none; min-height: calc(58px + var(--app-top-safe-area)); padding: var(--app-top-safe-area) 12px 0; display: grid; grid-template-columns: 44px minmax(0, 1fr) auto; align-items: center; }
.character-detail-scroll { flex: 1; min-height: 0; overflow: hidden; }
.header-actions { display: flex; justify-content: flex-end; gap: 4px; }
.header-button, .return-button { margin: 0; padding: 0; border: 0; color: inherit; line-height: normal; }
.header-button::after, .return-button::after { border: 0; }
.header-button { width: 44px; height: 44px; min-width: 44px; min-height: 44px; display: grid; place-items: center; border-radius: var(--control-radius); background: transparent; }
.header-button.is-active { background: var(--color-primary-soft); color: var(--color-primary); }
.header-button:active { background: var(--color-primary-soft); }
.header-button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: -2px; }
.header-button[disabled] { color: var(--color-text-muted); opacity: .48; }
.back-button { font-size: 38px; font-weight: 300; }
.exclude-button { font-size: 13px; font-weight: 700; }
.empty-state { min-height: calc(100vh - 100px); padding: 30px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; }
.empty-title { font-size: 14px; font-weight: 600; }
.return-button { height: 42px; padding: 0 18px; border-radius: 8px; background: var(--color-primary); color: var(--color-on-primary); font-size: 12px; }
</style>
