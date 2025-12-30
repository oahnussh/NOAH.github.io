NOAH.github.io

一个基于 **Layui** 的纯静态 GitHub Blog。

## 目录结构

- `index.html`：首页（文章列表 + Markdown 渲染）
- `css/`：样式
- `js/`：脚本
- `html/`：站内其它页面
- `blog/`：所有博客 Markdown 文件

## 新增/更新文章

把 Markdown 文件放到 `blog/` 目录即可。

首页文章列表的来源：

1. 优先使用 GitHub API 扫描仓库 `blog/` 目录（无需你维护索引文件）
2. 若 API 不可用（例如被限流或不在 GitHub Pages 域名下访问），则使用 `blog/index.json` 作为兜底

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
npx serve
```
