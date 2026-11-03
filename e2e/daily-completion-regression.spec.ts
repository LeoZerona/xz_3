import {expect,test} from '@playwright/test'
import {characterRecord} from './databaseHelpers'
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
