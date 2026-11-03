import fs from 'node:fs'

// 用法：node build/completeLevelOne.mjs <3500字表路径> <chinese-xinhua/data/word.json路径>
// 只补缺字，旧字 ID / 顺序不变；不根据现代释义编造说文、六书或结构。
const [listFile, dictionaryFile] = process.argv.slice(2)
if (!listFile || !dictionaryFile) throw new Error('请提供一级字表与字典路径')
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const list = read(listFile)
if (list.length !== 3500 || new Set(list).size !== 3500) throw new Error('一级字表必须包含 3500 个不重复文字')
const legacy = Array.from({ length: 13 }, (_, index) => read(`src/data/character-table/firstLevel/${index + 1}.json`).chars).flat()
const existing = new Set(legacy.map((entry) => entry.script_forms.simplified))
if (legacy.some((entry) => !list.includes(entry.script_forms.simplified))) throw new Error('旧字库中有一级字表之外的字，需人工核对')
const dictionary = new Map(read(dictionaryFile).map((entry) => [entry.word, entry]))
const traditional = new Map(fs.readFileSync('src/data/character-table/sources/OpenCC-STCharacters.txt', 'utf8').split(/\r?\n/).filter((line) => line && !line.startsWith('#')).map((line) => {
  const [simplified, variants] = line.split('\t')
  return [simplified, variants.split(' ')[0]]
}))
const chars = list.flatMap((word, index) => {
  if (existing.has(word)) return []
  const source = dictionary.get(word)
  if (!source || !source.pinyin || !source.explanation || !Number.isFinite(Number(source.strokes))) throw new Error(`字典未收录：${word}`)
  return [{
    id: `char-l1-${String(index + 1).padStart(4, '0')}`, level: 1,
    // oldword 存在转码错误，繁体采用 OpenCC 的首选单字映射。
    script_forms: { simplified: word, traditional: traditional.get(word) ?? word }, phonetics: { pinyin: source.pinyin },
    structure: { radical_id: source.radicals, total_strokes: Number(source.strokes), layout: '未收录', liushu: '未收录', liushu_detail: '未收录' },
    shuowen: { source_version: '未收录', original: '未收录', translation: '未收录' },
    semantics: { definition: source.explanation.trim(), words: [] }, study: { tags: ['一级汉字', '补充字表'] },
  }]
})
fs.writeFileSync('src/data/character-table/level1-characters.json', JSON.stringify(list, null, 2) + '\n')
fs.writeFileSync('src/data/character-table/first-level-supplement.json', JSON.stringify({ chars }, null, 2) + '\n')
console.log(`保留 ${legacy.length} 字，补齐 ${chars.length} 字，共 ${legacy.length + chars.length} 字`)
