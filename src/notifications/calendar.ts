import {nextReminderAt} from './schedule'
import type {Reminder} from './schedule'
function escapeText(value:string):string{return value.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,')}
function timestamp(date:Date):string{return date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}
function fold(value:string):string{let line='',bytes=0;const lines:string[]=[];for(const char of value){const size=encodeURIComponent(char).replace(/%[0-9A-F]{2}|./g,'x').length;if(bytes+size>75){lines.push(line);line=' ';bytes=1}line+=char;bytes+=size}lines.push(line);return lines.join('\r\n')}
export function createCalendarReminder(reminder:Reminder,from=new Date()):string{
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Font Learning//Offline Reminders//ZH','CALSCALE:GREGORIAN']
  const end=new Date(from);end.setDate(end.getDate()+28);let next=nextReminderAt(reminder,from)
  while(next&&next<end){lines.push('BEGIN:VEVENT',`UID:${encodeURIComponent(reminder.id)}-${next.getTime()}@font-learning.local`,`DTSTAMP:${timestamp(from)}`,`DTSTART:${timestamp(next)}`,`DTEND:${timestamp(new Date(next.getTime()+10*60000))}`,`SUMMARY:${escapeText(reminder.title)}`,'DESCRIPTION:离线学习提醒。外部日历中的事件请在日历应用内管理。','BEGIN:VALARM','TRIGGER:PT0S','ACTION:DISPLAY',`DESCRIPTION:${escapeText(reminder.title)}`,'END:VALARM','END:VEVENT');next=nextReminderAt(reminder,new Date(next.getTime()+1))}
  lines.push('END:VCALENDAR');return lines.map(fold).join('\r\n')+'\r\n'
}
