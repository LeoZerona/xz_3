import {expect,it} from 'vitest'
import {createCalendarReminder} from './calendar'
it('日历导出使用UTC瞬时、转义文本，覆盖未来四周且可解析',()=>{
  const text=createCalendarReminder({id:'r',title:'汉字，学习;一\\二\n新行',time:'08:30',weekdays:[1,2,3,4,5],enabled:true,quietStart:'22:00',quietEnd:'07:00',skipCompleted:true,createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z'},new Date(2026,10,2,0))
  expect(text).toContain('BEGIN:VCALENDAR\r\n')
  expect(text).toContain('DTSTART:'+new Date(2026,10,2,8,30).toISOString().replace(/[-:]/g,'').replace('.000',''))
  expect(text).toContain('学习\\;一\\\\二\\n新行')
  expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(20)
})
