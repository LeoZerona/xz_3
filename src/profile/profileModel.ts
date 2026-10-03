import {
  GENDER_OPTIONS,
  PROFILE_SCHEMA_VERSION,
  type AdministrativeLevel,
  type Gender,
  type ProfileLocation,
  type RegionReference,
  type UserProfile,
} from './types'

export const DEFAULT_NICKNAME = '试用17908178540418472'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized && normalized.length <= maxLength ? normalized : null
}

function normalizeRegionReference(value: unknown): RegionReference | null {
  if (!isRecord(value)) return null
  const code = normalizeText(value.code, 12)
  const name = normalizeText(value.name, 40)
  return code && name ? { code, name } : null
}

function isAdministrativeLevel(value: unknown): value is AdministrativeLevel {
  return value === 'province' || value === 'city' || value === 'district'
}

function normalizeLocation(value: unknown): ProfileLocation | null {
  if (!isRecord(value)) return null
  const province = normalizeRegionReference(value.province)
  const city = value.city === null ? null : normalizeRegionReference(value.city)
  const district = value.district === null ? null : normalizeRegionReference(value.district)
  const adCode = normalizeText(value.adCode, 12)
  const selectedLevel = value.selectedLevel
  if (!province || !adCode || !isAdministrativeLevel(selectedLevel)) return null
  if (selectedLevel === 'city' && !city) return null
  if (selectedLevel === 'district' && !district) return null
  return { province, city, district, selectedLevel, adCode }
}

function isGender(value: unknown): value is Gender {
  return GENDER_OPTIONS.some((gender) => gender === value)
}

function localDateString(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeBirthDate(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  if (year === undefined || month === undefined || day === undefined) return null
  const parsed = new Date(year, month - 1, day)
  const isRealDate = parsed.getFullYear() === year
    && parsed.getMonth() === month - 1
    && parsed.getDate() === day
  if (!isRealDate || value < '1900-01-01' || value > localDateString(new Date())) return null
  return value
}

export function createDefaultProfile(): UserProfile {
  return {
    version: PROFILE_SCHEMA_VERSION,
    nickname: DEFAULT_NICKNAME,
    gender: '保密',
    birthDate: null,
    location: null,
    updatedAt: null,
  }
}

export function normalizeUserProfile(value: unknown): UserProfile {
  if (!isRecord(value)) return createDefaultProfile()
  return {
    version: PROFILE_SCHEMA_VERSION,
    nickname: normalizeText(value.nickname, 24) ?? DEFAULT_NICKNAME,
    gender: isGender(value.gender) ? value.gender : '保密',
    birthDate: normalizeBirthDate(value.birthDate),
    location: normalizeLocation(value.location),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : null,
  }
}

export function formatProfileLocation(location: ProfileLocation | null) {
  if (!location) return '未填写'
  const names = [location.province.name, location.city?.name, location.district?.name]
    .filter((name): name is string => Boolean(name))
  return [...new Set(names)].join(' ')
}
