# Hyperlink audit — 16–17 October 2026

I checked the rendered bodies of all 56 published posts. This covered every anchor in the posts, local destinations, URL-like text outside anchors, and the 311 distinct external destinations in the original build. External URLs were checked with redirects, and non-200 results were retried with GET because some sites reject HEAD. A successful response only establishes that a destination responds; I also checked the context of every proposed replacement.

## Corrected in the static site

- Converted five surviving WordPress YouTube shortcodes into clickable video links. Four video IDs returned a successful YouTube oEmbed response. The fifth (`cgnu9mapQiQ`, in `21-life-lessons-at-21`) is still indexed as a Tony Robbins priming video but YouTube returns 403 to automated oEmbed checks, so its playback needs a manual check.
- The sixth shortcode (`KZmincS6xTs`, also in `21-life-lessons-at-21`) returns 404 from YouTube oEmbed. It now says that the original video is unavailable instead of sending readers to a known dead video.
- Removed 27 empty Jetpack slideshow controls from three posts. They were `<a>` elements with no `href` and could not operate on a static site; the images remain visible.
- Corrected one misleading link label in `week-1070`: it credited Darius Foroux, while the destination was a different Medium article. The label now describes the linked topic without guessing at its author.
- Replaced seven moved or dead external URLs. Exact mappings are in [`site/link-overrides.json`](site/link-overrides.json). All seven replacement destinations returned 200 on 16 October 2026:

| Post | Replacement |
| --- | --- |
| `badminton-barbecue-burgers-and-more` | The Inspiring Talk interview → the same Manoj Vasudevan episode on Apple Podcasts; Gimlet's Domain King episode → the same episode on Spotify |
| `week-1070` | Benjamin Hardy's article → the same article by the same author on Observer |
| `road-to-paris-initial-thoughts` | Audax India events → its current official calendar |
| `my-impossible-list`, `21-life-lessons-at-21` | CodeChef's certification page → its current certification page |
| `hyderabad-summer-slam-10k` | Athlos distance shorts → the current product page |
| `road-to-paris-registration-preparation-visa-and-bankruptcy` | Paris–Brest–Paris photo credit → the current official home page. The old 2019 regulations URL is gone; this replacement preserves the photo credit, not the historic regulations. |

## External links still unavailable

These ten distinct URLs returned 404/410 or no DNS response. I found no verified equivalent for the exact material, so the article text and its historical link remain for review. A missing guest post or third-party account may need the original author to provide a new location.

| Post | Link | Result |
| --- | --- | --- |
| `blog_cast-with-swathi-peddi` | `http://Vertigomadeness.blogspot.com` | 404; credited blog unavailable |
| `define-or-defy-moc-2017` | `http://mocindia.in/` | Domain does not resolve |
| `blog-cast-with-mohammed-furqan` | `mindfurry.wordpress.com/2017/09/17/boredom-it-takes-you-to-places/` | 410 |
| `badminton-barbecue-burgers-and-more` | `mindfurry.wordpress.com/2018/09/10/master-orator-championship-2018-through-my-eyes/` | 410 |
| `blog-cast-with-mohammed-furqan` | `play.google.com/store/apps/details?id=pt.bbarao.nightmode` | 404; app listing unavailable |
| `how-to-win-master-orator-championship-or-come-pretty-close` | Two `sagacioussomeone.wordpress.com` articles from 2018 and 2019 | Both 410 |
| `trip-to-arunachalam-intro-to-cryptography-and-more` | `takeawaysfrommylife.com/category/throwback-thursdays/` | Old domain does not resolve; no corresponding category in the migration |
| `blog-cast-with-mohammed-furqan` | `takeawaysfrommylife.wordpress.com/2017/07/16/blog-cast-with-chaitanya-pinapaka/` | 404; this post is absent from the public snapshot |
| `trip-to-arunachalam-intro-to-cryptography-and-more` | `strava.com/activities/1594276550/shareable_images/map_based` | 404; direct activity URL redirects to registration, so its public status is unclear |

## Could not verify automatically

- 28 distinct links returned 403, mostly Quora (14) and Medium (4), plus WallpaperAccess (2) and eight other sites. A 403 may be an automated-request block; I did not label these links broken or replace them without evidence.
- The Huffington Post cycling article returned 406. The `booksoncode.com/articles/clean-code` article has a TLS certificate mismatch in `curl`, although a search index still shows the article. Both need a browser check before changing them.
- The Amazon, LinkedIn, and Facebook links flagged by the HEAD pass returned 200 with GET.

After the fixes, the rendered posts contain 380 anchors, all with nonempty destinations; no raw YouTube shortcode remains. The site's local-link check passes across all 164 generated HTML files. External sites can change again, so this report records the results on the date above.

## Full live site follow-up — 17 October 2026

I checked all 335 distinct external destinations linked from the Cloudflare Pages preview, including posts, pages, navigation, and archives. HEAD requests were followed by GET for failed or ambiguous responses. I also checked all 425 distinct local targets. The 163 live HTML routes and 294 non-HTML local files matched the build byte for byte before these follow-up fixes.

Three additional links needed correction:

| Source | Original problem | Verified replacement |
| --- | --- | --- |
| `/services/` | `http://Road to Paris: Countdown to D-Day` was a malformed URL | The published local post `/road-to-paris-countdown-to-d-day/` |
| `/prompts/` | James Altucher's old Idea Machine URL returned 404 | The same article on `archive.jamesaltucher.com` |
| `/week-1070/` | James Altucher's old Tim Ferriss URL returned 404 | The matching Tim Ferriss podcast page on `archive.jamesaltucher.com` |

Both replacement archive pages returned HTTP 200 on 17 October. The ten historical links listed above are still unavailable. Automated requests to 28 other destinations returned 403; those were kept because the sites may block bots. The Huffington Post URL returned 406, and `booksoncode.com` had a TLS certificate mismatch. These need manual browser review before changing any link target.
