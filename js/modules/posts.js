import { fetchJson, fetchText } from './http.js';
import { parseFrontMatter } from './frontmatter.js';

function displayNameFromFile(file) {
  return file.replace(/\.md$/i, '');
}

export function normalizePosts(items) {
  // items can be GitHub API entries or local index entries
  const mapped = items
    .filter((it) => {
      const name = it.name || it.file || '';
      return name.toLowerCase().endsWith('.md');
    })
    .map((it) => {
      const name = it.name || it.file;
      const postPath = it.path || `blog/${name}`;
      const displayName = name.replace(/\.md$/i, '');

      return {
        name,
        path: postPath,
        // Keep title for the content header, but list display uses displayName.
        title: it.title || displayName,
        displayName,
        author: it.author || '',
        date: it.date || '',
        // GitHub API supplies download_url; local index doesn’t.
        downloadUrl: it.download_url || null
      };
    });

  // Deduplicate by path to avoid duplicate entries in blog/index.json.
  const byPath = new Map();
  for (const p of mapped) {
    if (!byPath.has(p.path)) byPath.set(p.path, p);
  }

  return Array.from(byPath.values()).sort((a, b) => a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase()));
}

export async function hydratePostsFromMarkdown(posts) {
  // Generate index metadata from markdown front matter at startup.
  // This cannot write blog/index.json in GitHub Pages (static hosting),
  // but it does auto-build the same data structure in memory.
  const concurrency = 4;
  const out = new Array(posts.length);
  let i = 0;

  async function worker() {
    while (i < posts.length) {
      const idx = i;
      i += 1;
      const p = posts[idx];
      try {
        const md = await fetchText(p.downloadUrl || p.path);
        const { meta } = parseFrontMatter(md);
        out[idx] = {
          ...p,
          title: typeof meta.title === 'string' && meta.title.trim() ? meta.title.trim() : p.title,
          author: typeof meta.author === 'string' ? meta.author.trim() : (p.author || ''),
          date: typeof meta.date === 'string' ? meta.date.trim() : (p.date || '')
        };
      } catch {
        out[idx] = p;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, posts.length) }, () => worker()));
  return out;
}

export async function listPostsViaGitHubApi(state) {
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
      state.config.branch = branch;
      return normalizePosts(items);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to list posts');
}

export async function listPostsViaLocalIndex() {
  // blog/index.json: [ { "file": "hello-world.md", "title": "Hello", "date": "2025-12-30" } ]
  const items = await fetchJson('blog/index.json');
  return normalizePosts(items);
}

export function sortPostsByDisplayName(posts) {
  return [...posts].sort((a, b) => displayNameFromFile(a.name || a.file || a.path || '').toLowerCase().localeCompare(displayNameFromFile(b.name || b.file || b.path || '').toLowerCase()));
}
