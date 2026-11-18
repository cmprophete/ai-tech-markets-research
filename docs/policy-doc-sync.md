# Policy cards from Google Docs

The policy team writes each card in a Google Doc. `tools/policy_docs.py` reads that Doc
(as a Word export) and carries its text onto the site **verbatim**, or refuses and says
why. It never fixes, trims, reorders or "tidies" anything to make a Doc pass.

This replaces the hand placement described in [`policy-card-rules.md`](policy-card-rules.md)
for any card that has a Doc: the Doc is the one writer of that card's words, and
`data/policy-text.js` (generated) is where they land.

**Status (2026-11-18).** Live, run on request. The page loads `data/policy-text.js` ("The page change"), the
Google Sheet's **`policy map`** tab is the gate (it has the columns `card id` and `doc link`, and its
`general status` says which Docs are approved), and the first sync has run: the three approved Docs (Unemployment Insurance Reform, 32-Hour Standard
Workweek, Promoting Affordability) are the words of their cards. A blank line between paragraphs is read as the
paragraph break it already is (the owner's decision, 2026-11-18; the team's own Docs are typed that way). The sync does not run by itself yet: a person (or Claude, through the
Drive connector) exports each approved Doc and runs `build` in a scratch copy ("Running it"). The daily
Action and the service-account adapter that would fetch the Docs by itself are not built.

## The pieces

| File | Job |
|---|---|
| `tools/docx_reader.py` | reads a `.docx` as untrusted data, in memory, and lists everything it cannot carry |
| `tools/policy_docs.py` | the sections, the encoder, the strict decoders, the round-trip verifier, `check`, `verify`, `build`, `selftest` |
| `data/policy-text.js` | **generated** by `build`; the synced words of each card. Never hand-edited |
| `data/tracker-data.js` (`POLICY_DATA`) | still hand-kept: every other field of each card (see below) |
| `tests/test_policy_docs.py` | unit tests: the pilot, the CLI, the gate, random text through the encoder and back |
| `tests/fixtures/policy-docs/` | the pilot Doc's Word export, the card as it stood on the site, and what the page tests read |

## The Doc

One Google Doc per card, made with *File > Make a copy* from the `TEMPLATE: Policy card`
Doc (in the `Policy cards` folder, in the tracker folder of the Ideas shared drive). One
tab per Doc. The first line is the card's title; then the template's headings, **found by
their exact text, not by how they are styled** (the team styles headings in different ways):

| Heading (exact text) | Fills | Holds |
|---|---|---|
| *(first line)* | `title` | one line |
| `Policy` | `summary` | paragraphs and bullets |
| `Why This is Important in an AI-Driven Economy` | `rationale` | paragraphs and bullets |
| `ESP's Take` | | a group heading: nothing of its own under it |
| `Strengths` | `strengths` | bullets only, one string per bullet |
| `Risks` | `risks` | bullets only, one string per bullet |
| `Precedents & Examples` | | a group heading |
| `Where it stands` | `landscape` | paragraphs and bullets |
| `References` | `references` | paragraphs or bullets, one string per item (may be empty) |

The headings must appear once each, in this order. The apostrophe in `ESP's Take` may be
curly or straight, a typed `## ` in front of a heading is accepted, and extra spaces are
ignored; capitals and every other character must match. Bold on a heading line is heading
styling and is ignored (so is any other styling on it).

**What a Doc never touches.** The sync writes the seven fields above and two date fields
(see "The date line") and nothing else: every other field of a card stays as it is in
`data/tracker-data.js` (today `id`, `category`, `feasibility`, `pairsWith`, `competesWith`
and, until it is retired, `lastReviewed`, and whatever the card carries later; the tool names
none of them, so a field the owner retires or restructures cannot make it wrong). `check`
lists, for each card, what is left alone. A new card needs its other fields in `POLICY_DATA`
first; this sync updates existing cards.

## The date line: "Last updated"

A card that has a Doc shows **Last updated <date>**, the day its Doc was last modified, in
place of the hand-kept "Last reviewed" (the owner asked for this on 2026-11-17). The date can
only come from Drive: a Word export carries no document properties, so whoever fetches the Doc
passes it with the file:

* `--modified <time>` for each `--doc`, in the same order: Drive's `modifiedTime`, for example
  `2026-11-17T19:39:21.327Z`; or
* `<card id>.json` next to `<card id>.docx`, holding `{"modifiedTime": "..."}`. The Drive
  connector's `get_file_metadata` result will do (only that key is read), and the future
  Google Docs adapter writes the same two files. By hand, Drive's *Details*
  panel shows "Modified" in your own time: pass it with its offset, for example
  `--modified 2026-11-17T14:39:00-05:00` (an offset is converted; fractions of a second are
  dropped).

Written for each card: `docModified`, that instant in UTC (`2026-11-17T19:39:21Z`), and
`docUpdated`, its calendar day in **America/New_York** (`2026-11-17`): the owner's and the
readers' day, so a Doc saved at 9 pm on the 17th shows the 17th, not the 18th. The page reads
only `docUpdated`. The instant is kept so that a change of time zone (one constant,
`DISPLAY_TZ`) moves every day at the next `build` without fetching anything again.

The rules, all enforced and tested:

* `check` works without a time and says `build` needs one; `build` refuses a Doc with none,
  because the card shows the date.
* A time that is not a time, is before 2010, or is more than a day in the future is refused.
* The date describes the text on the page. A card that is not approved keeps its old text
  **and** its old date. A Doc whose time is older than the one already on the site for that
  card (a stale export), or the same time with different text (a mismatched or doctored
  export), is refused.
* It is Drive's modified time, so any change to the Doc moves it, a comment or a formatting
  tweak included, whether or not the words changed.
* A card with no Doc shows no date line, and nothing falls back to `lastReviewed` (decided by
  the owner on 2026-11-17: show no date). Only the pilot has a Doc today, so on the day this
  goes live 31 of the 32 cards lose the date line they show now; each gets one when its Doc is
  first synced.

## How a Doc joins its card, and the gate

By the **card id written in its row of the Sheet's `policy map` tab**, not by title:
the tab's titles do not all match the site's (5 of the site's 32 cards have no row, and 5 rows have no
card yet) and the Doc's title line is itself a synced field, so a title edit would break
a title join. The Doc's title line is synced
as `title`; if it differs from the site's, `check` shows both (a wrong Doc for a card shows up
there first).

Three columns are read, by header name (the header row is found under the roles block):

| Column | Accepted header names | Holds |
|---|---|---|
| card id | `card id`, `id`, `policy card id` | the `POLICY_DATA` id, for example `ui-reform` |
| Doc | `doc link`, `doc`, `google doc`, `doc url`, `doc id` | the Doc's link (or its file id) |
| status | `general status` (the tab's own), `site status`, `status`, `doc status`, `sync status` | `approved`, `under review` or `archived`; blank means under review |

Only `approved` rows sync (`archived`, a policy the team has retired, is recognised and skipped here; it is
`tools/policy_map.py`, below, that hides the card). A word that is not one of the three
stops the run and names the row, as the research Sheet's `status` does. The tab's other columns (including the
agenda ones: `included in ESP's agenda?`, `priority`) are not read. A row with no card id and no link is a planning
row and is ignored. A repeated card id, an approved row whose card id is not on the site, or an approved
row with no usable link stops the run.

*Approval is a status, not a snapshot.* If a Doc is edited after it was approved, the next
sync takes the edit. The rule that closes this: when you edit an approved Doc, set its
status back to `under review`. (A stricter option, pinning the approval to the text's hash,
is described under "Open decisions".)

## Running it

Get each approved Doc as a Word file, named `<card id>.docx`, into a folder of its own:

* by hand: open the Doc, *File > Download > Microsoft Word (.docx)*, save it as
  `ui-reform.docx`; or
* through the Drive connector: `download_file_content` with `exportMimeType`
  `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (each download
  needs the owner's OK; copy the file it saves to `<card id>.docx`), and `get_file_metadata`
  for the Doc's `modifiedTime` (save it as `<card id>.json` beside it, see "The date line"); or
* later: a second adapter reading the Google Docs API with a service account, so the Action
  can fetch the Docs itself. The tool only needs the file's bytes; nothing else changes.

A `.docx` is **untrusted data**: keep exports in a folder that holds nothing else, and run
Python with `-I` (the reader opens the file in memory, with size caps, refuses XML that
declares a DTD or an entity, and never follows a link or extracts anything).

```sh
# dry run on one Doc: says, field by field, what would change on the site; writes nothing
python3 -I tools/policy_docs.py check --doc exports/ui-reform.docx --card ui-reform --modified 2026-11-17T19:39:21.327Z
python3 -I tools/policy_docs.py check --doc exports/ui-reform.docx --card ui-reform --diff   # word-level diff too

# the same for every card the Sheet marks approved
python3 -I tools/policy_docs.py check --gate gate.csv --exports exports/     # gate.csv: the tab as CSV, or its published link

# only the round-trip proof
python3 -I tools/policy_docs.py verify --gate gate.csv --exports exports/

# write data/policy-text.js (scratch copies and the Action only; see below)
python3 -I tools/policy_docs.py build --gate gate.csv --exports exports/
python3 -I tools/policy_docs.py build --gate gate.csv --exports exports/ --keep-going   # a refused Doc is left out, the clean ones are written, the run still ends non-zero
python3 -I tools/policy_docs.py build --doc exports/ui-reform.docx --card ui-reform --modified 2026-11-17T19:39:21.327Z --out /tmp/scratch/policy-text.js

python3 tools/policy_docs.py selftest      # also run on every push (CI)
python3 -m unittest discover -s tests -p "test_*.py" -v
```

Exit codes: `0` everything read and verified; `1` a Doc is refused, verification failed, or
the run could not start (a missing export, a bad gate); `2` usage (no command) or `build` in
the wrong place.

### What `check` prints for the pilot card

```
== ui-reform  Unemployment Insurance Reform
   read: 31 paragraphs; 15 bullets; 13 links; 0 bold stretch(es) in the text
   the Doc follows the template; nothing was refused
   Doc last modified 2026-11-17T19:39:21Z; the card would say 'Last updated 2026-11-17' (that day in America/New_York)
   what the sync would change on the card (a field not listed stays as it is):
     title       unchanged
     summary     CHANGED    96% the same text. Doc: 1 paragraph + 3 bullets, 67 words; site: 64 words; ...
     rationale   CHANGED    83% the same text. ...
     strengths   same words Doc 3 items, site 3; 2 the same; 1 the same except quote marks
     risks       CHANGED    Doc 3 items, site 2; 2 the same except quote marks; 1 new
     landscape   CHANGED    83% the same text. ...
     references  NEW        3 items; the site has none
     docUpdated  NEW        the card would say "Last updated 2026-11-17" (it says "Last reviewed 2026-08-14" now)
   stays as it is on the site, not in the Doc: category, feasibility, pairsWith (2), lastReviewed
   citation markers on the site's card that the Doc's own links replace: 13 ({{cite}} 5, {{citep}} 8)
   links: 13 distinct; 12 already in the site's papers, 1 not
     NOT IN THE LIST: https://www.finance.senate.gov/...  (add it to the research Sheet if it should be a paper)
   verified: the rebuilt text equals the Doc's text (31 paragraphs, 13 links, 0 differences)
```

"The same text" is the similarity of the words a reader sees, with citation markers removed
and straight and curly quotes matched, so a percentage under 100 is a wording change, not
a typographic one. A `{{pol:...}}` cross-link on the site's card would be lost: `check`
warns when there is one.

## What is carried, and how (the whole list)

Only these transformations, and displayed text stays the same:

1. JS-string escaping: `\` becomes `\\`, `"` becomes `\"`; characters that cannot be seen
   (controls, non-breaking and other special spaces, zero-width characters, line separators)
   are written as `\uXXXX` so a reviewer can see them. Everything visible stays literal.
2. Literal `&`, `<`, `>` in the text become `&amp;`, `&lt;`, `&gt;`. (A title is plain
   text: it is stored as typed.)
3. Paragraphs are joined with `<br><br>`.
4. A run of bullets becomes `<ul><li>...</li></ul>`, sitting directly against the paragraphs
   around it (the list brings its own spacing, so no `<br><br>` next to it).
5. Bold becomes `<strong>`.
6. A hyperlink stays a real link: `<a href="..." target="_blank" rel="noopener noreferrer">`
   (the owner's decision: links are **not** turned into `{{cite}}` markers, so the text carries
   no markers).
7. Curly quotes, dashes, accents, emoji and every other character are kept as the characters
   they are. Older hand-placed cards store some of them as named entities (`&ldquo;`); the
   synced text holds the characters, which look the same, so verification compares **decoded**
   text, as step 4 of the card rules says.

Nothing else is done: no trimming (a space at the start or end is kept and reported), no
curly-to-straight, no whitespace squeezing, no reordering.

## What it refuses

`check` and `build` list every problem, in document order, saying where (section, item, the
first words) and how to fix it in the Doc. Nothing is repaired.

| Refused | How to fix it in the Doc |
|---|---|
| a heading that is missing, repeated, out of order, or an unknown styled heading or typed `##` line | use the template's headings exactly, once, in order |
| text before the first heading, or under a group heading | move it under one of the template's subheadings |
| a paragraph under Strengths or Risks, or a heading typed as a bullet | make each item a bullet; make the heading a heading |
| an empty section (except References) | add the text |
| a blank bullet inside a list | delete it, or write the text it should hold |
| italic, underline (a link's own is fine), strike-through, colours, fonts, sizes, highlights, superscript or subscript, small caps, hidden text, a character or paragraph style | *Format > Clear formatting* (or paste without formatting); only bold and links are carried |
| tables, images, drawings, text boxes, footnotes, equations, page or section breaks, fields, content controls and smart chips | replace with text or a link |
| pending suggestions (tracked changes) | accept or reject them first |
| a soft line break (Shift+Enter), a tab | a new paragraph (Enter); a space |
| numbered lists, nested bullets, checklists | one level of ordinary bullets |
| a link that is not `http` or `https` (`mailto:`, `javascript:`, a place inside the Doc), an empty link, a link with spaces in its address | a normal web address, or no link |
| text still containing `[Replace this` | write the card's own text |
| the double braces `{{` or `}}` | remove them (the page reads `{{cite:..}}` and `{{pol:..}}` as its own tokens) |
| control characters, text-direction control characters | delete them |
| `<`, `>` or an `&` that starts an entity in the **title** | plain characters (an `&` followed by a space is fine) |
| a card id that is not on the site | add the card's other fields to `POLICY_DATA` first |
| a modified time that is not a time, is before 2010 or is in the future | pass Drive's `modifiedTime` |
| a Doc modified earlier than the text already on the site, or at the same time with different text | download the Doc (and its modified time) again |
| a file that is not a readable `.docx`, is encrypted, unpacks to far more than it packs, declares a DTD, or is not UTF-8 | export it again |

Reported, not refused (`notes:` in `check`): blank lines between paragraphs (read as the paragraph breaks they are; nothing is
added for them, and blank lines at the very start or end of a section are ignored the same way), non-breaking spaces, other invisible characters,
a space at the start or end of a paragraph, two spaces in a row, a short all-bold paragraph
(kept as a bold paragraph, not taken for a heading), web addresses typed as text rather than
as links (kept as text, nothing is linked for the author), comments in the Doc (ignored),
text in a page header or footer (not synced), text alignment (dropped), a link into Google
Docs or Drive (readers of the site may not be able to open it), a link with tracking
parameters (kept as written), and every link whose address is not in the research list or
`POLICY_SOURCES` (so it can be added to the Sheet if it should be a paper).

## How it proves "verbatim"

The step that matters, run by `check`, `verify` and `build` (and `build` writes nothing unless
every Doc passes):

1. **The JS layer.** The file text is read back by its own strict decoder (`parse_policy_text`,
   which also joins surrogate pairs) and must equal the strings the encoder made; when `node`
   is installed, real JavaScript evaluates the file too and must agree.
2. **The HTML layer.** Each string is decoded again, strictly: only the markup the encoder
   writes is accepted (a `<em>`, a bare `<` or `&`, a `<br>` that is not half of `<br><br>`, a
   link with other attributes are all errors), and the paragraphs, bullets, bold, links and
   characters must equal the Doc's, item by item, with the first difference named.
3. **Nothing dropped.** Every non-empty paragraph of the Doc is accounted for as the title, a
   heading or content.
4. **A second read of the file.** A deliberately simple read of the `.docx` XML (every text
   run, in order) must agree with the structured reader paragraph by paragraph.

`selftest` deliberately breaks the encoder's output in 16 ways (a dropped character, an
unescaped ampersand, a lost `<strong>`, a changed link, a lost list, run-together paragraphs,
swapped bullets, a broken `js_string` ...) and requires the verifier to catch each one. And
`tests/interactions.js` (with the page change) opens the synced pilot card in the page's own
DOM and compares what the browser shows, paragraph by paragraph, with what the Doc says.

## `data/policy-text.js`

```js
const POLICY_TEXT = {
  "ui-reform": {
    title: "Unemployment Insurance Reform",
    summary: "Reform ... include:<ul><li>Expanding ...</li><li>...</li></ul>",
    rationale: "...<br><br>...<ul>...</ul>",
    strengths: [ "...", "..." ],
    risks: [ "...", "..." ],
    landscape: "...<br><br>...",
    references: [ "...", "..." ],
    docModified: "2026-11-17T19:39:21Z",
    docUpdated: "2026-11-17"
  }
};
```

* Cards are written in the site's card order; no Doc ids are written, and the only date is
  the Doc's own modified time, so the same Docs always give the same file (a run that changes
  nothing writes nothing).
* `build` starts from the cards already in the file and updates the cards whose Doc is
  approved. A card whose Doc is later unapproved, edited into a refusal or deleted **keeps
  the text it had**: unapproving never silently reverts the site to older hand-placed text.
* By default it is all or nothing: one refused Doc stops the whole `build`, writes nothing, and the
  site stays as it was. With `--keep-going` a refused Doc is left out instead (its card keeps the text it
  has), the clean Docs are written, and the run still ends non-zero so a person is told.
* `build` reports `first sync of:` the cards new to the file and `updated:` the others, so
  the Action can send a first sync to a pull request and commit updates directly.

### The one writer

`data/policy-text.js` has one writer, the sync. `build` is not run in the tree you commit
from: it refuses there (a `.git` next to the repo and no `GITHUB_ACTIONS`) unless given
`--out` outside the repo or `--allow-local-write`. Use a scratch copy, as for the research
tool: `rsync -a --exclude .git ./ /tmp/policy-scratch/`. `check` and `verify` write nothing
and are safe anywhere. If GitHub Desktop lists `data/policy-text.js` as changed when you did
not run the sync, do not commit it.

## The page change (applied 2026-11-18)

The page loads `data/policy-text.js`. The change is small, and it was applied on 2026-11-18 to the
merged tree (all 32 existing page tests plus its own passed) with the same re-runnable edit it was
built as (anchored replacements that stop if an anchor is missing, not a diff); the description below is
of what it does. It was built and tested on this branch (cut from `main`) and
on the committed tip of `retire-card-fields` (which includes `landscape-type-match`, and which
removed the Research basis, the "How it interacts" section, the press list and the `paperIds`
and `level` fields from the cards). On each, `python3 build.py --check` is ok,
`tests/routes.js` shows 22 routes unchanged and `tests/interactions.js` passes, with 26
assertions of its own. On this branch it touches 7 files (+224 -6, mostly the new tests and
the rebuilt `index.html`):

* `src/views/00-data-scripts.html`: the `<script src="data/policy-text.js">` tag.
* `src/js/00-state.js`: lays `POLICY_TEXT[id]` over the card with that id, right where
  `PAPER_SUMMARIES` is laid over research (an id that is not a card is ignored).
* `src/js/20-cite-export.js`:
  * a **References** section of its own after the card text and before the date line, built
    after the dialog's body so that no line of the body template changes;
  * the **date line**: "Last updated: <date>" from the card's `docUpdated` instead of "Last
    reviewed" from `lastReviewed`, in the dialog and in the footer of "Copy as draft" (a card
    with no Doc shows no date; the CSS class `pol-modal-lastreviewed` keeps its old name);
  * "Copy as draft" also keeps bullets as a list and links as Markdown links, decodes `&lt;`
    and `&gt;`, and lists the references under `### References` (not `## References`: the page
    tests forbid that list).
* `src/styles/modals.css` (appended): the look of a bullet list and of a real link in a card
  (the existing dotted link style), and the address after a link when printed.
* `data/policy-text.js`: the empty file `build` writes when no card is synced yet.
* `tests/interactions.js`: opens the synced pilot card in the page's own DOM and compares what
  the browser shows, paragraph by paragraph, with what the Doc says, and checks the date line
  (shown for the synced card, absent for a card with no Doc, in the dialog and in the draft);
  it names no card field but the nine the sync supplies (the seven and the two dates), so it
  holds whatever else a card carries.

Checked separately, by comparing every card's dialog and the Landscape map before and after in
the same DOM: all 32 dialogs are identical except that the "Last reviewed" line (shown on all
32 today) is gone, and the map is identical.

An optional second step deletes the now unread `lastReviewed` field from the 32 cards and its
row from the field table in `docs/policy-card-rules.md`. It proves with the repo's own parser
that every other field of every card is unchanged. It is a separate step because it is not
reversible except through git, and because the dates it deletes (24 cards 2026-06-23, 8 cards
2026-08-14) are the only trace of when the other 31 cards were last looked at.

The Research basis, the press list and `paperIds` are other branches' business: the change
neither needs them nor brings them back, and a card's only source list on the page is the
links in its own text plus the Doc's References.

## Archived cards: `data/policy-map.js`

A policy the team has retired is set to `archived` in the `general status` column of the `policy map` tab, and its card
leaves the Landscape. `tools/policy_map.py` reads the tab's `card id` and `general status` columns (nothing else: not the
agenda columns, not the drafting columns, not the notes) and writes `data/policy-map.js`, a generated file holding the ids of
the archived cards; the page takes those cards out of `POLICY_DATA` before anything reads it (`src/js/00-state.js`), so the map,
its counts, the Links graph and the dialogs leave them out. A card that pairs with an archived one just has no line to it, and
a `{{pol:}}` token that names one reads as plain text. Setting the status back brings the card back at the next run.

```sh
python3 tools/policy_map.py check                      # the committed file against the cards on the site; writes nothing
python3 tools/policy_map.py check --tab tab.csv        # the tab, and what a build would change
python3 tools/policy_map.py build --tab tab.csv        # write data/policy-map.js (a scratch copy only: one writer)
python3 tools/policy_map.py selftest
```

It stops, naming the row, on a status word that is not `under review`, `approved` or `archived`, a card id that is not a
card on the site (a typo would hide nothing and say nothing) and a card id that is in two rows. A row with no card id is a
policy with no card yet and is ignored.

The tab is read from a CSV file or link, but it should not be published to the web as it is: a published tab is readable by
anyone with its link, and this one holds the team's agenda columns and notes. So for now the run is made on request (the tab
read through the Sheets connector); the daily Action would need a tab that holds only `card id` and `general status`.

## Open decisions

* **The rules wording** (links, `<ul>` and bold, entities to characters, and the Doc as the one writer of
  a card that has one) is written into `CLAUDE.md`, `docs/policy-card-rules.md` and the writer table in
  `CONTRIBUTING.md` (the owner's OK, 2026-11-18). The page change is applied (above).
* **The date line.** *Decided (owner, 2026-11-17):* a card with no Doc shows no date, which
  removes the line from 31 of 32 cards the day this goes live; nothing falls back to "Last
  reviewed". *Still open:* deleting the now unread `lastReviewed` field for good (the optional
  second step above), and the time zone of the day: America/New_York, so a Doc saved at 9 pm
  on the 17th shows the 17th (UTC would show the 18th); it is one constant (`DISPLAY_TZ`).
* **The Sheet tab** has its columns now (`card id`, `doc link`, and the tab's own `general status`); the tool only
  reads it. Five site cards have no row in the tab and five rows have no card: a card with no row stays as it is.
* **One bad Doc blocks every card by default** (all or nothing). `--keep-going` is the per-card isolation
  (write the clean cards, keep the old text of the refused one, fail loudly); making it the default is a choice.
* **Blank lines between paragraphs** were refused until 2026-11-18, and two of the team's three approved Docs had
  them. *Decided (owner, 2026-11-18):* a blank paragraph between paragraphs is the paragraph break it already is, so
  the tool ignores it and notes it; a blank bullet inside a list is still refused.
* **Pin an approval to the text.** An optional `approved hash` column that must equal the
  `text hash` `check` could print would make "approved" mean "this exact text".
* **The Action.** A copy of `research-sync.yml`: a published CSV of the tab in a repository
  variable, a daily run and a button, the same `concurrency` lock, `build`, then a pull
  request for a card's first sync and a direct commit for later changes, and an issue when a
  run fails. It needs a way to fetch each Doc: the service-account adapter, or a person
  committing exports (not recommended: the exports are drafts).
* **What "IGNORE:" means** in the Work Plan Doc's tab titles, and which Doc is the master for
  the pilot card (the pilot Doc is a copy; the Work Plan Doc's section is unchanged).
* **Hand-typed Docs are untested.** The pilot Doc was built from HTML. Docs typed in Google
  Docs may export things the fixtures did not imagine; the reader names anything it does not
  recognise rather than skipping it, so the first real Doc will say what to add. Pending
  suggestions, smart chips and soft breaks are tested with synthetic files built from the
  Word format, not with real exports. A Doc with several tabs exports every tab and will be
  refused (duplicate headings): keep one tab per Doc.
