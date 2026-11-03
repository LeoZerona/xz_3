import { readStored } from '../database/persistence'
import { object } from '../database/records'
export function readPlanConfig(now = new Date(), editing = false): Record<string, unknown> {
  const raw = object(readStored('font-learning-plan')); const pending = object(raw.pending)
  return typeof pending.applyAt === 'string' && (editing || now.getTime() >= Date.parse(pending.applyAt)) ? pending : raw
}
