# Define or Defy

Static, Git-managed successor to [gauthamsurakanti.com](https://gauthamsurakanti.com/). See [MIGRATION.md](MIGRATION.md) for the migration plan and cutover checklist.

## Build locally

```sh
npm ci
npm run build
npm run check
npm run preview
```

The build reads only published WordPress content, approved public comments in `archive/public/`, and published Markdown files in `content/posts/`. It writes `dist/`, the Cloudflare Pages output directory. `npm run preview` serves it at `http://127.0.0.1:4173/`. `dist/` and `node_modules/` are ignored by Git. Existing comments are read-only; there is no submission form.

## Publish a new article after WordPress

1. Copy `content/POST_TEMPLATE.md` to `content/posts/your-slug.md`.
2. Fill in title, date, slug, description, categories and Markdown body. Put new images in `site/public/media/new/` and link them using `/media/new/filename.jpg`.
3. Keep `status: draft` while editing. Change it to `status: publish` when ready.
4. Run `npm run build && npm run check`, review the page, then commit and push. The Git-connected Cloudflare Pages project will build `dist/` from the `main` branch.

The theme lives in `site/style.css`; routes and templates live in `site/build.mjs`.

## WordPress sync while Hostinger is active

```sh
npm run sync
npm run sync:comments
npm run sync:media
npm run build
npm run check
```

Run these if WordPress content or approved comments change before cutover. Public source JSON is stored in `archive/public/`, and only media referenced by published content is stored in `site/public/`. The comments sync copies only approved comments on published posts and omits email addresses, IP addresses, and user agents. Do not use `archive/raw/` to build the public site; it includes drafts and private posts.

## Private backup

`backup/private/` contains comments, all posts/pages including drafts, and all original WordPress media. It is gitignored because comments may contain email addresses. Copy it to private off-machine storage before the Hostinger shutdown. For a portable WordPress archive, also use WordPress Admin → Tools → Export → All content. The older WordPress publishing commands remain in `publishing.md` for the transition period only.
