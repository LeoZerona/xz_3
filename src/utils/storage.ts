const DATABASE = 'morning-pages'
const STORE = 'settings'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('IndexedDB upgrade is blocked'))
  })
}

async function readIndexedDB<T>(key: string): Promise<T | null> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readonly')
    const request = transaction.objectStore(STORE).get(key)
    request.onsuccess = () => resolve((request.result as T | undefined) ?? null)
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
    transaction.oncomplete = () => db.close()
    transaction.onabort = () => {
      db.close()
      reject(transaction.error)
    }
  })
}

async function writeIndexedDB<T>(key: string, value: T): Promise<void> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite')
    transaction.objectStore(STORE).put(value, key)
    transaction.oncomplete = () => { db.close(); resolve() }
    transaction.onerror = () => { db.close(); reject(transaction.error) }
    transaction.onabort = () => { db.close(); reject(transaction.error) }
  })
}

export async function readLocal<T>(key: string): Promise<T | null> {
  if (typeof indexedDB !== 'undefined') {
    try { return await readIndexedDB<T>(key) } catch { /* 降级到 uni Storage */ }
  }
  try { return (uni.getStorageSync(key) as T | undefined) ?? null } catch { return null }
}

export async function writeLocal<T>(key: string, value: T): Promise<void> {
  if (typeof indexedDB !== 'undefined') {
    try { await writeIndexedDB(key, value); return } catch { /* 降级到 uni Storage */ }
  }
  uni.setStorageSync(key, value)
}
