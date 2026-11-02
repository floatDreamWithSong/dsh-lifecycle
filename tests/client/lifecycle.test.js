import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { generateTOTP } from '../../lib/totp.js';
const password = 'Preview-Admin-123!';

test('source-managed power menu shows its version and update policy without disabling restart', async ({ page, request }) => {
  await reset(request);await login(page);
  await page.route('**/api/dsh-lifecycle/power/status', route => route.fulfill({ json: {
    current: '0.2.2-alpha.2', update: null, updateSupported: false, updateReason: '源码构建：请通过源码工作流更新',
  } }));
  await page.getByRole('button', { name: '电源', exact: true }).click();
  await expect(page.getByText('0.2.2-alpha.2', { exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('源码构建：请通过源码工作流更新');
  await expect(page.getByRole('menuitem', { name: /重新启动/ })).toBeEnabled();
  await expect(page.getByRole('menuitem', { name: /更新并重启/ })).toHaveCount(0);
});

test('waking the lock screen does not add transient document overflow', async ({ page, request }) => {
  await reset(request);
  await page.goto('/login');
  await expect(page.getByRole('button', { name: '唤醒并登录 Admin' })).toBeVisible();
  const frames = await page.evaluate(async () => {
    document.querySelector('.lock').click();
    const samples = [];
    const start = performance.now();
    await new Promise(resolve => {
      const sample = () => {
        const root = document.documentElement;
        samples.push({ overflow: root.scrollHeight - root.clientHeight, width: root.clientWidth });
        if (performance.now() - start < 650) requestAnimationFrame(sample);
        else resolve();
      };
      requestAnimationFrame(sample);
    });
    return samples;
  });
  expect(Math.max(...frames.map(frame => frame.overflow))).toBe(0);
  expect(new Set(frames.map(frame => frame.width)).size).toBe(1);
  await expect(page.getByRole('textbox', { name: '输入密码', exact: true })).toBeFocused();
  // Content on short screens must still scroll to the last login control.
  await page.setViewportSize({ width: 390, height: 300 });
  await page.getByRole('button', { name: '密码登录', exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: '密码登录', exact: true })).toBeInViewport();
});

async function reset(request, initial = false) { await request.post('http://127.0.0.1:54622/reset' + (initial ? '?initial=1' : '')); }
async function login(page, secret = password) {
  await page.goto('/login');await expect(page.getByRole('button', { name: '唤醒并登录 Admin' })).toBeVisible();await page.keyboard.press('Enter');
  await page.getByRole('textbox', { name: '输入密码', exact: true }).fill(secret);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByRole('heading', { name: '工作空间已解锁' })).toBeVisible();
}
async function api(page, endpoint, body) {
  return page.evaluate(async ({ endpoint, body }) => {
    const state = await fetch('/lifecycle/state').then(r => r.json());
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Lifecycle-CSRF': state.csrf }, body: JSON.stringify(body) });
    const result = await response.json();if (!response.ok) throw new Error(result.error);return result;
  }, { endpoint, body });
}

test('lock screen wakes by keyboard, shows a password error, then signs in', async ({ page, request }) => {
  await reset(request);await page.goto('/login');
  await expect(page.getByRole('button', { name: '唤醒并登录 Admin' })).toBeVisible();
  await expect(page.locator('.clock')).not.toHaveText('');await page.screenshot({ path: 'test-results/lock-screen.png' });
  await page.keyboard.press('Enter');await expect(page.getByRole('textbox', { name: '输入密码', exact: true })).toBeFocused();
  await page.getByRole('textbox', { name: '输入密码', exact: true }).fill('wrong');await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('密码或验证码不正确');
  await page.getByRole('textbox', { name: '输入密码', exact: true }).fill(password);await page.screenshot({ path: 'test-results/admin-signin.png' });
  await page.getByRole('button', { name: '登录', exact: true }).click();await expect(page.getByRole('heading', { name: '工作空间已解锁' })).toBeVisible();
});
test('same browser stays signed in after server restart; explicit lock returns to the lock screen', async ({ page, request }) => {
  await reset(request);await login(page);await request.post('http://127.0.0.1:54622/restart');await page.reload();
  await expect(page.getByRole('heading', { name: '工作空间已解锁' })).toBeVisible();
  await page.goto('/lifecycle/security');await page.getByRole('tab',{name:'会话管理'}).click();await page.getByRole('button', { name: '立即锁屏' }).click();
  await expect(page.getByRole('button', { name: '唤醒并登录 Admin' })).toBeVisible();
  const response = await page.request.get('/api/private');expect(response.status()).toBe(401);
});
test('first-run OOBE creates a personal password and enters the workspace', async ({ page, request }) => {
  await reset(request, true);await page.goto('/login');
  await expect(page.getByRole('heading', { name: '从这里，开始你的工作空间' })).toBeVisible();await page.screenshot({ path: 'test-results/initial-setup.png' });
  await page.getByLabel('初始密码', { exact: true }).fill(password);await page.getByRole('button', { name: '下一步 →' }).click();
  await page.getByLabel('新密码', { exact: true }).fill('Personal-Admin-456!');await page.getByLabel('确认密码', { exact: true }).fill('Personal-Admin-456!');
  await page.getByRole('button', { name: '下一步 →' }).click();await expect(page.getByRole('heading', { name: '选择你的登录方式' })).toBeVisible();
  await page.getByRole('button', { name: '下一步 →' }).click();await page.getByRole('button', { name: '进入工作空间 →' }).click();
  await expect(page.getByRole('heading', { name: '工作空间已解锁' })).toBeVisible();
});
test('mobile lock and focused sign-in fit the viewport', async ({ page, request }) => {
  await reset(request);await page.setViewportSize({ width: 390, height: 844 });await page.goto('/login');
  await page.getByRole('button', { name: '唤醒并登录 Admin' }).click();
  await expect(page.getByRole('textbox', { name: '输入密码', exact: true })).toBeInViewport();
  await expect(page.locator('.signin')).toHaveCSS('opacity', '1');await page.screenshot({ path: 'test-results/signin-mobile.png' });
});
test('OOBE binds OTP and enforces password followed by a separate OTP step', async ({ page, request }) => {
  await reset(request, true);await page.goto('/login');
  await page.getByLabel('初始密码', { exact: true }).fill(password);await page.getByRole('button', { name: '下一步 →' }).click();
  const personal = 'Personal-OTP-456!';
  await page.getByLabel('新密码', { exact: true }).fill(personal);await page.getByLabel('确认密码', { exact: true }).fill(personal);await page.getByRole('button', { name: '下一步 →' }).click();
  await page.locator('#double-choice').click();await page.locator('#setup-next').click();
  const secret = await page.locator('.qr-box code').textContent();
  await page.getByLabel('认证器验证码', { exact: true }).fill(generateTOTP(secret));await page.getByRole('button', { name: '验证并继续 →' }).click();
  await expect(page.locator('.backup-codes')).toBeVisible();await page.getByRole('button', { name: '我已保存，继续 →' }).click();
  await page.getByRole('button', { name: '前往登录 →' }).click();await expect(page.getByRole('button', { name: '唤醒并登录 Admin' })).toBeVisible();
  await page.keyboard.press('Enter');await page.getByRole('textbox', { name: '输入密码', exact: true }).fill(personal);await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByText('再完成一步验证，保护你的工作空间')).toBeVisible();expect((await page.request.get('/api/private')).status()).toBe(401);
  await page.getByRole('textbox', { name: '输入认证器验证码', exact: true }).fill(generateTOTP(secret));await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByRole('heading', { name: '工作空间已解锁' })).toBeVisible();
});
test('Passkey enrolls and signs in using a real WebAuthn virtual authenticator', async ({ page, request, context }) => {
  await reset(request);const cdp = await context.newCDPSession(page);await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });
  await login(page);await api(page, '/lifecycle/security/policy', { password, twoFactor: false, publicOrigin: 'http://localhost:54621' });
  await login(page);await page.goto('/lifecycle/security');await page.getByRole('tab',{name:'Passkey',exact:true}).click();await page.locator('#passkey-password').fill(password);await page.getByRole('button', { name: '添加 Passkey' }).click();
  await expect(page.getByRole('button', { name: '唤醒并登录 Admin' })).toBeVisible();await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Passkey 验证' }).click();
  const assertion = page.waitForRequest('**/lifecycle/passkeys/auth/verify');
  await page.getByRole('button', { name: '使用 Passkey', exact: true }).click();
  const oldAssertion = (await assertion).postDataJSON();
  await expect(page.getByRole('heading', { name: '工作空间已解锁' })).toBeVisible();
  await expect(api(page, '/lifecycle/passkeys/auth/verify', oldAssertion)).rejects.toThrow('请求已过期');
  await api(page, '/lifecycle/security/policy', { password, twoFactor: true, publicOrigin: 'http://localhost:54621' });
  await page.goto('/login');await expect(page.getByRole('button', { name: '唤醒并登录 Admin' })).toBeVisible();await page.keyboard.press('Enter');await page.getByRole('textbox', { name: '输入密码', exact: true }).fill(password);await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByText('再完成一步验证，保护你的工作空间')).toBeVisible();
  expect((await page.request.get('/api/private')).status()).toBe(401);
  await page.getByRole('button', { name: '使用 Passkey', exact: true }).click();await expect(page.getByRole('heading', { name: '工作空间已解锁' })).toBeVisible();
});


test('power security action opens a native main panel with independent tabs and custom wallpaper',async({page,request})=>{
  await reset(request);await login(page);
  const before=page.url();let documentNavigations=0;page.on('framenavigated',frame=>{if(frame===page.mainFrame())documentNavigations++;});
  await page.getByRole('button',{name:'电源',exact:true}).click();await page.getByRole('menuitem',{name:/登录与安全/}).click();
  await expect(page.getByRole('tab',{name:'登录方式',exact:true})).toHaveAttribute('aria-selected','true');
  await expect(page.getByTestId('native-sidebar')).toBeVisible();expect(page.url()).toBe(before);expect(documentNavigations).toBe(0);
  await expect(page.locator('#password-form')).toHaveCount(0);await expect(page.getByRole('heading',{name:'OTP 认证器'})).toHaveCount(0);
  await page.getByRole('tab',{name:'访问密码'}).click();await expect(page.locator('#password-form')).toBeVisible();await expect(page.locator('#policy-form')).toHaveCount(0);
  await page.getByRole('tab',{name:'锁屏壁纸'}).click();
  await page.locator('#wallpaper-upload').setInputFiles({name:'My blue.png',mimeType:'image/png',buffer:readFileSync(new URL('../../assets/wallpaper-v1.png',import.meta.url))});
  await expect(page.getByRole('status')).toHaveText('已添加并设为锁屏壁纸');
  await expect(page.getByRole('button',{name:'使用My blue.png'})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'使用默认 · 蓝色流光'}).click();await expect(page.getByRole('button',{name:'使用默认 · 蓝色流光'})).toHaveAttribute('aria-pressed','true');
  await page.screenshot({path:'test-results/security-wallpapers.png'});
  await page.evaluate(()=>document.documentElement.setAttribute('data-ds-dark-theme',''));await expect(page.locator('.dl-security')).toHaveCSS('background-color','rgb(23, 25, 29)');await page.screenshot({path:'test-results/security-dark.png'});
  await page.setViewportSize({width:390,height:844});await expect(page.getByRole('heading',{name:'锁屏壁纸',exact:true})).toBeInViewport();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.screenshot({path:'test-results/security-mobile.png'});
  await page.getByRole('button',{name:'返回工作空间',exact:true}).click();await expect(page.getByTestId('conversation-content')).toBeVisible();
});
