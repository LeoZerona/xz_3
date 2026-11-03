import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { applicationReady } from '../../database/application'
import { useDatabaseTask } from '../../database/useDatabaseTask'
import { getCategoryStageCount, LEVEL_CATEGORIES, loadLevelStages } from '../../study/levelData'
import type { LevelCategory, LevelStage } from '../../study/levelData'
import type { LevelStageView } from '../../study/levelLayouts'
import { useLevelProgressStore } from '../../stores/levelProgress'
import { useCharacterLearningStore } from '../../stores/characterLearning'
import { useLevelActivityStore } from '../../stores/levelActivity'

const STAGE_BATCH_SIZE = 24

/** 四种布局共用用户选择记录、分批加载和导航，不把默认展示当作选择。 */
export function useLevelStages() {
  const levelProgressStore = useLevelProgressStore()
  const characterStore = useCharacterLearningStore()
  const levelActivityStore = useLevelActivityStore()
  const { lastStudiedStage } = storeToRefs(levelActivityStore)
  const activeCategory = ref<LevelCategory>('level1')
  const visibleStageCount = ref(STAGE_BATCH_SIZE)
  const currentStages = ref<LevelStage[]>([])
  const isNavigating = ref(false)
  const isLoadingStages = ref(false)
  const isLocating = ref(false)
  const stageLoadError = ref('')
  const scrollTargetId = ref('')
  const locationRequest = ref(0)
  let stageLoadRequestId = 0
  let initialized = false
  let lastLocatedStudy = ''

  const currentMeta = computed(() => LEVEL_CATEGORIES.find((category) => category.key === activeCategory.value)!)
  const completedCount = computed(() => levelProgressStore.completedCountByCategory[activeCategory.value] ?? 0)
  const totalCount = computed(() => getCategoryStageCount(activeCategory.value))
  const hasMoreStages = computed(() => currentStages.value.length < totalCount.value)
  const completedCharacterIds = computed(() => new Set(characterStore.completedIds))
  const lastStudyCategoryLabel = computed(() => LEVEL_CATEGORIES.find((category) => category.key === lastStudiedStage.value?.category)?.label ?? '')
  const visibleStages = computed<LevelStageView[]>(() => currentStages.value.map((stage) => {
    if (stage.isPlaceholder) return { stage, completedChars: 0, isDone: false, progress: 0 }
    const isDone = levelProgressStore.isStageCompleted(stage.id)
    const tracked = levelProgressStore.getStageCompletedCount(stage.id)
    const learned = stage.characters.filter((character) => completedCharacterIds.value.has(character.id)).length
    const completedChars = isDone ? stage.characters.length : Math.max(tracked, learned)
    const progress = stage.characters.length === 0 ? 0 : Math.min(1, completedChars / stage.characters.length)
    return { stage, completedChars, isDone, progress }
  }))
  const featuredStage = computed(() => visibleStages.value.find((item) => item.stage.id === lastStudiedStage.value?.stageId && !item.stage.isPlaceholder)
    ?? visibleStages.value.find((item) => !item.stage.isPlaceholder && !item.isDone && item.completedChars > 0)
    ?? visibleStages.value.find((item) => !item.stage.isPlaceholder && !item.isDone)
    ?? visibleStages.value.find((item) => !item.stage.isPlaceholder))

  useDatabaseTask(async () => {
    if (!initialized) {
      initialized = true
      if (lastStudiedStage.value) await locateLastStage(false)
      else await loadCurrentStages(true)
    } else await loadCurrentStages(false)
  })
  onShow(() => {
    isNavigating.value = false
    levelProgressStore.hydrate()
    if (!applicationReady.value || !initialized || isLoadingStages.value) return
    const recent = lastStudiedStage.value
    if (recent && `${recent.stageId}:${recent.studiedAt}` !== lastLocatedStudy) void locateLastStage(false)
    else void loadCurrentStages(false)
  })
  onBeforeUnmount(() => { stageLoadRequestId++ })

  function switchCategory(key: LevelCategory): void {
    if (key === activeCategory.value) return
    activeCategory.value = key
    visibleStageCount.value = STAGE_BATCH_SIZE
    currentStages.value = []
    scrollTargetId.value = ''
    void loadCurrentStages(true)
  }
  function loadMoreStages(): void {
    if (!hasMoreStages.value || isLoadingStages.value) return
    visibleStageCount.value = Math.min(totalCount.value, visibleStageCount.value + STAGE_BATCH_SIZE)
    void loadCurrentStages(false)
  }
  async function loadCurrentStages(reset: boolean): Promise<boolean> {
    const category = activeCategory.value
    if (reset) visibleStageCount.value = Math.min(STAGE_BATCH_SIZE, getCategoryStageCount(category))
    const requestId = ++stageLoadRequestId
    isLoadingStages.value = true
    stageLoadError.value = ''
    try {
      const stages = await loadLevelStages(category, visibleStageCount.value)
      if (requestId !== stageLoadRequestId || category !== activeCategory.value) return false
      currentStages.value = stages
      return true
    } catch (error) {
      if (requestId === stageLoadRequestId && category === activeCategory.value) stageLoadError.value = error instanceof Error ? error.message : '关卡数据加载失败'
      return false
    } finally { if (requestId === stageLoadRequestId) isLoadingStages.value = false }
  }
  async function locateLastStage(shouldFocus: boolean): Promise<void> {
    const recent = lastStudiedStage.value
    if (!recent || isLocating.value) return
    isLocating.value = true
    scrollTargetId.value = ''
    if (activeCategory.value !== recent.category) {
      activeCategory.value = recent.category
      currentStages.value = []
      visibleStageCount.value = STAGE_BATCH_SIZE
    }
    // 先加载到目标所在批次，再交给 uni-app 的 scroll-into-view，兼容 H5 与 App-vue。
    visibleStageCount.value = Math.max(visibleStageCount.value, Math.ceil(recent.index / STAGE_BATCH_SIZE) * STAGE_BATCH_SIZE)
    try {
      if (!await loadCurrentStages(false)) return
      lastLocatedStudy = `${recent.stageId}:${recent.studiedAt}`
      locationRequest.value++
      await nextTick()
      if (activeCategory.value !== recent.category) return
      scrollTargetId.value = 'stage-' + recent.stageId
      // #ifdef H5
      if (shouldFocus) {
        await nextTick()
        document.getElementById(scrollTargetId.value)?.focus({ preventScroll: true })
      }
      // #endif
    } finally { isLocating.value = false }
  }
  function handleLocateLastStage(): void { void locateLastStage(true) }
  function handleStageSelection(stageId: string): void {
    const stage = currentStages.value.find((item) => item.id === stageId)
    if (stage) levelActivityStore.recordSelection(stage)
  }
  function handleStageTap(stageId: string, isPlaceholder: boolean): void {
    if (isPlaceholder) { uni.showToast({ title: '该关卡敬请期待', icon: 'none' }); return }
    if (isNavigating.value) return
    isNavigating.value = true
    handleStageSelection(stageId)
    uni.navigateTo({
      url: '/pages/level-study/index?category=' + activeCategory.value + '&stageId=' + stageId,
      animationType: 'slide-in-right', animationDuration: 220,
      fail: () => {
        isNavigating.value = false
        uni.showToast({ title: '暂时无法进入学习', icon: 'none' })
      },
    })
  }
  return {
    activeCategory, currentMeta, visibleStages, displayStages: visibleStages, featuredStage,
    completedCount, totalCount, hasMoreStages, isLoadingStages, stageLoadError,
    lastStudiedStage, lastStudyCategoryLabel, isLocating, scrollTargetId, locationRequest,
    switchCategory, loadMoreStages, loadCurrentStages, handleStageTap, handleStageSelection, handleLocateLastStage,
  }
}
