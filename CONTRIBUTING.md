# Where to edit what

`index.html` is a **generated file**. Do not edit it. It is committed because
GitHub Pages serves it and the WordPress embed loads it as one self-contained
document, but the source is in `src/`.

```sh
git config core.hooksPath .githooks   # once per machine: enables both guards
python3 build.py                      # src/ -> index.html
python3 build.py --check              # verify without writing; exit 1 on drift
```

## The things you might want to change

Who updates each part of the site, and how often, is in the table in [`README.md`](README.md); this one says where.

| I want to change | Edit | Then |
|---|---|---|
| **a research entry (add, edit, approve, archive)** | the **Google Sheet**, never the repo: the daily sync copies it into `content/research.csv` and `RESEARCH_DATA` (see [`content/README.md`](content/README.md)); a row is published only when its `status` is `approved` | nothing: the next sync, about 13:00 UTC (or "Run workflow" in the Actions tab), publishes it |
| **the words of a policy card that has a Google Doc** | the **Doc**, never the repo: `tools/policy_docs.py` carries it into `data/policy-text.js` (generated; see [`docs/policy-doc-sync.md`](docs/policy-doc-sync.md)), for the cards the Sheet's `policy map` tab marks `approved` | the next sync: for now ask Claude to run it (the Docs are not fetched automatically yet), then reload |
| **hiding a policy card, or bringing it back** | the **Sheet**'s `policy map` tab, never the repo: set the policy's `general status` to `archived` (or back). `tools/policy_map.py` carries it into `data/policy-map.js` (generated), and the page leaves an archived card out | the next sync run: ask Claude (the tab is not published, so nothing reads it by itself), then reload |
| **featuring a policy** | the **Sheet**'s `policy map` tab, never the repo: write `featured` in the policy's `featured` column (blank to stop). `tools/policy_map.py` carries it into `data/policy-map.js` (generated), and the All view puts a Featured label on the policy's tile | the next sync run: ask Claude (the tab is not published, so nothing reads it by itself), then reload |
| **any other field of a policy card, or a card with no Doc** | `POLICY_DATA` in `data/tracker-data.js` (by hand; the author's words go in verbatim, see [`docs/policy-card-rules.md`](docs/policy-card-rules.md)) | reload; no build step |
| **the Brief tab (called Agenda until 2026-11-19; its files still say agenda): the brief's words, the link to the paper, or the cards each idea points to** | `data/agenda-data.js` (by hand, but the brief's words exactly as published and never reworded: a test pins their fingerprint; the `related` lists are ours; rules in [`docs/agenda.md`](docs/agenda.md)) | reload; no build step |
| **how the Brief tab looks or behaves** | `src/js/35-agenda.js`, `src/styles/agenda.css`, `src/views/40-agenda.html`, and `TAB_DESCS.agenda` in `src/js/70-render.js` | `python3 build.py` |
| **a fact (Fact Bank)** | `data/fact-bank-data.js`, through the `research-intake` and `fact-bank` skills in `skills/` (a fact belongs to one paper; the paragraph around it is in `data/fact-bank-context.js`) | reload; no build step |
| **a stage of a bill (its label, whether it counts as active, its rank in the Status order)** | `data/legislation-data.js` (by hand; the row format is at the top of the file; the 2026 midterm results that used to be in it were removed on 2026-11-23) | reload; no build step |
| **an enforcement action or a key case (for the Enforcement and Cases sections of Government action)** | the **Google Sheet**'s `enforcement` or `cases` tab, never the repo: the daily sync copies them into `content/enforcement.csv`, `content/cases.csv` and `data/legislation-actions.js` (see [`content/README.md`](content/README.md)); a row is published only when its `status` is `approved` | nothing: the next sync publishes it (or "Run workflow" in the Actions tab) |
| **a topic in the Legislation filter (its name, or the words that find it)** | `LEGISLATION_TOPICS` in `data/legislation-data.js` (by hand; how a bill gets a topic is in the comment above it, and in [`docs/legislation-sources.md`](docs/legislation-sources.md)) | reload; no build step |
| **the bills (Legislation tab)** | `python3 tools/openstates_fetch.py` and `python3 tools/congress_fetch.py`, then `python3 tools/legislation.py build`, writes `data/legislation-bills.js` (each bill that passed one chamber or both carries which chambers and when, from its source's actions; a state bill whose veto stands is left out, as a failed bill is: `os_veto_stands`); see [`docs/legislation-sources.md`](docs/legislation-sources.md). The weekly job runs COPIES of the two fetch tools: copy them again after changing either | reload; no build step |
| **the order of the Status column (Introduced, In committee, Passed one chamber, Passed both chambers, Enacted)** | `rank` in each entry of `LEGISLATION_STAGES` in `data/legislation-data.js` (the one place; the Status menu and the stats bar read it too) | reload; no build step |
| **a state bill's summary where Open States has none (Illinois, New Jersey)** | `python3 tools/state_summaries.py` reads each legislature's own summary into `content/legislation-state-summaries.json` (by the tool, never by hand), then `python3 tools/legislation.py build`; see [`docs/legislation-sources.md`](docs/legislation-sources.md) | reload; no build step |
| **the state outlines (Legislation map)** | `python3 tools/us_map.py --topojson <us-atlas states-albers-10m.json>` writes `data/us-map.js` | reload; no build step |
| **a paper's summary** | `data/paper-summaries.js` (drafted by Claude, reviewed by a person; rules in [`docs/paper-summaries.md`](docs/paper-summaries.md)) | reload; no build step |
| **prose or markup** | `src/views/<view>.html` | `python3 build.py` |
| **styling** | `src/styles/<area>.css` | `python3 build.py` |
| **app behaviour** | `src/js/<area>.js` | `python3 build.py` |

`data/*.js` load at runtime, so a data change needs only a reload, not a
rebuild. **Do not hand-edit the `RESEARCH_DATA` array** in `data/tracker-data.js`,
or `content/research.csv`: the daily sync writes both from the Google Sheet (see
"One writer per file" below and [`content/README.md`](content/README.md)). `POLICY_DATA` and `CATEGORIES`
in that file are hand-maintained, and so are `data/fact-bank-data.js`,
`data/fact-bank-context.js`, `data/paper-summaries.js` and `data/legislation-data.js` (`data/us-map.js`, `data/legislation-bills.js`, `data/legislation-actions.js`, `data/policy-text.js` and `data/policy-map.js`, by contrast, are generated, by `tools/us_map.py`, `tools/legislation.py`, `tools/actions.py`, `tools/policy_docs.py` and `tools/policy_map.py`; `data/legislation-actions.js` is written by the daily sync only, `data/policy-text.js` by the policy Doc sync only and `data/policy-map.js` by the policy map sync only).

## One writer per file

Some files have exactly one thing that is allowed to change them, and everyone
else only reads them. The reason is Git: it combines changes made in different
places without trouble, and gets stuck only when two writers change the same
lines in two copies. That is how merging `main` into a branch conflicted in both
research files on 2026-11-16: the daily sync and the branch had each rewritten
the same paper rows.

| What | Its one writer | For everyone else |
|---|---|---|
| `content/research.csv` and the `RESEARCH_DATA` array in `data/tracker-data.js` | the daily sync from the Google Sheet (`.github/workflows/research-sync.yml`), which commits to `main` | change papers in the Sheet. Never commit these two from a branch. If they conflict in a merge, take `main`'s copy of the research list |
| `content/cases.csv`, `content/enforcement.csv` and `data/legislation-actions.js` | the daily sync from the Sheet's `cases` and `enforcement` tabs (the second step of `.github/workflows/research-sync.yml`, `tools/actions.py`), which commits to `main` | change rows in the Sheet. Never commit these three from a branch. If they conflict in a merge, take `main`'s copy of all three |
| the wording of a policy card | the policy author. For a card with a Google Doc, the Doc, carried into `data/policy-text.js` by `tools/policy_docs.py` (generated: never edited by hand; run `build` only in a scratch copy and commit its output as it came). For a card without one, Claude places their text in `POLICY_DATA`, verbatim ([`docs/policy-card-rules.md`](docs/policy-card-rules.md)) | do not reword it |

To try `tools/research.py` without becoming a second writer, run `check` (it
writes nothing) or run `build` in a scratch copy of the repo (for example
`rsync -a --exclude .git ./ /tmp/research-scratch/`), never in the working tree
you commit from. If GitHub Desktop lists `content/research.csv`, `content/cases.csv`, `content/enforcement.csv` or `data/legislation-actions.js` as changed, or
lists `data/tracker-data.js` with thousands of changed lines when you only edited
a policy card, do not commit it. The other generated files follow the same idea:
edit the source and rerun the tool (`index.html` from `src/`, the Legislation
bills and map from their tools).

## src/ layout

`src/index.template.html` is the whole document skeleton plus one directive per
block:

```
@@include src/styles/tokens.css@@
```

alone on a line, replaced by that file's exact bytes at build time. That is the
entire format. No variables, no conditionals, no bundler, no npm.

**Order is significant and lives in the template**, not in `build.py`. CSS
cascade order and JS execution order inside the app IIFE are both just the order
the directives appear. Moving a directive changes behaviour; moving a *file* does
not.

```
src/head.html                meta, JSON-LD, analytics
src/styles/tokens.css        @font-face, :root, type scale, masthead, chevron
src/styles/shell.css         header band, tab groups
src/styles/cards.css         app layout, the Papers list, card grid
src/styles/filterbar.css     the search-and-filters bar (Papers and Fact Bank)
src/styles/pager.css         the pager under the Papers and Fact Bank lists and the Legislation bills table
src/styles/modals.css        sources modal, policy pop-out
src/styles/policy.css        policy map, columns, and the per-view show/hide rules
src/styles/legislation.css   the Government action tab: toolbar, map, tables, cards
src/styles/agenda.css        the Brief tab (view key agenda): idea rows, source drawers
src/styles/focus.css         :focus-visible, global
src/views/00-data-scripts    the data/*.js <script> tags
src/views/10-header          site header nav
src/views/20-shell           <main>, tab description, #viewPanel
src/views/30-fact-bank       ... 50-about, 60-legislation, 80-papers, 90-modals
src/js/00-state              data wiring, helpers, state
src/js/05-lazy               lazy payload loader (Fact Bank)
src/js/10-policy-map         ... 20-cite-export, 30-policy-compare, 30-policy-links, 32-policy-draft, 35-agenda, 40-router, 55-enforcement,
                                 60-legislation, 70-render, 80-fact-bank
```

The router is split: `src/js/40-router.js` owns hash mapping and the `VIEWS`
table, and `setView()` lives in `70-render.js`.

## Tests

```sh
npm install                             # once: installs jsdom, pinned in package.json
node tests/interactions.js              # clicking and keyboard
node tests/routes.js                    # every route (snapshot)
node tests/routes.js --write            # re-record after an intended change
```

`tests/dom.js` loads the built page into jsdom with every local `<script src>`
inlined in place, so the scripts execute in browser order without touching the
network.

`tests/routes.js` is a snapshot: for each route it pins the body classes, which
nav button is current, the announce text, and the address bar. A refactor that
changes none of that is provably safe. Adding or removing a view legitimately
moves the snapshot: read the diff, then re-record with `--write`; do not
re-record to clear a red run.

`tests/interactions.js` covers what a snapshot cannot: that buttons respond. The
view nav is one delegated listener reading `data-view` attributes, and a typo
there would leave every route green and every button dead.

The Python tools have checks of their own, standard library only, no `npm`:

```sh
python3 tools/research.py selftest                             # the research rules
python3 tools/actions.py selftest                              # the cases and enforcement rules
python3 tools/policy_docs.py selftest                          # the policy Doc tool: nasty fixtures, every refusal, deliberate breakages
python3 tools/policy_map.py selftest                           # the archived and featured cards tool
python3 -m unittest discover -s tests -p "test_*.py" -v       # the policy Doc tool's unit tests (the pilot Doc, the CLI, the gate, random text round-trips) and the bills' passage and veto rules (tests/test_legislation.py: which chambers passed a bill, in what order, and when; which vetoes end a bill)
python3 tests/test_policy_docs.py --write-fixtures             # only when a test says the page fixtures are stale
```

Neither of the jsdom suites runs in the pre-commit hook, but both run on every push in GitHub Actions
(see "Checks on every push" below). Run them before pushing anything that touches
`src/js/` or the view markup, so the push does not go red. jsdom is pinned to one
version in `package.json`: bump it on purpose, and re-run both suites when you do.

## Two guards

`.githooks/pre-commit` refuses a commit that:

1. stages an `index.html` differing from a fresh build of `src/`
   (`SKIP_BUILD_GUARD=1` to override), or
2. stages any blob over 2 MB (`SKIP_SIZE_GUARD=1` to override).

If guard 1 trips, you almost certainly edited `index.html` instead of `src/`;
move the change into `src/` before rebuilding, because rebuilding discards it.

## Checks on every push

`.github/workflows/ci.yml` (the **Checks** workflow) runs on every push to a branch:
the same two guards (a fresh build of `index.html`, no file over 2 MB),
`tools/research.py check` and `selftest`, `tools/actions.py check` and `selftest` (which also fails when `data/legislation-actions.js` was edited by hand), the policy Doc tool's `selftest` and its Python tests (`tests/test_policy_docs.py`), `tools/policy_map.py check` and `selftest`, a syntax check of the Python files, and
both jsdom suites. It does not need the hook, so it still protects a machine that
never ran `git config core.hooksPath .githooks`. When a run goes red, the name of
the failing step says what broke.

- Commit `index.html` in the same push as the `src/` change it was built from, or
  the push shows a red "Page matches src/" step until the next one.
- It does not check the nightly research sync's own commit: GitHub starts no other
  workflow for a push made with the built-in token. The sync validates the Sheet
  itself before it writes anything.
- To make a red check block a merge, add a branch protection rule that requires
  the `checks` job (a repository setting: Settings > Branches).
