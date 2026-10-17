#!/usr/bin/env node
// Dependency-free static build from the public WordPress snapshot.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import MarkdownIt from 'markdown-it';
import YAML from 'yaml';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const snapshot = path.join(root, 'archive/public');
const output = path.join(root, 'dist');
const origin = 'https://gauthamsurakanti.com';
const read = async name => JSON.parse(await fs.readFile(path.join(snapshot, `${name}.json`)));
const [posts, pages, categories, tags] = await Promise.all(['posts', 'pages', 'categories', 'tags'].map(read));
if ([...posts, ...pages].some(item => item.status !== 'publish')) throw new Error('Unpublished content in public snapshot');
const markdown = new MarkdownIt({ html: true, linkify: true, typographer: true });
const postFiles = (await fs.readdir(path.join(root, 'content/posts'), { withFileTypes: true })).filter(entry => entry.isFile() && entry.name.endsWith('.md'));
const localPosts = [];
let nextCategoryId = -1;
let nextTagId = -1;
function addTerms(names, terms, idType) {
  return names.map(name => {
    if (typeof name !== 'string' || !name.trim()) throw new Error(`Invalid ${idType} name`);
    const slug = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let term = terms.find(item => item.slug === slug || item.name.toLowerCase() === name.toLowerCase());
    if (!term) { term = { id: idType === 'category' ? nextCategoryId-- : nextTagId--, slug, name }; terms.push(term); }
    return term.id;
  });
}
for (const entry of postFiles) {
  const source = await fs.readFile(path.join(root, 'content/posts', entry.name), 'utf8');
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`${entry.name}: expected YAML front matter`);
  const meta = YAML.parse(match[1]);
  if (meta?.status === 'draft') continue;
  if (meta?.status !== 'publish') throw new Error(`${entry.name}: status must be draft or publish`);
  if (!meta.title || !meta.date || !meta.slug) throw new Error(`${entry.name}: title, date and slug are required`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.slug)) throw new Error(`${entry.name}: slug must use lowercase words and hyphens`);
  const date = String(meta.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) throw new Error(`${entry.name}: date must be YYYY-MM-DD`);
  if (typeof meta.description !== 'string') throw new Error(`${entry.name}: description is required`);
  localPosts.push({ slug: meta.slug, date: `${date}T00:00:00`, status: 'publish', title: { rendered: String(meta.title) }, excerpt: { rendered: meta.description }, content: { rendered: markdown.render(match[2]) }, categories: addTerms(meta.categories || [], categories, 'category'), tags: addTerms(meta.tags || [], tags, 'tag'), featured_media: 0, jetpack_featured_media_url: meta.image || '' });
}
const existingSlugs = new Set([...posts, ...pages].map(item => item.slug));
for (const post of localPosts) {
  if (existingSlugs.has(post.slug)) throw new Error(`Duplicate slug: ${post.slug}`);
  existingSlugs.add(post.slug);
  posts.push(post);
}
posts.sort((a, b) => b.date.localeCompare(a.date));
const media = await read('media');
const comments = await read('comments');
const publishedPostIds = new Set(posts.map(post => post.id).filter(Number.isInteger));
if (comments.some(comment => comment.status !== 'approved' || !publishedPostIds.has(comment.post))) {
  throw new Error('Nonpublic comment in public snapshot');
}
const commentsByPost = new Map();
for (const comment of comments) {
  const list = commentsByPost.get(comment.post) || [];
  list.push(comment);
  commentsByPost.set(comment.post, list);
}
const mediaById = new Map(media.map(item => [item.id, item]));
const assetResults = await read('assets').catch(() => []);
const assetMap = new Map(assetResults.filter(item => item.status !== 'failed').map(item => [item.url, item.target]));
const linkOverrides = new Map(Object.entries(JSON.parse(await fs.readFile(path.join(root, 'site/link-overrides.json'), 'utf8'))));
const categoryById = new Map(categories.map(item => [item.id, item]));
const pageBySlug = new Map(pages.map(item => [item.slug, item]));
const publishedSlugs = new Map([...posts, ...pages].map(item => [item.slug, item.link === origin + '/' ? '/' : `/${item.slug}/`]));
const months = new Map();
for (const post of posts) {
  const key = post.date.slice(0, 7);
  if (!months.has(key)) months.set(key, []);
  months.get(key).push(post);
}

function decode(value = '') {
  return String(value).replace(/&(#(?:x[0-9a-f]+|\d+)|amp|lt|gt|quot|apos|nbsp|hellip|rsquo|lsquo|rdquo|ldquo|ndash|mdash);/gi, (_, entity) => {
    const special = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—' };
    if (entity[0] === '#') return String.fromCodePoint(entity[1]?.toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10));
    return special[entity.toLowerCase()] || _;
  });
}
function plain(value = '') { return decode(String(value).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim(); }
function escape(value = '') { return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]); }
function dateLabel(value) { return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + 'Z')); }
function postUrl(post) { return `/${post.slug}/`; }
function description(item) { return plain(item.excerpt?.rendered || item.content?.rendered || '').slice(0, 160); }
function feature(item) {
  const raw = mediaById.get(item.featured_media)?.source_url || item.jetpack_featured_media_url;
  return raw ? rewriteUrl(raw) : '';
}
function rewriteUrl(raw) {
  const clean = decode(raw);
  if (linkOverrides.has(clean)) return linkOverrides.get(clean);
  if (assetMap.has(clean)) return assetMap.get(clean);
  try {
    const url = new URL(clean);
    if (url.hostname === 'gauthamsurakanti.com' || url.hostname === 'www.gauthamsurakanti.com') {
      return url.pathname + url.search + url.hash;
    }
    if (['takeawaysfrommylife.com', 'www.takeawaysfrommylife.com', 'takeawaysfrommylife.wordpress.com'].includes(url.hostname)) {
      const slug = url.pathname.split('/').filter(Boolean).at(-1);
      if (publishedSlugs.has(slug)) return publishedSlugs.get(slug);
    }
  } catch { /* Keep relative or malformed legacy links as supplied. */ }
  return clean;
}
function content(item) {
  return (item.content?.rendered || '')
    .replace(/<h1(?=[\s>])([^>]*)>/gi, '<h2$1>')
    .replace(/<\/h1\s*>/gi, '</h2>')
    .replace(/\[youtube\s+(https?:\/\/www\.youtube\.com\/watch\?[^\]\s]+)\]/gi, (_, raw) => {
      const video = new URL(decode(raw));
      const id = video.searchParams.get('v');
      if (id === 'KZmincS6xTs') return '<em>Original video no longer available on YouTube.</em>';
      return id && /^[A-Za-z0-9_-]{11}$/.test(id)
        ? `<a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">Watch video on YouTube</a>`
        : escape(raw);
    })
    .replace(/\s(?:srcset|sizes)=["'][^"']*["']/gi, '')
    .replace(/\b(src|href|poster)=(['"])(.*?)\2/gi, (_, attr, quote, value) => `${attr}=${quote}${escape(rewriteUrl(value))}${quote}`)
    .replace(/>http:\/\/theinspiringtalk\.com\/manoj-vasudevan-interview\/<\/a>/gi, '>Listen to the Manoj Vasudevan interview</a>')
    .replace(/>https:\/\/www\.gimletmedia\.com\/startup\/domain-king-season-6-episode-1<\/a>/gi, '>Listen to Domains 1: The .com King</a>')
    .replace('This 1-min article by Darius Foroux is a must read', 'This short article on shame and pursuing dreams is worth reading')
    .replace(/<iframe\b[^>]*\bsrc=["'][^"']*\/embed\/[^"']*["'][^>]*><\/iframe>/gi, '')
    .replace(/<a href="\/(?:solid-principles|weekly-reflections-1)\/">([\s\S]*?)<\/a>/gi, '$1')
    .replace(/<a\b[^>]*class="[^"]*wp-block-jetpack-slideshow_button-(?:prev|next|pause)[^"]*"[^>]*>\s*<\/a>/gi, '')
    .replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, '');
}
function layout({ title, description: summary, canonical, body, type = 'website', image = '', noindex = false }) {
  const fullTitle = title === 'Define or Defy' ? title : `${title} · Define or Defy`;
  const url = canonical ? origin + canonical : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(fullTitle)}</title><meta name="description" content="${escape(summary)}">
${url ? `<link rel="canonical" href="${escape(url)}">` : ''}<link rel="alternate" type="application/rss+xml" title="Define or Defy RSS" href="/rss.xml">
<meta property="og:type" content="${type}"><meta property="og:title" content="${escape(fullTitle)}"><meta property="og:description" content="${escape(summary)}">${url ? `<meta property="og:url" content="${escape(url)}">` : ''}${image ? `<meta property="og:image" content="${escape(image.startsWith('/') ? origin + image : image)}">` : ''}
${noindex ? '<meta name="robots" content="noindex">' : ''}<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/style.css"></head>
<body><a class="skip" href="#main">Skip to content</a><header class="site-header"><div class="shell header-inner"><a class="brand" href="/">Define <span>or</span> Defy<span class="brand-dot">.</span></a><nav aria-label="Main navigation"><a href="/">Start Here</a><a href="/all-articles-by-date/">All Articles</a><a href="/guest-posts/">Guest Posts</a><a href="/about/">About</a><a href="/search/">Search</a></nav></div></header>
<main id="main" class="shell">${body}</main><footer class="site-footer"><div class="shell footer-inner"><p>Define or Defy · Gautham Surakanti</p><div><a href="/rss.xml">RSS</a><a href="/contact/">Contact</a><a href="https://www.linkedin.com/in/gauthamsurakanti/">LinkedIn</a></div></div></footer></body></html>`;
}
async function write(urlPath, value) {
  const file = urlPath === '/' ? path.join(output, 'index.html') : path.join(output, decodeURIComponent(urlPath.slice(1)), 'index.html');
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, value);
}
function card(post) {
  const title = plain(post.title.rendered);
  const image = feature(post);
  return `<article class="post-card">${image ? `<a class="card-image" href="${postUrl(post)}"><img src="${escape(image)}" alt="" loading="lazy"></a>` : ''}<div><p class="eyebrow"><time datetime="${post.date.slice(0, 10)}">${dateLabel(post.date)}</time></p><h3><a href="${postUrl(post)}">${escape(title)}</a></h3><p>${escape(description(post).slice(0, 190))}</p><a class="text-link" href="${postUrl(post)}">Read article <span aria-hidden="true">→</span></a></div></article>`;
}
function articleList(items) { return `<div class="article-list">${items.map(post => `<article><time datetime="${post.date.slice(0, 10)}">${dateLabel(post.date)}</time><h3><a href="${postUrl(post)}">${escape(plain(post.title.rendered))}</a></h3></article>`).join('')}</div>`; }
function pageHead(kicker, title, intro = '') { return `<section class="page-head"><p class="eyebrow">${escape(kicker)}</p><h1>${escape(title)}</h1>${intro ? `<p class="lead">${escape(intro)}</p>` : ''}</section>`; }
function taxonomyLink(category) { return `<a href="/category/${encodeURIComponent(category.slug)}/">${escape(plain(category.name))}</a>`; }
function commentBody(raw) {
  return String(raw)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>/g, ' ')
    .split(/\n{2,}/)
    .map(part => decode(part).replace(/[\t ]+/g, ' ').replace(/\n\s+/g, '\n').trim())
    .filter(Boolean)
    .map(part => `<p>${escape(part).replaceAll('\n', '<br>')}</p>`)
    .join('');
}
function renderComments(post) {
  const items = commentsByPost.get(post.id) || [];
  if (!items.length) return '';
  const byId = new Map(items.map(comment => [comment.id, comment]));
  if (byId.size !== items.length) throw new Error(`Duplicate comment ID on post ${post.id}`);
  const children = new Map();
  for (const comment of items) {
    if (comment.parent === comment.id) throw new Error(`Self-referencing comment ${comment.id}`);
    const parent = byId.has(comment.parent) ? comment.parent : 0;
    const list = children.get(parent) || [];
    list.push(comment);
    children.set(parent, list);
  }
  for (const list of children.values()) list.sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  const visited = new Set();
  function renderList(parent) {
    return `<ol class="comment-list">${(children.get(parent) || []).map(comment => {
      if (visited.has(comment.id)) throw new Error(`Comment reply cycle on post ${post.id}`);
      visited.add(comment.id);
      return `<li class="comment" id="comment-${comment.id}"><div class="comment-meta"><strong>${escape(comment.author_name || 'Reader')}</strong><a href="#comment-${comment.id}"><time datetime="${escape(comment.date)}">${dateLabel(comment.date)}</time></a></div><div class="comment-body">${commentBody(comment.body)}</div>${children.has(comment.id) ? renderList(comment.id) : ''}</li>`;
    }).join('')}</ol>`;
  }
  const html = renderList(0);
  if (visited.size !== items.length) throw new Error(`Unreachable comment reply on post ${post.id}`);
  return `<section class="comments" id="comments" aria-labelledby="comments-heading"><h2 id="comments-heading">Comments <span>${items.length}</span></h2><p class="comments-note">Earlier comments are shown here. New comments are closed for now.</p>${html}</section>`;
}

await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(output, { recursive: true });
await fs.cp(path.join(root, 'site/public'), output, { recursive: true, force: true });
await fs.copyFile(path.join(root, 'site/style.css'), path.join(output, 'style.css'));

const home = pageBySlug.get('an-introduction');
const homeBody = `<section class="home-hero"><div><p class="eyebrow">Start here</p><h1>A life in lessons, stories and takeaways.</h1><p class="lead">Thoughts on endurance, work, speaking and the things learned along the way.</p><a class="button" href="/all-articles-by-date/">Explore the writing <span aria-hidden="true">→</span></a></div><div class="hero-mark" aria-hidden="true">D<span>/</span>D</div></section>
<section class="home-intro"><div class="section-heading"><p class="eyebrow">A note from Gautham</p><h2>Define or Defy</h2></div><div class="prose">${content(home)}</div></section>
<section class="recent"><div class="section-heading row"><div><p class="eyebrow">The latest</p><h2>Recent writing</h2></div><a class="text-link" href="/all-articles-by-date/">View every article <span aria-hidden="true">→</span></a></div><div class="cards">${posts.slice(0, 6).map(card).join('')}</div></section>`;
await write('/', layout({ title: 'Define or Defy', description: description(home), canonical: '/', body: homeBody }));
await fs.writeFile(path.join(output, '404.html'), layout({ title: 'Page not found', description: 'The requested page could not be found.', noindex: true, body: `${pageHead('404', 'That page is missing')}<div class="prose page-prose"><p>The link may have changed. Browse <a href="/all-articles-by-date/">all articles</a> or return to the <a href="/">start page</a>.</p></div>` }));

for (const post of posts) {
  const title = plain(post.title.rendered);
  const cats = post.categories.map(id => categoryById.get(id)).filter(Boolean);
  const body = `<article class="article"><header class="article-head"><p class="eyebrow"><time datetime="${post.date.slice(0, 10)}">${dateLabel(post.date)}</time>${cats.length ? ` <span class="sep">·</span> ${cats.map(taxonomyLink).join(', ')}` : ''}</p><h1>${escape(title)}</h1></header><div class="prose">${content(post)}</div>${renderComments(post)}<footer class="article-foot"><a class="text-link" href="/all-articles-by-date/">← All articles</a></footer></article>`;
  await write(postUrl(post), layout({ title, description: description(post), canonical: postUrl(post), body, type: 'article', image: feature(post) }));
}

const archiveBody = `${pageHead('The archive', 'All articles by date', `${posts.length} published pieces, from ${posts.at(-1)?.date.slice(0, 4)} to ${posts[0]?.date.slice(0, 4)}.`)}<div class="archive">${[...months].map(([month, items]) => `<section><h2 id="${month}">${new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`))}</h2>${articleList(items)}</section>`).join('')}</div>`;
await write('/all-articles-by-date/', layout({ title: 'All articles by date', description: 'Every published article on Define or Defy, in date order.', canonical: '/all-articles-by-date/', body: archiveBody }));

for (const page of pages) {
  if (['an-introduction', 'all-articles-by-date'].includes(page.slug)) continue;
  const title = plain(page.title.rendered);
  let html = content(page);
  if (page.slug === 'contact') html = '<p>The old contact form is retired. You can reach me on <a href="https://www.linkedin.com/in/gauthamsurakanti/">LinkedIn</a>.</p>';
  if (page.slug === 'sample-page') html = '<p>This WordPress sample page is retired. Explore <a href="/all-articles-by-date/">all articles</a>.</p>';
  if (!plain(html)) html = `<p>Explore <a href="/all-articles-by-date/">all articles</a> or return to the <a href="/">start page</a>.</p>`;
  const body = `${pageHead('Define or Defy', title)}<div class="prose page-prose">${html}</div>`;
  await write(`/${page.slug}/`, layout({ title, description: description(page) || `${title} on Define or Defy.`, canonical: `/${page.slug}/`, body, noindex: page.slug === 'sample-page' }));
}

await write('/search/', layout({ title: 'Search', description: 'Search articles on Define or Defy.', canonical: '/search/', noindex: true, body: `${pageHead('Find a story', 'Search articles')}<form class="search-form" action="/search/" method="get" role="search"><label for="query">Search by title or topic</label><div><input id="query" name="q" type="search" autocomplete="off" required><button type="submit">Search</button></div></form><div id="search-results" class="search-results" aria-live="polite"></div><noscript><p>Search needs JavaScript. You can browse <a href="/all-articles-by-date/">all articles</a>.</p></noscript><script defer src="/search.js"></script>` }));
await fs.writeFile(path.join(output, 'search-index.json'), JSON.stringify(posts.map(post => ({ title: plain(post.title.rendered), url: postUrl(post), date: dateLabel(post.date), description: description(post), text: plain(post.content.rendered) }))));

for (const category of categories) {
  const items = posts.filter(post => post.categories.includes(category.id));
  if (!items.length) continue;
  const url = `/category/${category.slug}/`;
  await write(url, layout({ title: plain(category.name), description: `Articles in ${plain(category.name)}.`, canonical: url, body: pageHead('Category', plain(category.name), `${items.length} articles`) + articleList(items) }));
}
for (const tag of tags) {
  const items = posts.filter(post => post.tags.includes(tag.id));
  if (!items.length) continue;
  const url = `/tag/${tag.slug}/`;
  await write(url, layout({ title: plain(tag.name), description: `Articles tagged ${plain(tag.name)}.`, canonical: url, body: pageHead('Tag', plain(tag.name), `${items.length} articles`) + articleList(items) }));
}
for (const [month, items] of months) {
  const [year, number] = month.split('-');
  const url = `/${year}/${number}/`;
  const title = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`));
  await write(url, layout({ title, description: `Articles from ${title}.`, canonical: url, body: pageHead('Monthly archive', title) + articleList(items) }));
}

const sitemapUrls = ['/', ...posts.map(postUrl), ...pages.filter(page => !['an-introduction', 'sample-page'].includes(page.slug)).map(page => `/${page.slug}/`), ...categories.filter(cat => posts.some(post => post.categories.includes(cat.id))).map(cat => `/category/${cat.slug}/`)];
await fs.writeFile(path.join(output, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...new Set(sitemapUrls)].map(url => `<url><loc>${escape(origin + url)}</loc></url>`).join('')}</urlset>`);
await fs.writeFile(path.join(output, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
await fs.writeFile(path.join(output, 'rss.xml'), `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Define or Defy</title><link>${origin}/</link><description>Writing by Gautham Surakanti</description>${posts.slice(0, 20).map(post => `<item><title>${escape(plain(post.title.rendered))}</title><link>${origin}${postUrl(post)}</link><guid>${origin}${postUrl(post)}</guid><pubDate>${new Date(post.date + 'Z').toUTCString()}</pubDate><description>${escape(description(post))}</description></item>`).join('')}</channel></rss>`);
await fs.writeFile(path.join(output, '_redirects'), '/an-introduction/ / 301\n');
console.log(`Built ${posts.length} posts, ${pages.length} pages, ${categories.length} categories, ${tags.length} tags and ${months.size} monthly archives.`);
