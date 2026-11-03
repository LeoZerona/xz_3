import { describe, expect, it } from 'vitest'
import { setupTestDatabase } from './testSupport'
import { exportBackup, restoreBackup } from './backup'
import { flushPersistence, readStored, saveStored } from './persistence'
import { addCustomBook, readCustomBookText } from '../reading/customBooks'

describe('备份恢复', () => {
  it('兼容尚未包含训练与复习表的旧备份', async () => {
    const db = await setupTestDatabase()
    saveStored('font-learning-theme', 'jade-green')
    const backup = JSON.parse(await exportBackup()) as { data: Record<string, unknown> }
    for (const table of ['stage_training', 'stage_training_modes', 'level_review']) delete backup.data[table]
    await restoreBackup(JSON.stringify(backup))
    expect(readStored('font-learning-theme')).toBe('jade-green')
    expect(await db.query('level_review')).toEqual([])
  })
  it('恢复用户数据及书籍正文，并保存恢复前快照', async () => {
    const db = await setupTestDatabase()
    saveStored('font-learning-theme', 'jade-green')
    await addCustomBook({ id: 'backup-book', name: '书', fileName: '书.txt', ext: 'txt', source: 'custom', createdAt: 1, url: '', text: '备份正文' })
    const backup = await exportBackup()
    saveStored('font-learning-theme', 'ink-night')
    await flushPersistence()
    await restoreBackup(backup)
    expect(readStored('font-learning-theme')).toBe('jade-green')
    expect(await readCustomBookText('backup-book')).toBe('备份正文')
    const snapshot = (await db.query('meta', { where: { id: 'before-restore-backup' } }))[0]
    expect(String(snapshot?.value)).toContain('ink-night')
  })
  it('拒绝未知表和损坏字段，校验失败不改变数据库', async () => {
    const db = await setupTestDatabase()
    saveStored('font-learning-theme', 'jade-green')
    const backup = await exportBackup()
    const unknown = JSON.parse(backup) as { data: Record<string, unknown> }
    unknown.data.characters = []
    await expect(restoreBackup(JSON.stringify(unknown))).rejects.toThrow('未知数据表')
    const invalid = JSON.parse(backup) as { data: { settings: Array<Record<string, unknown>> } }
    invalid.data.settings[0]!.value = 7
    await expect(restoreBackup(JSON.stringify(invalid))).rejects.toThrow('字段类型无效')
    expect(readStored('font-learning-theme')).toBe('jade-green')
    expect(await db.query('meta', { where: { id: 'before-restore-backup' } })).toHaveLength(0)
  })
})
