# Define or Defy: WordPress to Cloudflare Pages

## Working brief

Migrate `gauthamsurakanti.com` from WordPress on Hostinger to a read-only, GitHub-managed static site on Cloudflare Pages before Hostinger hosting expires on **18 October 2026**. Keep the familiar, simple “Define or Defy” look, existing article and page URLs, images, search, RSS, and basic SEO. Preserve all WordPress data and existing comments privately. New posts should be authored in Markdown and published from Git. Do not activate comments or a contact form yet. Keep the domain at GoDaddy and avoid renewing the ₹4,788 Hostinger hosting plan.

## Status on 16 October 2026

| Item | Finding |
| --- | --- |
| Domain | GoDaddy registration expires **12 February 2027**; auto-renew is off. This is separate from Hostinger hosting. |
| DNS | GoDaddy nameservers `ns23.domaincontrol.com` and `ns24.domaincontrol.com`; apex points to Hostinger `141.136.43.20`. |
| Email | No `@gauthamsurakanti.com` inboxes in use; public DNS has no MX record. Preserve the existing Google site verification TXT record when moving DNS. |
| Published content | 56 posts, 16 pages, 294 public media records. |
| Full private backup | 117 posts (56 published, 59 drafts, 2 private), 20 pages, 300 original media files, 3,629 comments (25 approved, 3,604 held). Saved under gitignored `backup/private/`. The current 145 MB archive is `backup/private/wordpress-backup-2026-10-16.tar.gz` (SHA-256 `889ab2adaa03bc5a1c1647d902fa29e4cb6cc97c1442ae45781bab0ad598200d`). |
| Static build | 56 post routes, 16 page routes, category, tag, monthly archive, search, RSS and sitemap routes. 286 media references copied into the public site (about 101.6 MB downloaded). |

## Work completed

- Public WordPress REST snapshot in `archive/public/`, with build-time refusal to include nonpublished posts or pages.
- Private JSON and media backups in `backup/private/`. These files stay on this machine until copied elsewhere; they are **not** included in Git or the deployed site.
- Static site in `site/`, built to `dist/` with `npm run build` and checked with `npm run check`.
- Existing article slugs, the home page, archives, categories, tags, local media paths, search, RSS and sitemap.
- Markdown authoring template in `content/POST_TEMPLATE.md`; `status: draft` is skipped and `status: publish` builds a new route.
- The old WordPress contact form is replaced with a LinkedIn contact link. Old Jetpack slideshows display as image grids.

## Remaining sequence

1. **Today, 16 October:** Publish only the clean static source to the empty public repository `koffeeandkode-gs/gauthamsurakanti`. The older local Git history contains `archive/raw/` with drafts and private material, so it must never be pushed. Keep `backup/private/` and `archive/raw/` out of the new repository. In Cloudflare Workers & Pages, create a **Git-connected Pages project** from the new repository, production branch `main`, repository root as the root directory, build command `npm run build`, output directory `dist`. `.node-version` pins Node 22. [Cloudflare Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/), [build settings](https://developers.cloudflare.com/pages/configuration/build-configuration/)
2. **Today, 16 October:** Check the resulting `pages.dev` preview on desktop and phone: home page, newest article, older photo-heavy articles, Guest Posts, search, and at least ten historical URLs. Check the sitemap, RSS, and images. Review a few old external links and image gaps; some third-party images were already broken on WordPress.
3. **Today or 17 October:** In WordPress Admin → Tools → Export, choose **All content** and download a WXR XML file. Also save a Hostinger full site/database backup if available. Copy the gitignored `backup/private/` folder and WXR file to an external drive or private cloud storage. The local private archive is not an off-machine backup. [WordPress export guide](https://wordpress.org/documentation/article/tools-export-screen/)
4. **After preview approval, by 17 October:** Add the domain to Cloudflare DNS, compare imported records against GoDaddy (especially Google site verification), then set GoDaddy nameservers to the Cloudflare values. Add both apex and `www` as Pages custom domains, with the apex as canonical. Cloudflare requires its nameservers for an apex Pages domain. Verify HTTPS and URLs after propagation. [Cloudflare custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)
5. **Before Hostinger expires on 18 October:** Check traffic, 404s, sitemap and RSS. Refresh the WordPress snapshot and private comments backup if content changes after 16 October. Keep the domain registration active at GoDaddy; set a reminder well before 12 February 2027.

## Cutover acceptance checks

- Homepage and all 56 current published article URLs load over HTTPS.
- Images and linked uploads load from the new site, including older WordPress.com images copied locally.
- Search, categories, date archive, sitemap, RSS and the `www` hostname work.
- Draft/private posts and private comment data are absent from deployed HTML and assets.
- The GoDaddy domain remains active, and Google site verification stays in DNS.

## Costs and constraints

Cloudflare Pages Free currently allows 500 builds per month, 20,000 files per site and 25 MiB per asset. This build has about 457 output files, with its largest public asset under 9 MB. Domain registration remains a separate GoDaddy cost. The current build uses no paid database or server runtime. [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)

## Known content differences

- Comments are backed up but are not displayed or collected on the static site. A Google Form can be added later if wanted.
- The retired WordPress contact form is replaced by the existing LinkedIn contact link.
- Jetpack slideshows are static grids. Some historical third-party links and images were already broken on WordPress and need editorial review; the migration does not invent replacements.
- The old WordPress `archive/raw/` snapshot contains private material and should not be used as the deployable content source.
