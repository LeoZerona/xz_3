import type { BookMeta, ReadingProgress } from '../reading/types'
export type BookStatus = 'unread' | 'reading' | 'finished'
export interface BookSummary extends BookMeta { status: BookStatus; textLength: number; annotationCount: number; progress: ReadingProgress | null }
export interface Annotation { id: string; bookId: string; kind: 'bookmark' | 'excerpt'; fingerprint: string; startOffset: number; endOffset: number; quote: string; note: string; tags: string[]; createdAt: string; updatedAt: string }
export interface AnnotationInput { id?: string; bookId: string; kind: 'bookmark' | 'excerpt'; startOffset: number; endOffset: number; text: string; note?: string; tags?: string[] }
