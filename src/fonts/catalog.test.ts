import { describe, expect, it } from 'vitest'
import { buildFontCatalog, fontCatalog } from './catalog'

describe('内置字体目录', () => {
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
})
