export function layuiUse(mods) {
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

export function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
