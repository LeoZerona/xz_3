import type { BookMeta } from "./types"

export const CUSTOM_BOOKS_KEY = "reading:customBooks"

export interface CustomBookRecord extends BookMeta {
  source: "custom"
  createdAt: number
  text: string
}

function safeParse(raw: unknown): CustomBookRecord[] {
  if (!Array.isArray(raw)) return []
  const out: CustomBookRecord[] = []
  for (const item of raw) {
    if (!item || typeof item !== "object") continue
    const r = item as Partial<CustomBookRecord>
    if (typeof r.id !== "string" || typeof r.name !== "string" || typeof r.fileName !== "string" || typeof r.ext !== "string" || typeof r.text !== "string") continue
    if (r.ext !== "txt" && r.ext !== "pdf") continue
    out.push({
      id: r.id,
      name: r.name,
      fileName: r.fileName,
      ext: r.ext as "txt" | "pdf",
      url: typeof r.url === "string" ? r.url : "",
      source: "custom",
      createdAt: typeof r.createdAt === "number" ? r.createdAt : Date.now(),
      text: r.text,
    })
  }
  return out
}

export function readCustomBooks(): CustomBookRecord[] {
  try {
    const raw = uni.getStorageSync(CUSTOM_BOOKS_KEY) as unknown
    return safeParse(raw)
  } catch {
    return []
  }
}

export function writeCustomBooks(list: CustomBookRecord[]): void {
  try {
    uni.setStorageSync(CUSTOM_BOOKS_KEY, list)
  } catch {}
}

export function getCustomBookById(id: string): CustomBookRecord | undefined {
  return readCustomBooks().find((b) => b.id === id)
}

export function addCustomBook(record: CustomBookRecord): void {
  const list = readCustomBooks()
  const idx = list.findIndex((b) => b.id === record.id)
  if (idx >= 0) list.splice(idx, 1, record)
  else list.unshift(record)
  writeCustomBooks(list)
}

export function removeCustomBook(id: string): void {
  const list = readCustomBooks()
  const next = list.filter((b) => b.id !== id)
  writeCustomBooks(next)
}

export function generateCustomId(fileName: string): string {
  const base = fileName.toLowerCase().replace(/\.(txt|pdf)$/i, "").replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-|-$/g, "") || "custom"
  return base + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6)
}

export function createCustomRecord(fileName: string, text: string, ext: "txt" | "pdf"): CustomBookRecord {
  const name = fileName.replace(/\.(txt|pdf)$/i, "")
  return {
    id: generateCustomId(fileName),
    name,
    fileName,
    ext,
    url: "",
    source: "custom",
    createdAt: Date.now(),
    text,
  }
}
