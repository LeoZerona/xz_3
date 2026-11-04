import {expect,test} from '@playwright/test'
import {createServer,type Server} from 'node:http'
import {readFile} from 'node:fs/promises'
import {resolve,extname} from 'node:path'
import {databaseRows} from './databaseHelpers'
test.use({actionTimeout:20_000})
let server:Server
const root=resolve('dist/build/h5'),base='http://127.0.0.1:18578'
test.beforeAll(async()=>{server=createServer(async(req,res)=>{try{const url=new URL(req.url??'/',base);const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!path.startsWith(root+'/')&&!path.startsWith(root+'\\')){res.writeHead(403).end();return}const data=await readFile(path);res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.ttf':'font/ttf'} as Record<string,string>)[extname(path)]??'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(data)}catch{res.writeHead(404).end('Missing resource')}});await new Promise<void>(resolve=>server.listen(18578,'127.0.0.1',resolve))})
test.afterAll(async()=>{await new Promise<void>(resolve=>server.close(()=>resolve()))})
test('生产版准备后断网刷新与新页可学习，失败更新保留旧缓存，清缓存保留数据库',async({page,context})=>{
  test.setTimeout(180_000)
  await page.goto(base+'/#/pages/offline-resources/index')
  await expect(page.getByRole('heading',{name:'H5 离线资源',exact:true})).toBeVisible()
  await page.getByRole('button',{name:'准备离线启动资源',exact:true}).click()
  await expect(page.getByText('当前资源已可离线启动',{exact:true})).toBeVisible({timeout:90_000})
  await page.goto(base+'/#/pages/reading/index')
  await page.locator('.book-card').filter({has:page.locator('[data-ext="txt"]')}).first().click()
  await expect(page.locator('.reading-page-stage')).toHaveClass(/is-ready/)
  const firstText=await page.locator('.learn-char, .cell-learning').first().textContent()
  await page.goto(base+'/#/pages/offline-resources/index')
  const failed=await page.evaluate(async()=>{
    const registration=await navigator.serviceWorker.register('/service-worker.js?font=/static/fronts/missing-test.ttf',{scope:'/',updateViaCache:'none'})
    const worker=registration.installing
    if(!worker)return false
    return new Promise<boolean>(resolve=>{worker.addEventListener('statechange',()=>{if(worker.state==='redundant')resolve(true);if(worker.state==='activated')resolve(false)})})
  });expect(failed).toBe(true)
  await context.setOffline(true);await page.reload()
  await expect(page.getByText('当前资源已可离线启动',{exact:true})).toBeVisible()
  const second=await context.newPage();await second.goto(base+'/#/pages/levels/index')
  await expect(second.getByRole('tab',{name:'一级汉字',exact:true})).toHaveAttribute('aria-selected','true')
  await second.goto(base+'/#/pages/study-preview/index');await expect(second.locator('.character-row')).toHaveCount(15)
  await second.goto(base+'/#/pages/reading/index');await second.getByRole('button',{name:'最近阅读入口，点击继续阅读'}).click()
  await expect(second.locator('.reading-page-stage')).toHaveClass(/is-ready/)
  await expect(second.locator('.learn-char, .cell-learning').first()).toHaveText(firstText!)
  await second.close()
  const before=await databaseRows(page,'settings')
  await page.getByRole('button',{name:'清理离线启动缓存',exact:true}).click();await page.getByText('确认清理',{exact:true}).click()
  await expect(page.getByText('离线启动缓存已清理，用户数据库保留',{exact:true})).toBeVisible()
  expect(await databaseRows(page,'settings')).toEqual(before)
})
