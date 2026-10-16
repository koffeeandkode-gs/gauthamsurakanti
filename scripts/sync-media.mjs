#!/usr/bin/env node
// Download only media referenced by public content. Keep old upload paths working.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const snapshot = path.join(root, 'archive/public');
const publicDir = path.join(root, 'site/public');
const posts = JSON.parse(await fs.readFile(path.join(snapshot, 'posts.json')));
const pages = JSON.parse(await fs.readFile(path.join(snapshot, 'pages.json')));
const media = JSON.parse(await fs.readFile(path.join(snapshot, 'media.json')));
const mediaById = new Map(media.map(item => [item.id, item]));
const urls = new Set();

function usable(raw) {
  try {
    const url = new URL(raw.replaceAll('&amp;', '&'));
    return (url.hostname === 'gauthamsurakanti.com' && url.pathname.startsWith('/wp-content/uploads/')) ||
      url.hostname === 'takeawaysfrommylife.files.wordpress.com';
  } catch { return false; }
}
for (const item of [...posts, ...pages]) {
  for (const match of (item.content?.rendered || '').matchAll(/\b(?:src|href|poster)=["']([^"']+)["']/gi)) {
    if (usable(match[1])) urls.add(match[1].replaceAll('&amp;', '&'));
  }
  const featured = mediaById.get(item.featured_media)?.source_url || item.jetpack_featured_media_url;
  if (featured && usable(featured)) urls.add(featured);
}

function localPath(raw) {
  const url = new URL(raw);
  if (url.hostname === 'gauthamsurakanti.com') return decodeURIComponent(url.pathname);
  const hash = crypto.createHash('sha256').update(url.href).digest('hex').slice(0, 16);
  const ext = path.extname(url.pathname).replace(/[^.a-z0-9]/gi, '').toLowerCase() || '.bin';
  return `/media/legacy/${hash}${ext}`;
}

const pending = [...urls].map(url => ({ url, target: localPath(url) }));
const results = [];
let next = 0;
async function worker() {
  while (next < pending.length) {
    const { url, target } = pending[next++];
    const file = path.join(publicDir, target.slice(1));
    try {
      const stat = await fs.stat(file).catch(() => null);
      if (stat?.size) { results.push({ url, target, status: 'cached', bytes: stat.size }); continue; }
      const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > 25 * 1024 * 1024) throw new Error('over 25 MiB Pages asset limit');
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, bytes);
      results.push({ url, target, status: 'ok', bytes: bytes.length });
    } catch (error) {
      results.push({ url, target, status: 'failed', error: error.message });
    }
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
results.sort((a, b) => a.url.localeCompare(b.url));
await fs.writeFile(path.join(snapshot, 'assets.json'), JSON.stringify(results, null, 2) + '\n');
const counts = Object.fromEntries(Object.entries(Object.groupBy(results, item => item.status)).map(([key, group]) => [key, group.length]));
console.log(`Media references: ${results.length}`, counts);
console.log(`Downloaded ${(results.reduce((sum, item) => sum + (item.bytes || 0), 0) / 1e6).toFixed(1)} MB including cached files`);
if (counts.failed) console.log('Failures are listed in archive/public/assets.json');
