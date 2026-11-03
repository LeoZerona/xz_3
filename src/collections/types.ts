export interface Collection {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
  characterCount: number
}
export interface CollectionInput {
  id?: string
  name: string
  description?: string
  characterIds?: readonly string[]
}
export interface CollectionDetail extends Collection { characterIds: string[] }
export type CollectionTab = 'favorites' | 'collections' | 'slashed'
