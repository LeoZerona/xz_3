import { getDatabase } from '../database/connection'
import { flushPersistence } from '../database/persistence'
import { createActivityId } from '../learning/activity'
import { readLibraryBook } from './repository'
import type { Annotation, AnnotationInput } from './types'

export function fingerprintText(text: string): string {
  let left=2166136261;let right=0x9e3779b9
  for(let index=0;index<text.length;index++){const code=text.charCodeAt(index);left=Math.imul(left^code,16777619);right=Math.imul(right^code,2246822519)}
  return `v1:${text.length}:${(left>>>0).toString(16)}:${(right>>>0).toString(16)}`
}
export function renderedOffsetForRaw(text: string, offset: number): number { return text.slice(0,Math.max(0,offset)).split(/\r?\n/).map(line=>line.replace(/\uFEFF/g,'').trim()).join('').length }
export function rawOffsetForRendered(text: string, offset: number): number {
  let consumed=0;let position=0
  for(const line of text.split(/(?<=\n)/)){
    const normalized=line.replace(/[\r\n\uFEFF]/g,'').trim()
    if(offset<consumed+normalized.length){const start=line.indexOf(normalized);return position+start+Math.max(0,offset-consumed)}
    consumed+=normalized.length;position+=line.length
  }
  return text.length
}
export function checkAnnotation(annotation: Annotation,text: string): 'valid'|'changed' { return fingerprintText(text)===annotation.fingerprint && text.slice(annotation.startOffset,annotation.endOffset)===annotation.quote ? 'valid':'changed' }
export async function listAnnotations(bookId?: string): Promise<Annotation[]> {
  await flushPersistence();const rows=await(await getDatabase()).query('annotations',{where:bookId?{bookId}:undefined,orderBy:'updatedAt',descending:true})
  return rows.map(row=>({id:row.id,bookId:String(row.bookId),kind:row.kind==='bookmark'?'bookmark':'excerpt',fingerprint:String(row.fingerprint),startOffset:Number(row.startOffset),endOffset:Number(row.endOffset),quote:String(row.quote),note:String(row.note),tags:JSON.parse(String(row.tags)) as string[],createdAt:String(row.createdAt),updatedAt:String(row.updatedAt)}))
}
export async function saveAnnotation(input: AnnotationInput): Promise<string> {
  await readLibraryBook(input.bookId)
  const {startOffset:start,endOffset:end,text}=input
  if(!['bookmark','excerpt'].includes(input.kind)||!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<start||input.kind==='excerpt'&&start===end||end>text.length||end-start>2000)throw new Error('请选择有效原文范围，摘录最多 2000 字符')
  if((start>0&&/[\uDC00-\uDFFF]/.test(text[start]??''))||(end<text.length&&/[\uDC00-\uDFFF]/.test(text[end]??'')))throw new Error('原文范围不能截断一个文字')
  const note=(input.note??'').trim();const tags=[...new Set((input.tags??[]).map(tag=>tag.trim()).filter(Boolean))]
  if(note.length>5000||tags.length>10||tags.some(tag=>Array.from(tag).length>20))throw new Error('笔记最多 5000 字符，标签最多 10 个且每个不超过 20 字')
  const previous=input.id?(await listAnnotations(input.bookId)).find(item=>item.id===input.id):undefined
  if(input.id&&!previous)throw new Error('笔记已不存在')
  const id=input.id??createActivityId('annotation');const at=new Date().toISOString()
  await(await getDatabase()).commit([{table:'annotations',row:{id,bookId:input.bookId,kind:input.kind,fingerprint:fingerprintText(text),startOffset:start,endOffset:end,quote:text.slice(start,end),note,tags:JSON.stringify(tags),createdAt:previous?.createdAt??at,updatedAt:at}}])
  return id
}
export async function deleteAnnotation(id:string):Promise<void>{await(await getDatabase()).commit([{table:'annotations',deleteId:id}])}
