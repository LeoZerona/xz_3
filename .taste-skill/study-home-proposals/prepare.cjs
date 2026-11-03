const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const project = path.resolve(__dirname, '../..')
// The real built-in catalog supplies every glyph and pronunciation in the designs.
const catalog = JSON.parse(fs.readFileSync(path.join(project, 'src/data/character-table/firstLevel/1.json'), 'utf8')).chars
const characters = catalog.slice(0, 15).map(row => ({ id: row.id, text: row.script_forms.simplified, pinyin: row.phonetics.pinyin }))
const tracked = ['src/pages/index/index.vue', 'src/pages.json', 'src/styles/theme.css', 'package.json', 'pnpm-lock.yaml']
const before = Object.fromEntries(tracked.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(project, file))).digest('hex')]))
fs.writeFileSync(path.join(__dirname, 'source-before.json'), JSON.stringify(before, null, 2))
fs.writeFileSync(path.join(__dirname, 'data.js'), 'window.designData = ' + JSON.stringify({ characters, dailyTarget: 15, reviewTarget: 20 }, null, 2) + '\n')
console.log('Prepared ' + characters.length + ' catalog characters; recorded source hashes.')
