import {getDatabase} from '../database/connection'
import {flushPersistence} from '../database/persistence'
import {initializeCatalog,resetCatalogCaches} from '../database/catalog'
import {fontCatalog} from '../fonts/catalog'
import {useFontStore} from '../stores/fonts'
import {loadAssetBuffer} from '../utils/assetLoader'
export async function readResourceStatus(){await flushPersistence();const db=await getDatabase();return{characters:(await db.query('characters')).length,levels:(await db.query('levels')).length,fonts:fontCatalog,customFonts:useFontStore().customFonts.length,indexedBooks:new Set((await db.query('book_search')).map(row=>row.bookId)).size}}
export async function repairCatalogResources():Promise<void>{const db=await getDatabase();await db.commit([{table:'meta',deleteId:'catalog-version'}]);resetCatalogCaches();await initializeCatalog()}
function validFont(data:ArrayBuffer):boolean{return data.byteLength>12&&[0x00010000,0x4f54544f,0x74727565,0x74746366,0x774f4646,0x774f4632].includes(new DataView(data).getUint32(0))}
export async function recoverFontFallback():Promise<string>{const available:typeof fontCatalog=[];for(const font of fontCatalog){try{if(validFont(await loadAssetBuffer(font.fontSource)))available.push(font)}catch{continue};if(available.length===2)break};if(!available.length)throw new Error('没有读取到可用内置字体，请检查应用资源或重新安装后恢复备份');useFontStore().recoverFontRoles(available[0]!.id,(available[1]??available[0])!.id);await flushPersistence();return available.map(font=>font.name).join('、')}
export async function probeFont(id:string):Promise<string>{const font=fontCatalog.find(item=>item.id===id);if(!font)throw new Error('该内置字体不存在');const data=await loadAssetBuffer(font.fontSource);if(!validFont(data))throw new Error('字体文件无效，请使用资源恢复或选择其他字体');return `${font.name}：已读取 ${(data.byteLength/1024/1024).toFixed(2)} MB 文件。字形覆盖仍取决于字体本身。`}
