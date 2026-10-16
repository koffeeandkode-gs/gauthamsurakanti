#!/usr/bin/env node
// Private full-content snapshot, including drafts and private pages.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries((await fs.readFile(path.join(root, '.env'), 'utf8'))
  .split(/\r?\n/).map(line => line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)).filter(Boolean)
  .map(match => [match[1], match[2].trim()]));
if (!env.WP_URL || !env.WP_USER || !env.WP_APP_PASSWORD) throw new Error('WordPress credentials missing from .env');
const auth = 'Basic ' + Buffer.from(`${env.WP_USER}:${env.WP_APP_PASSWORD}`).toString('base64');
const base = `${env.WP_URL.replace(/\/$/, '')}/wp-json/wp/v2`;
const dir = path.join(root, 'backup/private');
await fs.mkdir(dir, { recursive: true, mode: 0o700 });
async function getAll(name, extra) {
  const items = [];
  for (let page = 1; ; page++) {
    const response = await fetch(`${base}/${name}?per_page=100&page=${page}&${extra}`, { headers: { Authorization: auth, Accept: 'application/json' } });
    if (!response.ok) throw new Error(`${name} page ${page}: HTTP ${response.status}`);
    items.push(...await response.json());
    if (page >= Number(response.headers.get('x-wp-totalpages') || 1)) break;
  }
  return items;
}
for (const name of ['posts', 'pages', 'media']) {
  const items = await getAll(name, name === 'media' ? 'context=edit' : 'status=any&context=edit');
  await fs.writeFile(path.join(dir, `${name}.json`), JSON.stringify({ saved_at: new Date().toISOString(), items }, null, 2) + '\n', { mode: 0o600 });
  console.log(`Saved ${items.length} ${name}`);
}
