import {writeNativeTextFile} from '../database/backupFiles'
export async function exportTextFile(text:string,extension:'json'|'txt'|'ics',prefix='font-learning'):Promise<string>{
  if(typeof plus!=='undefined')return writeNativeTextFile(text,extension,prefix)
  const url=URL.createObjectURL(new Blob([text],{type:extension==='ics'?'text/calendar;charset=utf-8':extension==='json'?'application/json':'text/plain;charset=utf-8'}))
  try{const link=document.createElement('a');link.href=url;link.download=`${prefix}-${Date.now()}.${extension}`;document.body.appendChild(link);link.click();link.remove();await new Promise(resolve=>setTimeout(resolve,1000));return '文件已导出'}finally{URL.revokeObjectURL(url)}
}
