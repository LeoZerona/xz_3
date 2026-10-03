import { describe, expect, it } from 'vitest'
import { chinaRegions } from './chinaRegions'

describe('china region data', () => {
  it('contains all provincial-level regions and county-level Fujian data', () => {
    expect(chinaRegions).toHaveLength(34)
    const fujian = chinaRegions.find((region) => region.name === '福建省')
    const fuzhou = fujian?.children.find((region) => region.name === '福州市')
    expect(fuzhou?.children.some((region) => region.name === '鼓楼区')).toBe(true)
  })
})
