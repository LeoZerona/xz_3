$orig = Get-Content -Path "C:\Users\22640\Documents\ChatGPT\xz_3\src\pages\reading\index.vue" -Raw

# --- Script imports transformation ---
$orig = $orig.Replace("import ReadingPagination from ''./components/ReadingPagination.vue''", "import { useThemeStore } from ''../../stores/theme''")
$orig = $orig.Replace("import ReadingPagination from `'./components/ReadingPagination.vue'`", "import { useThemeStore } from `'../../stores/theme'`")
# In case single line, handle both
$orig = $orig -replace "import ReadingPagination from './components/ReadingPagination.vue'\r?\n", "import { useThemeStore } from '../../stores/theme'`r`n"
# Remove any leftover ReadingPagination import
$orig = $orig -replace "import ReadingPagination.*\r?\n", ""

# Remove handleCopyRow function (multiline)
$orig = $orig -replace "function handleCopyRow\(row: ReadingRow\)[\s\S]*?^\}", ""

# Add theme store usage after fontStore line
$orig = $orig.Replace("const { currentFont, referenceFont } = storeToRefs(fontStore)", "const { currentFont, referenceFont } = storeToRefs(fontStore)`r`nconst themeStore = useThemeStore()`r`nconst { currentThemeId } = storeToRefs(themeStore)")

# Add handleReaderTap and related handlers after handleExitReader
$orig = $orig.Replace("function handleExitReader(): void {`r`n  viewMode.value = ''library''`r`n  showReaderChrome.value = false`r`n  stopAutoReading()`r`n}", "function handleExitReader(): void {`r`n  viewMode.value = ''library''`r`n  showReaderChrome.value = false`r`n  showReaderCatalog.value = false`r`n  showReaderSettings.value = false`r`n  stopAutoReading()`r`n}`r`n`r`nfunction handleReaderTap(): void {`r`n  if (viewMode.value !== ''reader'') return`r`n  // 点击纸面切换显隐，抽屉打开时先关闭抽屉`r`n  if (showReaderCatalog.value || showReaderSettings.value) {`r`n    showReaderCatalog.value = false`r`n    showReaderSettings.value = false`r`n    return`r`n  }`r`n  showReaderChrome.value = !showReaderChrome.value`r`n}`r`n`r`nfunction handleNightToggle(): void {`r`n  const darkId = ''ink-night''`r`n  const lightId = ''ocean-blue''`r`n  const next = currentThemeId.value === darkId ? lightId : darkId`r`n  themeStore.selectTheme(next)`r`n  uni.showToast({ title: next === darkId ? ''已切换夜间模式'' : ''已切换日间模式'', icon: ''none'' })`r`n}`r`n`r`nfunction handleOpenSettings(): void {`r`n  showReaderSettings.value = !showReaderSettings.value`r`n  if (showReaderSettings.value) showReaderCatalog.value = false`r`n}`r`n`r`nfunction handleCatalogToggle(): void {`r`n  showReaderCatalog.value = !showReaderCatalog.value`r`n  if (showReaderCatalog.value) showReaderSettings.value = false`r`n}")

# Update handleEnterReader to reset catalog/settings and chrome
$orig = $orig.Replace("  viewMode.value = ''reader''`r`n  showReaderChrome.value = false", "  viewMode.value = ''reader''`r`n  showReaderChrome.value = false`r`n  showReaderCatalog.value = false`r`n  showReaderSettings.value = false")

# Fix handleToggleCatalog to use reader catalog when in reader
# we keep showCatalog for legacy but also sync to showReaderCatalog
$orig = $orig -replace "function handleToggleCatalog\(\) \{\r?\n  showCatalog\.value = !showCatalog\.value\r?\n\}", "function handleToggleCatalog() {`r`n  if (viewMode.value === ''reader'') { handleCatalogToggle(); return }`r`n  showCatalog.value = !showCatalog.value`r`n}"
$orig = $orig -replace "function handleCloseCatalog\(\) \{\r?\n  showCatalog\.value = false\r?\n\}", "function handleCloseCatalog() {`r`n  showCatalog.value = false`r`n  showReaderCatalog.value = false`r`n}"
$orig = $orig -replace "function handleSelectBook\(bookId: string\) \{", "function handleSelectBook(bookId: string) {`r`n  showReaderChrome.value = false;"

# Add computed for slider page
if ($orig -notmatch "sliderPage") {
  $orig = $orig.Replace("const autoPageSeconds = computed(() => prefs.value.autoPageSeconds)", "const autoPageSeconds = computed(() => prefs.value.autoPageSeconds)`r`nconst sliderPage = computed({`r`n  get: () => currentPage.value,`r`n  set: (v: number) => handlePageChange(v),`r`n})`r`nconst canPrevPage = computed(() => currentPage.value > 1)`r`nconst canNextPage = computed(() => currentPage.value < totalPages.value)`r`nconst progressPercent = computed(() => totalPages.value <= 1 ? 100 : Math.round((currentPage.value / totalPages.value) * 100))")
}

Set-Content -Path "C:\Users\22640\Documents\ChatGPT\xz_3\src\pages\reading\index.vue" -Value $orig -NoNewline
Write-Host "script patched"
