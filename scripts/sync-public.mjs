#!/usr/bin/env node
// Read-only WordPress import. Only public records enter the deployable snapshot.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = 'https://gauthamsurakanti.com/wp-json/wp/v2';
const out = path.join(root, 'archive/public');

async function collection(name) {
  const items = [];
  for (let page = 1; ; page++) {
    const url = `${base}/${name}?per_page=100&page=${page}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`${name} page ${page}: HTTP ${response.status}`);
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error(`${name}: unexpected response`);
    items.push(...batch);
    if (page >= Number(response.headers.get('x-wp-totalpages') || 1)) break;
  }
  return items;
}

await fs.mkdir(out, { recursive: true });
for (const name of ['posts', 'pages', 'media', 'categories', 'tags']) {
  const items = await collection(name);
  if ((name === 'posts' || name === 'pages') && items.some(item => item.status !== 'publish')) {
    throw new Error(`${name}: refusing to save unpublished content`);
  }
  await fs.writeFile(path.join(out, `${name}.json`), JSON.stringify(items, null, 2) + '\n');
  console.log(`${name}: ${items.length}`);
}
