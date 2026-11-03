import {afterEach,expect,it,vi} from 'vitest'
import {createPinia,setActivePinia} from 'pinia'
import {setupTestDatabase} from '../database/testSupport'
import {readStored} from '../database/persistence'
import {useDailyProgressStore} from '../stores/dailyProgress'
import {saveDailyPlan} from './settings'
import {synchronizeDailySession} from './dailySession'
const {loadCharacters}=vi.hoisted(()=>({loadCharacters:vi.fn()}))
vi.mock('../database/catalog',()=>({getDailyCharacters:loadCharacters}))
afterEach(()=>vi.useRealTimers())
it('切日重新读取课程与题型并建立新题单，旧日数据保留',async()=>{
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date(2026,10,3,23,59));await setupTestDatabase();setActivePinia(createPinia())
  loadCharacters.mockResolvedValueOnce([{id:'a'},{id:'b'}]).mockResolvedValueOnce([{id:'c'},{id:'d'}])
  await synchronizeDailySession();const store=useDailyProgressStore();expect(store.assignedIds).toEqual(['a','b'])
  await saveDailyPlan({dailyCount:1,modes:['seal-to-reference-input']})
  vi.setSystemTime(new Date(2026,10,4,0,1));const today=await synchronizeDailySession()
  expect(today.dateKey).toBe('2026-11-4');expect(today.modes).toEqual(['seal-to-reference-input']);expect(store.assignedIds).toEqual(['c'])
  store.setCurrentCharacter('c');expect(store.currentCharacterId).toBe('c')
  expect(readStored('font-learning-daily-progress:2026-11-3')).toMatchObject({assignedIds:['a','b']})
})
