export type Cell = string | number | null
export type Row = { id: string } & Record<string, Cell>
export interface TableSchema {
  columns: Record<string, 'TEXT' | 'INTEGER' | 'REAL'>
  indexes?: string[][]
}

export const DATABASE_NAME = 'font-learning'
export const DATABASE_VERSION = 5
export const schema = {
  meta: { columns: { value: 'TEXT' } },
  settings: { columns: { value: 'TEXT' } },
  characters: {
    columns: { simplified: 'TEXT', traditional: 'TEXT', pinyin: 'TEXT', pinyinSearch: 'TEXT', strokes: 'INTEGER', radical: 'TEXT', layout: 'TEXT', definition: 'TEXT', level: 'INTEGER', position: 'INTEGER' },
    indexes: [['simplified'], ['traditional'], ['pinyinSearch'], ['level', 'position'], ['radical', 'position']],
  },
  character_details: { columns: { liushu: 'TEXT', liushuDetail: 'TEXT', sourceVersion: 'TEXT', original: 'TEXT', translation: 'TEXT', extras: 'TEXT' } },
  character_words: { columns: { characterId: 'TEXT', word: 'TEXT', position: 'INTEGER' }, indexes: [['characterId', 'position'], ['word']] },
  character_sets: { columns: { setId: 'TEXT', characterId: 'TEXT', position: 'INTEGER' }, indexes: [['setId', 'position']] },
  levels: { columns: { category: 'TEXT', position: 'INTEGER', title: 'TEXT', placeholder: 'INTEGER' }, indexes: [['category', 'position']] },
  level_characters: { columns: { levelId: 'TEXT', characterId: 'TEXT', position: 'INTEGER' }, indexes: [['levelId', 'position']] },
  character_progress: { columns: { status: 'TEXT', firstStartedAt: 'TEXT', lastStudiedAt: 'TEXT', completedAt: 'TEXT', favorite: 'INTEGER', favoriteChangedAt: 'TEXT', excluded: 'INTEGER', excludedChangedAt: 'TEXT' }, indexes: [['favorite', 'favoriteChangedAt'], ['excluded']] },
  character_mode_progress: { columns: { characterId: 'TEXT', mode: 'TEXT', attempts: 'INTEGER', mistakes: 'INTEGER', firstAttemptAt: 'TEXT', lastAttemptAt: 'TEXT', completedAt: 'TEXT' }, indexes: [['characterId', 'mode']] },
  character_actions: { columns: { characterId: 'TEXT', action: 'TEXT', at: 'TEXT', position: 'INTEGER' }, indexes: [['characterId', 'position']] },
  daily_sessions: { columns: { currentCharacterId: 'TEXT', reviewedCount: 'INTEGER', studySeconds: 'INTEGER', startedAt: 'TEXT', completedAt: 'TEXT' } },
  daily_session_items: { columns: { dateKey: 'TEXT', characterId: 'TEXT', position: 'INTEGER', learnedPosition: 'INTEGER', assigned: 'INTEGER', learned: 'INTEGER' }, indexes: [['dateKey', 'position']] },
  stage_progress: { columns: { completed: 'INTEGER', updatedAt: 'TEXT' } },
  stage_training: { columns: { completionCount: 'INTEGER', active: 'INTEGER' } },
  stage_training_modes: { columns: { stageId: 'TEXT', characterId: 'TEXT', mode: 'TEXT', completedAt: 'TEXT' }, indexes: [['stageId', 'characterId']] },
  level_review: { columns: { firstLearnedAt: 'TEXT', lastReviewedAt: 'TEXT', dueAt: 'TEXT', step: 'INTEGER', reviewCount: 'INTEGER', forgottenCount: 'INTEGER' }, indexes: [['dueAt']] },
  stage_character_progress: { columns: { stageId: 'TEXT', characterId: 'TEXT', position: 'INTEGER' }, indexes: [['stageId', 'position']] },
  books: { columns: { name: 'TEXT', fileName: 'TEXT', ext: 'TEXT', url: 'TEXT', source: 'TEXT', createdAt: 'INTEGER', position: 'INTEGER', textLength: 'INTEGER' }, indexes: [['source', 'position']] },
  book_chunks: { columns: { bookId: 'TEXT', position: 'INTEGER', startOffset: 'INTEGER', text: 'TEXT' }, indexes: [['bookId', 'position']] },
  reading_progress: { columns: { page: 'INTEGER', rowsPerPage: 'INTEGER', characterOffset: 'INTEGER', charsPerLine: 'INTEGER', tableStyleId: 'TEXT', updatedAt: 'TEXT' }, indexes: [['updatedAt']] },
  activity_events: { columns: { sessionId: 'TEXT', source: 'TEXT', kind: 'TEXT', characterId: 'TEXT', mode: 'TEXT', correct: 'INTEGER', at: 'TEXT', dateKey: 'TEXT', seconds: 'INTEGER', timezoneOffset: 'INTEGER' }, indexes: [['dateKey', 'at'], ['sessionId', 'at'], ['characterId', 'at']] },
  collections: { columns: { name: 'TEXT', description: 'TEXT', createdAt: 'TEXT', updatedAt: 'TEXT' }, indexes: [['updatedAt']] },
  collection_items: { columns: { collectionId: 'TEXT', characterId: 'TEXT', position: 'INTEGER', addedAt: 'TEXT' }, indexes: [['collectionId', 'position'], ['characterId']] },
  practice_sessions: { columns: { name: 'TEXT', source: 'TEXT', sourceId: 'TEXT', modes: 'TEXT', cursor: 'INTEGER', createdAt: 'TEXT', updatedAt: 'TEXT', completedAt: 'TEXT' }, indexes: [['updatedAt']] },
  practice_questions: { columns: { sessionId: 'TEXT', characterId: 'TEXT', mode: 'TEXT', position: 'INTEGER', optionIds: 'TEXT', attempts: 'INTEGER', mistakes: 'INTEGER', firstCorrect: 'INTEGER', completedAt: 'TEXT' }, indexes: [['sessionId', 'position']] },
} satisfies Record<string, TableSchema>

export type Table = keyof typeof schema
export const tables = Object.keys(schema) as Table[]
export function columns(table: Table): string[] { return ['id', ...Object.keys(schema[table].columns)] }
export function createTableSql(table: Table): string {
  return `CREATE TABLE IF NOT EXISTS "${table}" ("id" TEXT PRIMARY KEY NOT NULL,${Object.entries(schema[table].columns).map(([name, type]) => `"${name}" ${type}`).join(',')})`
}
export function indexName(fields: string[]): string { return fields.join('_') }
export function indexes(table: Table): string[][] { const definition: TableSchema = schema[table]; return definition.indexes ?? [] }
