import {computed,ref} from 'vue'
import {onShow} from '@dcloudio/uni-app'
import {readStored,saveStored,flushPersistence} from '../database/persistence'
import {useDatabaseTask} from '../database/useDatabaseTask'
import type {CSSProperties} from 'vue'
export const AVATAR_KEY='font-learning-avatar'
const avatar=ref('')
export interface AvatarInput {dataUrl:string;sourceBytes:number}
export function validateAvatar(input:AvatarInput):void{
  if(!Number.isFinite(input.sourceBytes)||input.sourceBytes<0||input.sourceBytes>2*1024*1024)throw new Error('源图片不能超过 2MB')
  const match=/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(input.dataUrl)
  if(!match)throw new Error('图片格式无效，请选择 PNG 或 JPEG')
  let binary:string;try{binary=atob(match[2]!)}catch{throw new Error('图片编码无效')}
  if(binary.length>256*1024||binary.length<24)throw new Error('图片无效或压缩后超过 256KB')
  if(match[1]==='png'){
    if(binary.slice(0,8)!=='\x89PNG\r\n\x1a\n'||binary.slice(12,16)!=='IHDR'||binary.slice(-8,-4)!=='IEND')throw new Error('PNG 图片结构无效')
    const size=(offset:number)=>((binary.charCodeAt(offset)<<24)>>>0)+binary.charCodeAt(offset+1)*65536+binary.charCodeAt(offset+2)*256+binary.charCodeAt(offset+3)
    if(size(16)<1||size(20)<1||size(16)>512||size(20)>512)throw new Error('头像图片尺寸需在 512 像素以内')
  }else if(binary.slice(0,2)!=='\xff\xd8'||binary.slice(-2)!=='\xff\xd9')throw new Error('JPEG 图片结构无效')
}
export async function saveAvatar(input:AvatarInput):Promise<void>{validateAvatar(input);saveStored(AVATAR_KEY,input.dataUrl);await flushPersistence();avatar.value=input.dataUrl}
export async function clearAvatar():Promise<void>{saveStored(AVATAR_KEY,null);await flushPersistence();avatar.value=''}
function hydrateAvatar():void{const value=readStored(AVATAR_KEY);try{if(typeof value==='string'){validateAvatar({dataUrl:value,sourceBytes:0});avatar.value=value}else avatar.value=''}catch{avatar.value='';/* 损坏的历史头像只回退默认形象，不覆盖原记录。 */}}
export function useAvatar(){useDatabaseTask(hydrateAvatar);onShow(hydrateAvatar);const avatarStyle=computed<CSSProperties>(()=>avatar.value?{backgroundImage:`url("${avatar.value}")`,backgroundSize:'cover',backgroundPosition:'center'}:{});const placeholderStyle=computed<CSSProperties>(()=>avatar.value?{opacity:0}:{});return{avatar,avatarStyle,placeholderStyle}}
