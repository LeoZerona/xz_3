/** H5 已解码 onLoad 参数，App 则保留调用方的 encodeURIComponent 编码。 */
export function readFeatureId(value: unknown): string {
  if (typeof value !== 'string') return ''
  if (typeof plus === 'undefined') return value
  try { return decodeURIComponent(value) }
  catch (cause) {
    // 外部链接编码不完整时保留原值，由页面显示已有的“记录不存在”反馈。
    if (cause instanceof URIError) return value
    throw cause
  }
}
