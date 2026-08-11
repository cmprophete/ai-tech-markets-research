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

| I want to change | Edit | Then |
|---|---|---|
| **a research entry** | `content/research.csv` | `python3 tools/research.py build` |
| **a theme / policy / the agenda** | `data/tracker-data.js` (by hand) | reload; no build step |
| **prose or markup** | `src/views/<view>.html` | `python3 build.py` |
| **styling** | `src/styles/<area>.css` | `python3 build.py` |
| **app behaviour** | `src/js/<area>.js` | `python3 build.py` |

`data/*.js` load at runtime, so a data change needs only a reload, not a
rebuild. **Do not hand-edit the `RESEARCH_DATA` array** in `data/tracker-data.js`
— it is generated from `content/research.csv`; see
[`content/README.md`](content/README.md). `THEMES`, `POLICY_DATA`, `AGENDA_DATA`
and `CATEGORIES` in that file, and `data/fact-bank-data.js`, are hand-maintained.

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
src/styles/cards.css         app layout, sidebar, filters, card grid, themes
src/styles/modals.css        sources modal, policy pop-out
src/styles/policy.css        policy map, columns, and the per-view show/hide rules
src/styles/focus.css         :focus-visible, global
src/views/00-data-scripts    the data/*.js <script> tags
src/views/10-header          site header nav
src/views/20-shell           <main>, sidebar, tab description, #viewPanel
src/views/30-fact-bank       ... 40-solutions, 50-about, 80-papers, 90-modals
src/js/00-state              data wiring, helpers, state
src/js/05-lazy               lazy payload loader (Fact Bank)
src/js/10-policy-map         ... 20-cite-export, 30-changelog, 40-router,
                                 60-whats-new, 70-render, 80-fact-bank
```

The router is split: `src/js/40-router.js` owns hash mapping and the `VIEWS`
table, and `setView()` lives in `70-render.js`.

## Tests

```sh
npm install jsdom                       # once
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
moves the snapshot — read the diff, then re-record with `--write`; do not
re-record to clear a red run.

`tests/interactions.js` covers what a snapshot cannot: that buttons respond. The
view nav is one delegated listener reading `data-view` attributes, and a typo
there would leave every route green and every button dead.

Neither runs in the pre-commit hook. Run them before pushing anything that
touches `src/js/` or the view markup.

## Two guards

`.githooks/pre-commit` refuses a commit that:

1. stages an `index.html` differing from a fresh build of `src/`
   (`SKIP_BUILD_GUARD=1` to override), or
2. stages any blob over 2 MB (`SKIP_SIZE_GUARD=1` to override).

If guard 1 trips, you almost certainly edited `index.html` instead of `src/`;
move the change into `src/` before rebuilding, because rebuilding discards it.
