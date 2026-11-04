import { describe, expect, it } from 'vitest'
import { buildFontCatalog, fontCatalog } from './catalog'

describe('内置字体目录', () => {
  it('所有字体使用可打包的 ASCII URL', () => {
    expect(fontCatalog).toHaveLength(4)
    for (const font of fontCatalog) {
      expect(decodeURI(font.fontSource)).not.toMatch(/[^\x00-\x7f]/)
    }
  })

  it.each([
    ['方正特雅宋简体', 'builtin-1sva34g'],
    ['方正小篆体', 'builtin-q5yuss'],
    ['汉仪楷体繁', 'builtin-z98q3a'],
    ['优设标题黑', 'builtin-mbn5sq'],
  ])('保留 %s 的原有字体设置与全局 family', (name, id) => {
    expect(fontCatalog.find((font) => font.name === name)).toMatchObject({
      id,
      fontFaceFamily: id,
      fontFamily: `${id}, serif`,
    })
  })

  it('从 fronts 目录读取大小写扩展名的 TTF 字体', () => {
    expect(fontCatalog.map((font) => font.name)).toEqual(expect.arrayContaining([
      '方正特雅宋简体',
      '方正小篆体',
      '汉仪楷体繁',
      '优设标题黑',
    ]))
  })

  it('只将 TTF 文件转换为字体条目', () => {
    const catalog = buildFontCatalog({
      '../static/fronts/示例字体.ttf': '/assets/example.ttf',
      '../static/fronts/说明.txt': '/assets/readme.txt',
    })

    expect(catalog).toHaveLength(1)
    expect(catalog[0]).toMatchObject({
      name: '示例字体',
      fontSource: '/assets/example.ttf',
    })
  })

  it('小篆字体使用与全局字体声明一致的稳定 family', () => {
    expect(fontCatalog.find((font) => font.name === '方正小篆体')?.fontFamily)
      .toBe('builtin-q5yuss, serif')
  })
})
