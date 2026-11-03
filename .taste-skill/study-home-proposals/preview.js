const params = new URLSearchParams(location.search)
const concept = params.get('concept')
const state = params.get('state') || 'progress'
const theme = params.get('theme') || 'blue'
const descriptions = {
  a: { name: '今日学习台', subtitle: '先看任务，再开始练习', text: '计划优先。把进度、字体对照和今日字单连成一条学习路径。', style: '清晰 / 高效 / 易落地' },
  b: { name: '字帖书桌', subtitle: '打开首页，就看见字形', text: '样张优先。用真实小篆与对照字形建立识字学习的独特气质。', style: '安静 / 书卷感 / 有辨识度' },
  c: { name: '字形探索', subtitle: '从一个好奇的字开始', text: '内容优先。先浏览今天的字，再自然进入每日学习与关卡。', style: '丰富 / 可探索 / 内容驱动' },
}
const icons = {
  search: '<circle cx="10.7" cy="10.7" r="6.6"/><path d="m16 16 4.4 4.4"/>',
  book: '<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  reading: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  swap: '<path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4 4-4-4 4-4"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 8-3 8-3 10h18c0-2-3-2-3-10M10 21h4"/>',
}
function icon(name) { return `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.chevron}</svg>` }
function nav() { return `<nav class="app-nav" aria-label="主导航">${[['book','学习'],['grid','关卡学习'],['reading','对照阅读'],['user','我']].map(([name,label], i) => `<button ${i ? 'data-destination="'+label+'"' : 'aria-current="page"'}>${icon(name)}<span>${label}</span></button>`).join('')}</nav>` }
function topbar(extra = '') { return `<header class="app-topbar"><div><h1>学习</h1><p>${extra || '11 月 1 日 · 星期日'}</p></div><div class="top-actions"><button class="icon-button" data-destination="搜索文字" aria-label="搜索文字">${icon('search')}</button><button class="icon-button" data-destination="消息" aria-label="消息">${icon('bell')}</button></div></header>` }
function heading(title, action = '', handler = 'data-list') { return `<div class="section-heading"><h2>${title}</h2>${action ? `<button class="text-button" ${handler}>${action}${icon('chevron')}</button>` : ''}</div>` }
function fontPair(compact = false) { return `<section class="font-pair ${compact ? 'compact' : ''}" aria-label="当前学习字体"><div class="font-item"><span class="font-sample seal">永</span><div><span class="meta">学习字体</span><strong>方正小篆体</strong></div></div><span class="pair-link" aria-hidden="true">${icon('swap')}</span><div class="font-item"><span class="font-sample modern">永</span><div><span class="meta">对照字体</span><strong>优设标题黑</strong></div></div></section>` }
function primary(data, text) { return `<button class="primary-action" data-start>${text || data.action}${icon('arrow')}</button>` }
function stats(data) { return `<div class="stats"><div><span class="meta">今日新学</span><span class="metric">${data.learned}<small> / ${data.total} 字</small></span></div><div><span class="meta">已复习</span><span class="metric">0<small> / 20 字</small></span></div><div><span class="meta">学习时长</span><span class="metric">${data.minutes}<small> 分钟</small></span></div></div>` }
function progress(data) { return `<div class="progress-meta"><span>${data.remaining ? '还剩 ' + data.remaining + ' 字，继续积累' : '今日新学已完成'}</span><span>${data.percent}%</span></div><div class="progress-track" role="progressbar" aria-label="今日新学进度" aria-valuemin="0" aria-valuemax="${data.total}" aria-valuenow="${data.learned}"><span style="width:${data.percent}%"></span></div>` }
function chars(data, count = 5) { return `<div class="character-strip">${data.characters.slice(0,count).map((item, index) => `<button data-char="${index}" aria-label="查看文字${item.text}"><span class="seal glyph">${item.text}</span><span class="char-caption">${item.text}<span class="char-state">${index < data.learned ? '已学' : '待学'}</span></span></button>`).join('')}</div>` }
function destinations() { return `<div class="destination-row"><button data-destination="关卡学习"><span><strong>关卡学习</strong><span class="meta">从一级字表继续探索</span></span>${icon('arrow')}</button><button data-destination="对照阅读"><span><strong>对照阅读</strong><span class="meta">在文章中认字</span></span>${icon('arrow')}</button></div>` }
function designA(data) { return `${topbar()}<div class="screen-content"><section class="plan-panel panel">${heading('今日计划','调整','data-plan')}${stats(data)}${progress(data)}<div class="actions">${primary(data)}<button class="secondary-action" data-review>复习</button></div></section><section>${heading('正在学习','换字体','data-fonts')}${fontPair(true)}</section><section>${heading('今日字单','全部 '+data.total+' 字')}${chars(data)}<p class="section-note">每字完成认字、辨形与输入三种练习</p></section><section>${heading('换一种方式学')}${destinations()}</section></div>${nav()}` }
function specimen(data, mode) { const item = data.characters[mode === 'b' ? 10 : 9]; return `<div class="specimen ${mode === 'b' ? 'paper' : ''}"><div class="specimen-top"><span>${mode === 'b' ? '方正小篆体' : '小篆 · 字形对照'}</span><button class="text-button" data-swap>换一个字 ${icon('swap')}</button></div><button class="specimen-glyph" data-specimen="${mode === 'b' ? 10 : 9}" aria-label="查看文字${item.text}"><span class="seal">${item.text}</span></button><div class="specimen-bottom"><div><span class="modern specimen-reference">${item.text}</span><span class="pronunciation">${item.pinyin}</span></div><span class="meta">优设标题黑 · 对照</span></div></div>` }
function designB(data) { return `${topbar('字体学习 · 每日一页')}<div class="screen-content"><section class="desk-panel">${specimen(data,'b')}<div class="desk-caption"><span>一字，两种形。</span><button class="text-button" data-fonts>更换字体 ${icon('chevron')}</button></div></section><section class="daily-sheet">${heading('今天，学会 '+data.total+' 个字','调整','data-plan')}${progress(data)}<div class="desk-stats"><span>已新学 <b>${data.learned}/${data.total}</b></span><span>已复习 <b>0/20</b></span><span><b>${data.minutes}</b> 分钟</span></div>${primary(data)}</section><section>${heading('今日字单','展开字单')}${chars(data)}</section><button class="reading-row" data-destination="对照阅读"><span>${icon('reading')}在文章中，看见学过的字</span>${icon('arrow')}</button></div>${nav()}` }
function designC(data) { return `${topbar()}<div class="screen-content"><section class="explore">${heading('今天，遇见这些字','看全部')}${specimen(data,'c')}<div class="explore-chars">${data.characters.slice(10,15).map((item,i)=>`<button data-explore="${i+10}" aria-label="切换到文字${item.text}"><span class="seal">${item.text}</span><span>${item.text}</span></button>`).join('')}</div></section><section class="explore-plan panel">${heading('今日计划','调整','data-plan')}<div class="explore-summary"><span class="metric">${data.learned}<small> / ${data.total} 字</small></span><span class="meta">复习 0/20 · ${data.minutes} 分钟</span></div>${progress(data)}${primary(data)}<button class="review-text text-button" data-review>去复习 ${icon('arrow')}</button></section><section>${heading('继续探索')}${destinations()}</section></div>${nav()}` }
async function load() {
  const script = document.createElement('script')
  script.src = './data.js'
  await new Promise((resolve,reject)=>{ script.onload=resolve; script.onerror=()=>reject(new Error('无法读取设计字单')); document.head.append(script) })
  const raw = window.designData
  const learnedIds = state === 'done' ? raw.characters.map(x=>x.id) : state === 'empty' ? [] : raw.characters.slice(0,6).map(x=>x.id)
  const learned = learnedIds.length
  const data = { ...raw, total: raw.characters.length, learned, remaining: raw.characters.length-learned, percent: Math.round(learned/raw.characters.length*100), minutes: state === 'empty' ? 0 : state === 'done' ? 12 : 5, action: learned === 0 ? '开始学习' : learned === raw.characters.length ? '查看今日成果' : '继续学习' }
  console.assert(data.learned + data.remaining === data.total && data.total === raw.dailyTarget, 'Progress must reconcile')
  document.documentElement.dataset.theme = theme
  const root = document.getElementById('root')
  if (!concept) {
    document.body.className='gallery'
    root.innerHTML=`<header class="gallery-heading"><div><h1>学习首页，三种新的打开方式</h1><p>同一份字单，同一组进度。比较信息顺序、字形呈现与操作节奏。</p></div><div class="gallery-controls"><label>示例状态<select id="state-select"><option value="progress">学习中 · 6/15 字</option><option value="empty">未开始 · 0/15 字</option><option value="done">今日完成 · 15/15 字</option></select></label><label>主题<select id="theme-select"><option value="blue">海洋蓝</option><option value="green">翡翠绿</option><option value="dark">夜间墨色</option></select></label></div></header><div class="gallery-grid">${Object.entries(descriptions).map(([key,d])=>`<article class="proposal"><div class="proposal-label"><h2>${key.toUpperCase()} · ${d.name}</h2><span>${key === 'a' ? '推荐方向' : d.style}</span></div><p class="proposal-subtitle">${d.subtitle}</p><iframe title="${d.name}手机设计稿" src="?concept=${key}&state=${state}&theme=${theme}"></iframe><p class="proposal-description">${d.text}</p><a class="standalone" href="?concept=${key}&state=${state}&theme=${theme}" target="_blank">单独体验 ${icon('arrow')}</a></article>`).join('')}</div><footer class="gallery-footer"><span>设计提案 · 2026.11.01</span><span>真实内置字体与字库；进度为展示示例，不读取或修改学习记录。</span></footer>`
    document.getElementById('state-select').value=state
    document.getElementById('theme-select').value=theme
    for (const id of ['state-select','theme-select']) document.getElementById(id).addEventListener('change',()=>{ const url=new URL(location.href); url.searchParams.set('state',document.getElementById('state-select').value);url.searchParams.set('theme',document.getElementById('theme-select').value);location.href=url })
  } else {
    if (!descriptions[concept]) throw new Error('没有这个设计方向')
    document.body.className='single concept-'+concept
    root.className='app-screen'
    root.innerHTML=({a:designA,b:designB,c:designC})[concept](data)
    wire(data)
  }
  await document.fonts.ready
  document.documentElement.dataset.ready='true'
}
function openDialog(title, content) { document.getElementById('dialog-title').textContent=title;document.getElementById('dialog-content').innerHTML=content; document.getElementById('detail-dialog').showModal() }
function dialogChars(data) { return `<div class="dialog-characters">${data.characters.map((item,i)=>`<div><span class="seal">${item.text}</span><span>${item.text} · ${item.pinyin}</span><span class="meta">${i<data.learned ? '已学' : '待学'}</span></div>`).join('')}</div>` }
function wire(data) {
  document.addEventListener('click',event=>{
    const button=event.target.closest('button'); if(!button)return
    if(button.hasAttribute('data-close')) { document.getElementById('detail-dialog').close();return }
    if(button.hasAttribute('data-list')||button.hasAttribute('data-start')) openDialog(button.hasAttribute('data-start') ? '今日学习 · '+data.total+' 字' : '今日字单',dialogChars(data))
    if(button.hasAttribute('data-char')) showCharacter(data.characters[Number(button.dataset.char)])
    if(button.hasAttribute('data-specimen')) showCharacter(data.characters[Number(button.dataset.specimen)])
    if(button.hasAttribute('data-swap')||button.hasAttribute('data-explore')) {
      const target=document.querySelector('[data-specimen]')
      const index=button.hasAttribute('data-explore') ? Number(button.dataset.explore) : (Number(target.dataset.specimen)+1)%data.total
      const item=data.characters[index];target.dataset.specimen=String(index);target.setAttribute('aria-label','查看文字'+item.text);target.querySelector('.seal').textContent=item.text
      document.querySelector('.specimen-reference').textContent=item.text;document.querySelector('.pronunciation').textContent=item.pinyin
      document.querySelectorAll('[data-explore]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)))
    }
    if(button.hasAttribute('data-fonts')) openDialog('当前字体对照',`${fontPair()}<p class="dialog-note">设计稿使用系统现有的方正小篆体与优设标题黑。正式版本沿用你的字体选择。</p>`)
    if(button.hasAttribute('data-plan')) openDialog('今日计划',`<div class="setting-row"><span>每日新学</span><strong>${data.total} 字</strong></div><div class="setting-row"><span>复习目标</span><strong>${data.reviewTarget} 字</strong></div><p class="dialog-note">这是布局预览。正式版本连接现有“修改计划”页面。</p>`)
    if(button.hasAttribute('data-review')) openDialog('复习入口',`<p class="dialog-note">现有首页的复习按钮尚未接入学习流程。设计稿保留入口，复习机制需单独确定。</p>`)
    if(button.hasAttribute('data-destination')) openDialog(button.dataset.destination,`<p class="dialog-note">这是独立设计预览。正式版本连接系统现有的${button.dataset.destination}页面；消息入口延续现状。</p>`)
  })
  document.getElementById('detail-dialog').addEventListener('click',event=>{if(event.target===event.currentTarget)event.currentTarget.close()})
}
function showCharacter(item) {openDialog('字形对照',`<div class="character-detail"><span class="seal">${item.text}</span><span class="modern">${item.text}</span></div><p class="detail-pinyin">${item.text} · ${item.pinyin}</p><div class="detail-font-labels"><span>方正小篆体</span><span>优设标题黑</span></div>`)}
load().catch(error=>{document.getElementById('root').innerHTML='<p class="load-error">设计稿暂时无法加载，请刷新重试。</p>';console.error(error)})
