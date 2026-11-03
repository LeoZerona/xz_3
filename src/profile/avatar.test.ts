import {beforeEach,expect,it,vi} from 'vitest'
import {setupTestDatabase} from '../database/testSupport'
import {readStored} from '../database/persistence'
import {saveAvatar,AVATAR_KEY} from './avatar'
import {ensureLocalIdentity} from './identity'
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN5sAAAAASUVORK5CYII='
it('原生JS环境没有atob时仍可保存有效头像',async()=>{
  vi.stubGlobal('atob',undefined)
  try{await saveAvatar({dataUrl:png,sourceBytes:100});expect(readStored(AVATAR_KEY)).toBe(png)}finally{vi.unstubAllGlobals()}
})
beforeEach(async()=>{await setupTestDatabase()})
it('非法图片或超大源图不覆盖原头像，正确小图进入备份状态',async()=>{
  await saveAvatar({dataUrl:png,sourceBytes:100})
  await expect(saveAvatar({dataUrl:'data:image/svg+xml,<svg/>',sourceBytes:20})).rejects.toThrow('图片')
  await expect(saveAvatar({dataUrl:png,sourceBytes:3*1024*1024})).rejects.toThrow('2MB')
  expect(readStored(AVATAR_KEY)).toBe(png)
})
it('本机档案ID持久且不会用固定演示ID',async()=>{
  const id=await ensureLocalIdentity();expect(id).toMatch(/^local-[a-f0-9]{12}$/)
  expect(await ensureLocalIdentity()).toBe(id)
})
