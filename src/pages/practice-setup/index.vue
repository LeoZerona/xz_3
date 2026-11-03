<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import FeaturePage from '../../components/FeaturePage.vue'
import FeatureTextField from '../../components/FeatureTextField.vue'
import { getDatabase } from '../../database/connection'
import { findCharactersByText } from '../../database/catalog'
import { readCollection } from '../../collections/repository'
import { parseCollectionText } from '../../collections/model'
import { createPractice, listPractices } from '../../practice/repository'
import { getEffectiveStudyModes, STUDY_MODES, STUDY_MODE_LABELS } from '../../study/modes'
import { openFeature, useFeatureAction, useFeatureTask } from '../../features/useFeatureTask'
import type { StudyMode } from '../../study/modes'
import type { PracticeSession, PracticeSource } from '../../practice/types'

const source = ref<PracticeSource>('favorites')
const sourceId = ref('')
const name = ref('收藏字练习')
const characterIds = ref<string[]>([])
const modes = ref<StudyMode[]>(getEffectiveStudyModes())
const count = ref('20')
const text = ref('')
const history = ref<PracticeSession[]>([])
const { busy, actionError, perform } = useFeatureAction()
onLoad((options) => {
  const allowed: PracticeSource[] = ['favorites', 'slashed', 'collection', 'mistakes', 'custom']
  if (typeof options?.source === 'string' && allowed.includes(options.source as PracticeSource)) source.value = options.source as PracticeSource
  sourceId.value = typeof options?.id === 'string' ? options.id : ''
})
const labels: Record<PracticeSource, string> = { favorites: '收藏字', slashed: '已斩文字', collection: '自定义字单', mistakes: '错题文字', custom: '输入汉字' }
const active = computed(() => history.value.filter((session) => session.status === 'active'))
const { loading, error, reload } = useFeatureTask(async () => {
  const db = await getDatabase()
  if (source.value === 'collection') { const collection = await readCollection(sourceId.value); name.value = collection.name; characterIds.value = collection.characterIds }
  else if (source.value === 'favorites' || source.value === 'slashed') {
    characterIds.value = (await db.query('character_progress', { where: source.value === 'favorites' ? { favorite: 1 } : { excluded: 1 } })).map((row) => row.id)
    name.value = `${labels[source.value]}练习`
  } else if (source.value === 'mistakes') {
    characterIds.value = [...new Set((await db.query('activity_events', { where: { kind: 'answer', correct: 0 } })).flatMap((row) => row.characterId ? [String(row.characterId)] : []))]
    name.value = '错题专项'
  } else name.value = '自选汉字练习'
  history.value = await listPractices()
})
function toggleMode(mode: StudyMode): void { modes.value = modes.value.includes(mode) ? modes.value.filter((entry) => entry !== mode) : [...modes.value, mode] }
function handleOpen(id: string, completed = false): void { void perform(() => openFeature(`/pages/practice-${completed ? 'result' : 'session'}/index?id=${encodeURIComponent(id)}`)) }
function handleStart(): void {
  void perform(async () => {
    let ids = characterIds.value
    if (source.value === 'custom') {
      const parsed = parseCollectionText(text.value)
      if (parsed.invalid.length) throw new Error('请只输入汉字，用空格或逗号分隔')
      const found = await findCharactersByText(parsed.characters)
      if (found.missing.length) throw new Error(`未收录：${found.missing.join('、')}，请移除后重试`)
      ids = found.entries.map((entry) => entry.id)
    }
    const id = await createPractice({ name: name.value, source: source.value, sourceId: sourceId.value || undefined, characterIds: ids, modes: modes.value, count: Number(count.value) })
    await openFeature(`/pages/practice-session/index?id=${encodeURIComponent(id)}`)
  })
}
</script>

<template>
  <FeaturePage title="专项练习" :loading="loading" :error="error" @retry="reload">
    <p class="feature-kicker">独立练习 · 随时继续</p><h2>{{ name }}</h2>
    <p class="feature-note">练习单独记录。不会更改正式课程已学状态、每日任务或复习排期。</p>
    <nav v-if="source !== 'collection'" class="feature-tabs" aria-label="练习来源"><button v-for="item in (['favorites', 'slashed', 'mistakes', 'custom'] as const)" :key="item" role="tab" class="feature-tab" :class="{ active: source === item }" :aria-selected="source === item" @click="source = item; reload()">{{ labels[item] }}</button></nav>
    <FeatureTextField v-if="source === 'custom'" v-model="text" label="练习汉字" multiline placeholder="例如：未末己已巳" />
    <p v-else class="feature-muted">当前范围 {{ characterIds.length }} 字 · 每字完成所选题型</p>
    <h2 class="feature-section-title">练习方式</h2>
    <div class="feature-list"><button v-for="mode in STUDY_MODES" :key="mode" role="checkbox" :aria-checked="modes.includes(mode)" class="feature-row" @click="toggleMode(mode)"><span>{{ STUDY_MODE_LABELS[mode] }}</span><span>{{ modes.includes(mode) ? '已选' : '未选' }}</span></button></div>
    <FeatureTextField v-model="count" label="本次练习字数（1–200）" type="number" />
    <p class="feature-muted">不足设定字数时练习全部可用文字，开始后固定题单和题型。</p>
    <p v-if="actionError" class="feature-error" role="alert">{{ actionError }}</p>
    <h2 class="feature-section-title">继续练习 · {{ active.length }}</h2>
    <p v-if="!active.length" class="feature-note">还没有未完成的练习。</p>
    <button v-for="session in active" :key="session.id" role="button" class="feature-row" @click="handleOpen(session.id)"><span>{{ session.name }}</span><span>{{ session.questions.filter(q => q.completedAt).length }} / {{ session.questions.length }} 题 →</span></button>
    <h2 class="feature-section-title">最近结果</h2>
    <button v-for="session in history.filter(item => item.status === 'completed')" :key="session.id" role="button" class="feature-row" @click="handleOpen(session.id, true)"><span>{{ session.name }}</span><span>{{ session.completedAt?.slice(0, 10) }} →</span></button>
    <template #footer><button role="button" class="feature-button" :disabled="busy || !modes.length || (source !== 'custom' && !characterIds.length)" @click="handleStart">开始独立练习</button></template>
  </FeaturePage>
</template>
