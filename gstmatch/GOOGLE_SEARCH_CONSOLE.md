# Google Search Console Setup Guide — GSTMatch

Everything you need to connect **GSTMatch** to Google Search Console (GSC), get
your pages indexed, and read the reports.

The codebase is already SEO-ready:

- `app/robots.ts` → serves `/robots.txt` (allows crawling, points to sitemap)
- `app/sitemap.ts` → serves `/sitemap.xml` (home, pricing, blog, product pages)
- `app/layout.tsx` → canonical tags, Open Graph, Twitter cards, JSON-LD
  structured data, and (new) an optional `google-site-verification` meta tag.

---

## 1. Add your site to Search Console

1. Go to <https://search.google.com/search-console> and sign in.
2. Click **Add property** (top-left).
3. Choose a property type:

| Type | What it covers | Verification |
|------|----------------|--------------|
| **Domain** (recommended) | `gstmatch.cyou` — all protocols/subdomains | DNS TXT record (one time, at your DNS provider) |
| **URL prefix** | `https://gstmatch.cyou/` only | Meta tag, HTML file, or DNS |

> **Recommendation:** choose **Domain** and verify with a **DNS TXT record**.
> It's permanent (no code to keep), covers `http`/`https`/`www`/non-`www`
> automatically, and you can keep ownership when you deploy elsewhere.

---

## 2. Verify ownership

### Option A — DNS TXT record (best for a "Domain" property)

1. In GSC, choose **Domain property** → it shows a `google-site-verification=...`
   **TXT** value.
2. Add that as a **TXT record** at your DNS provider (Vercel, Cloudflare,
   GoDaddy, etc.):
   - Host/Name: `@` (or blank)
   - Type: `TXT`
   - Value: `google-site-verification=XXXX`
3. Click **Verify**. Propagation can take a few minutes to a few hours.
4. **No code change needed** — you can leave
   `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` unset.

### Option B — HTML meta tag (for a "URL prefix" property)

This codebase supports it via an environment variable:

1. In GSC: **Add property → URL prefix** → paste
   `https://gstmatch.cyou/` → choose **HTML tag**.
2. Copy the `content="ABC123..."` value.
3. Set it in the deploy environment:
   - Local: add to `gstmatch/.env.local` →
     `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=ABC123...`
   - Vercel: **Project → Settings → Environment Variables** → add
     `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` for Production.
4. Deploy. The app now renders
   `<meta name="google-site-verification" content="ABC123..."/>` on every page.
5. In GSC click **Verify**, then **Done**.

> The variable is `NEXT_PUBLIC_`-prefixed so it is inlined at build time and
> rendered on the server HTML. If it is not set, no meta tag is emitted.

---

## 3. Submit your sitemap

1. Open your property in GSC.
2. **Menu → Sitemaps** (under *Indexing*).
3. In **Add a new sitemap**, enter:
   ```
   sitemap.xml
   ```
4. Click **Submit**.

Expected: status **Success**, ~15+ URLs found (your `/robots.txt` already lists
`sitemap.xml`, and `/sitemap.xml` is generated at build time). No need to submit
`robots.txt` to GSC.

---

## 4. Get pages indexed

New/changed content is found automatically via the sitemap, but you can speed it up:

**URL Inspection tool** (per-URL, fastest feedback):
1. **Menu → URL Inspection** (top).
2. Paste a URL, e.g. `https://gstmatch.cyou/`.
3. If **URL is on Google**, click **Request indexing**.
4. Do this for your most important pages (home, `/pricing`, key blogs).

**Bulk:** changes to `app/sitemap.ts` + a redeploy + re-submitting the sitemap
tells Google to recrawl listed pages.

> **Important:** Google only lets you *request* indexing — it decides whether
> and how fast to crawl. Quality, internal links, and crawl budget all matter.

---

## 5. Understanding the reports

### Performance
- **Menu → Performance**.
- Top bar: filter by date. Default shows all search results (Google Search).
  Switch **Search type** to: Web, Images, Video, or News.
- **Queries** — search terms people actually used. Sort by **Clicks**.
- **Pages** — which URLs perform best.
- **Countries / Devices / Dates** — where and how users find you.
- **CTR** — % of impressions that became clicks. Low CTR + high position ⇒ your
  title/description (snippet) needs work.
- **Position** — average ranking. Not a simple linear scale; CTR differs a lot
  between positions 1–3 vs 4–10.

### URL Inspection
- Shows whether a specific URL is **on Google**, the **date last crawled**, and
  **coverage** status. Use **Test Live URL** to preview with the real crawler
  (good for checking the Googlebot isn't blocked by your CSP/robots).
- **View Crawled Page** → loads a Google-cached render; great for spotting
  missing content.

### Indexing → Pages
- Summarises why URLs are/aren't indexed:
  - **Page is indexed** ✔
  - **Crawled – currently not indexed** — Google crawled but chose not to index
    (often thin/duplicate/low-quality content). Improve content & internal links.
  - **Discovered – currently not indexed** — found via sitemap but not crawled
    yet. Often needs patience/internal links.
  - **Duplicate without user-selected canonical** — consolidate
    near-identical pages.
  - **Soft 404 / 404** — URLs returning a 404 or a page that looks like one.

### Rich results / Enhancements
- Shows if Google detected **structured data** errors. GSTMatch ships JSON-LD
  (`Organization`, `SoftwareApplication`). Fix any flagged items here.

### Security & Manual actions
- Alerts you if Google finds malware, spam, or a **manual action** (a penalty).
  GSTMatch does not set `noindex`, so pages shouldn't be blocked — if you ever
  add one, make sure it's intentional.

---

## 6. Keeping things healthy (checklist)

- [ ] `NEXT_PUBLIC_SITE_URL` set to your real domain in production (currently
      defaults to `https://gstmatch.cyou`).
- [ ] Site verified (DNS or meta tag).
- [ ] `sitemap.xml` submitted and showing **Success**.
- [ ] `robots.txt` reachable and lists the sitemap (it does).
- [ ] Every public page has a unique `title`, `description`, and canonical URL
      (handled by `app/layout.tsx`; pages already set their own titles).
- [ ] Check **Performance** monthly for queries to optimise around.
- [ ] Don't block Googlebot — the Content-Security-Policy in `next.config.js`
      only restricts browsers; Googlebot uses its own renderer and is not
      blocked by CSP.

---

## 7. Related env vars

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | Canonical base URL for sitemap/robots/OG tags |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Optional HTML-tag verification value |

> Pull/merge requests and deploys go through Vercel — after any SEO change,
> redeploy and use **URL Inspection → Request indexing** to refresh Google.

