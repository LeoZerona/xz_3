import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getCharacters } from '../database/catalog'
import { localDateKey } from './activity'
import { parseLocalDay, readLearningHistory } from './history'
import { openFeature, useFeatureAction, useFeatureTask } from '../features/useFeatureTask'
import type { LearningHistory } from './history'
import type { StudyCharacterEntry } from '../study/types'

export type HistoryPageKind = 'overview' | 'calendar' | 'day' | 'report' | 'session'
export function useHistoryPage(kind: HistoryPageKind) {
  const date = ref(localDateKey(new Date())); const month = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const rangeDays = ref(7); const history = ref<LearningHistory>(); const characters = ref<StudyCharacterEntry[]>([]); const sessionId = ref('')
  onLoad(options => { if (typeof options?.date === 'string') date.value = options.date; if (typeof options?.session === 'string') sessionId.value = options.session })
  const title = { overview: '我的学习', calendar: '学习日历', day: '当日记录', report: '学习回顾', session: '会话详情' }[kind]
  const { busy, actionError, perform } = useFeatureAction()
  const { loading, error, reload } = useFeatureTask(async () => {
    let from = new Date(); let to = new Date()
    if (kind === 'calendar') { from = new Date(month.value); to = new Date(from.getFullYear(), from.getMonth() + 1, 0) }
    else if (kind === 'day' || kind === 'session') { from = parseLocalDay(date.value); to = new Date(from) }
    else from.setDate(from.getDate() - rangeDays.value + 1)
    history.value = await readLearningHistory({ from: localDateKey(from), to: localDateKey(to) })
    const ids = [...new Set(history.value.events.flatMap(event => event.characterId ? [event.characterId] : []))]
    characters.value = await getCharacters(ids)
  }, { backUrl: '/pages/learning-records/index' })
  function handleOpen(url: string): void { void perform(() => openFeature(url)) }
  function handleMonth(delta: number): void { month.value = new Date(month.value.getFullYear(), month.value.getMonth() + delta, 1); void reload() }
  function handleRange(days: number): void { rangeDays.value = days; void reload() }
  const monthLabel = computed(() => `${month.value.getFullYear()}年${month.value.getMonth() + 1}月`)
  return { title, busy, actionError, loading, error, reload, history, characters, date, month, monthLabel, rangeDays, sessionId, handleOpen, handleMonth, handleRange }
}
