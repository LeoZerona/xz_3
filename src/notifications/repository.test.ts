import {beforeEach,expect,it} from 'vitest'
import {setupTestDatabase} from '../database/testSupport'
import {recordActivity} from '../learning/activity'
import {refreshLocalMessages,listMessages,saveReminder,listReminders,deleteMessage} from './repository'
beforeEach(async()=>{await setupTestDatabase()})
it('真实完成事件生成一次消息，提醒修改和关闭立即替换旧排程',async()=>{
  recordActivity({id:'e',sessionId:'d',source:'daily',kind:'completed',characterId:'one',mode:null,correct:null,at:'2026-11-03T01:00:00Z',dateKey:'2026-11-3',seconds:0,timezoneOffset:0})
  await refreshLocalMessages(new Date(2026,10,3,10));await refreshLocalMessages(new Date(2026,10,3,10))
  expect(await listMessages()).toHaveLength(1)
  await deleteMessage((await listMessages())[0]!.id);await refreshLocalMessages(new Date(2026,10,3,10))
  expect(await listMessages()).toHaveLength(0)
  const id=await saveReminder({title:'学习',time:'08:00',weekdays:[0,1,2,3,4,5,6],enabled:true,quietStart:'22:00',quietEnd:'07:00',skipCompleted:true})
  await saveReminder({... (await listReminders())[0]!,id,time:'19:00',enabled:false})
  expect((await listReminders())[0]).toMatchObject({id,time:'19:00',enabled:false})
})

it('不支持 Array.at 的运行环境仍能按日生成去重的学习消息', async () => {
  const activity = {
    sessionId: 'daily-session', source: 'daily', kind: 'completed', mode: null,
    correct: null, dateKey: '2026-11-3', seconds: 0, timezoneOffset: 0,
  } as const
  recordActivity({ ...activity, id: 'first', characterId: 'one', at: '2026-11-03T01:00:00Z' })
  recordActivity({ ...activity, id: 'last', source: 'level', characterId: 'two', at: '2026-11-03T03:00:00Z' })
  recordActivity({ ...activity, id: 'repeated', characterId: 'one', at: '2026-11-03T02:00:00Z' })

  const arrayAt = Object.getOwnPropertyDescriptor(Array.prototype, 'at')!
  Object.defineProperty(Array.prototype, 'at', { ...arrayAt, value: undefined })
  try {
    await refreshLocalMessages(new Date(2026, 10, 3, 10))
    await refreshLocalMessages(new Date(2026, 10, 3, 10))
  } finally {
    Object.defineProperty(Array.prototype, 'at', arrayAt)
  }

  expect(await listMessages()).toEqual([{
    id: 'learning:2026-11-3', title: '学习进展',
    body: '2026-11-3 完成了 2 个文字的正式学习。',
    kind: 'learning', relatedId: '2026-11-3', at: '2026-11-03T03:00:00Z', readAt: null,
  }])
})
