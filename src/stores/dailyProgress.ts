import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  normalizeProgress,
  progressStorageKey,
  studyMinutes,
  todayKey,
  buildDailyAssignment,
} from '../study/dailyProgress'

export const useDailyProgressStore = defineStore('dailyProgress', () => {
  const dateKey = ref(todayKey())
  const assignedIds = ref<string[]>([])
  const learnedIds = ref<string[]>([])
  const currentCharacterId = ref<string | null>(null)
  const reviewedCount = ref(0)
  const studySeconds = ref(0)
  const startedAt = ref<string | null>(null)
  const completedAt = ref<string | null>(null)

  const learnedCount = computed(() => learnedIds.value.length)
  const minutes = computed(() => studyMinutes(studySeconds.value))

  function hydrate() {
    const key = todayKey()
    dateKey.value = key
    try {
      const raw = uni.getStorageSync(progressStorageKey(key)) as unknown
      const normalized = normalizeProgress(raw, key)
      assignedIds.value = normalized.assignedIds
      learnedIds.value = normalized.learnedIds
      currentCharacterId.value = normalized.currentCharacterId
      reviewedCount.value = normalized.reviewedCount
      studySeconds.value = normalized.studySeconds
      startedAt.value = normalized.startedAt
      completedAt.value = normalized.completedAt
    } catch {
      assignedIds.value = []
      learnedIds.value = []
      currentCharacterId.value = null
      reviewedCount.value = 0
      studySeconds.value = 0
      startedAt.value = null
      completedAt.value = null
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
        assignedIds: [...assignedIds.value],
        learnedIds: [...learnedIds.value],
        currentCharacterId: currentCharacterId.value,
        reviewedCount: reviewedCount.value,
        studySeconds: studySeconds.value,
        startedAt: startedAt.value,
        completedAt: completedAt.value,
      })
    } catch {
      // 存储不可用时仍保留内存中的进度。
    }
  }

  function addLearned(characterId: string) {
    if (!characterId) return
    // 若跨天，先以新日期为准再记录。
    if (todayKey() !== dateKey.value) hydrate()
    if (learnedIds.value.includes(characterId)) return
    learnedIds.value = [...learnedIds.value, characterId]
    if (assignedIds.value.length > 0 && assignedIds.value.every((id) => learnedIds.value.includes(id))) {
      completedAt.value ??= new Date().toISOString()
      currentCharacterId.value = null
    }
    persist()
  }

  function ensureSession(candidateIds: string[], targetCount: number) {
    if (todayKey() !== dateKey.value) hydrate()
    const nextAssignment = buildDailyAssignment(assignedIds.value, candidateIds, targetCount)
    const hasChanged = nextAssignment.some((id, index) => id !== assignedIds.value[index])
      || nextAssignment.length !== assignedIds.value.length
    if (hasChanged) assignedIds.value = nextAssignment
    if (assignedIds.value.length > 0) startedAt.value ??= new Date().toISOString()
    if (!currentCharacterId.value || !assignedIds.value.includes(currentCharacterId.value)) {
      currentCharacterId.value = assignedIds.value.find((id) => !learnedIds.value.includes(id)) ?? null
    }
    persist()
  }

  function reconcileLearned(completedCharacterIds: string[]) {
    const completedIdSet = new Set(completedCharacterIds)
    const reconciledIds = assignedIds.value.filter((id) => completedIdSet.has(id))
    const hasChanged = reconciledIds.length !== learnedIds.value.length
      || reconciledIds.some((id, index) => id !== learnedIds.value[index])
    if (!hasChanged) return
    learnedIds.value = reconciledIds
    if (!assignedIds.value.every((id) => learnedIds.value.includes(id))) completedAt.value = null
    persist()
  }

  function setCurrentCharacter(characterId: string | null) {
    if (characterId !== null && !assignedIds.value.includes(characterId)) return
    currentCharacterId.value = characterId
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
    assignedIds,
    learnedIds,
    currentCharacterId,
    reviewedCount,
    studySeconds,
    startedAt,
    completedAt,
    learnedCount,
    minutes,
    hydrate,
    persist,
    addLearned,
    ensureSession,
    reconcileLearned,
    setCurrentCharacter,
    addStudySeconds,
    setStudySeconds,
  }
})
