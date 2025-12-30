import { loadConfig } from './config.js';
import { escapeHtml, layuiUse } from './ui.js';
import { getHashPostPath } from './router.js';
import { hydratePostsFromMarkdown, listPostsViaGitHubApi, listPostsViaLocalIndex } from './posts.js';
import { loadAndShowPostByPath, renderHomeIndex } from './render.js';

function getEls() {
  return {
    elPostTitle: document.getElementById('postTitle'),
    elPostMeta: document.getElementById('postMeta'),
    elPostContent: document.getElementById('postContent')
  };
}

export async function initApp() {
  const els = getEls();

  document.getElementById('year').textContent = String(new Date().getFullYear());

  const state = {
    config: {
      owner: null,
      repo: null,
      branch: 'main'
    },
    posts: []
  };

  const ctx = { state, els, layuiUse };

  await loadConfig(state);

  let posts = [];
  try {
    posts = await listPostsViaGitHubApi(state);
  } catch {
    posts = await listPostsViaLocalIndex();
  }

  state.posts = posts;

  // Build metadata index from markdown front matter at startup.
  // (If running via local index.json, this just reinforces correctness.)
  state.posts = await hydratePostsFromMarkdown(state.posts);

  const targetPath = getHashPostPath();
  if (targetPath) {
    await loadAndShowPostByPath(ctx, targetPath);
  } else {
    renderHomeIndex(els, state.posts);
  }

  window.addEventListener('hashchange', async function () {
    const p = getHashPostPath();
    if (p) {
      await loadAndShowPostByPath(ctx, p);
    } else {
      renderHomeIndex(els, state.posts);
    }
  });
}

export function showInitError(err) {
  const els = getEls();
  els.elPostTitle.textContent = '初始化失败';
  els.elPostContent.innerHTML = `<pre class="layui-code">${escapeHtml(err && err.message ? err.message : String(err))}</pre>`;
}
