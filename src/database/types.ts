import type { Cell, Row, Table } from './schema'

export interface Query {
  where?: Record<string, Cell>
  whereIn?: Record<string, Cell[]>
  orderBy?: string
  descending?: boolean
  limit?: number
  offset?: number
}
export type Change = { table: Table; row: Row } | { table: Table; deleteId: string }
export interface Database {
  query(table: Table, query?: Query): Promise<Row[]>
  commit(changes: Change[]): Promise<void>
  close(): void
}
