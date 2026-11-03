<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import FeaturePage from '../../components/FeaturePage.vue'
import CharacterRows from '../../collections/CharacterRows.vue'
import { getCharacters } from '../../database/catalog'
import { readAssessment } from '../../learning/assessment'
import { saveCollection } from '../../collections/repository'
import { openFeature, useFeatureAction, useFeatureTask } from '../../features/useFeatureTask'
import type { AssessmentSession } from '../../learning/assessment'
import type { StudyCharacterEntry } from '../../study/types'
const id=ref('');const session=ref<AssessmentSession>();const mistakes=ref<StudyCharacterEntry[]>([]);const saved=ref(false)
const answered=computed(()=>session.value?.questions.filter(question=>question.answer!==null)??[])
const correct=computed(()=>answered.value.filter(question=>question.correct).length)
const {busy,actionError,perform}=useFeatureAction()
onLoad(options=>{id.value=typeof options?.id==='string'?options.id:''})
const {loading,error,reload}=useFeatureTask(async()=>{session.value=readAssessment(id.value);mistakes.value=await getCharacters(session.value.questions.filter(question=>question.correct===false).map(question=>question.characterId))})
function handleOpen(url:string):void {void perform(()=>openFeature(url))}
function handleCollect():void {void perform(async()=>{const collectionId=await saveCollection({name:'测评待加强文字',characterIds:mistakes.value.map(item=>item.id)});saved.value=true;await openFeature(`/pages/collection-detail/index?id=${encodeURIComponent(collectionId)}`)})}
</script>
<template>
  <FeaturePage title="测评报告" back-url="/pages/literacy/index" :loading="loading" :error="error" @retry="reload">
    <div class="feature-hero"><p class="feature-muted">第 {{ session?.level }} 级 · {{ session?.completedAt ? '本次测评已完成' : '测评尚未完成' }}</p><h2>{{ correct }} / {{ answered.length }} 题首答正确</h2><p class="feature-note">本次样本共 {{ session?.questions.length }} 字，已作答 {{ answered.length }} 题。样本正确率 {{ answered.length ? Math.round(correct/answered.length*100) : 0 }}%，仅代表本次字体识别表现，不推算总词汇量。</p></div>
    <h2 class="feature-section-title">本次未识别 · {{ mistakes.length }} 字</h2><CharacterRows :entries="mistakes" @item-click="handleOpen(`/pages/character-detail/index?id=${encodeURIComponent($event)}`)" /><p v-if="!mistakes.length" class="feature-note">已作答题目中暂未出现错误。</p>
    <button v-if="mistakes.length&&!saved" role="button" class="feature-button secondary" :disabled="busy" @click="handleCollect">保存待加强字单</button>
    <button v-if="session&&!session.completedAt" role="button" class="feature-link" @click="handleOpen(`/pages/assessment-session/index?id=${encodeURIComponent(id)}`)">继续未完成的测评 →</button><p v-if="actionError" class="feature-error" role="alert">{{ actionError }}</p>
    <template #footer><button role="button" class="feature-button" @click="handleOpen('/pages/literacy/index')">返回测评档案</button></template>
  </FeaturePage>
</template>
