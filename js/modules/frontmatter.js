export function parseFrontMatter(markdown) {
  // Blog meta format (preferred): HTML comment block at the top.
  // <!--
  // title: Hello World
  // author: NOAH
  // date: 2025-12-30
  // -->
  //
  // Backward compatible: YAML front matter.
  let normalized = String(markdown).replaceAll('\r\n', '\n');
  if (normalized.charCodeAt(0) === 0xfeff) normalized = normalized.slice(1);

  // 1) HTML comment meta
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

export function titleFromMarkdown(markdown, fallbackTitle) {
  const { body, meta } = parseFrontMatter(markdown);
  if (meta.title) return { title: meta.title, meta, body };

  const firstHeading = body.split('\n').find((l) => l.startsWith('# '));
  if (firstHeading) return { title: firstHeading.replace(/^#\s+/, '').trim(), meta, body };

  return { title: fallbackTitle, meta, body };
}
