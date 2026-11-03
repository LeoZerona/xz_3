import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'

// 首次：node build/completeCatalog.mjs <解压后的Unihan16目录> <固定提交word.json>
// 重建：node build/completeCatalog.mjs（只使用仓库内的最小来源快照，不访问网络）
const root='src/data/character-table'
const sourcePath=path.join(root,'sources/tgh-2013-unihan16.json')
const dictionaryPath=path.join(root,'sources/additional-xinhua.json')
const [unihanDirectory,dictionaryFile]=process.argv.slice(2)
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'))
const write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n')
if(unihanDirectory&&dictionaryFile){
  const fields=new Map()
  for(const name of ['Unihan_OtherMappings.txt','Unihan_Readings.txt','Unihan_IRGSources.txt'])for(const line of fs.readFileSync(path.join(unihanDirectory,name),'utf8').split(/\r?\n/)){
    const match=/^U\+([0-9A-F]+)\t(kTGH|kTGHZ2013|kTotalStrokes|kDefinition)\t(.+)$/.exec(line)
    if(!match)continue
    const glyph=String.fromCodePoint(parseInt(match[1],16));const entry=fields.get(glyph)??{glyph};entry[match[2]]=match[3];fields.set(glyph,entry)
  }
  const entries=[...fields.values()].filter(entry=>entry.kTGH?.startsWith('2013:')).map(entry=>({glyph:entry.glyph,position:Number(entry.kTGH.split(':')[1]),
    pinyin:[...new Set((entry.kTGHZ2013??'').split(' ').map(value=>value.split(':').at(-1)?.normalize('NFC')).filter(Boolean))].join('，'),
    strokes:Number(entry.kTotalStrokes?.split(' ')[0]),english:entry.kDefinition??''})).sort((a,b)=>a.position-b.position)
  if(entries.length!==8105||new Set(entries.map(entry=>entry.glyph)).size!==8105)throw Error('Unihan标准序号不完整')
  if(createHash('sha256').update(fs.readFileSync(dictionaryFile)).digest('hex')!=='8ae3453eacc5b0f3fdfba47eac8bb686cd73914d278e8b851ae6ef81082f80e7')throw Error('开源字典与固定提交快照不符')
  write(sourcePath,{unicodeVersion:'16.0.0',property:'kTGH',year:2013,entries})
  const additional=new Set(entries.filter(entry=>entry.position>3500).map(entry=>entry.glyph))
  write(dictionaryPath,read(dictionaryFile).filter(entry=>additional.has(entry.word)).map(({word,radicals,strokes,explanation})=>({word,radicals,strokes,explanation})))
}
const {entries}=read(sourcePath)
const first=read(path.join(root,'level1-characters.json'))
if(entries.length!==8105||!entries.slice(0,3500).every((entry,index)=>entry.glyph===first[index]))throw Error('标准一级字表与已有字表不一致，停止生成')
const dictionary=new Map(read(dictionaryPath).map(entry=>[entry.word,entry]))
const traditional=new Map(fs.readFileSync(path.join(root,'sources/OpenCC-STCharacters.txt'),'utf8').split(/\r?\n/).filter(line=>line&&!line.startsWith('#')).map(line=>{const[key,value]=line.split('\t');return[key,value.split(' ')[0]]}))
for(const level of [2,3]){
  const start=level===2?3500:6500;const end=level===2?6500:8105
  const chars=entries.slice(start,end).map((entry,index)=>{
    if(!entry.pinyin||!Number.isInteger(entry.strokes)||entry.strokes<1)throw Error(`缺少可靠读音或笔画：${entry.glyph}`)
    const source=dictionary.get(entry.glyph)
    return{id:`char-l${level}-${String(index+1).padStart(4,'0')}`,level,
      script_forms:{simplified:entry.glyph,traditional:traditional.get(entry.glyph)??entry.glyph},
      phonetics:{pinyin:entry.pinyin,source:'Unicode 16.0.0 / kTGHZ2013'},
      structure:{radical_id:source?.radicals??'未收录',total_strokes:entry.strokes,layout:'未收录',liushu:'未收录',liushu_detail:'未收录',source:'Unicode16 kTotalStrokes / chinese-xinhua radicals'},
      semantics:{definition:source?.explanation?.trim()||(entry.english?`〔Unihan 英文释义〕${entry.english}`:'未收录'),words:[],source:source?.explanation?'chinese-xinhua@fe6d6c2e':entry.english?'Unicode16 kDefinition':'未收录'},
      shuowen:{source_version:'未收录',original:'未收录',translation:'未收录'},study:{tags:[`${level===2?'二':'三'}级汉字`]},
    }
  })
  write(path.join(root,level===2?'second-level.json':'third-level.json'),{sources:{list:'Unicode16 kTGH 2013',reading:'kTGHZ2013',dictionaryCommit:'fe6d6c2e8baa82187f4c96bbe042e43f96c05666',traditional:'OpenCC STCharacters'},chars})
  console.log(`第${level}级：${chars.length}字，${Math.ceil(chars.length/10)}关`)
}
