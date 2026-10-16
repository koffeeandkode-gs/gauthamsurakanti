# Define or Defy: WordPress to Cloudflare Pages

## Working brief

Migrate `gauthamsurakanti.com` from WordPress on Hostinger to a read-only, GitHub-managed static site on Cloudflare Pages before Hostinger hosting expires on **18 October 2026**. Keep the familiar, simple “Define or Defy” look, existing article and page URLs, images, search, RSS, and basic SEO. Display existing approved comments under published posts, without accepting new submissions. Preserve all WordPress data, including held comments, privately. New posts should be authored in Markdown and published from Git. Keep the domain at GoDaddy and avoid renewing the ₹4,788 Hostinger hosting plan.

## Status on 16 October 2026

| Item | Finding |
| --- | --- |
| Domain | GoDaddy registration expires **12 February 2027**; auto-renew is off. This is separate from Hostinger hosting. |
| DNS | GoDaddy nameservers `ns23.domaincontrol.com` and `ns24.domaincontrol.com`; apex points to Hostinger `141.136.43.20`. Preserve TXT `google-site-verification=qwzITg4AvoAPbadFslYZn1ZVT-u_8rzjpbJOM0JdTgs`. |
| Email | No `@gauthamsurakanti.com` inboxes in use; public DNS has no MX record. Preserve the existing Google site verification TXT record when moving DNS. |
| Published content | 56 posts, 16 pages, 294 public media records. |
| Full private backup | 117 posts (56 published, 59 drafts, 2 private), 20 pages, 300 original media files, 3,629 comments (25 approved, 3,604 held). Saved under gitignored `backup/private/`. The current 145 MB archive is `backup/private/wordpress-backup-2026-10-16.tar.gz` (SHA-256 `889ab2adaa03bc5a1c1647d902fa29e4cb6cc97c1442ae45781bab0ad598200d`). |
| Static build | 56 post routes, 16 page routes, 24 public approved comments on 11 posts, category, tag, monthly archive, search, RSS and sitemap routes. 286 media references copied into the public site (about 101.6 MB downloaded). |

## Work completed

- Public WordPress REST snapshot in `archive/public/`, with build-time refusal to include nonpublished posts or pages.
- Private JSON and media backups in `backup/private/`. These files stay on this machine until copied elsewhere; they are **not** included in Git or the deployed site.
- Static site in `site/`, built to `dist/` with `npm run build` and checked with `npm run check`.
- Existing article slugs, the home page, archives, categories, tags, local media paths, search, RSS and sitemap.
- Markdown authoring template in `content/POST_TEMPLATE.md`; `status: draft` is skipped and `status: publish` builds a new route.
- The old WordPress contact form is replaced with a LinkedIn contact link. Old Jetpack slideshows display as image grids.
- The 24 approved comments available from the public WordPress API are shown below their 11 published posts. One approved comment targets an unpublished post and is excluded. The 3,604 held comments remain only in the private backup. Author email, IP, and user agent fields are absent from the public snapshot.
- Clean public source is on GitHub at `koffeeandkode-gs/gauthamsurakanti` (production branch `main`). The older local Git history remains separate because it contains drafts and private material.
- Cloudflare Pages Git integration is live at `https://gauthamsurakanti.pages.dev/`. On 16 October, all 78 URLs in the sitemap returned HTTP 200; an encoded historical article URL also worked, `/an-introduction/` redirected to `/`, and unknown routes returned HTTP 404 after adding a custom 404 page. Live homepage, newest article, RSS, sitemap, and search index matched the local build byte for byte.
- The owner approved the preview's familiar look for cutover. DNS setup is intentionally the last step.

## Remaining sequence

1. **Today or 17 October:** In WordPress Admin → Tools → Export, choose **All content** and download a WXR XML file. Also save a Hostinger full site/database backup if available. Copy the gitignored `backup/private/` folder and WXR file to an external drive or private cloud storage. The local private archive is not an off-machine backup. [WordPress export guide](https://wordpress.org/documentation/article/tools-export-screen/)
2. **Final cutover step, by 17 October:** Add the domain to Cloudflare DNS, compare imported records against GoDaddy, and preserve the Google site verification TXT value above. Current public DNS has no MX, AAAA, CAA, or DS record; `www` is a CNAME to the apex. Then set GoDaddy nameservers to the two values assigned by Cloudflare. Add the apex as a Pages custom domain and replace the old Hostinger A record with the Pages-managed record. Add `www` as a Pages custom domain or redirect it to the apex. Cloudflare requires its nameservers for an apex Pages domain. Verify HTTPS and URLs after propagation. [Cloudflare custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/), [nameserver setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)
3. **Before Hostinger expires on 18 October:** Check traffic, 404s, sitemap, RSS, and old comment anchors on the custom domain. Refresh the WordPress snapshot, public approved comments, and private comments backup if content changes after 16 October. Keep the domain registration active at GoDaddy; set a reminder well before 12 February 2027.

## Cutover acceptance checks

- Homepage and all 56 current published article URLs load over HTTPS.
- Images and linked uploads load from the new site, including older WordPress.com images copied locally.
- Search, categories, date archive, sitemap, RSS and the `www` hostname work.
- Existing approved comments appear on the matching posts. Draft/private posts and held comments are absent from deployed HTML and assets.
- The GoDaddy domain remains active, and Google site verification stays in DNS.

## Costs and constraints

Cloudflare Pages Free currently allows 500 builds per month, 20,000 files per site and 25 MiB per asset. This build has about 458 output files, with its largest public asset under 9 MB. Domain registration remains a separate GoDaddy cost. The current build uses no paid database or server runtime. [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)

## Known content differences

- Existing approved comments are displayed read-only. The site has no new comment form; a Google Form can be added later if wanted.
- The retired WordPress contact form is replaced by the existing LinkedIn contact link.
- Jetpack slideshows are static grids. Some historical third-party links and images were already broken on WordPress and need editorial review; the migration does not invent replacements.
- The old WordPress `archive/raw/` snapshot contains private material and should not be used as the deployable content source.
