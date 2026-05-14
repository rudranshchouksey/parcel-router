# AI Usage Documentation

This document provides full transparency on how AI tools were used during development of the Parcel Routing System, as required by the assignment brief.

***

## Tools Used

- **ChatGPT / Perplexity AI** — architecture reasoning, code generation, README drafting
- **GitHub Copilot** — inline autocomplete during implementation

***

## Part 1 — Zod Schema Generation

### Prompt Used

> "Generate a Zod schema for a parcel input object with weight (positive number, kg), value (non-negative number, euros), optional destinationCountry string, and optional recipient object with name and nested address fields."

### What AI Generated

```typescript
const ParcelSchema = z.object({
  weight: z.number().positive(),
  value: z.number().min(0),
  destinationCountry: z.string().optional(),
  recipient: z.object({
    name: z.string(),
    address: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
    }).optional(),
  }).optional(),
});
```

### What I Changed and Why

1. **Added upper bound validations** (`max(10000)` on weight, `max(10_000_000)` on value) — AI generated no upper bounds. Without them, a payload of `weight: 999999999` would pass validation and route correctly, which is a data quality and potential DoS vector.

2. **Added custom error messages** (`required_error`, descriptive messages) — AI used default Zod messages. Custom messages matter for non-technical operators who see validation errors in the UI.

3. **Added `postalCode` and `houseNumber`** to address — AI omitted fields present in the actual XML schema.

4. **Added `maxLength` constraints on string fields** — AI didn't add these. Without them, a 10MB string in `recipientName` would pass validation.

### What AI Got Wrong

The generated schema had no upper-bound constraints. In a real parcel routing system, a 999,999 kg parcel is clearly a data entry error, not a legitimate Heavy parcel. AI generates schemas that are technically correct but not defensively designed.

### How I Validated

- Wrote `tests/unit/parcelSchema.test.ts` manually covering valid inputs, boundary values, and invalid inputs
- Every test case written by hand — not AI generated

***

## Part 2 — XML Parser Scaffolding

### Prompt Used

> "Write a TypeScript function that parses an XML string in this format into an array of Parcel objects. The XML uses fast-xml-parser. Note the root element is Container, parcels are nested under parcels.Parcel, and the recipient field is misspelled as 'Receipient' in the schema."
> [Pasted the Container_68465468.xml structure]

### What AI Generated

A basic parser that extracted `Weight` and `Value` but:
- Assumed `parcels.Parcel` was always an array
- Did not handle the single-parcel edge case (fast-xml-parser returns an object, not array, for single items)
- Did not handle missing or NaN weight values
- Ignored the `Receipient` typo — it generated `Recipient` (corrected spelling) which would silently return `undefined` for all recipient names

### What I Changed and Why

1. **Single-parcel edge case** — Added `Array.isArray(rawParcels) ? rawParcels : [rawParcels].filter(Boolean)`. This is a well-known fast-xml-parser behaviour — AI wasn't aware of it.

2. **NaN guard on weight** — Added `isNaN(weight)` check with error collection. AI generated `parseFloat()` without handling the NaN case.

3. **Preserved the `Receipient` typo** — AI "helpfully" corrected the spelling. But correcting it would silently break all real data. The parser must match the upstream schema exactly, typos included.

4. **Error collection pattern** — AI returned early on first error. I changed it to collect all parse errors and return them alongside successfully parsed parcels. Operators need to know which parcels failed, not just that something failed.

### What AI Got Wrong

AI optimised for the happy path. It didn't consider: what happens with one parcel? What happens if weight is missing? What if the recipient field has a typo? These are real-world XML parsing concerns that require domain knowledge, not just code generation.

### How I Validated

- `tests/unit/xmlParser.test.ts` covers all these cases explicitly
- Ran the parser against the real `Container_68465468.xml` and verified all 17 parcels parse correctly with correct names and values
- Manually checked the `Receipient` typo is preserved in the parser

***

## Limitations of AI in This Context

| Limitation | Example |
|---|---|
| No domain context | AI didn't know the XML schema had a typo |
| Optimistic validation | Generated schemas with no upper bounds |
| No edge case awareness | Missed single-item array behaviour in fast-xml-parser |
| Can't reason about business risk | Didn't flag that "correcting" the typo would silently break production data |
| Generates plausible, not correct, code | The parser looked correct but had a silent data loss bug |

***

## What Was NOT AI-Assisted

- Rule Engine architecture and priority system design
- `defaultRules.ts` — rules written by hand to ensure reasoning is explicit
- All test cases — written manually to ensure I understood every assertion
- Database schema design — Prisma schema designed by hand
- Security decisions — headers, rate limiting strategy, validation constraints
- README architecture decisions and trade-off analysis

***

## Reflection

AI tools accelerated boilerplate generation (Zod schemas, XML parser structure) by roughly 40%. However, every piece of AI-generated code required meaningful review and modification before it was production-safe. The most dangerous AI output was the XML parser — it looked correct, compiled, and even worked on happy-path inputs, but had a silent data loss bug that only appeared when parsing a real single-parcel file.

The lesson: AI is a fast first draft, not a finished implementation. The value is in knowing what to ask, what to verify, and what to change.