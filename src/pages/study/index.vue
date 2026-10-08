<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { fontCatalog } from '../../fonts/catalog'
import type { LearningFont } from '../../fonts/types'
import characterTable from '../../static/character_table/first-level.json'
import { useCharacterPreferencesStore } from '../../stores/characterPreferences'
import { useFontStore } from '../../stores/fonts'
import { INPUT_STUDY_MODE, normalizeStudyModes, STUDY_MODES } from '../../study/modes'
import type { StudyMode } from '../../study/modes'
import type { StudyCharacterEntry } from '../../study/types'
import StudyQuestionCard from './components/StudyQuestionCard.vue'

interface StoredLearningPlan {
  dailyCount?: number
  modes?: string[]
}

interface StudyQuestion {
  mode: StudyMode
  position: number
  character: StudyCharacterEntry
  options: StudyCharacterEntry[]
  promptFont: LearningFont
  answerFont: LearningFont
  learningFont: LearningFont
  referenceFont: LearningFont
}

const PLAN_STORAGE_KEY = 'font-learning-plan'
const DEFAULT_DAILY_COUNT = 15
const REVIEW_TARGET = 20

const fontStore = useFontStore()
const preferencesStore = useCharacterPreferencesStore()
const { addedFonts, currentFont } = storeToRefs(fontStore)
const savedPlan = uni.getStorageSync(PLAN_STORAGE_KEY) as StoredLearningPlan | undefined
const configuredDailyCount = typeof savedPlan?.dailyCount === 'number' ? savedPlan.dailyCount : DEFAULT_DAILY_COUNT
const configuredModes = normalizeStudyModes(savedPlan?.modes)
const activeModes = configuredModes.length > 0 ? configuredModes : [...STUDY_MODES]
const availableCharacters: StudyCharacterEntry[] = characterTable.chars.filter((entry) => !preferencesStore.isExcluded(entry.id))
const dailyCharacters = availableCharacters.slice(0, Math.max(1, Math.trunc(configuredDailyCount)))
const dailyTarget = dailyCharacters.length

const currentIndex = ref(0)
const learnedCount = ref(0)
const reviewedCount = ref(0)
const selectedAnswer = ref<string | null>(null)
const inputAnswer = ref('')
const hasAttempted = ref(false)
const hasAnswered = ref(false)

const referenceFont = computed(() => (
  addedFonts.value.find((font) => font.id !== currentFont.value.id)
  ?? fontCatalog.find((font) => font.id !== currentFont.value.id)
  ?? currentFont.value
))
const activeMode = computed(() => activeModes[currentIndex.value % activeModes.length] ?? STUDY_MODES[0])
const currentCharacter = computed(() => dailyCharacters[currentIndex.value] ?? dailyCharacters[0])
const isInputMode = computed(() => activeMode.value === INPUT_STUDY_MODE)
const isInputAnswerCorrect = computed(() => {
  if (!currentCharacter.value) return false
  const answer = inputAnswer.value.trim()
  const expected = currentCharacter.value.script_forms
  return answer === expected.simplified || answer === expected.traditional
})
const isCorrect = computed(() => {
  if (isInputMode.value) return hasAttempted.value && isInputAnswerCorrect.value
  return Boolean(currentCharacter.value && selectedAnswer.value === currentCharacter.value.script_forms.simplified)
})
const isLastQuestion = computed(() => currentIndex.value >= dailyCharacters.length - 1)
const studyProgress = computed(() => Math.min(learnedCount.value, dailyTarget))
const choiceOptions = computed(() => buildChoiceOptions(availableCharacters, currentIndex.value))
const currentQuestion = computed<StudyQuestion | null>(() => {
  if (!currentCharacter.value) return null
  const isReverseChoice = activeMode.value === '查看对照字体选择学习字体'
  return {
    mode: activeMode.value,
    position: currentIndex.value + 1,
    character: currentCharacter.value,
    options: choiceOptions.value,
    promptFont: isReverseChoice ? referenceFont.value : currentFont.value,
    answerFont: isReverseChoice ? currentFont.value : referenceFont.value,
    learningFont: currentFont.value,
    referenceFont: referenceFont.value,
  }
})

function buildChoiceOptions(entries: StudyCharacterEntry[], index: number): StudyCharacterEntry[] {
  const choices: StudyCharacterEntry[] = []
  for (let offset = 0; choices.length < 4 && offset < entries.length; offset += 1) {
    const candidate = entries[(index + offset) % entries.length]
    if (candidate && !choices.some((choice) => choice.id === candidate.id)) choices.push(candidate)
  }
  const shift = choices.length > 0 ? (index * 3 + 1) % choices.length : 0
  return [...choices.slice(shift), ...choices.slice(0, shift)]
}

function markCorrectAnswer() {
  if (hasAnswered.value || !isCorrect.value) return
  hasAnswered.value = true
  learnedCount.value += 1
}

function handleChoiceAnswer(character: string) {
  if (isCorrect.value) return
  selectedAnswer.value = character
  hasAttempted.value = true
  markCorrectAnswer()
}

function handleInputAnswer(value: string) {
  inputAnswer.value = Array.from(value.trim()).slice(0, 1).join('')
  hasAttempted.value = false
}

function submitInputAnswer(value: string) {
  inputAnswer.value = Array.from(value.trim()).slice(0, 1).join('')
  if (!inputAnswer.value || hasAnswered.value) return
  hasAttempted.value = true
  const expected = currentCharacter.value?.script_forms
  if (!expected) return
  if (inputAnswer.value !== expected.simplified && inputAnswer.value !== expected.traditional) return
  hasAnswered.value = true
  learnedCount.value += 1
}

function resetQuestionState() {
  selectedAnswer.value = null
  inputAnswer.value = ''
  hasAttempted.value = false
  hasAnswered.value = false
}

function handleNext() {
  if (!isCorrect.value) return
  if (isLastQuestion.value) {
    uni.showModal({
      title: '今日学习完成',
      content: `已完成 ${dailyTarget} 个文字练习`,
      showCancel: false,
      success: () => uni.reLaunch({ url: '/pages/index/index' }),
    })
    return
  }
  currentIndex.value += 1
  resetQuestionState()
}

function openSearch() {
  uni.navigateTo({ url: '/pages/search/index' })
}

function toggleFavorite() {
  const character = currentCharacter.value
  if (!character) return
  preferencesStore.toggleFavorite(character.id)
  uni.showToast({ title: preferencesStore.isFavorite(character.id) ? '已收藏' : '已取消收藏', icon: 'none' })
}

onMounted(() => {
  uni.pageScrollTo({ scrollTop: 0, duration: 0 })
})
</script>

<template>
  <view class="study-page">
    <view class="study-topbar">
      <navigator class="topbar-button" url="/pages/index/index" open-type="reLaunch" hover-class="none" role="button" aria-label="返回">
        <span class="back-icon" aria-hidden="true">←</span>
      </navigator>
      <view class="header-space" aria-hidden="true" />
      <view class="topbar-actions">
        <button class="topbar-button" role="button" aria-label="搜索" @click="openSearch">
          <span class="search-icon" aria-hidden="true" />
        </button>
        <button class="topbar-button" role="button" :aria-label="currentCharacter && preferencesStore.isFavorite(currentCharacter.id) ? '取消收藏当前文字' : '收藏当前文字'" @click="toggleFavorite">
          <span class="favorite-icon" aria-hidden="true">{{ currentCharacter && preferencesStore.isFavorite(currentCharacter.id) ? '★' : '☆' }}</span>
        </button>
      </view>
    </view>

    <view class="progress-card" aria-label="今日学习进度">
      <view class="progress-item">
        <text class="progress-label">今日新学</text>
        <text class="progress-value">{{ studyProgress }}/{{ dailyTarget }}</text>
      </view>
      <view class="progress-item">
        <text class="progress-label">今日复习</text>
        <text class="progress-value">{{ reviewedCount }}/{{ REVIEW_TARGET }}</text>
      </view>
      <view class="progress-item">
        <text class="progress-label">学习时间</text>
        <text class="progress-value">0<small>min</small></text>
      </view>
    </view>

    <StudyQuestionCard
      v-if="currentQuestion"
      :key="currentQuestion.position"
      :question="currentQuestion"
      :selected-answer="selectedAnswer"
      :input-answer="inputAnswer"
      :has-attempted="hasAttempted"
      :is-correct="isCorrect"
      :is-last-question="isLastQuestion"
      @answer-choice="handleChoiceAnswer"
      @update:input-answer="handleInputAnswer"
      @submit-input="submitInputAnswer"
      @next="handleNext"
    />
    <view v-else class="empty-study" role="status">
      <text class="empty-study-title">暂无可学习文字</text>
      <text class="empty-study-description">可在文字详情页恢复已斩掉的文字</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.study-page { width: min(100%, 560px); height: 100vh; height: 100dvh; margin: 0 auto; overflow: hidden; display: flex; flex-direction: column; color: var(--color-text); background: radial-gradient(circle at 90% 0, var(--color-primary-soft) 0, transparent 34%), linear-gradient(180deg, var(--color-topbar) 0, var(--color-page) 48%, var(--color-surface-muted) 100%); }
.study-topbar { min-height: calc(64px + var(--app-top-safe-area)); padding: var(--app-top-safe-area) 14px 4px; display: grid; grid-template-columns: 88px 1fr 88px; align-items: center; }
.topbar-actions { display: flex; justify-content: flex-end; gap: 6px; }
.topbar-button { width: 40px; height: 40px; margin: 0; padding: 0; display: grid; place-items: center; border: 0; background: transparent; color: var(--color-text); line-height: 1; }
.topbar-button::after { border: 0; }
.back-icon, .favorite-icon, .search-icon { pointer-events: none; }
.back-icon { font-size: 27px; font-weight: 300; }
.favorite-icon { font-size: 31px; line-height: 1; }
.search-icon { position: relative; width: 21px; height: 21px; border: 2px solid currentColor; border-radius: 50%; }
.search-icon::after { content: ''; position: absolute; right: -5px; bottom: -3px; width: 8px; height: 2px; border-radius: 2px; background: currentColor; transform: rotate(48deg); transform-origin: left center; }
.progress-card { margin: 2px 16px 0; padding: 15px 12px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border: 1px solid color-mix(in srgb, var(--color-border) 84%, transparent); border-radius: 18px; background: var(--color-surface); box-shadow: 0 10px 28px color-mix(in srgb, var(--color-shadow) 88%, transparent); }
.progress-item { min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.progress-label { color: var(--color-text-muted); font-size: 10px; }
.progress-value { font-size: 17px; font-weight: 700; letter-spacing: -.04em; }
.progress-value small { margin-left: 2px; font-size: 10px; font-weight: 600; }
.empty-study { min-height: 0; padding: 30px; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; }
.empty-study-title { font-size: 15px; font-weight: 700; }
.empty-study-description { color: var(--color-text-muted); font-size: 11px; }

@media (max-height: 720px) {
  .study-topbar { min-height: calc(56px + var(--app-top-safe-area)); }
  .progress-card { padding-top: 10px; padding-bottom: 10px; }
}

@media (max-width: 360px) {
  .study-topbar { grid-template-columns: 82px 1fr 82px; padding-right: 10px; padding-left: 10px; }
  .progress-card { margin-right: 12px; margin-left: 12px; }
  .progress-label { font-size: 9px; }
}
</style>
