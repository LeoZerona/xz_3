import {getDailyCharacters} from '../database/catalog'
import {useDailyProgressStore} from '../stores/dailyProgress'
import {useCharacterLearningStore} from '../stores/characterLearning'
import {readPlanDailyCount} from '../study/dailyProgress'
import {readDailySessionModes,readLearningSettings} from './settings'
import {localDateKey} from './activity'
import type {StudyCharacterEntry} from '../study/types'
import type {StudyMode} from '../study/modes'
export interface DailySessionSnapshot {dateKey:string;characters:StudyCharacterEntry[];modes:StudyMode[];reviewTarget:number}
export async function synchronizeDailySession():Promise<DailySessionSnapshot>{
  const dateKey=localDateKey(new Date());const characters=await getDailyCharacters()
  // 资源读取跨越午夜时重新按新日期取课，避免混用两日设置。
  if(dateKey!==localDateKey(new Date()))return synchronizeDailySession()
  const learning=useCharacterLearningStore();const daily=useDailyProgressStore()
  const modes=readDailySessionModes(dateKey);const reviewTarget=readLearningSettings().reviewTarget
  daily.hydrate();daily.reconcileLearned(learning.completedIds)
  daily.ensureSession(characters.filter(entry=>!learning.isExcluded(entry.id)&&!learning.isCharacterComplete(entry.id)).map(entry=>entry.id),readPlanDailyCount())
  for(const id of daily.assignedIds)if(learning.isCharacterComplete(id))daily.addLearned(id)
  return{dateKey,characters,modes,reviewTarget}
}
