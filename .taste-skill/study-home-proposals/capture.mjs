import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { Browser, sleep } from 'file:///C:/Users/22640/.codex/skills/design-taste-frontend/scripts/lib/cdp.mjs'

const root = resolve('.taste-skill/study-home-proposals')
mkdirSync(resolve(root, 'captures'), { recursive: true })
const results = []
const browser = await Browser.launch()
async function ready(page) {
  for (let i=0;i<100;i++) {
    if (await page.eval("document.documentElement.dataset.ready === 'true'")) return
    await sleep(100)
  }
  throw new Error('Preview did not load')
}
try {
  const page = await browser.newPage({ width: 1440, height: 1200 })
  for (const key of ['a','b','c']) {
    for (const width of [390,320,768,1440]) {
      await page.setViewport({ width, height: width <= 390 ? 844 : 900, mobile: width <= 390 })
      await page.goto('http://127.0.0.1:18635/?concept='+key)
      await ready(page)
      const check = await page.eval(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        title: document.querySelector('h1')?.textContent,
        fonts: document.fonts.check('40px StudySeal') && document.fonts.check('40px StudyModern'),
        contentBottom: document.querySelector('.screen-content').getBoundingClientRect().bottom,
        navBottom: document.querySelector('.app-nav').getBoundingClientRect().bottom,
        smallControls: [...document.querySelectorAll('button')].filter(b=>{const r=b.getBoundingClientRect();return r.width>0 && r.height>0 && (r.width<44 || r.height<44)}).map(b=>b.textContent.trim()),
      }))
      if(check.overflow || check.title !== '学习' || !check.fonts || check.smallControls.length || check.navBottom > (width <= 390 ? 844 : 900)) throw new Error(key+' '+width+': '+JSON.stringify(check))
      await page.screenshot({ path: resolve(root,'captures',key+'-'+width+'.jpg'), quality:94, fullPage:true })
      results.push({concept:key,width,...check})
    }
    await page.setViewport({ width:390,height:844,mobile:true })
    for(const state of ['empty','done']) {
      await page.goto('http://127.0.0.1:18635/?concept='+key+'&state='+state)
      await ready(page)
      const check=await page.eval(()=>({value:Number(document.querySelector('[role=progressbar]').getAttribute('aria-valuenow')),action:document.querySelector('[data-start]').textContent.trim()}))
      if(check.value!==(state==='empty'?0:15))throw new Error('Incorrect progress state')
      await page.screenshot({path:resolve(root,'captures',key+'-'+state+'.jpg'),quality:92,fullPage:true})
      results.push({concept:key,state,...check})
    }
    for(const theme of ['green','dark']) {
      await page.goto('http://127.0.0.1:18635/?concept='+key+'&theme='+theme)
      await ready(page)
      await page.screenshot({path:resolve(root,'captures',key+'-'+theme+'.jpg'),quality:92,fullPage:true})
    }
    await page.eval(()=>document.querySelector('[data-start]').click())
    if(!await page.eval("document.querySelector('dialog').open && document.querySelectorAll('.dialog-characters>div').length===15"))throw new Error('Start/list preview failed')
    await page.eval(()=>document.querySelector('[data-close]').click())
    if(key!=='a') {
      const prev=await page.eval("document.querySelector('.specimen-reference').textContent")
      await page.eval(()=>document.querySelector('[data-swap]').click())
      if(prev===await page.eval("document.querySelector('.specimen-reference').textContent"))throw new Error('Specimen switch failed')
    }
    if(key==='c') {
      await page.eval(()=>document.querySelector('[data-explore]').click())
      if(!await page.eval("document.querySelector('[data-explore]').getAttribute('aria-pressed')==='true'"))throw new Error('Glyph exploration failed')
    }
    results.push({concept:key,interactions:'passed'})
  }
  await page.setViewport({width:1440,height:1200})
  await page.goto('http://127.0.0.1:18635/')
  await ready(page)
  await sleep(1500)
  await page.screenshot({path:resolve(root,'captures/comparison.jpg'),quality:95,fullPage:true})
  // Capture the actual loaded existing home, rather than its asynchronous database overlay.
  await page.setViewport({width:390,height:844,mobile:true})
  await page.goto('http://127.0.0.1:18573/#/pages/index/index')
  for(let i=0;i<120;i++) {
    if(await page.eval("!document.querySelector('.database-overlay') && document.querySelector('.stat-value')?.textContent.includes('/15')"))break
    await sleep(250)
  }
  await page.screenshot({path:resolve(root,'captures/before-loaded.jpg'),quality:92,fullPage:true})
  const hashes=JSON.parse(readFileSync(resolve(root,'source-before.json'),'utf8'))
  for(const [file,hash] of Object.entries(hashes))if(createHash('sha256').update(readFileSync(resolve(file))).digest('hex')!==hash)throw new Error('Business source changed: '+file)
  writeFileSync(resolve(root,'validation.json'),JSON.stringify({results,sourceUnchanged:true},null,2))
  console.log(JSON.stringify({captures:resolve(root,'captures'),checks:results.length,sourceUnchanged:true}))
} finally { await browser.close() }
