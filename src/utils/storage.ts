import { flushPersistence, initializePersistence, readStored, saveStored } from '../database/persistence'

export async function readLocal<T>(key: string): Promise<T | null> {
  await initializePersistence()
  return (readStored(key) as T | undefined) ?? null
}
export async function writeLocal<T>(key: string, value: T): Promise<void> {
  await initializePersistence()
  saveStored(key, value)
  await flushPersistence()
}
