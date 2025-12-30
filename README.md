# NOAH.github.io

一个基于 **Layui** 的纯静态 GitHub Blog。

## 目录结构

- `index.html`：首页（文章列表 + Markdown 渲染）
- `css/`：样式
- `js/`：脚本
- `html/`：站内其它页面
- `blog/`：所有博客 Markdown 文件

## 新增/更新文章

把 Markdown 文件放到 `blog/` 目录即可。

### Front matter 规范（必填）

每篇文章文件开头必须带 Markdown 注释字段（HTML comment）（这些字段不会作为正文渲染展示）：

```md
<!--
title: 文章标题
author: 作者
date: 2025-12-30
-->
正文从这里开始...
```

首页文章列表的来源：

1. 优先使用 GitHub API 扫描仓库 `blog/` 目录（无需你维护索引文件）
2. 若 API 不可用（例如被限流或不在 GitHub Pages 域名下访问），则使用 `blog/index.json` 作为兜底

### 自动生成 blog/index.json（推荐）

GitHub Pages 是纯静态站点，浏览器端无法写入仓库文件；因此 `blog/index.json` 需要在本地/CI 生成。

本仓库提供脚本：

```bash
node scripts/generate-index.mjs
```

脚本会扫描 `blog/` 下所有 `.md`，读取 `title/author/date`，并输出到 `blog/index.json`。

### Windows 控制台乱码/崩溃排查

- 如果你在 Windows PowerShell 里看到中文输出乱码，通常是终端/字体/编码显示问题；文件本身仍可能是正确的 UTF-8。
- 如果遇到 PSReadLine 报 `ArgumentOutOfRangeException`（光标渲染崩溃），建议：
  - 换用 Windows Terminal（或 VS Code 内置终端）
  - 升级 PSReadLine 到最新版
  - 临时禁用：在当前 PowerShell 会话执行 `Remove-Module PSReadLine`

## 配置

`site.config.json` 用于指定仓库信息（必要时修改）：

```json
{
  "owner": "NOAH",
  "repo": "NOAH.github.io",
  "branch": "main"
}
```

## 本地预览

用任意静态服务器打开根目录即可，例如：

```bash
py -m http.server 4173
```
