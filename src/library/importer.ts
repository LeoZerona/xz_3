import {getDatabase} from '../database/connection'
import {flushPersistence} from '../database/persistence'
import {bookRows} from '../database/records'
import {createCustomRecord,readCustomBookText} from '../reading/customBooks'
import {decodeTextBuffer,extractPdfRawText} from '../reading/bookLoader'
import {fingerprintText} from './annotations'
import {indexChanges} from './search'
import {createActivityId} from '../learning/activity'
import type {PdfTextExtractor} from '../reading/pdfTextBridge'
export interface DocumentInput {fileName:string;text?:string;buffer?:ArrayBuffer;extractPdfText?:PdfTextExtractor;signal?:AbortSignal;allowDuplicate?:boolean}
export interface ImportResult {id:string;bookId:string;fileName:string;characters:number;at:string}
export class DuplicateDocumentError extends Error {constructor(public bookId:string){super('正文重复：这份内容已在本机书库中')}}
let imports:Promise<unknown>=Promise.resolve()
export function importDocument(input:DocumentInput):Promise<ImportResult>{const pending=imports.then(()=>performImport(input),()=>performImport(input));imports=pending.catch(()=>undefined);return pending}
async function performImport(input:DocumentInput):Promise<ImportResult>{
  const check=()=>{if(input.signal?.aborted)throw new Error('导入已取消')};check()
  const ext=input.fileName.toLowerCase().endsWith('.pdf')?'pdf':input.fileName.toLowerCase().endsWith('.txt')?'txt':null
  if(!ext)throw new Error('仅支持 TXT 和可提取文字的 PDF 文件')
  if(input.buffer&&input.buffer.byteLength>20*1024*1024)throw new Error('单个文件不能超过 20MB')
  const text=input.text??(input.buffer?(ext==='txt'?decodeTextBuffer(input.buffer):await extractPdfRawText(input.buffer,'import',input.extractPdfText)):'')
  if(!text.trim())throw new Error('未提取到可用文字；扫描 PDF 需先转换成文字')
  if(text.length>5_000_000)throw new Error('正文过长，请拆分为较小资料');check();await flushPersistence()
  const db=await getDatabase();if(!input.allowDuplicate){for(const book of await db.query('books',{where:{source:'custom'}})){check();if(fingerprintText(await readCustomBookText(book.id))===fingerprintText(text))throw new DuplicateDocumentError(book.id)}}
  check();const book=createCustomRecord(input.fileName,text,ext);const result:ImportResult={id:createActivityId('import'),bookId:book.id,fileName:input.fileName,characters:text.length,at:new Date().toISOString()}
  await db.commit([...bookRows(book),...indexChanges(book.id,text),{table:'import_history',row:{...result}}]);return result
}
export async function readImportResult(id:string):Promise<ImportResult>{const row=(await(await getDatabase()).query('import_history',{where:{id}}))[0];if(!row)throw new Error('导入记录不存在');return{id:row.id,bookId:String(row.bookId),fileName:String(row.fileName),characters:Number(row.characters),at:String(row.at)}}
