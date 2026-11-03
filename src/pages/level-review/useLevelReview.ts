import { computed, onBeforeUnmount, ref } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'
import { applicationReady } from '../../database/application'
import { useDatabaseTask } from '../../database/useDatabaseTask'
import { getCharacter } from '../../database/catalog'
import { useLevelReviewStore } from '../../stores/levelReview'
import { useCharacterLearningStore } from '../../stores/characterLearning'
import { orderReviewIds } from '../../study/levelReview'
import type { ReviewFilter } from '../../study/levelReview'
import type { StudyCharacterEntry } from '../../study/types'
import { useActivityClock } from '../../learning/useActivityClock'
import { localDateKey } from '../../learning/activity'

export function useLevelReview() {
  const store = useLevelReviewStore()
  const learning = useCharacterLearningStore()
  const filter = ref<ReviewFilter>('all')
  const character = ref<StudyCharacterEntry | null>(null)
  const isLoading = ref(true)
  const loadError = ref('')
  const now = ref(Date.now())
  const isEarlyReview = ref(false)
  const answeredIds = new Set<string>()
  let requestId = 0
  let timer: ReturnType<typeof setInterval> | undefined
  let initialized = false
  let isVisible = true
  const eligibleIds = computed(() => Object.keys(store.records).filter((id) => store.hasSource(id, 'level') && (filter.value === 'all'
    || (filter.value === 'slashed' ? learning.isExcluded(id) : learning.isFavorite(id)))))
  const dueCount = computed(() => orderReviewIds(store.records, eligibleIds.value, now.value).length)
  const totalCount = computed(() => eligibleIds.value.length)
  const nextDueLabel = computed(() => {
    const first = orderReviewIds(store.records, eligibleIds.value, now.value, true)[0]
    if (!first) return ''
    const minutes = Math.max(1, Math.ceil((Date.parse(store.records[first]!.dueAt) - now.value) / 60_000))
    return minutes < 60 ? `${minutes} 分钟后` : minutes < 1440 ? `${Math.ceil(minutes / 60)} 小时后` : `${Math.ceil(minutes / 1440)} 天后`
  })
  useDatabaseTask(async () => {
    store.hydrate()
    await store.migrateLearnedCharacters()
    filter.value = store.session.filter
    initialized = true
    await loadNext(true)
    startClock()
  })
  function startClock(): void {
    if (timer) clearInterval(timer)
    if (!isVisible) return
    timer = setInterval(() => {
      now.value = Date.now()
      if (!character.value && !isLoading.value && dueCount.value > 0) void loadNext(false)
    }, 30_000)
  }
  onShow(() => {
    isVisible = true
    if (!initialized || !applicationReady.value) return
    now.value = Date.now()
    void loadNext(true)
    startClock()
  })
  onHide(() => { isVisible = false; if (timer) clearInterval(timer); timer = undefined })
  onBeforeUnmount(() => { requestId++; if (timer) clearInterval(timer) })
  async function loadNext(restore: boolean): Promise<void> {
    const currentRequest = ++requestId
    isLoading.value = true
    loadError.value = ''
    now.value = Date.now()
    const savedId = restore ? store.session.currentIds[filter.value] : undefined
    const savedReviewCount = store.session.currentReviewCounts[filter.value]
    const candidates = orderReviewIds(store.records, eligibleIds.value, now.value, isEarlyReview.value)
      .filter((id) => !isEarlyReview.value || !answeredIds.has(id))
    // 已在其他范围答过，或退出前已保存答案的字，不再被旧游标重复插回。
    if (savedId && eligibleIds.value.includes(savedId) && (savedReviewCount === undefined || savedReviewCount === store.records[savedId]?.reviewCount)) candidates.unshift(savedId)
    try {
      let next: StudyCharacterEntry | null = null
      for (const id of [...new Set(candidates)]) {
        next = await getCharacter(id)
        if (currentRequest !== requestId) return
        if (next) break
      }
      if (currentRequest !== requestId) return
      character.value = next
      store.setCurrent(filter.value, next?.id)
    } catch (error) {
      if (currentRequest === requestId) loadError.value = error instanceof Error ? error.message : '复习文字读取失败，请重试'
    } finally { if (currentRequest === requestId) isLoading.value = false }
  }
  async function switchFilter(value: ReviewFilter): Promise<void> {
    if (isLoading.value || value === filter.value) return
    filter.value = value
    isEarlyReview.value = false
    answeredIds.clear()
    await loadNext(true)
  }
  async function handleAnswer(known: boolean): Promise<void> {
    const current = character.value
    if (!current || isLoading.value || loadError.value) return
    try {
      store.answer(current.id, known)
      answeredIds.add(current.id)
      await loadNext(false)
    } catch (error) { loadError.value = error instanceof Error ? error.message : '复习记录保存失败，请重试' }
  }
  async function startEarlyReview(): Promise<void> {
    isEarlyReview.value = true
    answeredIds.clear()
    await loadNext(false)
  }
  function retry(): void { void loadNext(true) }
  useActivityClock('review', () => Boolean(character.value) && !isLoading.value && !loadError.value,
    () => `review:${localDateKey(new Date())}`)
  return { filter, character, isLoading, loadError, dueCount, totalCount, nextDueLabel, switchFilter, handleAnswer, startEarlyReview, retry }
}
