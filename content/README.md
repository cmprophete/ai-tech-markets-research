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

## Editing the Sheet

Work in the research tab of the Google Sheet, not in `research.csv`, which is only
the sync's snapshot. One row per study. These are the columns; go by the header
name, because the Sheet's columns are in a different order from the snapshot's:

| Column | What goes in it |
|---|---|
| `id` | A stable number. **Leave blank for a new study** — `build` assigns the next id and writes it back. Never renumber existing rows: policy cards reference studies by id. |
| `date` | Publication date, `YYYY-MM-DD`. |
| `added` | Intake date (when you added it), `YYYY-MM-DD`. **Leave blank for a new study** — `build` fills in today's date. |
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
`RESEARCH_DATA` from the `approved` rows only. New rows can leave `id` blank — the
script gives each a stable id by matching its source URL to the last snapshot, so
re-pulling never reshuffles ids.
Keep the `extra_json` column in the Sheet; a few featured studies store data there. The
published site never reads the Sheet — only this build step does.

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

## Scope

This pipeline owns only the **research list** (`RESEARCH_DATA`). Themes, the policy
lab, and the ESP agenda are still edited by hand in `data/tracker-data.js`.
