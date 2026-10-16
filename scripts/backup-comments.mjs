#!/usr/bin/env node
// Private local backup. Never commit this output: it may include email addresses.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries((await fs.readFile(path.join(root, '.env'), 'utf8'))
  .split(/\r?\n/).map(line => line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)).filter(Boolean)
  .map(match => [match[1], match[2].trim()]));
if (!env.WP_URL || !env.WP_USER || !env.WP_APP_PASSWORD) throw new Error('WordPress credentials missing from .env');
const auth = 'Basic ' + Buffer.from(`${env.WP_USER}:${env.WP_APP_PASSWORD}`).toString('base64');
const comments = [];
for (let page = 1; ; page++) {
  const url = `${env.WP_URL.replace(/\/$/, '')}/wp-json/wp/v2/comments?context=edit&status=all&per_page=100&page=${page}`;
  const response = await fetch(url, { headers: { Authorization: auth, Accept: 'application/json' } });
  if (!response.ok) throw new Error(`comments page ${page}: HTTP ${response.status}`);
  const batch = await response.json();
  comments.push(...batch);
  if (page >= Number(response.headers.get('x-wp-totalpages') || 1)) break;
}
const dir = path.join(root, 'backup/private');
await fs.mkdir(dir, { recursive: true, mode: 0o700 });
const dest = path.join(dir, 'comments.json');
await fs.writeFile(dest, JSON.stringify({ saved_at: new Date().toISOString(), comments }, null, 2) + '\n', { mode: 0o600 });
const counts = Object.groupBy(comments, comment => comment.status);
console.log(`Saved ${comments.length} comments to backup/private/comments.json`);
console.log(Object.fromEntries(Object.entries(counts).map(([status, list]) => [status, list.length])));
