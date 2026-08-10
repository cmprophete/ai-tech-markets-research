# Curating the research database

The research shown on the site lives in **`research.csv`** in this folder. Edit
the sheet, run one command, reload. That's the whole loop.

```sh
python3 tools/research.py build     # research.csv -> data/tracker-data.js
```

`data/tracker-data.js` is loaded by the page at runtime, so after `build` you
just reload to see changes. Commit and push to publish (GitHub Pages).

## Editing the sheet

Open `research.csv` in Excel, Numbers, or Google Sheets (or any text editor).
One row per study. Columns:

| Column | What goes in it |
|---|---|
| `id` | A stable number. **Leave blank for a new study** — `build` assigns the next id and writes it back. Never renumber existing rows: policy cards reference studies by id. |
| `date` | Publication date, `YYYY-MM-DD`. |
| `added` | Intake date (when you added it), `YYYY-MM-DD`. **Leave blank for a new study** — `build` fills in today's date. |
| `archived` | Leave blank to publish. Put a note or date here to **retire** a study: it stays in the sheet but drops off the site (see below). |
| `category` | One of the category ids. Run `python3 tools/research.py check` to see the list if unsure. |
| `geography` | `us` or `intl`. |
| `evidence` | One of `analysis`, `commentary`, `industry`, `official`, `peer-reviewed`, or blank. |
| `title` | The study's title. |
| `source` | `Authors — Organization` (an em-dash between the two, e.g. `Jane Doe & John Roe — Brookings`). |
| `sourceUrl` | Link to the study. |
| `keyFinding` | One paragraph: the headline finding. |
| `takeaways` | The bullet points. **One per line inside the cell** (Alt+Enter in Excel, Ctrl+Enter / a line break in Google Sheets). At least one. |
| `extra_json` | Machine-managed. A few featured studies carry extra data (e.g. a `highlight`) here as JSON. **Leave it alone** unless you know what it is. |

To **add** a study: add a row, fill everything except `id` and `added`, save, run `build`.
To **edit** one: change the cell, save, run `build`.
To **retire** one without losing it: put a note in its `archived` cell (e.g. `superseded 2026-08`), save, run `build`. It disappears from the site but stays in the sheet, and its `id` is preserved. Clear the cell to bring it back.
To **delete** one permanently: remove the row, save, run `build`.

**Archive, don't delete, when you might want it back or a policy cites it.** Archiving is reversible and keeps the `id` reserved, so nothing gets reused or re-pointed. `check` warns if a policy card references a study you've archived or deleted (`POLICY_DATA paperIds ... missing or archived`).

## Using Google Sheets

Prefer to curate in Google Sheets? Keep the master there and let the script pull it:

1. Import `research.csv` into a Google Sheet (**File > Import > Upload**).
2. Publish it as CSV: **File > Share > Publish to web**, pick the sheet, choose **CSV**, copy the link.
3. Whenever you want the site updated from the sheet:

```sh
python3 tools/research.py build --sheet "<published-csv-link>"
```

That downloads the sheet, saves a snapshot to `content/research.csv` (your committed
history), and rebuilds. New rows can leave `id` blank — the script gives each a stable
id by matching its source URL to the last snapshot, so re-pulling never reshuffles ids.
Keep the `extra_json` column in the sheet; a few featured studies store data there. The
published site never reads the sheet — only this build step does.

## Commands

```sh
python3 tools/research.py check              # validate the sheet; writes nothing
python3 tools/research.py build              # regenerate the data file from research.csv
python3 tools/research.py build --sheet URL  # pull a published Google Sheet, snapshot it, rebuild
python3 tools/research.py export             # (rarely) re-seed research.csv FROM the data file
python3 tools/research.py selftest           # prove the round-trip is lossless
```

`check` and `build` refuse to proceed if a row is missing a required field, has a
bad date, an unknown category, or a duplicate id — and they tell you which row.

## Scope

This pipeline owns only the **research list** (`RESEARCH_DATA`). Themes, the policy
lab, and the ESP agenda are still edited by hand in `data/tracker-data.js`.
