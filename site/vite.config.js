import { defineConfig } from 'vite'
import { resolve } from 'path'

// 多页应用：入口分流页 + 桌面版(/d/) + 手机版(/m/)
const pages = {
  index: resolve(__dirname, 'index.html'),
  d_index: resolve(__dirname, 'd/index.html'),
  d_poems: resolve(__dirname, 'd/poems.html'),
  d_appreciation: resolve(__dirname, 'd/appreciation.html'),
  d_articles: resolve(__dirname, 'd/articles.html'),
  d_tour: resolve(__dirname, 'd/tour.html'),
  d_gallery: resolve(__dirname, 'd/gallery.html'),
  d_about: resolve(__dirname, 'd/about.html'),
  d_memory: resolve(__dirname, 'd/memory.html'),
  m_index: resolve(__dirname, 'm/index.html'),
  m_poems: resolve(__dirname, 'm/poems.html'),
  m_appreciation: resolve(__dirname, 'm/appreciation.html'),
  m_articles: resolve(__dirname, 'm/articles.html'),
  m_tour: resolve(__dirname, 'm/tour.html'),
  m_gallery: resolve(__dirname, 'm/gallery.html'),
  m_about: resolve(__dirname, 'm/about.html'),
  m_memory: resolve(__dirname, 'm/memory.html')
}

export default defineConfig({
  base: './',
  publicDir: 'public',
  build: {
    rollupOptions: { input: pages },
    outDir: 'dist'
  },
  server: { port: 5199 }
})
