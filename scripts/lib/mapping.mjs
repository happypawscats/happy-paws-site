// THE ONLY PART THAT NEEDS THE REAL SCHEMA.
//
// Pawlytics gives no public list of its GraphQL queries and fields, so these two things are not filled
// in yet. Run `npm run sync:explore` once you have the login (see scripts/README.md), then:
//   1. write PETS_QUERY: a query that lists the pets with the fields below,
//   2. write fromApi(): turn the whole reply into a list of pets in the simple shape below.
// Everything else (age bands, Reserved, the area, photos, safety checks) is already built and tested.
//
// The simple shape every pet must be turned into:
//   {
//   Each pet:
//     id:           string   Pawlytics' own id for the pet
//     name:         string
//     status:       string   "Adoptable", "Pending adoption", "In foster", ...
//     sex:          string   "Female" / "Male"
//     colours:      string[] or string
//     dateOfBirth:  string   "2025-03-14", or null
//     stage:        string   Pawlytics' own age stage, only used when there is no date of birth (optional)
//     ageText:      string   the age as Pawlytics writes it, only used when there is no date of birth (optional)
//     adoptionFee:  number   in pounds, or null
//     description:  string   the story, plain text, blank line between paragraphs
//     goodWith:     { dogs, cats, children }   each true, false or null
//     health:       { altered, vaccinated, microchipped }   each true, false or null
//     area:         string   an area tag, if Pawlytics has one (optional): Stockton, Birmingham or Banbury
//     location:     string   the foster carer's name. PRIVATE. Used only to look up the area, never published
//     photos:       string[] or [{ url }]   in the order they should show
//     listedAt:     string   when the pet came in (optional), used to put newer cats first
//   }

export const PETS_QUERY = null;

export function fromApi(/* data */) {
  throw new Error('The Pawlytics query and field mapping are not written yet. See scripts/lib/mapping.mjs.');
}

export function petsFromResponse(data) {
  if (!PETS_QUERY) {
    throw new Error('The Pawlytics query is not written yet. Run `npm run sync:explore` first, then fill in scripts/lib/mapping.mjs.');
  }
  return fromApi(data);
}
