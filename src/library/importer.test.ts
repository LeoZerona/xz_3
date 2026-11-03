import {beforeEach,expect,it} from 'vitest'
import {setupTestDatabase} from '../database/testSupport'
import {getDatabase} from '../database/connection'
import {importDocument} from './importer'
beforeEach(async()=>{await setupTestDatabase()})
it('重复正文提示已有书籍，取消和解析失败不留下半本书',async()=>{
  const first=await importDocument({fileName:'片段.txt',text:'天地玄黄，宇宙洪荒。'})
  expect(first.bookId).toBeTruthy()
  await expect(importDocument({fileName:'重复.txt',text:'天地玄黄，宇宙洪荒。'})).rejects.toThrow('重复')
  const controller=new AbortController();controller.abort()
  await expect(importDocument({fileName:'取消.txt',text:'另一段文字',signal:controller.signal})).rejects.toThrow('取消')
  await expect(importDocument({fileName:'扫描.pdf',buffer:new ArrayBuffer(1),extractPdfText:async()=>''})).rejects.toThrow()
  expect(await(await getDatabase()).query('books')).toHaveLength(1)
})
it('并发导入同一正文不会生成两本重复书',async()=>{
  const results=await Promise.allSettled([importDocument({fileName:'一.txt',text:'重复检测正文'}),importDocument({fileName:'二.txt',text:'重复检测正文'})])
  expect(results.filter(result=>result.status==='fulfilled')).toHaveLength(1)
  expect(await(await getDatabase()).query('books')).toHaveLength(1)
})
