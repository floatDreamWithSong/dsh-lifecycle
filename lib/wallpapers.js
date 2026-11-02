import { randomUUID } from 'node:crypto';
import { readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { lifecyclePath } from './lifecycle-policy.js';
import { readDurableJson, writeDurableJson, writeDurableFile } from './durable-json.js';

/** Maximum upload size per raster image; enforced while reading the HTTP stream. */
export const MAX_WALLPAPER_BYTES = 5 * 1024 * 1024;
const manifest = () => lifecyclePath('wallpapers.json');
const filePath = item => lifecyclePath(path.join('wallpapers', item.id + '.' + item.ext));

/** Read the private library manifest; null selection means the shipped wallpaper. */
export function wallpaperLibrary() {
  const value = readDurableJson(manifest()) ?? { version: 1, selected: null, items: [] };
  if (value.version !== 1 || !Array.isArray(value.items) || value.items.some(i => !/^[a-f0-9-]{36}$/.test(i.id) || !['png','jpg','webp'].includes(i.ext)) || value.selected !== null && !value.items.some(i => i.id === value.selected)) throw new Error('Invalid wallpaper manifest');
  return value;
}

/** Accept raster images only; no SVG, HTML, arbitrary paths, or externally hosted URLs. */
export function addWallpaper(bytes, name, contentType) {
  if (!bytes.length || bytes.length > MAX_WALLPAPER_BYTES) throw new RangeError('图片大小须在 1 字节到 5 MB 之间');
  let ext;
  if (bytes.length >= 24 && bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) ext='png';
  else if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) ext='jpg';
  else if (bytes.length >= 16 && bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP') ext='webp';
  const mime = {png:'image/png',jpg:'image/jpeg',webp:'image/webp'}[ext];
  if (!ext || mime !== contentType) throw new TypeError('仅支持 PNG、JPEG、WebP 图片，文件内容须与格式一致');
  const library=wallpaperLibrary();
  if (library.items.length >= 12) throw new RangeError('最多保存 12 张自定义壁纸，请先删除不再使用的图片');
  const item={id:randomUUID(),name:String(name || '自定义壁纸').slice(0,120),ext,mime,createdAt:Date.now()};
  writeDurableFile(filePath(item),bytes);
  library.items.push(item);writeDurableJson(manifest(),library);return item;
}

/** Select a library image, or null to restore the built-in background. */
export function selectWallpaper(id) {
  const library=wallpaperLibrary();
  if (id !== null && !library.items.some(i=>i.id===id)) throw new TypeError('壁纸不存在');
  library.selected=id;writeDurableJson(manifest(),library);
}

/** Delete a private library item; deleting the selected image restores the default. */
export function deleteWallpaper(id) {
  const library=wallpaperLibrary(), item=library.items.find(i=>i.id===id);
  if (!item) throw new TypeError('壁纸不存在');
  library.items=library.items.filter(i=>i.id!==id);if(library.selected===id)library.selected=null;
  writeDurableJson(manifest(),library);unlinkSync(filePath(item));
}

/** Read an exact library item, never a caller-supplied filesystem path. */
export function wallpaperImage(id) {
  const item=wallpaperLibrary().items.find(i=>i.id===id);
  if (!item) return null;
  return {bytes:readFileSync(filePath(item)),mime:item.mime};
}
