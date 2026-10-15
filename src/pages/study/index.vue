<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import type { LearningFont } from '../../fonts/types'
import characterTable from '../../static/character_table/first-level.json'
import { useCharacterLearningStore } from '../../stores/characterLearning'
import { useDailyProgressStore } from '../../stores/dailyProgress'
import { useFontStore } from '../../stores/fonts'
import { IDLE_TIMEOUT_MS, readPlanDailyCount, REVIEW_TARGET } from '../../study/dailyProgress'
import { INPUT_STUDY_MODE, STUDY_MODES } from '../../study/modes'
import type { StudyMode } from '../../study/modes'
import type { StudyCharacterEntry } from '../../study/types'
import StudyQuestionCard from './components/StudyQuestionCard.vue'

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

const fontStore = useFontStore()
const learningStore = useCharacterLearningStore()
const dailyProgressStore = useDailyProgressStore()
const { currentFont, referenceFont } = storeToRefs(fontStore)
const { reviewedCount: storedReviewedCount } = storeToRefs(dailyProgressStore)
dailyProgressStore.hydrate()
dailyProgressStore.reconcileLearned(learningStore.completedIds)
const allCharacters: StudyCharacterEntry[] = characterTable.chars
const availableCharacters = allCharacters.filter((entry) => !learningStore.isExcluded(entry.id))
const candidateIds = availableCharacters
  .filter((entry) => !learningStore.isCharacterComplete(entry.id))
  .map((entry) => entry.id)
dailyProgressStore.ensureSession(candidateIds, readPlanDailyCount())
for (const characterId of dailyProgressStore.assignedIds) {
  if (learningStore.isCharacterComplete(characterId)) dailyProgressStore.addLearned(characterId)
}

const characterById = new Map(allCharacters.map((entry) => [entry.id, entry]))
const dailyCharacters = computed(() => dailyProgressStore.assignedIds.flatMap((id) => {
  const entry = characterById.get(id)
  return entry ? [entry] : []
}))
const initialIndex = dailyCharacters.value.findIndex((entry) => !learningStore.isCharacterComplete(entry.id))
const currentIndex = ref(initialIndex >= 0 ? initialIndex : dailyCharacters.value.length)
const reviewedCount = computed(() => storedReviewedCount.value)
const selectedAnswer = ref<string | null>(null)
const inputAnswer = ref('')
const hasAttempted = ref(false)
const hasAnswered = ref(false)

const currentCharacter = computed(() => dailyCharacters.value[currentIndex.value])
const activeMode = ref<StudyMode>(
  currentCharacter.value ? learningStore.nextIncompleteMode(currentCharacter.value.id) ?? STUDY_MODES[0] : STUDY_MODES[0],
)
if (currentCharacter.value) dailyProgressStore.setCurrentCharacter(currentCharacter.value.id)
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
const isLastCharacter = computed(() => currentIndex.value >= dailyCharacters.value.length - 1)
const isLastMode = computed(() => Boolean(currentCharacter.value && learningStore.isCharacterComplete(currentCharacter.value.id)))
const modePosition = computed(() => STUDY_MODES.indexOf(activeMode.value) + 1)
const isDayComplete = computed(() => dailyCharacters.value.length > 0
  && dailyCharacters.value.every((entry) => learningStore.isCharacterComplete(entry.id)))
const dailyTarget = computed(() => dailyCharacters.value.length)
const learnedCount = computed(() => dailyProgressStore.learnedCount)
const studyProgress = computed(() => Math.min(learnedCount.value, dailyTarget.value))
const studyMinutes = computed(() => dailyProgressStore.minutes)
const choiceOptions = computed(() => buildChoiceOptions(
  availableCharacters,
  currentCharacter.value,
  currentIndex.value + modePosition.value,
))
const currentQuestion = computed<StudyQuestion | null>(() => {
  if (!currentCharacter.value) return null
  const isReverseChoice = activeMode.value === 'reference-to-seal-choice'
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

function buildChoiceOptions(
  entries: StudyCharacterEntry[],
  answer: StudyCharacterEntry | undefined,
  seed: number,
): StudyCharacterEntry[] {
  if (!answer) return []
  const choices: StudyCharacterEntry[] = [answer]
  for (let offset = 0; choices.length < 4 && offset < entries.length; offset += 1) {
    const candidate = entries[(seed + offset) % entries.length]
    if (candidate && !choices.some((choice) => choice.id === candidate.id)) choices.push(candidate)
  }
  const shift = choices.length > 0 ? (seed * 3 + 1) % choices.length : 0
  return [...choices.slice(shift), ...choices.slice(0, shift)]
}

let lastActiveAt = Date.now()
let studyTimer: ReturnType<typeof setInterval> | null = null

function touchActive() {
  lastActiveAt = Date.now()
}

function isPageVisible(): boolean {
  if (typeof document === 'undefined') return true
  return document.visibilityState === 'visible'
}

function handleChoiceAnswer(character: string) {
  const current = currentCharacter.value
  if (hasAnswered.value || !current) return
  touchActive()
  selectedAnswer.value = character
  hasAttempted.value = true
  const isAnswerCorrect = character === current.script_forms.simplified
  learningStore.recordModeAttempt(current.id, activeMode.value, isAnswerCorrect)
  if (!isAnswerCorrect) return
  hasAnswered.value = true
  if (learningStore.isCharacterComplete(current.id)) dailyProgressStore.addLearned(current.id)
}

function handleInputAnswer(value: string) {
  touchActive()
  inputAnswer.value = Array.from(value.trim()).slice(0, 1).join('')
  hasAttempted.value = false
}

function submitInputAnswer(value: string) {
  inputAnswer.value = Array.from(value.trim()).slice(0, 1).join('')
  if (!inputAnswer.value || hasAnswered.value) return
  touchActive()
  hasAttempted.value = true
  const expected = currentCharacter.value?.script_forms
  if (!expected) return
  const isAnswerCorrect = inputAnswer.value === expected.simplified || inputAnswer.value === expected.traditional
  learningStore.recordModeAttempt(currentCharacter.value.id, activeMode.value, isAnswerCorrect)
  if (!isAnswerCorrect) return
  hasAnswered.value = true
  if (learningStore.isCharacterComplete(currentCharacter.value.id)) {
    dailyProgressStore.addLearned(currentCharacter.value.id)
  }
}

function resetQuestionState() {
  selectedAnswer.value = null
  inputAnswer.value = ''
  hasAttempted.value = false
  hasAnswered.value = false
}

function handleNext() {
  const current = currentCharacter.value
  if (!isCorrect.value || !current) return
  touchActive()
  const nextMode = learningStore.nextIncompleteMode(current.id)
  if (nextMode) {
    activeMode.value = nextMode
    resetQuestionState()
    return
  }
  const nextIndex = dailyCharacters.value.findIndex((entry, index) => (
    index > currentIndex.value && !learningStore.isCharacterComplete(entry.id)
  ))
  if (nextIndex < 0) {
    dailyProgressStore.setCurrentCharacter(null)
    uni.showModal({
      title: '今日学习完成',
      content: `已完成 ${dailyTarget.value} 个文字的三种练习`,
      showCancel: false,
      success: () => uni.reLaunch({ url: '/pages/index/index' }),
    })
    return
  }
  currentIndex.value = nextIndex
  const nextCharacter = dailyCharacters.value[nextIndex]
  if (nextCharacter) {
    activeMode.value = learningStore.nextIncompleteMode(nextCharacter.id) ?? STUDY_MODES[0]
    dailyProgressStore.setCurrentCharacter(nextCharacter.id)
  }
  resetQuestionState()
}

function openSearch() {
  uni.navigateTo({ url: '/pages/search/index' })
}

function toggleFavorite() {
  const character = currentCharacter.value
  if (!character) return
  learningStore.toggleFavorite(character.id)
  uni.showToast({ title: learningStore.isFavorite(character.id) ? '已收藏' : '已取消收藏', icon: 'none' })
}

function startStudyTimer() {
  if (studyTimer) return
  lastActiveAt = Date.now()
  studyTimer = setInterval(() => {
    if (!isPageVisible()) return
    if (Date.now() - lastActiveAt > IDLE_TIMEOUT_MS) return
    dailyProgressStore.addStudySeconds(1)
  }, 1000)
}

function stopStudyTimer() {
  if (studyTimer) {
    clearInterval(studyTimer)
    studyTimer = null
  }
  dailyProgressStore.persist()
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') touchActive()
  else dailyProgressStore.persist()
}

onMounted(() => {
  uni.pageScrollTo({ scrollTop: 0, duration: 0 })
  startStudyTimer()
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }
})

onBeforeUnmount(() => {
  stopStudyTimer()
  if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', handleVisibilityChange)
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
        <button class="topbar-button" role="button" :disabled="!currentCharacter" :aria-label="currentCharacter && learningStore.isFavorite(currentCharacter.id) ? '取消收藏当前文字' : '收藏当前文字'" @click="toggleFavorite">
          <span class="favorite-icon" aria-hidden="true">{{ currentCharacter && learningStore.isFavorite(currentCharacter.id) ? '★' : '☆' }}</span>
        </button>
      </view>
    </view>

    <view v-if="!isCorrect" class="progress-card" aria-label="今日学习进度">
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
        <text class="progress-value">{{ studyMinutes }}<small>min</small></text>
      </view>
    </view>

    <StudyQuestionCard
      v-if="currentQuestion"
      :key="`${currentQuestion.position}-${currentQuestion.mode}`"
      :question="currentQuestion"
      :selected-answer="selectedAnswer"
      :input-answer="inputAnswer"
      :has-attempted="hasAttempted"
      :is-correct="isCorrect"
      :is-last-mode="isLastMode"
      :is-last-character="isLastCharacter"
      :mode-position="modePosition"
      @answer-choice="handleChoiceAnswer"
      @update:input-answer="handleInputAnswer"
      @submit-input="submitInputAnswer"
      @next="handleNext"
    />
    <view v-else class="empty-study" role="status">
      <text class="empty-study-title">{{ isDayComplete ? '今日学习已完成' : '暂无可学习文字' }}</text>
      <text class="empty-study-description">{{ isDayComplete ? '每个文字都已完成三种学习方式' : '可在文字详情页恢复已斩掉的文字' }}</text>
      <navigator v-if="isDayComplete" class="complete-return" url="/pages/index/index" open-type="reLaunch" hover-class="none">返回首页</navigator>
    </view>
  </view>
</template>

<style scoped lang="scss">
.study-page { width: min(100%, 560px); height: 100vh; height: 100dvh; margin: 0 auto; overflow: hidden; display: flex; flex-direction: column; color: var(--color-text); background: radial-gradient(circle at 90% 0, var(--color-primary-soft) 0, transparent 34%), linear-gradient(180deg, var(--color-topbar) 0, var(--color-page) 48%, var(--color-surface-muted) 100%); }
.study-topbar { min-height: calc(64px + var(--app-top-safe-area)); padding: var(--app-top-safe-area) 14px 4px; display: grid; grid-template-columns: 88px 1fr 88px; align-items: center; }
.topbar-actions { display: flex; justify-content: flex-end; gap: 6px; }
.topbar-button { width: 40px; height: 40px; margin: 0; padding: 0; display: grid; place-items: center; border: 0; background: transparent; color: var(--color-text); line-height: 1; }
.topbar-button::after { border: 0; }
.topbar-button[disabled] { color: var(--color-text-muted); opacity: .5; }
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
.complete-return { min-width: 132px; height: 44px; margin-top: 10px; display: flex; align-items: center; justify-content: center; border-radius: 9px; background: var(--color-primary); color: var(--color-on-primary); font-size: 13px; font-weight: 600; }

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
