<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import FeaturePage from '../../components/FeaturePage.vue'
import { getCharacters } from '../../database/catalog'
import { flushPersistence } from '../../database/persistence'
import { listDueReviews } from '../../review/sources'
import { listMistakes } from '../../review/mistakes'
import { useLevelReviewStore } from '../../stores/levelReview'
import { useFontStore } from '../../stores/fonts'
import { useActivityClock } from '../../learning/useActivityClock'
import { localDateKey } from '../../learning/activity'
import { openFeature, useFeatureAction, useFeatureTask } from '../../features/useFeatureTask'
import type { StudyCharacterEntry } from '../../study/types'

const due = ref(0); const levelDue = ref(0); const mistakes = ref(0)
const schedule = ref<Array<{ characterId: string; dueAt: string; glyph: string }>>([])
const daily = ref<StudyCharacterEntry[]>([])
const revealed = ref(false)
const review = useLevelReviewStore()
const { currentFont, referenceFont } = storeToRefs(useFontStore())
const { busy, actionError, perform } = useFeatureAction()
const current = computed(() => daily.value[0])
const { loading, error, reload } = useFeatureTask(async () => {
  const all = await listDueReviews(); due.value = all.length
  levelDue.value = (await listDueReviews('level')).length
  daily.value = await getCharacters((await listDueReviews('daily')).map((item) => item.characterId))
  const scheduled = (await listDueReviews(undefined, true)).slice(0, 30)
  const characters = await getCharacters(scheduled.map(item => item.characterId))
  schedule.value = scheduled.map(item => ({ ...item, glyph: characters.find(entry => entry.id === item.characterId)?.script_forms.simplified ?? '未收录' }))
  mistakes.value = (await listMistakes({ consolidated: false })).length
  revealed.value = false
})
useActivityClock('review', () => Boolean(current.value) && !loading.value, () => `review:${localDateKey(new Date())}`)
function handleOpen(url: string): void { void perform(() => openFeature(url)) }
function handleAnswer(known: boolean): void { void perform(async () => { if (!current.value) return; review.answer(current.value.id, known); await flushPersistence(); await reload() }) }
</script>

<template>
  <FeaturePage title="复习中心" :loading="loading" :error="error" @retry="reload">
    <div class="feature-hero"><p class="feature-muted">沿用课程间隔 · 按到期顺序</p><h2>{{ due }} 字等待复习</h2><p class="feature-muted">日常与关卡共用每字一份排期，复习一次后所有来源同步。</p></div>
    <div class="feature-actions"><button role="button" class="feature-button" @click="handleOpen('/pages/level-review/index')">关卡复习 · {{ levelDue }}</button><button role="button" class="feature-button secondary" @click="handleOpen('/pages/mistakes/index')">错题本 · {{ mistakes }}</button></div>
    <h2 class="feature-section-title">每日课程到期复习 · {{ daily.length }}</h2>
    <section v-if="current" class="daily-review-card">
      <p class="feature-muted">先辨认，再查看对照字</p><p class="daily-review-glyph" :style="{ fontFamily: currentFont.fontFamily }">{{ current.script_forms.simplified }}</p>
      <button role="button" class="feature-link" @click="revealed = !revealed">{{ revealed ? '收起对照字' : '查看对照字' }}</button>
      <p v-if="revealed" class="daily-review-reference" :style="{ fontFamily: referenceFont.fontFamily }">{{ current.script_forms.simplified }} · {{ current.phonetics.pinyin }}</p>
      <div class="feature-actions"><button role="button" class="feature-button secondary" :disabled="busy" @click="handleAnswer(false)">还不认识</button><button role="button" class="feature-button" :disabled="busy" @click="handleAnswer(true)">已经认识</button></div>
    </section>
    <p v-else class="feature-note">每日课程暂无到期文字。首次正式作答会建立排期，纯预览不会。</p>
    <p v-if="actionError" class="feature-error" role="alert">{{ actionError }}</p>
    <h2 class="feature-section-title">近期排期</h2><p v-if="!schedule.length" class="feature-note">正式学习后，这里会显示真实的下次复习时间。</p>
    <div v-for="item in schedule" :key="item.characterId" class="feature-row"><span>{{ item.glyph }}</span><span class="feature-muted">{{ new Date(item.dueAt).toLocaleString() }}</span></div>
    <button role="button" class="feature-link" @click="handleOpen('/pages/practice-setup/index')">自选范围专项练习 →</button>
  </FeaturePage>
</template>
<style scoped>
.daily-review-card { margin: 16px 0; padding: 20px; border: 1px solid var(--color-border); border-radius: 8px; text-align: center; }
.daily-review-glyph { margin: 18px 0; font-size: 92px; line-height: 1.6; }
.daily-review-reference { font-size: 28px; }
</style>
