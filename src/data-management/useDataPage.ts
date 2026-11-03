import {computed,reactive,ref} from 'vue'
import {onLoad} from '@dcloudio/uni-app'
import {confirmFeature,finishFeatureEdit,openFeature,useFeatureAction,useFeatureTask} from '../features/useFeatureTask'
import {exportTextFile} from '../features/exportFile'
import {refreshApplication} from '../database/application'
import {clearRebuildableCache,deleteFeedback,exportBackup,exportFeedback,hasPreviousSnapshot,listFeedback,previewBackup,readDataCounts,restoreBackup,restorePreviousSnapshot,saveFeedback} from './service'
import {helpArticles,privacySections} from './policies'
import type {BackupPreview,Feedback} from './service'
import {backupOperation,tableLabels} from './service'
export type DataPageKind='data'|'preview'|'result'|'cache'|'privacy'|'help'|'article'|'feedback'|'feedback-detail'|'about'
export function useDataPage(kind:DataPageKind){
  const id=ref('');const query=ref('');const input=ref('');const preview=ref<BackupPreview>();const counts=ref<Awaited<ReturnType<typeof readDataCounts>>>({});const hasSnapshot=ref(false);const status=ref('');const result=ref('');const drafts=ref<Feedback[]>([]);const feedback=ref<Feedback>();const draft=reactive({category:'问题',body:'',includeDiagnostics:false})
  const {busy,actionError,perform}=useFeatureAction();onLoad(options=>{id.value=String(options?.id??'');result.value=String(options?.action??'export')})
  const {loading,error,reload}=useFeatureTask(async()=>{if(['data','cache'].includes(kind)){counts.value=await readDataCounts();hasSnapshot.value=await hasPreviousSnapshot()}if(kind==='feedback')drafts.value=listFeedback();if(kind==='feedback-detail'){feedback.value=listFeedback().find(item=>item.id===id.value);if(!feedback.value)throw new Error('反馈草稿不存在')}},{refreshOnShow:!['preview','feedback'].includes(kind),beforeBack:confirmDiscard})
  const title=computed(()=>({data:'数据与隐私',preview:'备份预览与恢复',result:'备份操作结果',cache:'缓存管理',privacy:'隐私与信息清单',help:'帮助与反馈',article:'帮助详情',feedback:'本地反馈草稿','feedback-detail':'反馈详情',about:'关于字体学习'}[kind]))
  const article=computed(()=>helpArticles.find(item=>item.id===id.value))
  const articles=computed(()=>helpArticles.filter(item=>!query.value||`${item.title}${item.paragraphs.join('')}`.includes(query.value.trim())))
  async function confirmDiscard():Promise<boolean>{if(busy.value)return false;return kind==='feedback'&&draft.body.trim()?confirmFeature('放弃未保存的反馈？','已保存草稿保留，本次输入将丢弃。','放弃输入'):true}
  function handleOpen(url:string):void{void perform(()=>openFeature(url))}
  function handleExport():void{void perform(async()=>{status.value=await exportTextFile(await exportBackup(),'json','font-learning-backup');backupOperation.value={action:'export',detail:status.value};await openFeature('/pages/backup-result/index?action=export')})}
  function handlePreview():void{void perform(async()=>{preview.value=await previewBackup(input.value)})}
  function handleInput(value:string):void{input.value=value;preview.value=undefined}
  function handlePick():void{void perform(async()=>{
    // #ifdef H5
    const picker=document.createElement('input');picker.type='file';picker.accept='.json,application/json'
    await new Promise<void>((resolve,reject)=>{picker.oncancel=()=>{picker.remove();resolve()};picker.onchange=()=>{const file=picker.files?.[0];if(!file){picker.remove();resolve();return}if(file.size>100*1024*1024){picker.remove();reject(new Error('备份文件不能超过 100MB'));return}void file.text().then(async text=>{input.value=text;preview.value=await previewBackup(text)}).then(resolve,reject).finally(()=>picker.remove())};picker.click()})
    // #endif
    // #ifdef APP-PLUS
    throw new Error('当前 App 请粘贴备份内容，或使用原设置页的备份文件路径恢复')
    // #endif
  })}
  async function finishRestore():Promise<void>{backupOperation.value={action:'restore',detail:'数据已重新载入，已保留恢复前快照。'};await refreshApplication();await new Promise<void>((resolve,reject)=>uni.reLaunch({url:'/pages/backup-result/index?action=restore',success:()=>resolve(),fail:reject}))}
  function handleRestore():void{void perform(async()=>{if(!preview.value)throw new Error('请先校验并预览备份');if(!await confirmFeature('替换本机全部用户数据？','当前学习、图书、笔记和设置将被备份替换，恢复前仅保留最近一份快照。','确认替换'))return;await restoreBackup(input.value);await finishRestore()})}
  function handleRollback():void{void perform(async()=>{if(!await confirmFeature('回退最近一次恢复？','替换为最近一次恢复前的本机数据。','回退快照'))return;await restorePreviousSnapshot();await finishRestore()})}
  function handleClear():void{void perform(async()=>{if(!await confirmFeature('清理全文索引缓存？','只清理可重建的搜索索引，学习、正文、笔记和字体保留。','清理索引'))return;await clearRebuildableCache();status.value='全文索引已清理，使用时按需重建';await reload()})}
  function handleSave():void{void perform(async()=>{const next=await saveFeedback(draft);draft.body='';await openFeature(`/pages/feedback-detail/index?id=${encodeURIComponent(next)}`,true)})}
  function handleFeedbackExport():void{void perform(async()=>{status.value=await exportTextFile(await exportFeedback(id.value),'json','font-learning-feedback')})}
  function handleDelete():void{void perform(async()=>{if(!await confirmFeature('删除本地反馈草稿？','已导出的文件保留。','删除草稿'))return;await deleteFeedback(id.value);await finishFeatureEdit('/pages/feedback/index')})}
  return reactive({kind,id,title,counts,hasSnapshot,status,result,input,preview,drafts,feedback,draft,query,article,articles,privacySections,backupOperation,tableLabels,busy,actionError,loading,error,reload,confirmDiscard,handleOpen,handleExport,handlePreview,handleInput,handlePick,handleRestore,handleRollback,handleClear,handleSave,handleFeedbackExport,handleDelete})
}
