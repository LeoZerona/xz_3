import type { CharacterEntry } from '../search/characterSearch'

export interface StudyCharacterEntry extends CharacterEntry {
  structure: CharacterEntry['structure'] & {
    liushu: string
    liushu_detail: string
  }
  shuowen: {
    source_version: string
    original: string
    translation: string
  }
  study: {
    tags: string[]
  }
}
