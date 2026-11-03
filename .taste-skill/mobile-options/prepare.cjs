const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const crypto = require('node:crypto')
const ts = require('typescript')

const project = process.cwd()
const themeModule = { exports: {} }
const compiled = ts.transpileModule(fs.readFileSync('src/theme/themes.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
vm.runInNewContext(compiled, { exports: themeModule.exports, module: themeModule })
const characters = new Map()
for (let shard = 1; shard <= 13; shard += 1) {
  const data = JSON.parse(fs.readFileSync(`src/data/character-table/firstLevel/${shard}.json`, 'utf8'))
  for (const entry of data.chars) if (!characters.has(entry.id)) characters.set(entry.id, entry)
}
const entries = [...characters.values()]
const total = Math.ceil(entries.length / 10)
const stages = Array.from({ length: 24 }, (_, position) => ({
  index: position + 1,
  title: `关卡 ${String(position + 1).padStart(2, '0')}`,
  characters: entries.slice(position * 10, position * 10 + 10).map((entry) => ({
    id: entry.id,
    text: entry.script_forms.simplified,
    pinyin: entry.phonetics.pinyin,
  })),
}))
fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify({
  total, stages, themes: themeModule.exports.themes,
}, null, 2))

const sourceFiles = [
  'src/pages/levels/index.vue',
  ...fs.readdirSync('src/pages/levels/components').filter((name) => name.endsWith('.vue')).map((name) => `src/pages/levels/components/${name}`),
  'e2e/levels-design.spec.ts',
]
const hashes = Object.fromEntries(sourceFiles.map((file) => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(project, file))).digest('hex')]))
fs.writeFileSync(path.join(__dirname, 'source-before.json'), JSON.stringify(hashes, null, 2))
process.stdout.write(`Prepared ${stages.length} real stages, ${total} total, ${themeModule.exports.themes.length} themes.\n`)
