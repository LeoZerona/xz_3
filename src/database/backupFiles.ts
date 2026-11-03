export function writeNativeBackup(text: string): Promise<string> {
  return writeNativeTextFile(text, 'json', 'font-learning-backup')
}
export function writeNativeTextFile(text: string, extension: 'json' | 'txt' | 'ics', prefix = 'font-learning'): Promise<string> {
  return new Promise((resolve, reject) => {
    const fileName = `${prefix.replace(/[^a-z0-9-]/gi, '')}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${extension}`
    plus.io.resolveLocalFileSystemURL('_doc/', (directory) => {
      const entry = directory as PlusIoDirectoryEntry
      entry.getFile(fileName, { create: true, exclusive: true }, (file) => {
        file.createWriter((writer) => {
          writer.onwrite = () => resolve(file.toLocalURL())
          writer.onerror = () => reject(new Error(`备份文件写入失败：${writer.error ?? '未知错误'}`))
          writer.write(text)
        }, reject)
      }, reject)
    }, reject)
  })
}
export function readNativeBackup(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    plus.io.resolveLocalFileSystemURL(path, (entry) => {
      if (!entry.isFile) { reject(new Error('请选择备份文件')); return }
      // DCloud 的回调声明只列出目录类型，运行时 isFile 已确认这是文件项。
      const fileEntry = entry as unknown as PlusIoFileEntry
      fileEntry.file((file) => {
        const reader = new plus.io.FileReader()
        reader.onload = () => resolve(reader.result ?? '')
        reader.onerror = () => reject(new Error('备份文件读取失败'))
        reader.readAsText(file, 'utf-8')
      }, reject)
    }, reject)
  })
}
