import { beforeEach, describe, expect, it } from 'vitest'
import { setupTestDatabase } from '../database/testSupport'
import { exportBackup, restoreBackup } from '../database/backup'
import { deleteCollection, listCollections, readCollection, saveCollection, setCollectionMembers } from './repository'

beforeEach(async () => {
  const db = await setupTestDatabase()
  await db.commit([
    { table: 'characters', row: { id: 'char-a', simplified: '未', traditional: '未', position: 0 } },
    { table: 'characters', row: { id: 'char-b', simplified: '末', traditional: '末', position: 1 } },
    { table: 'character_progress', row: { id: 'char-a', status: 'completed', favorite: 1, excluded: 0 } },
  ])
})

describe('自定义字单', () => {
  it('校验名称和成员，去重且保留顺序', async () => {
    await expect(saveCollection({ name: '  ' })).rejects.toThrow('名称')
    const id = await saveCollection({ name: '  易混字  ', description: '比较横画', characterIds: ['char-b', 'char-a', 'char-b'] })
    expect(await readCollection(id)).toMatchObject({ name: '易混字', description: '比较横画', characterIds: ['char-b', 'char-a'], characterCount: 2 })
    expect(await listCollections()).toHaveLength(1)
    await expect(setCollectionMembers(id, ['missing'])).rejects.toThrow('未收录')
    expect((await readCollection(id)).characterIds).toEqual(['char-b', 'char-a'])
  })

  it('删除字单只移除分组和成员，收藏及长期学习保留', async () => {
    const id = await saveCollection({ name: '待练习', characterIds: ['char-a'] })
    await deleteCollection(id)
    expect(await listCollections()).toEqual([])
    const backup = JSON.parse(await exportBackup()) as { data: Record<string, Array<Record<string, unknown>>> }
    expect(backup.data.collection_items).toEqual([])
    expect(backup.data.character_progress).toMatchObject([{ id: 'char-a', favorite: 1, status: 'completed' }])
  })

  it('备份恢复字单和成员，旧备份没有字单表仍可读', async () => {
    const id = await saveCollection({ name: '我的字单', characterIds: ['char-a', 'char-b'] })
    const text = await exportBackup()
    await setCollectionMembers(id, [])
    await restoreBackup(text)
    expect((await readCollection(id)).characterIds).toEqual(['char-a', 'char-b'])
    const old = JSON.parse(text) as { data: Record<string, unknown> }
    delete old.data.collections; delete old.data.collection_items
    await restoreBackup(JSON.stringify(old))
    expect(await listCollections()).toEqual([])
  })
})
