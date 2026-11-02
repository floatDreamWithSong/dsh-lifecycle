import { startRegistration } from '@simplewebauthn/browser';
import { post, get, refreshState, escapeHTML as esc, base, uploadWallpaper } from '../login/api.js';
const tabs=[['methods','登录方式','⌑'],['password','访问密码','◇'],['otp','OTP 认证器','▣'],['passkey','Passkey','⚿'],['wallpapers','锁屏壁纸','▧'],['sessions','会话管理','◎']];

/** Mount one scoped settings surface in either the native DSH main panel or legacy URL. */
export async function mountSecurity(root, { onBack = () => window.location.assign(base + '/') } = {}) {
  let active='methods', disposed=false, revision=0, config;
  const controller=new AbortController();
  function message(error) { const target=root.querySelector('.auth-error');if(target)target.textContent=error.message || String(error); }
  function toast(text) { const target=root.querySelector('.dl-notice');if(target){target.textContent=text;target.hidden=false;} }
  function exit() { window.location.assign(base+'/login'); }
  async function security(reload=false) {
    const rendering=++revision;
    if(!config || reload){await refreshState();config=await get('/lifecycle/security/state');}
    if(disposed || rendering!==revision)return;
    const originReady=config.publicOrigin && new URL(config.publicOrigin).origin===window.location.origin;
    const panels={
      methods: `<section class="security-panel"><h2>登录验证 <span class="badge">${config.twoFactor ? '两步验证' : '单步验证'}</span></h2><p>单步：密码或已绑定的验证方式。两步：密码之后，再验证 OTP 或 Passkey。</p><form id="policy-form"><label class="check-line"><input name="twoFactor" type="checkbox" ${config.twoFactor ? 'checked' : ''}>启用两步验证</label><label>当前密码（更改安全设置时验证）</label><input name="password" type="password" autocomplete="current-password" required><div class="button-row"><button type="submit" class="primary">保存验证设置</button></div></form><p>更改验证方式会撤销已有登录，需要按新规则重新登录。</p></section>`,
      password: `<section class="security-panel"><h2>访问密码</h2><p>改密会撤销其他登录。若你刚通过 OTP 或 Passkey 登录，可以不填写旧密码。</p><form id="password-form"><label>当前密码</label><input name="password" type="password" autocomplete="current-password"><label>新密码</label><input name="newPassword" type="password" autocomplete="new-password" minlength="8" required><label>确认新密码</label><input name="confirm" type="password" autocomplete="new-password" required><div class="button-row"><button type="submit" class="primary">更改密码</button></div></form></section>`,
      otp: `<section class="security-panel"><h2>OTP 认证器 <span class="badge">${config.otp.enabled ? '已绑定' : '未绑定'}</span></h2><p>绑定后，单步模式可直接用 OTP 登录；两步模式将它作为密码之后的第二次验证。</p><div id="otp-enrollment"></div>${!config.otp.enabled ? '<label>当前密码（绑定时验证）</label><input id="otp-password" type="password" autocomplete="current-password"><div class="button-row"><button id="enroll-otp" class="primary">绑定认证器</button></div>' : '<label>当前密码</label><input id="disable-password" type="password" autocomplete="current-password"><label>当前 OTP 验证码或备份代码</label><input id="disable-otp" autocomplete="one-time-code"><div class="button-row"><button id="disable-otp-button" class="secondary">解除 OTP 绑定</button></div>'}</section>`,
      passkey: `<section class="security-panel"><h2>Passkey <span class="badge">${config.passkeys.length} 把密钥</span></h2><p>${originReady ? '使用设备上的指纹、面容或安全密钥验证；私钥只保存在你的设备或密码管理器中。' : '稍后配置稳定的 HTTPS 域名，并从该域名访问此页，即可绑定 Passkey。公网 IP 不影响密码和 OTP 使用。'}</p>${config.passkeys.map(c => `<div class="passkey-row"><span>${esc(c.name)}</span><button data-delete="${esc(c.id)}">移除</button></div>`).join('')}<label>公开访问地址</label><input id="passkey-origin" type="url" placeholder="https://dsh.example.com" value="${esc(config.publicOrigin)}"><label>当前密码（注册或修改域名时验证）</label><input id="passkey-password" type="password" autocomplete="current-password"><div class="button-row"><button id="save-origin" class="secondary">保存域名</button><button id="enroll-passkey" class="primary" ${!originReady ? 'disabled' : ''}>添加 Passkey</button></div></section>`,
      sessions: `<section class="security-panel wide"><h2>锁屏与会话</h2><p>登录状态以令牌摘要持久化，重启和更新后无需重新登录。锁屏只撤销当前浏览器的登录，不会停止 DSH；其他已登录设备不受影响。</p><p>当前有 ${config.activeSessions} 个有效登录。</p><div class="button-row"><button id="lock-now" class="secondary">立即锁屏</button><button id="revoke-others" class="secondary">退出其他设备</button></div></section>`,
      wallpapers: `<section class="security-panel"><h2>锁屏壁纸</h2><p>内置蓝色背景始终可用，也可以上传自己的图片。所选壁纸会用于锁屏和密码登录背景。</p><div class="wallpaper-preview" role="img" aria-label="当前锁屏壁纸"></div><div class="wallpaper-toolbar"><label class="upload-button" for="wallpaper-upload">＋ 添加壁纸<input id="wallpaper-upload" type="file" accept="image/png,image/jpeg,image/webp"></label><span>PNG / JPEG / WebP · 每张最多 5 MB · 最多 12 张</span></div><div id="wallpaper-library" class="wallpaper-library" aria-label="壁纸图库"></div></section>`,
    };
    root.innerHTML=`<section class="dl-security"><header class="security-header"><div><p class="eyebrow">ADMIN · PERSONAL SPACE</p><h1>登录与安全</h1><p>管理进入工作空间的方式，以及锁屏的样子。</p></div><button class="secondary" id="security-back">返回工作空间</button></header><div class="security-layout"><nav class="security-tabs" role="tablist" aria-label="安全设置">${tabs.map(([id,label,icon])=>`<button id="dl-tab-${id}" role="tab" data-tab="${id}" aria-selected="${id===active}" aria-controls="dl-settings-panel" tabindex="${id===active?0:-1}"><span aria-hidden="true">${icon}</span>${label}</button>`).join('')}</nav><div class="security-content"><div class="dl-notice" role="status" hidden></div><div id="dl-settings-panel" role="tabpanel" aria-labelledby="dl-tab-${active}" tabindex="0">${panels[active]}</div><p class="auth-error" role="alert"></p></div></div></section>`;
    root.querySelector('#security-back').onclick=onBack;
    for(const button of root.querySelectorAll('[data-tab]'))button.onclick=async()=>{active=button.dataset.tab;try{await security();root.querySelector(`[data-tab="${active}"]`)?.focus();}catch(error){message(error);}};
    root.querySelector('[role=tablist]').onkeydown=event=>{
      if(!['ArrowDown','ArrowUp','ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
      event.preventDefault();const index=tabs.findIndex(([id])=>id===active);
      const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(['ArrowDown','ArrowRight'].includes(event.key)?1:-1)+tabs.length)%tabs.length;
      root.querySelector(`[data-tab="${tabs[next][0]}"]`).click();
    };
  for (const id of ['policy-form', 'password-form']) {
    const form = root.querySelector('#'+id);if(!form)continue;
    form.onsubmit = async event => {
      event.preventDefault();const button = form.querySelector('button');button.disabled = true;
      try {
        const data = new FormData(form);
        if (id === 'policy-form') { await post('/lifecycle/security/policy', { password: data.get('password'), twoFactor: data.has('twoFactor'), publicOrigin: config.publicOrigin });window.location.assign(base + '/login'); }
        else { if (data.get('newPassword') !== data.get('confirm')) throw new Error('两次输入的密码不一致');await post('/lifecycle/password', { password: data.get('password'), newPassword: data.get('newPassword') });toast('密码已更新，其他会话已退出');form.reset(); }
      } catch (error) { message(error); } finally { button.disabled = false; }
    };
  }
  root.querySelector('#revoke-others')?.addEventListener('click', async () => { try { await post('/lifecycle/sessions/others');await security(true);toast('其他设备已退出'); } catch(error) {message(error);} });
  root.querySelector('#lock-now')?.addEventListener('click', async () => { try{await post('/lifecycle/lock');exit();}catch(error){message(error);} });
  root.querySelector('#enroll-otp')?.addEventListener('click', async event => {
    event.target.disabled = true;
    try {
      const result = await post('/otp/enable', { password: root.querySelector('#otp-password').value }), target = root.querySelector('#otp-enrollment');
      target.innerHTML = `<div class="qr-box"><img src="${esc(result.svgUrl)}" alt="OTP 绑定二维码"><code>${esc(result.secret)}</code></div><label>认证器验证码</label><input id="enroll-code" inputmode="numeric" autocomplete="one-time-code"><div class="button-row"><button id="confirm-enroll" class="primary">确认绑定</button></div>`;
      root.querySelector('#confirm-enroll').onclick = async () => {
        try { const result = await post('/otp/verify-setup', { otp: root.querySelector('#enroll-code').value });target.innerHTML = `<p>已绑定。请保存一次性备份代码，再重新登录。</p><pre class="backup-codes">${esc(result.backupCodes.join('\n'))}</pre><a href="${base}/login">已保存，重新登录 →</a>`; } catch (error) { message(error); }
      };
    } catch (error) { message(error);event.target.disabled = false; }
  });
  root.querySelector('#disable-otp-button')?.addEventListener('click', async () => {
    try { const code = root.querySelector('#disable-otp').value;await post('/otp/disable', { password: root.querySelector('#disable-password').value, ...(code.length === 6 ? { otp: code } : { backupCode: code }) });window.location.assign(base + '/login'); } catch (error) { message(error); }
  });
  root.querySelector('#enroll-passkey')?.addEventListener('click', async event => {
    event.target.disabled = true;
    try { const options = await post('/lifecycle/passkeys/register/options', { password: root.querySelector('#passkey-password').value });const response = await startRegistration({ optionsJSON: options.options });await post('/lifecycle/passkeys/register/verify', { response });window.location.assign(base + '/login'); } catch (error) { message(error);event.target.disabled = false; }
  });
  for (const button of root.querySelectorAll('[data-delete]')) button.onclick = async () => {
    if (!window.confirm('移除这把 Passkey？需要重新登录。')) return;
    try { await post('/lifecycle/passkeys/remove', { id: button.dataset.delete, password: root.querySelector('#passkey-password').value });window.location.assign(base + '/login'); } catch (error) { message(error); }
  };
    root.querySelector('#save-origin')?.addEventListener('click',async()=>{
      try {await post('/lifecycle/security/policy',{password:root.querySelector('#passkey-password').value,twoFactor:config.twoFactor,publicOrigin:root.querySelector('#passkey-origin').value});exit();}catch(error){message(error);}
    });
    if(active==='wallpapers')await wallpapers();
  }
  async function wallpapers() {
    const library=await get('/lifecycle/wallpapers');if(disposed || active!=='wallpapers')return;
    const preview=root.querySelector('.wallpaper-preview');
    preview.style.backgroundImage=`url("${base}/lifecycle/wallpaper/current?v=${Date.now()}")`;
    const items=[{id:null,name:'默认 · 蓝色流光',url:base+'/lifecycle/assets/wallpaper-v1.png'},...library.items.map(item=>({...item,url:base+'/lifecycle/wallpapers/image/'+item.id}))];
    root.querySelector('#wallpaper-library').innerHTML=items.map(item=>`<article class="wallpaper-card ${library.selected===item.id?'selected':''}"><button class="wallpaper-select" data-wallpaper="${item.id||'default'}" aria-label="使用${esc(item.name)}" aria-pressed="${library.selected===item.id}"><img src="${esc(item.url)}" alt="" loading="lazy"><span>${esc(item.name)}</span><small>${library.selected===item.id?'✓ 正在使用':'设为壁纸'}</small></button>${item.id?`<button class="wallpaper-delete" data-remove="${item.id}" aria-label="删除${esc(item.name)}">删除</button>`:''}</article>`).join('');
    for(const button of root.querySelectorAll('[data-wallpaper]'))button.onclick=async()=>{
      try{await post('/lifecycle/wallpapers/select',{id:button.dataset.wallpaper==='default'?null:button.dataset.wallpaper});await wallpapers();toast('锁屏壁纸已更新');}catch(error){message(error);}
    };
    for(const button of root.querySelectorAll('[data-remove]'))button.onclick=async()=>{
      if(!window.confirm('删除这张壁纸？如果正在使用，将恢复默认背景。'))return;
      try{await post('/lifecycle/wallpapers/delete',{id:button.dataset.remove});await wallpapers();toast('壁纸已删除');}catch(error){message(error);}
    };
    root.querySelector('#wallpaper-upload').onchange=async event=>{
      const input=event.target,file=input.files[0];if(!file)return;input.disabled=true;
      try{
        if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('请选择 PNG、JPEG 或 WebP 图片');
        if(file.size>5*1024*1024)throw new Error('图片不能超过 5 MB');
        let bitmap;try{bitmap=await createImageBitmap(file);}catch{throw new Error('图片无法读取，请选择有效的 PNG、JPEG 或 WebP 图片');}bitmap.close();
        const result=await uploadWallpaper(file,controller.signal);
        await post('/lifecycle/wallpapers/select',{id:result.item.id});await wallpapers();toast('已添加并设为锁屏壁纸');
      }catch(error){if(!disposed)message(error);}finally{input.disabled=false;input.value='';}
    };
  }
  await security();
  return ()=>{disposed=true;controller.abort();root.replaceChildren();};
}
