# Policy Card Rules

The policy author writes finished policy copy and pastes it in; Claude places it
into the tracker without changing a word. These are the rules for that. The
enforced version lives in [`CLAUDE.md`](../CLAUDE.md); if the two ever drift,
CLAUDE.md wins.

## The rule in one line

Policy-card prose is authored copy, not a draft. It goes in exactly as written,
em-dashes and all. Claude's only job is to place it and encode it for the file.

## Where a policy lives

- The `POLICY_DATA` array in [`data/tracker-data.js`](../data/tracker-data.js),
  hand-edited.
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

That is the entire list. If a change is not on it, Claude does not make it.

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
| `level` | string | structure |
| `paperIds` | array of research ids | structure; never invented |
| `press` | array | structure |
| `lastReviewed` | `YYYY-MM-DD` | structure |

Prose fields are inserted verbatim. Structured fields are not prose: Claude asks
the author for them rather than guessing, and never invents a `paperId` or any
number.

## Workflow (paste into chat)

1. **Paste.** The author pastes the policy. For exact fidelity, paste inside a
   code fence so whitespace, quotes, and dashes survive the chat round-trip.
   Label each field, or paste one field at a time.
2. **Place.** Claude puts each block into its field, applying only the
   mechanical encoding above. Claude does not add `{{cite:ID}}`, `{{citep:ID}}`,
   or `{{pol:id|text}}` tokens; those appear only if the author typed them.
3. **Fill structure.** Claude asks the author for `id`, `category`, `level`,
   `paperIds`, and any `pairsWith` / `competesWith`, rather than inventing them.
4. **Verify.** Claude reconstructs the plain text from each field (undo the JS
   escaping, turn `<br><br>` back into paragraph breaks, decode entities) and
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
