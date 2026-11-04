let pendingReturnUrl: string | null = null

/** 搜索详情重进搜索时复用原搜索页，空查询才允许恢复原详情。 */
export function openCharacterSearch(returnDetailUrl?: string): void {
  const pages = getCurrentPages()
  const searchIndex = pages.map(page => page.route).lastIndexOf('pages/search/index')
  const fail = () => {
    pendingReturnUrl = null
    uni.showToast({ title: '暂时无法打开文字搜索，请重试', icon: 'none' })
  }
  if (searchIndex < 0) {
    uni.navigateTo({ url: '/pages/search/index', fail })
    return
  }
  const delta = pages.length - 1 - searchIndex
  if (delta === 0) return
  pendingReturnUrl = returnDetailUrl ?? null
  uni.navigateBack({ delta, fail })
}

export function consumeSearchReturnUrl(): string | null {
  const url = pendingReturnUrl
  pendingReturnUrl = null
  return url
}
