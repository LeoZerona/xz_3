import type { Page } from '@playwright/test'
import type { StudyModeProgress } from '../src/study/learningData'
import type { StudyMode } from '../src/study/modes'

export async function databaseRows(page: Page, table: string): Promise<Array<Record<string, unknown>>> {
  return page.evaluate((name) => new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
    const request = indexedDB.open('font-learning', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      try {
      const transaction = db.transaction(name, 'readonly')
      const get = transaction.objectStore(name).getAll()
      transaction.oncomplete = () => { db.close(); resolve(get.result as Array<Record<string, unknown>>) }
      transaction.onabort = () => { db.close(); reject(transaction.error) }
      } catch (error) { db.close(); reject(error) }
    }
  }), table)
}
export async function characterRecord(page: Page, characterId: string): Promise<{ modes: Record<StudyMode, StudyModeProgress> }> {
  const modes = (await databaseRows(page, 'character_mode_progress')).filter((row) => row.characterId === characterId)
  return { modes: Object.fromEntries(modes.map((row) => [row.mode, row])) as Record<StudyMode, StudyModeProgress> }
}
export async function replaceDatabaseRows(page: Page, table: string, rows: Array<Record<string, unknown>>, deleteIds: string[] = []): Promise<void> {
  await page.evaluate(({ table, rows, deleteIds }) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('font-learning', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      try {
      const transaction = db.transaction(table, 'readwrite')
      const store = transaction.objectStore(table)
      for (const id of deleteIds) store.delete(id)
      for (const row of rows) store.put(row)
      transaction.oncomplete = () => { db.close(); resolve() }
      transaction.onabort = () => { db.close(); reject(transaction.error) }
      } catch (error) { db.close(); reject(error) }
    }
  }), { table, rows, deleteIds })
}
