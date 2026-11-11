# Pawlytics sync

This copies the cats that are **Adoptable** or **Pending adoption** in Pawlytics onto the website. A volunteer changes a cat in Pawlytics, and within a few hours the site shows it. Nobody edits `src/_data/cats.json` by hand once this is switched on.

## Where it stands

| Part | State |
| --- | --- |
| Turning Pawlytics data into the site's `cats.json` (ages, Reserved, area, slugs, text) | Written and tested on made-up cats |
| Photos: download, resize, convert to WebP, tidy up old ones | Written and tested |
| Safety checks (never publish an empty list, never cut it by more than half) | Written and tested |
| Pawlytics sign-in (Auth0 password sign-in) | Written and tested against a pretend server. **Not tried against the real one.** |
| **The Pawlytics query and field names** (`scripts/lib/mapping.mjs`) | **Not written.** It needs the real schema, which needs the Auth0 values and a login from Pawlytics. |
| Scheduled run (`.github/workflows/sync-pawlytics.yml`) | Written, **schedule switched off** until the line above is done |

Until the query is written, `npm run sync` stops and says so. It never touches `cats.json` when it stops.

## What Pawlytics needs to send

1. The three Auth0 values: domain, audience and client ID.
2. A login (email and password) for the sync to use. A separate login for the website is better than using the client's own.
3. Ideally the API documentation. If not, `npm run sync:explore` reads the schema (the list of what can be asked for), and writes it to `pawlytics-schema.json` and `pawlytics-schema-summary.txt`. These files hold no cats and no people, and are not committed.

## Running it on your own computer

```
cp .env.example .env        # then fill in the five values
npm install --no-save sharp # photo conversion. Not part of the site's own build.
npm run sync:explore        # once, to read the schema
npm run sync -- --dry-run   # shows what would change, writes nothing
npm run sync                # does it
npm run test:sync           # the tests (no Pawlytics login needed)
```

Try it without Pawlytics, on made-up cats:

```
node scripts/sync-pawlytics.mjs --fixture scripts/fixtures/pets.sample.json \
  --area-file scripts/fixtures/areas.sample.json --dry-run
```

`.env` is ignored by git. Never commit it, and never paste the password into chat or an issue.

## Running it on GitHub

1. In the repository: Settings, Secrets and variables, Actions, **New repository secret**. Add `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, `AUTH0_CLIENT_ID`, `PAWLYTICS_USERNAME`, `PAWLYTICS_PASSWORD`, and `AREA_LOOKUP_JSON` if the area comes from a lookup (below).
2. Actions tab, **Sync cats from Pawlytics**, **Run workflow**. Tick "Check only" the first time.
3. When that looks right, run it again without the tick. It saves the changes, and Netlify rebuilds the site.
4. Switch the schedule on by removing the two `#` marks in `.github/workflows/sync-pawlytics.yml`.

Two things to know about scheduled runs on GitHub:

- If nothing is saved to the repository for 60 days, GitHub switches scheduled runs off on its own. A sync that finds no changes does not count. Open the Actions tab now and then, or press "Enable workflow" if it was stopped.
- A failed run emails the person who last changed the schedule line. If the Pawlytics password is changed, update the secret.

## What the site shows, and what it never shows

- Published: Adoptable cats, and Pending adoption cats as **Reserved**. Any other status, including In foster, is left out. The sync does not look at species, because Pawlytics calls some cats "Animal".
- A cat with no usable photo is not published (and is named in the report so a volunteer can add one).
- **Age band** comes from the date of birth: under 1 year is Kitten, over 10 years is Senior, otherwise Adult. With no date of birth the sync uses Pawlytics' stage (Baby or Kitten, Senior, otherwise Adult) and, if there is no age text either, the page says "Age not known".
- **Never published:** Pawlytics' Location field. It holds foster carers' names, and sometimes the adopting family. The sync reads it only to work out an area, and does not write it anywhere. The reports it prints name cats, never people.

## The area

The site shows Stockton, Birmingham or Banbury. Pawlytics does not hold that directly (see `features/client-answers` in the project notes), so the sync looks for it in this order:

1. An area on the cat itself, if Pawlytics offers a tag or custom field and the mapping uses it.
2. A private lookup from the foster carer's name to an area, in the `AREA_LOOKUP_JSON` secret: `{"Name of foster": "Stockton", "Another foster": "Banbury"}`. Names are matched ignoring capitals and extra spaces. Entries that do not name one of the three areas are ignored, with a note in the report.
3. Nothing. The cat shows without an area and still appears under "All".

Whoever adds a foster in Pawlytics must add them to the lookup too, which is why option 1 is better if the account can do it. It is an open decision.

## Safety checks

- If Pawlytics returns no publishable cats, nothing is written. Use `--allow-empty` if that is really what is wanted.
- If the new list is less than half the old one (when the old one had six or more), nothing is written. Use `--force` if that is really what is wanted.
- If the request, the sign-in or the schema fails, nothing is written and the run fails, so the last good list stays on the site.
- If a photo cannot be fetched, the cat is still published with its other photos, and the report names the cat.

## Files

| File | What it does |
| --- | --- |
| `sync-pawlytics.mjs` | The command. Fetches, runs the steps, prints a short report. |
| `pawlytics-explore.mjs` | Reads the schema only. |
| `lib/pawlytics.mjs` | Sign-in and the GraphQL call. Never prints a password or token. |
| `lib/mapping.mjs` | **The one file still to write:** the query and the change from Pawlytics' shape to the simple one in the comments. |
| `lib/transform.mjs` | Statuses, ages, text, area and addresses (slugs). Pure, no network. |
| `lib/sync.mjs` | Photos, safety checks and writing the files. |
| `fixtures/` | Made-up cats and fosters for the tests. |
| `test/` | `npm run test:sync` |

## When the real schema arrives

Open `lib/mapping.mjs`. Write `PETS_QUERY` and `fromApi()` so that each pet comes out in the shape described in its comments. Everything else already works from that shape. Then run `npm run sync -- --dry-run` against the real account and read the report: cats left out, areas not worked out, cats with no date of birth.
