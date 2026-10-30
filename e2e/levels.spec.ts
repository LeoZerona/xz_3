import { expect, test } from '@playwright/test'

test('mobile levels load in batches and open a stage', async ({ page }) => {
  await page.goto('/#/pages/levels/index')

  await expect(page.locator('.stage-card')).toHaveCount(24)
  await expect(page.locator('.load-more-stages')).toContainText('已显示 24/256')

  await page.locator('.load-more-stages').click()
  await expect(page.locator('.stage-card')).toHaveCount(48)
  await expect(page.locator('.load-more-stages')).toContainText('已显示 48/256')

  await page.locator('.stage-card').first().click()
  await expect(page).toHaveURL(/\/pages\/level-study\/index\?category=level1&stageId=level1-stage-01/)
  await expect(page.getByRole('region', { name: '关卡预览' })).toBeVisible()
  await page.getByRole('button', { name: '开始学习', exact: true }).click()
  await expect(page.locator('.prompt-character')).toBeVisible()
})

const firstStageUrl = '/#/pages/level-study/index?category=level1&stageId=level1-stage-01'

test('关卡预览支持逐字遮盖、交换、全部揭示和斩字，刷新后仍跳过已斩文字', async ({ page }) => {
  await page.goto(firstStageUrl)
  await expect(page.locator('.character-row')).toHaveCount(10)
  const learningFontName = await page.locator('.font-name').first().innerText()
  const referenceFontName = await page.locator('.font-name').nth(1).innerText()
  const firstRow = page.locator('.character-row').first()
  await expect(firstRow.locator('.character')).toHaveCount(1)
  await firstRow.getByRole('button', { name: `显示一的${referenceFontName}字形` }).click()
  await expect(firstRow.locator('.character')).toHaveCount(2)
  await firstRow.getByRole('button', { name: `重新遮盖一的${referenceFontName}字形` }).click()
  await page.getByRole('button', { name: '交换遮盖字体' }).click()
  await expect(firstRow.getByRole('button', { name: `显示一的${learningFontName}字形` })).toBeVisible()
  await page.getByRole('button', { name: '取消全部遮盖' }).click()
  await expect(page.locator('.character-row .character')).toHaveCount(20)
  await page.getByRole('button', { name: '全部遮盖' }).click()
  await expect(page.locator('.cover-cell')).toHaveCount(10)
  await firstRow.getByRole('button', { name: '斩掉一，后续关卡学习不再出现' }).click()
  await expect(page.locator('.character-row')).toHaveCount(10)
  await expect(firstRow.getByRole('button', { name: '取消斩一，恢复关卡学习' })).toHaveAttribute('aria-pressed', 'true')
  await expect(firstRow.locator('.slash-button')).toHaveClass(/is-active/)
  await expect(firstRow.locator('.slash-button')).toHaveText('已斩')
  await page.reload()
  await expect(page.locator('.character-row')).toHaveCount(10)
  await expect(firstRow.getByRole('button', { name: '取消斩一，恢复关卡学习' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: '开始学习', exact: true }).click()
  await expect(page.locator('.prompt-character')).toHaveText('乙')
  await expect(page.getByRole('button', { name: '选择文字一', exact: true })).toHaveCount(0)
  await expect(page.locator('.progress-item').filter({ hasText: '剩余题' })).toContainText('27')
})

test('首次答对短暂停顿后进入详情，反馈中不提示错误且不重复计数', async ({ page }) => {
  await page.goto(firstStageUrl)
  await page.getByRole('button', { name: '开始学习', exact: true }).click()
  await page.clock.install()
  await page.clock.pauseAt(new Date(Date.now() + 1000))
  const correctOption = page.getByRole('button', { name: '选择文字一', exact: true })
  await correctOption.click()
  await expect(correctOption).toHaveCSS('animation-name', /correct-answer-pulse/)
  await expect(correctOption).toHaveCSS('animation-delay', '0s')
  await expect(correctOption).toHaveCSS('border-top-color', 'rgb(21, 128, 61)')
  await expect(page.getByText('✓ 回答正确', { exact: true })).toBeVisible()
  await page.screenshot({ path: test.info().outputPath('correct-feedback.png') })
  await expect(page.getByText('选择错误，请重新选择')).toHaveCount(0)
  await expect(correctOption).toBeDisabled()
  await correctOption.dispatchEvent('click')
  await page.clock.fastForward(100)
  await expect(page.getByLabel('文字详情', { exact: true })).toHaveCount(0)
  await page.clock.fastForward(50)
  await expect(page.getByLabel('文字详情', { exact: true })).toBeVisible()
  await expect(page.getByLabel('文字详情', { exact: true })).toHaveCSS('animation-name', 'none')
  await expect(page.getByLabel(/^学习字体.+中的一$/)).toBeVisible()
  const record = await page.evaluate(() => JSON.parse(localStorage.getItem('font-learning-character-data') ?? '{}').data.characters['char-0001'])
  expect(record.modes['seal-to-reference-choice']).toMatchObject({ attempts: 1, mistakes: 0 })
  await page.getByRole('button', { name: '进入下一题' }).click()
  await expect(page.locator('.prompt-character')).toHaveText('乙')
  await expect(page.locator('.progress-item').filter({ hasText: '本关进度' })).toContainText('0/10')
})

test('选错立即显示红色动画，改选正确答案立即显示正确动画', async ({ page }) => {
  await page.goto(firstStageUrl)
  await page.getByRole('button', { name: '开始学习', exact: true }).click()
  await page.clock.install()
  await page.clock.pauseAt(new Date(Date.now() + 1000))
  const wrongOption = page.locator('.character-option').filter({ hasNotText: '一' }).first()
  await wrongOption.click()
  await expect(wrongOption).toHaveCSS('border-top-color', 'rgb(220, 38, 38)')
  await expect(wrongOption).toHaveCSS('animation-name', /wrong-option-shake/)
  await expect(wrongOption).toHaveCSS('animation-duration', '0.36s')
  await expect(wrongOption).toHaveCSS('animation-delay', '0s')
  await expect(page.getByText('选择错误，请重新选择')).toBeVisible()
  await expect(page.getByText('选择错误，请重新选择')).toHaveCSS('color', 'rgb(220, 38, 38)')
  await expect(page.getByText('选择错误，请重新选择')).toHaveCSS('animation-name', 'none')
  await page.screenshot({ path: test.info().outputPath('wrong-feedback.png') })
  await page.getByRole('button', { name: '选择文字一', exact: true }).click()
  await expect(page.getByText('✓ 回答正确', { exact: true })).toBeVisible()
  await expect(page.getByText('选择错误，请重新选择')).toHaveCount(0)
  await page.clock.fastForward(150)
  await expect(page.getByLabel('文字详情', { exact: true })).toBeVisible()
  const record = await page.evaluate(() => JSON.parse(localStorage.getItem('font-learning-character-data') ?? '{}').data.characters['char-0001'])
  expect(record.modes['seal-to-reference-choice']).toMatchObject({ attempts: 2, mistakes: 1 })
})

for (const inputMethod of ['mouse', 'touch'] as const) {
  test(`${inputMethod} 按压不播放点击效果，松手后立即显示红色错误`, async ({ page }) => {
    await page.goto(firstStageUrl)
    await page.getByRole('button', { name: '开始学习', exact: true }).click()
    await page.clock.install()
    await page.clock.pauseAt(new Date(Date.now() + 1000))
    const wrongOption = page.locator('.character-option').filter({ hasNotText: '一' }).first()
    const bounds = await wrongOption.boundingBox()
    if (!bounds) throw new Error('错误选项未显示')
    const point = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
    const touchSession = inputMethod === 'touch' ? await page.context().newCDPSession(page) : null
    if (touchSession) {
      await touchSession.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
    } else {
      await page.mouse.move(point.x, point.y)
      await page.mouse.down()
    }
    await page.clock.runFor(100)
    await expect(wrongOption).not.toHaveClass(/button-hover/)
    await expect(wrongOption).toHaveCSS('filter', 'none')
    await expect(wrongOption).toHaveCSS('transform', 'none')
    await expect(wrongOption).toHaveCSS('transition-duration', '0s')
    if (touchSession) {
      await touchSession.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await touchSession.detach()
    } else {
      await page.mouse.up()
    }
    await expect(wrongOption).toHaveCSS('border-top-color', 'rgb(220, 38, 38)')
    await expect(wrongOption).toHaveCSS('color', 'rgb(220, 38, 38)')
    await expect(wrongOption).toHaveCSS('filter', 'none')
    await expect(wrongOption).not.toHaveClass(/button-hover/)
    await expect(page.getByText('选择错误，请重新选择')).toBeVisible()
  })
}

test('存储耗时不会阻塞首帧红色反馈', async ({ page }) => {
  await page.goto(firstStageUrl)
  await page.getByRole('button', { name: '开始学习', exact: true }).click()
  const feedbackWasPaintedBeforeSave = await page.evaluate(async () => {
    const wrongOption = Array.from(document.querySelectorAll<HTMLElement>('.character-option'))
      .find((option) => option.getAttribute('aria-label') !== '选择文字一')
    if (!wrongOption) throw new Error('错误选项未显示')
    let feedbackWasPainted = false
    let paintedAtSave: boolean | undefined
    const originalSetItem = Storage.prototype.setItem
    const firstFrame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        feedbackWasPainted = getComputedStyle(wrongOption).borderTopColor === 'rgb(220, 38, 38)'
      })
    })
    try {
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key === 'font-learning-character-data') {
          paintedAtSave = feedbackWasPainted
          const until = performance.now() + 120
          while (performance.now() < until) { /* 模拟真机同步存储耗时。 */ }
        }
        originalSetItem.call(this, key, value)
      }
      wrongOption.click()
      await new Promise<void>((resolve) => {
        function checkSaved() {
          if (paintedAtSave !== undefined) resolve()
          else requestAnimationFrame(checkSaved)
        }
        requestAnimationFrame(checkSaved)
      })
      return paintedAtSave
    } finally {
      Storage.prototype.setItem = originalSetItem
      cancelAnimationFrame(firstFrame)
    }
  })
  expect(feedbackWasPaintedBeforeSave).toBe(true)
})

test('错误反馈尚未结束就离开页面，刷新后仍保留该次错误记录', async ({ page }) => {
  await page.goto(firstStageUrl)
  await page.getByRole('button', { name: '开始学习', exact: true }).click()
  await page.clock.install()
  await page.clock.pauseAt(new Date(Date.now() + 1000))
  await page.locator('.character-option').filter({ hasNotText: '一' }).first().click()
  await page.getByLabel('返回', { exact: true }).click()
  await expect(page).toHaveURL(/\/pages\/levels\/index/)
  await page.reload()
  const record = await page.evaluate(() => JSON.parse(localStorage.getItem('font-learning-character-data') ?? '{}').data.characters['char-0001'])
  expect(record.modes['seal-to-reference-choice']).toMatchObject({ attempts: 1, mistakes: 1, completedAt: null })
})

test('第二次选错先完整显示舒缓的红色反馈，再进入详情且不重复计数', async ({ page }) => {
  await page.goto(firstStageUrl)
  await page.getByRole('button', { name: '开始学习', exact: true }).click()
  await page.clock.install()
  await page.clock.pauseAt(new Date(Date.now() + 1000))
  const wrongOption = page.locator('.character-option').filter({ hasNotText: '一' }).first()
  await wrongOption.click()
  await wrongOption.click()
  await expect(wrongOption).toHaveCSS('border-top-color', 'rgb(220, 38, 38)')
  await expect(page.getByText('选择错误，请重新选择')).toBeVisible()
  await expect(page.getByLabel('文字详情', { exact: true })).toHaveCount(0)
  await wrongOption.dispatchEvent('click')
  await page.clock.fastForward(359)
  await expect(page.getByLabel('文字详情', { exact: true })).toHaveCount(0)
  await page.clock.fastForward(1)
  await expect(page.getByLabel('文字详情', { exact: true })).toBeVisible()
  const record = await page.evaluate(() => JSON.parse(localStorage.getItem('font-learning-character-data') ?? '{}').data.characters['char-0001'])
  expect(record.modes['seal-to-reference-choice']).toMatchObject({ attempts: 2, mistakes: 2, completedAt: null })
})

test('减少动态效果时仍立即显示红色错误和绿色正确提示', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(firstStageUrl)
  await page.getByRole('button', { name: '开始学习', exact: true }).click()
  await page.clock.install()
  await page.clock.pauseAt(new Date(Date.now() + 1000))
  const wrongOption = page.locator('.character-option').filter({ hasNotText: '一' }).first()
  await wrongOption.click()
  await expect(wrongOption).toHaveCSS('animation-name', 'none')
  await expect(wrongOption).toHaveCSS('border-top-color', 'rgb(220, 38, 38)')
  await expect(page.getByText('选择错误，请重新选择')).toBeVisible()
  const correctOption = page.getByRole('button', { name: '选择文字一', exact: true })
  await correctOption.click()
  await expect(correctOption).toHaveCSS('animation-name', 'none')
  await expect(page.getByText('✓ 回答正确', { exact: true })).toBeVisible()
  await page.clock.fastForward(150)
  await expect(page.getByLabel('文字详情', { exact: true })).toHaveCSS('animation-name', 'none')
})

test('已斩按钮再次点击后恢复学习，刷新后状态和题目均恢复', async ({ page }) => {
  await page.goto(firstStageUrl)
  const firstRow = page.locator('.character-row').first()
  const slashButton = firstRow.locator('.slash-button')
  await expect(slashButton).toHaveAttribute('aria-pressed', 'false')
  const inactiveColor = await slashButton.evaluate((element) => getComputedStyle(element).backgroundColor)
  await slashButton.click()
  await expect(slashButton).toHaveAttribute('aria-pressed', 'true')
  const activeColor = await slashButton.evaluate((element) => getComputedStyle(element).backgroundColor)
  expect(activeColor).not.toBe(inactiveColor)
  await expect(page.locator('.progress-item').filter({ hasText: '剩余题' })).toContainText('27')
  await firstRow.getByRole('button', { name: '取消斩一，恢复关卡学习' }).click()
  await expect(slashButton).toHaveAttribute('aria-pressed', 'false')
  await expect(slashButton).not.toHaveClass(/is-active/)
  await expect(slashButton).toHaveText('斩')
  await expect(slashButton).toHaveCSS('background-color', inactiveColor)
  await expect(page.locator('.character-row')).toHaveCount(10)
  await page.reload()
  await expect(firstRow.locator('.slash-button')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.progress-item').filter({ hasText: '剩余题' })).toContainText('30')
  await page.getByRole('button', { name: '开始学习', exact: true }).click()
  await expect(page.locator('.prompt-character')).toHaveText('一')
  await expect(page.getByRole('button', { name: '选择文字一', exact: true })).toBeVisible()
})

test('本关全部斩掉后列表保留，取消一个斩字即可继续学习', async ({ page }) => {
  await page.goto(firstStageUrl)
  for (let index = 0; index < 10; index += 1) {
    await page.locator('.slash-button').nth(index).click()
    await expect(page.locator('.character-row')).toHaveCount(10)
    await expect(page.locator('.slash-button.is-active')).toHaveCount(index + 1)
  }
  await expect(page.getByRole('button', { name: '开始学习', exact: true })).toBeDisabled()
  await page.reload()
  await expect(page.locator('.character-row')).toHaveCount(10)
  await expect(page.locator('.slash-button.is-active')).toHaveCount(10)
  await expect(page.getByRole('button', { name: '开始学习', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: '取消斩一，恢复关卡学习' }).click()
  await expect(page.locator('.slash-button.is-active')).toHaveCount(9)
  await expect(page.getByRole('button', { name: '开始学习', exact: true })).toBeEnabled()
  await expect(page.locator('.progress-item').filter({ hasText: '剩余题' })).toContainText('3')
  await page.getByRole('button', { name: '开始学习', exact: true }).click()
  await expect(page.locator('.prompt-character')).toHaveText('一')
})

test('斩字后完成剩余练习，输入题立即显示红色错误或绿色正确动画', async ({ page }) => {
  await page.goto(firstStageUrl)
  for (let index = 9; index > 0; index -= 1) {
    await page.locator('.slash-button').nth(index).click()
  }
  await page.getByRole('button', { name: '开始学习', exact: true }).click()
  for (let mode = 0; mode < 2; mode += 1) {
    await expect(page.locator('.prompt-character')).toHaveText('一')
    await page.getByRole('button', { name: '选择文字一', exact: true }).click()
    await expect(page.getByLabel('文字详情', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: '进入下一题' }).click()
  }
  await expect(page.locator('.progress-item').filter({ hasText: '本关进度' })).toContainText('0/1')
  await page.clock.install()
  await page.clock.pauseAt(new Date(Date.now() + 1000))
  await page.locator('.answer-input input').fill('乙')
  await page.getByRole('button', { name: '确认输入答案' }).click()
  await expect(page.locator('.input-label')).toHaveCSS('border-top-color', 'rgb(220, 38, 38)')
  await expect(page.locator('.input-label')).toHaveCSS('animation-name', /wrong-option-shake/)
  await expect(page.locator('.input-label')).toHaveCSS('animation-duration', '0.36s')
  await expect(page.getByText('答案不正确，请重新输入')).toBeVisible()
  await page.locator('.answer-input input').fill('一')
  // uni-input 对连续输入节流 100ms，先派发改字事件，再检查提交后的即时反馈。
  await page.clock.runFor(100)
  await page.getByRole('button', { name: '确认输入答案' }).click()
  await expect(page.locator('.input-label')).toHaveCSS('animation-name', /correct-answer-pulse/)
  await expect(page.locator('.input-label')).toHaveCSS('border-top-color', 'rgb(21, 128, 61)')
  await expect(page.getByText('✓ 回答正确', { exact: true })).toBeVisible()
  await expect(page.locator('.input-label.is-error')).toHaveCount(0)
  await expect(page.getByText('答案不正确，请重新输入')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '确认输入答案' })).toBeDisabled()
  await page.clock.fastForward(100)
  await expect(page.getByLabel('文字详情', { exact: true })).toHaveCount(0)
  await page.clock.fastForward(50)
  await expect(page.getByLabel('文字详情', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '完成本关学习' }).click()
  await expect(page.getByText('关卡完成', { exact: true })).toBeVisible()
  await expect(page.getByText('关卡 01 已完成1字的 3 种练习')).toBeVisible()
})

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 1280, height: 800 }]) {
  test(`关卡预览在 ${viewport.width}px 宽度可滚动且开始按钮可见`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto(firstStageUrl)
    const startButton = page.getByRole('button', { name: '开始学习', exact: true })
    await expect(startButton).toBeInViewport()
    await page.locator('.slash-button').last().scrollIntoViewIfNeeded()
    await expect(page.locator('.slash-button').last()).toBeInViewport()
    await page.locator('.slash-button').last().click()
    await expect(page.locator('.slash-button').last()).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.character-row')).toHaveCount(10)
    await expect(startButton).toBeInViewport()
    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(hasHorizontalOverflow).toBe(false)
    await page.screenshot({ path: test.info().outputPath('level-preview.png') })
  })
}

test('今日预览复用遮盖组件后仍可揭示、交换、查看详情和开始学习', async ({ page }) => {
  await page.goto('/#/pages/study-preview/index')
  await expect(page.locator('.character-row')).toHaveCount(15)
  const firstRow = page.locator('.character-row').first()
  await firstRow.locator('.toggle-cell').click()
  await expect(firstRow.locator('.character')).toHaveCount(2)
  await page.getByRole('button', { name: '交换遮盖字体' }).click()
  await expect(firstRow.locator('.character')).toHaveCount(1)
  await expect(page.locator('.slash-button')).toHaveCount(0)
  await page.getByRole('button', { name: '取消全部遮盖' }).click()
  await expect(page.locator('.character-row .character')).toHaveCount(30)
  await firstRow.getByRole('button', { name: '查看一的文字详情' }).click()
  await expect(page.getByText('基本释义', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '返回', exact: true }).click()
  await page.getByRole('button', { name: '开始今日学习' }).click()
  await page.getByRole('button', { name: '选择文字一', exact: true }).click()
  await expect(page.getByLabel('文字详情', { exact: true })).toBeVisible()
  await expect(page.getByText('选择错误，请重新选择')).toHaveCount(0)
})

test('详情斩字与预览按钮同步，后段关卡也可直接取消斩字', async ({ page }) => {
  await page.goto('/#/pages/level-study/index?category=level1&stageId=level1-stage-22')
  await expect(page.locator('.character-row')).toHaveCount(10)
  await page.locator('.character-row').first().getByRole('button', { name: /查看.+的文字详情/ }).click()
  await expect(page.getByText('基本释义', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('基本释义', { exact: true })).toBeVisible()
  await page.getByLabel('斩掉当前文字，后续学习不再出现').click()
  await page.getByRole('button', { name: '返回', exact: true }).click()
  await expect(page.locator('.character-row')).toHaveCount(10)
  const firstRow = page.locator('.character-row').first()
  await expect(firstRow.locator('.slash-button')).toHaveAttribute('aria-pressed', 'true')
  await firstRow.locator('.slash-button').click()
  await expect(firstRow.locator('.slash-button')).toHaveAttribute('aria-pressed', 'false')
  await firstRow.getByRole('button', { name: /查看.+的文字详情/ }).click()
  await expect(page.getByLabel('斩掉当前文字，后续学习不再出现')).toHaveAttribute('aria-pressed', 'false')
})
