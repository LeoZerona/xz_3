import {computed,reactive,ref} from 'vue'
import {onLoad} from '@dcloudio/uni-app'
import {confirmFeature,finishFeatureEdit,goFeatureBack,openFeature,useFeatureAction,useFeatureTask} from '../features/useFeatureTask'
import {exportTextFile} from '../features/exportFile'
import {createCalendarReminder} from './calendar'
import {reminderCapability} from './platform'
import {deleteMessage,deleteReminder,listMessages,listReminders,markMessageRead,readMessage,refreshLocalMessages,saveReminder} from './repository'
import type {Reminder} from './schedule'
import type {LocalMessage} from './repository'
export type NotificationPageKind='messages'|'detail'|'reminders'|'edit'|'capabilities'
export function useNotificationPage(kind:NotificationPageKind){
  const id=ref('');const messages=ref<LocalMessage[]>([]);const message=ref<LocalMessage>();const reminders=ref<Reminder[]>([]);const unread=ref(false);const limit=ref(50);const status=ref('');const original=ref('')
  const draft=reactive({title:'学习提醒',time:'20:00',weekdays:[0,1,2,3,4,5,6],enabled:true,quietStart:'22:00',quietEnd:'07:00',skipCompleted:true})
  const {busy,actionError,perform}=useFeatureAction();onLoad(options=>{id.value=typeof options?.id==='string'?options.id:''})
  const {loading,error,reload}=useFeatureTask(async()=>{
    if(kind==='messages'){await refreshLocalMessages();messages.value=await listMessages({unread:unread.value,limit:limit.value})}
    else if(kind==='detail'){message.value=await readMessage(id.value);await markMessageRead(id.value);message.value=await readMessage(id.value)}
    else if(kind==='reminders'||kind==='edit'){reminders.value=await listReminders();if(kind==='edit'&&id.value){const current=reminders.value.find(item=>item.id===id.value);if(!current)throw new Error('提醒已不存在');Object.assign(draft,{title:current.title,time:current.time,weekdays:[...current.weekdays],enabled:current.enabled,quietStart:current.quietStart,quietEnd:current.quietEnd,skipCompleted:current.skipCompleted})};original.value=JSON.stringify(draft)}
  },{refreshOnShow:kind!=='edit',beforeBack:confirmDiscard,backUrl:kind==='edit'?'/pages/reminders/index':'/pages/profile/index'})
  const title=computed(()=>({messages:'本机消息',detail:'消息详情',reminders:'学习提醒',edit:id.value?'编辑提醒':'新建提醒',capabilities:'提醒能力说明'}[kind]))
  function confirmDiscard():Promise<boolean>{if(busy.value)return Promise.resolve(false);return kind==='edit'&&original.value&&original.value!==JSON.stringify(draft)?confirmFeature('放弃提醒修改？','本次未保存的设置不会生效。','放弃修改'):Promise.resolve(true)}
  function handleOpen(url:string):void{void perform(()=>openFeature(url))}
  function handleWeekday(day:number):void{draft.weekdays=draft.weekdays.includes(day)?draft.weekdays.filter(item=>item!==day):[...draft.weekdays,day]}
  function handleSave():void{void perform(async()=>{await saveReminder({...draft,id:id.value||undefined});original.value=JSON.stringify(draft);await finishFeatureEdit('/pages/reminders/index')})}
  function handleToggle(reminder:Reminder):void{void perform(async()=>{await saveReminder({...reminder,enabled:!reminder.enabled});await reload()})}
  function handleDelete(reminder:Reminder):void{void perform(async()=>{if(!await confirmFeature('删除这条提醒？','此应用中的后续触发将停止。外部日历内的事件需在日历应用中删除。','删除提醒'))return;await deleteReminder(reminder.id);await reload()})}
  function handleExport(reminder:Reminder):void{void perform(async()=>{status.value=await exportTextFile(createCalendarReminder(reminder),'ics','font-learning-calendar')})}
  function handleReadAll():void{void perform(async()=>{await markMessageRead();await reload()})}
  function handleUnread():void{unread.value=!unread.value;limit.value=50;void reload()}
  function handleMore():void{limit.value+=50;void reload()}
  function handleDeleteMessage():void{void perform(async()=>{if(!message.value||!await confirmFeature('删除这条消息？','只删除消息，学习记录保留。','删除消息'))return;await deleteMessage(message.value.id);await goFeatureBack('/pages/messages/index')})}
  const messageUrl=computed(()=>message.value?.kind==='learning'?`/pages/learning-day/index?date=${encodeURIComponent(message.value.relatedId)}`:'/pages/learning-records/index')
  return reactive({kind,title,id,messages,message,reminders,draft,unread,limit,status,busy,actionError,loading,error,reload,confirmDiscard,handleOpen,handleWeekday,handleSave,handleToggle,handleDelete,handleExport,handleReadAll,handleUnread,handleMore,handleDeleteMessage,messageUrl,capability:reminderCapability()})
}
