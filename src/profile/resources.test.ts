import {beforeEach,expect,it,vi} from 'vitest'
import {createPinia,setActivePinia} from 'pinia'
import {setupTestDatabase} from '../database/testSupport'
import {loadAssetBuffer} from '../utils/assetLoader'
import {fontCatalog} from '../fonts/catalog'
import {useFontStore} from '../stores/fonts'
import {recoverFontFallback} from './resources'
vi.mock('../utils/assetLoader',()=>({loadAssetBuffer:vi.fn()}))
beforeEach(async()=>{setActivePinia(createPinia());await setupTestDatabase();vi.mocked(loadAssetBuffer).mockReset()})
it('缺失字体时学习与对照两个角色均恢复为实际可读字体',async()=>{
  const bytes=new Uint8Array(16);bytes.set([0,1,0,0]);vi.mocked(loadAssetBuffer).mockImplementation(async url=>{if(url===fontCatalog[0]!.fontSource)throw new Error('missing');return bytes.buffer})
  await recoverFontFallback();const store=useFontStore()
  expect(store.currentFontId).not.toBe(fontCatalog[0]!.id)
  expect(store.referenceFontId).not.toBe(fontCatalog[0]!.id)
})
