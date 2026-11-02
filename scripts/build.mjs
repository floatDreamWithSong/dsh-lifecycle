import { build } from 'esbuild';
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await build({ entryPoints: ['src/host/index.js'], bundle: true, platform: 'node', format: 'esm', outfile: 'dist/host.js', target: 'node22' });
await build({ entryPoints: ['src/supervisor/index.js'], bundle: true, platform: 'node', format: 'esm', outfile: 'dist/supervisor.js', target: 'node22' });
await build({ entryPoints: ['src/supervisor/launchd.js'], bundle: true, platform: 'node', format: 'esm', outfile: 'dist/launchd.js', target: 'node22' });
await build({ entryPoints: ['src/client/index.jsx'], bundle: true, platform: 'browser', format: 'cjs', outfile: 'dist/client.js', target: 'es2022',
  loader: { '.css': 'text' },
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  banner: { js: 'window.__ModuleLoader__.load({id:"dsh-lifecycle",factory:(require)=>{const module={exports:{}};const exports=module.exports;' },
  footer: { js: 'return module.exports;}});' } });

await build({ entryPoints: ['src/login/index.js'], bundle: true, platform: 'browser', format: 'iife', outfile: 'dist/login.js', target: 'es2022' });
await writeFile('dist/login.css', await readFile('src/login/style.css','utf8')+'\n'+await readFile('src/security/style.css','utf8'));

await copyFile('assets/wallpaper-v1.png', 'dist/wallpaper-v1.png');
