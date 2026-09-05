/* 歌未竟 · 桌面版脚本 */
(function () {
  const $ = (s, el) => (el || document).querySelector(s)
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s))
  const page = document.body.dataset.page || ''
  const data = { poems: [], articles: [], images: [] }

  /* 按页面按需加载数据（移动端首屏减负）：文章全文点开才下载 */
  const DATA_URLS = {
    poems: '../data/poems.json',
    feed: '../data/feed.json',
    articles: '../data/articles-index.json',
    images: '../data/images.json',
    route: '../data/route.json',
    appreciation: '../data/appreciation.json',
    remember: '../data/remember.json',
    biography: '../data/biography.json'
  }
  const NEEDS = {
    home: ['feed', 'remember', 'biography'],
    poems: ['poems'],
    articles: ['articles'],
    tour: ['route', 'poems'],
    gallery: ['images'],
    appr: ['appreciation'],
    memory: ['remember'],
    about: []
  }
  async function load() {
    const keys = NEEDS[page] || []
    const list = await Promise.all(keys.map(k => fetch(DATA_URLS[k]).then(r => r.json())))
    keys.forEach((k, i) => {
      const d = list[i]
      if (k === 'poems') data.poems = d.poems || []
      else if (k === 'articles') data.articles = d.items || []
      else if (k === 'remember') data.remember = d.items || []
      else if (k === 'biography') data.biography = d.chapters || []
      else if (k === 'appreciation') data.appreciation = d.appreciation || []
      else if (k === 'images') data.images = d.images || []
      else if (k === 'route') { data.tour = d.tour || []; data.tourAudio = d.audio || '' }
      else data[k] = d
    })
    data.feed = data.feed || {}
    renderers[page] && renderers[page]()
    initFX()
  }

  function yearNum(p) {
    const m = String(p.year).match(/(\d{4})/)
    return m ? +m[1] : 0
  }
  function dayOfYear() {
    const d = new Date()
    return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5)
  }
  function decade(y) { return Math.floor(y / 10) * 10 }
  const bn = t => '《' + t + '》'
  function esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  }
  function escLines(s) { return esc(s).replace(/\r?\n/g, '<br>') }

  /* ---------- 首页 ---------- */
  function home() {
    const f = data.feed || {}
    $('#poemCount').textContent = f.poemCount || 0
    $('#artCount').textContent = f.artCount || 0
    $('#imgCount').textContent = f.imgCount || 0
    // 随机今日一句（点击查看全诗）
    const all = f.poems || []
    const p = all.length ? all[Math.floor(Math.random() * all.length)] : null
    if (p) {
      $('#dailyTitle').textContent = p.title + ' · ' + (p.year || '')
      $('#dailyLine').textContent = p.highlight || ''
      const dc = $('#dailyCard')
      if (dc) dc.href = './poems.html#/p/' + encodeURIComponent(p.id)
    }
    // 今日推荐文章（按日期轮换，点击进入文章页）
    const arts = f.articles || []
    const rec = arts.length ? arts[dayOfYear() % arts.length] : null
    if (rec) {
      $('#recTitle') && ($('#recTitle').textContent = '《' + rec.title + '》' + (rec.juan ? ' · ' + rec.juan : ''))
      const line = (rec.excerpt || '').replace(/\s+/g, '')
      $('#recLine') && ($('#recLine').textContent = line.slice(0, 60) + (line.length > 60 ? '……' : ''))
      $('#recCard') && ($('#recCard').href = './articles.html#/a/' + encodeURIComponent(rec.id))
    }
    // 他人之眼摘录
    const say = $('#sayList')
    if (say && data.remember.length) {
      say.innerHTML = data.remember.map(m => `
        <div class="say-card">
          <div class="say-quote">“${esc((m.pick || m.text || '').slice(0, 96))}${(m.pick || '').length > 96 ? '……' : ''}”</div>
          <div class="say-meta">
            <b>${esc(m.author || m.title)}</b>
            <span>${esc(m.title)}</span>
            <a class="say-more" href="./memory.html">阅读全文 →</a>
          </div>
        </div>`).join('')
    }
    // 平生足迹
    const bio = $('#bioList')
    if (bio && data.biography.length) {
      bio.innerHTML = data.biography.map(c => `
        <div class="bio-ch">
          <div class="bio-no">${esc(c.year)}</div>
          <h3>${esc(c.title)}</h3>
          <p>${escLines(c.text)}</p>
        </div>`).join('')
    }
  }

  /* ---------- 诗词列表 + 详情 ---------- */
  const poemsState = { kw: '', dec: 'all', list: [], order: [] }
  function chipAll() {
    const chips = [['all', '全部'], ['1920', '1920s'], ['1930', '1930s'], ['1940', '1940s'], ['1950', '1950s'], ['1960', '1960s']]
    return chips.map(([v, t]) => `<button class="chip ${v === poemsState.dec ? 'on' : ''}" data-dec="${v}">${t}</button>`).join('')
  }
  function filteredPoems() {
    const kw = poemsState.kw.trim()
    return data.poems.filter(p => {
      const y = yearNum(p), d = decade(y)
      if (poemsState.dec !== 'all' && d !== +poemsState.dec) return false
      if (!kw) return true
      const hay = (p.title + p.year + p.highlight + p.translation + p.text).toLowerCase()
      return hay.includes(kw)
    })
  }
  function renderPoemList() {
    poemsState.list = filteredPoems().slice().sort((a, b) => yearNum(a) - yearNum(b))
    poemsState.order = poemsState.list
    const box = $('#poemCards')
    if (!box) return
    $('#poemCount2') && ($('#poemCount2').textContent = '共 ' + poemsState.list.length + ' 首')
    if (!poemsState.list.length) { box.innerHTML = '<p style="color:#999;padding:30px 0">没有找到匹配的诗词。</p>'; return }
    box.innerHTML = poemsState.list.map((p, i) => `
      <div class="card" data-id="${p.id}">
        <div class="tag"><span>${esc(p.genre || '诗词')}</span><span class="yr">${esc(p.year || '')}</span></div>
        <h3>${esc(bn(p.title))}</h3>
        <div class="hl">${escLines((p.highlight || '').replace(/^>+\s*/gm, '').trim())}</div>
        <div class="tr">${esc(p.translation.slice(0, 90))}${p.translation.length > 90 ? '…' : ''}</div>
        <div class="ft"><span>${p.edition ? (p.edition.includes('副编') ? '副编' : '正编') : ''}</span><span>点击看全诗 →</span></div>
      </div>`).join('')
    $$('.card', box).forEach(c => c.addEventListener('click', () => location.hash = '#/p/' + c.dataset.id))
  }
  function poemDetail(id) {
    const p = data.poems.find(x => x.id === id)
    if (!p) { location.hash = ''; return }
    const list = poemsState.order
    const idx = list.findIndex(x => x.id === id)
    const prev = idx > 0 ? list[idx - 1] : null
    const next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null
    $('#listView').classList.add('hidden')
    const dv = $('#detailView')
    dv.classList.remove('hidden')
    dv.scrollIntoView({ block: 'start' })
    $('#detailView').innerHTML = '<div class="wrap">' + `
      <span class="backlink" onclick="location.hash=''">← 返回诗词集</span>
      <div class="detail">
        <article>
          <div class="meta">${esc(p.year || '')} · <b>${esc(p.genre || '')}</b> · ${esc(p.edition || '')}</div>
          <h1>${esc(bn(p.title))}</h1>
          <div class="poem-text">${escLines(p.text)}</div>
          <div class="translation"><h4>白话译文</h4>${escLines(p.translation)}</div>
          ${p.background ? `<div class="bg-note"><h4>背景</h4>${escLines(p.background)}</div>` : ''}
          <div class="pnav">
            ${prev ? `<div class="pbtn" onclick="location.hash='#/p/${prev.id}'"><small>← 上一篇</small>${esc(bn(prev.title))}</div>` : '<div></div>'}
            ${next ? `<div class="pbtn" style="text-align:right" onclick="location.hash='#/p/${next.id}'"><small>下一篇 →</small>${esc(bn(next.title))}</div>` : '<div></div>'}
          </div>
        </article>
        <aside class="side">
          ${p.image ? `<div class="img"><img src="../${p.image}" alt="${esc(p.title)}"></div><div class="cap">配图：${esc(p.image.replace(/_[^_]+\.(jpg|png)/, ''))}（来源见「关于」页版权声明）</div>` : '<div class="cap">配图待补 · 可前往图库浏览</div>'}
          ${p.audio ? `<div class="p-audio"><audio controls preload="none" src="../${p.audio}"></audio><div class="cap">朗诵音频</div></div>` : '<div class="p-slot">朗诵音频筹备中<br>（素材放入后自动启用）</div>'}
        </aside>
      </div>` + '</div>'
  }
  function poems() {
    $('#chips').innerHTML = chipAll()
    $('#chips').addEventListener('click', e => {
      const b = e.target.closest('.chip'); if (!b) return
      poemsState.dec = b.dataset.dec
      $('#chips').innerHTML = chipAll()
      renderPoemList()
    })
    $('#searchInput').addEventListener('input', e => { poemsState.kw = e.target.value; renderPoemList() })
    window.addEventListener('hashchange', route)
    renderPoemList()
    route()
  }
  function route() {
    const m = location.hash.match(/^#\/p\/(.+)$/)
    if (m) poemDetail(decodeURIComponent(m[1]))
    else if ($('#detailView') && !$('#detailView').classList.contains('hidden')) {
      $('#listView').classList.remove('hidden')
      $('#detailView').classList.add('hidden')
    }
  }

  /* ---------- 文章 ---------- */
  function articles() {
    const box = $('#articleList2')
    box.innerHTML = data.articles.map(a => `
      <div class="a-card" data-id="${a.id}">
        <div class="yr">${esc(a.year)}${a.juan ? ' · ' + esc(a.juan) : ''}</div>
        <h3>${esc(a.title)}</h3>
        <p>${esc(a.excerpt)}…</p>
      </div>`).join('')
    $$('.a-card', box).forEach(c => c.addEventListener('click', () => location.hash = '#/a/' + c.dataset.id))
    window.addEventListener('hashchange', routeArticle)
    routeArticle()
  }
  const artCache = {}
  async function openArticleBody(id) {
    if (!artCache[id]) artCache[id] = fetch('../data/articles/' + encodeURIComponent(id) + '.json').then(r => r.json())
    return artCache[id]
  }
  async function routeArticle() {
    const m = location.hash.match(/^#\/a\/(.+)$/)
    const dv = $('#articleDetail')
    const lv = $('#articleList')
    if (m) {
      try {
        const a = await openArticleBody(decodeURIComponent(m[1]))
        if (!a || !a.title) return
        lv.classList.add('hidden'); dv.classList.remove('hidden')
        dv.innerHTML = `
          <span class="backlink" onclick="location.hash=''">← 返回文章集</span>
          <div class="meta" style="margin-top:20px">${esc(a.year)}${a.juan ? ' · ' + esc(a.juan) : ''}</div>
          <h1 style="font-family:var(--serif);font-size:38px;letter-spacing:.14em;margin:10px 0 24px">${esc(a.title)}</h1>
          <div class="article-body">${escLines(a.text)}</div>`
        dv.scrollIntoView({ block: 'start' })
      } catch (e) { /* 加载失败则不切换 */ }
      return
    }
    if (dv) { lv.classList.remove('hidden'); dv.classList.add('hidden') }
  }

  /* ---------- 巡礼（总音频 · 按时间轴展示） ---------- */
  let tourList = []
  function tour() {
    tourList = (data.tour || []).map(c => {
      const p = data.poems.find(x => x.id === c.id) || {}
      const y = c.year || p.year || ''
      const m4 = String(y).match(/(\d{4})/)
      return { ...c, title: p.title || c.id, genre: p.genre || '', image: p.image || '', year: y, age: m4 ? (+m4[1] - 1893) : '' }
    })
    $('#routeCount').textContent = '共 ' + tourList.length + ' 站 · 按音频时间自动切站 · 只能暂停'
    if (data.tourAudio) {
      const t = new Audio('../' + data.tourAudio); t.preload = 'metadata'
      t.addEventListener('loadedmetadata', () => {
        const d = $('#routeCount'); if (!d) return
        const s = Math.round(t.duration)
        d.textContent = '共 ' + tourList.length + ' 站 · 全程 ' + fmtTime(t.duration) + ' · 按音频时间自动切站 · 只能暂停'
      })
    }
    const sb = $('#startTour')
    if (sb) sb.addEventListener('click', () => startPlayer(0))
    $('#timeline').innerHTML = tourList.map((t, i) => `
      <div class="tl-item t-route" onclick="startPlayer(${i})" title="从这一站开始">
        <div class="tl-top"><span class="no">${String(i + 1).padStart(2, '0')}</span><span class="yr">${esc(t.year)}</span><span class="age">时年 ${t.age} 岁</span></div>
        <h4>${esc(bn(t.title))}</h4>
        <p class="tl-line">${esc(t.line)}</p>
        <div class="tl-links"><span class="ph">♪ 从这一站开始播放</span></div>
      </div>`).join('')
  }

  /* ---------- 图库 ---------- */
  function gallery() {
    const box = $('#galleryGrid')
    box.innerHTML = data.images.map(it => `
      <div class="g-item" data-src="../${it.file}">
        <img src="../${it.file}" alt="${esc(it.title)}" loading="lazy">
        <div class="cap">${esc(it.title)}</div>
      </div>`).join('')
    const lb = $('#lightbox')
    $$('.g-item', box).forEach(g => g.addEventListener('click', () => {
      $('#lightboxImg').src = g.dataset.src
      lb.classList.add('on')
    }))
    lb.addEventListener('click', () => lb.classList.remove('on'))
  }

  function about() { /* 静态内容 */ }

  /* ---------- 巡礼展播（总音频驱动 · 只能暂停） ---------- */
  const stP = { i: -1, playing: false, audio: null }
  function fmtTime(s) { s = Math.max(0, Math.round(s)); return s >= 60 ? Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') : '0:' + String(s).padStart(2, '0') }
  function curIdx() {
    const t = stP.audio ? stP.audio.currentTime : 0
    const idx = tourList.findIndex(c => t < c.end)
    return idx < 0 ? tourList.length - 1 : idx
  }
  function buildLayer() {
    $('#player').innerHTML = `
      <div class="pl-bg" id="plBg" style="background-image:none"></div>
      <div class="pl-top">
        <span class="pl-no" id="plNo"></span>
        <button class="pl-exit" onclick="closePlayer()">✕ 退出展播</button>
      </div>
      <div class="pl-body" id="plBody"></div>
      <div class="pl-bar"><div class="pl-fill" id="plFill"></div></div>
      <div class="pl-ctrl">
        <button class="pl-btn main" id="plPlay" onclick="togglePlay()">Ⅱ 暂停</button>
        <button class="pl-btn" onclick="closePlayer()">退出</button>
        <span class="pl-hint" id="plTime"></span>
      </div>
      <div class="pl-end" id="plEnd">
        <div class="pl-end-t">巡礼结束</div>
        <div class="pl-end-l">歌未竟，东方白</div>
        <div><button class="pl-btn main" onclick="replay()">重新播放</button><button class="pl-btn" onclick="closePlayer()">退出</button></div>
      </div>`
  }
  function startPlayer(i) {
    if (!data.tourAudio || !tourList.length) return
    if (!stP.audio) {
      stP.audio = new Audio('../' + data.tourAudio)
      stP.audio.addEventListener('timeupdate', () => {
        const n = curIdx()
        if (n !== stP.i) renderNode(n)
        updateBar()
      })
      stP.audio.addEventListener('ended', onEnded)
    }
    if (!$('#plBody')) buildLayer()
    $('#plEnd') && $('#plEnd').classList.remove('on')
    $('#player').classList.remove('hidden')
    document.body.style.overflow = 'hidden'
    const from = i > 0 ? Math.min(tourList[i - 1].end, stP.audio.duration || 1e9) : 0
    stP.audio.currentTime = from
    stP.playing = true
    renderNode(i); updateBar(); updatePlBtn()
    stP.audio.play().catch(() => {})
  }
  window.startPlayer = startPlayer
  window.closePlayer = () => {
    if (stP.audio) stP.audio.pause()
    stP.playing = false
    $('#player').classList.add('hidden')
    document.body.style.overflow = ''
  }
  window.togglePlay = () => {
    if (!stP.audio) return
    if (stP.audio.paused) { $('#plEnd') && $('#plEnd').classList.remove('on'); stP.audio.play().catch(() => {}); stP.playing = true }
    else { stP.audio.pause(); stP.playing = false }
    updatePlBtn()
  }
  window.replay = () => {
    if (!stP.audio) return
    stP.audio.currentTime = 0
    $('#plEnd') && $('#plEnd').classList.remove('on')
    stP.playing = true; updatePlBtn()
    stP.audio.play().catch(() => {})
  }
  function onEnded() { stP.playing = false; const e = $('#plEnd'); e && e.classList.add('on'); updatePlBtn() }
  function updatePlBtn() { const b = $('#plPlay'); if (b) b.textContent = stP.playing ? 'Ⅱ 暂停' : '▶ 播放' }
  function updateBar() {
    const f = $('#plFill'), ti = $('#plTime')
    if (!stP.audio) return
    const d = stP.audio.duration || 0
    if (f) f.style.width = (d ? Math.min(100, stP.audio.currentTime / d * 100) : 0) + '%'
    if (ti) ti.textContent = fmtTime(stP.audio.currentTime) + ' / ' + fmtTime(d)
  }
  function renderNode(i) {
    const t = tourList[i]
    if (!t) return
    stP.i = i
    const bg = $('#plBg'), no = $('#plNo'), bd = $('#plBody')
    if (bg) bg.style.backgroundImage = t.image ? `url('../${t.image}')` : 'none'
    if (no) no.textContent = '第 ' + (i + 1) + ' 站 / ' + tourList.length
    if (bd) bd.innerHTML = `
      <div class="pl-meta">${esc(t.year)} · 时年 ${t.age} 岁</div>
      <h2 class="pl-title">${esc(bn(t.title))}</h2>
      <div class="pl-hl">${esc(t.line)}</div>
      <div class="pl-tr">${esc(t.meaning || '')}</div>
      <div class="pl-time">${i > 0 ? fmtTime(tourList[i - 1].end) : '0:00'} – ${t.end > 1e8 ? '至结束（音频完）' : fmtTime(t.end)}</div>`
    updateBar()
  }

  /* ---------- 十大名篇赏析 ---------- */
  function appr() {
    const list = data.appreciation || []
    const box = $('#apprList')
    if (!box || !list.length) return
    const nums = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
    box.innerHTML = list.map((a, i) => `
      <article class="appr" id="ap${i}">
        <div class="appr-head">
          <span class="appr-no">${nums[i] || i + 1}</span>
          <div class="appr-t">
            <div class="appr-yr">${esc(a.year)} · ${esc(a.genre || '诗词')}</div>
            <h2>${esc(bn(a.title))}</h2>
          </div>
          ${a.image ? `<img class="appr-img" src="../${a.image}" alt="${esc(a.title)}">` : ''}
        </div>
        ${a.highlight ? `<div class="appr-note">${escLines((a.highlight || '').replace(/^>+\s*/gm, '').trim())}</div>` : ''}
        <div class="poem-text">${escLines(a.text)}</div>
        <div class="translation"><h4>白话译文</h4>${escLines(a.translation)}</div>
        ${a.background ? `<div class="bg-note"><h4>背景</h4>${escLines(a.background)}</div>` : ''}
        <div class="appr-body"><h4>赏析</h4>${escLines(a.appreciation)}</div>
        ${a.tips && a.tips.length ? `<div class="appr-tips"><h4>学习提示</h4><ul>${a.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
      </article>`).join('')
    const nav = $('#apprNav')
    if (nav) nav.innerHTML = list.map((a, i) =>
      `<a class="appr-anchor" href="#ap${i}">${String(i + 1).padStart(2, '0')}</a>`).join('')
  }

  /* ---------- 他人之眼 ---------- */
  function memory() {
    const box = $('#memList')
    if (!box || !data.remember.length) return
    box.innerHTML = data.remember.map(m => `
      <article class="mem">
        <div class="mem-head">
          <h3>${esc(m.title)}</h3>
          <div class="mem-meta">
            ${esc(m.author ? m.author + ' · ' : '')}${esc(m.year)}<br>
            ${esc(m.source || '')}${m.translator ? ' · ' + esc(m.translator) : ''}
          </div>
        </div>
        ${m.pick ? `<div class="mem-pick">${escLines(m.pick)}</div>` : ''}
        <div class="mem-body">${escLines(m.text)}</div>
      </article>`).join('')
  }

  const renderers = { home, poems, articles, tour, gallery, about, appr, memory }

  /* ---------- 灵动动效 ---------- */
  function countUp(el) {
    const target = parseInt(el.textContent, 10)
    if (isNaN(target)) return
    const t0 = performance.now(), dur = 900
    ;(function tick(t) {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3)
      el.textContent = Math.round(target * e)
      if (k < 1) requestAnimationFrame(tick)
    })(performance.now())
  }
  function initFX() {
    // 卡片交错入场
    $$('.card, .a-card').forEach((c, i) => c.style.setProperty('--d', i % 12))
    // 滚动渐显
    const obs = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target) }
    }), { threshold: .1 })
    $$('.entry, .g-item, .tl-item, .about-card, .sec-head').forEach(el => {
      el.classList.add('reveal'); obs.observe(el)
    })
    // 数字滚动
    $$('#poemCount,#artCount,#imgCount').forEach(countUp)
    // 鼠标光斑（仅在精细指针设备；transform 合成层直接跟随，无 rAF 循环，不持续占用帧）
    if (window.matchMedia('(pointer: fine)').matches) {
      const g = document.createElement('div')
      g.className = 'cursor-glow'
      document.body.appendChild(g)
      addEventListener('mousemove', e => {
        g.style.transform = 'translate3d(' + (e.clientX - 260) + 'px,' + (e.clientY - 260) + 'px,0)'
      })
    }
  }

  document.addEventListener('DOMContentLoaded', load)
})()
