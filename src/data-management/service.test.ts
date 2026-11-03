import {beforeEach,expect,it,vi} from 'vitest'
import {setupTestDatabase} from '../database/testSupport'
import {exportBackup,restoreBackup} from '../database/backup'
import {readStored,saveStored,flushPersistence} from '../database/persistence'
import {addCustomBook,readCustomBookText} from '../reading/customBooks'
import {clearRebuildableCache,previewBackup,saveFeedback,listFeedback,exportFeedback,restorePreviousSnapshot} from './service'
import {getDatabase} from '../database/connection'
import {ADDITIONAL_USER_TABLES} from '../database/records'
import {createPractice,readPractice} from '../practice/repository'
import {saveCollection,readCollection} from '../collections/repository'
import {importDocument,readImportResult} from '../library/importer'
import {setBookStatus,readLibraryBook} from '../library/repository'
import {saveAnnotation,listAnnotations} from '../library/annotations'
import {saveReminder,listReminders,refreshLocalMessages,listMessages} from '../notifications/repository'
import {recordActivity,readActivities} from '../learning/activity'
beforeEach(async()=>{await setupTestDatabase()})
it('无当前题的活动专项及未完成题目的完成会话在覆盖前拒绝',async()=>{
  saveStored('font-learning-theme','jade-green');const original=await exportBackup();const at=new Date().toISOString()
  for(const completedAt of [null,at]){const backup=JSON.parse(original) as Backup;backup.data.practice_sessions=[{id:'bad',name:'坏会话',source:'custom',sourceId:null,modes:'["seal-to-reference-choice"]',cursor:1,createdAt:at,updatedAt:at,completedAt}];backup.data.practice_questions=[{id:'q',sessionId:'bad',characterId:'a',mode:'seal-to-reference-choice',position:0,optionIds:'["a"]',attempts:0,mistakes:0,firstCorrect:null,completedAt:null}];await expect(restoreBackup(JSON.stringify(backup))).rejects.toThrow('专项')}
  expect(readStored('font-learning-theme')).toBe('jade-green')
})
it('没有浏览器TextEncoder时仍可预览备份',async()=>{
  const backup=await exportBackup();vi.stubGlobal('TextEncoder',undefined)
  try{expect((await previewBackup(backup)).bytes).toBeGreaterThan(0)}finally{vi.unstubAllGlobals()}
})
it('损坏关系、未来版本和危险字体拒绝恢复且不写入快照',async()=>{
  saveStored('font-learning-theme','jade-green');const original=await exportBackup()
  for(const change of [
    (b:Backup)=>{b.version=2},
    (b:Backup)=>{b.data.collection_items=[{id:'bad',collectionId:'missing',characterId:'char-a',position:0,addedAt:new Date().toISOString()}]},
    (b:Backup)=>{b.data.practice_questions=[{id:'bad',sessionId:'missing',characterId:'char-a',mode:'choice',position:0,optionIds:'[]',attempts:0,mistakes:0,firstCorrect:null,completedAt:null}]},
    (b:Backup)=>{b.data.settings.push({id:'font-learning-custom-fonts',value:JSON.stringify([{id:'x',name:'x',fontFamily:'x";}body{background:url(https://evil.test)',dataUrl:'data:font/ttf;base64,AA=='}])})},
  ]){const broken=JSON.parse(original) as Backup;change(broken);await expect(restoreBackup(JSON.stringify(broken))).rejects.toThrow()}
  expect(readStored('font-learning-theme')).toBe('jade-green')
})
it('备份预览统计与恢复前快照可以完整回退，缓存清理保留正文和设置',async()=>{
  await addCustomBook({id:'user-book',name:'书',fileName:'书.txt',ext:'txt',source:'custom',createdAt:1,url:'',text:'私人正文'})
  saveStored('font-learning-theme','jade-green');const backup=await exportBackup()
  expect((await previewBackup(backup)).counts.books).toBe(1)
  saveStored('font-learning-theme','ink-night');await flushPersistence()
  await restoreBackup(backup);expect(readStored('font-learning-theme')).toBe('jade-green')
  await restorePreviousSnapshot();expect(readStored('font-learning-theme')).toBe('ink-night')
  await clearRebuildableCache();expect(await readCustomBookText('user-book')).toBe('私人正文')
  expect(readStored('font-learning-theme')).toBe('ink-night')
})
it('反馈只保存填写内容，诊断导出不附原文或个人资料',async()=>{
  saveStored('font-learning-profile',{nickname:'秘密昵称'})
  const id=await saveFeedback({category:'问题',body:'导入失败',includeDiagnostics:true})
  expect(listFeedback()[0]?.id).toBe(id)
  const text=await exportFeedback(id);expect(text).toContain('导入失败');expect(text).not.toContain('秘密昵称')
  await expect(saveFeedback({category:'问题',body:' ',includeDiagnostics:false})).rejects.toThrow()
})
interface Backup {version:number;data:Record<string,Array<Record<string,unknown>>>}
it('字单、未完成专项、导入笔记、提醒和真实消息在同一备份中往返',async()=>{
  const db=await getDatabase()
  await db.commit(['a','b'].map((id,index)=>({table:'characters',row:{id,simplified:index?'末':'未',traditional:index?'末':'未',pinyin:'wei',pinyinSearch:'wei',strokes:5,radical:'木',layout:'独体',definition:'示例',level:1,position:index}})))
  const collection=await saveCollection({name:'易混字',characterIds:['b','a']})
  const practice=await createPractice({name:'未完成练习',source:'collection',sourceId:collection,characterIds:['b','a'],modes:['seal-to-reference-choice'],count:2})
  const imported=await importDocument({fileName:'笔记.txt',text:'未末辨识'})
  await setBookStatus(imported.bookId,'reading')
  await saveAnnotation({bookId:imported.bookId,kind:'excerpt',startOffset:0,endOffset:2,text:'未末辨识',note:'注意横画'})
  await saveReminder({title:'阅读',time:'20:00',weekdays:[1,3],enabled:true,quietStart:'22:00',quietEnd:'07:00',skipCompleted:true})
  recordActivity({id:'complete-a',sessionId:'daily',source:'daily',kind:'completed',characterId:'a',mode:null,correct:null,at:'2026-11-03T01:00:00Z',dateKey:'2026-11-3',seconds:0,timezoneOffset:0})
  await refreshLocalMessages(new Date(2026,10,3,12))
  const original=await readPractice(practice);const backup=await exportBackup()
  for(const table of ADDITIONAL_USER_TABLES)await db.commit((await db.query(table)).map(row=>({table,deleteId:row.id})))
  await restoreBackup(backup)
  expect(await readPractice(practice)).toEqual(original)
  expect((await readCollection(collection)).characterIds).toEqual(['b','a'])
  expect((await listAnnotations(imported.bookId))[0]?.note).toBe('注意横画')
  expect((await readLibraryBook(imported.bookId)).status).toBe('reading')
  expect(await readImportResult(imported.id)).toEqual(imported)
  expect((await listReminders())[0]?.title).toBe('阅读')
  expect(await listMessages()).toHaveLength(1)
  expect(await readActivities()).toHaveLength(1)
})
