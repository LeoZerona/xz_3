import { getDatabase } from '../database/connection'
import { flushPersistence } from '../database/persistence'
import { compound } from '../database/keys'
import { createActivityId } from '../learning/activity'
import type { Change, Database } from '../database/types'
import type { Row } from '../database/schema'
import type { Collection, CollectionDetail, CollectionInput } from './types'

async function connection(): Promise<Database> { await flushPersistence(); return getDatabase() }
function fromRow(row: Row, count: number): Collection {
  return { id: row.id, name: String(row.name), description: String(row.description ?? ''),
    createdAt: String(row.createdAt), updatedAt: String(row.updatedAt), characterCount: count }
}
async function validateMembers(db: Database, input: readonly string[]): Promise<string[]> {
  if (!Array.isArray(input) || input.length > 10000 || input.some((id) => typeof id !== 'string' || !id)) throw new Error('字单成员格式无效')
  const ids = [...new Set(input)]
  const found = await db.query('characters', { whereIn: { id: ids } })
  if (found.length !== ids.length) throw new Error('字单包含未收录的文字，请重新选择')
  return ids
}
function memberChanges(id: string, ids: readonly string[], at: string): Change[] {
  return ids.map((characterId, position) => ({ table: 'collection_items', row: { id: compound(id, characterId),
    collectionId: id, characterId, position, addedAt: at } }))
}

export async function listCollections(options: { query?: string; limit?: number; offset?: number } = {}): Promise<Collection[]> {
  const db = await connection()
  const query = options.query?.trim().toLocaleLowerCase() ?? ''
  const rows = (await db.query('collections', { orderBy: 'updatedAt', descending: true }))
    .filter((row) => !query || `${row.name} ${row.description}`.toLocaleLowerCase().includes(query))
    .slice(options.offset ?? 0, (options.offset ?? 0) + (options.limit ?? 50))
  const members = await db.query('collection_items', { whereIn: { collectionId: rows.map((row) => row.id) } })
  return rows.map((row) => fromRow(row, members.filter((member) => member.collectionId === row.id).length))
}

export async function readCollection(id: string): Promise<CollectionDetail> {
  const db = await connection()
  const row = (await db.query('collections', { where: { id } }))[0]
  if (!row) throw new Error('这个字单已不存在，请返回列表')
  const members = await db.query('collection_items', { where: { collectionId: id }, orderBy: 'position' })
  return { ...fromRow(row, members.length), characterIds: members.map((member) => String(member.characterId)) }
}

export async function saveCollection(input: CollectionInput): Promise<string> {
  const name = input.name.trim()
  const description = (input.description ?? '').trim()
  if (!name || Array.from(name).length > 30) throw new Error('字单名称需为 1–30 个字')
  if (Array.from(description).length > 500) throw new Error('字单说明不能超过 500 个字')
  const db = await connection()
  const existing = input.id ? (await db.query('collections', { where: { id: input.id } }))[0] : undefined
  if (input.id && !existing) throw new Error('这个字单已不存在，请返回列表')
  const ids = input.characterIds === undefined ? undefined : await validateMembers(db, input.characterIds)
  const id = input.id ?? createActivityId('collection')
  const at = new Date().toISOString()
  const changes: Change[] = [{ table: 'collections', row: { id, name, description, createdAt: existing?.createdAt ?? at, updatedAt: at } }]
  if (ids) {
    const previous = await db.query('collection_items', { where: { collectionId: id } })
    changes.push(...previous.map((row): Change => ({ table: 'collection_items', deleteId: row.id })), ...memberChanges(id, ids, at))
  }
  await db.commit(changes)
  return id
}

export async function setCollectionMembers(id: string, characterIds: readonly string[]): Promise<void> {
  const current = await readCollection(id)
  await saveCollection({ id, name: current.name, description: current.description, characterIds })
}

export async function deleteCollection(id: string): Promise<void> {
  const db = await connection()
  const members = await db.query('collection_items', { where: { collectionId: id } })
  await db.commit([{ table: 'collections', deleteId: id },
    ...members.map((row): Change => ({ table: 'collection_items', deleteId: row.id }))])
}
