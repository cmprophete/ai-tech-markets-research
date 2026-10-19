# The choices inside the AI transition

Three connected, standalone editorial interactives for discussion at Economic
Security Project. Open `index.html`, or find **The choices inside the AI
transition** on the main site's Prototypes shelf. No server, remote script,
build step, or account is required. A local HTTP server is useful for browser QA.

## Editorial direction

The audience is a policy-curious reader, advocate, or policymaker. The common
argument is that institutions determine the distribution of technological gains.
Each experiment begins with a decision a reader can change, then connects the
mechanism to policy choices and the constraints on those choices.

- **The Tech:** decision rights are a useful unit of democratic control. A
  benefits-office procurement makes public participation, data boundaries,
  contestability, safety evaluation, and exit rights tangible. Moving the dots
  records assigned rights, not a calibrated democracy or safety score. Severe
  frontier risks require separate governance beyond this deployment example.
- **Workers:** time savings do not specify how the gains are distributed.
  Recompose a task bundle, then compare service reinvestment, shorter hours at
  constant daily pay, and reductions in paid staffing hours. The all-automated
  case deliberately exposes the limits of the simple arithmetic.
- **Cash:** program evaluations and public debate should examine the path
  through a transition as well as an endpoint. Hold the payment amount fixed
  while changing delivery timing. The chart compares the selected arrival week
  with immediate payment on fixed axes, without predicting behavior.

These are proposed frames for exploration, not an assertion of adopted ESP
positions. Source links are in the page. Existing authored policy-card copy and
empirical specifications elsewhere in the repository were not edited.

## Visual and behavioral ownership

This is an isolated editorial prototype, not an app redesign. Per the design
skill's prototype exception, it does not establish a new root DESIGN.md or
UX-CONTRACT.md. Runtime token ownership is `transition.css :root`. Its navy,
paper, green, purple, pink and gold values reuse `src/styles/tokens.css` brand
values; display and body faces use existing locally bundled fonts. No host-page
styles are changed. One shared navigation and control language serves all three
experiments, with green for public decision rights, pink for the distribution
of time, and gold for the cash timeline. Color is accompanied by text/state.

Semantic links select hash-addressable experiments. Native buttons, radios,
ranges, and details provide keyboard interactions. Choices persist while
switching chapters but reset on reload; nothing is stored or transmitted.
There are no requests, async operations, user records, forms, or irreversible
actions requiring loading/error/confirmation flows. Reduced motion and forced
colors have CSS adaptations. The prototype intentionally retains the light
ESP palette regardless of host operating-system theme.

## Transparent accounting assumptions

**Workers:** task minutes `[90, 60, 90, 90, 120, 30]` sum to 480. Human-led tasks
retain all minutes; assistance retains half; automation retains none. No
verification cost, demand response, feasibility estimate, or quality adjustment
is modeled. These are arbitrary teaching assumptions, not study estimates.

**Cash:** initial liquid resources = $1,200. Weekly spending = $600. Other
income = $200 in weeks 1–7 and $650 in weeks 8–12. A selected transfer arrives
before that week's net spending, or immediately at week 0. Each subsequent
week is prior balance + other income - spending + transfer if scheduled.
Weeks below zero count week-end balances in weeks 1–12. The largest cash gap
uses the minimum across week 0 and all twelve week ends. Negative balances
represent financing needs, not an assumed overdraft facility. No inflation,
interest, behavioral response, or benefit eligibility is modeled.

At the default $2,400 payment in week 6, two weeks end below zero and the
largest gap is $800. Immediate delivery avoids those gaps. Both cases end
week 12 at $1,050. These are arithmetic results within the example.

## Verification (October 17, 2026)

- `node --check prototypes/transition/transition.js`: passed.
- `node tests/transition.js`: passed; exercises all three mechanisms, task
  endpoints, presets, allocation, cash boundary cases, reset, route visibility,
  preserved chapter state, named controls, and absence of runtime errors.
- `python3 build.py --check`: passed; source/template artifact unchanged.
- `python3 tools/research.py check`: passed with pre-existing archived-source
  warnings (130, 132, 186, 188).
- Real in-app browser: desktop and 390px viewport; public-rule toggle, worker
  allocation, all-automated task case, native range arrow key, immediate cash
  comparison, and reset exercised. No horizontal document overflow at 390px
  for any experiment. Local font assets load. Reduced-motion CSS was checked
  statically, not with an emulated OS preference or screen reader.
- Premium static audit ran at repository root and on this prototype directory.
  The scoped JSON is saved in
  `notes/verification/transition-premium-audit-2026-10-17.json`. It reports seven
  actionless-button findings because its detector recognizes inline `onclick`
  attributes but not `addEventListener` bindings. All reported controls have
  handlers exercised by the runtime tests; inline handlers were not added to
  satisfy the detector. The root audit reports 28 findings in existing code.
- Existing `tests/interactions.js` and `tests/routes.js` remain red on the
  previously observed archived source 130 validation errors. No snapshots were
  re-recorded to suppress these failures.

This is a mechanism/design prototype. It has not had user research, a complete
screen-reader audit, or empirical calibration. Before publication, test whether
readers can explain the mechanisms and distinguish the examples from evidence.
