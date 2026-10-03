export const PROFILE_STORAGE_KEY = 'morning-pages:user-profile'
export const PROFILE_SCHEMA_VERSION = 1 as const

export const GENDER_OPTIONS = ['保密', '男', '女'] as const

export type Gender = (typeof GENDER_OPTIONS)[number]
export type AdministrativeLevel = 'province' | 'city' | 'district'

export interface RegionReference {
  code: string
  name: string
}

export interface ProfileLocation {
  province: RegionReference
  city: RegionReference | null
  district: RegionReference | null
  selectedLevel: AdministrativeLevel
  adCode: string
}

export interface UserProfile {
  version: typeof PROFILE_SCHEMA_VERSION
  nickname: string
  gender: Gender
  birthDate: string | null
  location: ProfileLocation | null
  updatedAt: string | null
}

export type UserProfilePatch = Partial<Pick<UserProfile, 'nickname' | 'gender' | 'birthDate' | 'location'>>
