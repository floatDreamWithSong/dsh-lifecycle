import { mountSecurity } from '../security/index.js';
import { startAuthentication } from '@simplewebauthn/browser';
import { post, get, refreshState, escapeHTML as esc, base } from './api.js';

const app = document.getElementById('app');
const avatar = '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="32" cy="22" r="11"/><path d="M12 54c0-12 8-19 20-19s20 7 20 19" stroke-linecap="round"/></svg>';
const icons = {
  password: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  otp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 18h4M9 6h6M9 10h6"/></svg>',
  passkey: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="9" r="4"/><path d="m11 12 9 9m-5-5 3-3m-1 5 3-3"/></svg>',
  backup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6z"/><path d="m8 12 3 3 5-6"/></svg>',
};
let capabilities;
let factor = false;
let initialPassword = '';
let desiredTwoFactor = false;
let unlockListener;

function message(error) {
  const target = document.querySelector('.auth-error');
  if (target) target.textContent = error.message || String(error);
}

function toast(text) {
  const target = document.getElementById('toast');target.textContent = text;target.classList.add('visible');
  setTimeout(() => target.classList.remove('visible'), 4000);
}

function wireForm(callback) {
  const form = app.querySelector('form');
  if (!form) return;
  form.addEventListener('submit', async event => {
    event.preventDefault();const button = form.querySelector('button[type=submit]');
    if (button?.disabled) return;
    if (button) button.disabled = true;
    const error = document.querySelector('.auth-error');if (error) error.textContent = '';
    try { await callback(new FormData(form)); } catch (error) { message(error); }
    finally { if (button?.isConnected) button.disabled = false; }
  });
}

function showFocused() { document.body.classList.add('focused'); }

function lockScreen() {
  document.body.classList.remove('focused', 'setup-page', 'security-page');
  app.innerHTML = '<section class="lock" tabindex="0" role="button" aria-label="唤醒并登录 Admin"><div class="lock-symbol" aria-hidden="true">⌑</div><div class="clock"></div><div class="date"></div><p class="lock-hint">按 Enter 键，或点击任意位置登录</p></section>';
  const update = () => {
    const now = new Date(), clock = app.querySelector('.clock'), date = app.querySelector('.date');
    if (clock) clock.textContent = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    if (date) date.textContent = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
  };
  update();const timer = setInterval(update, 1000);
  const open = () => { clearInterval(timer);document.removeEventListener('keydown', unlockListener);signin(); };
  unlockListener = event => { if (['Enter', ' ', 'ArrowUp'].includes(event.key)) { event.preventDefault();open(); } };
  document.addEventListener('keydown', unlockListener);app.querySelector('.lock').addEventListener('click', open, { once: true });app.querySelector('.lock').focus();
}

function signin(method = 'password') {
  showFocused();document.body.classList.remove('setup-page', 'security-page');
  const names = { password: '输入密码', otp: '输入认证器验证码', backup: '输入一次性备份代码', passkey: '使用 Passkey 继续' };
  const passkeyReady = capabilities.publicOrigin && new URL(capabilities.publicOrigin).origin === window.location.origin;
  const allowed = factor ? [capabilities.otp && 'otp', capabilities.passkey && passkeyReady && 'passkey', capabilities.otp && 'backup'].filter(Boolean)
    : ['password', capabilities.methods.otp && 'otp', capabilities.methods.passkey && passkeyReady && 'passkey', capabilities.methods.otp && 'backup'].filter(Boolean);
  if (factor && allowed.length === 0) {
    app.innerHTML = `<section class="signin"><div class="avatar">${avatar}</div><h1 class="account-name">Admin</h1><p class="status-line">Passkey 已绑定到你的登录域名，请从该地址继续验证。</p><a class="text-button" href="${esc(capabilities.publicOrigin + base + '/login')}">前往登录域名 →</a></section>`;return;
  }
  if (factor && !allowed.includes(method)) method = allowed[0];
  app.innerHTML = `<section class="signin"><button class="back-lock" aria-label="返回锁屏">‹</button><div class="avatar">${avatar}</div><h1 class="account-name">Admin</h1><p class="signin-sub">${factor ? '再完成一步验证，保护你的工作空间' : '你的工作空间，等你回来'}</p><form autocomplete="on">${method === 'passkey' ? '<button type="submit" class="primary">使用 Passkey</button>' : `<div class="field"><input name="credential" aria-label="${names[method]}" placeholder="${names[method]}" type="${method === 'password' ? 'password' : 'text'}" autocomplete="${method === 'password' ? 'current-password' : 'one-time-code'}" ${method === 'otp' ? 'inputmode="numeric" maxlength="6" class="code-input"' : ''} required><button type="submit" class="submit-arrow" aria-label="登录">→</button></div>`}<p class="auth-error" role="alert"></p></form><div class="method-list">${allowed.map(item => `<button class="method ${item === method ? 'active' : ''}" data-method="${item}" aria-label="${{ password: '密码登录', otp: 'OTP 验证', backup: '使用备份代码', passkey: 'Passkey 验证' }[item]}" title="${names[item]}">${icons[item]}</button>`).join('')}</div><div class="auth-links">${!factor && allowed.length > 1 ? '<span class="text-button">忘记密码？可选择已绑定的其他验证方式</span>' : ''}${factor ? '<button class="text-button" id="restart-login">重新输入密码</button>' : ''}</div></section>`;
  app.querySelector('.back-lock').onclick = lockScreen;
  for (const button of app.querySelectorAll('[data-method]')) button.onclick = () => signin(button.dataset.method);
  app.querySelector('#restart-login')?.addEventListener('click', () => { factor = false;signin('password'); });
  wireForm(async data => {
    let result;
    if (method === 'passkey') {
      const options = await post('/lifecycle/passkeys/auth/options');
      const response = await startAuthentication({ optionsJSON: options.options });
      result = await post('/lifecycle/passkeys/auth/verify', { response });
    } else result = await post('/lifecycle/login', { method, ...(method === 'password' ? { password: data.get('credential') } : { code: data.get('credential') }) });
    capabilities = await refreshState();
    if (result.stage === 'factor') { factor = true;signin(); }
    else if (result.stage === 'setup') { setupNewPassword(); }
    else await welcome();
  });
  app.querySelector('input')?.focus();
}

async function welcome() {
  showFocused();app.innerHTML = `<section class="signin"><div class="welcome"><div class="avatar">${avatar}</div><h1>欢迎回来，Admin</h1><div class="loading-ring" aria-hidden="true"></div><p>正在准备你的工作空间</p></div></section>`;
  await new Promise(resolve => setTimeout(resolve, 650));document.body.classList.add('leaving');
  await new Promise(resolve => setTimeout(resolve, 350));window.location.assign(base + '/');
}

function oobe(title, description, content, step) {
  document.body.classList.add('setup-page');document.body.classList.remove('security-page', 'focused');
  app.innerHTML = `<section class="oobe"><aside class="oobe-visual"><div class="oobe-emblem" aria-hidden="true"></div><h2>让工作空间属于你</h2><p>DEEPSEEK LIFECYCLE</p></aside><div class="oobe-content"><div class="steps" aria-label="初始化进度">${[0, 1, 2, 3].map(i => `<span class="${i <= step ? 'active' : ''}"></span>`).join('')}</div><p class="eyebrow">WELCOME, ADMIN</p><h1>${title}</h1><p class="description">${description}</p>${content}<p class="auth-error" role="alert"></p></div></section>`;
  // Focus during render so a later timer cannot steal focus from the next field.
  app.querySelector('input')?.focus();
}

function setupInitial() {
  oobe('从这里，开始你的工作空间', '安装后旧页面返回 401 是登录验证已生效，请刷新进入此页。随机初始密码在下方显示，验证后必须立即设置自己的密码。', '<form><label for="initial-password">初始密码</label><input id="initial-password" name="password" type="text" autocomplete="off" placeholder="正在读取随机初始密码" readonly required><p class="initial-note">此密码对可访问首次设置页的访客可见，请在受控环境立即完成初始化。改密后不再展示。</p><div class="button-row"><button type="submit" class="primary" disabled>下一步 →</button></div></form>', 0);
  const input = app.querySelector('#initial-password');
  void post('/lifecycle/bootstrap').then(result => {
    if (!input.isConnected) return;
    input.value = result.initialPassword;
    app.querySelector('button[type=submit]').disabled = false;
  }).catch(message);
  wireForm(async data => {
    initialPassword = String(data.get('password'));
    const result = await post('/lifecycle/login', { method: 'password', password: initialPassword });
    capabilities = await refreshState();
    if (result.stage === 'factor') { factor = true;signin(); } else setupNewPassword();
  });
}

function setupNewPassword() {
  oobe('设置一个属于你的密码', '密码至少 8 位，并包含大小写字母或特殊字符。以后重启服务，已验证的登录状态也会保留。', `<form>${!initialPassword ? '<label for="current-password">初始密码</label><input id="current-password" name="current" type="password" autocomplete="current-password" required>' : ''}<label for="new-password">新密码</label><input id="new-password" name="password" type="password" autocomplete="new-password" required minlength="8"><label for="confirm-password">确认密码</label><input id="confirm-password" name="confirm" type="password" autocomplete="new-password" required><div class="button-row"><button type="submit" class="primary">下一步 →</button></div></form>`, 1);
  wireForm(async data => {
    if (data.get('password') !== data.get('confirm')) throw new Error('两次输入的密码不一致');
    const password = String(data.get('password'));
    await post('/lifecycle/password', { password: initialPassword || data.get('current'), newPassword: password });
    initialPassword = password;capabilities = await refreshState();setupMethods();
  });
}

function setupMethods() {
  oobe('选择你的登录方式', '单步验证可以使用密码，或已绑定的 OTP、Passkey。两步验证会在密码之后，再验证一次 OTP 或 Passkey。', `<button class="choice ${!desiredTwoFactor ? 'selected' : ''}" id="single-choice"><span class="choice-icon">⌑</span><span><strong>单步验证</strong><small>简单直接；可稍后添加其他登录方式</small></span></button><button class="choice ${desiredTwoFactor ? 'selected' : ''}" id="double-choice"><span class="choice-icon">✓</span><span><strong>两步验证</strong><small>密码 + OTP 或 Passkey，多一层保护</small></span></button><div class="button-row"><button id="setup-next" class="primary">下一步 →</button></div>`, 2);
  app.querySelector('#single-choice').onclick = () => { desiredTwoFactor = false;setupMethods(); };
  app.querySelector('#double-choice').onclick = () => { desiredTwoFactor = true;setupMethods(); };
  app.querySelector('#setup-next').onclick = () => desiredTwoFactor ? setupOTP() : setupDone();
}

async function setupOTP() {
  try {
    const result = await post('/otp/enable', { password: initialPassword });
    oobe('再加一把随身的钥匙', '使用认证器扫描二维码，然后输入当前的六位验证码。绑定成功后请妥善保存一次性备份代码。', `<div class="qr-box"><img src="${esc(result.svgUrl)}" alt="OTP 绑定二维码"><div><p>无法扫码时，手动输入：</p><code>${esc(result.secret)}</code></div></div><form><label for="setup-otp">认证器验证码</label><input id="setup-otp" name="code" class="code-input" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required><div class="button-row"><button type="submit" class="primary">验证并继续 →</button></div></form>`, 2);
    wireForm(async data => {
      const verified = await post('/otp/verify-setup', { otp: data.get('code') });
      await post('/lifecycle/login', { method: 'password', password: initialPassword });
      oobe('把这些代码放在安全的地方', '认证器不可用时，可以用备份代码完成验证。每个代码只能使用一次；离开此页后不会再次显示。', `<pre class="backup-codes">${esc(verified.backupCodes.join('\n'))}</pre><div class="button-row"><button id="saved-codes" class="primary">我已保存，继续 →</button></div>`, 3);
      app.querySelector('#saved-codes').onclick = () => { void finalizeSetup(); };
    });
  } catch (error) { message(error); }
}

async function finalizeSetup() {
  try {
    await post('/lifecycle/security/policy', { password: initialPassword, twoFactor: true, publicOrigin: '' });
    initialPassword = '';capabilities = await refreshState();setupDone(true);
  } catch (error) { message(error); }
}

function setupDone(twoFactor = false) {
  oobe('一切就绪', twoFactor ? '两步验证已开启。下次登录时，先输入密码，再完成 OTP 验证。已完成的登录状态可以跨服务重启保留。' : '你的个人密码已设置。以后可以在电源菜单的「登录与安全」中添加 OTP、Passkey，或调整验证方式。', `<div class="oobe-emblem" aria-hidden="true"></div><div class="button-row"><button id="enter-workspace" class="primary">${twoFactor ? '前往登录 →' : '进入工作空间 →'}</button></div>`, 3);
  app.querySelector('#enter-workspace').onclick = () => { initialPassword = '';if (twoFactor) window.location.assign(base + '/login');else void welcome(); };
}


async function main() {
  capabilities = await refreshState();
  const view = window.__LIFECYCLE__.view;
  if (view === 'security') { document.body.classList.add('security-page');await mountSecurity(app);return; }
  if (view === 'setup' || !capabilities.initialized) { if (capabilities.needsPasswordChange) setupNewPassword();else setupInitial();return; }
  if (capabilities.pendingFactor) { factor = true;signin();return; }
  lockScreen();
}
main().catch(error => { app.innerHTML = `<section class="signin"><h1>暂时无法连接</h1><p class="auth-error">${esc(error.message)}</p><button class="text-button" id="retry">重新载入</button></section>`;document.getElementById('retry').onclick = () => window.location.reload(); });
