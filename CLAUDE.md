# Working in this repo

Repo-specific rules. The global `CLAUDE.md` still applies; this file covers what
is different here, because this repo is a JavaScript and HTML publishing system
with no build step beyond a small file concatenator.

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) first: it says which file owns what.

## The two boundaries that matter

**1. `index.html` is generated. Edit `src/`, then `python3 build.py`.** The page
is assembled from `src/index.template.html` and the files it `@@include@@`s
(`src/views/*.html`, `src/styles/*.css`, `src/js/*.js`). A pre-commit hook
rejects a stale page. If you find yourself editing `index.html`, stop and find
the `src/` file that owns it.

**2. The research list is generated from a sheet, not hand-edited.**
`RESEARCH_DATA` in `data/tracker-data.js` is built from `content/research.csv` by
`tools/research.py`:

```sh
python3 tools/research.py build                 # content/research.csv -> data/tracker-data.js
python3 tools/research.py build --sheet <url>   # pull a published Google Sheet first
python3 tools/research.py check                 # validate the sheet, write nothing
```

Do not hand-edit the `RESEARCH_DATA` array; the next build overwrites it. See
[`content/README.md`](content/README.md). The rest of `tracker-data.js`
(`THEMES`, `POLICY_DATA`, `AGENDA_DATA`, `CATEGORIES`) and `data/fact-bank-data.js`
are still hand-maintained. All `data/*.js` load at runtime, so a data change
needs only a reload, not a rebuild.

## Rules with teeth

- **No em-dashes in prose.** A style rule; use `&mdash;`/`&ndash;` HTML entities
  where a dash is genuinely needed in page copy. Exception: author-provided
  policy-card prose is inserted verbatim (see the next rule), so its em-dashes
  and every other character stay exactly as given.
- **Policy-card prose is verbatim. Never edit it.** When the policy author gives
  you text for a `POLICY_DATA` field in `data/tracker-data.js` (`title`,
  `summary`, `rationale`, `precedent`, `feasibility`, `landscape`, `strengths`,
  `risks`, and any `why` in `pairsWith`/`competesWith`), insert it exactly as
  given. Do not reword, shorten, expand, copyedit, fix spelling or grammar,
  restyle, reorder, expand acronyms, or normalize house style; add nothing (no
  citations, links, or emphasis) the author did not write; never change a
  number. The only changes allowed are mechanical encoding that leaves the
  displayed text identical: escaping for the JS string (`"`, `\`) and for any
  literal `<`/`&`, and writing the author's paragraph breaks as `<br><br>`.
  After inserting, reconstruct the text and confirm it matches the source
  character-for-character; report any difference instead of resolving it. If
  which field a block belongs to is unclear, ask. Full workflow: the Policy
  Card Rules, [`docs/policy-card-rules.md`](docs/policy-card-rules.md).
- **No CDN, no modules, no bundler.** Classic `<script>` tags, `file://` has to
  keep working, and the deploy artifact is one self-contained document because
  it is embedded in an iframe.
- **Never invent a number.** If data is missing, the page says so rather than
  showing an illustrative figure.

## Before saying something works

There is often no Node in the sandbox, so the tests may not run here; say so
rather than implying they passed. What can be checked, and should be, for
anything touching `src/js/` or view markup:

```sh
python3 build.py --check
node tests/interactions.js
node tests/routes.js
```

`node --check` on a file only proves it parses. It does not prove an identifier
resolves: a call to a function that no longer exists parses fine and throws at
load. Verify names resolve, and prefer running the page (`tests/dom.js`, or a
browser against a local server) over reasoning about whether it would work.

## Conventions worth matching

- Routes are declared in `VIEWS` in `src/js/40-router.js`; a flat view is a row
  there and nothing else. `setView()` lives in `src/js/70-render.js`.
- Ordering is significant and lives in `src/index.template.html`: CSS cascade
  order and JS execution order inside the app IIFE are just the order the
  `@@include@@` directives appear.
- Comments explain *why*, especially where a choice is load-bearing or where the
  obvious alternative is wrong. Several comments in this repo record a bug that
  the obvious arrangement caused; leave them there.
