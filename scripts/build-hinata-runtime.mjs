import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('src/chat/vendor', { recursive:true });
await build({ entryPoints:['src/chat/pixi-hinata-entry.mjs'], outfile:'src/chat/vendor/pixi-hinata.mjs', bundle:true, format:'esm', platform:'browser', target:['es2022'], minify:true, legalComments:'linked' });
await copyFile('node_modules/pixi.js/LICENSE', 'src/chat/vendor/PIXI-LICENSE.txt');
