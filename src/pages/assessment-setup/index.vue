<script setup lang="ts">
import { ref } from 'vue'
import FeaturePage from '../../components/FeaturePage.vue'
import { getDatabase } from '../../database/connection'
import { startAssessment } from '../../learning/assessment'
import { openFeature, useFeatureAction, useFeatureTask } from '../../features/useFeatureTask'
const level = ref(1); const counts = ref<Record<number,number>>({})
const { busy, actionError, perform } = useFeatureAction()
const { loading, error, reload } = useFeatureTask(async () => { const rows = await (await getDatabase()).query('characters'); counts.value = Object.fromEntries([1,2,3].map(value => [value,rows.filter(row => row.level === value).length])) })
function handleStart(): void { void perform(async () => { const id = await startAssessment({level:level.value}); await openFeature(`/pages/assessment-session/index?id=${encodeURIComponent(id)}`) }) }
</script>
<template>
  <FeaturePage title="识字测评说明" back-url="/pages/literacy/index" :loading="loading" :error="error" @retry="reload">
    <div class="feature-hero"><h2>辨认当前学习字体</h2><p class="feature-muted">随机抽样 · 只记录首次作答 · 可中断继续</p></div>
    <p class="feature-note">从所选级别随机抽取 30 个不同文字。使用当前学习字体与对照字体，每题只计首答；结束后查看样本正确率和未识别文字。测评不会改动正式学习、复习排期或每日新学统计。</p>
    <h2 class="feature-section-title">选择测评范围</h2><button v-for="value in [1,2,3]" :key="value" role="radio" class="feature-row" :aria-checked="level===value" :disabled="!counts[value]" @click="level=value"><span class="feature-row-copy">第 {{ value }} 级 · {{ counts[value] ?? 0 }} 字可用</span><span>{{ level===value ? '已选' : '选择' }}</span></button>
    <p class="feature-muted">结果仅针对本次样本与字体，不推算全部识字量。</p><p v-if="actionError" class="feature-error" role="alert">{{ actionError }}</p>
    <template #footer><button role="button" class="feature-button" :disabled="busy || !counts[level]" @click="handleStart">开始 30 字抽样测评</button></template>
  </FeaturePage>
</template>
