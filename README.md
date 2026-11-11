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
| `src/_includes/pawlytics-widget.html`, `lib/listing.js`, `src/_data/listing.js`, `src/_data/catsListing.json` | Where the Pawlytics cat-list embed code goes, the one-word setting for which cat list `/cats/` shows, and the small checks on it (see "Which cat list `/cats/` shows" below). |
| `src/_includes/apply-embed.njk` | The section that shows a Pawlytics application form. Used by `/apply/` and `/foster/apply/`. |
| `src/_data/site.json` | Settings: Stripe links, the Pawlytics application forms, the contact form address, social links, wish list link. |
| `src/cats/items/*.json`, `lib/cats.js` | The cats the client types in at `/admin/` (one file each), and the loader that turns them into the site's cats. `src/_data/cats.json` holds the 11 sample cats the Pawlytics sync will replace. See "Cats" below. |
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

Every page's text lives in `src/_data/text/<page>.json` and is shown by the page through `{{ text.<page>.<section>.<field> }}`. The client changes it at `/admin/` (Decap CMS, signed in with GitHub); each save is a commit to `main`, which Netlify then builds. Cats are in the editor too, in their own "Cats" section (see "Cats" below).

- **A field holds a little markdown**: `[words](https://address)` for a link, `**bold**`, `*italic*`, `==words==` for the pink words in headings, and a new line for a line break. The template says what a link, bold or coloured word should look like (`{{ text.x | rich({a: {...}}) | safe }}`), so the editor cannot change the design.
- **Lists** (testimonials, questions and answers, steps, events) are real lists in the editor: add, remove and reorder. They loop in the template with `{% for it in text.x.list %}`. A group whose items differ in markup (for example one row has an extra link) is a fixed set of numbered fields instead.
- **News** is a folder of markdown files, `src/news/items/*.md`. The newest is the lead story on `/news/`. Each gets a page at `/news/<file name>/`. The story text is plain markdown, never run as template code.
- **Privacy and accessibility** are a list of titled sections written in markdown; the contents list builds itself.
- **Not editable**: words inside JavaScript (some form and filter messages), and anything that is not text (links, colours, layout, the number of items in a fixed group).

To add editable wording to a page: put the string in the page's JSON file, show it with `{{ text.<page>... }}` in the template, and add a field with the same name to `src/static/admin/config.yml`. `npm run test:cms` fails if the three disagree.

To try the editor on your own computer: `npm start` in one terminal, `npm run cms:local` in another, then open `http://localhost:8080/admin/` and choose Login. Edits then go to your local files, not to GitHub.

Setting it up for the charity (the GitHub sign-in and the editor's access) is in `features/content-management` in the project docs and in `happy-paws-cms-setup.pdf`. Photos the editor adds go to `src/images/` (cat photos to `src/images/cat-photos/`); there is no automatic resizing, so ask the client to keep them under about 1 MB.

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

There are three ways cats can get onto `/cats/`. Which one is used is one setting, described under "Which cat list `/cats/` shows" below. Whichever is used, each cat gets a tile on the list and its own page at `/cats/<slug>/` (except in Pawlytics mode, where Pawlytics draws the list).

### Cats typed in the editor (the default)

`/admin/` has a "Cats" section, first in the sidebar. The client adds a cat by filling in one form: name, age group (Kitten, Adult or Senior), age as written, sex, colour, a one-line tagline, the story, "good with", health and donation lines, the date listed (today by default), a "Reserved" switch, and one to six photos, each with a description for screen readers and a crop focus (top, middle or bottom). Each cat is saved as `src/cats/items/<slug>.json` and its photos go to `src/images/cat-photos/`. The file name is the address, so two cats with the same name need a distinguishing word. Deleting a cat in the editor deletes its file. It works with nothing from Pawlytics.

`lib/cats.js` turns each file into the shape the templates use (it checks the age group, fills any blank line with "Ask us", crops, sorts and skips a cat with no name or no usable photo, with a warning in the build output). Reserved cats go last, then newest first. Tested in `scripts/test/cats.test.mjs` (`npm run test:cats`), which also checks that every shipped cat file either loads or is a draft, and carries only fields the editor has.

**Drafts.** A cat with no photo chosen at all is a draft: it is left out of the site without a warning (the build log gives one line naming them), and the editor still lists it. `src/cats/items/` is handed over with 19 drafts made on 11 Nov 2026 from an export of Pawlytics' pet list: every pet that was Adoptable (13) or Pending adoption (6, so Reserved). Each has its name, the date it came in, and the sex and age group and age where Pawlytics held them; the rest (age or sex that Pawlytics did not have, the story and the photo) is empty, so the editor asks for it before the cat can be published. Ages were worked out on 11 Nov and do not update. Nothing from Pawlytics' Location column (carers' and adopters' names) was used. Two of them are named Millie, so their files are `millie.json` and `millie-2.json`. Until the first cat gets a photo, `/cats/` shows a friendly "No cats are listed here right now" message with the sign-up and contact links. The sample cats are not published in this mode.

The catch is double entry: the client would also keep Pawlytics up to date. Once the sync works, it replaces the typed list (below).

### Cats from the Pawlytics sync (not switched on yet)

The sample cats and the sync write to `src/_data/cats.json`. The eleven in there are samples, named "[Cat name]", with stock photos. Fields:

| Field | Meaning |
| --- | --- |
| `slug` | Used in the address, for example `sample-cat-1` |
| `name`, `sex`, `colour`, `tagline` | Shown on the listing and the cat's page |
| `age_band` | `Kitten`, `Adult` or `Senior`. The age filter uses this. |
| `age_text` | The age as written on the cat's page, such as "8 months" |
| `reserved` | `true` shows a "Reserved" tag on the listing |
| `good_with`, `health`, `donation` | The facts list on the cat's page |
| `story` | A list of paragraphs |
| `photos` | A list of `{ "src", "alt", "pos" }`. `src` is a file in `src/images/`, `pos` is the crop focus such as `50% 40%` |
| `bg` | Colour shown while the photo loads |

The sync is in `scripts/` (see `scripts/README.md`): it reads the cats from Pawlytics, writes `cats.json`, turns the photos into small WebP files in `src/images/cats/`, and saves only when something changed. The listing and cat pages need no change when it is switched on. Each save makes Netlify rebuild the site, which uses hosting credits (see `features/hosting` in the project notes), so the sync commits only real changes.

**State:** everything except the Pawlytics query is written and tested on made-up cats (`npm run test:sync`). The query needs the real schema, which needs the Auth0 values and a login from Pawlytics. The scheduled run in `.github/workflows/sync-pawlytics.yml` is switched off until then.

**When the sync goes live:** set the mode to `"sync"` (below), then take the "Cats" section and the "Which cat list is shown" setting out of `src/static/admin/config.yml` (the `cats` and `cats_list` collections) so nobody types cats that would be overwritten, and delete `src/cats/items/`.

Cats carry no area: the cats page has no area filter and the tiles and pages do not show where a cat is looked after (removed 11 Nov 2026).

### Which cat list `/cats/` shows

The word `mode` in `src/_data/catsListing.json` chooses. The client can change it at `/admin/` under "Which cat list is shown", which offers the first two:

- `"editor"` (the default): the cats typed in the Cats section. The age filter and a page for each cat work as in the designs.
- `"pawlytics"`: the listing widget Pawlytics provides, in place of the age filter and tiles. The code Pawlytics sent is in `src/_includes/pawlytics-widget.html`. The rest of the page stays (intro, the transport line, "Can't see the right cat?", "Adopting from Happy Paws"). No pages of our own are made for individual cats, and cats typed in the editor are not shown while this is chosen.
- `"sync"`: the cats the Pawlytics sync writes to `src/_data/cats.json`. Not offered in the editor. Set it by hand once the sync works.

If the mode is `"pawlytics"` and the embed file is empty, or refers to any address other than `api.pawlytics.com`, or the mode is not one of the three words, the build stops with a plain message and the live site stays as it was (`lib/listing.js`, tested in `scripts/test/listing.test.mjs`). A short note under the Pawlytics list, editable in the editor ("Note under the Pawlytics cat list"), says the list comes from Pawlytics. The privacy policy and accessibility statement drafts have lines in square brackets about the Pawlytics list: keep them only if that list is used, and remove them otherwise.

What to know about the widget, because Pawlytics draws it:

- **It showed only one cat on 11 Nov 2026 (Donut), although 13 of the 29 current pets are marked Adoptable** (checked against an export of the pet list). Donut is the only Adoptable pet with species set to Cat and a date of birth, so a missing birth date, species or photo is the likely cause. Not confirmed (see `features/pawlytics-account-findings` in the project notes).
- Only Pawlytics' age filter (Baby, Young, Adult, Senior), no pages of our own for each cat (so no shareable cat addresses), and its own buttons.
- Its "Apply to adopt" button opens the Airtable form directly rather than `/apply/`, and "Donate to our rescue" goes to `paypal.me/stocktoncatrescue` (checked 11 Nov 2026). That bypasses the Stripe links. Only Pawlytics can change these.
- Its look is set by Pawlytics. The code lets us set the border colour and corner roundness (`data-border`, `data-border-radius`); it is currently a lilac 4 px border with rounded corners, as supplied.
- The code carries a long token for Happy Paws' account. It is meant to sit in a public page, as it does here. If Pawlytics sends new code, paste it over the file.
- The widget's accessibility has not been tested.

## Before launch

1. Add the real cats: the client finishes the 19 pre-filled drafts and adds any others in the Cats section at `/admin/` (a photo and a story each), or (later) the Pawlytics sync fills `cats.json`. The sample cats in `cats.json` are not published unless the mode is `"sync"`. Before switching the sync on, add its secrets on GitHub, run it once with "Check only", then remove the `#` from the schedule.
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
- The menu, the cats age filter, donate amounts and forms were exercised in a browser. The Pawlytics list was opened on its own address in a browser (it showed one cat, with working Apply and Donate buttons). The page around it was checked with a stand-in at desktop and phone widths, because the test machine cannot reach Pawlytics, so the finished embedded look has not been seen on the site itself.
- The Cats section was tried in the real editor on a computer: finishing one of the pre-filled drafts (the editor named the age group and age it still needed, then saved her with a photo and the site listed her) and adding a cat with a photo upload saved `src/cats/items/<slug>.json` and the photo to `src/images/cat-photos/`, and the site then built the list, the "Reserved" tag and the cat's page, at desktop and phone widths. The list was also checked with no cats, one cat, three cats and the eleven samples (interaction tests and the accessibility scan: no failures).
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
- The cats age filter (on the editor and sync lists) is reflected in the address (`/cats/?age=Kitten`) so a filtered list can be shared. There is no area filter: the cats page says instead that the charity can transport a cat anywhere for the right home (`text/cats.json`, `transport`). Old `?area=` links just show every cat.
- The contact and newsletter forms include a hidden spam trap field and the names Netlify Forms needs.
- Adoption and foster applications are not forms on this site. `/apply/` and `/foster/apply/` show the charity's own Pawlytics forms inside the page (they are Airtable forms that Pawlytics hosts), with a link to open each form on its own page. The Apply button on a cat's page opens `/apply/?cat=Name`, which shows a note with the cat's name above the form so the visitor knows to type it in. The form itself cannot be styled or pre-filled from here. Changing its questions is done by Pawlytics, not on this site.
- Because the forms are Pawlytics', the privacy policy must say so (see the draft outline on `/privacy/`).

- **News is now real stories.** `/news/` shows the newest story from `src/news/items/` as the lead and the rest as "Earlier news", each linking to its own page. The three placeholder "[News headline]" rows are gone. A story's page title, description and share link come from its own fields. The article text is markdown, and its first paragraph is shown larger.
- **Privacy and accessibility anchors** are built from the section titles (for example `#who-we-are`, which was `#who`). Nothing on the site links to them.
- **The lines about what each gift pays for** are now in `src/_data/text/giving.json` and reach the donate page and the homepage box through a small JSON block (`giving-text.njk`), so the editor can change them.

## Not included yet

- **Pawlytics sync, the last step.** The query and field mapping (`scripts/lib/mapping.mjs`), waiting on the Auth0 values and a login from Pawlytics. Everything around it is written and tested.
- **The editor's real sign-in.** The GitHub app and Netlify provider are set up by hand (`happy-paws-cms-setup.pdf`). Until then `/admin/` only works with the local test server.
- **Cats are typed in twice until the sync works.** The Cats section needs nothing from Pawlytics, but the charity also keeps Pawlytics up to date.
- **The embedded Pawlytics cat list on the site itself.** Only matters if "Which cat list is shown" is set to the Pawlytics list. Check `/cats/` on the review site after switching: the list, its height on a phone, and the Apply and Donate buttons inside it.
