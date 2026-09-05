/**
 * build-data.mjs — 从 素材/文字 目录的 markdown 生成站点数据 JSON
 *
 * 内容添加流程（“做好可以添加的准备”）：
 *   1. 在 素材/文字/诗词  下新建 `年代_篇名.md`（含 front matter、## 原文、## 名句、## 译文、## 背景）
 *   2. 在 素材/文字/文章  下新建 `年代_篇名.md`
 *   3. 在 素材/文字/诗词/00_篇目总表.md 登记篇目（可选）
 *   4. 运行 `npm run data` 或 `npm run build` → 数据自动进入站点
 * 图片：本文件底部 IMAGE_MAP 按“篇名关键字 → 图片文件名”登记，新图素材放入 素材/图片 后在此登记。
 */
import { readdir, readFile, writeFile, access, stat, mkdir, copyFile } from 'fs/promises'
import { resolve, join, extname } from 'path'

const ROOT = resolve(import.meta.dirname, '..')
const POEM_DIR = resolve(ROOT, '..', '素材', '文字', '诗词')
const ART_DIR = resolve(ROOT, '..', '素材', '文字', '文章')
const APPR_DIR = resolve(ROOT, '..', '素材', '文字', '赏析')
const MEM_DIR = resolve(ROOT, '..', '素材', '文字', '忆念')
const BIO_DIR = resolve(ROOT, '..', '素材', '文字', '生平')
const OUT_DIR = resolve(ROOT, 'public', 'data')
const IMG_DIR = resolve(ROOT, '..', '素材', '图片')

// 巡礼展播配置（用户指定）：每站 id / 展示诗句 / 诗意 / end=该站在总音频中的结束秒数（最后一站=音频结束）
const TOUR_AUDIO = '巡礼_完整版' // 素材/音频/巡礼_完整版.mp3（命名规范：名称与扩展名分离，自动匹配）
const TOUR = [
  { id: '1910_七绝·改西乡隆盛诗赠父亲', line: '孩儿立志出乡关，学不成名誓不还。', end: 8, meaning: '我立志走出家乡求学，学不成名绝不回头。' },
  { id: '1916_七古·残句', line: '自信人生二百年，会当水击三千里。', end: 12, meaning: '我自信此生大有可为，更要像大鹏一样在时代的江河巨浪中搏击三千里。' },
  { id: '1925_沁园春·长沙', line: '问苍茫大地，谁主沉浮？', end: 18, meaning: '面对苍茫辽阔的天地，我不禁发问：这大地的兴亡盛衰，究竟由谁来主宰？' },
  { id: '1927_菩萨蛮·黄鹤楼', line: '烟雨莽苍苍，龟蛇锁大江。', end: 27, meaning: '江上烟雨茫茫，龟山与蛇山像两把巨锁，锁住了滔滔东流的长江。' },
  { id: '1928_西江月·井冈山', line: '早已森严壁垒，更加众志成城。', end: 34, meaning: '工事早已森严坚固，军民同心，更如一座坚不可摧的城。' },
  { id: '1929_采桑子·重阳', line: '人生易老天难老，岁岁重阳。', end: 42, meaning: '人生容易老去，天地却不会老；年年岁岁，都会如期而至重阳节。' },
  { id: '1930_如梦令·元旦', line: '山下山下，风展红旗如画。', end: 49, meaning: '山前山后、山上山下，红旗迎风舒展，如画一般。' },
  { id: '1931_渔家傲·反第一次大围剿', line: '唤起工农千百万，同心干，不周山下红旗乱。', end: 57, meaning: '唤起千百万工农，同心协力干革命，不周山下的红旗漫天如潮。' },
  { id: '1933_菩萨蛮·大柏地', line: '装点此关山，今朝更好看。', end: 65, meaning: '当年鏖战留下的弹痕，装点着这片关山——今天看来，反而格外好看。' },
  { id: '1934_清平乐·会昌', line: '踏遍青山人未老，风景这边独好。', end: 72, meaning: '踏遍了漫漫青山，人还没有老去——这里的风景，格外美好。' },
  { id: '1935_七律·长征', line: '更喜岷山千里雪，三军过后尽开颜。', end: 82, meaning: '更令人欣喜的是岷山的千里积雪——红军三军翻越之后，人人笑逐颜开。' },
  { id: '1935_念奴娇·昆仑', line: '飞起玉龙三百万，搅得周天寒彻。', end: 89, meaning: '积雪的昆仑如三百万条玉龙腾空飞起，搅得整个天地寒冷彻骨。' },
  { id: '1935_忆秦娥·娄山关', line: '雄关漫道真如铁，而今迈步从头越。', end: 98, meaning: '这雄关再险固，莫说它真如铁铸——今天我们就迈开大步，从头越过去。' },
  { id: '1949_七律·人民解放军占领南京', line: '天若有情天亦老，人间正道是沧桑。', end: 107, meaning: '天若有情也会衰老；人间的正道，正是沧海桑田般的历史变迁。' },
  { id: '1956_水调歌头·游泳', line: '一桥飞架南北，天堑变通途。', end: 114, meaning: '一座大桥飞架长江南北，天险变作通途，宏图正在展开。' },
  { id: '1958_七律二首·送瘟神', line: '坐地日行八万里，巡天遥看一千河。', end: 123, meaning: '人坐在地球上，一天随着地球运行八万里；巡游长空，纵览千条星河。' },
  { id: '1959_七律·到韶山', line: '为有牺牲多壮志，敢教日月换新天。', end: 132, meaning: '正因为有牺牲，才更添壮志——敢教日月翻篇，换作新天。' },
  { id: '1961_七律·和郭沫若同志', line: '今日欢呼孙大圣，只缘妖雾又重来。', end: 141, meaning: '今天人们欢呼孙大圣，只因为妖雾又一次卷土重来——要像金猴一样奋起扫荡。' },
  { id: '1961_卜算子·咏梅', line: '待到山花烂漫时，她在丛中笑。', end: 151, meaning: '等到山花烂漫、春回大地的时候，她只在花丛中淡淡微笑。' },
  { id: '1963_满江红·和郭沫若同志', line: '一万年太久，只争朝夕。', end: 156, meaning: '一万年太远久了；我们要的是争分夺秒，只争朝夕。' },
  { id: '1965_水调歌头·重上井冈山', line: '久有凌云志，重上井冈山。', end: -1, meaning: '久怀直上云霄的壮志，今天重新登上井冈山。' }
]

// 篇名关键字 → 素材/图片 下文件名（仅限已存在的文件；新图下载后在此登记）
const IMAGE_MAP = [
  { key: '沁园春·长沙', img: '橘子洲大桥_CC.jpg' },
  { key: '西江月·井冈山', img: '黄洋界远眺_CC.jpg' },
  { key: '水调歌头·重上井冈山', img: '黄洋界远眺_CC.jpg' },
  { key: '念奴娇·井冈山', img: '井冈山五指峰_CC.jpg' },
  { key: '清平乐·六盘山', img: '六盘山_CC.jpg' },
  { key: '沁园春·雪', img: '赴重庆谈判1945_公版.jpg' },
  { key: '水调歌头·游泳', img: '武汉长江大桥_CC.jpg' },
  { key: '七律·长征', img: '延安1938_公版.jpg' },
  { key: '七律·人民解放军占领南京', img: '开国大典_公版1949.jpg' },
  { key: '七律·和柳亚子先生', img: '开国大典毛泽东特写_公版.jpg' },
  { key: '十六字令', img: '六盘山长征纪念碑_CC.jpg' },
  { key: '采桑子·重阳', img: '黄洋界远眺_CC.jpg' },
  { key: '贺新郎·读史', img: '开国大典_公版1949.jpg' }
]

async function parseMd(file) {
  let raw = await readFile(file, 'utf8')
  raw = raw.replace(/^\uFEFF/, '') // 兼容带 BOM 的文件
  const fm = {}
  let body = raw
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (m) {
    const text = m[1]
    body = raw.slice(m[0].length)
    for (const line of text.split(/\r?\n/)) {
      const i = line.indexOf('：')
      if (i > 0) fm[line.slice(0, i).trim()] = line.slice(i + 1).trim()
    }
  }
  // 分节：## 章节名
  const sections = {}
  const parts = body.split(/^##\s+/m)
  if (parts.length > 1) {
    sections['_lead'] = parts[0].trim()
    for (let i = 1; i < parts.length; i++) {
      const nl = parts[i].indexOf('\n')
      const name = (nl >= 0 ? parts[i].slice(0, nl) : parts[i]).trim()
      const val = (nl >= 0 ? parts[i].slice(nl + 1) : '').trim()
      sections[name] = val
    }
  } else {
    sections['_body'] = body.trim()
  }
  return { fm, sections }
}

function pickImg(title) {
  for (const it of IMAGE_MAP) if (title.includes(it.key)) return it.img
  return ''
}

async function main() {
  await import('fs/promises').then(fs => fs.mkdir(OUT_DIR, { recursive: true }))
  const needImg = {}
  const poems = []
  const poemFiles = (await readdir(POEM_DIR)).filter(f => f.endsWith('.md') && !f.startsWith('00_'))
  for (const f of poemFiles.sort()) {
    const { fm, sections } = await parseMd(join(POEM_DIR, f))
    const title = fm['标题'] || f.replace(/^\d+_/, '').replace(/\.md$/, '')
    const highlight = sections['名句'] || ''
    let img = pickImg(title)
    if (img) {
      try { await access(join(IMG_DIR, img)); needImg[img] = img } catch { img = '' }
    }
    poems.push({
      id: f.replace(/\.md$/, ''),
      title,
      year: fm['年代'] || '',
      genre: fm['体裁'] || '',
      edition: fm['版本'] || '',
      source: fm['来源'] || '',
      status: fm['状态'] || '',
      highlight,
      text: sections['原文'] || sections['_body'] || '',
      translation: sections['译文'] || '（译文待补）',
      background: sections['背景'] || '',
      image: img ? 'images/' + img : ''
    })
  }
  const articles = []
  const artFiles = (await readdir(ART_DIR)).filter(f => f.endsWith('.md'))
  function makeExcerpt(body, title) {
    const lines = body.split(/\r?\n/).map(l => l.trim().replace(/^\u3000+/, '')).filter(Boolean)
    let i = 0
    while (i < lines.length && i < 4 && (lines[i].length <= 26 || lines[i] === title)) i++
    return lines.slice(i).join('').replace(/^\*+/, '').slice(0, 120)
  }
  for (const f of artFiles.sort()) {
    const { fm, sections } = await parseMd(join(ART_DIR, f))
    const title = fm['标题'] || f.replace(/^\d+_/, '').replace(/\.md$/, '')
    articles.push({
      id: f.replace(/\.md$/, ''),
      title,
      year: fm['年代'] || '',
      juan: fm['卷'] || '',
      source: fm['来源'] || '',
      status: fm['状态'] || '',
      text: sections['原文'] || sections['_body'] || '',
      excerpt: makeExcerpt(sections['原文'] || sections['_body'] || '', title)
    })
  }
  await writeFile(join(OUT_DIR, 'poems.json'), JSON.stringify({ poems }, null, 1), 'utf8')
  await writeFile(join(OUT_DIR, 'articles.json'), JSON.stringify({ articles }, null, 1), 'utf8')

  // 图片库：扫描 素材/图片 下的图片文件，并复制进站点 public/images
  // 城墙一角.jpg 仅作全站底部衬底背景使用，不录入图库
  const BG_ONLY = new Set(['城墙一角.jpg'])
  const images = []
  const IMG_OUT = join(OUT_DIR, '..', 'images')
  try {
    await mkdir(IMG_OUT, { recursive: true })
    for (const f of (await readdir(IMG_DIR))) {
      if (/\.(jpe?g|png|webp|gif)$/i.test(f)) {
        if (!BG_ONLY.has(f)) images.push({ file: 'images/' + f, title: f.replace(/\.[^.]+$/, '') })
        await copyFile(join(IMG_DIR, f), join(IMG_OUT, f))
      }
    }
  } catch (e) { console.log('images copy skipped:', e.message) }
  await writeFile(join(OUT_DIR, 'images.json'), JSON.stringify({ images }, null, 1), 'utf8')

  // 音频：扫描 素材/音频，复制进站点 public/audio，生成索引
  const AUDIO_DIR = resolve(ROOT, '..', '素材', '音频')
  const AUDIO_OUT = join(OUT_DIR, '..', 'audio')
  const audio = []
  try {
    await mkdir(AUDIO_OUT, { recursive: true })
    for (const f of (await readdir(AUDIO_DIR))) {
      if (/\.(mp3|m4a|ogg|wav)$/i.test(f)) {
        audio.push({ file: 'audio/' + f, name: f.replace(/\.[^.]+$/, '') })
        await copyFile(join(AUDIO_DIR, f), join(AUDIO_OUT, f))
      }
    }
  } catch { /* 音频目录缺失则跳过 */ }
  await writeFile(join(OUT_DIR, 'audio.json'), JSON.stringify({ audio }, null, 1), 'utf8')

  // 诗词 → 单篇朗诵音频（素材/音频 文件名含篇名即自动匹配，如「1961_卜算子·咏梅_朗诵.mp3」）
  for (const p of poems) {
    const hit = audio.find(a => a.name.includes(p.title))
    p.audio = hit ? hit.file : ''
  }
  await writeFile(join(OUT_DIR, 'poems.json'), JSON.stringify({ poems }, null, 1), 'utf8')

  // 名篇赏析（素材/文字/赏析/ 下与诗词同名的 md，节：## 赏析 / ## 学习提示）
  const appreciation = []
  try {
    const apprFiles = (await readdir(APPR_DIR)).filter(f => f.endsWith('.md'))
    for (const f of apprFiles.sort()) {
      const id = f.replace(/\.md$/, '')
      const p = poems.find(x => x.id === id)
      if (!p) continue
      const { sections } = await parseMd(join(APPR_DIR, f))
      if (!sections['赏析']) continue
      appreciation.push({
        id, title: p.title, year: p.year, genre: p.genre,
        highlight: p.highlight, text: p.text, translation: p.translation,
        background: p.background, image: p.image,
        appreciation: sections['赏析'],
        tips: (sections['学习提示'] || '').split(/\r?\n/).map(s => s.replace(/^[-*>\s]+/, '').trim()).filter(Boolean)
      })
    }
  } catch (e) { console.log('赏析目录缺失或解析失败:', e.message) }
  await writeFile(join(OUT_DIR, 'appreciation.json'), JSON.stringify({ appreciation }, null, 1), 'utf8')

  // 他人之眼（素材/文字/忆念/*.md：## 精选 = 首页摘录，## 正文 = 全文）
  const remember = []
  try {
    for (const f of (await readdir(MEM_DIR)).filter(x => x.endsWith('.md')).sort()) {
      const { fm, sections } = await parseMd(join(MEM_DIR, f))
      if (!sections['正文']) continue
      remember.push({
        id: f.replace(/\.md$/, ''),
        title: fm['标题'] || f.replace(/\.md$/, ''),
        author: fm['作者'] || '',
        year: fm['年代'] || '',
        source: fm['出处'] || '',
        translator: fm['译者'] || '',
        rights: fm['版权'] || '',
        pick: sections['精选'] || '',
        text: sections['正文']
      })
    }
  } catch (e) { console.log('忆念目录缺失:', e.message) }
  await writeFile(join(OUT_DIR, 'remember.json'), JSON.stringify({ items: remember }, null, 1), 'utf8')

  // 生平（素材/文字/生平/*.md：按文件名排序成章）
  const biography = []
  try {
    for (const f of (await readdir(BIO_DIR)).filter(x => x.endsWith('.md')).sort()) {
      const { fm, sections } = await parseMd(join(BIO_DIR, f))
      if (!sections['_body']) continue
      biography.push({ title: fm['标题'] || f.replace(/\.md$/, ''), year: fm['年代'] || '', text: sections['_body'] })
    }
  } catch (e) { console.log('生平目录缺失:', e.message) }
  await writeFile(join(OUT_DIR, 'biography.json'), JSON.stringify({ chapters: biography }, null, 1), 'utf8')

  // 巡礼展播配置（过滤不存在的篇目；end=-1 表示到音频结束）
  const ids = new Set(poems.map(p => p.id))
  const tour = TOUR.filter(t => ids.has(t.id)).map(t => ({ ...t, end: t.end < 0 ? 1e9 : t.end }))
  const tourFile = audio.find(a => a.name === TOUR_AUDIO) || audio[0]
  await writeFile(join(OUT_DIR, 'route.json'), JSON.stringify({
    route: tour.map(t => t.id),
    tour,
    audio: tourFile ? tourFile.file : ''
  }, null, 1), 'utf8')

  console.log(`poems: ${poems.length} 篇（含译文 ${poems.filter(p => p.translation !== '（译文待补）').length} 篇，含名句 ${poems.filter(p => p.highlight).length} 篇）`)
  console.log(`articles: ${articles.length} 篇`)
  console.log(`images: ${images.length} 张`)
  console.log(`tour: ${tour.length} 站 · 音频 ${audio.length} 个（总音频：${tourFile ? tourFile.file : '未找到'}）`)
  console.log(`appreciation: ${appreciation.length} 篇 · voice-matched: ${poems.filter(p => p.audio).length} 首`)
  console.log(`remember: ${remember.length} 篇 · biography chapters: ${biography.length}`)
  console.log(`image matched: ${Object.keys(needImg).length}`)
}

main().catch(e => { console.error(e); process.exit(1) })
