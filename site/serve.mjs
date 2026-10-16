#!/usr/bin/env node
// Local preview of the generated Cloudflare Pages output.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.mp4': 'video/mp4' };
const port = Number(process.env.PORT || 4173);

http.createServer(async (request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400).end('Bad URL'); return; }
  let file = path.join(root, pathname);
  if (file !== root && !file.startsWith(root + path.sep)) { response.writeHead(403).end('Forbidden'); return; }
  const stat = await fs.stat(file).catch(() => null);
  if (stat?.isDirectory()) file = path.join(file, 'index.html');
  const bytes = await fs.readFile(file).catch(() => null);
  if (!bytes) { response.writeHead(404).end('Not found'); return; }
  response.writeHead(200, { 'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream' }).end(bytes);
}).listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${port}/`));
