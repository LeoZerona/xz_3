import {expect,it} from 'vitest'
import {nextReminderAt} from './schedule'
const reminder={id:'r',title:'学习',time:'23:30',weekdays:[1],enabled:true,quietStart:'22:00',quietEnd:'07:00',skipCompleted:true,createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z'}
it('星期与跨午夜勿扰时间正确，关闭后不产生下一次提醒',()=>{
  const next=nextReminderAt(reminder,new Date(2026,10,2,10))!
  expect([next.getFullYear(),next.getMonth(),next.getDate(),next.getHours(),next.getMinutes()]).toEqual([2026,10,3,7,0])
  expect(nextReminderAt({...reminder,enabled:false},new Date())).toBeNull()
})
