import { describe, expect, it } from 'vitest'
import { createDefaultProfile, formatProfileLocation, normalizeUserProfile } from './profileModel'

describe('profile model', () => {
  it('uses safe defaults for untrusted stored values', () => {
    expect(normalizeUserProfile({ nickname: '', gender: 'unknown', birthDate: '2035-02-30' }))
      .toEqual(createDefaultProfile())
  })

  it('rejects impossible and future birth dates from persisted input', () => {
    expect(normalizeUserProfile({ birthDate: '2024-02-30' }).birthDate).toBeNull()
    expect(normalizeUserProfile({ birthDate: '2999-01-01' }).birthDate).toBeNull()
  })

  it('keeps valid profile fields and formats the selected district', () => {
    const profile = normalizeUserProfile({
      nickname: '小林',
      gender: '女',
      birthDate: '2008-05-20',
      location: {
        province: { code: '35', name: '福建省' },
        city: { code: '3501', name: '福州市' },
        district: { code: '350102', name: '鼓楼区' },
        selectedLevel: 'district',
        adCode: '350102',
      },
      updatedAt: '2026-10-02T12:00:00.000Z',
    })

    expect(profile.nickname).toBe('小林')
    expect(profile.gender).toBe('女')
    expect(profile.birthDate).toBe('2008-05-20')
    expect(formatProfileLocation(profile.location)).toBe('福建省 福州市 鼓楼区')
  })
})
