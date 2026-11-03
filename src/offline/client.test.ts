import {expect,it,vi} from 'vitest'
import {offlineCapability} from './client'
it('普通不安全HTTP说明能力限制，不虚构离线准备成功',()=>{
  vi.stubGlobal('window',{});vi.stubGlobal('isSecureContext',false);vi.stubGlobal('navigator',{})
  expect(offlineCapability()).toMatchObject({supported:false})
  expect(offlineCapability().reason).toContain('HTTPS')
  vi.unstubAllGlobals()
})
