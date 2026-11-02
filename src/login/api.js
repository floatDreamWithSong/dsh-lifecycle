// Native DSH panels use the root gateway; standalone lock/setup pages declare their base.
const base = window.__LIFECYCLE__?.basePath ?? '';
let state;

/** Retrieve browser-bound CSRF and public capabilities, never password or OTP secrets. */
export async function refreshState() {
  const response = await fetch(base + '/lifecycle/state', { cache: 'no-store' });
  if (!response.ok) throw new Error('无法连接登录服务');
  state = await response.json();return state;
}

/** Same-origin JSON boundary; callers decide how a successful authentication changes the screen. */
export async function post(path, body = {}) {
  if (!state) await refreshState();
  const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Lifecycle-CSRF': state.csrf }, body: JSON.stringify(body) });
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error(`登录服务返回异常（${response.status}），请稍后重试`);
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    const errors = { 'invalid-otp': '验证码不正确，请检查认证器中的最新验证码', 'setup-expired': '绑定请求已过期，请重新开始', 'invalid-password': '密码不正确', 'otp-required': '请先完成第二步验证', 'invalid-credentials': '身份验证失败', 'rate-limited': '尝试次数过多，请稍后再试' };
    throw new Error(errors[data.error] || data.error || '操作未完成');
  }
  return data;
}

/** Read an authenticated settings resource. */
export async function get(path) {
  const response = await fetch(base + path, { cache: 'no-store' });
  const data = await response.json();if (!response.ok) throw new Error(data.error || '请重新登录');return data;
}

/** Upload one authenticated raster image without expanding binary data into JSON. */
export async function uploadWallpaper(file, signal) {
  await refreshState();
  const response=await fetch(base+'/lifecycle/wallpapers/upload?name='+encodeURIComponent(file.name),{
    method:'POST',headers:{'Content-Type':file.type,'X-Lifecycle-CSRF':state.csrf},body:file,signal,
  });
  if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('上传失败，请确认图片不超过 5 MB');
  const data=await response.json();if(!response.ok)throw new Error(data.error || '壁纸上传失败');return data;
}

/** Escape untrusted text before placing it into a static HTML template. */
export function escapeHTML(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }

export { base };
