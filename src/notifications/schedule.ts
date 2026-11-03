export interface Reminder {id:string;title:string;time:string;weekdays:number[];enabled:boolean;quietStart:string;quietEnd:string;skipCompleted:boolean;createdAt:string;updatedAt:string}
export function validTime(value:string):boolean{return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)}
function minutes(value:string):number{const[hour,minute]=value.split(':').map(Number);return hour!*60+minute!}
export function nextReminderAt(reminder:Reminder,from:Date):Date|null{
  if(!reminder.enabled||!reminder.weekdays.length||!validTime(reminder.time))return null
  const time=minutes(reminder.time),quietStart=minutes(reminder.quietStart),quietEnd=minutes(reminder.quietEnd)
  for(let offset=-1;offset<15;offset++){
    const date=new Date(from.getFullYear(),from.getMonth(),from.getDate()+offset,Math.floor(time/60),time%60)
    if(!reminder.weekdays.includes(date.getDay()))continue
    if(quietStart!==quietEnd){const current=date.getHours()*60+date.getMinutes();const quiet=quietStart<quietEnd?current>=quietStart&&current<quietEnd:current>=quietStart||current<quietEnd
      if(quiet){if(quietStart>quietEnd&&current>=quietStart)date.setDate(date.getDate()+1);date.setHours(Math.floor(quietEnd/60),quietEnd%60,0,0)}}
    if(date>=from)return date
  }
  return null
}
