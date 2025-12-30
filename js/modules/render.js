import { fetchText } from './http.js';
import { titleFromMarkdown } from './frontmatter.js';
import { escapeHtml } from './ui.js';

export function renderHomeIndex(els, posts) {
  els.elPostTitle.textContent = '文章目录';
  els.elPostMeta.textContent = '';

  const groups = new Map();
  for (const p of posts) {
    const display = p.displayName || p.name.replace(/\.md$/i, '');
    const first = (display.trim()[0] || '#').toUpperCase();
    const key = /^[A-Z]$/.test(first) ? first : '#';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ post: p, display });
  }

  const letters = Array.from(groups.keys())
    .filter((k) => k !== '#')
    .sort((a, b) => a.localeCompare(b));
  if (groups.has('#')) letters.push('#');

  const list = letters
    .map((letter) => {
      const items = groups
        .get(letter)
        .map(({ post, display }) => {
          const text = escapeHtml(display);
          const href = `#/post/${encodeURIComponent(post.path)}`;
          return `<li><a class="gh-index-link" href="${href}">${text}</a></li>`;
        })
        .join('');

      return `
          <div class="gh-index-group">
            <div class="gh-index-letter">${escapeHtml(letter)}</div>
            <ul class="gh-index-list">${items}</ul>
          </div>
        `;
    })
    .join('');

  els.elPostContent.innerHTML = `
      <div class="layui-card gh-card">
        <div class="layui-card-header">全部文章（A-Z）</div>
        <div class="layui-card-body">
          <div class="gh-index-groups">${list}</div>
        </div>
      </div>
    `;
}

export function renderMarkdownToHtml(markdown) {
  marked.setOptions({
    gfm: true,
    breaks: true,
    highlight: function (code, lang) {
      try {
        if (lang && hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
      } catch {
        return code;
      }
    }
  });

  const html = marked.parse(markdown);
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

export async function loadAndShowPostByPath(ctx, path) {
  const { state, els, layuiUse } = ctx;

  const post = state.posts.find((p) => p.path === path);
  if (!post) {
    els.elPostTitle.textContent = '未找到文章';
    els.elPostMeta.textContent = path;
    els.elPostContent.innerHTML = '<p>该文章不存在或尚未加载索引。</p>';
    return;
  }

  let loadingIndex;
  try {
    const ui = await layuiUse(['layer']);
    if (ui.layer && ui.layer.load) {
      loadingIndex = ui.layer.load(1, { shade: 0.15 });
    }
  } catch {
    // ignore
  }

  try {
    // Prefer raw download_url from GitHub API; otherwise fetch via relative path.
    const md = await fetchText(post.downloadUrl || post.path);
    const { title, meta, body } = titleFromMarkdown(md, post.title);

    els.elPostTitle.textContent = title;

    const pieces = [];
    const date = meta.date || post.date;
    if (date) pieces.push(`日期：${escapeHtml(date)}`);
    const author = meta.author || post.author;
    if (author) pieces.push(`作者：${escapeHtml(author)}`);
    els.elPostMeta.innerHTML = pieces.join(' · ');

    els.elPostContent.innerHTML = renderMarkdownToHtml(body);

    // Highlight.js after render (in case marked highlight didn't run for some blocks)
    try {
      els.elPostContent.querySelectorAll('pre code').forEach((block) => hljs.highlightElement(block));
    } catch {
      // ignore
    }
  } catch (err) {
    els.elPostTitle.textContent = '加载失败';
    els.elPostMeta.textContent = '';
    els.elPostContent.innerHTML = `<pre class="layui-code">${escapeHtml(err && err.message ? err.message : String(err))}</pre>`;
  } finally {
    try {
      if (typeof loadingIndex === 'number') layui.layer.close(loadingIndex);
    } catch {
      // ignore
    }
  }
}
