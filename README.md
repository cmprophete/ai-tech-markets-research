# AI Tracker: Research and Policy

A curated research database and synthesis on AI, automation, and the economy,
published as a single self-contained page (`index.html`) that is embedded as an
iframe on the Economic Security Project site.

An **About** page opens the site. Then five tabs in three groups:

- **Research:** **Fact Bank** (short, citable, number-bearing facts from the research) and **Papers** (the research list itself).
- **Policy:** **Agenda** (a placeholder for now) and **Landscape** (the policy map).
- **Government action:** one tab, labelled **Enforcement and Legislation**, with four sections switched under its masthead. **All**, where the tab opens, holds everything: the 2026 midterm results by state, the bills, the key cases and the enforcement actions, with a card for each state that holds all of it. **Cases** and **Enforcement** are the court rulings and the agency and attorney general actions about AI listed in `data/legislation-actions.js`. **Legislation** is the bills alone: a map of the states with a table of bills. Each of the three holds its own data alone, on a map shaded by it.

## Who updates what, and when

Every part of the site has its own source and its own rhythm. This table is the one place that says which is which, and what the person updating it actually does.

| category | tab | purpose | source | update schedule | notes |
|---|---|---|---|---|---|
| government action | cases | What have the courts said about AI? Key rulings and suits, each in our own words and linked to the court's own page. | hand selected by X, written by X | monthly | One row per case in `data/legislation-actions.js` (`kind: 'case'`; the row format and the rules are at the top of the file). Check the court's own page, write the row, have it read by someone with legal training before it goes live, reload. Each month, re-check the status of every listed case and move its `asOf` date. No build. |
| government action | enforcement | What has been enforced under the laws we already have? Actions by agencies and state attorneys general, each in our own words and linked to the agency's own page. | hand selected by X, written by X | monthly | The same file and the same steps as Cases (`kind: 'enforcement'`). An allegation is "alleged", never "found". |
| government action | legislation | What are Congress and the states putting on the table, and where does each bill stand? Active bills about AI, federal and state, on a map with a searchable table; the 2026 midterm results by state sit beside them on All. | Federal bills: our own search of GovInfo's bill-status data. State bills: our own search of Open States, with the legislature's own summary (read from the legislatures' sites for Illinois, New Jersey and Maryland). Midterm results: the Associated Press, copied by hand. Topics: our reading, by the rules in `data/legislation-data.js`. | weekly | A weekly job on the maintainer's Mac (Mondays, 7:30) refreshes the cache the build reads. After it, run `python3 tools/state_summaries.py` and `python3 tools/legislation.py build`, reload, and commit `data/legislation-bills.js` and `content/legislation-state-summaries.json`. The midterm results are typed in by hand from AP's pages. See [`docs/legislation-sources.md`](docs/legislation-sources.md). |
| research | fact bank | Which numbers can you cite? Short statements quoted word for word from the papers, each rated and each with a caveat on what it supports. | research hand selected by X, facts pulled by Claude Sonnet 5.5, reviewed by X | monthly | Facts are in `data/fact-bank-data.js` (the paragraph around each in `data/fact-bank-context.js`), one to three per paper, pulled with the `research-intake` and `fact-bank` skills in `skills/`. A fact belongs to one paper: when that paper is archived or under review in the Sheet, its facts leave the site with it. A new paper has no facts until the skill is run on it. |
| research | papers | What does the research show? The papers behind the facts, each with its key finding and takeaways and, where one has been written, a short summary. | research hand selected by X, summaries written by Claude Sonnet 5.5, reviewed by X | monthly | Add the paper in the Google Sheet and set its `status` to `approved`: the daily sync publishes it, with nothing to run or commit ([`content/README.md`](content/README.md)). Summaries are in `data/paper-summaries.js`, not in the Sheet, and each reads "Draft, not yet reviewed" until a person sets `reviewed` ([`docs/paper-summaries.md`](docs/paper-summaries.md)). |
| policy | agenda | What is our policy agenda? A placeholder ("Coming soon") for now. | written by X | quarterly | Nothing to update until there is an agenda. Then replace the note in `src/views/40-agenda.html` and the masthead in `TAB_DESCS.agenda` (`src/js/70-render.js`), and run `python3 build.py`. |
| policy | landscape | What could policy do about it? Policy interventions grouped into policy areas; each card gives the rationale, strengths and risks, and the bills and initiatives behind the idea. | written by X | quarterly | The cards are `POLICY_DATA` in `data/tracker-data.js`. The author's words go in exactly as written, and Claude only places them ([`docs/policy-card-rules.md`](docs/policy-card-rules.md)); set a card's `lastReviewed` when it has been reviewed. A data change needs only a reload. |

**X** is the person on the team who does that step; the table does not name anyone yet. Where Claude does a step, the table says so.

**What runs by itself:** the research sync (a GitHub Action, every day at about 13:00 UTC, publishes whatever is `approved` in the Sheet); the legislation refresh (a launchd job on the maintainer's Mac, Mondays at 7:30, fills the cache the build reads); and the **Checks** workflow (on every push, runs the build check and both test suites). **What does not:** building and committing the refreshed bills, the midterm results, the cases and enforcement actions, the facts, the summaries, the policy cards and the agenda.

## Setup (once per machine)

```sh
git config core.hooksPath .githooks   # build freshness + 2 MB size guard
npm install                           # installs jsdom (see package.json); only if you want to run the tests
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

See **[`content/README.md`](content/README.md)**. Everything else under `data/` is
hand-edited or written by a tool of its own, and all of `data/*.js` loads at runtime,
so a data change needs only a reload, and a fresh clone renders from the committed
files:

| File | What it holds | Written by |
|---|---|---|
| `data/tracker-data.js` | `RESEARCH_DATA` (the approved papers), `POLICY_DATA` (the policy cards), `CATEGORIES` and the lookup tables around them | the daily sync (`RESEARCH_DATA` only); by hand (the rest: a policy card's words are the author's, placed verbatim) |
| `data/fact-bank-data.js`, `data/fact-bank-context.js` | the facts, and the paragraph around each (loaded when a card is first opened) | the `fact-bank` skill (Claude), reviewed by a person |
| `data/paper-summaries.js` | the paper summaries | drafted by Claude, reviewed by a person |
| `data/legislation-data.js` | the stages, the 2026 midterm results, the filter topics | by hand |
| `data/legislation-actions.js` | the enforcement actions and key cases | by hand |
| `data/legislation-bills.js` | the bills | `tools/legislation.py`, never by hand: the federal bills from our own scan of GovInfo's bill-status data (`tools/congress_fetch.py`), the state bills from an Open States search (`tools/openstates_fetch.py`), and some summaries read from the legislatures' own sites (`tools/state_summaries.py`); see [`docs/legislation-sources.md`](docs/legislation-sources.md) |
| `data/us-map.js` | the state outlines | `tools/us_map.py` |

## Tests

```sh
node tests/interactions.js   # clicking and keyboard
node tests/routes.js         # snapshot of every route
npm test                     # both
```

The same two suites, the build-freshness check and the 2 MB size check run on every push
in GitHub Actions: the **Checks** workflow, `.github/workflows/ci.yml` (see
[`CONTRIBUTING.md`](CONTRIBUTING.md)).

## Layout

```
src/            build inputs: head, styles/, views/, js/, the template
content/        research.csv, the sync's snapshot of the research Sheet (never hand-edited);
                legislation-state-summaries.json (written by a tool); the research README
data/           the published payloads (research, policies, fact bank, paper summaries, legislation)
assets/         images loaded directly by the page
fonts/          the typefaces the page loads
tools/          research.py (Sheet -> data), the legislation fetchers and builder, us_map.py, and
                extract_phase1.py (the record of how the original page was split into src/; not re-run)
skills/         the two Claude skills: research-intake (add a paper, pull its facts) and fact-bank (the rubric)
tests/          jsdom harness, interaction tests, route snapshot
package.json    test tooling only (jsdom); the page itself has no dependencies
.github/        workflows: the daily research sync, and Checks on every push
.githooks/      the pre-commit guards (a stale index.html, a file over 2 MB)
docs/           GLOSSARY.md, ARCHITECTURE_OPTIONS.md, legislation-sources.md, paper-summaries.md,
                policy-card-rules.md, adr/, history/
notes/          working notes and backlogs (the Fact Bank's extraction queue among them), not part of the build
prototypes/     early design prototypes, not part of the build
monthly/, monthly data/   Quarto (R) drafts for a monthly jobs-data page, not part of the build or the site
CLAUDE.md       the rules Claude follows in this repo
CONTRIBUTING.md which file owns what
```
