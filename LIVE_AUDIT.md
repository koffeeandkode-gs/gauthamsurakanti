# Cloudflare Pages preview audit — 17 October 2026

Preview: <https://gauthamsurakanti.pages.dev/>
Source commit: `5dae148` (`main`)

## Results

| Area | Live result |
| --- | --- |
| HTML routes | 163/163 returned HTTP 200 and matched the generated files byte for byte after the final deploy |
| Published content | 56 post records and 16 page records checked against the snapshot; rendered titles, dates, canonical URLs, and descriptions passed after accounting for the inherited permalink collision below |
| Comments | All 24 approved comments on 11 posts matched their source IDs, authors, dates, text, and anchors; nested replies were checked |
| Local navigation | 425 distinct local targets and 188 fragment links checked; no missing target or fragment |
| Files and images | 294 local asset and encoded-route targets returned successfully and matched their generated files byte for byte (101,925,245 bytes); 286 media records passed build checks |
| Discovery | 78 unique sitemap URLs, 20 RSS entries, and 56 search index entries checked; a browser search for “Uttari Betta” returned three relevant results |
| Error and privacy routes | An unknown URL returned 404; `/wp-admin/`, `/archive/raw/`, `/.env`, and the private backup path did not expose private data; the legacy introduction route reached the homepage |
| Layout | The homepage was visually checked in headless Chrome at 500 px and 1440 px browser viewports; navigation, heading, text, and hero fit at both sizes |

The live crawl reported **zero unexpected errors** after the final deploy. The build and static checks also passed. The 164 generated HTML files include `404.html`, which is not a normal 200 route.

Homepage screenshots: [500 px](audit/home-500.png) and [1440 px](audit/home-1440.png).

## Fixes made during this audit

- Repaired a malformed Services link to the published local Road to Paris post.
- Replaced two James Altucher links that returned 404 with matching live archive pages (both returned 200).
- Changed imported body headings from `h1` to `h2` so every generated page has one page title. The build check now enforces this.

Details and the remaining third-party link review list are in [LINK_AUDIT.md](LINK_AUDIT.md).

## Known content and test limits

- The WordPress snapshot contains both a post and a page called `my-impossible-list` with the same permalink. WordPress serves the page at that URL, and the static preview preserves this behavior. The post record still appears in the post search index and archive, so selecting it opens the page's version of the content. These two records are similar but not identical; deciding whether to give the older post a separate URL is an editorial choice.
- Ten historical external links still have no verified replacement. Another 28 destinations returned 403 to automated requests, one returned 406, and one had a TLS certificate mismatch. These are documented in [LINK_AUDIT.md](LINK_AUDIT.md).
- A true 390 px device viewport was not visually verified. Chrome's basic screenshot command enforces a 500 px minimum browser viewport; an attempt to use a debugging-port based device emulation script was rejected by automatic approval review. The 500 px responsive screenshot looked correct, and the user previously approved the preview on phone and computer.
- Comments were checked as rendered read-only content. New comment submission is not part of this static site.

The custom-domain DNS change was deliberately left for the final migration step.
