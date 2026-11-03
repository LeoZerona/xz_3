import {ref} from 'vue'
import {onShow} from '@dcloudio/uni-app'
import {readStored,saveStored,flushPersistence} from '../database/persistence'
import {useDatabaseTask} from '../database/useDatabaseTask'
import {createActivityId} from '../learning/activity'
export const LOCAL_ID_KEY='font-learning-local-identity'
const identity=ref('')
export async function ensureLocalIdentity():Promise<string>{
  const current=readStored(LOCAL_ID_KEY)
  if(typeof current==='string'&&/^local-[a-f0-9]{12}$/.test(current)){identity.value=current;return current}
  const id=`local-${createActivityId('identity').replace(/[^a-f0-9]/g,'').slice(-12).padStart(12,'0')}`
  identity.value=id;saveStored(LOCAL_ID_KEY,id);await flushPersistence();return id
}
export function useLocalIdentity(){useDatabaseTask(async()=>{await ensureLocalIdentity()});onShow(()=>{const value=readStored(LOCAL_ID_KEY);if(typeof value==='string')identity.value=value});return identity}
