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

**2. The research list has one writer: the daily sync from the Google Sheet.**
The Google Sheet is the master. The `research-sync.yml` Action pulls it every day
and is the only thing that writes `content/research.csv` and the `RESEARCH_DATA`
array in `data/tracker-data.js` (through `tools/research.py`), committing both to
`main`:

```sh
python3 tools/research.py check                 # validate the sheet, write nothing: safe anywhere
python3 tools/research.py build [--sheet <url>] # what the sync runs: only in a scratch copy of the repo
```

So **a branch never commits those two files.** Add, edit, approve and archive papers
in the Sheet, never in the repo: a row reaches the site only when its `status` is
`approved` (blank means under review; see `content/README.md`). Do not hand-edit `RESEARCH_DATA` or `content/research.csv`,
and do not run `build` in the working tree you commit from: a local build is a
second writer, and two writers changing the same rows is what made merging `main`
into a branch conflict in both files on 2026-11-16. If either file shows as changed
when you did not mean it, restore it before anyone commits (the CSV whole; in
`data/tracker-data.js` only the `RESEARCH_DATA` array, because the rest of that file
is hand-edited). If a merge conflicts in them, take `main`'s copy of the research
list and keep the branch's other edits. Policy-card wording has one writer too, the
policy author (the verbatim rule below). **The key cases and the enforcement actions work the same way:** the Sheet's `cases` and
`enforcement` tabs are the master, and the same daily sync (the second step of `research-sync.yml`, through `tools/actions.py`) is the only
writer of `content/cases.csv`, `content/enforcement.csv` and `data/legislation-actions.js`, so a branch never commits those three, a row
reaches the site only when its `status` is `approved`, and `python3 tools/actions.py check` (safe anywhere) fails on a hand edit. **A policy card that has a Google Doc has one writer too, the Doc:**
`tools/policy_docs.py` carries its text into `data/policy-text.js`, which is generated and never hand-edited (`check` is safe
anywhere; `build` only in a scratch copy or the sync Action; [`docs/policy-doc-sync.md`](docs/policy-doc-sync.md)). Which cards the `policy map`
tab has archived is `data/policy-map.js`, generated the same way by `tools/policy_map.py`. See
[`content/README.md`](content/README.md) and "One writer per file" in [`CONTRIBUTING.md`](CONTRIBUTING.md). The rest of `tracker-data.js`
(`POLICY_DATA`, `CATEGORIES`) and `data/fact-bank-data.js`
(with `data/fact-bank-context.js`) are still hand-maintained. Two more data files are generated and never hand-edited: `data/us-map.js` by
`tools/us_map.py`, and the Legislation tab's bills, `data/legislation-bills.js`, by `tools/legislation.py`: the federal bills from our own scan of GovInfo's
bill-status data (`tools/congress_fetch.py`, no key), and the state bills from an Open States search of the legislatures' own records
(`tools/openstates_fetch.py`; it needs a free key in `~/.openstates_key`, which never goes in the repo or in chat). For the states Open States has
no summary for (Illinois, New Jersey) each legislature's own summary is read from its site by `tools/state_summaries.py` into
`content/legislation-state-summaries.json`, which is likewise generated and never hand-edited. See
[`docs/legislation-sources.md`](docs/legislation-sources.md). Nothing is taken from NCSL, whose terms forbid copying its material without
permission, and no tracker's own descriptions are copied (a legislature's own summary of its own bill is public record, and is shown as it wrote it). All `data/*.js` load at runtime, so a data change
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
  literal `<`/`&`, and writing the author's paragraph breaks as `<br><br>`. Text
  that comes from a Google Doc through `tools/policy_docs.py` has three more: the
  author's bullet lists as `<ul><li>` and bold as `<strong>`; the author's hyperlinks
  as real links (`<a href="..." target="_blank" rel="noopener noreferrer">`, never
  converted to `{{cite}}` markers); and curly quotes and dashes kept as the characters
  they are where older cards store them as named entities (`&ldquo;`), so the check
  compares decoded text (`>` is escaped as `&gt;` too). After inserting, reconstruct the text and confirm it matches the source
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

- Routes are declared in `VIEWS` in `src/js/40-router.js`; a flat view's route is
  a row there and nothing else. `setView()` lives in `src/js/70-render.js`, and
  adding a tab also means its button in `src/views/10-header.html`, its area in
  `src/views/`, its show/hide rule in `src/styles/policy.css`, and the view lists
  in `setView()`. The Government action tab is a worked example of all of these: one
  nav tab with four sections (All, Cases, Enforcement, Legislation), each a view of its own switched in the toolbar. The four
  share one area, toolbar, chips, search and map (`60-legislation.html`, `60-legislation.js`,
  `legislation.css`; a control or a list that belongs to some of the sections carries
  `gov-leg-only`, `gov-lists-only` or `gov-all-only`, shown by `policy.css`), Enforcement and Cases share
  one list and script (`55-enforcement.js`), and the Agenda placeholder (`40-agenda.html`)
  is the smallest example.
- Ordering is significant and lives in `src/index.template.html`: CSS cascade
  order and JS execution order inside the app IIFE are just the order the
  `@@include@@` directives appear.
- Comments explain *why*, especially where a choice is load-bearing or where the
  obvious alternative is wrong. Several comments in this repo record a bug that
  the obvious arrangement caused; leave them there.
