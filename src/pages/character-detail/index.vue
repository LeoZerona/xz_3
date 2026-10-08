<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { fontCatalog } from '../../fonts/catalog'
import characterTable from '../../static/character_table/first-level.json'
import { useCharacterPreferencesStore } from '../../stores/characterPreferences'
import { useFontStore } from '../../stores/fonts'
import type { StudyCharacterEntry } from '../../study/types'
import CharacterDetailContent from './components/CharacterDetailContent.vue'

const characterId = ref('')
const preferencesStore = useCharacterPreferencesStore()
const { favoriteIds, excludedIds } = storeToRefs(preferencesStore)
const { addedFonts, currentFont } = storeToRefs(useFontStore())
const characters: StudyCharacterEntry[] = characterTable.chars

const character = computed(() => characters.find((entry) => entry.id === characterId.value))
const referenceFont = computed(() => (
  addedFonts.value.find((font) => font.id !== currentFont.value.id)
  ?? fontCatalog.find((font) => font.id !== currentFont.value.id)
  ?? currentFont.value
))
const isFavorite = computed(() => Boolean(character.value && favoriteIds.value.includes(character.value.id)))
const isExcluded = computed(() => Boolean(character.value && excludedIds.value.includes(character.value.id)))

function goBack() {
  uni.navigateBack({ delta: 1, fail: () => uni.reLaunch({ url: '/pages/study-preview/index' }) })
}

function openSearch() {
  uni.navigateTo({ url: '/pages/search/index' })
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
})
</script>

<template>
  <view class="detail-page">
    <view class="detail-header">
      <button class="header-button back-button" role="button" aria-label="返回" @click="goBack">
        <text aria-hidden="true">‹</text>
      </button>
      <view aria-hidden="true" />
      <view class="header-actions">
        <button class="header-button" role="button" aria-label="搜索" @click="openSearch">
          <van-icon name="search" size="22" aria-hidden="true" />
        </button>
        <button class="header-button favorite-button" :class="{ 'is-active': isFavorite }" role="button" :disabled="!character" :aria-label="isFavorite ? '取消收藏当前文字' : '收藏当前文字'" :aria-pressed="isFavorite" @click="toggleFavorite">
          <text aria-hidden="true">{{ isFavorite ? '★' : '☆' }}</text>
        </button>
        <button class="header-button exclude-button" :class="{ 'is-active': isExcluded }" role="button" :disabled="!character" :aria-label="isExcluded ? '恢复当前文字到学习列表' : '斩掉当前文字，后续学习不再出现'" :aria-pressed="isExcluded" @click="toggleExcluded">
          <text aria-hidden="true">斩</text>
        </button>
      </view>
    </view>

    <CharacterDetailContent
      v-if="character"
      :character="character"
      :learning-font="currentFont"
      :reference-font="referenceFont"
    />

    <view v-else class="empty-state" role="status">
      <van-icon name="warning-o" size="34" color="var(--color-text-muted)" aria-hidden="true" />
      <text class="empty-title">没有找到这个文字</text>
      <button class="return-button" role="button" @click="goBack">返回今日预览</button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.detail-page { width: min(100%, 560px); min-height: 100vh; min-height: 100dvh; margin: 0 auto; background: radial-gradient(circle at 90% 0, var(--color-primary-soft) 0, transparent 34%), linear-gradient(180deg, var(--color-topbar) 0, var(--color-page) 48%, var(--color-surface-muted) 100%); color: var(--color-text); }
.detail-header { min-height: calc(58px + var(--app-top-safe-area)); padding: var(--app-top-safe-area) 12px 0; display: grid; grid-template-columns: 44px minmax(0, 1fr) 132px; align-items: center; }
.header-actions { display: flex; justify-content: flex-end; gap: 4px; }
.header-button, .return-button { margin: 0; padding: 0; border: 0; color: inherit; line-height: normal; }
.header-button::after, .return-button::after { border: 0; }
.header-button { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 50%; background: transparent; }
.header-button.is-active { background: var(--color-primary-soft); color: var(--color-primary); }
.header-button[disabled] { color: var(--color-text-muted); opacity: .48; }
.back-button { font-size: 38px; font-weight: 300; }
.favorite-button { font-size: 27px; }
.exclude-button { font-size: 13px; font-weight: 700; }
.empty-state { min-height: calc(100vh - 100px); padding: 30px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; }
.empty-title { font-size: 14px; font-weight: 600; }
.return-button { height: 42px; padding: 0 18px; border-radius: 8px; background: var(--color-primary); color: var(--color-on-primary); font-size: 12px; }
</style>
