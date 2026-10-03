import compactRegionData from '../data/china-regions.json'

interface CompactRegionNode {
  c: string
  n: string
  d?: CompactRegionNode[]
}

export interface RegionNode {
  code: string
  name: string
  children: RegionNode[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseCompactRegion(value: unknown): CompactRegionNode | null {
  if (!isRecord(value) || typeof value.c !== 'string' || typeof value.n !== 'string') return null
  const children = Array.isArray(value.d)
    ? value.d.map(parseCompactRegion).filter((item): item is CompactRegionNode => item !== null)
    : undefined
  return { c: value.c, n: value.n, ...(children ? { d: children } : {}) }
}

function expandRegion(node: CompactRegionNode): RegionNode {
  return {
    code: node.c,
    name: node.n,
    children: (node.d ?? []).map(expandRegion),
  }
}

const source: unknown = compactRegionData

export const chinaRegions: RegionNode[] = Array.isArray(source)
  ? source.map(parseCompactRegion).filter((item): item is CompactRegionNode => item !== null).map(expandRegion)
  : []
