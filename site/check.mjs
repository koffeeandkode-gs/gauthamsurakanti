#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const posts = JSON.parse(await fs.readFile(path.join(root, 'archive/public/posts.json')));
const pages = JSON.parse(await fs.readFile(path.join(root, 'archive/public/pages.json')));
const assets = JSON.parse(await fs.readFile(path.join(root, 'archive/public/assets.json')));
const comments = JSON.parse(await fs.readFile(path.join(root, 'archive/public/comments.json')));
const failures = [];
if ([...posts, ...pages].some(item => item.status !== 'publish')) failures.push('Unpublished item in public snapshot');
const postById = new Map(posts.map(post => [post.id, post]));
for (const comment of comments) {
  if (comment.status !== 'approved' || !postById.has(comment.post)) failures.push(`Nonpublic comment in public snapshot: ${comment.id}`);
  if (Object.keys(comment).some(key => ['author_email', 'author_ip', 'author_user_agent', 'meta', 'author_avatar_urls'].includes(key))) failures.push(`Private comment field in public snapshot: ${comment.id}`);
  const post = postById.get(comment.post);
  if (post) {
    const html = await fs.readFile(path.join(dist, decodeURIComponent(post.slug), 'index.html'), 'utf8').catch(() => '');
    if (!html.includes(`id="comment-${comment.id}"`)) failures.push(`Missing comment on ${post.slug}: ${comment.id}`);
  }
}
for (const post of posts) {
  const file = path.join(dist, decodeURIComponent(post.slug), 'index.html');
  if (!await fs.stat(file).catch(() => null)) failures.push(`Missing post: ${post.slug}`);
}
for (const page of pages) {
  const file = page.slug === 'an-introduction' ? path.join(dist, 'index.html') : path.join(dist, page.slug, 'index.html');
  if (!await fs.stat(file).catch(() => null)) failures.push(`Missing page: ${page.slug}`);
}
for (const asset of assets) {
  if (asset.status === 'failed') { failures.push(`Media download failed: ${asset.url}`); continue; }
  const file = path.join(dist, asset.target.slice(1));
  const stat = await fs.stat(file).catch(() => null);
  if (!stat?.size) failures.push(`Missing media: ${asset.target}`);
  if (stat?.size > 25 * 1024 * 1024) failures.push(`Oversize media: ${asset.target}`);
}
for (const required of ['404.html', 'sitemap.xml', 'rss.xml', 'robots.txt', 'style.css', 'favicon.svg', 'search.js', 'search-index.json']) {
  if (!await fs.stat(path.join(dist, required)).catch(() => null)) failures.push(`Missing output: ${required}`);
}
const home = await fs.readFile(path.join(dist, 'index.html'), 'utf8');
if (!home.includes('Define or Defy') || !home.includes('/all-articles-by-date/')) failures.push('Homepage navigation incomplete');
const notFound = await fs.readFile(path.join(dist, '404.html'), 'utf8');
if (!notFound.includes('name="robots" content="noindex"') || notFound.includes('rel="canonical"')) failures.push('404 page indexing metadata is wrong');
const sitemap = await fs.readFile(path.join(dist, 'sitemap.xml'), 'utf8');
for (const post of posts) if (!sitemap.includes(`https://gauthamsurakanti.com/${post.slug}/`)) failures.push(`Sitemap missing ${post.slug}`);
let htmlCount = 0;
async function checkLinks(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { await checkLinks(file); continue; }
    if (!entry.name.endsWith('.html')) continue;
    htmlCount++;
    const html = await fs.readFile(file, 'utf8');
    const visibleHtml = html.replace(/<!--[\s\S]*?-->/g, '');
    if (/\[youtube\s+https?:\/\//i.test(html)) failures.push(`Unrendered video link in ${path.relative(dist, file)}`);
    if (/<a\b(?![^>]*\bhref\s*=)[^>]*>/i.test(visibleHtml)) failures.push(`Anchor without a destination in ${path.relative(dist, file)}`);
    for (const match of html.matchAll(/\b(?:href|src|poster)=["']([^"']+)["']/gi)) {
      const url = match[1].replaceAll('&amp;', '&');
      if (!url.startsWith('/') || url.startsWith('//')) continue;
      const pathname = url.split(/[?#]/)[0];
      if (!pathname) continue;
      let decoded;
      try { decoded = decodeURIComponent(pathname); } catch { failures.push(`Bad URL in ${file}: ${pathname}`); continue; }
      const target = path.join(dist, decoded);
      const isFile = (await fs.stat(target).catch(() => null))?.isFile();
      const isPage = (await fs.stat(path.join(target, 'index.html')).catch(() => null))?.isFile();
      if (!isFile && !isPage) failures.push(`Broken local link in ${path.relative(dist, file)}: ${pathname}`);
    }
  }
}
await checkLinks(dist);
console.log(`Checked ${posts.length} posts, ${pages.length} pages and ${assets.length} media files.`);
console.log(`Checked ${comments.length} approved comments on published posts.`);
console.log(`Checked local links in ${htmlCount} HTML files.`);
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log('Static build checks passed.');
