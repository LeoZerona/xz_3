<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import FeaturePage from '../../components/FeaturePage.vue'
import FeatureTextField from '../../components/FeatureTextField.vue'
import { getCharacters } from '../../database/catalog'
import { listMistakes } from '../../review/mistakes'
import { matchesCharacterQuery } from '../../collections/model'
import { getStudyModeLabel, STUDY_MODES } from '../../study/modes'
import { createPractice } from '../../practice/repository'
import { openFeature, useFeatureAction, useFeatureTask } from '../../features/useFeatureTask'
import type { MistakeItem } from '../../review/mistakes'
import type { StudyCharacterEntry } from '../../study/types'

const items = ref<MistakeItem[]>([]); const characters = ref<StudyCharacterEntry[]>([])
const query = ref(''); const status = ref('pending'); const source = ref(''); const mode = ref(''); const pageSize = ref(50)
const { busy, actionError, perform } = useFeatureAction()
const { loading, error, reload } = useFeatureTask(async () => { items.value = await listMistakes({}); characters.value = await getCharacters([...new Set(items.value.map(item => item.characterId))]) })
const filtered = computed(() => items.value.filter(item => {
  const character = characters.value.find(entry => entry.id === item.characterId)
  return character && matchesCharacterQuery(character, query.value) && (status.value === 'all' || item.consolidated === (status.value === 'done')) && (!source.value || item.sources.includes(source.value)) && (!mode.value || item.mode === mode.value)
}))
const visible = computed(() => filtered.value.slice(0, pageSize.value).map(item => ({ ...item, glyph: characters.value.find(entry => entry.id === item.characterId)?.script_forms.simplified ?? '' })))
watch([query, status, source, mode], () => { pageSize.value = 50 })
function handleDetail(id: string): void { void perform(() => openFeature(`/pages/mistake-detail/index?id=${encodeURIComponent(id)}`)) }
function handlePractice(): void { void perform(async () => {
  const modes = [...new Set(filtered.value.flatMap(item => item.mode ? [item.mode] : []))]
  const id = await createPractice({ name: '错题巩固', source: 'mistakes', characterIds: [...new Set(filtered.value.map(item => item.characterId))], modes: modes.length ? modes : [...STUDY_MODES], count: 50 })
  await openFeature(`/pages/practice-session/index?id=${encodeURIComponent(id)}`)
}) }
</script>
<template>
  <FeaturePage title="错题本" back-url="/pages/review-center/index" :loading="loading" :error="error" @retry="reload">
    <FeatureTextField v-model="query" label="搜索错题汉字或拼音" hide-label />
    <div class="feature-filter-line"><select v-model="status" aria-label="巩固状态"><option value="pending">待巩固</option><option value="done">已巩固</option><option value="all">全部</option></select><select v-model="source" aria-label="错误来源"><option value="">全部来源</option><option value="daily">日常</option><option value="level">关卡</option><option value="practice">专项</option><option value="review">正式复习</option><option value="legacy">历史累计</option></select><select v-model="mode" aria-label="错误题型"><option value="">全部题型</option><option v-for="item in STUDY_MODES" :key="item" :value="item">{{ getStudyModeLabel(item) }}</option></select></div>
    <p class="feature-muted">{{ filtered.length }} 组 · 同一文字、同一题型连续两次独立正确作答后标记为已巩固。</p>
    <button v-for="item in visible" :key="`${item.characterId}:${item.mode}`" role="button" class="feature-row" @click="handleDetail(item.characterId)"><strong class="feature-glyph">{{ item.glyph }}</strong><span class="feature-row-copy"><strong>{{ item.mode ? getStudyModeLabel(item.mode) : '认识判断' }}</strong><p class="feature-muted">错误 {{ item.mistakes }} 次 · {{ item.consolidated ? '已巩固' : '待巩固' }}{{ item.legacyMistakes ? ' · 含历史累计' : '' }}</p></span><span>→</span></button>
    <p v-if="!visible.length" class="feature-note">当前筛选没有错题。真实作答中的错误会保留在这里。</p>
    <button v-if="visible.length < filtered.length" role="button" class="feature-link" @click="pageSize += 50">加载更多</button>
    <p v-if="actionError" class="feature-error" role="alert">{{ actionError }}</p>
    <template #footer><button role="button" class="feature-button" :disabled="busy || !filtered.length" @click="handlePractice">练习当前筛选的文字</button></template>
  </FeaturePage>
</template>
