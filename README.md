# VitePress 动态侧边栏系统

这是一个自动监控 Markdown 文档变化并动态生成 VitePress 侧边栏配置的系统。

## 功能特性

✨ **自动监控** - 实时监控 `配置` 目录中的 Markdown 文件变化  
✨ **智能提取** - 自动提取 Markdown 文件的一级标题作为侧边栏文本  
✨ **目录结构** - 根据文件夹结构自动生成层级侧边栏  
✨ **热更新** - 文件变化时自动重新生成配置,VitePress 自动刷新  
✨ **防抖处理** - 避免频繁触发,提升性能

## 快速开始

### 0. 想直接使用可调用对应系统的脚本
windows
```bash
./setup.bat
```
mac/linux
```bash
./setup.sh
```
如果使用脚本可以跳过后续步骤，可直接[配置环境](./多环境配置指南.md)

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动监控

有两种方式启动:

#### 方式一: 同时启动监控和开发服务器(推荐)

```bash
pnpm run dev
```

这会同时启动:
- 文件监控服务(监控 `配置`)
- VitePress 开发服务器

#### 方式二: 分别启动

```bash
# 终端 1: 启动文件监控
pnpm run watch

# 终端 2: 启动 VitePress 开发服务器
pnpm run docs:dev
```

### 3. 手动生成侧边栏

如果只想生成一次侧边栏配置而不启动监控:

```bash
pnpm run generate
```

## 工作原理

### 目录结构

```
luffy-documents/
├── .vitepress/
│   ├── config.mts          # VitePress 主配置
│   └── config/
│       └── sidebar.ts      # 自动生成的侧边栏配置
├── scripts/
│   ├── generate-sidebar.js # 侧边栏生成脚本
│   └── watch-docs.js       # 文件监控脚本
├── docs/                   # 同步后的文档目录
└── package.json
```

### 监控流程

1. **监控启动** - `watch-docs.js` 使用 `chokidar` 监控 `配置` 目录
2. **检测变化** - 检测到 `.md` 文件的新增、修改或删除
3. **同步文件** - 将 Markdown 文件同步到 `docs/` 目录
4. **扫描目录** - 递归扫描文件结构
5. **提取标题** - 从每个 Markdown 文件中提取一级标题(`# Title`)
6. **生成配置** - 生成 `.vitepress/config/sidebar.ts` 文件
7. **自动刷新** - VitePress 检测到配置变化,自动热更新页面

### 配置说明

[多环境配置指南](./多环境配置指南.md)

## 侧边栏生成规则

### 1. 标题提取

- 优先使用 Markdown 文件中的第一个一级标题(`# Title`)
- 如果没有一级标题,则使用文件名(不含扩展名)

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm run dev` | 启动监控 + 开发服务器 |
| `pnpm run watch` | 仅启动文件监控 |
| `pnpm run generate` | 手动生成侧边栏配置 |
| `pnpm run docs:dev` | 仅启动 VitePress 开发服务器 |
| `pnpm run docs:build` | 构建生产版本 |
| `pnpm run docs:preview` | 预览生产版本 |

## 注意事项

⚠️ **监控目录** - 确保 `配置` 目录存在,否则会生成空的侧边栏配置  
⚠️ **文件格式** - 只监控 `.md` 文件,其他格式会被忽略  
⚠️ **标题格式** - 一级标题必须使用 `# Title` 格式(井号后有空格)  
⚠️ **防抖延迟** - 文件变化后会等待 1 秒再重新生成,避免频繁触发

## 故障排除

### 问题 1: 侧边栏没有更新

**解决方案:**
1. 检查 `配置` 目录是否存在
2. 检查控制台是否有错误信息
3. 手动运行 `pnpm run generate` 查看详细日志

### 问题 2: 标题显示为文件名

**解决方案:**
1. 检查 Markdown 文件是否有一级标题(`# Title`)
2. 确保标题格式正确(井号后有空格)

### 问题 3: 监控不工作

**解决方案:**
1. 确保 `chokidar` 已正确安装
2. 检查文件路径是否正确
3. 尝试重启监控服务
4. 文件是否在排除列表中? 查看 `scripts/generate-sidebar.js` 中的 `excludes` 配置。
