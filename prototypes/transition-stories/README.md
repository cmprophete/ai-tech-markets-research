# How the transition takes shape

A second, slower set of three editorial prototypes. The first set remains in
`prototypes/transition/`. This version appears separately on the Prototypes
shelf and runs directly from `index.html` without a build step or server.

## Design decision

One argument, one full-width visual, and one Continue button at a time. No
opening dashboard, side-by-side control/result panels, or sliders. Interaction
arrives after a reader has encountered the mechanism. Back is available at
every later beat. Native chapter links retain local reading position and choices;
reload starts each chapter over. No state is stored or transmitted.

The Tech has five beats: infrastructure; integrated corporate layers;
horizontal deployment; governance at development and deployment; public
capacity as another route. Google, Microsoft, and Amazon are selected examples,
with first-party source links. The columns distinguish corporate presence from
fabrication, exclusivity, or market share. Model partnerships are labeled.
A shared delivery junction joins the corporate columns before branching into
workplaces, public services, and households, avoiding a one-to-one mapping of
vendor to sector. These branches are conceptual, not customer contracts.
The public-compute route supports independent builders; it does not feed a
particular private cloud provider or imply a fully public chip-to-app stack.
Safeguards and public routes are proposals, not measured improvements.

Workers has four beats: the job bundle; assumed paperwork savings; a choice
about distributing the gain; worker participation before redesign. Cash has
four beats: an income interruption; a late payment; an equal payment at job
loss; designing a reliable floor. All numerical assumptions match set one.
The worker diagram aggregates record review, assessment, and listening into a
single 300-minute patient-work block. No empirical specification was changed.

## Visual and behavior ownership

This is an isolated editorial prototype under the frontend design skill's
prototype exception, not a production-app redesign or a new project-wide
visual system. `stories.css :root` owns this prototype's runtime tokens. It
reuses the existing ESP navy, paper, beige, green, pink, gold and purple values
from `src/styles/tokens.css` and locally bundled Publico/Public Sans fonts.
The visual signature is a corporate column becoming an economy-wide network.
White space and typographic pacing carry the surrounding narrative.

Story changes move focus to the new heading and scroll the story into view.
Refreshing choice markup restores focus to that choice. Buttons are semantic
pressed-state controls. Wider diagrams have a labeled, keyboard-focusable
horizontal scroll surface and a mobile instruction. Text versions live in a
native disclosure. Captions distinguish evidence from illustrative accounting.
Animations are short SVG reveals, disabled by reduced-motion preferences.
Scrollbars are globally styled in this isolated document, with forced-colors
fallback. There are no asynchronous, empty-result, payment, account, or
irreversible workflows requiring loading/error/confirmation states.

## Verification (October 17, 2026)

- `node --check prototypes/transition-stories/stories.js`: passed.
- `node tests/transition-stories.js`: passed. Tests staged corporate layers,
  deployment, both policy reveals, all worker allocations, equal-payment cash
  accounting, focus placement/restoration, chapter boundaries, retained choices,
  and the skip-link route. No jsdom runtime errors.
- `node tests/transition.js`: passed; first set remains functional.
- `python3 build.py --check`: passed; generated main page remains current.
- Real in-app browser: full Tech sequence, safeguards, public route, worker
  allocation, keyboard Enter continuation, cash comparison, and Back verified.
  At a 390px viewport all three chapters fit the document width. Diagram
  overflow stays inside the figure; ArrowRight moved its scroll position.
  Browser error/warning logs were checked. Reduced motion is implemented and
  statically checked, not tested through an emulated OS preference.
- Strict premium audit saved at
  `notes/verification/transition-stories-premium-audit-2026-10-17.json` reports
  four actionless-button findings. Its parser detects inline handlers but not
  this document's `addEventListener` bindings. The reported buttons are covered
  by the runtime tests. No inline handler was added to satisfy that limitation.

Sources and limitations are on the page. The diagrams have not had reader
comprehension testing, a full screen-reader audit, or empirical calibration.
The existing site's archived-source validation failures remain outside this
prototype's scope.
