import { afterEach, expect, it, vi } from 'vitest'
import { readFeatureId } from './routeParams'

afterEach(() => vi.unstubAllGlobals())

it.each([
  ['practice%3Amobile%3A1', 'practice:mobile:1'],
  ['collection%3Amobile', 'collection:mobile'],
  ['practice:already-decoded', 'practice:already-decoded'],
  ['collection%3A%25E6%259C%25AA', 'collection:%E6%9C%AA'],
  ['collection%3A%E6%9C%AA', 'collection:未'],
  ['practice%invalid', 'practice%invalid'],
])('App ID %s 只解码一次且不因无效转义崩溃', (input, expected) => {
  vi.stubGlobal('plus', {})
  expect(readFeatureId(input)).toBe(expected)
})

it('保留 H5 已解码 ID 中的百分号序列，避免二次解码后读错记录', () => {
  vi.stubGlobal('plus', undefined)
  expect(readFeatureId('collection:%3A')).toBe('collection:%3A')
  expect(readFeatureId('practice:mobile')).toBe('practice:mobile')
})

it.each([undefined, null, 1, {}, ['practice:1', 'practice:2']])('不把缺失或重复的参数 %j 转成记录 ID', (input) => {
  expect(readFeatureId(input)).toBe('')
})
