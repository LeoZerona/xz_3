<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import FeaturePage from '../../components/FeaturePage.vue'
import StudyQuestionCard from '../study/components/StudyQuestionCard.vue'
import { getCharacters } from '../../database/catalog'
import { advancePractice, answerPractice, readPractice } from '../../practice/repository'
import { useFontStore } from '../../stores/fonts'
import { useActivityClock } from '../../learning/useActivityClock'
import { openFeature, useFeatureAction, useFeatureTask } from '../../features/useFeatureTask'
import { readFeatureId } from '../../features/routeParams'
import type { PracticeSession } from '../../practice/types'
import type { StudyCharacterEntry } from '../../study/types'

const id = ref('')
const session = ref<PracticeSession>()
const characters = ref<StudyCharacterEntry[]>([])
const input = ref('')
const selected = ref<string | null>(null)
const { currentFont, referenceFont } = storeToRefs(useFontStore())
const { busy, actionError, perform } = useFeatureAction()
onLoad((options) => { id.value = readFeatureId(options?.id) })
const { loading, error, reload } = useFeatureTask(async () => {
  session.value = await readPractice(id.value)
  if (session.value.status === 'completed') { await openFeature(`/pages/practice-result/index?id=${encodeURIComponent(id.value)}`, true); return }
  const ids = [...new Set(session.value.questions.flatMap((question) => [question.characterId, ...question.optionIds]))]
  characters.value = await getCharacters(ids)
}, { refreshOnShow: false, backUrl: '/pages/practice-setup/index' })
const task = computed(() => session.value?.questions[session.value.cursor])
const question = computed(() => {
  const current = task.value
  const character = characters.value.find((entry) => entry.id === current?.characterId)
  if (!current || !character) return null
  return { mode: current.mode, position: current.position, character,
    options: current.optionIds.flatMap((option) => characters.value.filter((entry) => entry.id === option)),
    promptFont: current.mode === 'reference-to-seal-choice' ? referenceFont.value : currentFont.value,
    answerFont: current.mode === 'reference-to-seal-choice' ? currentFont.value : referenceFont.value,
    learningFont: currentFont.value, referenceFont: referenceFont.value }
})
const completed = computed(() => session.value?.questions.filter((entry) => entry.completedAt).length ?? 0)
useActivityClock('practice', () => Boolean(session.value && session.value.status === 'active' && !loading.value), () => id.value)
function handleAnswer(value: string): void {
  const current = task.value
  if (!current || current.completedAt) return
  void perform(async () => { session.value = await answerPractice(id.value, current.id, value); selected.value = value })
}
function handleNext(): void {
  void perform(async () => {
    session.value = await advancePractice(id.value); input.value = ''; selected.value = null
    if (session.value.status === 'completed') await openFeature(`/pages/practice-result/index?id=${encodeURIComponent(id.value)}`, true)
  })
}
</script>

<template>
  <FeaturePage title="独立练习" back-url="/pages/practice-setup/index" :loading="loading" :error="error" @retry="reload">
    <div v-if="session" class="feature-row"><span>{{ session.name }}</span><strong>{{ completed }} / {{ session.questions.length }} 题</strong></div>
    <p class="feature-muted">进度自动保存在本机，返回后可继续。</p>
    <p v-if="actionError" class="feature-error" role="alert">{{ actionError }}</p>
    <div class="practice-card-host"><StudyQuestionCard v-if="question && task && session" :key="task.id" :question="question" :selected-answer="selected" :input-answer="input" :has-attempted="task.attempts > 0" :is-correct="Boolean(task.completedAt)" :is-last-mode="true" :is-last-character="completed === session.questions.length" :is-correct-animating="busy" :mode-position="session.modes.indexOf(task.mode) + 1" completion-label="查看练习结果" @answer-choice="handleAnswer" @submit-input="handleAnswer" @update:input-answer="input = $event" @next="handleNext" /></div>
  </FeaturePage>
</template>

<style scoped>
.practice-card-host { min-height: 560px; display: flex; flex-direction: column; padding-bottom: 12px; }
</style>
