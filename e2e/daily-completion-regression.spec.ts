import {expect,test} from '@playwright/test'
import {characterRecord,databaseRows} from './databaseHelpers'
test('日常第二题型连续答错保留已完成题型与历史次数',async({page})=>{
  await page.goto('/#/pages/study-preview/index')
  await page.getByRole('button',{name:'开始今日学习',exact:true}).click()
  for(const glyph of ['一','乙','二','十']){
    await expect(page.locator('.prompt-character')).toHaveText(glyph)
    await page.getByRole('button',{name:`选择文字${glyph}`,exact:true}).click()
    await page.getByRole('button',{name:'进入下一题',exact:true}).click()
  }
  const wrong=page.getByRole('button',{name:/^选择文字/}).filter({hasNotText:'一'}).first()
  await wrong.click();await wrong.click()
  await expect(page.getByLabel('文字详情',{exact:true})).toBeVisible()
  const record=await characterRecord(page,'char-0001')
  expect(record.modes['seal-to-reference-choice']).toMatchObject({attempts:1,mistakes:0})
  expect(record.modes['seal-to-reference-choice'].completedAt).not.toBeNull()
  expect(record.modes['reference-to-seal-choice']).toMatchObject({attempts:2,mistakes:2})
})
test('日常学习跨午夜继续时重建当日题单，反馈动画不改变答题日期',async({page})=>{
  await page.goto('/#/pages/study-preview/index')
  await expect(page.locator('.character-row')).toHaveCount(15)
  await page.getByRole('button',{name:'开始今日学习',exact:true}).click()
  await expect(page.locator('.prompt-character')).toHaveText('一')
  await page.clock.install({time:new Date(2026,10,3,23,59,50)})
  await page.getByRole('button',{name:'选择文字一',exact:true}).click()
  await page.clock.setSystemTime(new Date(2026,10,4,0,0,1));await page.clock.runFor(500)
  await page.getByRole('button',{name:'进入下一题',exact:true}).click()
  await expect(page.locator('.prompt-character')).toHaveText('乙')
  const answers=(await databaseRows(page,'activity_events')).filter(row=>row.kind==='answer')
  expect(answers).toMatchObject([{dateKey:'2026-11-3',correct:1}])
  expect((await databaseRows(page,'daily_session_items')).filter(row=>row.dateKey==='2026-11-4')).toHaveLength(15)
})
