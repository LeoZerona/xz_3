import {beforeEach,expect,it} from 'vitest'
import {setupTestDatabase} from '../database/testSupport'
import {getDatabase} from '../database/connection'
import {importDocument} from './importer'
import {searchContent} from './search'
beforeEach(async()=>{await setupTestDatabase()})
it('文章包含书名命中，与正文命中合并去重且定位有效',async()=>{
  const first=await importDocument({fileName:'我的旅行日记.txt',text:'昨天去了杭州，天气很好。'})
  const second=await importDocument({fileName:'旅行日记续篇.txt',text:'旅行日记中的第二站。'})
  const found=await searchContent('旅行日记','article',{includeBuiltin:false})
  expect(found.total).toBe(2);expect(new Set(found.entries.map(hit=>hit.bookId))).toEqual(new Set([first.bookId,second.bookId]))
  expect(found.entries.find(hit=>hit.bookId===first.bookId)).toMatchObject({startOffset:0,endOffset:0})
  const next=await searchContent('旅行日记','article',{includeBuiltin:false,offset:1,limit:1});expect(next.entries).toHaveLength(1);expect(next.total).toBe(2)
})
it('跨索引块命中保持原文偏移，句子去重且文章按书籍分组',async()=>{
  const text='甲'.repeat(4093)+'春眠不觉晓。处处闻啼鸟。'
  const result=await importDocument({fileName:'跨块.txt',text})
  const found=await searchContent('春眠不觉晓','sentence',{includeBuiltin:false})
  expect(found.entries).toHaveLength(1)
  expect(found.entries[0]).toMatchObject({bookId:result.bookId,startOffset:4093})
  expect((await searchContent('处处','article',{includeBuiltin:false})).entries).toHaveLength(1)
})
it('组词按词语去重，缺少独立释义时不拼接单字释义',async()=>{
  const db=await getDatabase();await db.commit([{table:'character_words',row:{id:'a',characterId:'one',word:'学习',position:0}},{table:'character_words',row:{id:'b',characterId:'two',word:'学习',position:0}}])
  const found=await searchContent('学习','word',{includeBuiltin:false})
  expect(found.entries).toHaveLength(1)
  expect(found.entries[0]?.characterIds).toEqual(['one','two'])
  expect(found.entries[0]).not.toHaveProperty('definition')
})
