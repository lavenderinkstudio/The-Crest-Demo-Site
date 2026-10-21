# The Crest: website

This is a single-page site for The Crest. Its one goal is to send visitors to the Airbnb listing to book. It is plain HTML, CSS and JS, with no build step.

## Preview locally

```sh
cd the-crest
python3 -m http.server 8000
# open http://localhost:8000
```

You can also just open `index.html` in a browser.

## Adding your photos

1. Name each photo after its slot (see the table below), e.g. `hero.jpg`, `gallery-3.png`. JPG, PNG, HEIC, WebP and TIFF all work.
2. Put the photos in `the-crest/photos/`.
3. Run `sh tools/process-photos.sh` from inside `the-crest/`.

The script saves each photo as `images/<slot>-1000.jpg` and `images/<slot>-2200.jpg`. Slots you haven't supplied keep their placeholder. It never upscales, so send the largest originals you have; 2200px wide or more is ideal.

| Slot | Where it appears | What works best |
|---|---|---|
| `hero` | Full-screen opening frame behind THE CREST wordmark | **Landscape**, calm and mid-toned through the centre (sky, sea, a soft interior) so the white wordmark reads clearly. No busy detail in the middle. |
| `exterior` | **Hero reveal**: starts as a small card behind the wordmark and grows to fill the frame as visitors scroll | **Landscape**: the house in its setting, ideally near the centre. It's seen both as a small portrait crop and full screen. If the house sits off-centre, change `object-position` on `.hero__reveal img` in `css/styles.css`. |
| `intro` | Beside the opening story | Portrait (4:5): a view from inside, or a detail of the house |
| `living` | "The living room" panel | Landscape (4:3) |
| `bath` | "The bath" panel | Landscape (4:3) |
| `bedroom` | "The bedrooms" panel | Landscape (4:3) |
| `deck` | "The deck" panel | Landscape (4:3) |
| `coast` | "Around The Crest" frame | Wide landscape of the coastline. The left side sits behind a frosted panel. |
| `final` | Closing "Your stay is waiting" frame | Calm and atmospheric (dusk, sea, a quiet detail). White text and the booking bar sit on top. |
| `gallery-1` … `gallery-6` | "A closer look" grid | A mix. Slots 1 and 5 are tall tiles, 6 is wide, the rest are roughly square. |

After swapping photos, update each photo's `alt` text in `index.html` so it describes the new image.

**More gallery photos:** in `index.html`, copy one `<li>` in the gallery list and change its numbers to `gallery-7` (the script handles up to `gallery-9`). Extra tiles flow on in rows of three.

## Before going live

### 1. Set the Airbnb link (required)
The site currently runs as a **concept build**: `demo: true` in `js/config.js` makes every booking button open a short on-page note (dates, guests and tracking tag) instead of leaving for Airbnb. To go live, replace `airbnbUrl` with the real listing URL and set `demo: false`. Every booking button on the site then uses that URL: the hero bar, the hero top pill, the rating card, the section links, the gallery, the mobile bar, the lightbox, the final bar and the footer.

Each link gets UTM tags (`utm_content=hero-bar`, `final-bar`, `header`, …), so you can see which button visitors click.

In `index.html` the booking links point at `#book` (the closing booking section), so the page still works without JavaScript and never sends anyone to a broken listing.

The booking bars pass `check_in`, `check_out` and `adults` to Airbnb, so the listing opens with those dates already selected. Test this once with the real URL.

### 2. Confirm the details
Everything marked `CONFIRM` is placeholder content:

- `js/config.js`: rating, review count and nightly price (`4.97`, `126`, `$1,150`). The page reads these values automatically. Also the coordinates, which drive the live "Sunset tonight" time in the hero, and the maximum number of guests.
- `index.html`: the "at a glance" facts, room descriptions, region, and nearby places and travel times. For a real property, also add social links to the footer, remove the `noindex` line and the "Concept site" footer credit, and consider adding `LodgingBusiness` structured data with the real rating.

### 3. Replace the sample reviews
The three quotes under "From recent guests" are **sample copy, not real reviews**. Replace them with real guest reviews from Airbnb, with the guests' permission, before publishing.

### 4. Social previews
Once the site has a domain, change the `og:image` and JSON-LD `image` in `<head>` to absolute URLs (e.g. `https://thecrest.com.au/images/hero-2200.jpg`).

## Deploy
Publish only the files the site uses:

```
index.html   404.html   css/   js/   images/   _headers   vercel.json
```

`_headers` (Netlify, Cloudflare Pages) and `vercel.json` (Vercel) add the same security headers, including a Content Security Policy. The policy allows the small inline script in `<head>` by its hash, so if you ever edit that script, regenerate the hash and update both files:

```sh
python3 -c "import re,hashlib,base64;s=re.search(r'<script>(.*?)</script>',open('index.html').read(),re.S).group(1);print('sha256-'+base64.b64encode(hashlib.sha256(s.encode()).digest()).decode())"
```

Leave out `photos/` (your originals, about 8 MB), `tools/` and this README, since anything uploaded can be downloaded by visitors. The simplest way is to copy those items into a fresh folder and drag that folder into Netlify or Vercel. On GitHub Pages, keep them in the published branch or folder only.

`404.html` is shown for any missing address, so its links start with `/`. That works when the site sits at the root of a domain (Netlify, Vercel or a custom domain). On a GitHub Pages project address such as `username.github.io/the-crest/`, add `/the-crest` to the start of its paths.

## Hero scroll reveal
The hero is pinned while visitors scroll through it. Over that distance, the `exterior` photo grows from a card behind the wordmark to fill the frame, the landscape behind it dims, and THE / CREST part and fade. The booking bar and rating card stay on screen throughout.

The effect uses the page's normal scrolling, so mouse, trackpad, touch and keyboard all work. Visitors who have reduced motion turned on see a static hero instead. To change how long the reveal lasts, edit the `.js-reveal .reveal` height in `css/styles.css` (`230svh` by default; larger is slower). To change the starting card size, edit `--w0` and `--h0`.

## Section motion
Below the hero, every section animates once as it scrolls into view, using the same moves as the hero: photos coming into focus, headings rising line by line, fine lines drawing in, and slow settling zooms. Around The Crest and the closing booking frame are tied to the scroll itself: the Around frame widens as it arrives, and the final frame grows into place and finishes with the hero's wave lines.

- An element's motion is chosen by its `data-motion` attribute in `index.html` (`rise`, `lines`, `open`, `blind`, `wipe`, `kicker`, `develop`, …). Remove the attribute to make that element static.
- Elements with `data-scrub` follow the scroll position.
- Timings live in the "Section motion" block at the end of `css/styles.css`. Shared durations are the `--dur-s/m/l` tokens at the top of the file, and per-element delays are the `--delay` values.
- Visitors who have reduced motion turned on see every section in its final state, with no animation.

## Design notes
- **Colour:** linen `#F6F3EE`, stone `#E9E4DC`, sand `#D6CEC2`, driftwood `#6A6257`, and navy `#1F2A3A`, which is reserved for booking actions. The tokens are at the top of `css/styles.css`.
- **Type:** Bodoni Moda for the wordmark and headings, Jost for body text and UI.
- **Shape:** inset rounded frames for the hero and closing section, 16px image corners, pill buttons, and frosted-glass panels.

## Placeholder photo credits
The current images are free-to-use Unsplash photos and do not show the actual property.

| Slot | Source |
|---|---|
| hero | https://images.unsplash.com/photo-1542559272-819e1934ac51 |
| exterior | Supplied concept image (AI-generated), colour-graded to match the hero. Original kept at `photos/exterior-original.png`. **Replace with a real photo of the property before launch.** |
| intro | https://images.unsplash.com/photo-1695259496167-c05f25f1d793 |
| living | https://images.unsplash.com/photo-1724931498964-a1f392ba9ace |
| bath | https://images.unsplash.com/photo-1671497601148-bc2375e45a74 |
| bedroom | https://images.unsplash.com/photo-1550514704-91c29ba3442a |
| deck | https://images.unsplash.com/photo-1791356430275-8739e443d2a3 |
| coast | https://images.unsplash.com/photo-1779629498098-379d15449b4f |
| final | https://images.unsplash.com/photo-1471047283799-ebd97acc0bc3 |
| gallery-1 | https://unsplash.com/photos/vAHF4JBC_m0 (Tyler Zhang) |
| gallery-2 | https://images.unsplash.com/photo-1598941288672-af25bcc7b223 |
| gallery-3 | https://images.unsplash.com/photo-1762544968153-b9b47435fefd |
| gallery-4 | https://unsplash.com/photos/Tc82KrUncBg (rawkkim) |
| gallery-5 | https://images.unsplash.com/photo-1547083723-7c73eaf54cc6 |
| gallery-6 | https://images.unsplash.com/photo-1516941064643-74aacd84843c |

## Structure
```
index.html               page markup
css/styles.css           all styles (design tokens at the top)
js/config.js             Airbnb URL, UTM tags, rating, price, location, max guests
js/main.js               booking links and bars, header, section motion, mobile bar, sunset time, reviews, lightbox
images/                  web-ready photos (generated)
photos/                  drop your original photos here
tools/process-photos.sh  resizes photos/ into images/
```
