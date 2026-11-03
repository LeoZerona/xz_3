import type {Row,Table} from './schema'
import {isStudyMode} from '../study/modes'
import {getBooksCatalog} from '../reading/booksCatalog'
import {object} from './records'
import {validateAvatar} from '../profile/avatar'
import {isSafeCustomFont} from '../fonts/validation'
import {validTime} from '../notifications/schedule'

export function validateBackupRelations(data:Map<Table,Row[]>,knownCharacters?:Set<string>):void {
  const rows=(table:Table)=>data.get(table)??[]
  const ids=(table:Table)=>new Set(rows(table).map(row=>row.id))
  const requireRelation=(valid:boolean,label:string)=>{if(!valid)throw new Error(`备份关联或内容无效：${label}`)}
  const jsonArray=(value:unknown):unknown[]=>{const parsed:unknown=JSON.parse(String(value));if(!Array.isArray(parsed))throw new Error('备份列表字段无效');return parsed}
  const known=(id:unknown)=>typeof id==='string'&&id.length>0&&(!knownCharacters?.size||knownCharacters.has(id))
  const collections=ids('collections'),sessions=ids('practice_sessions'),books=new Set([...ids('books'),...getBooksCatalog().map(book=>book.id)])
  for(const row of rows('collection_items'))requireRelation(collections.has(String(row.collectionId))&&known(row.characterId)&&Number(row.position)>=0,'字单成员')
  for(const row of rows('collections'))requireRelation(typeof row.name==='string'&&[...row.name.trim()].length>0&&[...row.name.trim()].length<=30,'字单名称')
  for(const row of rows('practice_questions'))requireRelation(sessions.has(String(row.sessionId))&&known(row.characterId)&&isStudyMode(row.mode)&&jsonArray(row.optionIds).every(known)&&Number(row.attempts)>=Number(row.mistakes)&&Number(row.mistakes)>=0,'专项题目')
  for(const row of rows('practice_sessions')){const questions=rows('practice_questions').filter(q=>q.sessionId===row.id);const modes=jsonArray(row.modes);requireRelation(modes.length>0&&modes.every(isStudyMode)&&Number(row.cursor)>=0&&Number(row.cursor)<=questions.length,'专项会话')}
  for(const row of rows('library_books'))requireRelation(books.has(row.id)&&['unread','reading','finished'].includes(String(row.status)),'图书状态')
  for(const row of rows('annotations'))requireRelation(books.has(String(row.bookId))&&['bookmark','excerpt'].includes(String(row.kind))&&Number(row.startOffset)>=0&&Number(row.endOffset)>=Number(row.startOffset)&&typeof row.note==='string'&&row.note.length<=5000&&jsonArray(row.tags).every(tag=>typeof tag==='string'),'书签摘录')
  const customBooks=ids('books')
  for(const row of rows('book_chunks'))requireRelation(customBooks.has(String(row.bookId))&&Number(row.startOffset)>=0&&Number(row.position)>=0,'书籍正文')
  for(const book of rows('books')){
    const chunks=rows('book_chunks').filter(row=>row.bookId===book.id).sort((a,b)=>Number(a.position)-Number(b.position));let length=0
    for(const [index,chunk] of chunks.entries()){requireRelation(chunk.position===index&&chunk.startOffset===length,'正文偏移');length+=String(chunk.text).length}
    requireRelation(book.textLength===length&&book.source==='custom'&&['txt','pdf'].includes(String(book.ext)),'正文长度')
  }
  for(const row of rows('reminders'))requireRelation(validTime(String(row.time))&&validTime(String(row.quietStart))&&validTime(String(row.quietEnd))&&jsonArray(row.weekdays).every(day=>typeof day==='number'&&Number.isInteger(day)&&day>=0&&day<=6),'学习提醒')
  for(const row of rows('settings')){
    const value:unknown=JSON.parse(String(row.value))
    if(row.id==='font-learning-avatar'&&value!==null)validateAvatar({dataUrl:String(value),sourceBytes:0})
    if(row.id==='font-learning-custom-fonts')requireRelation(Array.isArray(value)&&value.every(isSafeCustomFont),'自定义字体')
    if(row.id==='font-learning-local-identity')requireRelation(typeof value==='string'&&/^local-[a-f0-9]{12}$/.test(value),'本机档案')
    if(row.id==='font-learning-assessments')for(const [id,item]of Object.entries(object(value))){const session=object(item);const questions=session.questions;requireRelation(session.id===id&&[1,2,3].includes(Number(session.level))&&Array.isArray(questions)&&questions.length<=30,'测评');if(Array.isArray(questions)){requireRelation(Number.isInteger(session.cursor)&&Number(session.cursor)>=0&&Number(session.cursor)<=questions.length,'测评游标');for(const item of questions){const question=object(item);requireRelation(known(question.characterId)&&Array.isArray(question.optionIds)&&question.optionIds.every(known)&&(question.answer===null||typeof question.answer==='string')&&(question.correct===null||typeof question.correct==='boolean'),'测评题目')}}}
  }
}
