# AI Tracker: Research and Policy

A curated research database and synthesis on AI, automation, and the economy,
published as a single self-contained page (`index.html`) that is embedded as an
iframe on the Economic Security Project site.

Six tabs in three groups, plus an **About** page that opens the site: Research (**Fact Bank** and **Papers**), Policy (**Agenda**, a placeholder for now, and **Landscape**, the policy map) and Government action (**Enforcement**, a placeholder for enforcement actions and key cases; and **Legislation**, a map of the states with a table of bills and one of the 2026 midterm results).

## Setup (once per machine)

```sh
git config core.hooksPath .githooks   # build freshness + 2 MB size guard
npm install jsdom                     # only if you want to run the tests
```

## Build

`index.html` is **generated**. Edit `src/`.

```sh
python3 build.py            # src/ -> index.html
python3 build.py --check    # verify without writing
```

Which file owns what, and how the `@@include@@` format works:
**[`CONTRIBUTING.md`](CONTRIBUTING.md)**.

## Data

The research list is curated in a Google Sheet, and a daily GitHub Action is its
only writer into the repo: it saves a snapshot to `content/research.csv` and
regenerates the `RESEARCH_DATA` array in `data/tracker-data.js` from the rows whose
`status` is `approved`. Change papers in the Sheet, and do not edit or commit those
two from a branch (the one-writer rule, in [`CONTRIBUTING.md`](CONTRIBUTING.md)):

```sh
python3 tools/research.py check                 # validate; write nothing (safe anywhere)
python3 tools/research.py build                 # content/research.csv -> data/tracker-data.js (scratch copy only)
python3 tools/research.py build --sheet <url>   # what the sync runs (scratch copy only)
```

See **[`content/README.md`](content/README.md)**. Themes and the policy map live
in `data/tracker-data.js` and are hand-edited; the fact bank is `data/fact-bank-data.js`; the Legislation tabs' stages, midterm results and filter topics are `data/legislation-data.js` (its enforcement actions and key cases, by hand, `data/legislation-actions.js`), its state outlines are generated into `data/us-map.js` by `tools/us_map.py`, and its bills into `data/legislation-bills.js` by `tools/legislation.py` (the federal bills from our own scan of GovInfo's bill-status data, fetched by `tools/congress_fetch.py`, the state bills from an Open States search, fetched by `tools/openstates_fetch.py`; see `docs/legislation-sources.md`). All
`data/*.js` load at runtime, so a data change needs only a reload, and a fresh
clone renders from the committed files.

## Tests

```sh
node tests/interactions.js   # clicking and keyboard
node tests/routes.js         # snapshot of every route
```

## Layout

```
src/            build inputs: head, styles/, views/, js/, the template
content/        research.csv -- the sync's snapshot of the research Sheet (never hand-edited)
data/           the published payloads (research, fact bank, themes, policies)
assets/         images loaded directly by the page
tools/          research.py (sheet -> data) and helper scripts
tests/          jsdom harness and route snapshot
docs/           GLOSSARY.md, ARCHITECTURE_OPTIONS.md, adr/, history/
notes/          working notes and backlogs, not part of the build
```
