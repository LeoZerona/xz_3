const fs=require("fs");
const p="C:/Users/22640/Documents/ChatGPT/xz_3/src/pages/reading/index.vue";
let c=fs.readFileSync(p,"utf8");
// remove ReadingPagination import
c=c.replace(/import ReadingPagination from.*\r?\n/g,"");
c=c.replace("import { useFontStore } from '../../stores/fonts'","import { useFontStore } from '../../stores/fonts'\nimport { useThemeStore } from '../../stores/theme'");
c=c.replace("const { currentFont, referenceFont } = storeToRefs(fontStore)","const { currentFont, referenceFont } = storeToRefs(fontStore)\nconst themeStore = useThemeStore()\nconst { currentThemeId } = storeToRefs(themeStore)");
// remove handleCopyRow
c=c.replace(/function handleCopyRow[\s\S]*?^\}/m,"");
// patch handleExitReader
c=c.replace("function handleExitReader(): void {\n  viewMode.value = 'library'\n  showReaderChrome.value = false\n  stopAutoReading()\n}","function handleExitReader(): void {\n  viewMode.value = 'library'\n  showReaderChrome.value = false\n  showReaderCatalog.value = false\n  showReaderSettings.value = false\n  stopAutoReading()\n}\n\nfunction handleReaderTap(): void {\n  if (viewMode.value !== 'reader') return\n  if (showReaderCatalog.value || showReaderSettings.value) {\n    showReaderCatalog.value = false\n    showReaderSettings.value = false\n    return\n  }\n  showReaderChrome.value = !showReaderChrome.value\n}\n\nfunction handleNightToggle(): void {\n  const darkId = 'ink-night'\n  const lightId = 'ocean-blue'\n  const next = currentThemeId.value === darkId ? lightId : darkId\n  themeStore.selectTheme(next)\n  uni.showToast({ title: next === darkId ? '已切换夜间模式' : '已切换日间模式', icon: 'none' })\n}\n\nfunction handleOpenSettings(): void {\n  showReaderSettings.value = !showReaderSettings.value\n  if (showReaderSettings.value) showReaderCatalog.value = false\n}\n\nfunction handleCatalogToggle(): void {\n  showReaderCatalog.value = !showReaderCatalog.value\n  if (showReaderCatalog.value) showReaderSettings.value = false\n}");
c=c.replace("  viewMode.value = 'reader'\n  showReaderChrome.value = false","  viewMode.value = 'reader'\n  showReaderChrome.value = false\n  showReaderCatalog.value = false\n  showReaderSettings.value = false");
c=c.replace("function handleToggleCatalog() {\n  showCatalog.value = !showCatalog.value\n}","function handleToggleCatalog() {\n  if (viewMode.value === 'reader') { handleCatalogToggle(); return }\n  showCatalog.value = !showCatalog.value\n}");
c=c.replace("function handleCloseCatalog() {\n  showCatalog.value = false\n}","function handleCloseCatalog() {\n  showCatalog.value = false\n  showReaderCatalog.value = false\n}");
c=c.replace("function handleSelectBook(bookId: string) {","function handleSelectBook(bookId: string) {\n  showReaderChrome.value = false;");
if(!c.includes("sliderPage")){
  c=c.replace("const autoPageSeconds = computed(() => prefs.value.autoPageSeconds)","const autoPageSeconds = computed(() => prefs.value.autoPageSeconds)\nconst canPrevPage = computed(() => currentPage.value > 1)\nconst canNextPage = computed(() => currentPage.value < totalPages.value)\nconst progressPercent = computed(() => totalPages.value <= 1 ? 100 : Math.round((currentPage.value / totalPages.value) * 100))");
}
// fix rangeLabel keep
fs.writeFileSync(p,c,"utf8");
console.log("patched script");
