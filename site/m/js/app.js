/* 歌未竟 · 手机版脚本（与桌面版独立实现） */
(function () {
  const $ = (s, el) => (el || document).querySelector(s)
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s))
  const page = document.body.dataset.page || ''
  const data = { poems: [], articles: [], images: [] }

  async function load() {
    const [p, a, i, r, au, ap, rm, bg] = await Promise.all([
      fetch('../data/poems.json').then(r => r.json()),
      fetch('../data/articles.json').then(r => r.json()),
      fetch('../data/images.json').then(r => r.json()),
      fetch('../data/route.json').then(r => r.json()),
      fetch('../data/audio.json').then(r => r.json()),
      fetch('../data/appreciation.json').then(r => r.json()),
      fetch('../data/remember.json').then(r => r.json()),
      fetch('../data/biography.json').then(r => r.json())
    ])
    data.poems = p.poems; data.articles = a.articles; data.images = i.images
    data.tour = r.tour || []; data.tourAudio = r.audio || ''; data.audio = au.audio || []
    data.appreciation = ap.appreciation || []
    data.remember = rm.items || []
    data.biography = bg.chapters || []
    renderers[page] && renderers[page]()
    initFX()
  }
  function yearNum(p) { const m = String(p.year).match(/(\d{4})/); return m ? +m[1] : 0 }
  const bn = t => '《' + t + '》'
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }
  function escLines(s) { return esc(s).replace(/\r?\n/g, '<br>') }
  function dec(y) { return Math.floor(y / 10) * 10 }

  /* ---------- 首页 ---------- */
  function dayOfYear() {
    const d = new Date()
    return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5)
  }
  function home() {
    $('#poemCount').textContent = data.poems.length
    $('#artCount').textContent = data.articles.length
    const p = data.poems[Math.floor(Math.random() * data.poems.length)]
    $('#dailyTitle').textContent = p.title + ' · ' + (p.year || '')
    $('#dailyLine').textContent = (p.highlight || '').replace(/^>+\s*/gm, '').trim()
    const dc = $('#dailyCard')
    if (dc) dc.href = './poems.html#/p/' + encodeURIComponent(p.id)
    const rec = data.articles[dayOfYear() % Math.max(1, data.articles.length)]
    if (rec) {
      $('#recTitle') && ($('#recTitle').textContent = '《' + rec.title + '》' + (rec.juan ? ' · ' + rec.juan : ''))
      const line = (rec.excerpt || '').replace(/\s+/g, '')
      $('#recLine') && ($('#recLine').textContent = line.slice(0, 56) + (line.length > 56 ? '……' : ''))
      $('#recCard') && ($('#recCard').href = './articles.html#/a/' + encodeURIComponent(rec.id))
    }
    // 他人之眼摘录
    const say = $('#sayList')
    if (say && data.remember.length) {
      say.innerHTML = data.remember.map(m => `
        <a class="say-card" href="./memory.html">
          <div class="say-quote">“${esc((m.pick || m.text || '').slice(0, 68))}${(m.pick || '').length > 68 ? '……' : ''}”</div>
          <div class="say-meta"><b>${esc(m.author || m.title)}</b><span>${esc(m.title)} · 全文 →</span></div>
        </a>`).join('')
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

  /* ---------- 诗词 ---------- */
  const st = { kw: '', dec: 'all', order: [] }
  function filtered() {
    const kw = st.kw.trim().toLowerCase()
    return data.poems.filter(p => {
      const d = dec(yearNum(p))
      if (st.dec !== 'all' && d !== +st.dec) return false
      if (!kw) return true
      const hay = (p.title + p.year + p.highlight + p.translation + p.text).toLowerCase()
      return hay.includes(kw)
    })
  }
  function renderList() {
    st.order = filtered().slice().sort((a, b) => yearNum(a) - yearNum(b))
    const box = $('#cards')
    $('#count').textContent = '共 ' + st.order.length + ' 首'
    box.innerHTML = st.order.length ? st.order.map(p => `
      <div class="card" data-id="${p.id}">
        <div class="meta"><span>${esc(p.genre || '')}</span><span class="yr">${esc(p.year || '')}</span></div>
        <h3>${esc(bn(p.title))}</h3>
        <div class="hl">${escLines((p.highlight || '').replace(/^>+\s*/gm, '').trim())}</div>
        <div class="tr">${esc(p.translation.slice(0, 60))}${p.translation.length > 60 ? '…' : ''}</div>
        <div class="mini"><span>${p.edition && p.edition.includes('副编') ? '副编' : '正编'}</span><span>点击读全诗</span></div>
      </div>`).join('') : '<p style="color:#999;text-align:center;padding:40px 0">没有找到匹配的诗词</p>'
    $$('.card', box).forEach(c => c.addEventListener('click', () => openDetail(c.dataset.id)))
  }
  function chipsHTML() {
    return [['all', '全部'], ['1920', '1920s'], ['1930', '1930s'], ['1940', '1940s'], ['1950', '1950s'], ['1960', '1960s']]
      .map(([v, t]) => `<button class="chip ${v === st.dec ? 'on' : ''}" data-dec="${v}">${t}</button>`).join('')
  }
  function poems() {
    $('#chips').innerHTML = chipsHTML()
    $('#chips').addEventListener('click', e => {
      const b = e.target.closest('.chip'); if (!b) return
      st.dec = b.dataset.dec; $('#chips').innerHTML = chipsHTML(); renderList()
    })
    $('#kw').addEventListener('input', e => { st.kw = e.target.value; renderList() })
    renderList()
    // 支持从首页「今日一句」深链进入：#/p/篇目id
    const m = location.hash.match(/^#\/p\/(.+)$/)
    if (m) openDetail(decodeURIComponent(m[1]))
    addEventListener('hashchange', () => {
      const m2 = location.hash.match(/^#\/p\/(.+)$/)
      if (m2) openDetail(decodeURIComponent(m2[1]))
    })
  }

  /* 全屏详情 */
  let cur = -1
  function openDetail(id) {
    const i = st.order.findIndex(x => x.id === id)
    cur = i
    if (i < 0) return
    const p = st.order[i]
    const prev = i > 0 ? st.order[i - 1] : null
    const next = i < st.order.length - 1 ? st.order[i + 1] : null
    $('#detail').innerHTML = `
      <div class="bar">
        <span class="back" onclick="closeDetail()">‹ 返回</span>
        <span class="t">诗词集 · ${esc(p.year || '')}</span>
        <span style="width:44px"></span>
      </div>
      <div class="body">
        <div class="d-title">${esc(bn(p.title))}</div>
        <div class="d-meta">${esc(p.genre || '')}${p.edition ? ' · ' + esc(p.edition.split('（')[0]) : ''}</div>
        ${p.image ? `<div class="d-img"><img src="../${p.image}" alt=""><div class="cap">配图见「关于」页来源说明</div></div>` : ''}
        <div class="poem-text">${escLines(p.text)}</div>
        <div class="translation"><h4>白话译文</h4>${escLines(p.translation)}</div>
        ${p.background ? `<div class="bg-note"><h4>背景</h4>${escLines(p.background)}</div>` : ''}
        <div class="player-slot">${p.audio ? `<audio controls preload="none" src="../${p.audio}" style="width:100%"></audio><div style="margin-top:8px">朗诵音频</div>` : '朗诵 · 配乐素材筹备中<br>上线后于此播放'}</div>
        <div class="pnav">
          ${prev ? `<div class="pbtn" onclick="openDetail('${prev.id}')"><small>上一篇</small>${esc(prev.title)}</div>` : '<div></div>'}
          ${next ? `<div class="pbtn" onclick="openDetail('${next.id}')"><small>下一篇</small>${esc(next.title)}</div>` : '<div></div>'}
        </div>
      </div>`
    $('#detail').classList.add('on')
    document.body.style.overflow = 'hidden'
  }
  window.closeDetail = function () {
    $('#detail').classList.remove('on')
    document.body.style.overflow = ''
  }
  window.openDetail = openDetail

  /* ---------- 文章 ---------- */
  function articles() {
    const box = $('#alist')
    box.innerHTML = data.articles.map(a => `
      <div class="a-card" data-id="${a.id}">
        <div class="yr">${esc(a.year)}${a.juan ? ' · ' + esc(a.juan) : ''}</div>
        <h3>${esc(a.title)}</h3>
        <p>${esc(a.excerpt)}…</p>
      </div>`).join('')
    $$('.a-card', box).forEach(c => c.addEventListener('click', () => openArticle(c.dataset.id)))
    // 支持从首页「今日推荐」深链进入：#/a/篇目id
    const m = location.hash.match(/^#\/a\/(.+)$/)
    if (m) openArticle(decodeURIComponent(m[1]))
  }
  function openArticle(id) {
    const a = data.articles.find(x => x.id === id)
    if (!a) return
    $('#detail').innerHTML = `
      <div class="bar"><span class="back" onclick="closeDetail()">‹ 返回</span><span class="t">文章集</span><span style="width:44px"></span></div>
      <div class="body">
        <div class="d-title" style="font-size:26px">${esc(a.title)}</div>
        <div class="d-meta">${esc(a.year)}</div>
        <div class="poem-text" style="font-size:15.5px;line-height:2.05">${escLines(a.text)}</div>
      </div>`
    $('#detail').classList.add('on')
    document.body.style.overflow = 'hidden'
  }
  window.openArticle = openArticle

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
        const d = $('#routeCount'); if (d) d.textContent = '共 ' + tourList.length + ' 站 · 全程 ' + fmtTime(t.duration) + ' · 按音频时间自动切站 · 只能暂停'
      })
    }
    $('#startTour').addEventListener('click', () => startPlayer(0))
    $('#timeline').innerHTML = tourList.map((t, i) => `
      <div class="tl-item t-route" onclick="startPlayer(${i})">
        <div class="tl-top"><span class="no">${String(i + 1).padStart(2, '0')}</span><span class="yr">${esc(t.year)}</span><span class="age">时年 ${t.age} 岁</span></div>
        <h4>${esc(bn(t.title))}</h4>
        <p class="tl-line">${esc(t.line)}</p>
        <div class="tl-links"><span class="ph">♪ 从这一站开始播放</span></div>
      </div>`).join('')
  }

  /* ---------- 图库 ---------- */
  function gallery() {
    $('#grid').innerHTML = data.images.map(it => `
      <div class="g-item" data-src="../${it.file}">
        <img src="../${it.file}" loading="lazy" alt=""><div class="cap">${esc(it.title)}</div>
      </div>`).join('')
    $$('.g-item', $('#grid')).forEach(g => g.addEventListener('click', () => {
      $('#lbImg').src = g.dataset.src; $('#lb').classList.add('on')
    }))
    $('#lb').addEventListener('click', () => $('#lb').classList.remove('on'))
  }

  /* ---------- 巡礼展播（总音频驱动 · 只能暂停） ---------- */
  const stP = { i: -1, playing: false, audio: null, dimT: null }
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
        <button class="pl-exit" onclick="closePlayer()">✕</button>
      </div>
      <div class="pl-body" id="plBody" onclick="toggleControl()"></div>
      <div class="pl-bar"><div class="pl-fill" id="plFill"></div></div>
      <div class="pl-ctrl" id="plCtrls">
        <div class="pl-row">
          <button class="pl-btn main" id="plPlay" onclick="togglePlay()">Ⅱ 暂停</button>
          <button class="pl-btn" onclick="closePlayer()">退出</button>
        </div>
        <div class="pl-hint" id="plTime"></div>
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
    clearTimeout(stP.dimT)
    stP.dimT = setTimeout(() => { const c = $('#plCtrls'); c && c.classList.add('dim') }, 6000)
  }
  window.startPlayer = startPlayer
  window.closePlayer = () => {
    if (stP.audio) stP.audio.pause()
    stP.playing = false; clearTimeout(stP.dimT)
    $('#player').classList.add('hidden')
    document.body.style.overflow = ''
  }
  window.toggleControl = () => {
    const c = $('#plCtrls'); if (!c) return
    c.classList.toggle('dim')
    clearTimeout(stP.dimT)
    if (c.classList.contains('dim')) stP.dimT = setTimeout(() => c.classList.remove('dim'), 4000)
  }
  window.togglePlay = () => {
    if (!stP.audio) return
    if (stP.audio.paused) { $('#plEnd') && $('#plEnd').classList.remove('on'); stP.audio.play().catch(() => {}); stP.playing = true }
    else { stP.audio.pause(); stP.playing = false }
    updatePlBtn()
    const c = $('#plCtrls'); c && c.classList.remove('dim')
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
          <h2>${esc(bn(a.title))}</h2>
          <div class="appr-yr">${esc(a.year)} · ${esc(a.genre || '诗词')}</div>
        </div>
        ${a.image ? `<img class="appr-img" src="../${a.image}" alt="${esc(a.title)}">` : ''}
        ${a.highlight ? `<div class="appr-note">${escLines((a.highlight || '').replace(/^>+\s*/gm, '').trim())}</div>` : ''}
        <div class="poem-text" style="font-size:17px;line-height:2.1">${escLines(a.text)}</div>
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
          <div class="mem-meta">${esc(m.author ? m.author + ' · ' : '')}${esc(m.year)}</div>
        </div>
        ${m.pick ? `<div class="mem-pick">${escLines(m.pick)}</div>` : ''}
        <div class="mem-body">${escLines(m.text)}</div>
        <div class="mem-src">${esc(m.source || '')}${m.translator ? ' · ' + esc(m.translator) : ''}</div>
      </article>`).join('')
  }

  const renderers = { home, poems, articles, tour, gallery, appr, memory }

  /* ---------- 灵动动效 ---------- */
  function countUp(el) {
    const target = parseInt(el.textContent, 10)
    if (isNaN(target)) return
    const t0 = performance.now(), dur = 800
    ;(function tick(t) {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3)
      el.textContent = Math.round(target * e)
      if (k < 1) requestAnimationFrame(tick)
    })(performance.now())
  }
  function initFX() {
    $$('.card, .a-card').forEach((c, i) => c.style.setProperty('--d', i % 10))
    const obs = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target) }
    }), { threshold: .1 })
    $$('.a-card, .g-item, .tl-item, .quote-card, .entry').forEach(el => {
      el.classList.add('reveal'); obs.observe(el)
    })
    $$('#poemCount,#artCount').forEach(countUp)
  }

  document.addEventListener('DOMContentLoaded', load)
})()
