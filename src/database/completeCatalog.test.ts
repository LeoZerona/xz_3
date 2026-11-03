import {expect,it} from 'vitest'
import {buildCatalogSeed} from '../../build/catalogSeed'
import daily from '../data/character-table/first-level.json'
import supplement from '../data/character-table/first-level-supplement.json'
import second from '../data/character-table/second-level.json'
import third from '../data/character-table/third-level.json'
import type {StudyCharacterEntry} from '../study/types'
const files=import.meta.glob<{chars:StudyCharacterEntry[]}>('../data/character-table/firstLevel/*.json',{eager:true,import:'default'})
const legacy=Object.entries(files).sort(([a],[b])=>Number(a.match(/(\d+)\.json$/)?.[1])-Number(b.match(/(\d+)\.json$/)?.[1])).map(([,file])=>file.chars)
it('完整8105字按级别唯一，原一级末关与ID保留，后两级末关有真实内容',()=>{
  const old=buildCatalogSeed(daily.chars,[...legacy,supplement.chars])
  const current=buildCatalogSeed(daily.chars,[...legacy,supplement.chars],[second.chars,third.chars])
  const rows=current.flatMap(change=>change.table==='characters'&&'row'in change?[change.row]:[])
  expect(rows).toHaveLength(8105)
  expect(new Set(rows.map(row=>row.simplified)).size).toBe(8105)
  expect([1,2,3].map(level=>rows.filter(row=>row.level===level).length)).toEqual([3500,3000,1605])
  const oldMembership=old.filter(change=>change.table==='level_characters'&&'row'in change&&String(change.row.levelId).startsWith('level1-'))
  expect(current.filter(change=>change.table==='level_characters'&&'row'in change&&String(change.row.levelId).startsWith('level1-'))).toEqual(oldMembership)
  expect(current.filter(change=>change.table==='levels'&&'row'in change&&change.row.category==='level2')).toHaveLength(300)
  expect(current.filter(change=>change.table==='levels'&&'row'in change&&change.row.category==='level3')).toHaveLength(161)
  expect(current.filter(change=>change.table==='level_characters'&&'row'in change&&change.row.levelId==='level3-stage-161')).toHaveLength(5)
  expect(third.chars.every(entry=>entry.shuowen.original==='未收录')).toBe(true)
})
