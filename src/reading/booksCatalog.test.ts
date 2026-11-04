import { describe, expect, it } from 'vitest'
import { getBookById, getBooksCatalog } from './booksCatalog'

describe('内置书库资源', () => {
  it('使用可打包的 ASCII URL 加载每本书', () => {
    const books = getBooksCatalog()
    expect(books).toHaveLength(6)
    for (const book of books) {
      expect(decodeURI(book.url)).not.toMatch(/[^\x00-\x7f]/)
    }
  })

  it.each([
    ['阿-槿-姑-娘-1-txt', '(阿)(槿)(姑)(娘)1.txt'],
    ['阿-满-1-txt', '(阿)(满)1.txt'],
    ['阿-茗-阿-茗-1-txt', '(阿)(茗)(阿)(茗)1.txt'],
    ['阿-婉-阿-婉-1-txt', '(阿)(婉)(阿)(婉)1.txt'],
    ['曾国藩家书-全集-pdf', '《曾国藩家书》全集.pdf'],
    ['sample-english-pdf', 'sample-english.pdf'],
  ])('旧书籍 ID %s 仍可打开原书名并关联阅读记录', (id, fileName) => {
    expect(getBookById(id)).toMatchObject({
      id,
      fileName,
      name: fileName.replace(/\.(txt|pdf)$/, ''),
      source: 'builtin',
    })
  })
})
