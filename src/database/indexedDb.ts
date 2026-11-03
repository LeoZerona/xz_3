import { DATABASE_NAME, DATABASE_VERSION, columns, indexName, indexes, tables, type Row, type Table } from './schema'
import type { Database, Query } from './types'

export function openIndexedDb(): Promise<Database> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      for (const table of tables) {
        const store = request.result.objectStoreNames.contains(table) ? request.transaction!.objectStore(table) : request.result.createObjectStore(table, { keyPath: 'id' })
        for (const fields of indexes(table)) if (!store.indexNames.contains(indexName(fields))) store.createIndex(indexName(fields), fields.length === 1 ? fields[0]! : fields)
      }
    }
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('数据库升级被其他窗口阻塞，请关闭其他窗口后重试'))
    request.onsuccess = () => {
      const db = request.result
      db.onversionchange = () => db.close()
      resolve({
        query(table: Table, query: Query = {}) {
          return new Promise<Row[]>((resolveQuery, rejectQuery) => {
            const transaction = db.transaction(table, 'readonly')
            const store = transaction.objectStore(table)
            const where = query.where ?? {}
            const indexed = indexes(table).find((fields) => fields.every((name, index) => name === query.orderBy && index === fields.length - 1 || where[name] !== undefined && where[name] !== null))
            let source: IDBObjectStore | IDBIndex = store
            let range: IDBKeyRange | undefined
            if (where.id !== undefined && where.id !== null) range = IDBKeyRange.only(where.id)
            else if (indexed) {
              source = store.index(indexName(indexed))
              const prefix = indexed.filter((name) => where[name] !== undefined).map((name) => where[name] as IDBValidKey)
              if (prefix.length === indexed.length) range = IDBKeyRange.only(indexed.length === 1 ? prefix[0]! : prefix)
              else if (prefix.length) range = IDBKeyRange.bound([...prefix, -Infinity], [...prefix, []])
            }
            const rows: Row[] = []
            const matches = (row: Row) => Object.entries(where).every(([key, value]) => row[key] === value) && Object.entries(query.whereIn ?? {}).every(([key, values]) => values.includes(row[key] ?? null))
            const ids = query.whereIn?.id
            if (ids) {
              for (const id of [...new Set(ids)]) {
                if (id === null) continue
                const item = store.get(id)
                item.onsuccess = () => { const row = item.result as Row | undefined; if (row && matches(row)) rows.push(row) }
              }
            } else {
            const cursor = source.openCursor(range, query.descending ? 'prev' : 'next')
            cursor.onsuccess = () => {
              const current = cursor.result
              if (!current) return
              const row = current.value as Row
              if (matches(row)) rows.push(row)
              const isOrdered = !query.orderBy || indexed?.[indexed.length - 1] === query.orderBy
              if (isOrdered && query.limit !== undefined && rows.length >= (query.offset ?? 0) + query.limit) return
              current.continue()
            }
            }
            transaction.oncomplete = () => {
              if (query.orderBy) {
                const name = query.orderBy
                rows.sort((a, b) => {
                  const left = a[name] ?? ''; const right = b[name] ?? ''
                  return (left < right ? -1 : left > right ? 1 : 0) * (query.descending ? -1 : 1)
                })
              }
              const offset = query.offset ?? 0
              resolveQuery(rows.slice(offset, query.limit === undefined ? undefined : offset + query.limit))
            }
            transaction.onabort = () => rejectQuery(transaction.error)
            transaction.onerror = () => rejectQuery(transaction.error)
          })
        },
        commit(changes) {
          if (!changes.length) return Promise.resolve()
          return new Promise<void>((resolveCommit, rejectCommit) => {
            const transaction = db.transaction([...new Set(changes.map((change) => change.table))], 'readwrite')
            try { for (const change of changes) {
              const store = transaction.objectStore(change.table)
              if ('deleteId' in change) store.delete(change.deleteId)
              else {
                const row = Object.fromEntries(columns(change.table).map((name) => [name, change.row[name] ?? null]))
                if (Object.values(row).some((value) => typeof value === 'number' && !Number.isFinite(value))) throw new Error('数据库数值无效')
                if (change.ifAbsent) {
                  const insertion = store.add(row)
                  insertion.onerror = (event) => {
                    // 同一事件重发保留首次事实；其他写入错误仍使事务失败。
                    if (insertion.error?.name === 'ConstraintError') { event.preventDefault(); event.stopPropagation() }
                  }
                } else store.put(row)
              }
            } } catch (error) { transaction.abort(); rejectCommit(error); return }
            transaction.oncomplete = () => resolveCommit()
            transaction.onabort = () => rejectCommit(transaction.error)
            transaction.onerror = () => rejectCommit(transaction.error)
          })
        },
        close() { db.close() },
      })
    }
  })
}
