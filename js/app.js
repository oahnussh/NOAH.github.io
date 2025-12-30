/* global layui, marked, DOMPurify, hljs */

(function () {
  const elPostList = document.getElementById('postList');
  const elPostTitle = document.getElementById('postTitle');
  const elPostMeta = document.getElementById('postMeta');
  const elPostContent = document.getElementById('postContent');

  document.getElementById('year').textContent = String(new Date().getFullYear());

  const state = {
    config: {
      owner: null,
      repo: null,
      branch: 'main'
    },
    posts: []
  };

  function layuiUse(mods) {
    return new Promise(function (resolve, reject) {
      try {
        if (typeof layui === 'undefined' || !layui.use) {
          reject(new Error('Layui 未加载：请检查 layui.js 引用路径'));
          return;
        }

        layui.use(mods, function () {
          resolve({
            element: layui.element,
            layer: layui.layer
          });
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  function escapeHtml(text) {
    return String(text)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function parseFrontMatter(markdown) {
    // Minimal YAML front matter parsing: only supports simple key: value lines.
    // ---
    // title: Hello
    // date: 2025-12-30
    // ---
    if (!markdown.startsWith('---\n')) return { body: markdown, meta: {} };
    const end = markdown.indexOf('\n---\n', 4);
    if (end === -1) return { body: markdown, meta: {} };

    const raw = markdown.slice(4, end);
    const body = markdown.slice(end + '\n---\n'.length);
    const meta = {};

    for (const line of raw.split('\n')) {
      const idx = line.indexOf(':');
      if (idx <= 0) continue;
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      if (!key) continue;
      meta[key] = value;
    }

    return { body, meta };
  }

  function titleFromMarkdown(markdown, fallbackTitle) {
    const { body, meta } = parseFrontMatter(markdown);
    if (meta.title) return { title: meta.title, meta, body };

    const firstHeading = body.split('\n').find((l) => l.startsWith('# '));
    if (firstHeading) return { title: firstHeading.replace(/^#\s+/, '').trim(), meta, body };

    return { title: fallbackTitle, meta, body };
  }

  function getHashPostPath() {
    // #/post/blog/hello.md
    const hash = location.hash || '#/';
    const m = hash.match(/^#\/post\/(.+)$/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  }

  async function fetchText(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.text();
  }

  async function loadConfig() {
    // Optional: allow override via site.config.json
    // { "owner": "NOAH", "repo": "NOAH.github.io", "branch": "main" }
    try {
      const cfg = await fetchJson('site.config.json');
      if (cfg && typeof cfg === 'object') {
        if (typeof cfg.owner === 'string') state.config.owner = cfg.owner;
        if (typeof cfg.repo === 'string') state.config.repo = cfg.repo;
        if (typeof cfg.branch === 'string') state.config.branch = cfg.branch;
      }
    } catch {
      // ignore
    }

    if (!state.config.owner || !state.config.repo) {
      const host = location.hostname || '';
      const sub = host.split('.')[0];
      // For username.github.io, repo is usually username.github.io
      state.config.owner = state.config.owner || sub;
      state.config.repo = state.config.repo || `${sub}.github.io`;
    }
  }

  function normalizePosts(items) {
    // items can be GitHub API entries or local index entries
    return items
      .filter((it) => {
        const name = it.name || it.file || '';
        return name.toLowerCase().endsWith('.md');
      })
      .map((it) => {
        const name = it.name || it.file;
        const path = it.path || `blog/${name}`;
        const displayName = name.replace(/\.md$/i, '');

        return {
          name,
          path,
          // Keep title for the content header, but list display uses displayName.
          title: it.title || displayName,
          displayName,
          date: it.date || '',
          // GitHub API supplies download_url; local index doesn’t.
          downloadUrl: it.download_url || null
        };
      })
      .sort((a, b) => a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase()));
  }

  async function listPostsViaGitHubApi() {
    const { owner, repo } = state.config;
    const branchesToTry = [];
    if (state.config.branch) branchesToTry.push(state.config.branch);
    if (!branchesToTry.includes('main')) branchesToTry.push('main');
    if (!branchesToTry.includes('master')) branchesToTry.push('master');

    let lastError;
    for (const branch of branchesToTry) {
      try {
        const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/blog?ref=${encodeURIComponent(branch)}`;
        const items = await fetchJson(url);
        // If this works, remember the branch for subsequent loads.
        state.config.branch = branch;
        return normalizePosts(items);
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('Failed to list posts');
  }

  async function listPostsViaLocalIndex() {
    // blog/index.json: [ { "file": "hello-world.md", "title": "Hello", "date": "2025-12-30" } ]
    const items = await fetchJson('blog/index.json');
    return normalizePosts(items);
  }

  function renderPostList(posts) {
    if (!posts.length) {
      elPostList.innerHTML = `
        <li class="layui-nav-item">
          <a href="javascript:;">未发现文章</a>
        </li>
      `;
      return;
    }

    const html = posts
      .map((p) => {
        // Only show filename (without extension) in the left nav.
        const text = escapeHtml(p.displayName || p.name.replace(/\.md$/i, ''));
        const href = `#/post/${encodeURIComponent(p.path)}`;
        return `
          <li class="layui-nav-item" data-path="${escapeHtml(p.path)}">
            <a href="${href}">${text}</a>
          </li>
        `;
      })
      .join('');

    elPostList.innerHTML = html;
  }

  function setActiveInList(path) {
    const items = elPostList.querySelectorAll('.layui-nav-item');
    for (const item of items) {
      if (item.getAttribute('data-path') === path) {
        item.classList.add('layui-this');
      } else {
        item.classList.remove('layui-this');
      }
    }
  }

  function renderMarkdownToHtml(markdown) {
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

  async function loadAndShowPostByPath(path) {
    const post = state.posts.find((p) => p.path === path);
    if (!post) {
      elPostTitle.textContent = '未找到文章';
      elPostMeta.textContent = path;
      elPostContent.innerHTML = '<p>该文章不存在或尚未加载索引。</p>';
      return;
    }

    setActiveInList(path);

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

      elPostTitle.textContent = title;

      const pieces = [];
      const date = meta.date || post.date;
      if (date) pieces.push(`日期：${escapeHtml(date)}`);
      pieces.push(`路径：${escapeHtml(post.path)}`);
      elPostMeta.innerHTML = pieces.join(' · ');

      elPostContent.innerHTML = renderMarkdownToHtml(body);

      // Highlight.js after render (in case marked highlight didn't run for some blocks)
      try {
        elPostContent.querySelectorAll('pre code').forEach((block) => hljs.highlightElement(block));
      } catch {
        // ignore
      }
    } catch (err) {
      elPostTitle.textContent = '加载失败';
      elPostMeta.textContent = '';
      elPostContent.innerHTML = `<pre class="layui-code">${escapeHtml(err && err.message ? err.message : String(err))}</pre>`;
    } finally {
      try {
        if (typeof loadingIndex === 'number') layui.layer.close(loadingIndex);
      } catch {
        // ignore
      }
    }
  }

  async function init() {
    const ui = await layuiUse(['element']);

    await loadConfig();

    let posts = [];
    try {
      posts = await listPostsViaGitHubApi();
    } catch {
      posts = await listPostsViaLocalIndex();
    }

    state.posts = posts;
    renderPostList(posts);

    // Ensure nav is rendered only after element module is available.
    if (ui.element && ui.element.render) {
      ui.element.render('nav', 'postList');
    }

    const targetPath = getHashPostPath();
    if (targetPath) {
      await loadAndShowPostByPath(targetPath);
    } else if (posts[0]) {
      // default show latest
      await loadAndShowPostByPath(posts[0].path);
      location.hash = `#/post/${encodeURIComponent(posts[0].path)}`;
    }

    window.addEventListener('hashchange', async function () {
      const p = getHashPostPath();
      if (p) await loadAndShowPostByPath(p);
    });
  }

  init().catch(function (err) {
    elPostList.innerHTML = `
      <li class="layui-nav-item"><a href="javascript:;">初始化失败</a></li>
    `;
    elPostTitle.textContent = '初始化失败';
    elPostContent.innerHTML = `<pre class="layui-code">${escapeHtml(err && err.message ? err.message : String(err))}</pre>`;
  });
})();
