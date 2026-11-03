<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import FeaturePage from '../../components/FeaturePage.vue'
import StudyQuestionCard from '../study/components/StudyQuestionCard.vue'
import { getCharacters } from '../../database/catalog'
import { advanceAssessment, answerAssessment, readAssessment } from '../../learning/assessment'
import { useFontStore } from '../../stores/fonts'
import { openFeature, useFeatureAction, useFeatureTask } from '../../features/useFeatureTask'
import type { AssessmentSession } from '../../learning/assessment'
import type { StudyCharacterEntry } from '../../study/types'
const id = ref(''); const session = ref<AssessmentSession>(); const characters = ref<StudyCharacterEntry[]>([])
const { currentFont, referenceFont } = storeToRefs(useFontStore())
const { busy, actionError, perform } = useFeatureAction()
onLoad(options => { id.value = typeof options?.id === 'string' ? options.id : '' })
const { loading, error, reload } = useFeatureTask(async () => { session.value = readAssessment(id.value); if(session.value.completedAt) { await openFeature(`/pages/assessment-result/index?id=${encodeURIComponent(id.value)}`, true); return }; characters.value = await getCharacters([...new Set(session.value.questions.flatMap(question => [question.characterId,...question.optionIds]))]) }, {refreshOnShow:false,backUrl:'/pages/literacy/index'})
const task = computed(() => session.value?.questions[session.value.cursor])
const question = computed(() => { const current = task.value; const character = characters.value.find(item => item.id === current?.characterId); return current && character ? { mode:'seal-to-reference-choice' as const,position:session.value?.cursor ?? 0,character,options:current.optionIds.flatMap(option => characters.value.filter(item => item.id===option)),promptFont:currentFont.value,answerFont:referenceFont.value,learningFont:currentFont.value,referenceFont:referenceFont.value } : null })
function handleAnswer(value:string):void { const current=task.value;if(!current)return;void perform(async()=>{session.value=await answerAssessment(id.value,current.id,value)}) }
function handleNext():void { void perform(async()=>{session.value=await advanceAssessment(id.value);if(session.value.completedAt)await openFeature(`/pages/assessment-result/index?id=${encodeURIComponent(id.value)}`,true)}) }
</script>
<template>
  <FeaturePage title="识字测评" back-url="/pages/literacy/index" :loading="loading" :error="error" @retry="reload">
    <p class="feature-muted">第 {{ (session?.cursor ?? 0)+1 }} / {{ session?.questions.length }} 题 · 本题只记录首答</p><p v-if="task?.answer !== null && task?.answer !== undefined" class="feature-note" role="status">本题首答{{ task.correct ? '正确' : '未识别' }}，已保存。查看文字后继续。</p>
    <p v-if="actionError" class="feature-error" role="alert">{{ actionError }}</p>
    <div class="assessment-host"><StudyQuestionCard v-if="question && task && session" :key="task.id" :question="question" :selected-answer="task.answer" input-answer="" :has-attempted="task.answer!==null" :is-correct="task.correct===true" :force-detail="task.answer!==null" :is-correct-animating="busy" :is-last-mode="true" :is-last-character="session.cursor===session.questions.length-1" :mode-position="1" completion-label="查看测评报告" @answer-choice="handleAnswer" @next="handleNext" /></div>
  </FeaturePage>
</template>
<style scoped>.assessment-host { min-height: 560px; display: flex; flex-direction: column; }</style>
