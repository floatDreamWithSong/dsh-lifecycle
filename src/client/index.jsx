import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import css from './style.css';
import securityCSS from '../security/style.css';
import { mountSecurity } from '../security/index.js';

export const inject = ['slots', 'layout'];
const BASE = '/api/dsh-lifecycle/power';
let snapshot = { action: null, phase: '', error: null };
const listeners = new Set();
const titles = { restart: '正在重新启动', shutdown: '正在关闭 DeepSeek Harness', update: '正在更新 DeepSeek Harness' };
const phases = { accepted: '正在准备，请稍候', downloading: '正在下载并安装新版本，服务仍可使用', validating: '正在检查新版本',
  restarting: '正在重新启动服务', stopping: '正在保存会话并停止服务', 'rolling-back': '更新未成功，正在恢复原版本' };

function publish(value) {
  snapshot = { ...snapshot, ...value };
  for (const listener of listeners) listener();
}

async function status(refreshToken) {
  const options = { cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(15000) };
  if (refreshToken) Object.assign(options, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-DSH-Power-Token': refreshToken }, body: '{}' });
  const res = await fetch(BASE + (refreshToken ? '/refresh' : '/status'), options);
  if (!res.ok) throw new Error(`状态检查失败（${res.status}）`);
  return res.json();
}

/** Fetch local action credentials independently of registry or version metadata. */
async function session() {
  const res = await fetch(BASE + '/session', { cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`无法连接电源控制（${res.status}）`);
  return res.json();
}

async function begin(action, target, confirm) {
  publish({ action, phase: 'accepted', error: null });
  try {
    const before = await session();
    const res = await fetch(BASE + '/action', { method: 'POST', headers: {
      'Content-Type': 'application/json', 'X-DSH-Power-Token': before.csrf,
    }, body: JSON.stringify({ action, target, confirm }) });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    publish({ original: before.instanceId, operationId: result.id, startedAt: Date.now() });
  } catch (error) { publish({ error: error.message }); }
}

async function lock() {
  try {
    const result = await fetch('/lifecycle/state', { cache: 'no-store' });
    if (!result.ok) throw new Error('无法连接锁屏服务');
    const state = await result.json();
    const response = await fetch('/lifecycle/lock', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Lifecycle-CSRF': state.csrf }, body: '{}' });
    if (!response.ok) throw new Error('锁定失败');
    window.location.assign('/login');
  } catch (error) { publish({ action: 'lock', operationId: null, error: error.message }); }
}

function PowerIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 3v9" strokeLinecap="round"/><path d="M7.2 5.8a8 8 0 1 0 9.6 0" strokeLinecap="round"/></svg>;
}

/** A bottom-pinned, keyboard-operable power menu using DSH's official footer slot. */
export function PowerMenu({ wide = true, openSecurity }) {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const pending = useRef(false);
  const [confirm, setConfirm] = useState(false);
  const [position, setPosition] = useState({ left: 12, bottom: 60 });
  const trigger = useRef(null);
  const menu = useRef(null);
  const cancel = useRef(null);
  const dialog = useRef(null);
  async function loadInfo(forceRefresh = false) {
    if (pending.current) return;
    pending.current = true;
    setRefreshing(true); setError(null);
    try {
      // Keep the previous snapshot visible while refreshing. A closed menu can
      // still finish its first request so reopening never discards that work.
      const value = forceRefresh ? await status((await session()).csrf) : await status();
      setInfo(value);
    } catch (error) { setError(error.message); }
    finally { pending.current = false; setRefreshing(false); }
  }
  useEffect(() => {
    if (!open) return;
    if (!info) void loadInfo();
    menu.current?.focus();
    const outside = e => {
      if (!menu.current?.contains(e.target) && !trigger.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('pointerdown', outside); };
  }, [open]);
  useEffect(() => { if (confirm) cancel.current?.focus(); }, [confirm]);
  function close() { setOpen(false); trigger.current?.focus(); }
  function keyMenu(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    const items = [...menu.current.querySelectorAll('button:not(:disabled)')];
    const index = items.indexOf(document.activeElement);
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (index + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    }
    if (e.key === 'Tab') close();
  }
  return <>
    <button ref={trigger} className={'dpm-trigger' + (wide ? '' : ' dpm-trigger--collapsed')} title="电源" aria-label="电源" aria-haspopup="menu" aria-expanded={open} aria-controls="dpm-menu"
      onClick={() => {
        const box = trigger.current.getBoundingClientRect();
        setPosition({ left: Math.max(8, Math.min(box.left, window.innerWidth - 272)), bottom: window.innerHeight - box.top + 8 });
        setOpen(!open);
      }}><PowerIcon/>{wide && <span>电源</span>}</button>
    {open && createPortal(<div ref={menu} id="dpm-menu" className="dpm-menu" role="menu" tabIndex={-1} aria-label="电源选项" style={position} onKeyDown={keyMenu}>
      <div className="dpm-caption">DEEPSEEK HARNESS <span className="dpm-version"><span>{info?.current || '正在检查版本…'}</span>
        <button type="button" className={'dpm-refresh' + (refreshing ? ' is-refreshing' : '')} aria-label="刷新检测" title="重新检测更新" disabled={refreshing} aria-busy={refreshing} onClick={() => { void loadInfo(true); }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5" strokeLinecap="round" strokeLinejoin="round"/><path d="M6.1 6.1a8 8 0 0 1 13.1 2.2M4.8 15.7a8 8 0 0 0 13.1 2.2" strokeLinecap="round"/></svg>
        </button></span></div>
      <button role="menuitem" onClick={() => { close(); void begin('restart'); }}><span>↻</span><div>重新启动<small>保存会话，重新加载服务</small></div></button>
      {info?.update && <button role="menuitem" onClick={() => { close(); void begin('update', info.update); }}><span>↓</span><div>更新并重启<small>{info.current} → {info.update}</small></div><i className="dpm-dot"/></button>}
      <button role="menuitem" onClick={() => { close(); void lock(); }}><span>⌑</span><div>锁定<small>保留服务，锁定当前浏览器</small></div></button><button role="menuitem" onClick={() => { close(); openSecurity(); }}><span>⚙</span><div>登录与安全<small>验证方式、锁屏壁纸与会话管理</small></div></button><div className="dpm-divider"/>
      <button className="dpm-danger" role="menuitem" onClick={() => { close(); setConfirm(true); }}><PowerIcon/><div>关机<small>停止 Harness 服务</small></div></button>
      {(error || info?.checkError) && <p className="dpm-warning" role="status">{error || '版本检查失败：' + info.checkError}</p>}
    </div>, document.body)}
    {confirm && createPortal(<div className="dpm-mask" onClick={e => { if (e.target === e.currentTarget) setConfirm(false); }}>
      <section ref={dialog} className="dpm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="dpm-confirm-title" aria-describedby="dpm-confirm-body"
        onKeyDown={e => {
          if (e.key === 'Escape') { e.preventDefault(); setConfirm(false); trigger.current?.focus(); }
          if (e.key === 'Tab') {
            const items = [...dialog.current.querySelectorAll('button')];
            const i = items.indexOf(document.activeElement); e.preventDefault(); items[(i + (e.shiftKey ? -1 : 1) + items.length) % items.length].focus();
          }
        }}>
        <div className="dpm-dialog-icon"><PowerIcon/></div><h2 id="dpm-confirm-title">关闭 DeepSeek Harness？</h2>
        <p id="dpm-confirm-body">会话会保存，正在运行的任务将中断。关闭后网页无法访问，需要在服务器上重新启动服务。</p>
        <p className="dpm-note">只停止 Harness，不关闭服务器。</p>
        <div className="dpm-dialog-actions"><button ref={cancel} onClick={() => { setConfirm(false); trigger.current?.focus(); }}>取消</button>
          <button className="dpm-shutdown" onClick={() => { setConfirm(false); void begin('shutdown', undefined, 'shutdown'); }}>确认关机</button></div>
      </section>
    </div>, document.body)}
  </>;
}

/** Fullscreen transition with real lifecycle phases and restart/auth recovery. */
export function PowerOverlay() {
  const state = useSyncExternalStore(callback => { listeners.add(callback); return () => listeners.delete(callback); }, () => snapshot);
  const overlay = useRef(null);
  useEffect(() => {
    if (state.action) overlay.current?.focus();
  }, [state.action]);
  useEffect(() => {
    if (!state.operationId || state.error) return;
    let cancelled = false;
    let timer;
    let downSince;
    const tick = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(BASE + '/health', { cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(5000) });
        if (cancelled) return;
        // A restarted auth gateway revokes in-memory cookies. Go to login only after
        // the old process has had time to stop; never mistake HTTP 502 for success.
        if ((res.status === 401 || res.status === 302 || res.type === 'opaqueredirect') && state.action !== 'shutdown' && Date.now() - state.startedAt > 3000) {
          window.location.assign('/login'); return;
        }
        if (!res.ok) throw new Error('Service unavailable');
        downSince = null;
        const info = await res.json();
        if (info.operation?.id === state.operationId) {
          if (info.operation.phase === 'failed') { publish({ error: info.operation.error }); return; }
          publish({ phase: info.operation.phase });
        }
        if (state.action !== 'shutdown' && info.instanceId !== state.original) {
          window.location.reload(); return;
        }
      } catch {
        if (cancelled) return;
        downSince ??= Date.now();
        if (state.action === 'shutdown' && Date.now() - downSince > 4000) { publish({ phase: 'off' }); return; }
      }
      if (Date.now() - state.startedAt > 720000) { publish({ error: '等待超时，请检查服务器服务状态。' }); return; }
      timer = setTimeout(tick, 1800);
    };
    timer = setTimeout(tick, 1600);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [state.operationId, state.error]);
  if (!state.action) return null;
  return createPortal(<div ref={overlay} className="dpm-overlay" role="dialog" aria-modal="true" aria-labelledby="dpm-transition-title" tabIndex={-1}
    onKeyDown={e => { if (e.key === 'Tab') { e.preventDefault(); (overlay.current?.querySelector('button') || overlay.current)?.focus(); } }}>
    <div className="dpm-halo"/>
    <div className="dpm-transition">
      {state.phase !== 'off' && !state.error && <div className="dpm-spinner" aria-hidden="true">{[0, 1, 2, 3, 4].map(i => <span key={i} style={{ '--i': i }}/>)}</div>}
      {state.phase === 'off' && <div className="dpm-off-icon"><PowerIcon/></div>}
      <h1 id="dpm-transition-title">{state.error ? '操作未完成' : state.phase === 'off' ? 'Harness 服务已停止响应' : titles[state.action]}</h1>
      <p role="status" aria-live="polite">{state.error || (state.phase === 'off' ? '请在服务器上启动服务后，重新访问此页面。' : phases[state.phase] || '请稍候，正在连接服务')}</p>
      {!state.error && state.phase !== 'off' && <small>{state.action === 'shutdown' ? '会话正在安全保存' : '完成后将自动恢复访问；若登录失效，请重新登录'}</small>}
      {state.error && <button className="dpm-back" onClick={() => publish({ action: null, operationId: null })}>返回页面</button>}
    </div><div className="dpm-overlay-brand"><PowerIcon/> DEEPSEEK HARNESS</div>
  </div>, document.body);
}

/** Register UI through official DSH slots and remove styles on unload. */
export function apply(ctx) {
  ctx.effect(() => {
    const style = document.createElement('style'); style.textContent = css + securityCSS; document.head.appendChild(style);
    return () => { style.remove(); publish({ action: null, operationId: null }); };
  });
  const openSecurity = () => ctx.layout.selectPanel('dsh-lifecycle-security');
  const PowerEntry = props => <PowerMenu {...props} openSecurity={openSecurity}/>;
  function SecurityPanel() {
    const root=useRef(null);
    useEffect(()=>{
      let cancelled=false,dispose;
      mountSecurity(root.current,{onBack:()=>ctx.layout.selectPanel(null)}).then(cleanup=>{
        if(cancelled)cleanup();else dispose=cleanup;
      }).catch(error=>{if(!cancelled)root.current.textContent='无法打开登录与安全：'+error.message;});
      return ()=>{cancelled=true;dispose?.();};
    },[]);
    return <div className="dl-native-panel" ref={root}/>;
  }
  ctx.slots.inject('main', () => ctx.slots.register({name:'main',key:'dsh-lifecycle-security'},SecurityPanel));
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({name:'sidebar.panellist',id:'dsh-lifecycle-security',label:()=> '登录与安全',order:60},({size=18})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/></svg>));
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({ name: 'sidebar.footer.action', id: 'dsh-lifecycle-power', label: '电源', order: 50 }, PowerEntry));
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({ name: 'shell.overlay', id: 'dsh-lifecycle-overlay' }, PowerOverlay));
}
