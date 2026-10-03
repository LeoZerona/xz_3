import { ref } from 'vue'
import { defineStore } from 'pinia'
import { createDefaultProfile, normalizeUserProfile } from '../profile/profileModel'
import { PROFILE_STORAGE_KEY, type UserProfilePatch } from '../profile/types'
import { readLocal, writeLocal } from '../utils/storage'

export const useProfileStore = defineStore('profile', () => {
  const profile = ref(createDefaultProfile())
  const isInitialized = ref(false)
  let initializePromise: Promise<void> | null = null

  function initialize() {
    if (isInitialized.value) return Promise.resolve()
    if (initializePromise) return initializePromise

    initializePromise = readLocal<unknown>(PROFILE_STORAGE_KEY)
      .then((stored) => {
        profile.value = normalizeUserProfile(stored)
        isInitialized.value = true
      })
      .finally(() => { initializePromise = null })
    return initializePromise
  }

  async function updateProfile(patch: UserProfilePatch) {
    await initialize()
    const nextProfile = normalizeUserProfile({
      ...profile.value,
      ...patch,
      updatedAt: new Date().toISOString(),
    })
    await writeLocal(PROFILE_STORAGE_KEY, nextProfile)
    profile.value = nextProfile
  }

  return { profile, isInitialized, initialize, updateProfile }
})
