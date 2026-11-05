/** Cover a stale, newly protected page with the required refresh action. */
export function mountReloadNotice() {
  let disposed = false, dialog;
  void fetch('/lifecycle/state', { cache: 'no-store' }).then(async response => {
    if (!response.ok) throw new Error('登录状态检查失败：HTTP ' + response.status);
    const state = await response.json();
    if (disposed || state.authenticated) return;
    dialog = document.createElement('div');
    dialog.className = 'dpm-mask';
    dialog.setAttribute('role', 'dialog');dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', '安装完成后需要刷新');
    const panel = document.createElement('section');panel.className = 'dpm-dialog';
    const title = document.createElement('h2');title.textContent = '登录验证已启用，请刷新页面';
    const text = document.createElement('p');text.textContent = '安装 DSH Lifecycle 后，旧页面可能显示“无法连接”或收到 HTTP 401。这是尚未登录，不是插件启动失败。请刷新进入登录或首次设置。';
    const button = document.createElement('button');button.className = 'dpm-refresh-login';
    button.textContent = '刷新并进入登录 / 设置';
    button.onclick = () => window.location.assign('/login');
    panel.append(title, text, button);dialog.append(panel);document.body.append(dialog);
    dialog.style.zIndex = '2147483647';
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Tab') { event.preventDefault();button.focus(); }
    });
    button.focus();
  }).catch(error => { if (!disposed) console.error('[dsh-lifecycle] 无法检查安装后的登录状态', error); });
  return () => { disposed = true;dialog?.remove(); };
}
