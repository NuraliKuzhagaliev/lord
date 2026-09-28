const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', 'front');
const pages = [];
function collect(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const target = path.join(folder, entry.name);
    if (entry.isDirectory()) collect(target);
    else if (entry.name.endsWith('.html')) pages.push(target);
  }
}
collect(root);
const missing = [];
for (const page of pages) {
  const markup = fs.readFileSync(page, 'utf8');
  for (const [, url] of markup.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(?:https?:|#|data:|mailto:)/i.test(url)) continue;
    const target = path.resolve(path.dirname(page), url.split(/[?#]/)[0]);
    if (!fs.existsSync(target)) missing.push(path.relative(root, page) + ' → ' + url);
  }
}
if (missing.length) {
  console.error('Missing local assets or links:\n' + missing.join('\n'));
  process.exitCode = 1;
} else console.log('Checked ' + pages.length + ' pages: local links and assets resolve.');
