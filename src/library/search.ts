import {getDatabase} from '../database/connection'
import {flushPersistence} from '../database/persistence'
import {compound} from '../database/keys'
import {getBooksCatalog} from '../reading/booksCatalog'
import {readCustomBookText} from '../reading/customBooks'
import {loadTxtBook} from '../reading/bookLoader'
import {fingerprintText} from './annotations'
import type {Change} from '../database/types'
export type ContentMode='word'|'sentence'|'article'
export interface ContentHit {id:string;kind:ContentMode;word?:string;characterIds?:string[];bookId?:string;bookName?:string;startOffset?:number;endOffset?:number;snippet:string;isTitleMatch?:boolean}
export interface ContentSearchResult {entries:ContentHit[];total:number}
export function indexChanges(bookId:string,text:string):Change[]{const fingerprint=fingerprintText(text);const changes:Change[]=[];for(let start=0;start<text.length;start+=4096)changes.push({table:'book_search',row:{id:compound(bookId,start),bookId,startOffset:start,text:text.slice(start,start+4096+100),fingerprint}});return changes}
export async function indexBook(bookId:string,text:string):Promise<void>{const db=await getDatabase();const previous=await db.query('book_search',{where:{bookId}});if(previous[0]?.fingerprint===fingerprintText(text))return;await db.commit([...previous.map((row):Change=>({table:'book_search',deleteId:row.id})),...indexChanges(bookId,text)])}
let indexing:Promise<void>|undefined
async function ensureIndexes(includeBuiltin:boolean):Promise<void>{
  if(indexing)await indexing
  indexing=(async()=>{const db=await getDatabase();const books=await db.query('books',{where:{source:'custom'}});const indexed=new Set((await db.query('book_search')).map(row=>String(row.bookId)))
    for(const book of books)if(!indexed.has(book.id))await indexBook(book.id,await readCustomBookText(book.id))
    if(includeBuiltin)for(const book of getBooksCatalog().filter(book=>book.ext==='txt'))if(!indexed.has(book.id))await indexBook(book.id,(await loadTxtBook(book)).rawText??'')
  })();try{await indexing}finally{indexing=undefined}
}
export async function searchContent(query:string,mode:ContentMode,options:{limit?:number;offset?:number;includeBuiltin?:boolean;signal?:AbortSignal}={}):Promise<ContentSearchResult>{
  await flushPersistence();const value=query.trim().normalize('NFC');if(!value)return{entries:[],total:0};if(value.length>100)throw new Error('检索内容请控制在 100 字符以内');if(options.signal?.aborted)throw new Error('检索已取消')
  const db=await getDatabase();const hits:ContentHit[]=[]
  const offset=Math.max(0,options.offset??0),limit=Math.min(100,Math.max(1,options.limit??50));let total=0
  const append=(hit:ContentHit)=>{if(total>=offset&&hits.length<limit)hits.push(hit);total++}
  if(mode==='word'){
    const words=await db.query('character_words',{orderBy:'position'});const groups=new Map<string,string[]>()
    for(const row of words){const word=String(row.word);if(!word.includes(value))continue;const ids=groups.get(word)??[];if(!ids.includes(String(row.characterId)))ids.push(String(row.characterId));groups.set(word,ids)}
    for(const[word,characterIds]of groups)append({id:word,kind:'word',word,characterIds,snippet:'来自内置组词记录；未提供独立词义。'})
  }else{
    await ensureIndexes(options.includeBuiltin!==false)
    const books=await db.query('books');const builtin=options.includeBuiltin===false?[]:getBooksCatalog();const names=new Map([...builtin.map(book=>[book.id,book.name] as const),...books.map(row=>[row.id,String(row.name)] as const)])
    const seen=new Set<string>()
    if(mode==='article')for(const [bookId,name]of names){if(name.normalize('NFC').includes(value)){append({id:bookId,kind:mode,bookId,bookName:name,startOffset:0,endOffset:0,snippet:'标题匹配：'+name,isTitleMatch:true});seen.add(bookId)}}
    for(const row of await db.query('book_search',{orderBy:'startOffset'})){
      if(!names.has(String(row.bookId))||mode==='article'&&seen.has(String(row.bookId)))continue
      const text=String(row.text);for(let at=text.indexOf(value);at>=0&&at<4096;at=text.indexOf(value,at+Math.max(1,value.length))){const start=Number(row.startOffset)+at;const key=mode==='article'?String(row.bookId):`${row.bookId}:${start}`;append({id:key,kind:mode,bookId:String(row.bookId),bookName:names.get(String(row.bookId)),startOffset:start,endOffset:start+value.length,snippet:text.slice(Math.max(0,at-70),at+value.length+100)});if(mode==='article'){seen.add(key);break}}
    }
  }
  if(options.signal?.aborted)throw new Error('检索已取消');return{entries:hits,total}
}
