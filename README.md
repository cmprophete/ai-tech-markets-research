# AI Tracker: Research and Policy

A curated research database and synthesis on AI, automation, and the economy,
published as a single self-contained page (`index.html`) that is embedded as an
iframe on the Economic Security Project site.

Four views: **Papers**, **Fact Bank**, **Lab**, **Solutions**.

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

The research list is curated in a spreadsheet and generated into the site:

```sh
python3 tools/research.py build                 # content/research.csv -> data/tracker-data.js
python3 tools/research.py check                 # validate; write nothing
python3 tools/research.py build --sheet <url>   # pull a published Google Sheet first
```

See **[`content/README.md`](content/README.md)**. Themes, the policy lab and the
solutions agenda live in `data/tracker-data.js` and are hand-edited; the fact
bank is `data/fact-bank-data.js`. All `data/*.js` load at runtime, so a data
change needs only a reload, and a fresh clone renders from the committed files.

## Tests

```sh
node tests/interactions.js   # clicking and keyboard
node tests/routes.js         # snapshot of every route
```

## Layout

```
src/            build inputs: head, styles/, views/, js/, the template
content/        research.csv -- the curated source for the research list
data/           the published payloads (research, fact bank, themes, policies)
assets/         images loaded directly by the page
tools/          research.py (sheet -> data) and helper scripts
tests/          jsdom harness and route snapshot
docs/           GLOSSARY.md, ARCHITECTURE_OPTIONS.md, adr/, history/
notes/          working notes and backlogs, not part of the build
```
