<script setup lang="ts">
import { ref } from 'vue'
import FeaturePage from '../../components/FeaturePage.vue'
import { listAssessments } from '../../learning/assessment'
import { readLearningHistory } from '../../learning/history'
import { localDateKey } from '../../learning/activity'
import { openFeature, useFeatureAction, useFeatureTask } from '../../features/useFeatureTask'
import type { AssessmentSession } from '../../learning/assessment'
const assessments = ref<AssessmentSession[]>([]); const learned = ref(0); const coverage = ref<Array<{level:number;total:number;learned:number}>>([])
const { actionError, perform } = useFeatureAction()
const { loading, error, reload } = useFeatureTask(async () => { const today = localDateKey(new Date()); const history = await readLearningHistory({from:today,to:today}); learned.value = history.summary.learnedCount; coverage.value = history.coverage; assessments.value = listAssessments() })
function handleOpen(url: string): void { void perform(() => openFeature(url)) }
</script>
<template>
  <FeaturePage title="我的词汇量" :loading="loading" :error="error" @retry="reload">
    <div class="feature-hero"><p class="feature-muted">正式学习覆盖</p><h2>已学 {{ learned }} 字</h2><p class="feature-note">这是课程完成记录。抽样测评反映本次样本的字体识别情况，不能直接当作总识字量或词汇量。</p></div>
    <div v-for="item in coverage" :key="item.level" class="feature-row"><span class="feature-row-copy">第 {{ item.level }} 级</span><strong>{{ item.learned }} / {{ item.total }} 字</strong></div>
    <button role="button" class="feature-button" @click="handleOpen('/pages/assessment-setup/index')">开始识字测评</button>
    <h2 class="feature-section-title">本机测评记录</h2><p v-if="!assessments.length" class="feature-note">还没有测评记录。每次固定抽取 30 字，不足时使用全部可用文字。</p>
    <button v-for="session in assessments" :key="session.id" role="button" class="feature-row" @click="handleOpen(`/pages/${session.completedAt ? 'assessment-result' : 'assessment-session'}/index?id=${encodeURIComponent(session.id)}`)"><span class="feature-row-copy"><strong>第 {{ session.level }} 级测评</strong><p class="feature-muted">{{ new Date(session.createdAt).toLocaleString() }}</p></span><span>{{ session.completedAt ? '查看报告' : '继续测评' }} →</span></button>
    <p v-if="actionError" class="feature-error" role="alert">{{ actionError }}</p>
  </FeaturePage>
</template>
