# 歌未竟 · 站点工程

纪念毛泽东同志逝世五十周年网站（1976—2026）。
红色极简风格 · 文本全部来自同级的「素材」目录。

## 结构

```
site/
├─ index.html            入口：自动识别设备 → /d/（电脑）或 /m/（手机）
├─ d/                    桌面版站点（独立页面与样式，桌面体验深度优化）
│  └─ index/poems/articles/tour/gallery/about.html + css/ + js/
├─ m/                    手机版站点（独立页面与样式：底部 Tab、全屏详情滑入、大触控目标）
│  └─ 同上
├─ scripts/build-data.mjs 素材 md → public/data/*.json（含图片复制、篇目-图片关联）
├─ public/               构建数据（data/poems.json、articles.json、images.json）
└─ dist/                 构建产物（可直接部署到 Cloudflare Pages / GitHub Pages）
```

## 日常命令（在 site/ 目录）

- `npm run data` —— 仅重新生成数据 JSON
- `npm run build` —— 生成数据 + 打包（产物在 dist/）
- `npm run preview` —— 本地预览 dist（默认 4173 端口）
- `npm run dev` —— 开发服务器（5199 端口）

## 设备分流逻辑（index.html）

```js
UA 含 Android/iPhone/… → /m/
或 (窗口宽 ≤ 820px 且 (粗指针 或 触摸)) → /m/
否则 → /d/
```

## 数据字段（poems.json）

id / title / year / genre / edition / highlight(名句) / text(原文) / translation(译文) / background / image(关联图片)

## 待办（占位说明）

- 沉浸式展播（巡礼页）：音频素材就绪后接入播放器；节点结构、命名规范见 素材/音频/README.md
- 6 张图片待补下载：素材/图片/图片素材清单.md（Commons 限流所致，附直链）
- 全部文本"待校"状态：正式上线前与出版物逐篇比对（素材/文字/校对记录.md）
