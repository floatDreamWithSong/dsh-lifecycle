import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { wallpaperLibrary,addWallpaper,selectWallpaper,deleteWallpaper,wallpaperImage,MAX_WALLPAPER_BYTES } from '../../lib/wallpapers.js';
let home;
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aPioAAAAASUVORK5CYII=','base64');
beforeEach(()=>{home=mkdtempSync(path.join(os.tmpdir(),'lifecycle-wallpapers-'));process.env.DSH_HOME=home;});
afterEach(()=>{delete process.env.DSH_HOME;rmSync(home,{recursive:true,force:true});});
test('default selection requires no file; owner-only library files survive reads',()=>{
  assert.deepEqual(wallpaperLibrary(),{version:1,selected:null,items:[]});
  const item=addWallpaper(png,'My photo.png','image/png');selectWallpaper(item.id);
  assert.equal(wallpaperLibrary().selected,item.id);assert.deepEqual(wallpaperImage(item.id).bytes,png);
  assert.equal(statSync(path.join(home,'lifecycle','wallpapers',item.id+'.png')).mode&0o777,0o600);
  deleteWallpaper(item.id);assert.equal(wallpaperLibrary().selected,null);assert.equal(wallpaperImage(item.id),null);
});
test('rejects active content, mismatched media types, oversized images and unknown IDs',()=>{
  assert.throws(()=>addWallpaper(Buffer.from('<svg onload="alert(1)"/>'),'bad.svg','image/svg+xml'),/仅支持/);
  assert.throws(()=>addWallpaper(png,'fake.jpg','image/jpeg'),/仅支持/);
  assert.throws(()=>addWallpaper(Buffer.alloc(MAX_WALLPAPER_BYTES+1),'large.png','image/png'),/5 MB/);
  assert.throws(()=>selectWallpaper('../../password.json'),/不存在/);
  assert.throws(()=>deleteWallpaper(undefined),/不存在/);
  assert.equal(wallpaperLibrary().items.length,0);
});
test('limits total library size without evicting existing selections',()=>{
  const first=addWallpaper(png,'first','image/png');selectWallpaper(first.id);
  for(let i=1;i<12;i++)addWallpaper(png,String(i),'image/png');
  assert.throws(()=>addWallpaper(png,'extra','image/png'),/12 张/);
  assert.equal(wallpaperLibrary().selected,first.id);assert.equal(wallpaperLibrary().items.length,12);
});
