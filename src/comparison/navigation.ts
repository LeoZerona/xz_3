export function openCharacterComparison(): void {
  const pages = getCurrentPages()
  const existing = pages.findIndex((page) => page.route === 'pages/character-compare/index')
  const fail = () => uni.showToast({ title: '暂时无法打开字形比较，请重试', icon: 'none' })
  if (existing >= 0) {
    const delta = pages.length - 1 - existing
    if (delta > 0) uni.navigateBack({ delta, fail })
  } else uni.navigateTo({ url: '/pages/character-compare/index', fail })
}
