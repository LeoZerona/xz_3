import {applicationReady} from '../database/application'
import {reportPersistenceError} from '../database/persistence'
import {refreshLocalMessages} from './repository'
let timer:ReturnType<typeof setInterval>|undefined
export function reminderCapability():{name:string;description:string}{return{name:'应用内提醒与日历导出',description:'应用内提醒在前台生效。需要关闭应用后提醒时，请导出未来四周日历文件并导入系统日历。'}}
export function startReminderClock():void{stopReminderClock();const tick=()=>{if(applicationReady.value&&(typeof document==='undefined'||document.visibilityState!=='hidden'))void refreshLocalMessages().then(count=>{if(count)uni.showToast({title:'学习提醒已到，请查看本机消息',icon:'none'})}).catch(reportPersistenceError)};tick();timer=setInterval(tick,30000)}
export function stopReminderClock():void{if(timer)clearInterval(timer);timer=undefined}
