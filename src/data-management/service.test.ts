import {beforeEach,expect,it} from 'vitest'
import {setupTestDatabase} from '../database/testSupport'
import {exportBackup,restoreBackup} from '../database/backup'
import {readStored,saveStored,flushPersistence} from '../database/persistence'
import {addCustomBook,readCustomBookText} from '../reading/customBooks'
import {clearRebuildableCache,previewBackup,saveFeedback,listFeedback,exportFeedback,restorePreviousSnapshot} from './service'
beforeEach(async()=>{await setupTestDatabase()})
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
