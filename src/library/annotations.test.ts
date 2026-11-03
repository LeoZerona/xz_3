import { beforeEach, expect, it } from 'vitest'
import { setupTestDatabase } from '../database/testSupport'
import { addCustomBook, createCustomRecord } from '../reading/customBooks'
import { getDatabase } from '../database/connection'
import { saveAnnotation, listAnnotations, checkAnnotation, renderedOffsetForRaw, rawOffsetForRendered } from './annotations'
import { deleteBookWithRelations } from './repository'
import { exportBackup, restoreBackup } from '../database/backup'
import { deleteAnnotation } from './annotations'
let bookId = ''
const text = '  春眠不觉晓。\r\n  处处闻啼鸟。\n夜来风雨声。'
beforeEach(async () => { await setupTestDatabase(); const book = createCustomRecord('春晓.txt', text, 'txt'); bookId = book.id; await addCustomBook(book) })
it('UTF-16 原文锚点与阅读器去空白后的偏移互换，排版不改原锚点', () => {
  const start = text.indexOf('处处')
  expect(renderedOffsetForRaw(text, start)).toBe(6)
  expect(rawOffsetForRendered(text, 6)).toBe(start)
})
it('书签摘录与笔记持久保存，正文变化明确失效，删书不删学习', async () => {
  const start = text.indexOf('处处'); const end = start + 6
  const id = await saveAnnotation({ bookId, kind: 'excerpt', startOffset: start, endOffset: end, text, note: '听觉描写', tags: ['诗词'] })
  let items = await listAnnotations(bookId)
  expect(items[0]).toMatchObject({ id, quote: '处处闻啼鸟。', note: '听觉描写', tags: ['诗词'] })
  expect(checkAnnotation(items[0]!, text)).toBe('valid')
  expect(checkAnnotation(items[0]!, 'changed')).toBe('changed')
  const db = await getDatabase(); await db.commit([{table:'character_progress',row:{id:'one',status:'completed'}}])
  await deleteBookWithRelations(bookId)
  items = await listAnnotations(bookId)
  expect(items).toEqual([])
  expect(await db.query('books')).toEqual([])
  expect(await db.query('book_chunks')).toEqual([])
  expect(await db.query('character_progress')).toHaveLength(1)
})
it('备份往返保留书签锚点及原文，不依赖页码', async () => {
  const id = await saveAnnotation({bookId,kind:'bookmark',startOffset:2,endOffset:8,text,note:'第一句'})
  const backup = await exportBackup()
  await deleteAnnotation(id)
  await restoreBackup(backup)
  expect((await listAnnotations(bookId))[0]).toMatchObject({id,startOffset:2,endOffset:8,quote:'春眠不觉晓。',note:'第一句'})
})
