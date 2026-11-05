import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { apply } from '../../src/client/index.jsx';
const entries=new Map(),effects=[];
let navigate;
const ctx={
  effect(fn){effects.push(fn());},
  layout:{selectPanel(id){if(id!==null&&!entries.has('main:'+id))throw new Error('Unregistered panel');navigate(id);}},
  slots:{inject(name,fn){fn();},register(options,component){entries.set(options.name+':'+(options.key||options.id),component);}},
};
apply(ctx);
window.__simulateLifecycleInstall = () => {
  for (const dispose of effects.splice(0)) if (typeof dispose === 'function') dispose();
  apply(ctx);
};
function Fixture(){
  const [panel,setPanel]=useState(null);navigate=setPanel;
  const Power=entries.get('sidebar.footer.action:dsh-lifecycle-power'),Security=entries.get('main:dsh-lifecycle-security');
  const Overlay=entries.get('shell.overlay:dsh-lifecycle-overlay');
  return <><style>{'@media(max-width:700px){[data-testid=native-sidebar]{display:none!important}}'}</style><div style={{display:'flex',height:'100vh',fontFamily:'system-ui'}}><aside data-testid="native-sidebar" style={{width:225,flexShrink:0,background:'#f3f5f8',padding:18,display:'flex',flexDirection:'column',gap:14}}><strong>DeepSeek Harness</strong><button onClick={()=>setPanel(null)}>对话</button><button onClick={()=>ctx.layout.selectPanel('dsh-lifecycle-security')}>登录与安全</button><div style={{marginTop:'auto'}}><Power wide/></div></aside><main style={{flex:1,minWidth:0,overflow:'auto'}}>{panel?<Security/>:<section style={{padding:50}}><h1>工作空间已解锁</h1><p data-testid="conversation-content">正在进行的会话</p></section>}</main></div><Overlay/></>;
}
createRoot(document.getElementById('fixture-root')).render(<Fixture/>);
