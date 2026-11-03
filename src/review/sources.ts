import { readStored } from '../database/persistence'
import { object } from '../database/records'
import { useLevelReviewStore } from '../stores/levelReview'
import { orderReviewIds } from '../study/levelReview'

export type ReviewSource = 'daily' | 'level'
export const REVIEW_SOURCES_KEY = 'font-learning-review-sources'
export function readReviewSources(): Record<string, ReviewSource[]> {
  return Object.fromEntries(Object.entries(object(readStored(REVIEW_SOURCES_KEY))).map(([id, values]) => [id,
    Array.isArray(values) ? values.filter((value): value is ReviewSource => value === 'daily' || value === 'level') : []]))
}
export async function listDueReviews(source?: ReviewSource, includeFuture = false) {
  const store = useLevelReviewStore()
  store.hydrate()
  await store.migrateLearnedCharacters()
  const ids = Object.keys(store.records).filter((id) => !source || store.hasSource(id, source))
  return orderReviewIds(store.records, ids, Date.now(), includeFuture).map((characterId) => ({ characterId, ...store.records[characterId]! }))
}
