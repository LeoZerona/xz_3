import { ref } from 'vue'
import { initializePersistence, flushPersistence, reportPersistenceError } from './persistence'
import { initializeCatalog } from './catalog'
import { useCharacterLearningStore } from '../stores/characterLearning'
import { useDailyProgressStore } from '../stores/dailyProgress'
import { useLevelProgressStore } from '../stores/levelProgress'
import { useFontStore } from '../stores/fonts'
import { useThemeStore } from '../stores/theme'
import { useProfileStore } from '../stores/profile'
import { useLevelLayoutStore } from '../stores/levelLayout'
import { useCharacterComparisonStore } from '../stores/characterComparison'
import { useLevelActivityStore } from '../stores/levelActivity'

export const applicationReady = ref(false)
export const applicationError = ref('')
let preparation: Promise<void> | undefined
export function prepareApplication(): Promise<void> {
  if (applicationReady.value) return Promise.resolve()
  preparation ??= (async () => {
    applicationError.value = ''
    await initializePersistence()
    await initializeCatalog()
    useCharacterLearningStore().hydrate()
    useDailyProgressStore().hydrate()
    useLevelProgressStore().hydrate()
    useFontStore().initialize()
    useProfileStore().hydrate()
    useThemeStore().initialize()
    useLevelLayoutStore().hydrate()
    await useCharacterComparisonStore().hydrate()
    await useLevelActivityStore().hydrate()
    applicationReady.value = true
  })().catch((error: unknown) => {
    applicationError.value = error instanceof Error ? error.message : String(error)
    preparation = undefined
    throw error
  })
  return preparation
}
export function flushApplication(): void { void flushPersistence().catch(reportPersistenceError) }
export async function refreshApplication(): Promise<void> {
  applicationReady.value = false
  preparation = undefined
  await prepareApplication()
}
