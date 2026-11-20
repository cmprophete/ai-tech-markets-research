# Policy Card Rules

The policy author writes finished policy copy and pastes it in; Claude places it
into the tracker without changing a word. These are the rules for that. The
enforced version lives in [`CLAUDE.md`](../CLAUDE.md); if the two ever drift,
CLAUDE.md wins.

A card that has a Google Doc is not placed by hand at all: the Doc is the author's
copy and `tools/policy_docs.py` carries it onto the site under the same rule. The
additions that route needs are marked below; the workflow is in
[`policy-doc-sync.md`](policy-doc-sync.md).

## The rule in one line

Policy-card prose is authored copy, not a draft. It goes in exactly as written,
em-dashes and all. Claude's only job is to place it and encode it for the file.

## Where a policy lives

- The `POLICY_DATA` array in [`data/tracker-data.js`](../data/tracker-data.js),
  hand-edited.
- For a card that has a Google Doc, its words (`title`, `summary`, `rationale`, `strengths`,
  `risks`, `landscape` and a `references` list) and the day the Doc was last modified
  (`docUpdated`, shown on the card as "Last updated") come from
  [`data/policy-text.js`](../data/policy-text.js), which `tools/policy_docs.py` generates from the
  Doc and the page lays over `POLICY_DATA`. Never hand-edited. Every other field of the card stays
  in `POLICY_DATA`, and the sync never touches it.
- It loads at runtime, so a change needs only a browser reload: no `build.py`,
  no rebuild. Editing only `data/tracker-data.js` does not touch `index.html`,
  so the pre-commit build guard does not fire.

## Two buckets: content vs encoding

Claude splits every paste into two buckets and treats them differently.

**Content, never touched.** The words and everything about them: wording,
spelling, grammar, punctuation (em-dashes, straight or curly quotes, commas),
capitalization, terminology, acronyms, numbers, sentence order, and which claims
appear. No copyediting, condensing, expanding, "improving," or house-style
normalizing. Nothing is added that the author did not write: no citations,
links, or emphasis.

**Encoding, mechanical only, displayed text unchanged.** The text has to become
a valid JavaScript string that renders as HTML, so Claude may:

- escape the JS string: `"` becomes `\"`, `\` becomes `\\`;
- escape literal HTML characters the author means as text: `&` to `&amp;`,
  `<` to `&lt;`, `>` to `&gt;` (rare in policy prose);
- write the author's paragraph breaks as `<br><br>`.

For text that comes from a Google Doc through `tools/policy_docs.py` the list also has
these, and nothing else:

- `>` to `&gt;` (with `&` and `<` above);
- the author's bullet lists as `<ul><li>...</li></ul>`, and bold as `<strong>`;
- the author's hyperlinks as real links,
  `<a href="..." target="_blank" rel="noopener noreferrer">` (the owner decided on
  2026-11-17 that they are **not** converted to `{{cite}}` markers);
- curly quotes, dashes and other typographic characters kept as the characters they are.
  Older cards store some of these as named entities (`&ldquo;`, `&mdash;`); the displayed
  text is the same, so the check below compares decoded text.

That is the entire list. If a change is not on it, Claude does not make it. (A blank line
between two paragraphs is not a change: it is the paragraph break the author typed, and it
becomes one `<br><br>` like any other; the owner decided this on 2026-11-18.)

## The fields

| Field | Type | Verbatim? |
|-------|------|-----------|
| `title` | string | yes |
| `summary` | HTML prose | yes (paragraphs as `<br><br>`) |
| `rationale` | HTML prose | yes |
| `precedent` | HTML prose | yes |
| `feasibility` | HTML prose | yes |
| `landscape` | HTML prose | yes |
| `strengths` | array of HTML prose | yes, one string per bullet |
| `risks` | array of HTML prose | yes, one string per bullet |
| `pairsWith` / `competesWith` | array of `{id, why}` | the `why` is prose, so verbatim |
| `id` | kebab-case string | structure; agree with the author |
| `category` | category id | structure |
| `lastReviewed` | `YYYY-MM-DD` | structure |

Prose fields are inserted verbatim. Structured fields are not prose: Claude asks
the author for them rather than guessing, and never invents a number.

A card no longer carries `paperIds`, `press` or `level` (retired 2026-11-17): it shows no research basis, no
press list and no level, and its sources are the links and citations in its own text.

Under its title a card's dialog names only its policy area (the Map row its `category` rolls up to), and "Copy as
draft" opens with the same Area line (changed 2026-11-17, from the level and the fine category).

Neither the dialog nor the draft lists `pairsWith` or `competesWith` either (the "How it interacts" section was
removed 2026-11-17). Both stay in the data: `pairsWith` draws the Links graph's solid lines and `competesWith` its dashed
ones (since 2026-11-19), and the Landscape's Compare view lists the policies each one links to, with the `why` as the reason it gives for a fight or a tag team. Their `why` is still the author's prose, so it stays verbatim, and it is
plain text: no markup, no `{{...}}` tokens, no entities (a test fails if one has them).

Which policies are featured is not a card field. It is the `featured` column of the Sheet's `policy map` tab, carried into `data/policy-map.js` by
`tools/policy_map.py` (docs/policy-doc-sync.md), and the Landscape's All view puts a Featured label on those policies' tiles. A card that carries a
`featured` field of its own is a second writer, and `tools/policy_map.py check` fails on it.

## Workflow (paste into chat)

1. **Paste.** The author pastes the policy. For exact fidelity, paste inside a
   code fence so whitespace, quotes, and dashes survive the chat round-trip.
   Label each field, or paste one field at a time.
2. **Place.** Claude puts each block into its field, applying only the
   mechanical encoding above. Claude does not add `{{cite:ID}}`, `{{citep:ID}}`,
   or `{{pol:id|text}}` tokens; those appear only if the author typed them.
3. **Fill structure.** Claude asks the author for `id`, `category`,
   and any `pairsWith` / `competesWith`, rather than inventing them.
4. **Verify.** Claude reconstructs the plain text from each field (undo the JS
   escaping, turn `<br><br>` back into paragraph breaks, decode entities, read
   `<ul><li>`, `<strong>` and links back into bullets, bold and links) and
   confirms it matches the pasted source character-for-character. Claude reports
   either "verbatim: all fields match" or the exact difference, and never
   silently resolves a mismatch.
5. **Preview.** Reload the page; the data loads at runtime. Confirm the file
   still parses (`node --check data/tracker-data.js`; in a sandbox without Node,
   evaluate it with `osascript -l JavaScript`).

## If something is ambiguous

Ask, do not guess. If it is unclear which field a block belongs to, whether a
line break starts a new paragraph, or whether a quote was meant as straight or
curly, Claude asks the author instead of deciding. A wrong guess is an edit.

## What Claude must never do here

- Rewrite, shorten, expand, summarize, or "tighten" the author's text.
- Fix spelling, grammar, or punctuation, or change straight and curly quotes.
- Expand or contract acronyms, or swap terminology for a house preference.
- Change, round, or reformat any number.
- Add a citation, link, cross-reference, or emphasis the author did not write.
- Apply the no-em-dash house rule to this text.
- Resolve a verbatim mismatch silently; always report it.
