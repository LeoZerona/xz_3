<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import FeaturePage from '../../components/FeaturePage.vue'
import CharacterRows from '../../collections/CharacterRows.vue'
import { getCharacters } from '../../database/catalog'
import { listMistakes, markMistakePending } from '../../review/mistakes'
import { getStudyModeLabel, STUDY_MODES } from '../../study/modes'
import { createPractice } from '../../practice/repository'
import { openFeature, useFeatureAction, useFeatureTask } from '../../features/useFeatureTask'
import type { MistakeItem } from '../../review/mistakes'
import type { StudyCharacterEntry } from '../../study/types'
import type { StudyMode } from '../../study/modes'
const id = ref(''); const items = ref<MistakeItem[]>([]); const characters = ref<StudyCharacterEntry[]>([])
const { busy, actionError, perform } = useFeatureAction()
onLoad(options => { id.value = typeof options?.id === 'string' ? options.id : '' })
const { loading, error, reload } = useFeatureTask(async () => { items.value = await listMistakes({ characterId: id.value }); characters.value = await getCharacters([id.value]) })
function handleDetail(): void { void perform(() => openFeature(`/pages/character-detail/index?id=${encodeURIComponent(id.value)}`)) }
function handleReset(mode: StudyMode | null): void { void perform(async () => { await markMistakePending(id.value, mode); await reload() }) }
function handlePractice(): void { void perform(async () => { const modes = items.value.flatMap(item => item.mode ? [item.mode] : []); const next = await createPractice({ name: '单字错题巩固', source: 'mistakes', characterIds: [id.value], modes: modes.length ? modes : [...STUDY_MODES], count: 1 }); await openFeature(`/pages/practice-session/index?id=${encodeURIComponent(next)}`) }) }
</script>
<template>
  <FeaturePage title="错误与巩固记录" back-url="/pages/mistakes/index" :loading="loading" :error="error" @retry="reload">
    <CharacterRows :entries="characters" @item-click="handleDetail" />
    <section v-for="item in items" :key="item.mode ?? 'review'"><h2 class="feature-section-title">{{ item.mode ? getStudyModeLabel(item.mode) : '认识判断' }}</h2><p class="feature-muted">错误 {{ item.mistakes }} 次 · {{ item.consolidated ? '已巩固' : '待巩固' }}</p><p v-if="item.legacyMistakes" class="feature-note">历史累计 {{ item.legacyMistakes }} 次，没有逐题时间记录。</p><div v-for="event in item.events.slice(-50).reverse()" :key="event.id" class="feature-row"><span>{{ event.correct ? '回答正确' : '回答错误' }}</span><span class="feature-row-copy feature-muted">{{ event.source }} · {{ new Date(event.at).toLocaleString() }}</span></div><p v-if="item.events.length > 50" class="feature-muted">显示最近 50 次作答，累计统计包含全部记录。</p><button v-if="item.consolidated" role="button" class="feature-link" :disabled="busy" @click="handleReset(item.mode)">恢复为待巩固</button></section>
    <p v-if="!items.length" class="feature-note">这个字还没有错误记录。</p><p v-if="actionError" class="feature-error" role="alert">{{ actionError }}</p>
    <template #footer><button role="button" class="feature-button" :disabled="busy || !characters.length" @click="handlePractice">开始单字巩固</button></template>
  </FeaturePage>
</template>
