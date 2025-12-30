import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd());
const blogDir = path.join(repoRoot, 'blog');
const outFile = path.join(blogDir, 'index.json');

function parseFrontMatter(markdown) {
  let normalized = String(markdown).replaceAll('\r\n', '\n');
  if (normalized.charCodeAt(0) === 0xfeff) normalized = normalized.slice(1);

  // 1) HTML comment meta (preferred)
  const commentStart = normalized.indexOf('<!--');
  if (commentStart !== -1 && normalized.slice(0, commentStart).trim() === '') {
    const commentEnd = normalized.indexOf('-->', commentStart + 4);
    if (commentEnd !== -1) {
      const raw = normalized.slice(commentStart + 4, commentEnd);
      const body = normalized.slice(commentEnd + 3).replace(/^\n+/, '');
      const meta = {};

      for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const idx = trimmed.indexOf(':');
        if (idx <= 0) continue;
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        if (!key) continue;
        meta[key] = value;
      }

      return { body, meta };
    }
  }

  // 2) YAML front matter (legacy)
  if (!normalized.startsWith('---\n')) return { body: markdown, meta: {} };
  const end = normalized.indexOf('\n---\n', 4);
  if (end === -1) return { body: markdown, meta: {} };

  const raw = normalized.slice(4, end);
  const body = normalized.slice(end + '\n---\n'.length);
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

function displayNameFromFile(file) {
  return file.replace(/\.md$/i, '');
}

async function main() {
  const entries = await fs.readdir(blogDir, { withFileTypes: true });
  const mdFiles = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md'))
    .map((e) => e.name)
    .sort((a, b) => displayNameFromFile(a).toLowerCase().localeCompare(displayNameFromFile(b).toLowerCase()));

  const index = [];
  const errors = [];

  for (const file of mdFiles) {
    const filePath = path.join(blogDir, file);
    const md = await fs.readFile(filePath, 'utf8');
    const { meta } = parseFrontMatter(md);

    const title = typeof meta.title === 'string' ? meta.title.trim() : '';
    const author = typeof meta.author === 'string' ? meta.author.trim() : '';
    const date = typeof meta.date === 'string' ? meta.date.trim() : '';

    if (!title || !author || !date) {
      errors.push({ file, missing: [!title && 'title', !author && 'author', !date && 'date'].filter(Boolean) });
    }

    index.push({ file, title: title || displayNameFromFile(file), author, date });
  }

  // Deduplicate by file name
  const byFile = new Map();
  for (const it of index) {
    if (!byFile.has(it.file)) byFile.set(it.file, it);
  }

  const out = Array.from(byFile.values()).sort((a, b) => displayNameFromFile(a.file).toLowerCase().localeCompare(displayNameFromFile(b.file).toLowerCase()));

  await fs.writeFile(outFile, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${out.length} entries -> ${path.relative(repoRoot, outFile)}`);

  if (errors.length) {
    console.warn('\nFront matter missing required keys (title/author/date):');
    for (const e of errors) {
      console.warn(`- ${e.file}: missing ${e.missing.join(', ')}`);
    }
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
