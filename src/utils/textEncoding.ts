import {
  GB18030_POINTER_RANGES,
  GB18030_TWO_BYTE_TABLE,
  GB18030_UNICODE_RANGES,
} from './gb18030Table'

function appendCodePoint(parts: string[], codePoint: number): void {
  if (codePoint <= 0xffff) {
    parts.push(String.fromCharCode(codePoint))
    return
  }
  const normalized = codePoint - 0x10000
  parts.push(String.fromCharCode(0xd800 + (normalized >> 10), 0xdc00 + (normalized & 0x3ff)))
}

function invalidEncoding(encoding: string, index: number): never {
  throw new Error(`${encoding} 数据在第 ${index + 1} 个字节处无效`)
}

/** App-vue 的 JS 引擎可能没有 TextDecoder，因此使用无 Web API 依赖的严格 UTF-8 解码。 */
export function decodeUtf8(bytes: Uint8Array): string {
  const parts: string[] = []
  for (let index = 0; index < bytes.length;) {
    const first = bytes[index]!
    if (first <= 0x7f) {
      parts.push(String.fromCharCode(first))
      index += 1
      continue
    }

    let length = 0
    let codePoint = 0
    let minimum = 0
    if (first >= 0xc2 && first <= 0xdf) {
      length = 2
      codePoint = first & 0x1f
      minimum = 0x80
    } else if (first >= 0xe0 && first <= 0xef) {
      length = 3
      codePoint = first & 0x0f
      minimum = 0x800
    } else if (first >= 0xf0 && first <= 0xf4) {
      length = 4
      codePoint = first & 0x07
      minimum = 0x10000
    } else {
      invalidEncoding('UTF-8', index)
    }

    if (index + length > bytes.length) invalidEncoding('UTF-8', index)
    for (let offset = 1; offset < length; offset += 1) {
      const next = bytes[index + offset]!
      if ((next & 0xc0) !== 0x80) invalidEncoding('UTF-8', index + offset)
      codePoint = (codePoint << 6) | (next & 0x3f)
    }
    if (codePoint < minimum || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
      invalidEncoding('UTF-8', index)
    }
    appendCodePoint(parts, codePoint)
    index += length
  }
  return parts.join('')
}

export function decodeUtf16(bytes: Uint8Array, isLittleEndian: boolean): string {
  if (bytes.length % 2 !== 0) invalidEncoding(isLittleEndian ? 'UTF-16LE' : 'UTF-16BE', bytes.length - 1)
  const parts: string[] = []
  for (let index = 0; index < bytes.length; index += 2) {
    const codeUnit = isLittleEndian
      ? bytes[index]! | (bytes[index + 1]! << 8)
      : (bytes[index]! << 8) | bytes[index + 1]!
    parts.push(String.fromCharCode(codeUnit))
  }
  return parts.join('')
}

function findGb18030Range(pointer: number): number {
  let low = 0
  let high = GB18030_POINTER_RANGES.length - 1
  while (low < high) {
    const middle = low + Math.ceil((high - low) / 2)
    if (GB18030_POINTER_RANGES[middle]! <= pointer) low = middle
    else high = middle - 1
  }
  return low
}

/** 解码 GB18030/GBK，覆盖双字节字表以及 GB18030 四字节扩展区。 */
export function decodeGb18030(bytes: Uint8Array): string {
  const parts: string[] = []
  for (let index = 0; index < bytes.length;) {
    const first = bytes[index]!
    if (first <= 0x7f) {
      parts.push(String.fromCharCode(first))
      index += 1
      continue
    }
    if (first === 0x80) {
      parts.push('€')
      index += 1
      continue
    }
    if (first < 0x81 || first > 0xfe || index + 1 >= bytes.length) invalidEncoding('GB18030', index)

    const second = bytes[index + 1]!
    if (second >= 0x30 && second <= 0x39) {
      if (index + 3 >= bytes.length) invalidEncoding('GB18030', index)
      const third = bytes[index + 2]!
      const fourth = bytes[index + 3]!
      if (third < 0x81 || third > 0xfe || fourth < 0x30 || fourth > 0x39) invalidEncoding('GB18030', index)
      const pointer = (first - 0x81) * 12600 + (second - 0x30) * 1260 + (third - 0x81) * 10 + fourth - 0x30
      const rangeIndex = findGb18030Range(pointer)
      const codePoint = GB18030_UNICODE_RANGES[rangeIndex]!
        + pointer
        - GB18030_POINTER_RANGES[rangeIndex]!
      if (codePoint > 0x10ffff) invalidEncoding('GB18030', index)
      appendCodePoint(parts, codePoint)
      index += 4
      continue
    }

    if (second < 0x40 || second > 0xfe || second === 0x7f) invalidEncoding('GB18030', index)
    const trailOffset = second < 0x7f ? second - 0x40 : second - 0x41
    const character = GB18030_TWO_BYTE_TABLE[(first - 0x81) * 190 + trailOffset]
    if (!character || character === '\uffff') invalidEncoding('GB18030', index)
    parts.push(character)
    index += 2
  }
  return parts.join('')
}
