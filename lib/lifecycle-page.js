/** Render the public lock/setup shell. All account data arrives through same-origin APIs. */
export function lifecyclePageHtml({ view, basePath = '', nonce }) {
  const config = JSON.stringify({ view, basePath }).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>DeepSeek Lifecycle · Admin</title><link rel="stylesheet" href="${basePath}/lifecycle/assets/login.css"></head><body><div class="wallpaper" aria-hidden="true"></div><div class="veil"></div><main id="app" aria-live="polite"><div class="boot-indicator">正在连接你的工作空间</div></main><div class="corner-brand"><span class="brand-mark">◈</span> DeepSeek Lifecycle</div><div id="toast" role="status"></div><script nonce="${nonce}">window.__LIFECYCLE__=${config}</script><script src="${basePath}/lifecycle/assets/login.js" defer></script></body></html>`;
}
