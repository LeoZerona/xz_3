import {getDatabase} from '../database/connection'
import {flushPersistence,readStored,saveStored} from '../database/persistence'
import {createActivityId,localDateKey,readActivities} from '../learning/activity'
import {readPlanDailyCount} from '../study/dailyProgress'
import {validTime,nextReminderAt} from './schedule'
import type {Reminder} from './schedule'
import type {Change} from '../database/types'
export interface LocalMessage {id:string;title:string;body:string;kind:'learning'|'reminder';relatedId:string;at:string;readAt:string|null}
export async function listReminders():Promise<Reminder[]>{await flushPersistence();return(await(await getDatabase()).query('reminders',{orderBy:'time'})).map(row=>({id:row.id,title:String(row.title),time:String(row.time),weekdays:JSON.parse(String(row.weekdays)) as number[],enabled:row.enabled===1,quietStart:String(row.quietStart),quietEnd:String(row.quietEnd),skipCompleted:row.skipCompleted===1,createdAt:String(row.createdAt),updatedAt:String(row.updatedAt)}))}
export async function saveReminder(input:Omit<Reminder,'id'|'createdAt'|'updatedAt'>&{id?:string},now=new Date()):Promise<string>{
  if(!input.title.trim()||Array.from(input.title.trim()).length>40||![input.time,input.quietStart,input.quietEnd].every(validTime)||!input.weekdays.length||input.weekdays.some(day=>!Number.isInteger(day)||day<0||day>6))throw new Error('请填写 1–40 字标题、有效时间和至少一个星期')
  const previous=input.id?(await listReminders()).find(item=>item.id===input.id):undefined;if(input.id&&!previous)throw new Error('提醒已不存在')
  const id=input.id??createActivityId('reminder');const at=now.toISOString()
  await(await getDatabase()).commit([{table:'reminders',row:{id,title:input.title.trim(),time:input.time,weekdays:JSON.stringify([...new Set(input.weekdays)].sort()),enabled:Number(input.enabled),quietStart:input.quietStart,quietEnd:input.quietEnd,skipCompleted:Number(input.skipCompleted),createdAt:previous?.createdAt??at,updatedAt:at}}]);return id
}
export async function deleteReminder(id:string):Promise<void>{await(await getDatabase()).commit([{table:'reminders',deleteId:id}])}
export async function listMessages(options:{unread?:boolean;limit?:number}={}):Promise<LocalMessage[]>{await flushPersistence();return(await(await getDatabase()).query('local_messages',{orderBy:'at',descending:true})).filter(row=>!options.unread||!row.readAt).slice(0,options.limit??100).map(row=>({id:row.id,title:String(row.title),body:String(row.body),kind:row.kind==='reminder'?'reminder':'learning',relatedId:String(row.relatedId),at:String(row.at),readAt:row.readAt?String(row.readAt):null}))}
export async function readMessage(id:string):Promise<LocalMessage>{const row=(await(await getDatabase()).query('local_messages',{where:{id}}))[0];if(!row)throw new Error('消息已不存在');return{id:row.id,title:String(row.title),body:String(row.body),kind:row.kind==='reminder'?'reminder':'learning',relatedId:String(row.relatedId),at:String(row.at),readAt:row.readAt?String(row.readAt):null}}
export async function markMessageRead(id?:string):Promise<void>{const db=await getDatabase();const rows=await db.query('local_messages',{where:id?{id}:undefined});await db.commit(rows.filter(row=>!row.readAt).map(row=>({table:'local_messages',row:{...row,readAt:new Date().toISOString()}})))}
export async function deleteMessage(id:string):Promise<void>{const raw=readStored('font-learning-deleted-messages');const ids=Array.isArray(raw)?raw.filter((value):value is string=>typeof value==='string'):[];saveStored('font-learning-deleted-messages',[...new Set([...ids,id])]);await flushPersistence();await(await getDatabase()).commit([{table:'local_messages',deleteId:id}])}
let refreshing:Promise<number>|undefined
export function refreshLocalMessages(now=new Date()):Promise<number>{if(refreshing)return refreshing;refreshing=refresh(now).finally(()=>{refreshing=undefined});return refreshing}
async function refresh(now:Date):Promise<number>{
  const db=await getDatabase();const events=(await readActivities({kind:'completed'})).filter(event=>event.source==='daily'||event.source==='level');const existing=new Set((await db.query('local_messages')).map(row=>row.id));const changes:Change[]=[]
  const deleted=readStored('font-learning-deleted-messages');if(Array.isArray(deleted))for(const id of deleted)if(typeof id==='string')existing.add(id)
  const days=[...new Set(events.filter(event=>event.kind==='completed'&&(event.source==='daily'||event.source==='level')).map(event=>event.dateKey))]
  for(const day of days){const id=`learning:${day}`;if(existing.has(id))continue;const completed=events.filter(event=>event.kind==='completed'&&event.dateKey===day);changes.push({table:'local_messages',ifAbsent:true,row:{id,title:'学习进展',body:`${day} 完成了 ${new Set(completed.map(event=>event.characterId)).size} 个文字的正式学习。`,kind:'learning',relatedId:day,at:completed.at(-1)!.at,readAt:null}})}
  const today=localDateKey(now);const completedToday=new Set(events.filter(event=>event.dateKey===today).map(event=>event.characterId)).size>=readPlanDailyCount(now)||(await db.query('daily_sessions',{where:{id:today}})).some(row=>Boolean(row.completedAt))
  for(const reminder of await listReminders()){
    if(reminder.skipCompleted&&completedToday)continue
    const start=new Date(now.getFullYear(),now.getMonth(),now.getDate());const due=nextReminderAt(reminder,start)
    if(!due||due>now||localDateKey(due)!==today||Date.parse(reminder.updatedAt)>due.getTime())continue
    const id=`reminder:${reminder.id}:${today}`;if(existing.has(id))continue
    changes.push({table:'local_messages',ifAbsent:true,row:{id,title:reminder.title,body:'到了你设定的学习时间，打开学习档案继续本机学习。',kind:'reminder',relatedId:reminder.id,at:due.toISOString(),readAt:null}})
  }
  if(changes.length)await db.commit(changes);return changes.filter(change=>'row'in change&&change.row.kind==='reminder').length
}
