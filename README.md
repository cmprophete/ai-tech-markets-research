# AI Tracker: Research and Policy

A curated research database and synthesis on AI, automation, and the economy,
published as a single self-contained page (`index.html`) that is embedded as an
iframe on the Economic Security Project site.

An **About** page opens the site. Then five tabs in three groups:

- **Research:** **Fact Bank** (short, citable, number-bearing facts from the research) and **Papers** (the research list itself).
- **Policy:** **Brief** (an excerpt of Becky Chao's April 2026 brief: four pathways, their ideas and its sources) and **Landscape** (the policy map).
- **Government action:** one tab, labelled **Enforcement and Legislation**, with four sections switched under its masthead, in this order, and it opens on **Legislation**. **Legislation** is the bills alone: a map of the states, with **Federal** (a Capitol dome) and **States** (every state at once) buttons at its bottom right and the small-state buttons at its right edge, and a table of bills whose Status and Last action columns sort when their header is pressed (Status by progress, never alphabetically), that says which chamber passed a bill and when (both chambers, for a bill that passed both), and that an **Export to CSV** button saves in full (the key under the table's title, the count of bills at each stage, is pressable: it filters the table to that stage). The place pinned decides what the map shades: Federal shades nothing, since a federal bill or action is on no state; one state shades only that state; States, or nothing, shades every state by its own rows. The topic chips carry no counts. **Enforcement** and **Cases** are the agency and attorney general actions and the court rulings about AI, listed in the Google Sheet's `enforcement` and `cases` tabs (published as `data/legislation-actions.js`). **All**, last in the switch, holds everything: the bills, the key cases and the enforcement actions, with a card for each state that holds all of it, and an **Export to CSV** pill that saves all three kinds. Each of the other three holds its own data alone, on a map shaded by it.

## Who updates what, and when

Every part of the site has its own source and its own rhythm. This table is the one place that says which is which, and what the person updating it actually does.

| category | tab | purpose | source | update schedule | notes |
|---|---|---|---|---|---|
| government action | cases | What have the courts said about AI? Key rulings and suits, each in our own words and linked to the court's own page. | hand selected by X, written by X | monthly | One row per case in the Google Sheet's `cases` tab (the columns and the rules are in [`content/README.md`](content/README.md)). Check the court's own page, write the row, have it read by someone with legal training, then set its `status` to `approved`: the daily sync publishes it, with nothing to run or commit. Each month, re-check every listed case and update its `outcome` and `checked` date. |
| government action | enforcement | What has been enforced under the laws we already have? Actions by agencies and state attorneys general, each in our own words and linked to the agency's own page. | hand selected by X, written by X | monthly | The same steps as Cases, in the `enforcement` tab. An allegation is "alleged", never "found". |
| government action | legislation | What are Congress and the states putting on the table, and where does each bill stand? Active bills about AI, federal and state, on a map with a searchable table. | Federal bills: our own search of GovInfo's bill-status data. State bills: our own search of Open States, with the legislature's own summary (read from the legislatures' sites for Illinois, New Jersey and Maryland). Topics: our reading, by the rules in `data/legislation-data.js`. | weekly | A weekly job on the maintainer's Mac (Mondays, 7:30) refreshes the cache the build reads (it runs copies of `tools/openstates_fetch.py` and `tools/congress_fetch.py`: when either changes, copy it again, see [`docs/legislation-sources.md`](docs/legislation-sources.md)). After it, run `python3 tools/state_summaries.py` and `python3 tools/legislation.py build`, reload, and commit `data/legislation-bills.js` and `content/legislation-state-summaries.json`. See [`docs/legislation-sources.md`](docs/legislation-sources.md). |
| research | fact bank | Which numbers can you cite? Short statements quoted word for word from the papers, each rated and each with a caveat on what it supports. | research hand selected by X, facts pulled by Claude Sonnet 5.5, reviewed by X | monthly | Facts are in `data/fact-bank-data.js` (the paragraph around each in `data/fact-bank-context.js`), one to three per paper, pulled with the `research-intake` and `fact-bank` skills in `skills/`. A fact belongs to one paper: when that paper is archived or under review in the Sheet, its facts leave the site with it. A new paper has no facts until the skill is run on it. |
| research | papers | What does the research show? The papers behind the facts, each with its key finding and takeaways and, where one has been written, a short summary. | research hand selected by X, summaries written by Claude Sonnet 5.5, reviewed by X | monthly | Add the paper in the Google Sheet and set its `status` to `approved`: the daily sync publishes it, with nothing to run or commit ([`content/README.md`](content/README.md)). Summaries are in `data/paper-summaries.js`, not in the Sheet, and each reads "Draft, not yet reviewed" until a person sets `reviewed` ([`docs/paper-summaries.md`](docs/paper-summaries.md)). |
| policy | brief | How do we make sure AI benefits everyone? Becky Chao's April 2026 brief, *Ideas for Shared Economic Prosperity in the AI Transition*: four pathways and eight ideas, each idea opening to its text and each footnote number to its source, with a blurb that says the page is pulled from the brief and links the paper from the brief's title. Under each idea, the policy cards on the Landscape that cover the same ground. | the brief by Becky Chao, word for word; the Landscape pointers drafted by Claude Sonnet 5.5, to be reviewed by X | when the author revises the brief | Everything is in `data/agenda-data.js` (loads at runtime, so a reload is enough). A revision is read into that file exactly, nothing reworded, and the fingerprint in `tests/interactions.js` is updated with it ([`docs/agenda.md`](docs/agenda.md)); the first three introduction paragraphs and notes 1 to 11 are left out at the owner's request. The "On the Landscape" pointers are ours: edit the `related` lists. The `policy map` tab's agenda columns are still not read by anything. |
| policy | landscape | What could policy do about it? Policy interventions grouped into policy areas; each card gives the rationale, strengths and risks, and the bills and initiatives behind the idea. | written by X, in one Google Doc per card | quarterly | Each card is written in its own Google Doc (a copy of the template Doc in the Policy cards folder). On the Sheet's `policy map` tab, put the card's id and the Doc's link on its row and set `general status` to `approved`: `tools/policy_docs.py` carries the Doc's words into `data/policy-text.js`, exactly as written, and the card shows the Doc's last-modified date as "Last updated". A Doc that does not follow the template is refused, with the reason. The Docs are not fetched automatically yet, so ask Claude to run the sync ([`docs/policy-doc-sync.md`](docs/policy-doc-sync.md)). Every other field of a card stays in `POLICY_DATA` in `data/tracker-data.js`; a card with no synced Doc keeps its earlier text. Set `general status` to `archived` to hide a card from the Landscape (`tools/policy_map.py`, run with the same sync). The Landscape has three views, All, Links and Compare. A policy the `policy map` tab marks in its `featured` column carries a Featured label on its tile in All (`tools/policy_map.py` carries the column into `data/policy-map.js`, with the archived list, on the same sync run). Links draws a line between policies that pair with each other and a dashed line between rivals, and Compare sets two policies side by side under a fight graphic with samples of what works well with each and what competes with it (read from each card's `pairsWith` and `competesWith`, with the authors' reasons as written). |

**X** is the person on the team who does that step; the table does not name anyone yet. Where Claude does a step, the table says so.

**What runs by itself:** the Sheet sync (a GitHub Action, every day at about 13:00 UTC, publishes whatever is `approved` in the research, cases and enforcement tabs); the legislation refresh (a launchd job on the maintainer's Mac, Mondays at 7:30, fills the cache the build reads); and the **Checks** workflow (on every push, runs the build check and both test suites). **What does not:** building and committing the refreshed bills, the facts, the summaries, the policy cards (carried from their Docs when someone runs the sync) and the agenda, and the writing, reading and approving of every row in the Sheet.

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
| `data/tracker-data.js` | `RESEARCH_DATA` (the approved papers), `POLICY_DATA` (the policy cards), `CATEGORIES` and the lookup tables around them | the daily sync (`RESEARCH_DATA` only); by hand (the rest: every field of a policy card except the words a Google Doc supplies) |
| `data/policy-map.js` | which policy cards the Sheet's `policy map` tab has archived (the page leaves them out) and which it has featured (the page labels them) | `tools/policy_map.py`, from the tab; never by hand |
| `data/policy-text.js` | the words of each policy card that has a Google Doc (title, summary, rationale, strengths, risks, landscape, references, and the Doc's last-modified day), laid over `POLICY_DATA` by the page | `tools/policy_docs.py`, from the Docs and the Sheet's `policy map` tab; never by hand |
| `data/fact-bank-data.js`, `data/fact-bank-context.js` | the facts, and the paragraph around each (loaded when a card is first opened) | the `fact-bank` skill (Claude), reviewed by a person |
| `data/paper-summaries.js` | the paper summaries | drafted by Claude, reviewed by a person |
| `data/legislation-data.js` | the stages (and their order of progress), the filter topics | by hand |
| `data/legislation-actions.js`, `content/cases.csv`, `content/enforcement.csv` | the enforcement actions and key cases, and the snapshots of the two Sheet tabs they come from | the daily sync, from the Sheet's `cases` and `enforcement` tabs (`tools/actions.py`); never by hand |
| `data/legislation-bills.js` | the bills | `tools/legislation.py`, never by hand: the federal bills from our own scan of GovInfo's bill-status data (`tools/congress_fetch.py`), the state bills from an Open States search (`tools/openstates_fetch.py`), and some summaries read from the legislatures' own sites (`tools/state_summaries.py`); see [`docs/legislation-sources.md`](docs/legislation-sources.md) |
| `data/us-map.js` | the state outlines | `tools/us_map.py` |

## Tests

```sh
node tests/interactions.js   # clicking and keyboard
node tests/routes.js         # snapshot of every route
npm test                     # both

python3 tools/actions.py selftest                              # the cases and enforcement rules
python3 tools/policy_docs.py selftest                          # the policy Doc tool: nasty fixtures, every refusal, deliberate breakages
python3 tools/policy_map.py selftest                           # the archived and featured cards tool
python3 -m unittest discover -s tests -p "test_*.py"           # its unit tests (standard library only)
```

The same two suites, the build-freshness check and the 2 MB size check run on every push
in GitHub Actions: the **Checks** workflow, `.github/workflows/ci.yml` (see
[`CONTRIBUTING.md`](CONTRIBUTING.md)).

## Layout

```
src/            build inputs: head, styles/, views/, js/, the template
content/        research.csv, cases.csv and enforcement.csv, the sync's snapshots of the Sheet's tabs (never hand-edited);
                legislation-state-summaries.json (written by a tool); the research README
data/           the published payloads (research, policies, fact bank, paper summaries, legislation)
assets/         images loaded directly by the page
fonts/          the typefaces the page loads
tools/          research.py and actions.py (Sheet -> data), policy_docs.py and docx_reader.py (policy Docs -> data/policy-text.js), policy_map.py (archived and featured cards -> data/policy-map.js),
                the legislation fetchers and builder, us_map.py, and
                extract_phase1.py (the record of how the original page was split into src/; not re-run)
skills/         the two Claude skills: research-intake (add a paper, pull its facts) and fact-bank (the rubric)
tests/          jsdom harness, interaction tests, route snapshot, and the policy Doc tool's Python tests and fixtures
package.json    test tooling only (jsdom); the page itself has no dependencies
.github/        workflows: the daily research sync, and Checks on every push
.githooks/      the pre-commit guards (a stale index.html, a file over 2 MB)
docs/           GLOSSARY.md, ARCHITECTURE_OPTIONS.md, legislation-sources.md, paper-summaries.md,
                policy-card-rules.md, policy-doc-sync.md, adr/, history/
notes/          working notes and backlogs (the Fact Bank's extraction queue among them), not part of the build
prototypes/     early design prototypes, not part of the build
monthly/, monthly data/   Quarto (R) drafts for a monthly jobs-data page, not part of the build or the site
CLAUDE.md       the rules Claude follows in this repo
CONTRIBUTING.md which file owns what
```
