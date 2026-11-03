import {beforeEach,expect,it} from 'vitest'
import {setupTestDatabase} from '../database/testSupport'
import {getDatabase} from '../database/connection'
import {importDocument} from './importer'
import {searchContent} from './search'
beforeEach(async()=>{await setupTestDatabase()})
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
