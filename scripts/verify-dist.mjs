import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  }))).flat();
}

const files = await filesUnder('dist');
const failures = [];
if (files.some((file) => file.endsWith('.map'))) failures.push('source maps are present');
const textFiles = files.filter((file) => /\.(?:html|css|js|json|txt)$/u.test(file));
const contents = await Promise.all(textFiles.map((file) => readFile(file, 'utf8')));
const bundle = contents.join('\n');
const html = await readFile('dist/index.html', 'utf8');
const executable = (await Promise.all(
  files.filter((file) => /\.(?:html|js)$/u.test(file)).map((file) => readFile(file, 'utf8')),
)).join('\n');
if (!/default-src (?:'self'|&#39;self&#39;)/u.test(html)) failures.push('production CSP is missing');
if (!html.includes('/zhuyin-spire/assets/')) failures.push('GitHub Pages asset base is missing');
if (/fonts\.googleapis\.com|fonts\.gstatic\.com/u.test(bundle)) failures.push('Google Fonts URL remains');
if (/\/Users\/|C:\\\\Users\\/u.test(bundle)) failures.push('local personal path is present');
if (/debugPanel|zhuyin-debug-root|DEBUG · 測試用/u.test(executable)) failures.push('debug UI is present');

if (failures.length) {
  throw new Error(`Unsafe production artifact: ${failures.join('; ')}`);
}
console.log(`Verified ${files.length} production files: no source maps, external fonts, local paths, or debug UI.`);
