# Happy Paws Cat Rescue website

A static website built with [Eleventy](https://www.11ty.dev/) from the approved designs. All 16 designed pages are here, plus a simple accessibility statement page. There is no database and no server: the build turns the files in `src/` into plain HTML, CSS and JavaScript in `_site/`, which any web host can serve.

This is a first build. The look, layout and behaviour match the designs, but the cats, some text and a few links are still stand-ins. The list of what to finish is below.

## Run it

You need [Node.js](https://nodejs.org/) 18 or newer (22 is what the project was built with).

```
npm install
npm start        # opens the site at http://localhost:8080 and reloads when you save
npm run build    # makes the finished site in the _site folder
```

The built site in `_site` must be served from a web address (it will not work by double-clicking `index.html`, because the pages use paths such as `/assets/site.css`).

## Where things are

| Folder or file | What it holds |
| --- | --- |
| `src/*.njk`, `src/<page>/index.njk` | One file per page: the layout and design. The wording is not here: each page reads it from `src/_data/text/` (see "Editing page wording"). |
| `src/_data/text/*.json` | The wording of every page, one file per page. The client edits these at `/admin/`. |
| `src/news/items/*.md` | One file per news story. Also edited at `/admin/`. |
| `src/static/admin/` | The page editor (Decap CMS, served from the site itself) and its settings, `config.yml`. |
| `lib/rich.js` | Turns a little markdown in a wording field into the site's own markup (links, bold, coloured words, line breaks). |
| `src/_includes/header.njk`, `footer.njk` | The header (with appeal bar and charity number) and the footer, shared by every page. Their wording is in `text/header.json` and `text/footer.json`. |
| `src/_includes/newsletter.njk`, `news-article.njk`, `news-row.njk`, `giving-text.njk` | The newsletter box shared by four pages, the page every news story uses, one row of the news list, and the lines about what each gift pays for (passed to `giving.js`). |
| `src/_includes/base.njk` | The page shell: head tags, fonts, styles, scripts. |
| `src/_includes/apply-embed.njk` | The section that shows a Pawlytics application form. Used by `/apply/` and `/foster/apply/`. |
| `src/_data/site.json` | Settings: Stripe links, the Pawlytics application forms, the contact form address, social links, wish list link. |
| `src/_data/cats.json` | The cats (11 samples). See "Cats" below. |
| `src/cats/index.njk`, `src/cats/cat.njk` | The cats listing, and the template that makes one page per cat. |
| `src/assets/css/site.css` | Shared styles. Page-only styles are in `src/assets/css/pages/`. |
| `src/assets/js/` | `site.js` (menu, contact and newsletter forms), `cats.js` (filters), `giving.js` (donate amounts), `apply.js` (shows the cat's name on the adoption page). Plain JavaScript, no libraries. |
| `src/images/` | Photos and logo. File names say what each one shows. |
| `src/static/` | Copied to the site root as they are: `robots.txt`, favicons, and `_redirects` (old Wix addresses, Netlify only). |
| `scripts/`, `.github/workflows/` | The Pawlytics sync, its tests and its scheduled run (switched off until the Pawlytics query is written). See `scripts/README.md`. |
| `eleventy.config.js` | Build settings and two small helpers. |
| `netlify.toml` | Only used if the site is hosted on Netlify. |

The pages were generated once from the design files, so from here on edit the `.njk` files directly for layout and design, and the wording through the editor (or the JSON files).

## Editing page wording

Every page's text lives in `src/_data/text/<page>.json` and is shown by the page through `{{ text.<page>.<section>.<field> }}`. The client changes it at `/admin/` (Decap CMS, signed in with GitHub); each save is a commit to `main`, which Netlify then builds. Cats are not in the editor: they come from Pawlytics.

- **A field holds a little markdown**: `[words](https://address)` for a link, `**bold**`, `*italic*`, `==words==` for the pink words in headings, and a new line for a line break. The template says what a link, bold or coloured word should look like (`{{ text.x | rich({a: {...}}) | safe }}`), so the editor cannot change the design.
- **Lists** (testimonials, questions and answers, steps, events) are real lists in the editor: add, remove and reorder. They loop in the template with `{% for it in text.x.list %}`. A group whose items differ in markup (for example one row has an extra link) is a fixed set of numbered fields instead.
- **News** is a folder of markdown files, `src/news/items/*.md`. The newest is the lead story on `/news/`. Each gets a page at `/news/<file name>/`. The story text is plain markdown, never run as template code.
- **Privacy and accessibility** are a list of titled sections written in markdown; the contents list builds itself.
- **Not editable**: words inside JavaScript (some form and filter messages), the cat details (they come from Pawlytics), and anything that is not text (links, colours, layout, the number of items in a fixed group).

To add editable wording to a page: put the string in the page's JSON file, show it with `{{ text.<page>... }}` in the template, and add a field with the same name to `src/static/admin/config.yml`. `npm run test:cms` fails if the three disagree.

To try the editor on your own computer: `npm start` in one terminal, `npm run cms:local` in another, then open `http://localhost:8080/admin/` and choose Login. Edits then go to your local files, not to GitHub.

Setting it up for the charity (the GitHub sign-in and the editor's access) is in `features/content-management` in the project docs and in `happy-paws-cms-setup.pdf`. Photos the editor adds go to `src/images/`; there is no automatic resizing, so ask the client to keep them under about 1 MB.

## Settings to fill in (`src/_data/site.json`)

| Setting | What to put there | Until it is filled in |
| --- | --- | --- |
| `donate.links` | One Stripe payment link for each amount: monthly £3, £5 and £10, and one-off £10, £25, £50 and £200, plus an `other` link where the donor chooses what to pay (one-off only). The amounts shown on the site are the numbers in this list. | A gift whose link is empty shows "Online giving is not switched on yet". |
| `applications.adoption`, `applications.foster` | The addresses of the two application forms in the charity's Pawlytics account: `embed` is the address shown inside the page and `page` is the same form on its own page. Both are filled in already. | Nothing to do unless Pawlytics changes a form. |
| `forms.endpoint` | Where the contact and newsletter forms send their answers. On Netlify set it to `/` to use Netlify Forms. Formspree and similar services also work. Adoption and foster applications do not use this. | Those forms go straight to the thank-you page and send nothing. |
| `social.facebook`, `instagram`, `tiktok` | The three page addresses | The footer shows "[add link]". |
| `wishlist` | The Amazon wish list address | The wish list buttons do nothing. |

Every build prints a reminder while `donate.links` or `forms.endpoint` is empty.

## Cats

Cats come from `src/_data/cats.json`. Each cat gets a listing tile and its own page at `/cats/<slug>/`. The eleven in there are samples, named "[Cat name]", and use stock photos.

| Field | Meaning |
| --- | --- |
| `slug` | Used in the address, for example `sample-cat-1` |
| `name`, `sex`, `colour`, `tagline` | Shown on the listing and the cat's page |
| `age_band` | `Kitten`, `Adult` or `Senior`. The age filter uses this. |
| `age_text` | The age as written on the cat's page, such as "8 months" |
| `area` | `Stockton`, `Birmingham` or `Banbury`: where the cat is being looked after. Shown on the listing tile and the cat's page only. There is no area filter on the cats page (removed 11 Nov 2026). |
| `reserved` | `true` shows a "Reserved" tag on the listing |
| `good_with`, `health`, `donation` | The facts list on the cat's page |
| `story` | A list of paragraphs |
| `photos` | A list of `{ "src", "alt", "pos" }`. `src` is a file in `src/images/`, `pos` is the crop focus such as `50% 40%` |
| `bg` | Colour shown while the photo loads |

This is also the shape the Pawlytics sync writes. The sync is in `scripts/` (see `scripts/README.md`): it reads the cats from Pawlytics, writes `cats.json`, turns the photos into small WebP files in `src/images/cats/`, and saves only when something changed. The listing and cat pages need no change when it is switched on. Each save makes Netlify rebuild the site, which uses hosting credits (see `features/hosting` in the project notes), so the sync commits only real changes.

**State:** everything except the Pawlytics query is written and tested on made-up cats (`npm run test:sync`). The query needs the real schema, which needs the Auth0 values and a login from Pawlytics. The scheduled run in `.github/workflows/sync-pawlytics.yml` is switched off until then.

A cat with no `area` simply shows without one.

## Before launch

1. Replace the sample cats, either by hand or with the Pawlytics sync (`scripts/README.md`). Before switching the sync on, add its secrets on GitHub, run it once with "Check only", then remove the `#` from the schedule.
2. Replace the stock photos with the rescue's own, and update the alt text.
3. Fill in the text in square brackets on the pages (amounts, reply times, addresses, names, dates).
4. Fill in `src/_data/site.json` (above).
5. News: the client adds stories at `/admin/` (see "Editing page wording"). Two are in `src/news/items/`: fill in the "[Date]" and "[Author]" reminders on the award story, and check the date of the BBC Banbury story (`2026-02-05` is a guess).
6. Privacy policy and accessibility statement: both are drafted, with square brackets where only the charity can answer. The charity fills the gaps and approves them, then the pink "Draft" box is deleted from each page. Neither is legal advice. Update the accessibility statement after any further testing (screen reader, real phones, Safari and Firefox have not been tried).
7. Test a payment through Stripe in test mode, then a small real gift (one-off and monthly).
8. Test the contact form end to end, including where the email arrives. Submit a test adoption and a test foster application on the live site and check they appear in Pawlytics.
9. Change `site.url` in `site.json` and the `Sitemap:` line in `src/static/robots.txt` if the address will not be www.happypawscatrescue.org.
10. Move the domain, then test the old Wix addresses (see "Old Wix addresses" below). The redirects are already in the project.

## What was checked

- Every page was compared with its design at desktop (1440 px) and phone (390 px) widths. Page heights match exactly, and under 0.2% of pixels differ (font smoothing), apart from the "More cats" row on a cat's page, which now follows the cats list.
- The menu, the cats age filter, donate amounts and forms were exercised in a browser.
- An automated accessibility scan (axe-core, WCAG 2.2 AA rules) finds no violations on any page at either width. It cannot judge everything, so a manual check with a keyboard and a screen reader is still worth doing before launch.
- Every internal link and in-page anchor was followed and works.

- The editor was tried on a computer with its local test server (`npm run cms:local`): signing in, changing a heading and a button, editing a policy section, and writing a news story, each saved to the right file and showing correctly. `npm test` covers the editor's settings and the markdown helper.

Not done: testing on real phones, Safari or Firefox, or with a screen reader, and the real GitHub sign-in for the editor (it needs the charity's accounts: see `happy-paws-cms-setup.pdf`).

## Old Wix addresses

The old site has ten pages and twelve placeholder shop pages. `src/static/_redirects` sends visitors from the old addresses to the new pages, so existing links, bookmarks and search results keep working. It is a Netlify file; on any other host the same list has to be set up in that host's own format.

| Old address | What happens | Why |
| --- | --- | --- |
| `/about`, `/cats`, `/contact`, `/news`, `/testimonials` | Netlify adds the trailing slash by itself (`/cats` opens `/cats/`) | Same address, so no rule is written. A rule would loop. |
| `/support` | 301 to `/ways-to-help/` | The old page covered fostering, fundraising, the wish list and donating. |
| `/adopter-s-form` | 301 to `/apply/` | The old page was the adoption form. The new adoption application page replaces it. |
| `/shop` | 301 to `/ways-to-help/` | It listed only template products, so the nearest real page is used. |
| `/product-page/i-m-a-product` to `-11` | Not redirected, so they show the 404 page | Twelve Wix template products with no real content. |
| `/website-instructions-page` | Not redirected, so it shows the 404 page | An internal note for the old site, with a PDF on adding cats there. |

One thing a redirect cannot carry over: the cat photos on the old Cats page linked to places on the old home page (`/#comp-...`). The part after the `#` is never sent to the server, so those links simply open the new home page.

Every rule was checked with a script: targets exist, no loops or chains, and each old address lands where the table says. The script applies the rules itself rather than running on Netlify, so after the first deploy try `curl -I https://<site>/support` and expect a 301 to `/ways-to-help/`.

## Changes made to the design

- Links on the blush background of the donate page are a deeper pink (`#A60E50`) because the original pink was 3.8:1 against that colour, below the 4.5:1 needed.
- When someone types their own amount in the donate box, the field turns navy as designed, and its text and £ sign now turn pale so they stay readable.
- The donate amount choices can be moved between with the arrow keys, as radio buttons should.
- The homepage "Give" button passes the chosen amount to the donate page.
- Payments use Stripe payment links, which cannot take a custom monthly amount. So "Or enter your own amount" is for one-off gifts only, and a monthly gift shows a short note in its place (on the homepage box and the donate page). A one-off amount typed here is typed again on Stripe's page, so a line under the amount says so.
- The donate page names Stripe as the payment provider (the earlier text named Zeffy and its optional tip).
- The cats age filter is reflected in the address (`/cats/?age=Kitten`) so a filtered list can be shared. There is no area filter: the cats page says instead that the charity can transport a cat anywhere for the right home (`text/cats.json`, `transport`). Old `?area=` links just show every cat.
- The contact and newsletter forms include a hidden spam trap field and the names Netlify Forms needs.
- Adoption and foster applications are not forms on this site. `/apply/` and `/foster/apply/` show the charity's own Pawlytics forms inside the page (they are Airtable forms that Pawlytics hosts), with a link to open each form on its own page. The Apply button on a cat's page opens `/apply/?cat=Name`, which shows a note with the cat's name above the form so the visitor knows to type it in. The form itself cannot be styled or pre-filled from here. Changing its questions is done by Pawlytics, not on this site.
- Because the forms are Pawlytics', the privacy policy must say so (see the draft outline on `/privacy/`).

- **News is now real stories.** `/news/` shows the newest story from `src/news/items/` as the lead and the rest as "Earlier news", each linking to its own page. The three placeholder "[News headline]" rows are gone. A story's page title, description and share link come from its own fields. The article text is markdown, and its first paragraph is shown larger.
- **Privacy and accessibility anchors** are built from the section titles (for example `#who-we-are`, which was `#who`). Nothing on the site links to them.
- **The lines about what each gift pays for** are now in `src/_data/text/giving.json` and reach the donate page and the homepage box through a small JSON block (`giving-text.njk`), so the editor can change them.

## Not included yet

- **Pawlytics sync, the last step.** The query and field mapping (`scripts/lib/mapping.mjs`), waiting on the Auth0 values and a login from Pawlytics. Everything around it is written and tested.
- **The editor's real sign-in.** The GitHub app and Netlify provider are set up by hand (`happy-paws-cms-setup.pdf`). Until then `/admin/` only works with the local test server.
- **Editing cats.** Cats are not in the editor. They come from Pawlytics.
