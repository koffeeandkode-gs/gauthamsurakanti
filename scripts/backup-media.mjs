#!/usr/bin/env node
// Private copy of the entire WordPress media library, including unreferenced files.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'backup/private/uploads');
const metadata = JSON.parse(await fs.readFile(path.join(root, 'backup/private/media.json'))).items;
const unique = [...new Set(metadata.map(item => item.source_url).filter(Boolean))];
const report = [];
let next = 0;
async function worker() {
  while (next < unique.length) {
    const url = unique[next++];
    try {
      const source = new URL(url);
      if (source.hostname !== 'gauthamsurakanti.com' || !source.pathname.startsWith('/wp-content/uploads/')) throw new Error('Unexpected media URL');
      const file = path.join(dir, decodeURIComponent(source.pathname.slice('/wp-content/uploads/'.length)));
      const current = await fs.stat(file).catch(() => null);
      if (current?.size) { report.push({ url, status: 'cached', bytes: current.size }); continue; }
      const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
      await fs.writeFile(file, bytes, { mode: 0o600 });
      report.push({ url, status: 'ok', bytes: bytes.length });
    } catch (error) { report.push({ url, status: 'failed', error: error.message }); }
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
report.sort((a, b) => a.url.localeCompare(b.url));
await fs.writeFile(path.join(root, 'backup/private/media-report.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
const counts = Object.fromEntries(Object.entries(Object.groupBy(report, item => item.status)).map(([key, group]) => [key, group.length]));
console.log(`Media library: ${report.length} unique files`, counts);
console.log(`Bytes present: ${(report.reduce((sum, item) => sum + (item.bytes || 0), 0) / 1e6).toFixed(1)} MB`);
if (counts.failed) console.log('Failures are listed in backup/private/media-report.json');
