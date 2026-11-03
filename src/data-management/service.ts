import {getDatabase} from '../database/connection'
import {exportBackup,restoreBackup,validateBackup} from '../database/backup'
import {flushPersistence,readStored,saveStored} from '../database/persistence'
import {USER_TABLES,object} from '../database/records'
import {createActivityId} from '../learning/activity'
import type {Table} from '../database/schema'
import {ref} from 'vue'
export const backupOperation=ref<{action:'export'|'restore';detail:string}|null>(null)
export const tableLabels:Partial<Record<Table,string>>={settings:'个人资料与应用设置',character_progress:'汉字学习与收藏',character_mode_progress:'各题型学习记录',character_actions:'斩字历史',daily_sessions:'日常学习会话',daily_session_items:'日常题单',stage_progress:'关卡进度',stage_character_progress:'关卡字记录',stage_training:'关卡训练轮次',stage_training_modes:'关卡题型记录',level_review:'复习排期',reading_progress:'阅读位置',activity_events:'学习事件与时长',collections:'我的字单',collection_items:'字单成员',practice_sessions:'专项会话',practice_questions:'专项题目与作答',library_books:'图书状态',annotations:'书签与摘录笔记',import_history:'导入历史',reminders:'学习提醒',local_messages:'本机消息',books:'自定义图书',book_chunks:'图书正文'}
export interface BackupPreview {createdAt:string;counts:Partial<Record<Table,number>>;records:number;bytes:number}
function utf8Size(text:string):number{let bytes=0;for(const char of text){const code=char.codePointAt(0)!;bytes+=code<=0x7f?1:code<=0x7ff?2:code<=0xffff?3:4}return bytes}
export async function previewBackup(text:string):Promise<BackupPreview>{const data=validateBackup(text);const parsed=object(JSON.parse(text));return{createdAt:String(parsed.createdAt??'未提供'),counts:Object.fromEntries([...data].map(([table,rows])=>[table,rows.length])),records:[...data.values()].reduce((sum,rows)=>sum+rows.length,0),bytes:utf8Size(text)}}
export async function readDataCounts():Promise<Partial<Record<Table,number>>>{await flushPersistence();const db=await getDatabase();return Object.fromEntries(await Promise.all([...USER_TABLES,'books','book_chunks','book_search'].map(async table=>[table,(await db.query(table as Table)).length])))}
export async function clearRebuildableCache():Promise<void>{await flushPersistence();const db=await getDatabase();await db.commit((await db.query('book_search')).map(row=>({table:'book_search',deleteId:row.id})))}
export async function restorePreviousSnapshot():Promise<void>{const row=(await (await getDatabase()).query('meta',{where:{id:'before-restore-backup'}}))[0];if(!row)throw new Error('没有恢复前快照');await restoreBackup(String(row.value))}
export async function hasPreviousSnapshot():Promise<boolean>{return Boolean((await(await getDatabase()).query('meta',{where:{id:'before-restore-backup'}}))[0])}
export interface Feedback {id:string;category:string;body:string;createdAt:string;diagnostics:Record<string,string|number>|null}
const KEY='font-learning-feedback'
export function listFeedback():Feedback[]{const value=readStored(KEY);if(!Array.isArray(value))return[];return value.filter((item):item is Feedback=>typeof object(item).id==='string'&&typeof object(item).body==='string').sort((a,b)=>b.createdAt.localeCompare(a.createdAt))}
export async function saveFeedback(input:{category:string;body:string;includeDiagnostics:boolean}):Promise<string>{const body=input.body.trim();if(!body||body.length>3000||!['问题','建议','其他'].includes(input.category))throw new Error('请填写 1–3000 字的反馈内容');const all=listFeedback();if(all.length>=500)throw new Error('本机反馈已达 500 条，请先导出并删除旧草稿');const id=createActivityId('feedback');saveStored(KEY,[...all,{id,category:input.category,body,createdAt:new Date().toISOString(),diagnostics:input.includeDiagnostics?{appVersion:'1.0.0',databaseVersion:8,platform:typeof plus==='undefined'?'H5':'App'}:null}]);await flushPersistence();return id}
export async function deleteFeedback(id:string):Promise<void>{saveStored(KEY,listFeedback().filter(item=>item.id!==id));await flushPersistence()}
export async function exportFeedback(id:string):Promise<string>{const item=listFeedback().find(row=>row.id===id);if(!item)throw new Error('反馈草稿不存在');return JSON.stringify(item,null,2)}
export {exportBackup,restoreBackup}
