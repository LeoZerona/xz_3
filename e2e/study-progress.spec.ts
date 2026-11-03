import {expect,test} from '@playwright/test'
test('每字完成三种练习后计入今日新学，保留四字交错题序',async({page})=>{
  await page.goto('/#/pages/study-preview/index');await page.getByRole('button',{name:'开始今日学习',exact:true}).click()
  for(const mode of [1,2])for(const glyph of ['一','乙','二','十']){
    await expect(page.locator('.prompt-card')).toHaveAttribute('aria-label','题目使用'+(mode===1?'方正特雅宋简体':'方正小篆体')+'展示，'+glyph)
    await expect(page.locator('.prompt-character')).toHaveText(glyph)
    await page.getByRole('button',{name:'选择文字'+glyph,exact:true}).click()
    await page.getByRole('button',{name:'进入下一题',exact:true}).click()
  }
  await expect(page.locator('.answer-input input')).toBeVisible()
  await page.locator('.answer-input input').fill('一');await page.getByRole('button',{name:'确认输入答案',exact:true}).click()
  await page.getByRole('button',{name:'进入下一题',exact:true}).click()
  await expect(page.locator('.prompt-character')).toHaveText('乙')
  await expect(page.locator('.progress-item').filter({hasText:'今日新学'}).locator('.progress-value')).toHaveText('1/15')
})
