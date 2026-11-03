<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import FeaturePage from '../../components/FeaturePage.vue'
import CharacterRows from '../../collections/CharacterRows.vue'
import { getCharacters } from '../../database/catalog'
import { saveCollection } from '../../collections/repository'
import { readActivities } from '../../learning/activity'
import { createPractice, readPractice } from '../../practice/repository'
import { practiceResult } from '../../practice/questions'
import { openFeature, useFeatureAction, useFeatureTask } from '../../features/useFeatureTask'
import type { PracticeSession } from '../../practice/types'
import type { StudyCharacterEntry } from '../../study/types'

const id = ref('')
const session = ref<PracticeSession>()
const mistakes = ref<StudyCharacterEntry[]>([])
const seconds = ref(0)
const savedCollection = ref('')
const { busy, actionError, perform } = useFeatureAction()
onLoad((options) => { id.value = typeof options?.id === 'string' ? options.id : '' })
const result = computed(() => practiceResult(session.value?.questions ?? []))
const { loading, error, reload } = useFeatureTask(async () => {
  session.value = await readPractice(id.value)
  mistakes.value = await getCharacters(result.value.mistakeIds)
  seconds.value = (await readActivities({ sessionId: id.value })).reduce((sum, event) => sum + event.seconds, 0)
})
function handleOpen(url: string): void { void perform(() => openFeature(url)) }
function handleRepeat(): void {
  void perform(async () => {
    if (!session.value) return
    const next = await createPractice({ name: session.value.name, source: session.value.source, sourceId: session.value.sourceId ?? undefined,
      characterIds: [...new Set(session.value.questions.map((question) => question.characterId))], modes: session.value.modes, count: 200 })
    await openFeature(`/pages/practice-session/index?id=${encodeURIComponent(next)}`, true)
  })
}
function handleCollect(): void { void perform(async () => { savedCollection.value = await saveCollection({ name: '专项练习易错字', characterIds: result.value.mistakeIds }); await openFeature(`/pages/collection-detail/index?id=${encodeURIComponent(savedCollection.value)}`) }) }
</script>

<template>
  <FeaturePage title="练习结果" back-url="/pages/practice-setup/index" :loading="loading" :error="error" @retry="reload">
    <p class="feature-kicker">{{ session?.status === 'completed' ? '本次练习已完成' : '练习进行中' }}</p><h2>{{ session?.name }}</h2>
    <div class="feature-stats"><div><strong>{{ result.completed }}/{{ result.total }}</strong><span>完成题数</span></div><div><strong>{{ result.firstAccuracy }}%</strong><span>已作答题的首答正确率</span></div><div><strong>{{ Math.floor(seconds / 60) }}分{{ seconds % 60 }}秒</strong><span>有效练习时长</span></div></div>
    <p class="feature-note">专项记录独立保存。首答正确率按每道题第一次回答计算；本次共作答 {{ result.attempts }} 次。</p>
    <h2 class="feature-section-title">需要巩固 · {{ mistakes.length }} 字</h2>
    <CharacterRows :entries="mistakes" @item-click="handleOpen(`/pages/character-detail/index?id=${encodeURIComponent($event)}`)" />
    <p v-if="!mistakes.length" class="feature-note">本次暂未出现错题。</p>
    <button v-if="mistakes.length && !savedCollection" role="button" class="feature-button secondary" :disabled="busy" @click="handleCollect">把易错字保存为字单</button>
    <p v-if="actionError" class="feature-error" role="alert">{{ actionError }}</p>
    <button v-if="session?.status === 'active'" role="button" class="feature-button" @click="handleOpen(`/pages/practice-session/index?id=${encodeURIComponent(id)}`)">继续这份练习</button>
    <button role="button" class="feature-button secondary" :disabled="busy" @click="handleRepeat">重新练习同一范围</button>
    <template #footer><button role="button" class="feature-button" @click="handleOpen('/pages/practice-setup/index')">返回专项练习</button></template>
  </FeaturePage>
</template>
