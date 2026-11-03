import {expect,test} from '@playwright/test'
import second from '../src/data/character-table/second-level.json'
import third from '../src/data/character-table/third-level.json'
for(const [category,stage,count,glyph] of [['level2','level2-stage-300',10,second.chars[2990]!.script_forms.simplified],['level3','level3-stage-161',5,third.chars[1600]!.script_forms.simplified]] as const){
  test(`${category}末关有完整内容并可答题`,async({page})=>{
    await page.goto(`/#/pages/level-study/index?category=${category}&stageId=${stage}`)
    await expect(page.locator('.character-row')).toHaveCount(count,{timeout:30000})
    await page.getByRole('button',{name:'开始学习',exact:true}).click()
    await expect(page.locator('.prompt-character')).toHaveText(glyph)
    await page.getByRole('button',{name:`选择文字${glyph}`,exact:true}).click()
    await expect(page.getByLabel('文字详情',{exact:true})).toBeVisible()
  })
}
test('扩展区汉字输入不会被UTF16长度限制截断',async({page})=>{
  const glyph=third.chars.find(entry=>entry.script_forms.simplified.length===2)!.script_forms.simplified
  await page.goto('/#/pages/practice-setup/index?source=custom')
  await page.getByLabel('练习汉字').fill(glyph)
  await page.getByRole('checkbox',{name:/查看学习字体选择对照字体/}).click()
  await page.getByRole('checkbox',{name:/查看对照字体选择学习字体/}).click()
  await page.getByRole('button',{name:'开始独立练习',exact:true}).click()
  await page.locator('.answer-input input').fill(glyph)
  await expect(page.locator('.answer-input input')).toHaveValue(glyph)
  await page.getByRole('button',{name:'确认输入答案',exact:true}).click()
  await expect(page.getByLabel('文字详情',{exact:true})).toBeVisible()
})
