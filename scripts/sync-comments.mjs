#!/usr/bin/env node
// Copy only publicly visible, approved comments on published posts.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'archive/public/comments.json');
const posts = JSON.parse(await fs.readFile(path.join(root, 'archive/public/posts.json'), 'utf8'));
const publishedPostIds = new Set(posts.filter(post => post.status === 'publish').map(post => post.id));
const comments = [];

for (let page = 1; ; page++) {
  const url = new URL('https://gauthamsurakanti.com/wp-json/wp/v2/comments');
  url.search = new URLSearchParams({ per_page: '100', page: String(page), _fields: 'id,post,parent,author_name,date,content,status,type' }).toString();
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Public comments page ${page}: HTTP ${response.status}`);
  const batch = await response.json();
  if (!Array.isArray(batch)) throw new Error('Unexpected public comments response');
  for (const comment of batch) {
    if (comment.status !== 'approved' || comment.type !== 'comment') throw new Error(`Unexpected comment visibility: ${comment.id}`);
    if (!publishedPostIds.has(comment.post)) continue;
    if (!Number.isInteger(comment.id) || !Number.isInteger(comment.post) || !Number.isInteger(comment.parent) ||
        typeof comment.author_name !== 'string' || typeof comment.date !== 'string' ||
        typeof comment.content?.rendered !== 'string') throw new Error(`Incomplete public comment: ${comment.id}`);
    comments.push({
      id: comment.id,
      post: comment.post,
      parent: comment.parent,
      author_name: comment.author_name,
      date: comment.date,
      body: comment.content.rendered,
      status: 'approved'
    });
  }
  if (page >= Number(response.headers.get('x-wp-totalpages') || 1)) break;
}

comments.sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
await fs.mkdir(path.dirname(out), { recursive: true });
await fs.writeFile(out, JSON.stringify(comments, null, 2) + '\n');
console.log(`Saved ${comments.length} public comments on published posts`);
