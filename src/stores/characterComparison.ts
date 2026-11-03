import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getCharacters } from '../database/catalog'
import { readStored, reportPersistenceError, saveStored } from '../database/persistence'
import { appendComparisonCharacters, COMPARISON_STORAGE_KEY, normalizeComparisonIds } from '../comparison/characterComparison'
import type { CharacterEntry } from '../search/characterSearch'
import type { ComparisonAddition } from '../comparison/characterComparison'

export const useCharacterComparisonStore = defineStore('characterComparison', () => {
  const characters = ref<CharacterEntry[]>([])
  const selectedIds = computed(() => characters.value.map((entry) => entry.id))

  async function hydrate(): Promise<void> {
    const ids = normalizeComparisonIds(readStored(COMPARISON_STORAGE_KEY))
    const restored = await getCharacters(ids)
    characters.value = appendComparisonCharacters([], restored).characters
  }
  function updateCharacters(next: CharacterEntry[]): boolean {
    try {
      saveStored(COMPARISON_STORAGE_KEY, next.map((entry) => entry.id))
      characters.value = next
      return true
    } catch (error) {
      reportPersistenceError(error)
      return false
    }
  }
  function addCharacters(entries: readonly CharacterEntry[]): ComparisonAddition {
    const result = appendComparisonCharacters(characters.value, entries)
    if (result.addedCount) result.saved = updateCharacters(result.characters)
    return result
  }
  function removeCharacter(id: string): boolean { return updateCharacters(characters.value.filter((entry) => entry.id !== id)) }
  function clearCharacters(): boolean { return updateCharacters([]) }

  return { characters, selectedIds, hydrate, addCharacters, removeCharacter, clearCharacters }
})
