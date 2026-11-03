const response = await fetch('data.json')
if (!response.ok) throw new Error('布局数据读取失败：' + response.status)
const data = await response.json()
const params = new URLSearchParams(location.search)
const only = params.get('only')
if (['a', 'b', 'c'].includes(only)) {
  document.body.classList.add('one-concept')
  document.querySelector('[data-concept="' + only + '"]').classList.add('chosen')
}

const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
const chevron = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>'
const icons = {
  study: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h7a3 3 0 0 1 2 1 3 3 0 0 1 2-1h7v15h-7a3 3 0 0 0-2 1 3 3 0 0 0-2-1H3zM12 5v15"/></svg>',
  levels: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  reading: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
  profile: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2z"/></svg>',
}
document.querySelectorAll('[data-app-nav]').forEach((nav) => {
  nav.innerHTML = [['study', '学习'], ['levels', '关卡学习'], ['reading', '对照阅读'], ['profile', '我']].map(([key, label]) => '<div class="nav-item' + (key === 'levels' ? ' active' : '') + '">' + icons[key] + '<span>' + label + '</span></div>').join('')
})
document.querySelectorAll('[data-total]').forEach((element) => { element.textContent = data.total })

const themeSelect = document.getElementById('theme-select')
themeSelect.innerHTML = data.themes.map((theme) => '<option value="' + theme.id + '">' + escape(theme.name) + '</option>').join('')
function applyTheme(themeId) {
  const theme = data.themes.find((item) => item.id === themeId) || data.themes[0]
  for (const [token, value] of Object.entries(theme.tokens)) document.documentElement.style.setProperty('--' + token, value)
  document.documentElement.style.colorScheme = theme.mode
  document.documentElement.dataset.previewTheme = theme.id
  themeSelect.value = theme.id
  return theme
}
applyTheme(params.get('theme'))
themeSelect.addEventListener('change', () => {
  applyTheme(themeSelect.value)
  const next = new URL(location.href)
  next.searchParams.set('theme', themeSelect.value)
  history.replaceState(null, '', next)
})

const glyphs = (stage, className) => stage.characters.map((character) => '<span class="' + className + '">' + escape(character.text) + '</span>').join('')
const first = data.stages[0]
document.getElementById('a-book').innerHTML = '<div class="a-book-top"><div class="a-copy-page"><span>' + escape(first.characters[0].text) + '</span></div><div class="a-book-details"><h3>' + escape(first.title) + '</h3><p>未开始 · 10 个字</p><div class="a-nine">' + first.characters.slice(1).map((character) => '<span>' + escape(character.text) + '</span>').join('') + '</div></div></div><div class="a-book-foot"><span>0 / 10 字</span><button class="text-action" data-preview="0">开始这一关' + chevron + '</button></div>'
document.getElementById('a-list').innerHTML = data.stages.slice(1, 7).map((stage, index) => '<button class="a-lesson" data-preview="' + (index + 1) + '" aria-label="预览' + escape(stage.title) + '"><span class="a-lesson-glyph" aria-hidden="true">' + escape(stage.characters[0].text) + '</span><span class="a-lesson-copy"><span class="a-lesson-meta"><strong>' + escape(stage.title) + '</strong><span>0 / 10</span></span><span class="a-lesson-preview" aria-hidden="true">' + glyphs(stage, '') + '</span></span>' + chevron + '</button>').join('')

let flashIndex = 0
function renderFlash() {
  const stage = data.stages[flashIndex]
  document.getElementById('flash-card').innerHTML = '<div class="flash-card-header"><h2>' + escape(stage.title) + '</h2><span>0 / 10 字</span></div><div class="flash-glyphs" aria-label="本关汉字">' + glyphs(stage, '') + '</div><button class="primary-action" data-preview="' + flashIndex + '">开始学习' + chevron + '</button>'
  document.getElementById('b-position').textContent = stage.title
  document.getElementById('b-prev').disabled = flashIndex === 0
  document.getElementById('b-next').disabled = flashIndex === data.stages.length - 1
  document.getElementById('b-picks').innerHTML = data.stages.slice(0, 8).map((item, index) => '<button class="b-pick' + (index === flashIndex ? ' active' : '') + '" data-flash="' + index + '" aria-label="选择' + escape(item.title) + '" aria-pressed="' + (index === flashIndex) + '">' + String(item.index).padStart(2, '0') + '</button>').join('')
}
document.getElementById('b-prev').addEventListener('click', () => { if (flashIndex > 0) { flashIndex -= 1; renderFlash() } })
document.getElementById('b-next').addEventListener('click', () => { if (flashIndex < data.stages.length - 1) { flashIndex += 1; renderFlash() } })
renderFlash()

let boardGroup = 0
let selectedIndex = 0
function renderBoard() {
  const start = boardGroup * 12
  document.getElementById('c-range').textContent = (start + 1) + '—' + (start + 12) + ' 关'
  document.getElementById('c-prev').disabled = boardGroup === 0
  document.getElementById('c-next').disabled = boardGroup === 1
  document.getElementById('board').innerHTML = data.stages.slice(start, start + 12).map((stage, position) => {
    const index = start + position
    return '<button class="board-tile' + (index === selectedIndex ? ' active' : '') + '" data-board="' + index + '" aria-label="选择' + escape(stage.title) + '" aria-pressed="' + (index === selectedIndex) + '"><span class="board-number">' + escape(stage.title) + '</span><span class="board-glyph" aria-hidden="true">' + escape(stage.characters[0].text) + '</span><span class="board-progress">0 / 10</span></button>'
  }).join('')
  const current = data.stages[selectedIndex]
  document.getElementById('c-dock').innerHTML = '<div><div class="dock-title">' + escape(current.title) + '<span>本关 10 字</span></div><div class="dock-glyphs" aria-hidden="true">' + glyphs(current, '') + '</div></div><button class="primary-action" aria-label="预览' + escape(current.title) + '" data-preview="' + selectedIndex + '">' + chevron + '</button>'
}
document.getElementById('c-prev').addEventListener('click', () => { boardGroup = 0; selectedIndex = 0; renderBoard() })
document.getElementById('c-next').addEventListener('click', () => { boardGroup = 1; selectedIndex = 12; renderBoard() })
renderBoard()

const dialog = document.getElementById('lesson-dialog')
document.addEventListener('click', (event) => {
  const target = event.target.closest('button')
  if (!target) return
  if (target.dataset.flash !== undefined) { flashIndex = Number(target.dataset.flash); renderFlash() }
  if (target.dataset.board !== undefined) { selectedIndex = Number(target.dataset.board); renderBoard() }
  if (target.dataset.preview !== undefined) {
    const stage = data.stages[Number(target.dataset.preview)]
    document.getElementById('dialog-title').textContent = stage.title
    document.getElementById('dialog-characters').innerHTML = stage.characters.map((character) => '<div class="dialog-character"><strong>' + escape(character.text) + '</strong><span>' + escape(character.pinyin) + '</span></div>').join('')
    dialog.showModal()
  }
})
document.getElementById('dialog-close').addEventListener('click', () => dialog.close())
document.getElementById('dialog-return').addEventListener('click', () => dialog.close())
if (document.body.classList.contains('one-concept')) {
  document.querySelector('.review-header').remove()
  document.querySelectorAll('.concept:not(.chosen)').forEach((element) => element.remove())
  document.querySelector('.chosen .concept-label').remove()
}
await document.fonts.ready
document.documentElement.dataset.ready = 'true'
