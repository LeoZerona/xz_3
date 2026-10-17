function isNetworkUrl(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null) {
    const details = error as { code?: unknown; message?: unknown }
    if (typeof details.message === 'string') return details.message
    if (typeof details.code === 'number' || typeof details.code === 'string') return `错误码 ${String(details.code)}`
  }
  return String(error)
}

function toAppResourceUrl(url: string): string {
  if (url.startsWith('_www/')) return url
  return `_www/${url.replace(/^(\.\/|\/)+/, '')}`
}

function readAppResource(url: string): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const resourceUrl = toAppResourceUrl(url)
    plus.io.resolveLocalFileSystemURL(
      resourceUrl,
      (entry) => {
        if (!entry.isFile) {
          reject(new Error(`应用资源不是文件：${resourceUrl}`))
          return
        }

        const fileEntry = entry as unknown as PlusIoFileEntry
        fileEntry.file(
          (file) => {
            const reader = new plus.io.FileReader()
            reader.onload = () => {
              const result = reader.result
              const separatorIndex = result?.indexOf(',') ?? -1
              if (!result || separatorIndex < 0) {
                reject(new Error(`应用资源读取结果无效：${resourceUrl}`))
                return
              }
              try {
                resolve(uni.base64ToArrayBuffer(result.slice(separatorIndex + 1)))
              } catch (error) {
                reject(new Error(`应用资源解码失败：${resourceUrl}（${describeError(error)}）`))
              }
            }
            reader.onerror = (event) => {
              reject(new Error(`应用资源读取失败：${resourceUrl}（${describeError(event)}）`))
            }
            reader.readAsDataURL(file)
          },
          (error) => reject(new Error(`无法打开应用资源：${resourceUrl}（${describeError(error)}）`)),
        )
      },
      (error) => reject(new Error(`未找到应用资源：${resourceUrl}（${describeError(error)}）`)),
    )
  })
}

function requestBuffer(url: string): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      responseType: 'arraybuffer',
      success(response) {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`资源请求失败：${response.statusCode}`))
          return
        }
        if (!(response.data instanceof ArrayBuffer)) {
          reject(new Error('资源请求未返回二进制数据'))
          return
        }
        resolve(response.data)
      },
      fail(error) {
        reject(new Error(`资源请求失败：${error.errMsg}`))
      },
    })
  })
}

/**
 * 读取随应用打包的静态资源。App-vue 的逻辑层不保证提供浏览器 fetch，
 * 因此 App 使用 HTML5+ 的只读 `_www` 资源目录；H5 才使用 fetch。
 */
export async function loadAssetBuffer(url: string): Promise<ArrayBuffer> {
  if (typeof plus !== 'undefined' && !isNetworkUrl(url)) {
    return readAppResource(url)
  }

  if (typeof fetch === 'function') {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`资源请求失败：${response.status}`)
    return response.arrayBuffer()
  }

  return requestBuffer(url)
}
