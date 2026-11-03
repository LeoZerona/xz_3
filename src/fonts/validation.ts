import {object} from '../database/records'
export function isSafeCustomFont(value:unknown):boolean {
  const font=object(value)
  if(typeof font.id!=='string'||typeof font.name!=='string'||typeof font.fontFamily!=='string'||!/^[-A-Za-z0-9_]{1,180}$/.test(font.fontFamily))return false
  if(font.dataUrl!==undefined&&!(typeof font.dataUrl==='string'&&/^data:(?:font\/(?:ttf|otf|woff2?)|application\/(?:octet-stream|x-font-ttf|font-sfnt));base64,[A-Za-z0-9+/]+={0,2}$/.test(font.dataUrl)))return false
  if(font.savedFilePath!==undefined&&!(typeof font.savedFilePath==='string'&&/^(?:_doc\/|file:\/\/\/|\/storage\/|\/data\/)/.test(font.savedFilePath)&&!/["'()\n\r<>]/.test(font.savedFilePath)&&!font.savedFilePath.includes('..')))return false
  return true
}
