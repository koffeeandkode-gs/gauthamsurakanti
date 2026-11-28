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
for (const required of ['404.html', 'sitemap.xml', 'rss.xml', 'robots.txt', 'style.css', 'favicon.svg', 'tech/index.html', 'sports/index.html', 'musings/index.html']) {
  if (!await fs.stat(path.join(dist, required)).catch(() => null)) failures.push(`Missing output: ${required}`);
}
for (const removed of ['search', 'search.js', 'search-index.json']) {
  if (await fs.stat(path.join(dist, removed)).catch(() => null)) failures.push(`Removed search output remains: ${removed}`);
}
const home = await fs.readFile(path.join(dist, 'index.html'), 'utf8');
const visibleHome = home.replace(/<head[\s\S]*?<\/head>/i, '').replace(/<!--[\s\S]*?-->/g, '');
if (!home.includes('<title>Define or Defy</title>')) failures.push('Homepage title tag missing');
const sectionOrder = [...visibleHome.matchAll(/<section class="(home-intro|home-recent|home-about)"/g)].map(match => match[1]);
if (sectionOrder.join(',') !== 'home-intro,home-recent,home-about') failures.push('Homepage intro, recent writing, and about sections must appear in order');
if (!visibleHome.includes('href="#recent-writing"') || !visibleHome.includes('id="recent-writing" tabindex="-1">Recent writing</h2>')) failures.push('Homepage recent writing link or target missing');
if (!visibleHome.includes('href="#main"') || !visibleHome.includes('<main id="main" class="shell" tabindex="-1">')) failures.push('Homepage skip link or target missing');
if (!visibleHome.includes('/media/gautham-surakanti-portrait.jpeg')) failures.push('Homepage portrait missing');
if (!visibleHome.includes('href="/about/">About me</a>')) failures.push('Homepage About me link missing');
if (!visibleHome.includes('alt="Gautham Surakanti hiking with a backpack and trekking poles"')) failures.push('Portrait missing required alt text');
if (!visibleHome.includes('https://www.strava.com/athletes/19678138') || !visibleHome.includes('href="/rss.xml"') || !visibleHome.includes('href="/contact/"')) failures.push('Homepage footer links incomplete');
if (visibleHome.includes('Define or Defy') || visibleHome.includes('Start Here') || visibleHome.includes('A note from Gautham') || visibleHome.includes('hero-mark') || visibleHome.includes('post-card') || visibleHome.includes('/search/')) failures.push('Homepage contains obsolete visible content');
const notFound = await fs.readFile(path.join(dist, '404.html'), 'utf8');
if (!notFound.includes('name="robots" content="noindex"') || notFound.includes('rel="canonical"')) failures.push('404 page indexing metadata is wrong');
const sitemap = await fs.readFile(path.join(dist, 'sitemap.xml'), 'utf8');
for (const post of posts) if (!sitemap.includes(`https://gauthamsurakanti.com/${post.slug}/`)) failures.push(`Sitemap missing ${post.slug}`);
for (const slug of ['tech', 'sports', 'musings']) {
  if (!sitemap.includes(`<loc>https://gauthamsurakanti.com/${slug}/</loc>`)) failures.push(`Sitemap missing topic: ${slug}`);
}
const archive = await fs.readFile(path.join(dist, 'all-articles-by-date', 'index.html'), 'utf8');
if (!archive.includes('<a href="/guest-posts/">Guest Posts</a>')) failures.push('Writing archive is missing the Guest Posts link');
const newestArticles = Array.from(archive.matchAll(/<article><time datetime="([^"]+)">[^<]*<\/time><h3><a href="([^"]+)">/g)).slice(0, 4);
const homeArticles = Array.from(visibleHome.matchAll(/<article><h3><a href="([^"]+)">[^<]*<\/a><\/h3><time datetime="([^"]+)">/g));
if (homeArticles.length !== newestArticles.length || newestArticles.some(([, date, href], index) =>
  homeArticles[index]?.[1] !== href || homeArticles[index]?.[2] !== date
)) failures.push('Homepage must list the four newest published articles, title first');

const topicNavigation = '<a href="/tech/">Tech</a><a href="/sports/">Sports</a><a href="/musings/">Musings</a><a href="/about/">About</a>';
let htmlCount = 0;
async function checkLinks(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { await checkLinks(file); continue; }
    if (!entry.name.endsWith('.html')) continue;
    htmlCount++;
    const html = await fs.readFile(file, 'utf8');
    const visibleHtml = html.replace(/<!--[\s\S]*?-->/g, '');
    const route = path.relative(dist, file);
    const header = visibleHtml.match(/<header class="site-header">([\s\S]*?)<\/header>/)?.[1];
    const isHome = route === 'index.html';
    const masthead = isHome
      ? '<h1 class="masthead">Gautham Surakanti</h1>'
      : '<a class="masthead" href="/">Gautham Surakanti</a>';
    const mainNavigation = `<a href="/all-articles-by-date/">${isHome ? 'All articles' : 'Writing'}</a>${topicNavigation}`;
    if (!header?.includes(masthead) || !header.includes(`<nav aria-label="Main navigation">${mainNavigation}</nav>`)) {
      failures.push(`Inconsistent site header in ${route}`);
    }
    const footer = visibleHtml.match(/<footer class="site-footer[^"]*">([\s\S]*?)<\/footer>/)?.[1];
    if (/define or defy/i.test(footer ?? '') || /<p class="eyebrow">Define or Defy<\/p>/i.test(visibleHtml)) {
      failures.push(`Old site branding in ${route}`);
    }
    const headingCount = [...visibleHtml.matchAll(/<h1(?:\s|>)/gi)].length;
    if (headingCount !== 1) failures.push(`Expected one page title in ${path.relative(dist, file)}, found ${headingCount}`);
    if (/\[youtube\s+https?:\/\//i.test(visibleHtml)) failures.push(`Unrendered video link in ${path.relative(dist, file)}`);
    if (/<a\b(?![^>]*\bhref\s*=)[^>]*>/i.test(visibleHtml)) failures.push(`Anchor without a destination in ${path.relative(dist, file)}`);
    for (const match of visibleHtml.matchAll(/\b(?:href|src|poster)=["']([^"']+)["']/gi)) {
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
