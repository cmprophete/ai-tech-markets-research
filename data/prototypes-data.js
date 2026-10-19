// The prototype shelf.
//
// Hand-maintained. Every working sketch in prototypes/ is listed here and
// embedded in the Prototypes tab, which is deliberately a rough edge of the
// site rather than published work.
//
// WHY IFRAMES. Each prototype is a complete standalone document with its own
// <style> block, and several were built before the current token set. Inlining
// eleven of them into index.html would collide on class names and cascade
// order; an iframe gives each one its own document, which is exactly what it
// already is. The cost is that they do not inherit the app's styling. That is
// the intended trade.
//
// `status` is checked, not asserted: 'ok' means the page was loaded in jsdom
// and ran to completion; 'stale' means it threw, and `why` says what on.
// Do not promote a prototype to 'ok' without re-running that check.

const PROTOTYPES = [
  {
    file: 'prototypes/transition-stories/index.html',
    title: 'How the transition takes shape',
    eyebrow: 'Second set · The Tech · Workers · Cash · Guided narratives',
    desc: 'A slower set of three visual stories, revealed one beat at a time. Follow corporate development vertically through the AI stack, then deployment horizontally into the economy; follow a saved hour through a workplace bargain; and follow cash through the weeks after job loss.',
    status: 'ok'
  },
  {
    file: 'prototypes/transition/index.html',
    title: 'The choices inside the AI transition',
    eyebrow: 'The Tech · Workers · Cash · Interactive policy sketches',
    desc: 'Three connected experiments: assign public decision rights over an AI deployment, decide who receives the time saved at work, and move a cash payment along a household transition. Explicit assumptions, policy alternatives, and sources accompany each mechanism.',
    status: 'ok'
  },
  {
    file: 'prototypes/policy-links-prototypes.html',
    title: 'Six ways to draw how policies reinforce each other',
    eyebrow: 'Policy Map · Links · Prototype set',
    desc: 'Tabs 1&ndash;6 render the same policies and the same link set six different ways &mdash; arc bands, chord ribbons, adjacency matrix, edge bundling, force clusters, category flow &mdash; so the reading can be judged before the edge data is overhauled. Tab 7 steps back and catalogs 32 things a link could mean, with a verdict on each.',
    status: 'ok'
  },
  {
    file: 'prototypes/age_bands_redesign.html',
    title: 'The young-graduate gap, recomputed',
    eyebrow: 'Section 02 · Across workers · rebuild',
    desc: 'A rebuild of the age-bands analysis that moves the headline number, and an account of why: a stale file, a boundary artifact, and a method bias the original had measured but not surfaced. The most self-critical thing in the folder.',
    status: 'ok'
  },
  {
    file: 'prototypes/themes.html',
    title: 'Themes and Fact Bank, earlier shape',
    eyebrow: 'Retired tab · full page',
    desc: 'The Themes tab as it stood before it was retired, carrying the Fact Bank rating scales and the full research payload. Useful as the record of what the themes layer looked like when it still had a page of its own.',
    status: 'ok'
  },
  {
    file: 'prototypes/index_old.html',
    title: 'The whole site, earlier design',
    eyebrow: 'Full page · superseded',
    desc: 'The previous design of the tracker end to end, before the masthead, token set and tab groups landed. Worth keeping as the before-picture.',
    status: 'ok'
  },
  {
    file: 'prototypes/adoption_prototype.html',
    title: 'Ten ways to tell the BTOS story without 14 screens of scroll',
    eyebrow: 'Adoption tab · layout study',
    desc: 'Ten layout treatments for the Census Business Trends and Outlook Survey adoption data, aimed at the problem that the honest version of the tab was unreadably long.',
    status: 'stale',
    why: 'Throws on load. The BTOS payloads are back, but the shape the prototype indexes into has moved since it was written.'
  },
  {
    file: 'prototypes/jobs_displacement_prototype.html',
    title: 'Job displacement, first pass',
    eyebrow: 'Job displacement tracker',
    desc: 'The original build of the displacement tab: Okun residuals and age bands, with the chart engine that later became assets/jobs-charts.js.',
    status: 'stale',
    why: 'Reads JC.data.ces_slowdown, which a later refactor of the data pipeline dropped. No committed snapshot of the data satisfies it.'
  },
  {
    file: 'prototypes/jobs_displacement_dashboard.html',
    title: 'Job displacement as a dashboard',
    eyebrow: 'Job displacement tracker',
    desc: 'The same material arranged as a live monitor: headline panels, a sector strip and a generated-at stamp, for someone checking the state of play rather than reading an argument.',
    status: 'stale',
    why: 'Same ces_slowdown dependency as the first pass.'
  },
  {
    file: 'prototypes/jobs_displacement_editorial.html',
    title: 'Job displacement as an article',
    eyebrow: 'Job displacement tracker',
    desc: 'The dashboard material rewritten as prose with charts in support, testing whether the argument survives being told rather than displayed.',
    status: 'stale',
    why: 'Same data-shape mismatch as the rest of this family.'
  },
  {
    file: 'prototypes/jobs_displacement_instruments.html',
    title: 'Job displacement as an instrument panel',
    eyebrow: 'Job displacement tracker',
    desc: 'The most severe of the treatments: every series as a gauge, no prose, on the theory that the reader wants the numbers and nothing else.',
    status: 'stale',
    why: 'Same data-shape mismatch as the rest of this family.'
  },
  {
    file: 'prototypes/jobs_displacement_scroll.html',
    title: 'Is AI displacing workers yet? (scroll)',
    eyebrow: 'Job displacement tracker',
    desc: 'A scrollytelling treatment that reveals each series as the reader arrives at it, so the verdict lands after the evidence rather than above it.',
    status: 'stale',
    why: 'Same data-shape mismatch as the rest of this family.'
  },
  {
    file: 'prototypes/jobs_displacement_scroll_editorial.html',
    title: 'Is AI displacing workers yet? (three verdicts)',
    eyebrow: 'Labor market · A feature in three verdicts',
    desc: 'The scroll treatment with an editorial frame: the question answered three times, at three levels of confidence, as the evidence accumulates.',
    status: 'stale',
    why: 'Same data-shape mismatch as the rest of this family.'
  }
];
