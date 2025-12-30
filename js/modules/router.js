export function getHashPostPath() {
  // #/post/blog/hello.md
  const hash = location.hash || '#/';
  const m = hash.match(/^#\/post\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}
