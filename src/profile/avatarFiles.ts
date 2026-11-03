export function readImageDataUrl(path:string):Promise<string>{
  if(path.startsWith('data:image/'))return Promise.resolve(path)
  return new Promise((resolve,reject)=>{
    if(typeof plus==='undefined'){reject(new Error('无法读取裁剪后的图片，请重新选择'));return}
    plus.io.resolveLocalFileSystemURL(path,entry=>{if(!entry.isFile){reject(new Error('图片文件不存在'));return};const fileEntry=entry as unknown as PlusIoFileEntry;fileEntry.file(file=>{const reader=new plus.io.FileReader();reader.onload=()=>reader.result?resolve(reader.result):reject(new Error('图片内容为空'));reader.onerror=()=>reject(new Error('图片读取失败'));reader.readAsDataURL(file)},reject)},reject)
  })
}
