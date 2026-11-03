<script setup lang="ts">
import { ref } from 'vue'
import FeaturePage from '../../components/FeaturePage.vue'
import FeatureTextField from '../../components/FeatureTextField.vue'
import { readLearningSettings, pendingLearningSettings, saveLearningSettings } from '../../learning/settings'
import { openFeature, useFeatureAction, useFeatureTask } from '../../features/useFeatureTask'
import type { LearningCourse } from '../../learning/settings'
const course = ref<LearningCourse>('level1'); const reviewTarget = ref('20'); const message = ref('')
const { busy, actionError, perform } = useFeatureAction()
const { loading, error, reload } = useFeatureTask(async () => { const current = pendingLearningSettings()?.values ?? readLearningSettings(); course.value = current.course; reviewTarget.value = String(current.reviewTarget) }, { refreshOnShow: false })
const courses: Array<{id: LearningCourse; name: string; note: string}> = [{id:'level1',name:'一级常用字',note:'3500 字 · 从常用文字开始'},{id:'level2',name:'二级通用字',note:'3000 字 · 扩展识字范围'},{id:'level3',name:'三级通用字',note:'1605 字 · 进阶识别'},{id:'daily',name:'原每日课程',note:'保留历史 204 字课程'}]
function handleSave(): void { void perform(async () => { await saveLearningSettings({ course: course.value, reviewTarget: Number(reviewTarget.value) }); message.value = '已保存，将于明天零点生效。今日任务与题型保持原样。' }) }
function handlePlan(): void { void perform(() => openFeature('/pages/plan/index')) }
</script>
<template>
  <FeaturePage title="学习设置" :loading="loading" :error="error" @retry="reload">
    <h2>每日课程范围</h2><p class="feature-note">课程与复习目标在次日生效。正在进行的任务保留原文字和题型，正式已学记录不会回退。</p>
    <button v-for="item in courses" :key="item.id" role="radio" :aria-checked="course === item.id" class="feature-row" @click="course = item.id"><span class="feature-row-copy"><strong>{{ item.name }}</strong><p class="feature-muted">{{ item.note }}</p></span><span>{{ course === item.id ? '已选' : '选择' }}</span></button>
    <FeatureTextField v-model="reviewTarget" label="每日复习目标（1–500 次）" type="number" />
    <button role="button" class="feature-link" @click="handlePlan">设置每日新学量、字体和必修方式 →</button>
    <p v-if="message" class="feature-note" role="status">{{ message }}</p><p v-if="actionError" class="feature-error" role="alert">{{ actionError }}</p>
    <template #footer><button role="button" class="feature-button" :disabled="busy" @click="handleSave">保存学习设置</button></template>
  </FeaturePage>
</template>
