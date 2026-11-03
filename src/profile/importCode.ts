import {parseCollectionText} from '../collections/model'
import {object} from '../database/records'
export interface ImportPreview {name:string;characters:string[]}
export function parseImportCode(input:string):ImportPreview{
  let text=input.trim();if(!text||text.length>50000)throw new Error('资料码为空或过长')
  if(text.startsWith('font-learning:collection:')){try{text=decodeURIComponent(text.slice('font-learning:collection:'.length))}catch{throw new Error('资料码编码无效')}}
  if(text.startsWith('{')){
    let raw:Record<string,unknown>;try{raw=object(JSON.parse(text) as unknown)}catch{throw new Error('资料码格式无效')}
    if(raw.format!=='font-learning-collection'||raw.version!==1||Object.keys(raw).some(key=>!['format','version','name','characters'].includes(key))||typeof raw.name!=='string'||!Array.isArray(raw.characters)||raw.characters.some(value=>typeof value!=='string'||Array.from(value).length!==1))throw new Error('只支持本应用字单资料码，不打开外部链接')
    const parsed=parseCollectionText(raw.characters.join(' '));const name=raw.name.trim();if(!name||Array.from(name).length>30||parsed.invalid.length||!parsed.characters.length)throw new Error('字单名称或汉字内容无效');return{name,characters:parsed.characters}
  }
  const parsed=parseCollectionText(text);if(parsed.invalid.length||!parsed.characters.length)throw new Error('只接受汉字或本应用资料码，不打开URL、脚本和其他二维码内容')
  return{name:'导入字单',characters:parsed.characters}
}
