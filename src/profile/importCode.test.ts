import {expect,it} from 'vitest'
import {parseImportCode} from './importCode'
it('只接受本应用资料码或汉字，拒绝URL与脚本，文字去重',()=>{
  expect(parseImportCode('未末未，𠮷')).toMatchObject({characters:['未','末','𠮷']})
  expect(()=>parseImportCode('https://example.com')).toThrow()
  expect(()=>parseImportCode('javascript:alert(1)')).toThrow()
  expect(parseImportCode(JSON.stringify({format:'font-learning-collection',version:1,name:'易混字',characters:['未','末','未']}))).toEqual({name:'易混字',characters:['未','末']})
})
