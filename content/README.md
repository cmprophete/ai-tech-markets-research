# Curating the research database

The research shown on the site is curated in the **Google Sheet**, which is the
master. A GitHub Action (`.github/workflows/research-sync.yml`) pulls the Sheet
every day (about 13:00 UTC, or on demand from the Actions tab with "Run workflow")
and is the **only writer** of `research.csv` in this folder and of the
`RESEARCH_DATA` array in `data/tracker-data.js`: it saves a snapshot of the Sheet
here, rebuilds the array from it, and commits both to `main`.

So add, edit, approve and archive papers **in the Sheet**, never in this folder and
never on a branch. Do not edit `research.csv`, do not hand-edit `RESEARCH_DATA`, and do
not commit either from a branch: two writers changing the same rows is what
produces merge conflicts, and it did on 2026-11-16. If a merge ever conflicts in
them, take `main`'s copy. `data/tracker-data.js` is loaded by the page at runtime,
so once a sync has landed you just reload to see it.

The aim is to add new papers about once a month (the table in the [root README](../README.md)
says who does what, and how often, for every part of the site). The sync runs every day,
so whatever is set to `approved` reaches the site within a day.

The same Sheet has two more tabs, `cases` and `enforcement`, which feed the key cases and the enforcement
actions the same way: see "The cases and enforcement tabs" below.

## Editing the Sheet

Work in the research tab of the Google Sheet, not in `research.csv`, which is only
the sync's snapshot. One row per study. These are the columns; go by the header
name, because the Sheet's columns are in a different order from the snapshot's:

| Column | What goes in it |
|---|---|
| `id` | A stable number. **Leave blank for a new study**: `build` assigns the next id and writes it back. Never renumber existing rows: policy cards reference studies by id. |
| `date` | Publication date, `YYYY-MM-DD`. |
| `added` | Intake date (when you added it), `YYYY-MM-DD`. **Leave blank for a new study**: `build` fills in today's date. |
| `status` | Where the study stands: `under review`, `approved` or `archived`, picked from the dropdown. **Blank means under review.** Only `approved` studies reach the site (see "What the status does" below). |
| `foundational` | Blank, or the word `foundational` (dropdown): classic background reading. On an approved study it is published as `foundational: true`, for a later page feature; nothing on the site uses it yet. It is **not** the Fact Bank's `foundational` flag, which marks a source with more facts than the one-to-three cap allows and lives on the facts in `data/fact-bank-data.js`. |
| `note` | Free text: why a study is archived, or anything you want to remember. Shown nowhere on the site. |
| `category` | One of the category ids. Run `python3 tools/research.py check` to see the list if unsure. |
| `geography` | `us` or `intl`. |
| `evidence` | One of `analysis`, `commentary`, `industry`, `official`, `peer-reviewed`, or blank. |
| `title` | The study's title. |
| `source` | `Authors — Organization` (an em-dash between the two, e.g. `Jane Doe & John Roe — Brookings`). |
| `sourceUrl` | Link to the study. |
| `keyFinding` | One paragraph: the headline finding. |
| `takeaways` | The bullet points. **One per line inside the cell** (Alt+Enter in Excel, Ctrl+Enter / a line break in Google Sheets). At least one. |
| `extra_json` | Machine-managed. A few featured studies carry extra data (e.g. a `highlight`) here as JSON. The Marquee research band that displayed `highlight` was removed 2026-11-11, so it is kept but no longer shown. **Leave it alone** unless you know what it is. |

## What the status does

| `status` | Reaches the site? | What the sync checks |
|---|---|---|
| `under review`, or blank | No | Nothing. A bare link is fine: such a row is only counted and noted, never an error. |
| `approved` | **Yes** | Everything: a date, title, source, link, category, geography, key finding and at least one takeaway. A missing one stops the whole sync. |
| `archived` | No | Nothing. The row and its `id` are kept; say why in `note`. |

Any other word in `status` (or in `foundational`) stops the sync and names the row; the dropdown keeps typos out. A row pasted into the Sheet with no status is under review, so nothing reaches the site until someone sets it to `approved`.

**A paper that is not approved takes its Fact Bank facts with it.** A fact belongs to one paper, and the page drops the facts of any paper that is not published, so archiving a paper (or sending it back to under review) also removes its facts from the Fact Bank, and `check` counts them. The paper's summary, in `data/paper-summaries.js`, is never shown either. Setting the paper back to `approved` brings both back.

To **add** a study: add a row in the Sheet and leave `id` and `added` blank. Leave `status` blank (under review) while you fill the row in, and set it to `approved` when it is complete.
To **edit** one: change the cell.
To **retire** one without losing it: set `status` to `archived` and say why in `note` (e.g. `superseded 2026-08`). It disappears from the site at the next sync but stays in the Sheet, and its `id` is preserved. Set it back to `approved` to bring it back.
To **delete** one permanently: remove the row.

Each of these reaches the site at the next sync (the Actions tab can run it right away). There is nothing to run or commit.

**An approved row that is not complete stops the whole sync.** If any approved row lacks a required field, the sync refuses to write and the site stays at the last good sync, so finish a row before approving it. Nothing reads a link to fill the rest in. A link that is already in the tracker, even on an archived or under-review row, must not be added again: the new row takes the old row's id and fails the duplicate-id check, and the error says the two rows have the same link. Delete the repeat.

**Archive, don't delete, when you might want it back or a policy cites it.** Archiving is reversible and keeps the `id` reserved, so nothing gets reused or re-pointed. `check` notes every `{{cite}}` token and Fact Bank fact that points at a study which is not approved, and says whether that study is under review, archived or not in the Sheet at all.

## How the sync works

The Sheet is published as CSV (**File > Share > Publish to web**, pick the research
tab, choose **CSV**), and that link is the repository variable `RESEARCH_SHEET_URL`.
The one-time setup is listed in the header comment of
`.github/workflows/research-sync.yml`. Each run executes:

```sh
python3 tools/research.py build --sheet "<published-csv-link>"
```

That downloads the Sheet, saves a snapshot to `content/research.csv` (the committed
history, every row with its `status`, `foundational` and `note`), and rebuilds
`RESEARCH_DATA` from the `approved` rows only. New rows can leave `id` blank: the
script gives each a stable id by matching its source URL to the last snapshot, so
re-pulling never reshuffles ids.
Keep the `extra_json` column in the Sheet; a few featured studies store data there. The
published site never reads the Sheet; only this build step does.

## Commands

```sh
python3 tools/research.py check              # validate the sheet; writes nothing (safe anywhere)
python3 tools/research.py build              # regenerate the data file from research.csv
python3 tools/research.py build --sheet URL  # pull a published Google Sheet, snapshot it, rebuild (what the sync runs)
python3 tools/research.py export             # (rarely) re-seed research.csv FROM the data file
python3 tools/research.py selftest           # prove the round-trip is lossless and the status rules behave
```

`build` and `export` write `content/research.csv` or `data/tracker-data.js`, and only
the sync may commit those. To try them, use a scratch copy of the repo, never the
working tree you commit from.

`check` and `build` refuse to proceed if an approved row is missing a required field,
has a bad date or an unknown category, if a `status` or `foundational` word is not one
of the allowed ones, or if two rows share an id: they tell you which row (its number,
its id and its title or link).

## The cases and enforcement tabs

The same Sheet has two more tabs, **`enforcement`** (an agency or an attorney general acted) and **`cases`**
(a court decided, or is deciding). They feed the Enforcement and Cases sections of the Government action tab
the same way the research tab feeds Papers: the daily sync (`tools/actions.py`, the second step of
`.github/workflows/research-sync.yml`) is the **only writer** of `data/legislation-actions.js` and of their
snapshots `content/enforcement.csv` and `content/cases.csv`. Add, change, approve and archive rows **in the
Sheet**; never edit those three files, and never commit a local `build`. `python3 tools/actions.py check`
(which CI runs) fails if the data file is not what the snapshots build, so a hand edit is caught.

The two tabs have the same columns, read by header name (their order does not matter):

| Column | What goes in it |
|---|---|
| `status` | `under review`, `approved` or `archived`, from the dropdown. **Blank means under review.** Only `approved` rows are published, and only they are checked, so a row can be written over several days and nothing half-finished reaches the site. |
| `date` | The date of the action or the ruling, as on the source page. |
| `who acted` | The agency or attorney general, or the court: `Federal Trade Commission`, `Texas Attorney General`, `U.S. District Court, N.D. Cal.`. |
| `jurisdiction` | `Federal`, or the state (also DC and Puerto Rico) whose attorney general acted or whose court decided. It decides where the row is listed. |
| `matter` | What to call it, on one line: `FTC and Rite Aid`, `Mobley v. Workday`. |
| `description` | One or two sentences in our own words: what was alleged or decided, and what was required. |
| `outcome` | How it ended or stands: `Consent order`, `Lawsuit filed (pending)`. Optional. |
| `checked` | The date the outcome was last checked against the source. A case moves, so an outcome always says when it was looked at; it is needed whenever there is an outcome. |
| `source` | The agency's or the court's own page (http or https). |
| `topics` | Optional. The topics it bears on, as the labels of `LEGISLATION_TOPICS` (`data/legislation-data.js`), separated by **semicolons** because some labels have commas: `Consumer protection and disclosure; Privacy and data`. |
| `notes` | Free text, never shown on the site. |

The rules are strict (they came with the first batch, 2026-11-17): only the agency's or the court's own page
is a source, never a news story, a law firm's note or a tracker's write-up; every entry is checked against
that page before it is approved, and read by someone with legal training; the words are ours, and an
allegation is "alleged", never "found" (most actions are settlements without an admission, and a ruling is
only what that court held). Nothing here is legal advice, and the page says nothing like it. The `status`
column is how that read is enforced: leave a row under review until it has been read, then approve it.

To **add** a row: add it to the right tab and leave `status` blank while you write it; set it to `approved`
when it is complete and has been read. To **update** one (a case moves): change `outcome` and `checked`. To
**retire** one without losing it: set `status` to `archived` and say why in `notes`. Each of these reaches
the site at the next sync (the Actions tab can run it at once); there is nothing to run or commit. A row's id
is made by the tool from its matter and its year, and the page only needs it to be unique.

**An approved row that is incomplete stops the pull** (a missing source, a date that is not a date, a
jurisdiction that is not Federal or a state, an outcome with no `checked` date, a topic that is not one of
the page's): nothing is written, the lists stay as they were, and the run ends red with the row's number and
what is wrong. The research is still synced and committed, because the two steps are separate.

**How the sync reads the tabs.** Each tab is published as CSV (**File > Share > Publish to web**, pick the
tab, choose **CSV**), and the two links are the repository variables `CASES_SHEET_URL` and
`ENFORCEMENT_SHEET_URL` (the one-time setup is in the header comment of the workflow). Until both are set the
step prints a notice and leaves the lists as they are. A published tab is readable by anyone who has its
link, rows under review and `notes` included, as the research tab is. If a tab comes back with no rows at all
while the snapshot has some, the build refuses to write (a bad export is far likelier than a decision to take
every row off the site); `--allow-empty` overrides that.

```sh
python3 tools/actions.py check                                       # validate the snapshots and that the data file is what they build; writes nothing
python3 tools/actions.py check --cases <url> --enforcement <url>     # the same, on the tabs as the Sheet has them now
python3 tools/actions.py build --cases <url> --enforcement <url>     # what the sync runs (scratch copy only)
python3 tools/actions.py selftest                                    # the rules, on tiny in-memory sheets
```

## Scope

`tools/research.py` owns only the **research list** (`RESEARCH_DATA`), and `tools/actions.py` the cases and the
enforcement actions (above). Everything else is outside the Sheet:
the policy cards (`POLICY_DATA`) and the category list in `data/tracker-data.js`, the Fact Bank
(`data/fact-bank-data.js`), the paper summaries (`data/paper-summaries.js`) and the legislation data are
edited by hand or written by a tool of their own (the table in the [root README](../README.md) says which).
The summaries are kept out of the Sheet on purpose: the sync rebuilds `RESEARCH_DATA` from the Sheet, so
anything kept only in the repo's copy of a paper would be wiped at the next sync
([`docs/paper-summaries.md`](../docs/paper-summaries.md)).

## Also in this folder

`cases.csv` and `enforcement.csv` are the snapshots of the Sheet's two other tabs (above), written only by the sync.
`legislation-state-summaries.json` is not part of the research pipeline. It holds the legislatures' own
summaries for some state bills (Illinois, New Jersey and Maryland), read from their sites by
`tools/state_summaries.py`, and is never edited by hand; see
[`docs/legislation-sources.md`](../docs/legislation-sources.md).
