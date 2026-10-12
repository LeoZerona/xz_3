import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  normalizeProgress,
  progressStorageKey,
  studyMinutes,
  todayKey,
} from '../study/dailyProgress'

export const useDailyProgressStore = defineStore('dailyProgress', () => {
  const dateKey = ref(todayKey())
  const learnedIds = ref<string[]>([])
  const reviewedCount = ref(0)
  const studySeconds = ref(0)

  const learnedCount = computed(() => learnedIds.value.length)
  const minutes = computed(() => studyMinutes(studySeconds.value))

  function hydrate() {
    const key = todayKey()
    dateKey.value = key
    try {
      const raw = uni.getStorageSync(progressStorageKey(key)) as unknown
      const normalized = normalizeProgress(raw, key)
      learnedIds.value = normalized.learnedIds
      reviewedCount.value = normalized.reviewedCount
      studySeconds.value = normalized.studySeconds
    } catch {
      learnedIds.value = []
      reviewedCount.value = 0
      studySeconds.value = 0
    }
  }

  function persist() {
    const key = dateKey.value
    // 跨天时以当前日期为准，避免写到旧 key。
    const currentKey = todayKey()
    const targetKey = currentKey !== key ? currentKey : key
    if (currentKey !== key) dateKey.value = currentKey
    try {
      uni.setStorageSync(progressStorageKey(targetKey), {
        dateKey: targetKey,
        learnedIds: [...learnedIds.value],
        reviewedCount: reviewedCount.value,
        studySeconds: studySeconds.value,
      })
    } catch {
      // 存储不可用时仍保留内存中的进度。
    }
  }

  function addLearned(characterId: string) {
    if (!characterId || learnedIds.value.includes(characterId)) return
    // 若跨天，先以新日期为准再记录。
    if (todayKey() !== dateKey.value) hydrate()
    learnedIds.value = [...learnedIds.value, characterId]
    persist()
  }

  function addStudySeconds(seconds: number) {
    if (!Number.isFinite(seconds) || seconds <= 0) return
    if (todayKey() !== dateKey.value) hydrate()
    studySeconds.value += Math.trunc(seconds)
    persist()
  }

  function setStudySeconds(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) return
    studySeconds.value = Math.trunc(seconds)
    persist()
  }

  return {
    dateKey,
    learnedIds,
    reviewedCount,
    studySeconds,
    learnedCount,
    minutes,
    hydrate,
    persist,
    addLearned,
    addStudySeconds,
    setStudySeconds,
  }
})
