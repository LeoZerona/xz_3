<script setup lang="ts">
import { onBackPress } from '@dcloudio/uni-app'
import { computed } from 'vue'
import StudyPreviewPanel from '../../components/StudyPreviewPanel.vue'
import { storeToRefs } from 'pinia'
import characterTable from '../../static/character_table/first-level.json'
import { useCharacterLearningStore } from '../../stores/characterLearning'
import { useDailyProgressStore } from '../../stores/dailyProgress'
import { useFontStore } from '../../stores/fonts'
import { useThemeStore } from '../../stores/theme'
import { readPlanDailyCount } from '../../study/dailyProgress'

const fontStore = useFontStore()
const learningStore = useCharacterLearningStore()
const dailyProgressStore = useDailyProgressStore()
const { currentFont, referenceFont } = storeToRefs(fontStore)
const { themeStyle } = storeToRefs(useThemeStore())
const { assignedIds, learnedIds } = storeToRefs(dailyProgressStore)
const dailyCount = Math.min(characterTable.chars.length, readPlanDailyCount())

dailyProgressStore.hydrate()
dailyProgressStore.reconcileLearned(learningStore.completedIds)
const candidateIds = characterTable.chars
  .filter((entry) => !learningStore.isExcluded(entry.id) && !learningStore.isCharacterComplete(entry.id))
  .map((entry) => entry.id)
dailyProgressStore.ensureSession(candidateIds, dailyCount)
for (const characterId of assignedIds.value) {
  if (learningStore.isCharacterComplete(characterId)) dailyProgressStore.addLearned(characterId)
}

const characterById = new Map(characterTable.chars.map((entry) => [entry.id, entry]))
const dailyCharacters = computed(() => assignedIds.value.flatMap((id) => {
  const entry = characterById.get(id)
  return entry ? [entry] : []
}))
const isDayComplete = computed(() => (
  dailyCharacters.value.length > 0
  && dailyCharacters.value.every((entry) => learnedIds.value.includes(entry.id))
))
const completedCount = computed(() => dailyCharacters.value
  .filter((entry) => learnedIds.value.includes(entry.id)).length)

function goBack() {
  if (getCurrentPages().length > 1) {
    uni.navigateBack({ delta: 1, fail: () => uni.reLaunch({ url: '/pages/index/index' }) })
    return
  }
  uni.reLaunch({ url: '/pages/index/index' })
}

onBackPress(() => {
  goBack()
  return true
})

function openCharacterDetail(characterId: string) {
  uni.navigateTo({ url: `/pages/character-detail/index?id=${encodeURIComponent(characterId)}` })
}

function startLearning() {
  if (dailyCharacters.value.length === 0) {
    uni.showToast({ title: '暂无可学习文字', icon: 'none' })
    return
  }
  if (isDayComplete.value) {
    uni.showToast({ title: '今日学习已完成', icon: 'success' })
    return
  }
  uni.redirectTo({ url: '/pages/study/index' })
}
</script>

<template>
  <view class="preview-page" :style="themeStyle">
    <view class="preview-header">
      <button class="header-button" role="button" aria-label="返回" @click="goBack">
        <text class="back-icon" aria-hidden="true">‹</text>
      </button>
      <view aria-hidden="true" />
      <view class="header-space" />
    </view>

    <StudyPreviewPanel
      :characters="dailyCharacters"
      :learning-font="currentFont"
      :reference-font="referenceFont"
      :title="`今日要学 ${dailyCharacters.length} 个文字`"
      :description="`已完成 ${completedCount}/${dailyCharacters.length} · 每字需完成三种练习`"
      @open-detail="openCharacterDetail"
    />

    <view class="start-wrap">
      <button class="start-button" role="button" :aria-label="isDayComplete ? '今日学习已完成' : '开始今日学习'" :disabled="dailyCharacters.length === 0 || isDayComplete" @click="startLearning">{{ isDayComplete ? '今日学习已完成' : '开始今日学习' }}</button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.preview-page { width: min(100%, 560px); height: 100vh; height: 100dvh; margin: 0 auto; overflow: hidden; display: flex; flex-direction: column; background: var(--color-page); color: var(--color-text); }
.preview-header { min-height: calc(66px + var(--app-top-safe-area)); padding: var(--app-top-safe-area) 12px 8px 0; display: grid; grid-template-columns: 44px 1fr 44px; align-items: center; background: var(--color-topbar); }
.header-button { width: 44px; height: 44px; min-width: 44px; min-height: 44px; display: grid; place-items: center; background: transparent; margin-left: 0; border-radius: 22px; }
.header-button:active { background: var(--color-primary-soft); }
.back-icon { font-size: 38px; font-weight: 300; line-height: 1; }
.start-wrap { padding: 10px 16px calc(10px + env(safe-area-inset-bottom)); border-top: 1px solid var(--color-border); background: var(--color-surface); box-shadow: 0 -5px 18px var(--color-shadow); }
.start-button { width: 100%; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 9px; background: var(--color-primary); color: var(--color-on-primary); font-size: 14px; font-weight: 600; line-height: 1; }
.start-button[disabled] { background: var(--color-surface-muted); color: var(--color-text-muted); }
.header-button, .start-button { margin: 0; padding: 0; border: 0; }
.header-button { margin-left: 0; }
.header-button::after, .start-button::after { border: 0; }
.start-button { color: var(--color-on-primary); }

</style>
