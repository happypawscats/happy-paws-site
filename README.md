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

A ready-built copy is in the `_site` folder of the zip, but it must be served from a web address (it will not work by double-clicking `index.html`, because the pages use paths such as `/assets/site.css`).

## Where things are

| Folder or file | What it holds |
| --- | --- |
| `src/*.njk`, `src/<page>/index.njk` | One file per page. The text is plain HTML, so edit it directly. |
| `src/_includes/header.njk`, `footer.njk` | The header (with appeal bar and charity number) and the footer, shared by every page. |
| `src/_includes/base.njk` | The page shell: head tags, fonts, styles, scripts. |
| `src/_includes/apply-embed.njk` | The section that shows a Pawlytics application form. Used by `/apply/` and `/foster/apply/`. |
| `src/_data/site.json` | Settings: Stripe links, the Pawlytics application forms, the contact form address, social links, wish list link. |
| `src/_data/cats.json` | The cats (11 samples). See "Cats" below. |
| `src/cats/index.njk`, `src/cats/cat.njk` | The cats listing, and the template that makes one page per cat. |
| `src/assets/css/site.css` | Shared styles. Page-only styles are in `src/assets/css/pages/`. |
| `src/assets/js/` | `site.js` (menu, contact and newsletter forms), `cats.js` (filters), `giving.js` (donate amounts), `apply.js` (shows the cat's name on the adoption page). Plain JavaScript, no libraries. |
| `src/images/` | Photos and logo. File names say what each one shows. |
| `src/static/` | Copied to the site root as they are: `robots.txt`, favicons, and `_redirects` (old Wix addresses, Netlify only). |
| `eleventy.config.js` | Build settings and two small helpers. |
| `netlify.toml` | Only used if the site is hosted on Netlify. |

The pages were generated once from the design files, so from here on edit the `.njk` files directly.

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
| `area` | `Stockton`, `Birmingham` or `Banbury`: where the cat is being looked after. The area filter uses this. |
| `reserved` | `true` shows a "Reserved" tag on the listing |
| `good_with`, `health`, `donation` | The facts list on the cat's page |
| `story` | A list of paragraphs |
| `photos` | A list of `{ "src", "alt", "pos" }`. `src` is a file in `src/images/`, `pos` is the crop focus such as `50% 40%` |
| `bg` | Colour shown while the photo loads |

This is also the shape the Pawlytics sync should produce. Once the Pawlytics API details are known, a small script can write this file and rebuild the site. It should check Pawlytics a few times a day and rebuild only when a cat has changed, because on Netlify every rebuild uses hosting credits (see `features/hosting` in the project notes). Nothing else needs to change.

## Before launch

1. Replace the sample cats, either by hand or with the Pawlytics sync.
2. Replace the stock photos with the rescue's own, and update the alt text.
3. Fill in the text in square brackets on the pages (amounts, reply times, addresses, names, dates).
4. Fill in `src/_data/site.json` (above).
5. Replace the placeholder news tiles on `/news/`, and decide how new articles will be added.
6. Write the privacy policy and the accessibility statement. Both are outlines only and are marked as drafts on the page.
7. Test a payment through Stripe in test mode, then a small real gift (one-off and monthly).
8. Test the contact form end to end, including where the email arrives. Submit a test adoption and a test foster application on the live site and check they appear in Pawlytics.
9. Change `site.url` in `site.json` and the `Sitemap:` line in `src/static/robots.txt` if the address will not be www.happypawscatrescue.org.
10. Move the domain, then test the old Wix addresses (see "Old Wix addresses" below). The redirects are already in the project.

## What was checked

- Every page was compared with its design at desktop (1440 px) and phone (390 px) widths. Page heights match exactly, and under 0.2% of pixels differ (font smoothing), apart from the "More cats" row on a cat's page, which now follows the cats list.
- The menu, cat filters (including `/cats/?area=Stockton`), donate amounts and forms were exercised in a browser.
- An automated accessibility scan (axe-core, WCAG 2.2 AA rules) finds no violations on any page at either width. It cannot judge everything, so a manual check with a keyboard and a screen reader is still worth doing before launch.
- Every internal link and in-page anchor was followed and works.

Not done: testing on real phones, Safari or Firefox, or with a screen reader.

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
- The cats filters are reflected in the address (`/cats/?area=Stockton&age=Kitten`) so a filtered list can be shared.
- The contact and newsletter forms include a hidden spam trap field and the names Netlify Forms needs.
- Adoption and foster applications are not forms on this site. `/apply/` and `/foster/apply/` show the charity's own Pawlytics forms inside the page (they are Airtable forms that Pawlytics hosts), with a link to open each form on its own page. The Apply button on a cat's page opens `/apply/?cat=Name`, which shows a note with the cat's name above the form so the visitor knows to type it in. The form itself cannot be styled or pre-filled from here. Changing its questions is done by Pawlytics, not on this site.
- Because the forms are Pawlytics', the privacy policy must say so (see the draft outline on `/privacy/`).

## Not included yet

- **Editing for the charity.** No content editor is set up. Decap CMS was the leading idea, and would edit `cats.json`, the news and the page text. It can be added without changing the pages.
- **Pawlytics sync.** Waiting on the API details.
- **News articles as data.** `/news/` and the one article are written by hand for now.
