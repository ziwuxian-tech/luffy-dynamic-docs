import { defineConfig } from 'vitepress'
import { sidebar as autoSidebar, nav as autoNav } from './config/sidebar'

const baseNav = [
  { text: '首页', link: '/' },
]

const resolvedNav = autoNav.length > 0 ? [...baseNav, ...autoNav] : baseNav
const resolvedSidebar = autoSidebar.length > 0 ? autoSidebar : []

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "路飞动态文档中心",
  description: "动态文档中心",
  head: [['link', {rel: 'icon', href: '/icons/favicon.ico'}]],
  vite: {
    server: {
      port: 4569
    }
  },
  themeConfig: {
    logo: '/icons/favicon.ico',
    nav: resolvedNav,

    // 使用自动生成的侧边栏配置
    sidebar: resolvedSidebar,

    // 搜索配置
    search: {
      provider: 'local'
    },

    // 侧边栏
    outline: {
      level: [1, 5], // 设置目录层级
      label: '页面导航', // 自定义标题
    },

    // 页脚配置
    footer: {
      copyright: 'Copyright © 2025 聂明智'
    }
  }
})
