#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   interactions.js — clicking and keyboard, which the route snapshot cannot see.

       node tests/interactions.js

   tests/routes.js loads each URL and pins the result, so it proves routing.
   It says nothing about what happens when a reader actually clicks something,
   and the router refactor replaced six per-button click listeners with one
   delegated listener plus data-view attributes. A typo in an attribute would
   leave every route green and every button dead. Hence this file.
   ═══════════════════════════════════════════════════════════════════════════ */
const { load, settle } = require('./dom.js');

let failed = 0;
// The Government action tab's masthead, the owner's own words (GOV_COPY in src/js/60-legislation.js): the same in every section, with no count in it.
const GOV_HEADER = 'What is government doing about AI?';
const GOV_BLURB = 'A centralized repository of active bills, key cases and enforcement actions about AI, both federal and in the states, alongside the 2026 midterm results. Use the switch to see everything together or one kind at a time, and hover a state or choose a place in the Show menu to narrow what you see.';
const ok = (name, cond, detail) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (cond || !detail ? '' : '\n           ' + detail));
  if (!cond) failed++;
};

const wait = ms => new Promise(r => setTimeout(r, ms));
/* data/legislation-actions.js has rows now (the first batch went in on 2026-11-17). A test that wants the Enforcement and Cases sections as they are while the file is empty, or wants its own rows to be the only ones, or
   is about the bills and does not want the map's card to carry an Enforcement block, loads the page with the real array set aside: it becomes an unused constant and LEGISLATION_ACTIONS is empty. */
const noActions = html => {
  const marker = 'const LEGISLATION_ACTIONS = [';
  if (!html.includes(marker)) throw new Error('data/legislation-actions.js no longer declares LEGISLATION_ACTIONS as an array literal: noActions cannot set the real rows aside');
  return html.replace(marker, 'const LEGISLATION_ACTIONS = []; const __REAL_ACTIONS = [');
};
const click = (w, d, id) => {
  const el = d.getElementById(id);
  if (!el) throw new Error('no element #' + id);
  el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
};
const bodyView = d => (d.body.className.match(/([\w-]+)-view/) || [])[1] || null;

/* ── the view nav ─────────────────────────────────────────────────────── */
{
  const { w, d } = load('index.html', '#about');
  const cases = [
    ['viewCards', 'cards', '#papers'],
    ['viewFactBank', 'fact-bank', '#fact-bank'],
    ['viewAgenda', 'agenda', '#agenda'],
    ['viewPolicy', 'policy', '#policy'],
    ['viewGovernment', 'all', '#all'],   // one tab for All, Cases, Enforcement and Legislation: from another tab it opens the section that was open last, All at first
  ];
  for (const [id, view, hash] of cases) {
    click(w, d, id);
    ok(`click #${id} -> ${view} view`, bodyView(d) === view, `body view was ${bodyView(d)}`);
    ok(`click #${id} -> hash ${hash}`, w.location.hash === hash, `hash was ${w.location.hash}`);
    const btn = d.getElementById(id);
    ok(`click #${id} -> button marked active`,
       btn.classList.contains('active') && btn.getAttribute('aria-selected') === 'true');
  }
}

/* ── Government action: one tab, four sections ───────────────────────────────────────────────────────────────────
   The nav has ONE tab for All, Cases, Enforcement and Legislation (until 2026-11-17 they were two tabs, Enforcement and Legislation; the owner preferred one; All, which holds everything, was added on 2026-11-18). Under the
   masthead a switch moves between the four sections, each a view of its own with an address of its own (#all, #cases, #enforcement, #legislation); the nav tab stays marked for all four, the open section is pressed in the switch,
   and the tab opens the section that was open last, All at first. The switch is there for the four sections only. */
{
  const { w, d } = load('index.html', '#about');
  const SECTIONS = [['govSwitchAll', 'all', '#all'], ['govSwitchCases', 'cases', '#cases'], ['govSwitchEnforcement', 'enforcement', '#enforcement'], ['govSwitchLegislation', 'legislation', '#legislation']];
  const nav = d.getElementById('viewGovernment'), pressed = () => SECTIONS.filter(([id]) => d.getElementById(id).getAttribute('aria-pressed') === 'true').map(([id]) => id).join();
  // the switch is in the toolbar of the Government action area, so it shows when no ancestor is hidden: 'none' while another tab is open, 'block' on the three sections
  const shown = () => { for (let n = d.getElementById('govSwitch'); n && n !== d.body; n = n.parentElement) if (w.getComputedStyle(n).display === 'none') return 'none'; return 'block'; };
  ok('the switch has four buttons, All first and then the owner\'s order, Cases, Enforcement, Legislation, and it is hidden, with none pressed, while another tab is open',
     [...d.querySelectorAll('#govSwitch .pol-subview-btn')].map(b => b.textContent.trim()).join() === 'All,Cases,Enforcement,Legislation' && pressed() === '' && shown() === 'none', shown());
  for (const [id, view, hash] of SECTIONS) {
    click(w, d, id);
    ok(`the ${view} section opens from the switch: its view, its address, its button pressed, the switch showing, and the one nav tab, Enforcement and Legislation, marked and labelling the panel`,
       bodyView(d) === view && w.location.hash === hash && pressed() === id && shown() === 'block' &&
       nav.classList.contains('active') && nav.getAttribute('aria-selected') === 'true' && d.getElementById('viewPanel').getAttribute('aria-labelledby') === 'viewGovernment',
       `${bodyView(d)} ${w.location.hash} ${pressed()}`);
    ok(`the ${view} section has the tab's masthead, and it asks a question`, d.getElementById('headerTabDescLede').textContent.trim().endsWith('?'), d.getElementById('headerTabDescLede').textContent);
  }
  ok('the four sections share one header: the same question in every section (the owner, 2026-11-18: no different header and blurb for each view)', new Set(SECTIONS.map(([id]) => (click(w, d, id), d.getElementById('headerTabDescLede').textContent.trim()))).size === 1);
  click(w, d, 'govSwitchCases'); click(w, d, 'viewPolicy');
  ok('leaving the tab unmarks it and hides the switch', !nav.classList.contains('active') && shown() === 'none', shown());
  click(w, d, 'viewGovernment');
  ok('opening the tab again from the nav goes back to the section that was open last (Cases), with its address', bodyView(d) === 'cases' && w.location.hash === '#cases' && pressed() === 'govSwitchCases', `${bodyView(d)} ${w.location.hash}`);
  const direct = load('index.html', '#enforcement');
  ok('an address opens its own section with that button pressed in the switch and the one tab marked',
     bodyView(direct.d) === 'enforcement' && direct.d.getElementById('govSwitchEnforcement').getAttribute('aria-pressed') === 'true' && direct.d.getElementById('viewGovernment').classList.contains('active'));
}

/* ── the grouped nav and the front page ───────────────────────────────────
   The header nav is three labelled groups: Research (Fact Bank, Papers: alphabetical), Policy (Agenda, a placeholder, then Landscape) and
   Government action (ONE tab, labelled Enforcement and Legislation in the owner's words above the group label; it holds Cases, Enforcement and Legislation, which were two tabs, Enforcement and Legislation,
   until 2026-11-17, and Legislation was the group of its own from 2026-11-12, when it left Policy). About has no door
   cards: it sets out the three names as sections, each opening with the question it answers and then what the dashboard offers for it. The Research and Policy copy is the owner's own and is
   guarded below; the Government action section (added 2026-11-12 at the owner's request, after the owner asked for About to carry the day's work) is drafted copy for the owner to edit. */
{
  const { w, d } = load('index.html', '#about');
  const groups = [...d.querySelectorAll('.header-tabs > .tab-group')].map(g =>
    `${g.dataset.group}:${g.querySelector('.tab-group-label').textContent.trim()}:` +
    [...g.querySelectorAll('.tab-group-btns > .header-nav-btn')].map(b => b.id).join('+'));
  ok('the nav is three labelled groups: Research (Fact Bank, Papers), Policy (Agenda, Landscape) and Government action, whose one tab reads Enforcement and Legislation',
     groups.join() === 'research:Research:viewFactBank+viewCards,policy:Policy:viewAgenda+viewPolicy,government:Government action:viewGovernment', groups.join());
  ok('the tabs read Fact Bank, Papers, Agenda, Landscape, Enforcement and Legislation (Cases, Enforcement and Legislation are the last one\'s sections, not tabs)',
     [...d.querySelectorAll('.header-nav-btn')].map(b => b.textContent.trim()).join() === 'Fact Bank,Papers,Agenda,Landscape,Enforcement and Legislation' && !d.getElementById('viewEnforcement') && !d.getElementById('viewLegislation'));
  ok('the tabs of each group are in alphabetical order',
     [...d.querySelectorAll('.tab-group')].every(g => {
       const names = [...g.querySelectorAll('.header-nav-btn')].map(b => b.textContent.trim());
       return names.join() === [...names].sort().join();
     }));
  ok('the group labels are for the eye (aria-hidden), and the tabs that would not make sense on their own (Agenda, Landscape) carry a fuller accessible name that still contains the visible text, and the Enforcement and Legislation tab is clear alone (it has none)',
     [...d.querySelectorAll('.tab-group-label')].every(l => l.getAttribute('aria-hidden') === 'true') &&
     ['viewAgenda', 'viewPolicy'].every(id => {
       const b = d.getElementById(id);
       return b.getAttribute('aria-label').toLowerCase().includes(b.textContent.trim().toLowerCase());
     }) &&
     ['viewAgenda', 'viewPolicy'].map(id => d.getElementById(id).getAttribute('aria-label')).join() === 'Policy agenda,Policy landscape' &&
     !d.getElementById('viewGovernment').hasAttribute('aria-label'));
  // Each group's accent is a line of its own in the stylesheet; a group without one quietly takes the green default of
  // the first rule, so a new group would look like Research until someone noticed.
  const navCss = [...d.querySelectorAll('style')].map(el => el.textContent).join('\n');
  ok('every nav group has an accent of its own in the stylesheet: Research green, Policy pink, Government action gold',
     [['research', 'green'], ['policy', 'pink'], ['government', 'gold']].every(([g, c]) =>
       new RegExp(`\\.tab-group\\[data-group="${g}"\\]\\s*\\{\\s*--group-accent:\\s*var\\(--${c}\\)`).test(navCss)) &&
     [...d.querySelectorAll('.tab-group')].every(g => navCss.includes(`.tab-group[data-group="${g.dataset.group}"]`)));
  ok('About has no door cards: the question cards are gone', !d.querySelector('#aboutEntries, .about-entry'));
  const aboutSecs = [...d.querySelectorAll('#aboutArea .about-section')];
  const labelled  = aboutSecs.filter(sec => sec.querySelector('.about-section-label'));
  ok('Research, Policy and Government action each appear once on About, as a section; the numbered list of questions is gone',
     [...d.querySelectorAll('#aboutArea .about-section-label')].map(h => h.textContent.trim()).join() === 'Research,Policy,Government action' &&
     !d.querySelector('#aboutArea ol, #aboutArea .about-questions'));
  ok('each of those sections opens with the question it answers, then what the dashboard offers for it',
     labelled.length === 3 && labelled.every(sec => {
       const k = [...sec.children];
       return k[0].matches('.about-section-label') && k[1].matches('.about-question') &&
              k[2].matches('.about-section-text') && !k[2].matches('.about-question');
     }));
  ok('the Research and Policy questions are the authored ones: the normal-technology question keeps its link, and the policy question is whole',
     labelled.length === 3 && (() => {
       const [r, p] = labelled.slice(0, 2).map(sec => sec.querySelector('.about-question'));
       return r.textContent.startsWith('It\u2019s unclear how the technology itself will take shape') &&
              !!r.querySelector('a[href="https://knightcolumbia.org/content/ai-as-normal-technology"]') &&
              p.textContent.startsWith('And even then, it\u2019s hard to know how to react.') && p.textContent.trim().endsWith('absorbing its effects?');
     })());
  ok('the intro still ends with its bridge into the sections, and the credit is the last thing on the page',
     aboutSecs.length > 0 && (() => {
       const t = [...aboutSecs[0].querySelectorAll('.about-section-text')];
       return t.length === 2 && t[1].textContent.startsWith('Each question calls for a different kind of answer');
     })() && aboutSecs[aboutSecs.length - 1].lastElementChild.matches('.about-credit'));
  ok('each section ends with links to the tabs and sections it describes: Research to the Fact Bank and Papers, Policy to Landscape, Government action to Cases, Enforcement and Legislation (Agenda is a placeholder with nothing to say yet, so it is not linked)',
     labelled.length === 3 && labelled.every(sec => sec.lastElementChild.matches('.about-links')) &&
     labelled.map(sec => [...sec.querySelectorAll('.about-links a')].map(a => a.getAttribute('href')).join()).join('|') === '#fact-bank,#papers|#policy|#all,#cases,#enforcement,#legislation');
  ok('each question is one paragraph: a lead statement run on into its questions, marked up without changing a word',
     labelled.length === 3 && labelled.every(sec => {
       const q = sec.querySelector('.about-question'), kids = [...q.children];
       return kids.length > 1 && kids[0].matches('.q-lead') && kids.slice(1).every(k => k.matches('.q-ask')) &&
              kids.map(k => k.textContent).join(' ') === q.textContent.trim();
     }) && labelled.map(sec => sec.querySelectorAll('.q-ask').length).join() === '1,3,2');
  ok('the two unknowns in the intro carry the colour key of the part that answers them, and the sentence is still whole',
     [...aboutSecs[0].querySelectorAll('.about-mark')].map(m => m.dataset.group + ':' + m.textContent).join('|') ===
       'research:what this technology will become|policy:what policy should do in response' &&
     aboutSecs[0].textContent.includes('We don’t know what this technology will become, or what policy should do in response.'));
  ok('all three sections name their nav group, which the stylesheet turns into a rule above the part in the header\'s accent (Research green, Policy pink, Government action gold)',
     labelled.map(sec => sec.dataset.group).join() === 'research,policy,government' &&
     [['research', 'green'], ['policy', 'pink'], ['government', 'gold']].every(([g, c]) => new RegExp(`\\.about-section\\[data-group="${g}"\\][^{]*\\{\\s*--group-accent:\\s*var\\(--${c}\\)`).test(navCss)));
  const govSec = labelled[2];
  ok('the Government action section names the sources behind the Legislation tab (GovInfo, Open States, the Congressional Research Service and the Associated Press), says the topics are our reading, names no tracker or advocacy group, and states no number that the page computes and would let go stale',
     !!govSec && ['GovInfo', 'Open States', 'Congressional Research Service', 'Associated Press'].every(n => govSec.querySelector('.about-note').textContent.includes(n)) &&
     /Topics are our reading/.test(govSec.querySelector('.about-note').textContent) && !/tracker/i.test(govSec.querySelector('.about-note').textContent) &&
     !/\d/.test(govSec.textContent.replace('2026', '')), govSec && govSec.textContent);
}

/* ── the About modal is gone; the Pilot release notice is laid out like the About page's notes ────────────────────────────
   The "About" modal (and the hidden ⓘ button that opened it) was unreachable and out of date: it still spoke of twenty-seven policies, five stages and a Themes tab. It was removed
   on 2026-11-17 at the owner's request; the About page is the only About. The Fact Bank's "Pilot release" notice used to be a small uppercase label over its text in a rounded callout;
   it is now a run-in lead-in like the About page's "How this section is built." notes, the same \`.about-note\` class and so the same padding, size and square ends, in the gold of a
   fact's "Take note" (\`warn\`). jsdom has no cascade to measure that with, so this checks the markup the style hangs on. */
{
  const { d } = load('index.html', '#fact-bank');
  ok('there is no About modal and no hidden ⓘ button for it', !d.getElementById('aboutModal') && !d.getElementById('aboutInfoBtn') && !d.getElementById('aboutModalClose'));
  const note = d.querySelector('#factBankArea .intro-note > p');
  const lead = note && note.querySelector('strong');
  ok('the Pilot release notice is an .about-note in the warn gold, led by "Pilot release." like the About page\'s "How this section is built." notes',
     !!note && note.classList.contains('about-note') && note.classList.contains('warn') && !!lead && lead.textContent === 'Pilot release.' && note.firstElementChild === lead && !note.querySelector('.lbl-grot'));
  const notes = [...load('index.html', '#about').d.querySelectorAll('.about-note')];
  ok('the About page\'s own notes lead the same way (a bold run-in, then the text)', notes.length >= 2 && notes.every(n => n.firstElementChild.matches('strong')));
}

/* ── Agenda: a placeholder tab, first in the Policy group ───────────────────────────────────────────────────
   It opens, asks its question, says it is coming, and shows one note: nothing is here yet, with a link to Landscape (#policy). Nothing is behind
   it, and none of the Policy tab's list is built on it. */
{
  const { w, d } = load('index.html', '#agenda');
  ok('#agenda opens the agenda view', bodyView(d) === 'agenda', `body view was ${bodyView(d)}`);
  ok('#agenda keeps its address bar', w.location.hash === '#agenda', `hash was ${w.location.hash}`);
  const btn = d.getElementById('viewAgenda');
  ok('#agenda marks the Agenda button active, and not Landscape, and the panel is labelled by it',
     btn.classList.contains('active') && btn.getAttribute('aria-selected') === 'true' && !d.getElementById('viewPolicy').classList.contains('active') &&
     d.getElementById('viewPanel').getAttribute('aria-labelledby') === 'viewAgenda');
  ok('the masthead asks a question and says it is coming soon',
     d.getElementById('headerTabDescLede').textContent.trim().endsWith('?') && /coming soon/i.test(d.getElementById('headerTabDescText').textContent));
  const note = d.querySelector('#agendaArea .placeholder-note');
  ok('the placeholder says nothing is here yet and links to Landscape (#policy)',
     !!note && /nothing is here yet/i.test(note.textContent) && note.querySelector('a').getAttribute('href') === '#policy');
  ok('it is a view of its own, with no policy list: the policy view class is off and the Landscape area is empty',
     !d.body.classList.contains('policy-view') && d.getElementById('policyArea').children.length === 0, d.body.className);
  ok('the screen reader announcement names the view', d.getElementById('viewAnnounce').textContent === 'Policy agenda view');
}

/* ── Enforcement and Cases: the placeholders, while data/legislation-actions.js has no row of their kind ─────────────────────
   Each section opens, asks its question, says it is coming, and shows one note: nothing is here yet, with a link to Legislation (#legislation). Nothing is behind it, and it does not ask for the bills file.
   The real file has rows now, so the page is loaded with them set aside (noActions): this is the state the sections are in for as long as the file is empty, and the state a section goes back to if every row
   of its kind is taken out. */
{
  const ASK = [['enforcement', 'Enforcement actions', 'enforcement actions', 'govSwitchEnforcement', 'Government action: Enforcement view'], ['cases', 'Key cases', 'key cases', 'govSwitchCases', 'Government action: Cases view']];
  for (const [route, What, what, switchId, announce] of ASK) {
    const { w, d } = load('index.html', '#' + route, { transform: noActions });
    ok(`#${route} opens the ${route} view`, bodyView(d) === route, `body view was ${bodyView(d)}`);
    ok(`#${route} keeps its address bar`, w.location.hash === '#' + route, `hash was ${w.location.hash}`);
    const btn = d.getElementById('viewGovernment');
    ok(`#${route} marks the Enforcement and Legislation tab active (and not Landscape), presses its own button in the switch, and the panel is labelled by the tab`,
       btn.classList.contains('active') && btn.getAttribute('aria-selected') === 'true' && !d.getElementById('viewPolicy').classList.contains('active') &&
       d.getElementById(switchId).getAttribute('aria-pressed') === 'true' && d.getElementById('viewPanel').getAttribute('aria-labelledby') === 'viewGovernment');
    ok(`the ${route} masthead is the tab's, the same question as every section, and says nothing of the ${what} coming soon (the placeholder note under the map does)`,
       d.getElementById('headerTabDescLede').textContent.trim() === 'What is government doing about AI?' && !/Coming soon/.test(d.getElementById('headerTabDescText').textContent), d.getElementById('headerTabDescText').textContent);
    const note = d.querySelector('#enforcementArea .placeholder-note');
    ok('the placeholder says nothing is here yet, names what will be listed, and links to Legislation (#legislation)',
       !!note && !note.hidden && /nothing is here yet/i.test(note.textContent) && d.getElementById('enfPlaceholderWhat').textContent === What && note.querySelector('a').getAttribute('href') === '#legislation' && d.getElementById('enfLive').hidden);
    ok('it is a view of its own, with the map in it, so the bills are fetched for the map: the legislation view class is off and the bills file has been asked for',
       !d.body.classList.contains('legislation-view') && ['loading', 'ready'].includes(d.getElementById('legislationArea').getAttribute('data-bills')), d.body.className);
    ok('the screen reader announcement names the tab and the section', d.getElementById('viewAnnounce').textContent === announce, d.getElementById('viewAnnounce').textContent);
  }
}

/* ── Enforcement and Cases: the lists, once the data has rows ────────────────────────────────────────────────────────────────
   These checks load the page with the real rows set aside (noActions) and put test rows of our own in (nothing is real: example.org links and invented titles), so the counts they assert do not move when a row
   is added to the real file. The first row of a kind turns its section on, and they prove everything that happens then: the placeholder gives way and the masthead is said from the rows; Enforcement and Cases
   are ONE list drawn twice, each kind in its own section with its own count, never added together, newest first; a status is plain text and a source a link only when it is http or https; the Show menu is the
   Legislation menu with Federal named for the agencies and courts; the place is SHARED by the three sections and carried in the address (#enforcement/texas, #cases/texas); the topic filter is the Papers
   chips, ANDed, and a topic the other section has no row for is dropped on the way across; and the map's card counts the place it shows and links to each section that has rows there. First, a guard on the real
   file: every row it holds is checked for all its fields, a real topic, an http link and the house style. The real rows as they ship are checked in the block after this one. */
(async () => {
  const FIX = [
    { id: 'zz-fed-1', kind: 'enforcement', level: 'federal', body: 'Test Agency', date: '2026-03-24', title: 'Test Agency and Example Co.', uses: ['consumer'],
      what: 'Alleged that Example Co. overstated what its product does; the proposed order bans it from selling business opportunities.', outcome: 'Proposed order', status: 'Pending', asOf: '2026-11-17', url: 'https://www.example.org/agency/1' },
    { id: 'zz-fed-2', kind: 'enforcement', level: 'federal', body: 'Test Commission', date: '2025-12-22', title: 'Test Commission and Sample Inc.', uses: ['consumer', 'bias'],
      what: 'Reopened and set aside an earlier order.', outcome: 'Order set aside', status: 'Final', asOf: '2026-11-17', url: 'https://example.org/agency/2' },
    { id: 'zz-tx-1', kind: 'enforcement', level: 'state', state: 'TX', body: 'Texas Attorney General', date: '2026-05-01', title: 'Texas and Sample Inc.', uses: ['kids', 'chatbots'],
      what: 'Alleged that a chatbot exposed minors to harm.', outcome: 'Lawsuit', status: 'Pending', asOf: '2026-11-17', url: 'https://example.org/tx/1' },
    { id: 'zz-ca-1', kind: 'case', level: 'state', state: 'CA', body: 'California Superior Court', date: '2026-02-02', title: 'Doe v. Sample Inc.', uses: ['liability'],
      what: 'The court held that a claim could proceed.', outcome: 'Ruling', status: 'Appealed', asOf: '2026-11-17', url: 'javascript:alert(1)' },
    { id: 'zz-case-1', kind: 'case', level: 'federal', body: 'U.S. District Court, N.D. Cal.', date: '2025-05-16', title: 'Roe v. Example', uses: ['work', 'bias'],
      what: 'A collective action was conditionally certified.', outcome: 'Ruling', status: 'Pending', url: 'https://example.org/court/1' },
  ];
  const { w, d } = load('index.html', '#enforcement', { transform: noActions });
  const area = d.getElementById('enforcementArea'), legArea = d.getElementById('legislationArea');
  const fire = (el, type) => el.dispatchEvent(new w.MouseEvent(type, { bubbles: true }));
  const change = (el, v) => { el.value = v; el.dispatchEvent(new w.Event('change', { bubbles: true })); };
  const refresh = () => { area.dispatchEvent(new w.Event('enforcement:refresh')); legArea.dispatchEvent(new w.Event('legislation:refresh')); };
  const goto = id => fire(d.getElementById(id), 'click');   // a button of the switch under the masthead
  const card = () => d.getElementById('legPanel').textContent.replace(/\s+/g, ' ').trim();
  const secs = () => [...d.querySelectorAll('#enfLists section')];
  const titleOf = s => s.querySelector('.leg-section-title').textContent.trim();
  const idsOf = s => [...s.querySelectorAll('tbody tr:not(.leg-empty-row)')].map(r => r.dataset.id).join();
  const mast = () => d.getElementById('headerTabDescText').textContent;
  const hrefs = () => [...d.querySelectorAll('#legPanel a.leg-enf-link')].map(a => a.getAttribute('href')).join();
  const shownBlock = id => { for (let n = d.getElementById(id); n && n !== d.body; n = n.parentElement) if (w.getComputedStyle(n).display === 'none') return false; return true; };
  const place = d.getElementById('legStateSelect'), legSel = place;   // the Show menu is one menu for the three sections
  const pills = () => [...d.querySelectorAll('#enfTopicPills button[data-topic]')], pillN = b => Number(b.querySelector('.kw-count').textContent);
  const pill = id => pills().find(b => b.dataset.topic === id);

  // the guard on the real file
  const real = JSON.parse(w.eval('JSON.stringify(__REAL_ACTIONS)'));   // the real file's rows, set aside by noActions
  const topicIds = JSON.parse(w.eval('JSON.stringify(LEGISLATION_TOPICS.map(t => t.id))'));
  const placeCodes = JSON.parse(w.eval('JSON.stringify(Object.keys(US_MAP.states).concat(Object.keys(LEGISLATION_TERRITORIES)))'));
  const incomplete = real.filter(a => !(a.id && ['enforcement', 'case'].includes(a.kind) && ['federal', 'state'].includes(a.level) && (a.level === 'state' ? placeCodes.includes(a.state) : !a.state) && a.body && /^\d{4}-\d{2}-\d{2}$/.test(a.date) &&
    a.title && Array.isArray(a.uses) && a.uses.length > 0 && a.uses.every(u => topicIds.includes(u)) && a.what && /^https?:\/\//.test(a.url) && (!a.asOf || /^\d{4}-\d{2}-\d{2}$/.test(a.asOf)))).map(a => a.id);
  ok('every row in the real file is complete: an id nobody else has, a kind, a level (and a real state for a state row only), who acted, a date, a title, topics that exist, our own words, an http link, and a date checked in the right form',
     incomplete.length === 0 && new Set(real.map(a => a.id)).size === real.length, incomplete.join(', '));
  const dashed = real.filter(a => /[\u2013\u2014]/.test([a.title, a.body, a.what, a.outcome, a.status].join(' '))).map(a => a.id);
  ok('no row uses an em-dash or an en-dash (the repo\'s style rule for page copy)', dashed.length === 0, dashed.join(', '));

  // with no rows
  ok('with no rows the section is still the placeholder: the note shows and the list is hidden', !d.getElementById('enfPlaceholder').hidden && d.getElementById('enfLive').hidden);
  fire(d.querySelector('#legMap path[data-state="TX"]'), 'mouseover');
  ok('and the map\'s card says nothing of enforcement (it does not advertise a list that is not there)', !/Cases and enforcement|Federal agencies and courts|None listed|See the (enforcement actions|key cases)/.test(card()), card());

  // the first rows: Enforcement
  w.eval(`LEGISLATION_ACTIONS.push(${FIX.map(r => JSON.stringify(r)).join(',')})`);
  refresh();
  ok('the first rows turn Enforcement on: the note goes, and the list, the Show menu and the filter bar show', d.getElementById('enfPlaceholder').hidden && !d.getElementById('enfLive').hidden && secs().length === 1 && !!place && !!d.getElementById('enfSearch'));
  ok('the tab\'s masthead is the owner\'s own blurb, the same words however many rows there are: it quotes no count', mast() === GOV_BLURB, mast());
  ok('its one list has its own count, and no case is in it', secs().map(titleOf).join('|') === 'All jurisdictions · 3 enforcement actions' && !/Doe v\.|Roe v\./.test(secs()[0].textContent), secs().map(titleOf).join('|'));
  ok('the list is newest first', idsOf(secs()[0]) === 'zz-tx-1,zz-fed-1,zz-fed-2', idsOf(secs()[0]));
  const tx = d.querySelector('#enfLists tr[data-id="zz-tx-1"]');
  ok('a row gives the date, who acted, the matter in our words with its topics, the outcome with its status and when it was checked, and the source as a link to the agency\'s own page',
     tx.children[0].textContent === 'May 1, 2026' && tx.children[1].textContent === 'Texas Attorney General' && /Texas and Sample Inc\./.test(tx.children[2].textContent) && /Alleged that a chatbot exposed minors/.test(tx.children[2].textContent) &&
     /Topics: Children and teens, Chatbots and companions/.test(tx.children[2].textContent) && tx.children[3].textContent.trim().startsWith('Lawsuit') && /Pending, checked November 17, 2026/.test(tx.children[3].textContent) &&
     tx.children[4].querySelector('a').getAttribute('href') === 'https://example.org/tx/1' && tx.children[4].textContent === 'example.org', tx.textContent);
  ok('the status is plain text, not a pill, and nothing in the list is a pill or a row of dots', !d.querySelector('#enfLists .leg-chip, #enfLists .kw-pill, #enfLists .leg-step, #enfLists .leg-track'));
  ok('the search box and its label name what is searched', d.getElementById('enfSearch').placeholder === 'Search the enforcement actions…' && d.getElementById('enfSearch').getAttribute('aria-label') === 'Search the enforcement actions');

  // Sort: the same menu as on Legislation, in the same place (after the search, in the search bar's first row), one setting for the tab, and not a filter
  const sortSel = d.getElementById('enfSort');
  ok('there is a Sort menu after the search box, in the search bar\'s first row: Most recent by default, then Oldest and Jurisdiction, named for what it sorts; the bills\' own Sort menu is not showing here',
     !!sortSel && sortSel.closest('.controls-row') === d.getElementById('enfSearch').closest('.controls-row') && !!(d.getElementById('enfSearch').compareDocumentPosition(sortSel) & 4) && sortSel.value === 'recent' &&
     [...sortSel.options].map(o => o.textContent).join() === 'Most recent,Oldest,Jurisdiction' && sortSel.getAttribute('aria-label') === 'Sort the enforcement actions' &&
     w.getComputedStyle(d.getElementById('enfSortPair')).display !== 'none' && w.getComputedStyle(d.getElementById('legSort').closest('.ctl-pair')).display === 'none');
  change(sortSel, 'oldest');
  ok('Sort by Oldest reverses the list, and the Reset button counts the order as one thing to put back, with the section: Reset all (2)', idsOf(secs()[0]) === 'zz-fed-2,zz-fed-1,zz-tx-1' && d.getElementById('legResetText').textContent === 'Reset all (2)', idsOf(secs()[0]) + ' ' + d.getElementById('legResetText').textContent);
  change(sortSel, 'jurisdiction');
  ok('Sort by Jurisdiction puts the federal agencies first, then the states, each place\'s rows newest first', idsOf(secs()[0]) === 'zz-fed-1,zz-fed-2,zz-tx-1', idsOf(secs()[0]));
  goto('govSwitchLegislation');
  ok('the order is one setting for the tab: Legislation\'s own Sort menu says Jurisdiction too', d.getElementById('legSort').value === 'jurisdiction');
  change(d.getElementById('legSort'), 'oldest');
  goto('govSwitchCases');
  ok('and a choice made on Legislation is the order Cases opens in: Oldest, the federal case from May 2025 first, the menu saying so and named for the cases',
     d.getElementById('enfSort').value === 'oldest' && idsOf(secs()[0]) === 'zz-case-1,zz-ca-1' && d.getElementById('enfSort').getAttribute('aria-label') === 'Sort the key cases', idsOf(secs()[0]));
  change(d.getElementById('enfSort'), 'jurisdiction');
  ok('on Cases Jurisdiction puts the federal case first, then California\'s', idsOf(secs()[0]) === 'zz-case-1,zz-ca-1', idsOf(secs()[0]));
  change(d.getElementById('enfSort'), 'recent');
  goto('govSwitchEnforcement');
  ok('Most recent puts the order back everywhere: Enforcement is newest first again, and so is the bills\' menu', idsOf(secs()[0]) === 'zz-tx-1,zz-fed-1,zz-fed-2' && sortSel.value === 'recent' && d.getElementById('legSort').value === 'recent', idsOf(secs()[0]));

  // the map follows the section: shaded by this section's rows, with a legend that counts them
  const legendItems = () => [...d.querySelectorAll('#legLegend .leg-legend-item')].map(i => i.textContent.replace(/\s+/g, ' ').trim()).join(' | ');
  const shadedNow = () => [...d.querySelectorAll('#legMap path.leg-state')].filter(p => /fill-b/.test(p.getAttribute('class'))).map(p => p.dataset.state).sort().join();
  ok('the map is shaded by this section\'s rows: Texas has an enforcement action and is the only state shaded, and the legend counts actions, not bills (50 states with none, one with one, two federal ones apart)',
     shadedNow() === 'TX' && legendItems() === 'No actions 50 | 1 action 1 | Federal actions, not on the map 2' && !/bill/.test(legendItems()), legendItems());
  ok('the small-state buttons follow too, and the map says how to choose a place', !d.querySelector('#legTiles .leg-tile[class*="fill-"]') && /Show menu/.test(d.getElementById('legMap').getAttribute('aria-label')));

  // the Show menu and the shared place
  const opt = v => [...place.options].find(o => o.value === v);
  ok('the Show menu is one menu for the four sections, with Federal named for the body each is about: the federal agencies and courts here, Congress on Legislation, all three on All',
     opt('federal').textContent === 'Federal (agencies and courts)' && opt('TX').textContent === 'Texas' && (goto('govSwitchLegislation'), opt('federal').textContent === 'Federal (Congress)') &&
     (goto('govSwitchAll'), opt('federal').textContent === 'Federal (Congress, agencies and courts)') && (goto('govSwitchCases'), opt('federal').textContent === 'Federal (agencies and courts)') && (goto('govSwitchEnforcement'), opt('federal').textContent === 'Federal (agencies and courts)'), [...place.options].slice(0, 3).map(o => o.textContent).join(' | '));
  change(place, 'TX');
  ok('choosing Texas narrows the list to Texas (its one action), shows Clear, and the address says so',
     secs().map(titleOf).join('|') === 'Texas · 1 enforcement action' && idsOf(secs()[0]) === 'zz-tx-1' && d.getElementById('legReset').classList.contains('is-on') && w.location.hash === '#enforcement/texas', secs().map(titleOf).join('|') + ' ' + w.location.hash);
  goto('govSwitchCases');
  ok('the place is shared by the sections: Cases is on Texas too (none listed there), under an address of its own',
     place.value === 'TX' && secs().map(titleOf).join('|') === 'Texas · 0 key cases' && /None listed for Texas yet\./.test(secs()[0].textContent) && w.location.hash === '#cases/texas', secs().map(titleOf).join('|') + ' ' + w.location.hash);
  goto('govSwitchLegislation');
  ok('and so is Legislation: its menu and its card are on Texas, and its address is the bills\' own', legSel.value === 'TX' && d.querySelector('#legPanel .leg-panel-title').textContent === 'Texas' && w.location.hash === '#legislation', w.location.hash);
  goto('govSwitchEnforcement');
  ok('coming back to Enforcement is still Texas', place.value === 'TX' && w.location.hash === '#enforcement/texas' && secs().map(titleOf).join('|') === 'Texas · 1 enforcement action', w.location.hash);
  change(place, '');
  ok('Choosing All jurisdictions puts every jurisdiction back, here and on Legislation, and the address loses the place', place.value === '' && legSel.value === '' && w.location.hash === '#enforcement' && secs().map(titleOf)[0] === 'All jurisdictions · 3 enforcement actions', w.location.hash);

  // the routes
  const rf = load('index.html', '#enforcement/federal'), rt = load('index.html', '#cases/texas'), rn = load('index.html', '#enforcement/new-york'), rx = load('index.html', '#cases/nowhere');
  ok('#enforcement/federal, #cases/texas and a two-word state open the section on that place, with the address kept and the section\'s button pressed',
     bodyView(rf.d) === 'enforcement' && rf.d.getElementById('legStateSelect').value === 'federal' && rf.w.location.hash === '#enforcement/federal' &&
     bodyView(rt.d) === 'cases' && rt.d.getElementById('legStateSelect').value === 'TX' && rt.w.location.hash === '#cases/texas' && rt.d.getElementById('govSwitchCases').getAttribute('aria-pressed') === 'true' &&
     rn.d.getElementById('legStateSelect').value === 'NY' && rn.w.location.hash === '#enforcement/new-york',
     [rf, rt, rn].map(r => r.w.location.hash + ' ' + r.d.getElementById('legStateSelect').value).join(' | '));
  ok('a place that is not one (a stale or mistyped link) opens the section on every jurisdiction, and the address is rewritten to say so', bodyView(rx.d) === 'cases' && rx.d.getElementById('legStateSelect').value === '' && rx.w.location.hash === '#cases', rx.w.location.hash);

  // the topic filter, on Enforcement
  ok('the topic filter is the Papers chips: All, then only the topics some enforcement action bears on, in the order of the bills\' topics, each with the count it would leave',
     pills().map(b => b.dataset.topic).join() === 'all,chatbots,kids,bias,consumer' && pills().map(pillN).join() === '3,1,1,1,2' && pills()[0].getAttribute('aria-pressed') === 'true', pills().map(b => b.dataset.topic + ' ' + pillN(b)).join(' | '));
  fire(pill('consumer'), 'click');
  ok('choosing a topic narrows the list, marks the chip and counts it in the Reset button, with the section: Reset all (2)', secs().map(titleOf).join('|') === 'All jurisdictions · 2 enforcement actions' &&
     pill('consumer').getAttribute('aria-pressed') === 'true' && d.getElementById('legResetText').textContent === 'Reset all (2)' && d.getElementById('enfResultLine').textContent === '2 of 3 enforcement actions.', d.getElementById('enfResultLine').textContent);
  fire(pill('bias'), 'click');
  ok('two topics together mean both (consumer and bias leave the one action that bears on both), and a topic with nothing behind it is dimmed', idsOf(secs()[0]) === 'zz-fed-2' && pill('chatbots').disabled && pillN(pill('chatbots')) === 0, idsOf(secs()[0]));
  ok('the section\'s own chips narrow the map too: with consumer and bias chosen only the one federal action is left, so no state is shaded and the legend counts 51 with none and one federal action',
     shadedNow() === '' && legendItems() === 'No actions 51 | Federal actions, not on the map 1', legendItems());
  goto('govSwitchCases');
  ok('a topic picked on Enforcement is dropped on the way to Cases if Cases has no row for it (consumer), and kept if it has (bias): Cases shows its one case on bias',
     pills().map(b => b.dataset.topic).join() === 'all,work,bias,liability' && pill('bias').getAttribute('aria-pressed') === 'true' && pill('consumer') === undefined && secs().map(titleOf).join('|') === 'All jurisdictions · 1 key case' && idsOf(secs()[0]) === 'zz-case-1', pills().map(b => b.dataset.topic).join());
  fire(pills()[0], 'click');
  ok('All clears the topics: the chips on Cases are All, then the topics some case bears on, each with its count', pills().map(pillN).join() === '2,1,1,1' && pills()[0].getAttribute('aria-pressed') === 'true' && d.getElementById('legResetText').textContent === 'Reset all (1)', pills().map(b => b.dataset.topic + ' ' + pillN(b)).join(' | '));

  // Cases
  ok('Cases is its own section: its list has its own count and no action in it, and the caution that a ruling is only what that court held is in the note under it',
     /A ruling is only what that court held, and a case can still change/.test(secs()[0].querySelector('.leg-source').textContent) &&
     secs().map(titleOf).join('|') === 'All jurisdictions · 2 key cases' && !/Test Agency|Texas and Sample/.test(secs()[0].textContent), mast());
  ok('the cases are newest first', idsOf(secs()[0]) === 'zz-ca-1,zz-case-1', idsOf(secs()[0]));
  ok('on Cases the map follows Cases: California has a case and is the only state shaded, and the legend counts cases, with the federal one apart',
     shadedNow() === 'CA' && legendItems() === 'No cases 50 | 1 case 1 | Federal cases, not on the map 1', legendItems());
  const ca = d.querySelector('#enfLists tr[data-id="zz-ca-1"]'), noAsOf = d.querySelector('#enfLists tr[data-id="zz-case-1"]');
  ok('a source is a link only when it is http or https (a javascript: address is a dash), and a status with no date checked has no "checked"',
     !ca.children[4].querySelector('a') && ca.children[4].textContent === '–' && /Pending/.test(noAsOf.children[3].textContent) && !/checked/.test(noAsOf.children[3].textContent), ca.children[4].innerHTML);
  change(place, 'CA');
  ok('choosing California lists its one case, under an address of its own', secs().map(titleOf).join('|') === 'California · 1 key case' && idsOf(secs()[0]) === 'zz-ca-1' && w.location.hash === '#cases/california', secs().map(titleOf).join('|') + ' ' + w.location.hash);
  change(place, '');
  const search = d.getElementById('enfSearch');
  goto('govSwitchEnforcement');
  search.value = 'chatbot'; search.dispatchEvent(new w.Event('input', { bubbles: true })); await wait(260);
  ok('searching finds a row by any of its words, topics included, and Reset all clears the search too', idsOf(secs()[0]) === 'zz-tx-1' && (fire(d.getElementById('legReset'), 'click'), search.value === '' && bodyView(d) === 'all' && secs().map(titleOf).join('|') === 'All jurisdictions · 2 key cases|All jurisdictions · 3 enforcement actions'));
  goto('govSwitchEnforcement');

  // the map's card: Enforcement, Legislation and All each hold their own data, and All holds everything
  const labelsNow = () => [...d.querySelectorAll('#legPanel .leg-block .leg-label')].map(x => x.textContent).join();
  const kindLinks = () => [...d.querySelectorAll('#legPanel .leg-more-link[data-kind]')].map(b => b.dataset.kind).join();   // the "See more details below" links of the cases' and the enforcement actions' blocks
  const jumps = []; w.Element.prototype.scrollIntoView = function () { jumps.push(this.id); };   // a test DOM has no layout: record where the page is sent
  fire(d.querySelector('#legMap path[data-state="TX"]'), 'mouseover');
  ok('on Enforcement the card for Texas holds only what Enforcement lists there (its one action), with a "See more details below" link for it and nothing about the bills',
     labelsNow() === 'Enforcement actions' && /1 enforcement action/.test(card()) && !/key case/.test(card()) && kindLinks() === 'enforcement' && d.querySelector('#legPanel .leg-more-link').textContent === 'See more details below' && !/Bills/.test(card()) && !/Texas and Sample Inc\./.test(card()), card());
  fire(d.querySelector('#legPanel .leg-more-link[data-kind="enforcement"]'), 'click');
  ok('following it pins Texas, so the list below is about Texas, and takes the reader to that list: its title, with the keyboard on its table',
     place.value === 'TX' && secs().map(titleOf).join('|') === 'Texas · 1 enforcement action' && jumps.join() === 'enfTitle-enforcement' && d.activeElement === d.getElementById('enfTable-enforcement'), secs().map(titleOf).join('|') + ' / ' + jumps.join() + ' / ' + (d.activeElement && d.activeElement.id));
  change(place, '');
  fire(d.querySelector('#legMap path[data-state="AL"]'), 'mouseover');
  ok('a place with nothing listed gets no link: Alabama says None listed for it on Enforcement, and nothing to follow', /None listed for Alabama yet\./.test(card()) && !d.querySelector('#legPanel .leg-more-link'), card());
  goto('govSwitchLegislation');
  fire(d.querySelector('#legMap path[data-state="TX"]'), 'mouseover');
  ok('on Legislation the card for Texas holds the bills alone: nothing of what Enforcement and Cases list, and no midterm results', labelsNow() === 'Bills' && !/Enforcement|Pieces|Sample/.test(card()), card());
  goto('govSwitchAll');
  fire(d.querySelector('#legMap path[data-state="TX"]'), 'mouseover');
  ok('on All it holds everything, in the owner\'s order: the midterm results, the bills, then the key cases and the enforcement actions, each a block of its own', labelsNow() === '2026 Midterm results,Bills,Key cases,Enforcement actions', labelsNow());
  ok('the card for Texas has a block for each kind, key cases first: the cases say none are listed for Texas, with no link, and the enforcement actions count its one action, without its title, and end with "See more details below"',
     /Key cases\s*None listed for Texas yet\./.test(card()) && /Enforcement actions\s*1 enforcement action\.\s*See more details below/.test(card()) && !/Texas and Sample Inc\./.test(card()) && kindLinks() === 'enforcement', card() + ' | ' + kindLinks());
  fire(d.querySelector('#legMap path[data-state="CA"]'), 'mouseover');
  ok('the card for California counts its one case, without its title, and ends that block with "See more details below"; the enforcement actions have none for California and no link',
     /Key cases\s*1 key case\.\s*See more details below/.test(card()) && !/Doe v\. Sample Inc\./.test(card()) && /Enforcement actions\s*None listed for California yet\./.test(card()) && kindLinks() === 'case', card() + ' | ' + kindLinks());
  fire(d.querySelector('#legMap path[data-state="AL"]'), 'mouseover');
  ok('a state with none says "None listed" in each block (the list is kept by hand, so never "none") and has no link in either', (card().match(/None listed for Alabama yet\./g) || []).length === 2 && kindLinks() === '', card());
  fire(d.getElementById('legMapBox'), 'mouseleave'); await wait(520);
  ok('the card for the whole country counts everything, kind by kind, and has no link: it is not a place, and the lists below are in full', /United States/.test(card()) && /2 key cases, federal and in the states\./.test(card()) && /3 enforcement actions, federal and in the states\./.test(card()) && kindLinks() === '', card() + ' | ' + kindLinks());
  change(legSel, 'federal');
  ok('the card for Federal on All names both bodies, Congress and the federal agencies and courts, and counts the agencies\' and courts\' rows in a block for each kind, each with its link',
     /Federal \(Congress, agencies and courts\)/.test(card()) && /Bills in Congress/.test(card()) && /Key cases\s*1 key case\./.test(card()) && /Enforcement actions\s*2 enforcement actions\./.test(card()) && kindLinks() === 'case,enforcement', card() + ' | ' + kindLinks());

  // All's page: the midterm results, the bills, then the key cases and the enforcement actions, narrowed together by the bills' own search and chips, by the place and by the Sort menu
  fire(d.getElementById('legReset'), 'click');
  goto('govSwitchAll');
  const order = () => [...d.querySelectorAll('#legResultsSection, #legBillsSection, #enfLists section')].map(e => e.id || e.dataset.kind).join();
  const resultLine = () => d.getElementById('legResultLine').textContent;
  const nBillsAll = Number((/^([\d,]+) of /.exec(resultLine()) || [])[1].replace(/,/g, ''));
  ok('on All the page holds the midterm results first, then the bills, then the key cases, then the enforcement actions, each with its own count',
     order() === 'legResultsSection,legBillsSection,case,enforcement' && secs().map(titleOf).join('|') === 'All jurisdictions · 2 key cases|All jurisdictions · 3 enforcement actions' && idsOf(secs()[0]) === 'zz-ca-1,zz-case-1' && idsOf(secs()[1]) === 'zz-tx-1,zz-fed-1,zz-fed-2', order() + ' ' + secs().map(titleOf).join('|'));
  ok('in each list the note is right under the table and above the divider under the page numbers: heading, table, note, pager; and the notes carry the cautions the two blurbs used to: an allegation is not a finding, and a ruling is only what that court held',
     secs().length === 2 && secs().every(s => [...s.children].map(c => c.tagName + (c.classList.contains('leg-source') ? '.note' : '')).join() === 'H3,DIV,P.note,NAV') && /^Each entry is checked against the court's own page/.test(secs()[0].querySelector('.leg-source').textContent) && /A ruling is only what that court held/.test(secs()[0].querySelector('.leg-source').textContent) &&
     /^Each entry is checked against the agency's or attorney general's own page/.test(secs()[1].querySelector('.leg-source').textContent) && /an allegation is described as an allegation/.test(secs()[1].querySelector('.leg-source').textContent), secs().map(s => [...s.children].map(c => c.tagName).join()).join(' | '));
  ok('the result line counts the bills and then each list, on its own and never added together',
     resultLine() === `${nBillsAll.toLocaleString('en-US')} of ${nBillsAll.toLocaleString('en-US')} bills, 2 of 2 key cases and 3 of 3 enforcement actions.`, resultLine());
  ok('the masthead is the same words on All with rows of both kinds and the bills loaded', mast() === GOV_BLURB, mast());
  const allMastText = mast();
  const mastOf = () => d.getElementById('headerTabDescLede').textContent.trim() + ' | ' + mast();
  const seenMasts = ['govSwitchAll', 'govSwitchCases', 'govSwitchEnforcement', 'govSwitchLegislation', 'govSwitchAll'].map(sid => (goto(sid), mastOf()));
  ok('every section has the same header and the same blurb, whichever is open: one masthead for the tab (the owner, 2026-11-18)', new Set(seenMasts).size === 1 && /^What is government doing about AI\? \| /.test(seenMasts[0]), seenMasts.join('\n'));
  ok('the legend counts the three together, as items, and says so', /Items are the bills, key cases and enforcement actions, counted together/.test(d.getElementById('legLegend').textContent) && /Federal items, not on the map/.test(d.getElementById('legLegend').textContent) && !/Federal bills/.test(d.getElementById('legLegend').textContent));
  const bar = d.getElementById('legSearch');
  bar.value = 'chatbot'; bar.dispatchEvent(new w.Event('input', { bubbles: true })); await wait(260);
  ok('the bills\' search narrows the lists too: "chatbot" leaves the one enforcement action about chatbots and no key case, and the result line says so',
     idsOf(secs()[1]) === 'zz-tx-1' && secs().map(titleOf).join('|') === 'All jurisdictions · 0 key cases|All jurisdictions · 1 enforcement action' && /, 0 of 2 key cases and 1 of 3 enforcement actions\.$/.test(resultLine()) && /No key cases match the search and filters chosen\./.test(secs()[0].textContent), resultLine());
  fire(d.getElementById('legReset'), 'click');
  fire(d.querySelector('#legTopicPills button[data-topic="bias"]'), 'click');
  ok('so do the bills\' topic chips: Bias and automated decisions leaves one key case and one enforcement action', idsOf(secs()[0]) === 'zz-case-1' && idsOf(secs()[1]) === 'zz-fed-2' && /, 1 of 2 key cases and 1 of 3 enforcement actions\.$/.test(resultLine()), resultLine());
  fire(d.getElementById('legReset'), 'click');
  change(place, 'TX');
  ok('a place narrows the lists as it narrows the bills and the results: Texas has no key case and one enforcement action, and the address stays #all',
     secs().map(titleOf).join('|') === 'Texas · 0 key cases|Texas · 1 enforcement action' && idsOf(secs()[1]) === 'zz-tx-1' && d.getElementById('legResultsScope').textContent === 'Texas · 2026 Midterm results' && w.location.hash === '#all', secs().map(titleOf).join('|') + ' ' + w.location.hash);
  fire(d.getElementById('legReset'), 'click');
  change(d.getElementById('legSort'), 'oldest');
  ok('the Sort menu orders every list: Oldest puts the 2025 case and the December 2025 action first', idsOf(secs()[0]) === 'zz-case-1,zz-ca-1' && idsOf(secs()[1]) === 'zz-fed-2,zz-fed-1,zz-tx-1', idsOf(secs()[0]) + ' ' + idsOf(secs()[1]));
  change(d.getElementById('legSort'), 'recent');
  goto('govSwitchLegislation');
  ok('Legislation holds the bills alone: no list of cases or enforcement actions, no midterm results table, and the same masthead as every other section',
     !shownBlock('enforcementArea') && !shownBlock('legResultsSection') && shownBlock('legBillsSection') && mast() === allMastText, mast());

  // the Reset button puts the whole tab back as it opens (the owner: "reset should also reset views"): no place, no filter in ANY section, the order, and the All view; its count says how many things differ
  goto('govSwitchLegislation');
  fire(d.querySelector('#legTopicPills button[data-topic="bias"]'), 'click');
  goto('govSwitchEnforcement');
  const resetText = () => d.getElementById('legResetText').textContent;
  ok('on Enforcement the Reset button counts a topic chosen on Legislation, which is not on this page, and the section itself: Reset all (2)', resetText() === 'Reset all (2)' && d.getElementById('legReset').classList.contains('is-on'), resetText());
  fire(pill('consumer'), 'click');
  change(place, 'TX');
  change(d.getElementById('enfSort'), 'oldest');
  ok('it counts this section\'s own chip, the place and the order as well: Reset all (5)', resetText() === 'Reset all (5)', resetText());
  fire(d.getElementById('legReset'), 'click');
  ok('pressing it returns to All and clears the chip, the place and the order, and the address is #all', bodyView(d) === 'all' && place.value === '' && w.location.hash === '#all' && resetText() === 'Reset all' && d.getElementById('legSort').value === 'recent', resetText() + ' ' + w.location.hash);
  goto('govSwitchLegislation');
  ok('the topic chosen on Legislation, which was not on the page when it was pressed, is cleared too', d.querySelector('#legTopicPills button[data-topic="bias"]').getAttribute('aria-pressed') === 'false' && d.querySelector('#legTopicPills button[data-topic="all"]').getAttribute('aria-pressed') === 'true' && resetText() === 'Reset all (1)', resetText());
  goto('govSwitchEnforcement');
  ok('and so is the chip chosen on Enforcement: it is not still chosen when the section is open again', pills()[0].getAttribute('aria-pressed') === 'true' && pills().every(b => b.dataset.topic === 'all' || b.getAttribute('aria-pressed') === 'false'), pills().map(b => b.dataset.topic + ':' + b.getAttribute('aria-pressed')).join());

  // paging (the owner, 2026-11-18: a max of ten a page): nine more enforcement rows make twelve, so the list fills a page and spills onto a second
  const extra = Array.from({ length: 9 }, (_, i) => ({ id: `zz-pg-${i + 1}`, kind: 'enforcement', level: 'federal', body: 'Test Agency', date: `2024-0${i + 1}-15`, title: `Paging test ${i + 1}`, uses: ['consumer'],
    what: 'A row that only exists to fill a page.', outcome: 'Settlement', status: 'Final', asOf: '2026-11-17', url: `https://example.org/pg/${i + 1}` }));
  w.eval(`LEGISLATION_ACTIONS.push(${extra.map(r => JSON.stringify(r)).join(',')})`);
  refresh();
  goto('govSwitchEnforcement');
  const pager = () => d.querySelector('#enfLists nav.pager'), status = () => (pager().querySelector('.pager-status') || {}).textContent;
  ok('a list of twelve shows ten, says so in its title (the count is every row in view, not the page\'s), and has a pager that counts two pages',
     secs().map(titleOf).join('|') === 'All jurisdictions · 12 enforcement actions' && secs()[0].querySelectorAll('tbody tr').length === 10 && !pager().hidden && status() === 'Page 1 of 2' && pager().getAttribute('aria-label') === 'Pages of enforcement actions', secs().map(titleOf).join('|') + ' ' + status());
  fire(pager().querySelector('button[aria-label="Next page"]'), 'click');
  ok('Next turns to the second page, which holds the other two (the oldest), takes the keyboard to the list, and the title still counts twelve',
     idsOf(secs()[0]) === 'zz-pg-2,zz-pg-1' && status() === 'Page 2 of 2' && d.activeElement === d.getElementById('enfTable-enforcement') && /· 12 enforcement actions/.test(titleOf(secs()[0])), idsOf(secs()[0]));
  fire(pager().querySelector('button[aria-label="Previous page"]'), 'click');
  ok('Previous goes back to page one, newest first: the Texas action, then the two federal ones, then the paging rows from the newest', idsOf(secs()[0]).startsWith('zz-tx-1,zz-fed-1,zz-fed-2,zz-pg-9,zz-pg-8') && secs()[0].querySelectorAll('tbody tr').length === 10 && status() === 'Page 1 of 2');
  fire(pager().querySelector('button[aria-label="Next page"]'), 'click');
  change(d.getElementById('enfSort'), 'oldest');
  ok('changing the order starts again at page one (a page the reader turned to is not kept when what is in view changes)', status() === 'Page 1 of 2' && idsOf(secs()[0]).startsWith('zz-pg-1,zz-pg-2'), status() + ' ' + idsOf(secs()[0]));
  change(d.getElementById('enfSort'), 'recent');
  fire(pager().querySelector('button[aria-label="Next page"]'), 'click');
  const lastSearch = d.getElementById('enfSearch');
  lastSearch.value = 'paging'; lastSearch.dispatchEvent(new w.Event('input', { bubbles: true })); await wait(260);
  ok('a search starts again at page one, and a result that fits on one page has no pager', secs().map(titleOf).join('|') === 'All jurisdictions · 9 enforcement actions' && pager().hidden && secs()[0].querySelectorAll('tbody tr').length === 9, secs().map(titleOf).join('|'));
  fire(d.getElementById('legReset'), 'click');
  goto('govSwitchAll');
  ok('on All each list has its own pager: the enforcement actions have two pages, the two key cases none',
     [...d.querySelectorAll('#enfLists nav.pager')].map(n => n.dataset.kind + ':' + (n.hidden ? 'none' : (n.querySelector('.pager-status') || {}).textContent)).join('|') === 'case:none|enforcement:Page 1 of 2' && secs().map(titleOf).join('|') === 'All jurisdictions · 2 key cases|All jurisdictions · 12 enforcement actions', secs().map(titleOf).join('|'));
  fire(d.querySelector('#enfLists nav.pager[data-kind="enforcement"] button[aria-label="Next page"]'), 'click');
  ok('and turning one list\'s page leaves the other alone', idsOf(secs()[1]) === 'zz-pg-2,zz-pg-1' && idsOf(secs()[0]) === 'zz-ca-1,zz-case-1', idsOf(secs()[1]));
  w.eval("for (let i = LEGISLATION_ACTIONS.length - 1; i >= 0; i--) if (/^zz-pg-/.test(LEGISLATION_ACTIONS[i].id)) LEGISLATION_ACTIONS.splice(i, 1)");
  refresh();
})();

/* ── Enforcement and Cases: the real rows, as they ship ───────────────────────────────────────────────────────────────
   The block above uses rows of its own, so it cannot say what the real file does to the page. These checks load each section as it ships and compare it with the rows in data/legislation-actions.js, whatever
   they are, so they stay true as rows are added: a section's list is on when the file has a row of its kind; its count is the number of rows of its kind, and its masthead says the same count in words; every
   row shows who acted, the matter and a link to its own source, newest first; a place's address lists that place's rows; and the map's card for a state counts that state's rows, kind by kind (and says "None
   listed" for one with none). */
{
  const ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' ');
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const spell = n => n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
  const KINDS = [['enforcement', 'enforcement action', 'enforcement actions', 'enforcement'], ['case', 'key case', 'key cases', 'cases']];
  const secsOf = doc => [...doc.querySelectorAll('#enfLists section')], titleOf = s => s.querySelector('.leg-section-title').textContent.trim();
  const countOf = (rows, k) => rows.filter(a => a.kind === k).length;
  const word = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  let realRows = null;
  for (const [kind, one, many, route] of KINDS) {
    const { w, d } = load('index.html', '#' + route);
    const real = realRows = JSON.parse(w.eval('JSON.stringify(LEGISLATION_ACTIONS)')), mine = real.filter(a => a.kind === kind);
    const mast = () => d.getElementById('headerTabDescText').textContent;
    const pathFor = code => d.querySelector(`#legMap path[data-state="${code}"]`);
    const nameOf = code => ((d.getElementById('legStateSelect') ? [...d.getElementById('legStateSelect').options] : []).find(o => o.value === code) || { textContent: '' }).textContent.trim();
    ok(`${route}: the list is on exactly when the real file has a row of its kind: the placeholder note gives way to the list`, (mine.length > 0) === (d.getElementById('enfPlaceholder').hidden && !d.getElementById('enfLive').hidden));
    if (!mine.length) continue;
    ok(`${route}: the list's count is the number of real rows of its kind, and no row of another kind is in it; a page holds at most ten, and the pager is there exactly when there are more`,
       secsOf(d).map(titleOf).join('|') === `All jurisdictions · ${word(mine.length, one, many)}` && secsOf(d).length === 1 && secsOf(d)[0].querySelectorAll('tbody tr').length === Math.min(mine.length, 10) &&
       d.querySelector('#enfLists nav.pager').hidden === (mine.length <= 10) && (mine.length <= 10 || d.querySelector('#enfLists .pager-status').textContent === `Page 1 of ${Math.ceil(mine.length / 10)}`), secsOf(d).map(titleOf).join('|'));
    // every row, page by page: the pager is walked to its last page and back, copying each row before the next page replaces it
    const walked = [];
    for (let guard = 0; guard < 20; guard++) {
      [...d.querySelectorAll('#enfLists tbody tr:not(.leg-empty-row)')].forEach(tr => walked.push({ id: tr.dataset.id, body: tr.children[1].textContent, matter: tr.children[2].textContent, href: ((tr.children[4].querySelector('a') || {}).getAttribute || (() => ''))
        .call(tr.children[4].querySelector('a') || {}, 'href') }));
      const next = d.querySelector('#enfLists nav.pager:not([hidden]) button[aria-label="Next page"]');
      if (!next || next.disabled) break;
      next.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    }
    const back = d.querySelector('#enfLists nav.pager:not([hidden]) button[data-page="1"]');
    if (back) back.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    ok(`${route}: walking the pager lists every real row once, ten to a page, and the first page is back when it is walked back`, walked.length === mine.length && new Set(walked.map(r => r.id)).size === mine.length && secsOf(d)[0].querySelectorAll('tbody tr').length === Math.min(mine.length, 10), walked.length + ' of ' + mine.length);
    const lead = `${spell(mine.length)} ${mine.length === 1 ? one : many}`;
    ok(`${route}: the tab's masthead is the owner's blurb, which quotes no count, so it says the same with ${mine.length} ${mine.length === 1 ? one : many} as with any other number`, mast() === GOV_BLURB, mast().slice(0, 140));
    const missing = mine.filter(a => {
      const r = walked.find(x => x.id === a.id);
      return !(r && r.body === a.body && r.matter.includes(a.title) && r.matter.includes(a.what.slice(0, 40)) && r.href === a.url);
    }).map(a => a.id);
    ok(`${route}: every real row of its kind is listed with who acted, its title, its words, and a link to the agency's or court's own page (the very address in the data)`, missing.length === 0, missing.join(', '));
    ok(`${route}: the list is newest first, from the first page to the last`, (() => { const dates = walked.map(r => real.find(a => a.id === r.id).date); return dates.every((x, j) => j === 0 || dates[j - 1] >= x); })());
    const st = mine.find(a => a.state && pathFor(a.state));
    if (st) {
      const rows = mine.filter(a => a.state === st.state), name = nameOf(st.state), slug = name.toLowerCase().replace(/\s+/g, '-');
      const pg = load('index.html', `#${route}/${slug}`);
      ok(`#${route}/${slug} lists only ${name}'s rows of its kind (${rows.length}), with its own count`,
         pg.d.getElementById('legStateSelect').value === st.state && secsOf(pg.d).map(titleOf).join('|') === `${name} · ${word(rows.length, one, many)}`, secsOf(pg.d).map(titleOf).join('|'));
    }
  }
  // the map's card, once, on All (the one card that holds both kinds): it counts a state's rows kind by kind, with no titles, and links to each list that has some there
  const { w, d } = load('index.html', '#all');
  const real = realRows || [], card = () => d.getElementById('legPanel').textContent.replace(/\s+/g, ' ').trim();
  const pathFor = code => d.querySelector(`#legMap path[data-state="${code}"]`);
  const nameOf = code => ((d.getElementById('legStateSelect') ? [...d.getElementById('legStateSelect').options] : []).find(o => o.value === code) || { textContent: '' }).textContent.trim();
  const st = real.find(a => a.state && pathFor(a.state));
  if (st) {
    const rows = real.filter(a => a.state === st.state), name = nameOf(st.state), slug = name.toLowerCase().replace(/\s+/g, '-');
    pathFor(st.state).dispatchEvent(new w.MouseEvent('mouseover', { bubbles: true }));
    const kindsAll = [...KINDS].reverse();   // All's order: the key cases, then the enforcement actions
    const blocks = [...d.querySelectorAll('#legPanel .leg-block')].filter(b => ['Key cases', 'Enforcement actions'].includes(b.querySelector('.leg-label').textContent));
    ok(`the map's card for ${name} has a block for each kind, key cases first: its count, with no titles, where it has rows, and a "See more details below" link only for a kind that has some there; "None listed" and no link where it has none`,
       blocks.map(b => b.querySelector('.leg-label').textContent).join() === 'Key cases,Enforcement actions' && kindsAll.every(([k, one, many], i) => {
         const n = countOf(rows, k), b = blocks[i], link = b.querySelector('.leg-more-link');
         return n ? b.textContent.includes(word(n, one, many)) && rows.filter(a => a.kind === k).every(a => !b.textContent.includes(a.title)) && !!link && link.dataset.kind === k && link.textContent === 'See more details below'
                  : b.textContent.includes(`None listed for ${name} yet.`) && !link;
       }), card());
  }
  const none = Object.keys(JSON.parse(w.eval('JSON.stringify(US_MAP.states)'))).find(c => !real.some(a => a.state === c) && pathFor(c));
  if (real.length && none) {
    pathFor(none).dispatchEvent(new w.MouseEvent('mouseover', { bubbles: true }));
    const nm = d.querySelector('#legPanel .leg-panel-title').textContent.trim();
    ok('a state with none listed says "None listed" for it (the list is kept by hand, so never "none") and has no link', card().includes(`None listed for ${nm} yet.`) && !d.querySelector('#legPanel .leg-more-link[data-kind]'), card());
  }
}

/* ── Government action: one toolbar, the topics above the search, and the map in every section ──────────────────────────
   The owner's request, 2026-11-18: the Show menu next to the Cases | Enforcement | Legislation switch in every view; the topic chips above the search in every view; on Legislation the Status menu next to the Show
   menu, the checkbox (now "Include bills that only lightly mention AI") next to Status, and the topics always showing; the Legislation map visible in every view; and no view of its own for the midterm results (their
   data stays, by state, in the card). The four sections (All holds everything; Legislation, Enforcement and Cases each hold their own data alone, the owner's 2026-11-18 request for an All view) are one area (#legislationArea), so each check runs on each section. */
(async () => {
  const SECTIONS = [['all', 'All'], ['legislation', 'Legislation'], ['enforcement', 'Enforcement'], ['cases', 'Cases']];
  for (const [route, name] of SECTIONS) {
    const { w, d } = load('index.html', '#' + route);
    await settle(10);
    const isAll = route === 'all', isLeg = route === 'legislation', leg = isAll || isLeg;   // leg: the bills' own controls (Status, the checkbox, the chips, the search, Sort) are the ones showing
    const shown = el => { for (let n = el; n && n !== d.body; n = n.parentElement) if (w.getComputedStyle(n).display === 'none') return false; return true; };
    const id = x => d.getElementById(x), before = (a, b) => !!(id(a).compareDocumentPosition(id(b)) & 4);
    ok(`${name}: the Show menu comes right after the Cases | Enforcement | Legislation switch, in the same toolbar row`,
       d.querySelector('#legSticky .leg-controls-main').firstElementChild === id('govSwitch') && id('govSwitch').nextElementSibling === id('legShowPair') && shown(id('govSwitch')) && shown(id('legShowPair')));
    ok(`${name}: ${leg ? 'the Status menu comes right after the Show menu (and its Clear button), and the checkbox right after the Status menu' : 'the bills\' own Status menu and checkbox are not shown'}`,
       leg ? (id('legShowPair').nextElementSibling === id('legStatusPair') && id('legStatusPair').nextElementSibling === id('legPassingWrap') && shown(id('legStatusPair')) && shown(id('legPassingWrap')))
           : (!shown(id('legStatusPair')) && !shown(id('legPassingWrap'))));
    const chipsId = leg ? 'legTopicPills' : 'enfTopicPills', otherChips = leg ? 'enfTopicPills' : 'legTopicPills', searchId = leg ? 'legSearch' : 'enfSearch', otherSearch = leg ? 'enfSearch' : 'legSearch';
    ok(`${name}: the topic chips are above the search bar and showing, and the other section's chips and search are not`,
       before(chipsId, searchId) && shown(id(chipsId)) && !shown(id(otherChips)) && shown(id(searchId)) && !shown(id(otherSearch)) && id(chipsId).querySelectorAll('button[data-topic]').length > 1, route);
    const noun = { all: 'items', legislation: 'bills', enforcement: 'actions', cases: 'cases' }[route];   // what the map counts, and the legend says, in each section
    ok(`${name}: the map and its card are showing, shaded by ${noun}, with the sources under it`,
       shown(id('legStage')) && d.querySelectorAll('#legMap path.leg-state').length === 51 && new RegExp(`Federal ${noun}, not on the map`).test(id('legLegend').textContent) && (leg || !/bills/.test(id('legLegend').textContent)) &&
       id('legMapSource').textContent.startsWith(leg ? 'Sources: ' : 'Source: ') && id('legPanel').textContent.includes('United States') && !d.getElementById('legLayerResults') && !d.getElementById('legOfficeToggle'));
    ok(`${name}: the section's own lists are showing and the others' are not: the bills on Legislation and All, the cases and enforcement lists on All, Enforcement and Cases, and the midterm results table, first, on All alone`,
       shown(id('legBillsSection')) === leg && shown(id('enforcementArea')) === !isLeg && shown(id('legResultsSection')) === isAll &&
       (!isAll || (!!(id('legResultsSection').compareDocumentPosition(id('legBillsSection')) & 4) && !!(id('legBillsSection').compareDocumentPosition(id('enforcementArea')) & 4))), route);
    const cardLabels = [...d.querySelectorAll('#legPanel .leg-block .leg-label')].map(x => x.textContent);
    const ownLabel = route === 'cases' ? 'Key cases' : 'Enforcement actions';
    ok(`${name}: the card holds ${isAll ? 'everything, the midterm results first, then the bills, then the key cases and the enforcement actions' : isLeg ? 'the bills alone' : 'this section\'s own block alone'}`,
       isAll ? cardLabels.join() === '2026 Midterm results,National totals,Bills,Key cases,Enforcement actions' : isLeg ? cardLabels.join() === 'Bills' : cardLabels.join() === ownLabel, cardLabels.join());
    const sortId = leg ? 'legSort' : 'enfSort', otherSort = leg ? 'enfSort' : 'legSort';
    ok(`${name}: there is a Sort menu in the search bar's first row after the search box, with the three choices, and the other section's menu is not showing`,
       shown(id(sortId)) && !shown(id(otherSort)) && id(sortId).closest('.controls-row') === id(searchId).closest('.controls-row') && before(searchId, sortId) &&
       [...id(sortId).options].map(o => o.value).join() === 'recent,oldest,jurisdiction' && [...id(sortId).options].map(o => o.textContent).join() === (leg ? 'Most recent action,Oldest action,Jurisdiction' : 'Most recent,Oldest,Jurisdiction'), route);
    ok(`${name}: there is no More filters toggle, and the Show menu says "All jurisdictions" first`,
       !d.querySelector('#legislationArea .more-toggle') && id('legStateSelect').options[0].textContent === 'All jurisdictions');
    if (leg) continue;
    // on Enforcement and Cases the map follows the section: a state is shaded when it has rows of the kind, the federal rows are counted apart in the legend, the lists' own chips narrow it, and the bills' own filters do not apply
    const path = code => d.querySelector(`#legMap path[data-state="${code}"]`), fire = (el, type) => el.dispatchEvent(new w.MouseEvent(type, { bubbles: true }));
    const real = JSON.parse(w.eval('JSON.stringify(LEGISLATION_ACTIONS)')), kind = route === 'cases' ? 'case' : 'enforcement', mine = real.filter(a => a.kind === kind), st = real.find(a => a.kind === kind && a.state && path(a.state));
    const items = () => [...d.querySelectorAll('#legLegend .leg-legend-item')].map(i => i.textContent.replace(/\s+/g, ' ').trim());
    const shadedNow = () => [...d.querySelectorAll('#legMap path.leg-state')].filter(p => /fill-b/.test(p.getAttribute('class'))).map(p => p.getAttribute('data-state')).sort().join();
    const withRows = [...new Set(mine.filter(a => a.state && path(a.state)).map(a => a.state))].sort(), nFedRows = mine.filter(a => a.level === 'federal').length;
    ok(`${name}: the map shades exactly the states that have ${noun} listed (${withRows.join(', ') || 'none'}), and the legend counts the other states as having none and the ${nFedRows} federal ${noun} apart`,
       shadedNow() === withRows.join() && items().includes(`No ${noun} ${51 - withRows.length}`) && items().includes(`Federal ${noun}, not on the map ${nFedRows}`) && !/bills/.test(items().join()), items().join(' | '));
    const topicChip = [...d.querySelectorAll('#enfTopicPills button[data-topic]')].find(b => b.dataset.topic !== 'all' && !b.disabled && mine.some(a => !(a.uses || []).includes(b.dataset.topic)));
    if (topicChip) {
      const tp = topicChip.dataset.topic, left = mine.filter(a => (a.uses || []).includes(tp)), leftStates = [...new Set(left.filter(a => a.state && path(a.state)).map(a => a.state))].sort().join(), leftFed = left.filter(a => a.level === 'federal').length;
      fire(topicChip, 'click');
      ok(`${name}: the section's own topic chips narrow the map as well: with ${tp} chosen it shades ${leftStates || 'no state'} and counts ${leftFed} federal ${leftFed === 1 ? noun.replace(/s$/, '') : noun}`,
         shadedNow() === leftStates && items().includes(`Federal ${noun}, not on the map ${leftFed}`), items().join(' | '));
      fire(d.querySelector('#enfTopicPills button[data-topic="all"]'), 'click');
    }
    // the Sort menu on the real rows: Most recent by default, Oldest, and Jurisdiction (the federal ones first, then the states A to Z, each place's rows newest first)
    const sortSel = id('enfSort'), setSort = v => { sortSel.value = v; sortSel.dispatchEvent(new w.Event('change', { bubbles: true })); };
    const listIds = () => [...id('enfLists').querySelectorAll('tbody tr:not(.leg-empty-row)')].map(r => r.getAttribute('data-id'));
    const stateNameOf = code => [...id('legStateSelect').options].find(o => o.value === code).textContent;
    const byNewest = (a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title), byOldest = (a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title);
    ok(`${name}: Most recent is the default and lists the rows newest first (the first ten)`, sortSel.value === 'recent' && listIds().join() === mine.slice().sort(byNewest).slice(0, 10).map(a => a.id).join(), listIds().join());
    setSort('oldest');
    ok(`${name}: Oldest lists them oldest first (the first ten)`, listIds().join() === mine.slice().sort(byOldest).slice(0, 10).map(a => a.id).join(), listIds().join());
    setSort('jurisdiction');
    ok(`${name}: Jurisdiction lists the federal ones first, then the states A to Z, each place's rows newest first (the first ten)`,
       listIds().join() === mine.slice().sort((a, b) => ((a.level === 'federal' ? 0 : 1) - (b.level === 'federal' ? 0 : 1)) || (a.state ? stateNameOf(a.state).localeCompare(stateNameOf(b.state)) : 0) || byNewest(a, b)).slice(0, 10).map(a => a.id).join(), listIds().join());
    setSort('recent');
    const nameOfPlace = code => [...id('legStateSelect').options].find(o => o.value === code).textContent;
    const showMenu = id('legStateSelect'); showMenu.value = 'federal'; showMenu.dispatchEvent(new w.Event('change', { bubbles: true }));
    const fedLabels = [...d.querySelectorAll('#legPanel .leg-block .leg-label')].map(x => x.textContent);
    ok(`${name}: choosing Federal names the agencies and courts in the card as well: the title says so, the section's block is the only one, and it has its link exactly when there are federal rows`,
       d.querySelector('#legPanel .leg-panel-title').textContent === 'Federal (agencies and courts)' && fedLabels.join() === ownLabel && (!!d.querySelector('#legPanel .leg-more-link[data-kind]') === mine.some(a => a.level === 'federal')), fedLabels.join());
    showMenu.value = ''; showMenu.dispatchEvent(new w.Event('change', { bubbles: true }));   // let go of Federal with the menu: the Reset button would leave this section
    // a place with no row of the kind gets no link, only the words that nothing is listed for it
    const bare = ['AL', 'IA', 'KS'].find(c => !mine.some(a => a.state === c) && path(c));
    fire(path(bare), 'mouseover');
    ok(`${name}: ${nameOfPlace(bare)} has no ${noun} listed, so its card says None listed for it and has no "See more details below" link`, d.getElementById('legPanel').textContent.includes(`None listed for ${nameOfPlace(bare)} yet.`) && !d.querySelector('#legPanel .leg-more-link'), d.getElementById('legPanel').textContent);
    if (st) {
      fire(path(st.state), 'click');
      const nHere = real.filter(a => a.kind === kind && a.state === st.state).length, stateName = [...id('legStateSelect').options].find(o => o.value === st.state).textContent;
      ok(`${name}: clicking ${stateName} on the map pins it, narrows the list to its rows and puts it in the address`,
         id('legStateSelect').value === st.state && id('legReset').classList.contains('is-on') && w.location.hash === `#${route}/${stateName.toLowerCase().replace(/\s+/g, '-')}` &&
         id('enfLists').querySelector('.leg-section-title').textContent.trim().startsWith(`${stateName} · ${nHere} `), id('enfLists').querySelector('.leg-section-title').textContent + ' ' + w.location.hash);
      fire(path(st.state), 'mouseover');
      const stateLabels = [...d.querySelectorAll('#legPanel .leg-block .leg-label')].map(x => x.textContent);
      const kindLink = d.querySelector('#legPanel .leg-more-link');
      ok(`${name}: the card for ${stateName} holds this section's block alone, with a "See more details below" link for its rows, and nothing about the bills or the midterm results`,
         stateLabels.join() === ownLabel && !!kindLink && kindLink.textContent === 'See more details below' && kindLink.getAttribute('data-kind') === kind && !/Bills|Midterm/.test(d.getElementById('legPanel').textContent), stateLabels.join());
    }
  }
  // the bills' own filters apply on Legislation and All only: set on Legislation, they show there and on All and nowhere else
  const { w, d } = load('index.html', '#legislation');
  await settle(10);
  const id = x => d.getElementById(x), fire = (el, type) => el.dispatchEvent(new w.MouseEvent(type, { bubbles: true })), legend = () => id('legLegend').textContent;
  const fedIn = () => Number((/Federal bills, not on the map\s*([\d,]+)/.exec(legend()) || [])[1].replace(/,/g, ''));
  const chip = [...d.querySelectorAll('#legTopicPills button[data-topic]')].find(b => !['all', 'none'].includes(b.dataset.topic) && !b.disabled && Number(b.querySelector('.kw-count').textContent.replace(/,/g, '')) > 0 && fedIn() > 0);
  const fedAll = fedIn();
  fire(chip, 'click');
  const fedFiltered = fedIn();
  ok('on Legislation a topic narrows the map\'s counts; on Enforcement the bills\' topic does not apply (the legend counts actions, not bills), and coming back finds the topic still chosen',
     fedFiltered < fedAll && (fire(id('govSwitchEnforcement'), 'click'), !/bills/.test(legend()) && /Federal actions, not on the map/.test(legend())) && (fire(id('govSwitchLegislation'), 'click'), fedIn() === fedFiltered && chip.getAttribute('aria-pressed') === 'true'), `${fedAll} / ${fedFiltered}`);
})();

/* ── the Landscape masthead: the number of areas comes from the data ────────────────────
   The map's masthead says in how many areas it draws the policies. That figure is computed from the data the map is drawn from
   (the count of policies was typed once as "Twenty-seven" and went stale at 32, and the owner had it taken out on 2026-11-18, so the
   masthead starts "Policy interventions" with no number), so the masthead is checked against what the page actually lists. */
{
  const { d } = load('index.html', '#policy');
  const ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' ');
  const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
  const num = word => { word = word.toLowerCase(); if (ONES.includes(word)) return ONES.indexOf(word); const [t, o] = word.split('-'); return (TENS[t] || NaN) + (o ? ONES.indexOf(o) : 0); };
  const text = d.getElementById('headerTabDescText').textContent;
  const m = /^Policy interventions grouped into (\S+) policy areas, listed alphabetically within each\. Click any policy for rationale, precedents, and supporting research\.$/.exec(text);
  const listed = d.querySelectorAll('#policyArea .pol-cat-card').length, rows = d.querySelectorAll('#policyArea .pol-cat-row').length;
  ok('the Landscape masthead no longer counts the policies, and still says how many areas the map draws them in, computed from the map', !!m && num(m[1]) === rows && rows > 0 && listed > 0, `${text} | listed ${listed} in ${rows} rows`);
}

/* ── Landscape: the Links graph keeps its labels apart ──────────────────────────────────────────────────────
   The graph's force layout treats a node as a point, but every node carries a label to its right, so labels sat on top of each
   other (7 pairs of labels and 8 labels over another node's dot, at the old 9.5px size; the labels are 13px now, which would be
   worse still). A pass after the physics pushes the dot-and-label boxes apart. jsdom has no layout, so this reads the boxes the
   layout wrote into the SVG: each label's foreignObject (x, y, width, height) and the dot beside it. */
{
  const { w, d } = load('index.html', '#policy');
  const links = [...d.querySelectorAll('.pol-subview-btn')].find(b => /^links/i.test(b.textContent.trim()));
  links.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const boxes = [...d.querySelectorAll('.pol-links-node')].map(g => {
    const fo = g.querySelector('foreignObject'), at = n => +fo.getAttribute(n), cx = +g.querySelector('.pol-links-node-dot').getAttribute('cx');
    return { t: fo.textContent, l: cx - 10, r: at('x') + at('width'), top: at('y'), b: at('y') + at('height') };
  });
  const touching = [];
  boxes.forEach((A, i) => boxes.slice(i + 1).forEach(B => { if (A.l < B.r && B.l < A.r && A.top < B.b && B.top < A.b) touching.push(`${A.t} / ${B.t}`); }));
  ok('the Links graph draws every policy and lays its labels out so that none sits on another label or dot',
     boxes.length === w.eval('POLICY_DATA.length') && boxes.length > 0 && touching.length === 0, `${boxes.length} nodes, touching: ${touching.slice(0, 4).join('; ')}`);
}

/* ── Landscape: the Links graph draws a line for each pair of policies that pair with each other ───────────────────────────────
   Its lines come from each card's pairsWith. The card's dialog stopped listing them when its "How it interacts" section was removed (2026-11-17),
   so the graph is the one place they show now: a pair authored on both sides is one line, and an id that is no policy draws nothing. */
{
  const { w, d } = load('index.html', '#policy');
  const links = [...d.querySelectorAll('.pol-subview-btn')].find(b => /^links/i.test(b.textContent.trim()));
  links.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const want = w.eval("new Set(POLICY_DATA.flatMap(p => (p.pairsWith || []).filter(l => POLICY_DATA.some(x => x.id === l.id)).map(l => [p.id, l.id].sort().join('|')))).size");
  const got = d.querySelectorAll('.pol-links-edge').length;
  ok('the Links graph draws one line for each pair of policies that pair with each other', want > 0 && got === want, `${got} lines for ${want} pairs`);
}

/* ── policy cards: no Research basis, no Press & resources, no References list in "Copy as draft" ─────
   The dialog used to end its Precedents section with a "Research basis" list (the card's paperIds, then a "Show N related
   studies" list picked by category), then a "Press & resources" list, and "Copy as draft" ended with a "## References" list
   of the same papers plus the ones its text cites. The owner removed all three on 2026-11-17 as no longer relevant: a card's
   sources are the links and citations in its text. The `press` and `paperIds` fields were retired with them, so no card may
   carry either. Checked on every policy.

   The same day, "revisit this category structure" (the level and fine category under the title, e.g. "Restructure | Work Structure",
   with the level's one-line description under them) was answered "Area only": the header names the policy area the Map files the
   card under (one of the four rows) and nothing else of its structure, and "Copy as draft" opens with an Area line instead of
   Phase and Domain. The `level` and `category` fields stay in the data: the area is derived from the category.

   And the "How it interacts" section (a card's pairsWith and competesWith as Pairs with / Competes with lists of cross-links) was removed from
   the dialog and from "Copy as draft" at the owner's request. The two fields stay in the data: pairsWith draws the Links graph's lines (checked
   above), and a cross-link written inside a card's own text still opens the card it names (checked at the end of this block).

   Last, the `level` field (which of five stages of AI disruption a card addressed: Repair, Expand, Build, Restructure, Transform) and its
   DISRUPTION_LEVELS table were retired once nothing showed them. The one thing that still read them was a per-category column view that
   CSS had hidden (`.pol-columns { display: none }`) since the Map's rows replaced it; it was deleted with them, and the masthead-count check
   above now counts the tiles the Map draws. The five stages' text and each card's level are kept in the shared notes folder. */
(async () => {
  const { w, d } = load('index.html', '#policy');
  let copied = null;
  w.HTMLTextAreaElement.prototype.select = function () { copied = this.value; };
  w.document.execCommand = () => true;
  const ids = w.eval('POLICY_DATA.map(p => p.id)');
  // Each card's area as the page's own data gives it (plain JSON, so nothing crosses the jsdom realm as a live object).
  const facts = JSON.parse(w.eval(`JSON.stringify(Object.fromEntries(POLICY_DATA.map(p => {
    const areaId = CATEGORY_MERGE_MAP[p.category];
    return [p.id, { areaId, area: MERGED_POLICY_CATEGORIES[areaId] }];
  })))`));
  const withBasis = [], withPress = [], withRefs = [], noDraft = [], wrongArea = [], extraInHeader = [], wrongDot = [], draftLabels = [], withRel = [], withRelDraft = [];
  for (const id of ids) {
    w.location.hash = '#policy/' + id;
    await settle(5);
    if (d.querySelector('#polModal [class*="pol-basis"]') || /Research basis|related stud/i.test(d.getElementById('polModalBody').textContent)) withBasis.push(id);
    if (/Press (&|and) resources/i.test(d.getElementById('polModalBody').textContent)) withPress.push(id);
    if ([...d.querySelectorAll('#polModalBody .pol-modal-label')].some(e => /^How it interacts$/i.test(e.textContent.trim())) || d.querySelector('#polModalBody [class*="pol-rel"]')) withRel.push(id);
    const f = facts[id], meta = d.getElementById('polModalArea'), head = d.querySelector('#polModal .pol-modal-header');
    if (!meta || meta.textContent !== f.area) wrongArea.push(`${id}: "${meta && meta.textContent}" instead of "${f.area}"`);
    const leaves = [...head.querySelectorAll('*')].filter(e => !e.children.length).map(e => e.textContent.trim());
    const allowed = new Set([d.getElementById('polModalTitle').textContent.trim(), 'Copy as draft', 'Copy link', 'Print', '✕', '']);
    if (d.getElementById('polModalLevel') || d.getElementById('polModalCat') || d.getElementById('polModalPhaseDesc') || leaves.some(x => !allowed.has(x))) extraInHeader.push(id);
    const dot = meta && meta.querySelector('.pol-modal-area-dot'), row = d.querySelector(`#policyArea .pol-cat-row[data-cat="${f.areaId}"]`);
    const dotColor = dot && dot.style.getPropertyValue('--cat-color');
    if (!dotColor || !row || dotColor !== row.style.getPropertyValue('--cat-color')) wrongDot.push(id);
    copied = null;
    const btn = d.getElementById('polCopyDraft');
    if (btn) btn.click();
    if (!copied || !copied.startsWith('# ')) noDraft.push(id);
    else if (/^## (References|Press)/m.test(copied)) withRefs.push(id);
    if (copied && /^## (Pairs with|Competes with)/m.test(copied)) withRelDraft.push(id);
    if (copied && (!copied.includes('\n**Area:** ' + f.area + '\n') || /\*\*(Phase|Domain):\*\*/.test(copied))) draftLabels.push(id);
  }
  ok('every policy dialog shows, under its title, the policy area its card sits under on the Map (one of the four rows)', wrongArea.length === 0, wrongArea.join(' | '));
  ok('no policy dialog header carries anything but the title, the area and the three buttons (no level, no fine category)', extraInHeader.length === 0, extraInHeader.join(', '));
  ok('the dot beside the area is the colour of that area\'s row on the Map', wrongDot.length === 0, wrongDot.join(', '));
  ok('"Copy as draft" opens with the card\'s area, not a phase and a domain', draftLabels.length === 0, draftLabels.join(', '));
  ok('no policy card shows a Research basis or a list of related studies', withBasis.length === 0, withBasis.join(', '));
  ok('no policy card shows a Press & resources section', withPress.length === 0, withPress.join(', '));
  ok('no policy dialog has a "How it interacts" section (no Pairs with or Competes with lists of cross-links)', withRel.length === 0, withRel.join(', '));
  ok('"Copy as draft" has no Pairs with or Competes with list', withRelDraft.length === 0, withRelDraft.join(', '));
  const retired = w.eval("POLICY_DATA.filter(p => 'paperIds' in p || 'press' in p || 'level' in p).map(p => p.id)");
  ok('no policy card carries the retired paperIds, press or level fields, and the level table is gone', retired.length === 0 && w.eval('typeof DISRUPTION_LEVELS') === 'undefined', retired.join(', '));
  ok('"Copy as draft" still gives a draft on every policy, and none of them ends with a References or Press & resources list',
     withRefs.length === 0 && noDraft.length === 0, `with references: ${withRefs.join(', ')} | no draft: ${noDraft.join(', ')}`);

  // A cross-link written inside a card's own text ({{pol:id|text}}) still opens the card it names. With the How it interacts section gone, these
  // are the only links from one card to another.
  const xid = w.eval("(POLICY_DATA.find(p => JSON.stringify([p.summary, p.rationale, p.strengths, p.risks, p.landscape]).includes('{{pol:')) || {}).id");
  w.location.hash = '#policy/' + xid;
  await settle(5);
  const xlink = d.querySelector('#polModalBody .pol-xref');
  const xtitle = xlink && w.eval(`(POLICY_DATA.find(p => p.id === ${JSON.stringify(xlink.dataset.polId)}) || {}).title`);
  if (xlink) xlink.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await settle(5);
  const nowOpen = d.getElementById('polModalTitle').textContent;
  ok('a cross-link inside a card\'s text still opens the card it names', !!xlink && !!xtitle && nowOpen === xtitle, `link: ${!!xlink}, wanted "${xtitle}", the dialog says "${nowOpen}"`);
})();

/* #sources (briefly), #research (before that) and #changelog (the What's New feed, removed) were routes
   of the Papers tab. Old links must still land on it, and the address bar should say where. */
for (const old of ['#sources', '#research', '#changelog']) {
  const { w, d } = load('index.html', old);
  ok(`${old} opens the cards view`, bodyView(d) === 'cards', `body view was ${bodyView(d)}`);
  ok(`${old} rewrites the address bar to #papers`, w.location.hash === '#papers', `hash was ${w.location.hash}`);
}

/* A Papers row is a disclosure: it starts closed with no body built, and opening
   it builds the body. */
{
  const { w, d } = load('index.html', '#papers');
  const row = d.querySelector('.src-row');
  const toggle = row && row.querySelector('.src-toggle');
  ok('paper rows render', !!row && !!toggle);
  ok('a paper row shows no category: its meta line is the author in bold, then the institution and date, with no colored dot', !row.querySelector('.src-dot') && row.querySelector('.src-meta').children.length === 1 && row.querySelector('.src-meta > .src-author').textContent.trim().length > 0);
  const body = row.querySelector('.src-body');
  ok('a row starts closed, with no body built', toggle.getAttribute('aria-expanded') === 'false' && body.hidden && !body.firstChild);
  toggle.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  ok('clicking a row opens it and builds its body',
     toggle.getAttribute('aria-expanded') === 'true' && !body.hidden && !!row.querySelector('.src-finding'));
  toggle.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  ok('clicking again closes it', toggle.getAttribute('aria-expanded') === 'false' && body.hidden);
}

/* #solutions was the fourth nav tab until it was merged into Policy. Old links
   must still land on a real view, and the address bar should say where. */
{
  const { w, d } = load('index.html', '#solutions');
  ok('#solutions opens the policy view', bodyView(d) === 'policy', `body view was ${bodyView(d)}`);
  ok('#solutions rewrites the address bar to #policy', w.location.hash === '#policy', `hash was ${w.location.hash}`);
  ok('#solutions leaves no Solutions nav button', !d.getElementById('viewSolutions'));
  const btn = d.getElementById('viewPolicy');
  ok('#solutions marks the Policy button active',
     btn.classList.contains('active') && btn.getAttribute('aria-selected') === 'true');
}

/* ── Legislation: a map of the states, a card that follows the pointer, and the bills ────────────────────────────────
   The section opens; its masthead says what is loaded, from the data; the map draws all 50 states and DC; pointing at a state shows it in the card (its bills and its midterm results); clicking pins it and narrows the
   bills table. The bills (federal ones from GovInfo, state ones from Open States) are a file of their own, fetched when a section of Government action first opens, so every test here waits for them. The midterm results
   (Senate, House, governor) come from the Associated Press's pages and are cited below the map; they are by state, in the card (they were a layer of their own until 2026-11-18). Part A checks the shipped bills and the
   view the section opens on, part B the midterm results in the card and pinning, part C paging, the hover card's cap, the territories and the sources, and part D the bill paths with five test bills of its own (the real
   ones are set aside and put back), so that what counts as active (introduced and not failed) and what is left out are both checked. */
const legislationTests = async () => {
  // These checks run on All, which holds the bills, the midterm results and the card with all of it (Legislation alone holds the bills: its own checks are after these). The Enforcement rows are set aside (noActions): the
  // card shows them in a block of its own, which the Enforcement checks test; these checks are about the bills and the results.
  const { w, d } = load('index.html', '#all', { transform: noActions });
  await settle(10);
  const fire = (el, type) => el.dispatchEvent(new w.MouseEvent(type, { bubbles: true }));
  const path = code => d.querySelector(`#legMap path[data-state="${code}"]`);
  const panel = () => d.getElementById('legPanel').textContent;
  const rows = id => d.querySelectorAll(`#${id} tbody tr:not(.leg-empty-row)`).length;
  const mastheadText = () => d.getElementById('headerTabDescText').textContent;
  const legend = () => d.getElementById('legLegend').textContent;
  const num = n => n.toLocaleString('en-US');
  const area = d.getElementById('legislationArea');
  const nStates = w.eval('Object.keys(MIDTERM_RESULTS).length');
  const cnt = (office, k) => w.eval(`Object.values(MIDTERM_RESULTS).filter(s => s.${office} && s.${office}.result === '${k}').length`);
  const races = office => w.eval(`Object.values(MIDTERM_RESULTS).filter(s => s.${office}).length`);
  const seats = w.eval('Object.values(MIDTERM_RESULTS).reduce((n, s) => { const h = s.house || {}; return n + (h.d || 0) + (h.r || 0) + (h.dLead || 0) + (h.rLead || 0) + (h.runoff || 0); }, 0)');
  const houseStates = k => w.eval(`Object.values(MIDTERM_RESULTS).filter(s => { const d = s.house.d || 0, r = s.house.r || 0; return ${k === 'none' ? 'd + r === 0' : k === 'd' ? 'd > r' : k === 'r' ? 'r > d' : 'd === r && d + r > 0'}; }).length`);
  const AP = 'https://apnews.com/projects/elections-2026/';
  const nat = w.eval('MIDTERM_NATIONAL');
  // the shipped bills
  const nBills = w.eval('LEGISLATION_DATA.filter(b => !b.passing).length'), nPassing = w.eval('LEGISLATION_DATA.filter(b => b.passing).length'), nFed = w.eval("LEGISLATION_DATA.filter(b => b.level === 'federal' && !b.passing).length"), nFedPassing = w.eval("LEGISLATION_DATA.filter(b => b.level === 'federal' && b.passing).length"), nState = nBills - nFed;
  const countOf = code => w.eval(`LEGISLATION_DATA.filter(b => b.level === 'state' && b.state === '${code}' && !b.passing).length`);
  const counts = JSON.parse(w.eval("(() => { const c = {}; LEGISLATION_DATA.forEach(b => { if (b.level === 'state' && !b.passing && US_MAP.states[b.state]) c[b.state] = (c[b.state] || 0) + 1; }); return JSON.stringify(c); })()"));
  const nTerritory = w.eval("LEGISLATION_DATA.filter(b => b.level === 'state' && !b.passing && !US_MAP.states[b.state]).length");
  const feeds = JSON.parse(w.eval('JSON.stringify(LEGISLATION_FEEDS)'));
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const longDay = iso => { const [y, m, day] = iso.split('-'); return `${MONTHS[+m - 1]} ${+day}, ${y}`; };   // "2026-11-17" as the page writes it
  const PAGE = 10, pagesOf = n => Math.max(1, Math.ceil(n / PAGE));   // the bills table's page (LEG_PAGE_SIZE); the Papers list and the Fact Bank keep fifty
  const RPAGE = 10, rpagesOf = n => Math.max(1, Math.ceil(n / RPAGE));   // the results table's page (LEG_RESULTS_PAGE_SIZE): states to a page
  // The pointer leaving the map: with nothing pinned the card stays on the state last pointed at for LEG_CARD_GRACE ms (so the pointer can reach its link), so a test that wants the card
  // back at the overview waits that long.
  const GRACE = 450, leaveMap = async () => { d.getElementById('legMap').dispatchEvent(new w.MouseEvent('mouseleave', { bubbles: true })); await wait(GRACE + 80); };
  const joinAnd = l => l.length > 2 ? l.slice(0, -1).join(', ') + ' and ' + l[l.length - 1] : l.join(' and ');
  const names = Object.values(feeds).map(f => f.short || f.org), joinNames = names.length > 2 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names.join(' and ');

  /* ── A. the shipped bills, and the view the tab opens on ─────────────────────────────────────────────────── */
  ok('#all opens the All view', bodyView(d) === 'all', `body view was ${bodyView(d)}`);
  ok('#all keeps its address bar', w.location.hash === '#all', `hash was ${w.location.hash}`);
  const btn = d.getElementById('viewGovernment');
  ok('#all marks the Enforcement and Legislation tab active, and not Landscape, and presses All in the switch',
     btn.classList.contains('active') && btn.getAttribute('aria-selected') === 'true' && !d.getElementById('viewPolicy').classList.contains('active') && d.getElementById('govSwitchAll').getAttribute('aria-pressed') === 'true');
  ok('the screen reader announcement names the tab and the section', d.getElementById('viewAnnounce').textContent === 'Government action: All view');
  ok('the bills are loaded: the federal ones from GovInfo, the state ones from Open States, as many as each says it holds (the ones that only mention AI counted apart), and from nobody else',
     area.getAttribute('data-bills') === 'ready' && nBills > 0 && Object.keys(feeds).join() === 'govinfo,openstates' && nFed === feeds.govinfo.included && nFedPassing === feeds.govinfo.passing && nState === feeds.openstates.included &&
     w.eval("LEGISLATION_DATA.every(b => b.source && /^https?:\\/\\//.test(b.source.url) && (b.level === 'federal' ? b.source.label === 'Congress.gov' && b.source.url.startsWith('https://www.congress.gov/bill/119th-congress/') && b.session === '119th Congress' : ['Legislature', 'Open States'].includes(b.source.label)))"),
     `${nFed}+${nFedPassing} federal of ${feeds.govinfo.included}+${feeds.govinfo.passing}, ${nState} state of ${feeds.openstates.included}`);
  ok('every bill is well formed: a unique id, a place the page knows (a state on the map, a territory, or Congress), a stage that counts as active, and no account token anywhere (the links to a legislature and to Open States carry none)',
     w.eval("new Set(LEGISLATION_DATA.map(b => b.id)).size === LEGISLATION_DATA.length && LEGISLATION_DATA.every(b => b.level === 'federal' || US_MAP.states[b.state] || LEGISLATION_TERRITORIES[b.state]) && LEGISLATION_DATA.every(b => LEGISLATION_STAGES[b.stage] && LEGISLATION_STAGES[b.stage].active)") &&
     !w.eval('/statenet|ciq=|client_md|urn:user/i.test(JSON.stringify(LEGISLATION_DATA) + JSON.stringify(LEGISLATION_FEEDS))'));
  ok('each federal bill has its Congress and its official last action (from GovInfo), and a summary (the Congressional Research Service\'s, else its official title) unless its title already is the official one; and each state bill has its session and its official title (and its last action, when it has one)',
     w.eval("LEGISLATION_DATA.filter(b => b.level === 'federal').every(b => (b.summary || /^(To |A bill |An act )/.test(b.title)) && b.session === '119th Congress')") &&
     w.eval("LEGISLATION_DATA.filter(b => b.level === 'federal' && b.lastAction && b.lastAction.date && b.lastAction.text).length") === feeds.govinfo.included + feeds.govinfo.passing &&
     w.eval("LEGISLATION_DATA.filter(b => b.level === 'state').every(b => typeof b.session === 'string' && b.title && (!b.lastAction || b.lastAction.date))"));
  ok('no bill\'s last action is dated in the future: a scheduled effective date is not an action taken, and as the "last action" it would sort the bill to the top by recency (one day of slack for the time zone)',
     w.eval("(() => { const t = new Date(Date.now() + 86400000).toISOString().slice(0, 10); return LEGISLATION_DATA.every(b => !b.lastAction || !b.lastAction.date || b.lastAction.date <= t); })()"),
     w.eval("LEGISLATION_DATA.filter(b => b.lastAction && b.lastAction.date > new Date(Date.now() + 86400000).toISOString().slice(0, 10)).map(b => b.bill + ' ' + b.lastAction.date).join()"));
  ok('where the note says a legislature\'s own summary was read from its site (Illinois), every one of that state\'s bills carries it: run tools/state_summaries.py, then the build, when this fails',
     !/Illinois/.test(feeds.openstates.summaries || '') || w.eval("LEGISLATION_DATA.filter(b => b.state === 'IL').every(b => b.summary && b.summary.length > 20)"),
     w.eval("LEGISLATION_DATA.filter(b => b.state === 'IL' && !b.summary).map(b => b.bill).join()"));
  ok('the tab\'s masthead is the owner\'s own question and blurb: a centralized repository of the bills, cases and actions, with the midterm results, and how to use the switch and the Show menu; it quotes no count',
     d.getElementById('headerTabDescLede').textContent.trim() === GOV_HEADER && mastheadText() === GOV_BLURB, mastheadText());
  const chrome = [...d.querySelectorAll('#legislationArea button, #legislationArea h2, #legislationArea h3, #legLegend, #legMapSource')].map(e => e.textContent).join(' ') + mastheadText();
  ok('nothing on the tab mentions the Blue Rose memo or calls the layers by their old names', !/Blue Rose|memo/i.test(chrome) && !/Senate results|Active legislation/.test(chrome), chrome.slice(0, 200));
  const paths = [...d.querySelectorAll('#legMap path.leg-state')];
  ok('the map draws all 50 states and DC, one outline each, addressable by USPS code',
     paths.length === 51 && new Set(paths.map(p => p.getAttribute('data-state'))).size === 51 && paths.every(p => (p.getAttribute('d') || '').length > 20));
  const tiles = [...d.querySelectorAll('#legTiles button.leg-tile')], tile = code => d.querySelector(`#legTiles button[data-state="${code}"]`);
  const fillOf = el => (String(el.getAttribute('class')).match(/\bfill-[\w-]+/) || [''])[0], tilesMatch = () => tiles.every(b => fillOf(b) === fillOf(path(b.getAttribute('data-state'))));
  const small = w.eval('Object.keys(US_MAP.states).filter(c => Math.min(US_MAP.states[c].w, US_MAP.states[c].h) < 45).sort((a, b) => US_MAP.states[a].cy - US_MAP.states[b].cy)').join();
  ok('no state carries letters of its own: the map has no text, and a state is named by pointing at it', d.querySelectorAll('#legMap text').length === 0 && !d.querySelector('.leg-abbr'));
  ok('the nine states too small to point at (VT, NH, MA, RI, CT, NJ, DE, MD, DC: every outline narrower than 45 map units) each have a button beside the map, north to south, named for the state',
     tiles.map(b => b.textContent).join() === 'VT,NH,MA,RI,CT,NJ,DE,MD,DC' && small === 'VT,NH,MA,RI,CT,NJ,DE,MD,DC' &&
     tiles.every(b => b.type === 'button' && b.getAttribute('aria-pressed') === 'false' && b.getAttribute('aria-label') === `${w.eval(`US_MAP.states.${b.textContent}.name`)} (${b.textContent})`) &&
     d.getElementById('legTiles').getAttribute('role') === 'group' && /Small states/.test(d.getElementById(d.getElementById('legTiles').getAttribute('aria-labelledby')).textContent), `${tiles.map(b => b.textContent).join()} | ${small}`);
  ok('the three smallest shapes, DC, Delaware and Rhode Island, also get a larger invisible target on the map itself',
     [...d.querySelectorAll('#legMap .leg-hit')].map(c => c.getAttribute('data-state')).sort().join() === 'DC,DE,RI');
  const options = [...d.querySelectorAll('#legStateSelect option')], groups = [...d.querySelectorAll('#legStateSelect optgroup')].map(g => `${g.label}:${g.children.length}`).join();
  ok('the Show menu offers "All jurisdictions", then Federal (Congress), then each of the 51 states once, then Puerto Rico, the one territory a source covers',
     options.length === 54 && options[0].textContent === 'All jurisdictions' && options[1].value === 'federal' && groups === 'Federal:1,States:51,Territories:1' &&
     options.slice(2).every(o => o.value && o.value !== 'federal' && o.textContent) && new Set(options.map(o => o.value)).size === 54, groups);
  ok('the section switch is the first thing in the toolbar, then the Show menu, then the Status menu and the checkbox for the bills that only lightly mention AI, and the Reset button last, in that order',
     [...d.querySelectorAll('#legSticky .leg-controls-main > *')].map(e => e.id).join() === 'govSwitch,legShowPair,legStatusPair,legPassingWrap' && d.querySelector('#legSticky .leg-controls').lastElementChild === d.getElementById('legReset') &&
     [...d.querySelectorAll('#govSwitch button')].map(b => b.textContent).join() === 'All,Cases,Enforcement,Legislation' && !d.getElementById('legLayerResults') && !d.getElementById('legOfficeToggle'), [...d.querySelectorAll('#legSticky .leg-controls-main > *')].map(e => e.id).join());
  ok('the Bills section has no word Bills in its title: the title is the jurisdiction and the count, and the section is still named Bills for a screen reader',
     d.getElementById('legBillsTitle').textContent.trim() === `All jurisdictions · ${num(nBills)} bills` && d.getElementById('legBillsTitle').textContent.trim() === d.getElementById('legBillsScope').textContent.trim() &&
     d.getElementById('legBillsSection').getAttribute('aria-label') === 'Bills' && !d.getElementById('legBillsSection').hasAttribute('aria-labelledby'), d.getElementById('legBillsTitle').textContent);
  const stageCounts = JSON.parse(w.eval("(() => { const c = {}; LEGISLATION_DATA.filter(b => !b.passing && LEGISLATION_STAGES[b.stage] && LEGISLATION_STAGES[b.stage].active).forEach(b => { c[b.stage] = (c[b.stage] || 0) + 1; }); return JSON.stringify(c); })()"));
  const stageOrder = w.eval("Object.keys(LEGISLATION_STAGES).filter(k => LEGISLATION_STAGES[k].active).join()").split(',');
  const statsBar = () => d.getElementById('legBillsStats'), segs = () => [...statsBar().querySelectorAll('.leg-stats-seg')];
  const segN = x => parseInt(x.getAttribute('title').split(': ')[1].replace(/,/g, ''), 10), statsLabel = () => statsBar().querySelector('.leg-stats-bar').getAttribute('aria-label');
  // the percentages, restated here from the rule (a whole number each, "<1%" and ">99%" at the edges; a screen reader hears them in words)
  const pctOf = (n, t) => { const p = 100 * n / t; return n === t ? '100%' : p < 1 ? '<1%' : p > 99 ? '>99%' : Math.round(p) + '%'; }, pctSaid = (n, t) => pctOf(n, t).replace('<1%', 'under 1%').replace('>99%', 'over 99%');
  const stageName = k => w.eval(`LEGISLATION_STAGES['${k}'].label`);
  const scopeN = () => Number(d.getElementById('legBillsScope').textContent.match(/([\d,]+) bills?/)[1].replace(/,/g, ''));
  ok('under the Bills title a stats bar shows where the bills in view stand: a segment for each stage that has some, in the stages\' order, with the data\'s counts, adding up to the bills the title counts, and beside each its count and its percentage of them',
     !statsBar().hidden && segs().map(x => x.getAttribute('data-stage')).join() === stageOrder.filter(k => stageCounts[k]).join() && segs().every(x => segN(x) === stageCounts[x.getAttribute('data-stage')]) &&
     segs().reduce((t, x) => t + segN(x), 0) === nBills && scopeN() === nBills && statsLabel().startsWith(`Where the ${num(nBills)} bills stand: `) &&
     [...statsBar().querySelectorAll('.leg-stats-key li')].map(li => li.textContent).join() === segs().map(x => `${num(segN(x))} ${stageName(x.getAttribute('data-stage')).toLowerCase()} (${pctOf(segN(x), nBills)})`).join() &&
     statsLabel() === `Where the ${num(nBills)} bills stand: ${segs().map(x => `${num(segN(x))} ${stageName(x.getAttribute('data-stage')).toLowerCase()} (${pctSaid(segN(x), nBills)})`).join(', ')}.` &&
     segs().every(x => x.getAttribute('title') === `${stageName(x.getAttribute('data-stage'))}: ${num(segN(x))} (${pctOf(segN(x), nBills)})`),
     segs().map(x => x.getAttribute('data-stage') + ':' + segN(x)).join() + ' | ' + statsBar().textContent);
  const legCss = [...d.querySelectorAll('style')].map(el => el.textContent).join('\n');
  const stickyBar = d.getElementById('legSticky'), searchBar = d.getElementById('legFilters'), topicsBar = d.getElementById('legTopicsBar');
  ok('the toolbar, the topic chips and the search bar all stick at the top of the window, in that order, each under the one before (the chips under the toolbar, the search bar under both): each is a child of the area and none holds another, and a title jumped to keeps clear of all three',
     !!stickyBar && stickyBar.parentElement === d.getElementById('legislationArea') && searchBar.parentElement === d.getElementById('legislationArea') && topicsBar.parentElement === d.getElementById('legislationArea') &&
     [...d.getElementById('legislationArea').children].map(e => e.id).slice(0, 3).join() === 'legSticky,legTopicsBar,legFilters' && !!d.querySelector('#legSticky .leg-controls #legStateSelect') && !!d.querySelector('#legSticky .leg-controls #govSwitch') &&
     /#legislationArea #legSticky\s*\{[^}]*position:\s*sticky;\s*top:\s*0/.test(legCss) && /#legislationArea #legTopicsBar\s*\{[^}]*position:\s*sticky;\s*top:\s*var\(--leg-toolbar-h/.test(legCss) &&
     /#legislationArea #legFilters\s*\{[^}]*position:\s*sticky;\s*top:\s*calc\(var\(--leg-toolbar-h,\s*0px\)\s*\+\s*var\(--leg-topics-h/.test(legCss) &&
     /\.leg-section-title\s*\{\s*scroll-margin-top:\s*calc\(var\(--leg-bar-h,\s*0px\)\s*\+\s*16px\)/.test(legCss) &&
     /@media \(max-width: 640px\), \(max-height: 760px\)\s*\{\s*#legislationArea #legSticky, #legislationArea #legTopicsBar, #legislationArea #legFilters\s*\{\s*position:\s*static/.test(legCss));
  ok('the Show menu is a fixed, narrow width, not the width of its longest option, so the checkbox can sit beside Status (the owner, 2026-11-18): a long choice is cut with an ellipsis and its full name is the tooltip',
     /\.leg-select \{[^}]*width:\s*210px;\s*text-overflow:\s*ellipsis/.test(legCss) && d.getElementById('legStateSelect').title === d.getElementById('legStateSelect').options[d.getElementById('legStateSelect').selectedIndex].textContent);
  ok('the Reset button cannot drop to a row of its own on a desktop (the owner\'s screenshot, 2026-11-18): the controls wrap among themselves in their own group, the toolbar row itself does not wrap, and the button keeps its size',
     !/flex-wrap/.test((/\n  \.leg-controls \{([^}]*)\}/.exec(legCss) || [])[1] || 'flex-wrap') && /\n  \.leg-controls-main \{[^}]*flex-wrap:\s*wrap[^}]*min-width:\s*0/.test(legCss) && /#legislationArea \.leg-reset \{[^}]*flex:\s*none/.test(legCss));
  ok('each table block ends with its divider under the note and the page numbers (the owner, 2026-11-18): the section carries the line, the pager has none of its own here, and the pager is the last thing in the section, after the note',
     /#legislationArea \.leg-section\s*\{[^}]*border-bottom:\s*1px solid var\(--divider\)/.test(legCss) && /#legislationArea \.pager\s*\{[^}]*border-top:\s*0/.test(legCss) &&
     ['legResultsSection', 'legBillsSection'].every(sid => { const s = d.getElementById(sid); return s.lastElementChild.matches('nav.pager') && s.lastElementChild.previousElementSibling.classList.contains('leg-source'); }));
  ok('the topics sit above the search bar, always showing: the chips come before the search box, there is no note under them, there is no More filters toggle and no panel for it, and the Status menu and the checkbox are in the toolbar, not behind anything',
     !d.getElementById('legMoreToggle') && !d.getElementById('legMorePanel') && !d.getElementById('legMoreCount') && !d.querySelector('#legislationArea .more-toggle, #legislationArea .more-panel') &&
     !!(d.getElementById('legTopicPills').compareDocumentPosition(d.getElementById('legSearch')) & 4) && topicsBar.compareDocumentPosition(searchBar) === 4 && !!d.querySelector('#legSticky #legStatus') && !!d.querySelector('#legSticky #legPassing') &&
     w.getComputedStyle(d.getElementById('legTopicPills')).display !== 'none' && !d.getElementById('legTopicNote') && !d.querySelector('#legTopicsBar p'));
  ok('there is no Federal button, since Congress is the Federal entry in the Show menu, and the masthead says where to find places (the card no longer has the hint)',
     !d.getElementById('legFed') && ![...d.querySelectorAll('.leg-controls button')].some(b => /Federal/.test(b.textContent)) && !!d.querySelector('#legStateSelect option[value="federal"]') &&
     /choose a place in the Show menu/.test(mastheadText()) && !/Hover a state to see how its bills stand|choose Federal in the Show menu/.test(panel()), mastheadText());
  ok('the data covers every race AP lists: 50 states, 35 Senate seats, 36 governor races and all 435 House districts',
     nStates === 50 && races('senate') === 35 && races('governor') === 36 && seats === 435, `${nStates} states, ${races('senate')} Senate, ${races('governor')} governor, ${seats} districts`);
  // the Bills layer: the shading steps are thirds of the states that have bills, and the legend names what each holds
  const readSteps = () => [...d.querySelectorAll('#legLegend .leg-legend-item')].map(i => {
    const sw = i.querySelector('.leg-swatch'), lv = sw && (sw.className.match(/fill-b(\d)/) || [])[1], m = /^([\d,]+)(?: to ([\d,]+))? items?\b/.exec(i.textContent.trim());   // on All the legend counts items (the bills, here: no other rows are loaded in this block)
    return lv && m ? { lv: +lv, lo: +m[1].replace(/,/g, ''), hi: +(m[2] || m[1]).replace(/,/g, ''), n: +i.querySelector('.leg-muted-count').textContent } : null;
  }).filter(Boolean);
  const steps = readSteps();
  const stepOf = n => (steps.find(s => n >= s.lo && n <= s.hi) || {}).lv;
  const most = Math.max(...Object.values(counts)), fewest = Math.min(...Object.values(counts));
  const noBills = (() => { const i = [...d.querySelectorAll('#legLegend .leg-legend-item')].find(x => /^No items/.test(x.textContent.trim())); return i ? +i.querySelector('.leg-muted-count').textContent : 0; })();
  ok('the map is shaded by thirds of the states that have items (here bills only): every state is in the step its count falls in, and the legend\'s ranges run from the fewest to the most and account for every state',
     steps.length >= 1 && steps.length <= 3 &&
     Object.keys(counts).every(c => new RegExp(`fill-b${stepOf(counts[c])}\\b`).test(path(c).getAttribute('class'))) && steps[0].lo === fewest && steps[steps.length - 1].hi === most &&
     steps.reduce((s, x) => s + x.n, 0) + noBills === 51 && noBills === 51 - Object.keys(counts).length, legend());
  ok('the legend counts the federal and the territory items (here bills), which are not on the map, and says what an item is', new RegExp(`Federal items, not on the map\\s*${num(nFed)}`).test(legend()) &&
     (nTerritory ? new RegExp(`Territory items, not on the map\\s*${num(nTerritory)}`).test(legend()) : !/Territory items/.test(legend())) && /Items are the bills, key cases and enforcement actions, counted together/.test(legend()), legend());
  ok('the small-state buttons are shaded like their states: a state with bills, a shade; one without, none', tilesMatch() && tiles.every(b => !!counts[b.textContent] === /fill-b[123]/.test(b.getAttribute('class'))), tiles.map(b => b.textContent + ':' + fillOf(b)).join());
  const billsTable = () => d.getElementById('legBillsTable'), pager = d.getElementById('legBillsPager');
  const heads = () => [...billsTable().querySelectorAll('th')].map(t => t.textContent).join();
  const monthNo = m => ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(m) + 1;
  const dateOfRow = tr => { const m = /^([A-Z][a-z]+) (\d{1,2}), (\d{4})/.exec(((tr.querySelector('td.leg-col-last') || {}).textContent || '').trim()); return m ? `${m[3]}-${String(monthNo(m[1])).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}` : ''; };
  const dates = () => [...billsTable().querySelectorAll('tbody tr:not(.leg-empty-row)')].map(dateOfRow);
  // in order: each date no later (newest first) or no earlier (oldest first) than the one before, and the bills with no date after all that have one
  const inOrder = (a, desc) => a.every((x, i) => i === 0 || (a[i - 1] ? (x ? (desc ? a[i - 1] >= x : a[i - 1] <= x) : true) : !x));
  const newestAction = w.eval("LEGISLATION_DATA.filter(b => !b.passing && b.lastAction && b.lastAction.date).map(b => b.lastAction.date).sort().pop()");
  ok('the bills table opens on its first page, the most recent last action first, with the number of bills in its title, and the pager counts the pages',
     rows('legBillsTable') === Math.min(PAGE, nBills) && heads() === 'Jurisdiction,Bill,Title,Status,Last action,Summary,Source' && dates()[0] === newestAction && inOrder(dates(), true) &&
     d.getElementById('legSort').value === 'recent' && d.getElementById('legBillsScope').textContent === `All jurisdictions · ${num(nBills)} bills` && !pager.hidden && pager.querySelector('.pager-status').textContent === `Page 1 of ${pagesOf(nBills)}`, `${rows('legBillsTable')} rows, ${heads()}, ${dates().slice(0, 4)}`);
  const passNote = n => `${num(n)} more active ${n === 1 ? 'bill mentions' : 'bills mention'} AI only in ${n === 1 ? 'its' : 'their'} text; "Include bills that only lightly mention AI" adds ${n === 1 ? 'it' : 'them'}.`;
  ok('a note under the table says what the federal list and the state list are, where the summaries come from, how many more bills the search found and why they are left out (not active), and how many more the checkbox would add',
     d.getElementById('legBillsNote').textContent === `Federal bills are ${feeds.govinfo.scope}. ${feeds.govinfo.summaries} State bills are ${feeds.openstates.scope}. ${feeds.openstates.summaries ? feeds.openstates.summaries + ' ' : ''}Open States found ${joinAnd(feeds.openstates.omitted.filter(o => o.n).map(o => `${num(o.n)} more bills that ${o.why}`))}; none is included.${nPassing ? ` ${passNote(nPassing)}` : ''}`, d.getElementById('legBillsNote').textContent);
  /* the checkbox, in the toolbar next to the Status menu, for the bills that only lightly mention AI in their text */
  const passWrap = d.getElementById('legPassingWrap'), passBox = d.getElementById('legPassing'), pcode = nPassing ? w.eval("LEGISLATION_DATA.find(b => b.passing && b.level === 'state').state") : '';
  ok('a checkbox in the toolbar, next to the Status menu, offers the bills that only lightly mention AI in their text, says how many, and starts off: none of them is in the table',
     nPassing > 0 && !passWrap.hidden && !passBox.checked && passBox.type === 'checkbox' && !!passWrap.closest('#legSticky') && passWrap.previousElementSibling.id === 'legStatusPair' &&
     passWrap.textContent.trim().startsWith('Include bills that only lightly mention AI') && !/only mention AI/.test(passWrap.textContent) && passWrap.querySelector('.leg-muted-count').textContent === num(nPassing) &&
     !/Mentions AI only in its text/.test(billsTable().textContent), passWrap.textContent);
  const stepsOff = steps.map(x => `${x.lo}-${x.hi}`).join();
  fire(passBox, 'click');
  const onTotal = nBills + nPassing, countsOn = JSON.parse(w.eval("(() => { const c = {}; LEGISLATION_DATA.forEach(b => { if (b.level === 'state' && US_MAP.states[b.state]) c[b.state] = (c[b.state] || 0) + 1; }); return JSON.stringify(c); })()"));
  const stepsOn = readSteps();
  ok('turning it on adds them everywhere at once: the number of bills in the title, the map shading and legend (recomputed from the larger counts), and the note; the masthead quotes no count and does not move',
     passBox.checked && d.getElementById('legBillsScope').textContent === `All jurisdictions · ${num(onTotal)} bills` && mastheadText() === GOV_BLURB &&
     stepsOn.length >= 1 && stepsOn[stepsOn.length - 1].hi === Math.max(...Object.values(countsOn)) && stepsOn[0].lo === Math.min(...Object.values(countsOn)) &&
     Object.keys(countsOn).every(c => new RegExp(`fill-b${(stepsOn.find(s => countsOn[c] >= s.lo && countsOn[c] <= s.hi) || {}).lv}\\b`).test(path(c).getAttribute('class'))) &&
     /Bills that mention AI only in their text are included, and marked\./.test(d.getElementById('legBillsNote').textContent), `${stepsOff} -> ${stepsOn.map(x => `${x.lo}-${x.hi}`).join()} | ${mastheadText().slice(0, 60)}`);
  d.getElementById('legStateSelect').value = pcode; d.getElementById('legStateSelect').dispatchEvent(new w.Event('change', { bubbles: true }));
  const pRows = [...billsTable().querySelectorAll('tbody tr')].filter(r => /Mentions AI only in its text/.test(r.textContent)).length, pInState = w.eval(`LEGISLATION_DATA.filter(b => b.level === 'state' && b.state === '${pcode}' && b.passing).length`);
  ok('and each such bill is marked in the table as one that only mentions AI in its text: in a state that has some, as many marked rows as it has such bills (up to the page)',
     pRows === Math.min(pInState, PAGE) && pRows > 0 && d.getElementById('legBillsScope').textContent === `${w.eval(`US_MAP.states.${pcode}.name`)} · ${num(countOf(pcode) + pInState)} ${countOf(pcode) + pInState === 1 ? 'bill' : 'bills'}`, `${pRows} marked of ${pInState}`);
  d.getElementById('legStateSelect').value = ''; d.getElementById('legStateSelect').dispatchEvent(new w.Event('change', { bubbles: true }));   // let go of the state with the menu: the Reset button would turn the checkbox off too
  fire(passBox, 'click');
  ok('turning it off again puts everything back: the count, the shading steps and the marks', !passBox.checked &&
     d.getElementById('legBillsScope').textContent === `All jurisdictions · ${num(nBills)} bills` && mastheadText() === GOV_BLURB && readSteps().map(x => `${x.lo}-${x.hi}`).join() === stepsOff &&
     !/Mentions AI only in its text/.test(billsTable().textContent) && d.getElementById('legBillsNote').textContent.includes(passNote(nPassing)));
  d.getElementById('legStateSelect').value = 'federal'; d.getElementById('legStateSelect').dispatchEvent(new w.Event('change', { bubbles: true }));
  ok('a federal bill shows its title, its bill number and Congress, its stage and the dates it was introduced, its summary, and a link to Congress.gov, and carries no category labels from anyone',
     (() => { const r = [...billsTable().querySelectorAll('tbody tr')].find(x => /TAKE IT DOWN/.test(x.textContent)) || billsTable().querySelectorAll('tbody tr')[1];
       return /119th Congress/.test(r.textContent) && /Introduced /.test(r.textContent) && !/labels: /.test(r.textContent) && !!r.querySelector('a[href^="https://www.congress.gov/bill/119th-congress/"]'); })());
  fire(d.getElementById('legReset'), 'click');

  /* ── B. the midterm results, by state: in the card, and in a table under the bills (they were a layer of their own until 2026-11-18) ────────────────────────────────── */
  const mapSource = d.getElementById('legMapSource'), links = [...mapSource.querySelectorAll('a')].map(a => a.getAttribute('href'));
  const apStamp = w.eval('MIDTERM_SOURCES.ap.updated');
  ok('there is no results layer any more: no layer toggle, no office toggle, nothing marked data-layer or data-office, and the map is shaded by bills alone; the results are a table of their own, above the bills table',
     !d.getElementById('legLayerResults') && !d.getElementById('legLayerBills') && !d.getElementById('legOfficeToggle') &&
     !area.hasAttribute('data-layer') && !d.getElementById('legMap').hasAttribute('data-layer') && !d.querySelector('#legislationArea [data-office], #legislationArea [data-layer]') &&
     !!d.getElementById('legResultsTable') && !!(d.getElementById('legResultsSection').compareDocumentPosition(d.getElementById('legBillsSection')) & 4));
  ok('the line below the map cites the midterm results\' source as well, AP\'s results page with a link to it, after the two that the bills come from',
     d.getElementById('legLegend').nextElementSibling === mapSource && /The Associated Press, “2026 Midterm Election Results: Senate, House and Governor Races”/.test(mapSource.textContent) && links.includes(AP) && links.indexOf(AP) === links.length - 1, mapSource.textContent);
  fire(path('TX'), 'mouseover');
  ok('pointing at Texas shows its bills and its Senate, House and governor results in one card, with no source line and no links: the sources are cited under the map',
     /Texas/.test(panel()) && /Bills/.test(panel()) && /2026 Midterm results/.test(panel()) && /SenateDemocratic gain/.test(panel()) && /HouseDemocrats 14, Republicans 24/.test(panel()) && /GovernorDemocratic gain/.test(panel()) &&
     !/Source/.test(panel()) && !d.querySelector('#legPanel a'), panel());
  ok('the pointed-at state is outlined', d.getElementById('legRingHover').getAttribute('d') === path('TX').getAttribute('d') && path('TX').getAttribute('d').length > 20);
  fire(path('NE'), 'mouseover');
  ok('a Republican hold reads as one, in the Senate and for governor', /Nebraska/.test(panel()) && (panel().match(/Republican hold/g) || []).length === 2 && /HouseDemocrats 1, Republicans 2/.test(panel()), panel());
  fire(path('AK'), 'mouseover');
  // The results move as AP calls races, so what Alaska's card should show is read from the data here, not written into the test.
  const akRow = JSON.parse(w.eval('JSON.stringify(MIDTERM_RESULTS.AK)'));
  const akUncalled = ['senate', 'governor'].filter(o => akRow[o] && akRow[o].result === 'uncalled').length, akLeads = (akRow.house.dLead || 0) + (akRow.house.rLead || 0);
  ok('an uncalled race says so and names who leads, and an uncalled House seat is counted',
     /Alaska/.test(panel()) && (panel().match(/Uncalled/g) || []).length === akUncalled && (akUncalled === 0 || /Peltola/.test(panel())) &&
     (akLeads === 0 || new RegExp(`Not yet called: ${akLeads} `).test(panel())), panel());
  fire(path('MS'), 'mouseover');
  ok('Mississippi is a Democratic gain, naming the winner', /Mississippi/.test(panel()) && /Democratic gain/.test(panel()) && /Colom/.test(panel()), panel());
  fire(path('MT'), 'mouseover');
  ok('a state with no governor race says so', /Montana/.test(panel()) && /No 2026 governor race/.test(panel()), panel());
  fire(path('DC'), 'mouseover');
  ok('DC, which AP lists no races for, says so, and its card lists no bills, only that none have been added, and has no "See more details below" link: there is nothing in the table below to see',
     /District of Columbia/.test(panel()) && /AP lists no 2026 races for District of Columbia/.test(panel()) && d.querySelectorAll('#legPanel .leg-bill-list li').length === 0 && /No legislation has been added for District of Columbia yet\./.test(panel()) && !d.querySelector('#legPanel .leg-more-link'), panel());
  await leaveMap();
  const resLine = (office, noun) => `${office[0].toUpperCase() + office.slice(1)}: ${races(office)} ${noun} were up: ${cnt(office, 'd-gain')} Democratic gains, ${cnt(office, 'd-hold')} Democratic holds, ${cnt(office, 'r-hold')} Republican holds${cnt(office, 'r-gain') ? `, ${cnt(office, 'r-gain')} Republican gains` : ''} and ${cnt(office, 'uncalled')} uncalled.`;
  const hsum = JSON.parse(w.eval("(() => { let d = 0, r = 0, o = 0; Object.values(MIDTERM_RESULTS).forEach(s => { const h = s.house || {}; d += h.d || 0; r += h.r || 0; o += (h.dLead || 0) + (h.rLead || 0) + (h.runoff || 0); }); return JSON.stringify({ d, r, o }); })()"));
  ok('moving off the map returns the card to the overview: the bills, a line for each office\'s results counted from the data, and the national totals AP showed, with no source line under them (AP is cited under the map)',
     /United States/.test(panel()) && d.getElementById('legRingHover').getAttribute('d') === '' && /Bills/.test(panel()) && / bills? in /.test(panel()) && /federal bills/.test(panel()) &&
     panel().includes(resLine('senate', 'seats')) && panel().includes(`House, by state: Democrats won ${hsum.d} districts, Republicans ${hsum.r}, and ${hsum.o} are not yet called.`) && panel().includes(resLine('governor', 'races')) &&
     !/Hover a state to see its results\./.test(panel()) && /National totals/.test(panel()) &&
     panel().includes(`Senate: Democrats ${nat.senate.democrats}, Republicans ${nat.senate.republicans}, ${nat.senate.toBeCalled} to be called.`) &&
     panel().includes(`House: Democrats ${nat.house.democrats}, Republicans ${nat.house.republicans}, ${nat.house.toBeCalled} to be called.`) &&
     panel().includes(`Governors: Democrats ${nat.governor.democrats}, Republicans ${nat.governor.republicans}, ${nat.governor.toBeCalled} to be called.`) && !/The Associated Press, updated/.test(panel()), panel());
  /* the results table, under the bills table: ten states to a page, a column for each office, each row linking to AP's pages for that state */
  const resultsTable = d.getElementById('legResultsTable'), resultsPager = d.getElementById('legResultsPager');
  ok('the results table has a title written like the other sections\' (the place, a dot, then what it is): All jurisdictions · 2026 Midterm results, in the same type as the bills\' title',
     d.getElementById('legResultsTitle').textContent.trim() === 'All jurisdictions · 2026 Midterm results' && d.getElementById('legResultsTitle').textContent.trim() === d.getElementById('legResultsScope').textContent.trim() &&
     d.getElementById('legResultsScope').className === d.getElementById('legBillsScope').className && d.getElementById('legResultsTitle').className === d.getElementById('legBillsTitle').className, d.getElementById('legResultsTitle').textContent);
  ok(`before a state is chosen the results table lists the states ${RPAGE} to a page, with a column for each office, and a pager that counts the pages`,
     rows('legResultsTable') === Math.min(RPAGE, nStates) && [...resultsTable.querySelectorAll('th')].map(t => t.textContent).join() === 'State,Senate,House,Governor,Source' &&
     !resultsPager.hidden && resultsPager.querySelector('.pager-status').textContent === `Page 1 of ${rpagesOf(nStates)}` && resultsPager.getAttribute('aria-label') === 'Pages of states', resultsPager.textContent);
  // the pager walks every state once, alphabetically: RPAGE to a page, the last page holding the rest
  const stateSizes = [], seenStates = [];
  for (let i = 1; i <= rpagesOf(nStates); i++) {
    stateSizes.push(rows('legResultsTable')); seenStates.push(...[...resultsTable.querySelectorAll('tbody tr')].map(r => r.getAttribute('data-state')));
    if (i < rpagesOf(nStates)) fire(resultsPager.querySelector('button[aria-label="Next page"]'), 'click');
  }
  const stateOrder = JSON.parse(w.eval("JSON.stringify(Object.keys(MIDTERM_RESULTS).sort((a, b) => US_MAP.states[a].name.localeCompare(US_MAP.states[b].name)))"));
  ok(`walking the results pager lists every state once, in alphabetical order, ${RPAGE} to each page and the rest on the last, with Next out of use there`,
     stateSizes.length === rpagesOf(nStates) && stateSizes.slice(0, -1).every(n => n === RPAGE) && stateSizes[stateSizes.length - 1] === nStates - RPAGE * (rpagesOf(nStates) - 1) &&
     seenStates.length === nStates && new Set(seenStates).size === nStates && seenStates.join() === stateOrder.join() &&
     resultsPager.querySelector('.pager-status').textContent === `Page ${rpagesOf(nStates)} of ${rpagesOf(nStates)}` && resultsPager.querySelector('button[aria-label="Next page"]').disabled, stateSizes.join());
  fire(resultsPager.querySelector('button[data-page="2"]'), 'click');   // Iowa is on the second page
  ok('choosing a page of the results table takes the keyboard to that table, as the bills\' pager does', d.activeElement === resultsTable);
  const resultsShape = () => { const t = resultsTable.querySelector('table'); return !!t && t.classList.contains('leg-table--results') && [...t.querySelectorAll('th')].map(h => h.textContent).join() === 'State,Senate,House,Governor,Source'; };
  ok('the results table is the one whose column widths are fixed in the stylesheet (leg-table--results, columns State, Senate, House, Governor, Source), so every page of states is laid out as one state is', resultsShape());
  const ia = resultsTable.querySelector('tr[data-state="IA"]');
  ok('each result row links its offices to AP\'s race pages for that state',
     [...ia.querySelectorAll('a')].map(a => a.getAttribute('href')).join() === `${AP}iowa-us-senate-results/,${AP}iowa-us-house-results/,${AP}iowa-governor-results/`, ia.textContent);
  const sumD = w.eval('Object.values(MIDTERM_RESULTS).reduce((n, s) => n + (s.house.d || 0), 0)'), sumR = w.eval('Object.values(MIDTERM_RESULTS).reduce((n, s) => n + (s.house.r || 0), 0)');
  const note = d.getElementById('legSource').textContent;
  ok('the note under the results table reports it whenever the district results do not add up to AP\'s chamber total, and only then',
     (sumD === nat.house.democrats && sumR === nat.house.republicans) ? !/add up to/.test(note) : (new RegExp(`add up to ${sumD} Democratic and ${sumR} Republican wins`).test(note) && note.includes(`showed ${nat.house.democrats} and ${nat.house.republicans}`)), note);
  ok('and it starts with the standing note: each row links to AP\'s page for each of that state\'s races', /^Each row links to AP.s page for each of that state.s races\./.test(note), note);
  ok('the note sits right under the results table and above the divider that starts its pager, in the results section, so the table says where its links go', resultsTable.nextElementSibling === d.getElementById('legSource') && d.getElementById('legSource').nextElementSibling === resultsPager && d.getElementById('legResultsSection').contains(d.getElementById('legSource')));
  ok('and the bills table has its note the same way: under the table, above its pager', billsTable().nextElementSibling === d.getElementById('legBillsNote') && d.getElementById('legBillsNote').nextElementSibling === pager);
  fire(path('GA'), 'click');
  const gaN = countOf('GA');
  ok('clicking Georgia pins it: the menu follows, Clear shows, and both tables narrow to it, the bills table to Georgia\'s bills',
     d.getElementById('legStateSelect').value === 'GA' && d.getElementById('legReset').classList.contains('is-on') && rows('legResultsTable') === 1 && /Georgia/.test(resultsTable.textContent) &&
     rows('legBillsTable') === Math.min(PAGE, gaN) && [...billsTable().querySelectorAll('tbody tr')].every(r => r.getAttribute('data-state') === 'GA') &&
     d.getElementById('legBillsScope').textContent === `Georgia · ${num(gaN)} ${gaN === 1 ? 'bill' : 'bills'}`, `${rows('legBillsTable')} rows for ${gaN} bills`);
  ok('narrowed to one state it is the same table with the same columns, so it keeps the same widths, and with one row it has no pager', resultsShape() && rows('legResultsTable') === 1 && resultsPager.hidden);
  ok('a state\'s bills table has a Summary column only if one of its bills has a summary: only the columns something fills',
     heads() === `Jurisdiction,Bill,Title,Status,Last action,${w.eval("LEGISLATION_DATA.some(b => b.state === 'GA' && !b.passing && b.summary)") ? 'Summary,' : ''}Source`, heads());
  await leaveMap();
  ok('a pinned state keeps the card and its outline after the pointer leaves', /Georgia/.test(panel()) && d.getElementById('legRingPinned').getAttribute('d') === path('GA').getAttribute('d'));
  fire(d.getElementById('legReset'), 'click');
  ok('Clear returns to all jurisdictions', d.getElementById('legStateSelect').value === '' && !d.getElementById('legReset').classList.contains('is-on') && rows('legBillsTable') === Math.min(PAGE, nBills) &&
     rows('legResultsTable') === Math.min(RPAGE, nStates) && resultsPager.querySelector('.pager-status').textContent === `Page 1 of ${rpagesOf(nStates)}`);
  const sel = d.getElementById('legStateSelect');
  sel.value = 'AK'; sel.dispatchEvent(new w.Event('change', { bubbles: true }));
  ok('choosing a state in the menu does what clicking it does, for keyboard users', /Alaska/.test(panel()) && d.getElementById('legBillsScope').textContent.startsWith('Alaska') && rows('legResultsTable') === 1);
  fire(d.getElementById('legReset'), 'click');
  fire(tile('RI'), 'mouseover');
  ok('pointing at a small state\'s button does what pointing at its shape does: the card shows the state, the map outlines it, and the button is marked',
     /Rhode Island/.test(panel()) && /Democratic hold/.test(panel()) && d.getElementById('legRingHover').getAttribute('d') === path('RI').getAttribute('d') && tile('RI').classList.contains('is-hover'), panel());
  fire(path('CT'), 'mouseover');
  ok('pointing at a small state\'s shape marks its button, and only its button', tile('CT').classList.contains('is-hover') && !tile('RI').classList.contains('is-hover') && tiles.filter(b => b.classList.contains('is-hover')).length === 1);
  await leaveMap();
  ok('moving off the map unmarks the buttons', tiles.every(b => !b.classList.contains('is-hover')) && /United States/.test(panel()));
  fire(tile('RI'), 'click');
  ok('clicking a small state\'s button pins it: the button is pressed and outlined, the menu follows, Clear shows, and both tables narrow to it',
     tile('RI').getAttribute('aria-pressed') === 'true' && tile('RI').classList.contains('is-pinned') && d.getElementById('legStateSelect').value === 'RI' && d.getElementById('legReset').classList.contains('is-on') &&
     d.getElementById('legRingPinned').getAttribute('d') === path('RI').getAttribute('d') && d.getElementById('legBillsScope').textContent.startsWith('Rhode Island') && rows('legResultsTable') === 1 && /Rhode Island/.test(resultsTable.textContent) && tiles.filter(b => b.getAttribute('aria-pressed') === 'true').length === 1);
  fire(tile('RI'), 'click');
  ok('clicking it again lets go', tile('RI').getAttribute('aria-pressed') === 'false' && !tile('RI').classList.contains('is-pinned') && d.getElementById('legStateSelect').value === '' && d.getElementById('legBillsScope').textContent === `All jurisdictions · ${num(nBills)} bills` && rows('legResultsTable') === Math.min(RPAGE, nStates));
  tile('DE').dispatchEvent(new w.Event('focusin', { bubbles: true }));
  ok('giving a button the keyboard\'s focus previews its state, as pointing at it does', /Delaware/.test(panel()) && tile('DE').classList.contains('is-hover') && d.getElementById('legRingHover').getAttribute('d') === path('DE').getAttribute('d'), panel());
  tile('DE').dispatchEvent(new w.Event('focusout', { bubbles: true }));
  ok('and taking the focus away returns the card to the overview', /United States/.test(panel()) && !tile('DE').classList.contains('is-hover'));
  sel.value = 'NJ'; sel.dispatchEvent(new w.Event('change', { bubbles: true }));
  ok('choosing a small state in the Show menu marks its button pressed too, and only that one', tile('NJ').getAttribute('aria-pressed') === 'true' && tiles.filter(b => b.getAttribute('aria-pressed') === 'true').length === 1 && /New Jersey/.test(panel()));
  fire(d.getElementById('legReset'), 'click');
  ok('Clear lets go of it', tiles.every(b => b.getAttribute('aria-pressed') === 'false' && !b.classList.contains('is-pinned')));

  /* ── C. paging, the hover card's cap, the territories, and the sources ─────────────────────────── */
  // A jurisdiction's card gives its stats (its bill count, and the stats bar's bar and key) and links to the details below; it previews none of its bills (the owner had the previews taken
  // out, 2026-11-12). With no bills it says so instead. The only list items in it are the stats key's.
  const cardOk = total => !d.querySelector('#legPanel .leg-bill-list') && (!!d.querySelector('#legPanel .leg-more-link') === !!total) && !/more in the table below/.test(panel()) &&   // the link is only for a place that has bills to show
    [...d.querySelectorAll('#legPanel li')].every(li => li.closest('.leg-stats-key')) &&
    (total ? d.querySelector('#legPanel .leg-card-total').textContent === `${num(total)} ${total === 1 ? 'bill' : 'bills'}` && !!d.querySelector('#legPanel .leg-stats--card .leg-stats-bar') : !d.querySelector('#legPanel .leg-card-total'));
  const firstRow = () => billsTable().querySelector('tbody tr').textContent;
  const page1 = firstRow();
  fire(pager.querySelector('button[aria-label="Next page"]'), 'click');
  ok(`Next turns the bills table to its second page: a different ${PAGE}, and the pager says where it is`,
     rows('legBillsTable') === Math.min(PAGE, nBills - PAGE) && firstRow() !== page1 && pager.querySelector('.pager-status').textContent === `Page 2 of ${pagesOf(nBills)}`, pager.textContent);
  ok(`the bills table never lists more than ${PAGE} bills a page`, nBills > PAGE && rows('legBillsTable') <= PAGE && pagesOf(nBills) === Math.ceil(nBills / PAGE), `${rows('legBillsTable')} rows, ${pagesOf(nBills)} pages`);
  // the pager walks every bill once: from the first page to the last, PAGE to a page, the last holding the rest
  const pageSizes = [];
  fire(pager.querySelector('button[aria-label="Previous page"]'), 'click');
  for (let i = 1; i <= pagesOf(nBills); i++) {
    pageSizes.push(rows('legBillsTable'));
    if (i < pagesOf(nBills)) fire(pager.querySelector('button[aria-label="Next page"]'), 'click');
  }
  ok(`walking the pager from the first page to the last lists every bill once: ${PAGE} to each page, and the last page holds the rest, with Next out of use there`,
     pageSizes.length === pagesOf(nBills) && pageSizes.slice(0, -1).every(n => n === PAGE) && pageSizes[pageSizes.length - 1] === nBills - PAGE * (pagesOf(nBills) - 1) &&
     pageSizes.reduce((t, n) => t + n, 0) === nBills && pager.querySelector('.pager-status').textContent === `Page ${pagesOf(nBills)} of ${pagesOf(nBills)}` &&
     pager.querySelector('button[aria-label="Next page"]').disabled, pageSizes.join());
  sel.value = 'CA'; sel.dispatchEvent(new w.Event('change', { bubbles: true }));
  const caN = countOf('CA');
  ok('choosing a jurisdiction starts its table on page 1 again, with its own count and pages',
     rows('legBillsTable') === Math.min(PAGE, caN) && d.getElementById('legBillsScope').textContent === `California · ${num(caN)} bills` &&
     (pagesOf(caN) > 1 ? pager.querySelector('.pager-status').textContent === `Page 1 of ${pagesOf(caN)}` : pager.hidden), `${rows('legBillsTable')} rows of ${caN}`);
  fire(d.getElementById('legReset'), 'click');
  fire(path('NY'), 'mouseover');
  const nyN = countOf('NY');
  ok('the hover card gives a state\'s stats and a link to the details below, and previews none of its bills', cardOk(nyN), panel());
  ok('the hover card sits in a slot that keeps it within the map\'s height', d.getElementById('legPanel').parentElement.classList.contains('leg-panel-slot'));
  // the card's stats on the state, and its link to the details below
  const nyStages = JSON.parse(w.eval("(() => { const c = {}; LEGISLATION_DATA.filter(b => b.state === 'NY' && !b.passing).forEach(b => { c[b.stage] = (c[b.stage] || 0) + 1; }); return JSON.stringify(c); })()"));
  const nyParts = stageOrder.filter(k => nyStages[k]), moreLink = () => d.querySelector('#legPanel .leg-more-link');
  ok('a state\'s card has stats on the state: how many bills it has, the stats bar for them, and each stage\'s count and share of them',
     d.querySelector('#legPanel .leg-card-total').textContent === `${num(nyN)} ${nyN === 1 ? 'bill' : 'bills'}` &&
     [...d.querySelectorAll('#legPanel .leg-stats--card .leg-stats-seg')].map(x => x.getAttribute('data-stage')).join() === nyParts.join() &&
     [...d.querySelectorAll('#legPanel .leg-stats--card .leg-stats-key li')].map(li => li.textContent).join() === nyParts.map(k => `${num(nyStages[k])} ${stageName(k).toLowerCase()} (${pctOf(nyStages[k], nyN)})`).join() &&
     d.querySelector('#legPanel .leg-stats--card .leg-stats-bar').getAttribute('aria-label') === `Where the ${num(nyN)} ${nyN === 1 ? 'bill stands' : 'bills stand'}: ${nyParts.map(k => `${num(nyStages[k])} ${stageName(k).toLowerCase()} (${pctSaid(nyStages[k], nyN)})`).join(', ')}.`, panel());
  ok('and a link that says See more details below', !!moreLink() && moreLink().textContent === 'See more details below' && moreLink().getAttribute('data-more') === 'NY', panel());
  let jumps = [];
  ['legBillsTitle'].forEach(id => { d.getElementById(id).scrollIntoView = function () { jumps.push(this.id); }; });   // a test DOM has no layout: record where the page is sent
  fire(moreLink(), 'click');
  ok('following the link pins the state, so the tables below are about it, and takes the reader to the details: the Bills title, with focus on the table',
     d.getElementById('legStateSelect').value === 'NY' && d.getElementById('legBillsScope').textContent === `New York · ${num(nyN)} ${nyN === 1 ? 'bill' : 'bills'}` && rows('legResultsTable') === 1 &&
     jumps.join() === 'legBillsTitle' && d.activeElement === billsTable(), `${d.getElementById('legStateSelect').value} / ${jumps} / ${d.getElementById('legBillsScope').textContent}`);
  fire(d.getElementById('legReset'), 'click');
  // the card stays for the pointer to reach its link: with nothing pinned, the state last pointed at stays for a moment after the pointer leaves the map, and while the pointer is on the card
  d.getElementById('legMap').dispatchEvent(new w.MouseEvent('mouseleave', { bubbles: true }));
  ok('after the pointer leaves the map the card stays on the state for a moment, so the pointer can reach its link', /New York/.test(panel()) && !!moreLink(), panel());
  fire(d.getElementById('legPanel'), 'mouseenter');
  await wait(GRACE + 80);
  ok('and once the pointer is on the card it stays for as long as the pointer does', /New York/.test(panel()) && !!moreLink() && d.getElementById('legRingHover').getAttribute('d') === path('NY').getAttribute('d'), panel());
  fire(d.getElementById('legPanel'), 'mouseleave');
  ok('leaving the card sends it back to the overview', /United States/.test(panel()) && !/New York/.test(panel()), panel());
  fire(path('NY'), 'mouseover');
  await leaveMap();
  ok('a pointer that never reaches the card lets it go after that moment', /United States/.test(panel()) && !/New York/.test(panel()), panel());
  fire(path('GA'), 'click');
  fire(path('NY'), 'mouseover');
  d.getElementById('legMap').dispatchEvent(new w.MouseEvent('mouseleave', { bubbles: true }));
  ok('with a state pinned the card goes back to it at once, not to the last state the pointer crossed', /Georgia/.test(panel()) && !/New York/.test(panel()) && !!moreLink() && moreLink().getAttribute('data-more') === 'GA', panel());
  fire(d.getElementById('legReset'), 'click');
  fire(path('NY'), 'mouseover');
  await leaveMap();
  sel.value = 'PR'; sel.dispatchEvent(new w.Event('change', { bubbles: true }));
  const prN = countOf('PR');
  ok('a territory, which has no shape on the map, is chosen from the menu: its card gives its stats, and its results block and the results table say AP lists no races for it',
     /Puerto Rico/.test(panel()) && cardOk(prN) && /AP lists no 2026 races for Puerto Rico/.test(panel()) && /AP lists no 2026 races for Puerto Rico/.test(d.getElementById('legResultsTable').textContent), panel());
  ok('and Puerto Rico\'s bills are named for it in the table', rows('legBillsTable') === Math.min(PAGE, prN) && [...billsTable().querySelectorAll('tbody tr')].every(r => /Puerto Rico/.test(r.firstElementChild.textContent)));
  fire(d.getElementById('legReset'), 'click');
  sel.value = 'federal'; sel.dispatchEvent(new w.Event('change', { bubbles: true }));
  ok('choosing Federal in the Show menu narrows the bills table to Congress\'s bills, paged, and the card gives Congress\'s stats with the link to them',
     sel.value === 'federal' && rows('legBillsTable') === Math.min(PAGE, nFed) &&
     cardOk(nFed) &&
     heads() === 'Jurisdiction,Bill,Title,Status,Last action,Summary,Source' && d.getElementById('legBillsNote').textContent === `Federal bills are ${feeds.govinfo.scope}. ${feeds.govinfo.summaries}${nFedPassing ? ' ' + passNote(nFedPassing) : ''}`, `${heads()} | ${d.getElementById('legBillsNote').textContent}`);
  fire(d.getElementById('legReset'), 'click');
  const links2 = [...d.getElementById('legMapSource').querySelectorAll('a')].map(a => a.getAttribute('href'));
  ok('the line below the map cites GovInfo for the federal bills and Open States for the state bills, each with a link to its page, and then the Associated Press for the midterm results in the card, and no tracker',
     /^Sources: U\.S\. Government Publishing Office, “Bill Status XML Bulk Data” \(bulk data, read /.test(d.getElementById('legMapSource').textContent) &&
     /Open States, “Bill search” \(API v3, read /.test(d.getElementById('legMapSource').textContent) && /The Associated Press, “2026 Midterm Election Results/.test(d.getElementById('legMapSource').textContent) &&
     links2.join() === Object.values(feeds).map(f => f.url).concat([AP]).join() && !/tracker/i.test(d.getElementById('legMapSource').textContent), d.getElementById('legMapSource').textContent);
  // the newest of the sources' own dates: the feeds give the day they were read, AP the stamp its results were copied with ("November 17, 2026, 9:44 AM"), and the latest wins
  const stampKey = s => { const m = /^([A-Za-z]+) (\d{1,2}), (\d{4})(?:, (\d{1,2}):(\d{2}) ([AP]M))?$/.exec(s); return Date.UTC(+m[3], MONTHS.indexOf(m[1]), +m[2], (+m[4] || 0) % 12 + (m[6] === 'PM' ? 12 : 0), +m[5] || 0); };
  const allStamps = Object.values(feeds).map(f => f.read && longDay(f.read)).concat([apStamp]).filter(Boolean), newestStamp = allStamps.slice().sort((a, b) => stampKey(b) - stampKey(a))[0];
  ok('and it ends with when the page was last updated, on a line of its own: the newest of the sources\' dates (AP\'s own stamp, as written, or a feed\'s day), while each source\'s own date stays in its citation',
     !!newestStamp && d.querySelectorAll('#legMapSource .leg-map-updated').length === 1 && d.querySelector('#legMapSource .leg-map-updated').textContent === `Last updated ${newestStamp}.` &&
     d.getElementById('legMapSource').textContent.endsWith(` Last updated ${newestStamp}.`) && Object.values(feeds).every(f => d.getElementById('legMapSource').textContent.includes(`read ${longDay(f.read)})`)) &&
     d.getElementById('legMapSource').textContent.includes(`updated ${apStamp})`), d.getElementById('legMapSource').textContent);
  const readDays = Object.keys(feeds).map(k => [k, feeds[k].read]);
  readDays.forEach(([k]) => w.eval(`LEGISLATION_FEEDS.${k}.read = ''`));
  w.eval('MIDTERM_SOURCES.ap.updated = ""');
  area.dispatchEvent(new w.Event('legislation:refresh'));
  ok('with no source dated the line makes up no date: it still cites the sources, and says nothing about when they were updated',
     /^Sources: /.test(d.getElementById('legMapSource').textContent) && !/Last updated/.test(d.getElementById('legMapSource').textContent) && !d.querySelector('#legMapSource .leg-map-updated'), d.getElementById('legMapSource').textContent);
  readDays.forEach(([k, v]) => w.eval(`LEGISLATION_FEEDS.${k}.read = ${JSON.stringify(v)}`));
  w.eval(`MIDTERM_SOURCES.ap.updated = ${JSON.stringify(apStamp)}`);
  area.dispatchEvent(new w.Event('legislation:refresh'));

  /* ── D. the bill paths, with five bills of our own ───────────────────────────────────────────────────────── */
  const real = w.eval('LEGISLATION_DATA.splice(0)');
  area.dispatchEvent(new w.Event('legislation:refresh'));
  ok('with no bills the masthead is the same words (it quotes no count), and the table says nothing is loaded',
     mastheadText() === GOV_BLURB &&
     rows('legBillsTable') === 0 && /No legislation has been added yet/.test(billsTable().textContent) && pager.hidden && d.getElementById('legBillsTitle').textContent.trim() === 'All jurisdictions · 0 bills', mastheadText());
  ok('and with no bills that only lightly mention AI the checkbox is not offered', passWrap.hidden && !/Include bills that only lightly mention AI/.test(d.getElementById('legBillsNote').textContent));
  w.eval(`LEGISLATION_DATA.push(
    { id: 'zz-1', level: 'state', state: 'TX', bill: 'HB 1', title: 'A test bill', stage: 'committee', status: 'Referred to the House Technology Committee', summary: 'Does a thing.',
      lastAction: { date: '2026-03-01', text: 'Referred to committee' }, source: { label: 'Test source', url: 'https://example.org/bill' } },
    { id: 'zz-2', level: 'state', state: 'OH', bill: 'SB 2', title: 'Another test bill', stage: 'enacted', source: { label: 'Unsafe link', url: 'javascript:alert(1)' } },
    { id: 'zz-3', level: 'federal', bill: 'H.R. 3', title: 'A federal test bill', stage: 'introduced' },
    { id: 'zz-4', level: 'state', state: 'TX', bill: 'HB 4', title: 'A failed test bill', stage: 'failed' },
    { id: 'zz-5', level: 'state', state: 'CA', bill: 'AB 5', title: 'A test bill with no stage' })`);
  area.dispatchEvent(new w.Event('legislation:refresh'));
  ok('active means introduced and not failed: of five bills in the data only the three that have not failed are listed, state and federal together, the one with a last action first and Congress ahead of the states among the rest',
     rows('legBillsTable') === 3 && !/failed test bill|no stage/.test(billsTable().textContent) && /^Texas/.test(billsTable().querySelector('tbody tr').textContent) &&
     /^Federal/.test(billsTable().querySelectorAll('tbody tr')[1].textContent), billsTable().textContent);
  ok('a note under the table says how many bills were left out, and why',
     /2 bills in the data are not shown as active: 1 failed, 1 with no stage given/.test(d.getElementById('legBillsNote').textContent), d.getElementById('legBillsNote').textContent);
  ok('with three bills in the data the masthead is still the same words', mastheadText() === GOV_BLURB, mastheadText());
  ok('a bill shows its stage as plain text, with the source\'s own words beneath when they differ, its last action, and a dash for what a source does not give',
     /In committee/.test(billsTable().querySelector('tr[data-state="TX"]').textContent) && /Referred to the House Technology Committee/.test(billsTable().querySelector('tr[data-state="TX"]').textContent) &&
     /March 1, 2026: Referred to committee/.test(billsTable().textContent) && /–/.test(billsTable().querySelector('tr[data-state="OH"]').textContent));
  ok('a link is shown only when its address is http or https', billsTable().querySelectorAll('a').length === 1 && billsTable().querySelector('a').getAttribute('href') === 'https://example.org/bill');
  fire(path('TX'), 'mouseover');
  ok('the state card counts the state\'s active bill, in committee, and not its failed one', cardOk(1) && d.querySelector('#legPanel .leg-stats--card .leg-stats-key').textContent === '1 in committee (100%)', panel());
  await leaveMap();
  d.getElementById('legStateSelect').value = 'federal'; d.getElementById('legStateSelect').dispatchEvent(new w.Event('change', { bubbles: true }));
  ok('choosing Federal in the Show menu shows Congress\'s stats in the card: its one bill, and a link to it below', /Federal \(Congress, agencies and courts\)/.test(panel()) && /Bills in Congress/.test(panel()) && cardOk(1) && d.querySelector('#legPanel .leg-more-link').getAttribute('data-more') === 'federal', panel());
  ok('and pins it: both tables narrow to Congress, the results table says the results are by state, and the card says so too',
     d.getElementById('legStateSelect').value === 'federal' && rows('legBillsTable') === 1 && /H\.R\. 3/.test(billsTable().textContent) &&
     rows('legResultsTable') === 0 && /results are by state/.test(d.getElementById('legResultsTable').textContent) && /results are by state/.test(panel()) && /Federal \(Congress\)/.test(d.getElementById('legBillsScope').textContent));
  ok('and when there is nothing to show (Federal) the results table still has its columns', resultsShape());
  fire(d.getElementById('legReset'), 'click');
  ok('Clear returns from Federal to all jurisdictions', d.getElementById('legStateSelect').value === '' && rows('legBillsTable') === 3);
  sel.value = 'OH'; sel.dispatchEvent(new w.Event('change', { bubbles: true }));
  ok('a column that is empty for every bill in view is left out: Ohio\'s one bill has no last action and no summary, so the table has neither column', heads() === 'Jurisdiction,Bill,Title,Status,Source', heads());
  fire(d.getElementById('legReset'), 'click');
  ok('the map shades only states with an active state bill, and the legend counts the federal bills that are not on the map',
     /fill-b1/.test(path('TX').getAttribute('class')) && /fill-b1/.test(path('OH').getAttribute('class')) && !/fill-b/.test(path('CA').getAttribute('class')) &&
     /1 item\s*2/.test(legend()) && /Federal items, not on the map\s*1/.test(legend()), legend());
  ok('the buttons follow the shading as well: none of the small states has a test bill, so none is shaded', tilesMatch() && tiles.every(b => !/fill-/.test(b.getAttribute('class'))), tiles.map(b => b.textContent + ':' + fillOf(b)).join());
  w.eval('LEGISLATION_DATA.length = 0');
  w.__real = real; w.eval('LEGISLATION_DATA.push(...window.__real)');
  area.dispatchEvent(new w.Event('legislation:refresh'));
  ok('with the real bills put back the tab is as it opened, checkbox included', rows('legBillsTable') === Math.min(PAGE, nBills) && mastheadText() === GOV_BLURB && !passWrap.hidden && passWrap.querySelector('.leg-muted-count').textContent === num(nPassing));
  await leaveMap();

  /* ── E. the filter bar: the topic chips, the Status menu, the checkbox and the search ─────────────────────────────────────────────
     First on the shipped bills (what the page does with real data), then on ten test bills and three test topics of our own, whose words and
     counts can be worked out by hand: a word in the title, two different words in the summary, a whole-word marker, AND between chips, "No topic",
     search across everything a row shows, the switch and the filters together, a jurisdiction pinned, an empty result, and paging. */
  const searchBox = d.getElementById('legSearch'), clearFilters = d.getElementById('legReset');   // the Reset button: is-on says something is chosen or filtered
  const chips = () => [...d.querySelectorAll('#legTopicPills button[data-topic]')], chipOf = id => d.querySelector(`#legTopicPills button[data-topic="${id}"]`);
  const chipText = b => b.textContent.replace(/\s+/g, ' ').trim(), chipN = b => Number(b.querySelector('.kw-count').textContent.replace(/,/g, ''));
  const resultLine = () => d.getElementById('legResultLine').textContent;
  const typeInto = async text => { searchBox.value = text; searchBox.dispatchEvent(new w.Event('input', { bubbles: true })); await wait(260); };
  const titles = () => [...billsTable().querySelectorAll('tbody tr:not(.leg-empty-row)')].map(tr => tr.querySelector('td.leg-col-title').childNodes[0].textContent);
  const topicDefs = JSON.parse(w.eval('JSON.stringify(LEGISLATION_TOPICS.map(t => ({ id: t.id, label: t.label, words: t.words.length })))'));
  const mastBefore = mastheadText();
  ok('above the map there is a filter bar: a search box under the topics, and a result line that counts the bills against all the filters, with no Clear filters yet',
     !!d.getElementById('legFilters') && d.getElementById('legFilters').classList.contains('controls') && searchBox.type === 'search' && searchBox.getAttribute('aria-label') &&
     !clearFilters.classList.contains('is-on') && resultLine() === `${num(nBills)} of ${num(nBills)} bills.`, resultLine());
  ok('the topics are defined in the data, each with an id, a label and some words, and no two share an id',
     topicDefs.length >= 5 && new Set(topicDefs.map(t => t.id)).size === topicDefs.length && topicDefs.every(t => t.id && t.label && t.words > 0 && t.id !== 'all' && t.id !== 'none'), JSON.stringify(topicDefs.map(t => t.id)));
  /* A bill's status and a race's result are labels to read, so they are not pills (a pill looks like a button): the status is its stage in words, as plain text; a result is a square in the
     party's colour and the words, bold for a gain and for a race not yet called. (The status had a row of dots under its words for a few hours on 2026-11-17; the owner preferred the words alone.) */
  const stageLabels = JSON.parse(w.eval("JSON.stringify(Object.keys(LEGISLATION_STAGES).map(k => LEGISLATION_STAGES[k].label))"));
  const statusRows = [...billsTable().querySelectorAll('tbody tr:not(.leg-empty-row)')];
  ok('a bill\'s status is its stage in words as plain text: the cell\'s own text starts with the stage, with no pill and no dots',
     statusRows.length > 0 && statusRows.every(tr => { const cell = tr.children[3], first = cell.firstChild; return !!first && first.nodeType === 3 && stageLabels.includes(first.textContent) && !cell.querySelector('.leg-chip, .leg-step, .leg-track'); }),
     statusRows.slice(0, 2).map(tr => tr.children[3].textContent).join(' | '));
  const RESULT_WORDS = { 'd-gain': 'Democratic gain', 'd-hold': 'Democratic hold', 'r-hold': 'Republican hold', 'r-gain': 'Republican gain', uncalled: 'Uncalled' };
  const raceCells = [];
  ['TX', 'NE', 'AK'].forEach(c => { fire(path(c), 'mouseover'); raceCells.push(...d.querySelectorAll('#legPanel .leg-result')); });
  ok('a race\'s result in the card is a square in the party\'s colour and the words, not a pill: a gain or a race not yet called is bold, a hold is plain',
     raceCells.length > 0 && raceCells.every(el => {
       const sw = el.querySelector('.leg-swatch'), key = sw && (sw.className.match(/fill-(d-gain|d-hold|r-hold|r-gain|uncalled)/) || [])[1];
       return !!key && sw.getAttribute('aria-hidden') === 'true' && el.textContent.trim() === RESULT_WORDS[key] && el.classList.contains('leg-result--news') === ['d-gain', 'r-gain', 'uncalled'].includes(key);
     }) && raceCells.some(el => el.classList.contains('leg-result--news')) && raceCells.some(el => !el.classList.contains('leg-result--news')) && !d.querySelector('#legPanel .leg-chip'), raceCells.length + ' results');
  await leaveMap();
  const tableCells = [...d.querySelectorAll('#legResultsTable tbody tr:not(.leg-empty-row) .leg-result')];
  ok('a race\'s result in the results table is the same square and words as in the card, not a pill: a gain or a race not yet called is bold, a hold is plain',
     tableCells.length > 0 && tableCells.every(el => {
       const sw = el.querySelector('.leg-swatch'), key = sw && (sw.className.match(/fill-(d-gain|d-hold|r-hold|r-gain|uncalled)/) || [])[1];
       return !!key && sw.getAttribute('aria-hidden') === 'true' && el.textContent.trim() === RESULT_WORDS[key] && el.classList.contains('leg-result--news') === ['d-gain', 'r-gain', 'uncalled'].includes(key);
     }) && !d.querySelector('#legResultsTable .leg-chip'), tableCells.length + ' results');
  ok('the chips are All, then one for each topic in the data\'s order, then No topic; each carries its count, and All counts every bill',
     chips().length === topicDefs.length + 2 && chipText(chips()[0]).startsWith('All') && chipN(chips()[0]) === nBills && chipText(chips()[chips().length - 1]).startsWith('No topic') &&
     topicDefs.every((t, i) => chipText(chips()[i + 1]).startsWith(t.label)) && chips().every(b => b.getAttribute('aria-pressed') === (b.dataset.topic === 'all' ? 'true' : 'false')), chips().map(chipText).join(' | '));
  ok('the topics are always showing, and there is no note under them about how a topic is assigned or how many bills have none',
     w.getComputedStyle(d.getElementById('legTopicPills')).display !== 'none' && !d.getElementById('legTopicNote') && !/our reading of each bill/.test(d.getElementById('legislationArea').textContent) && !/have none\./.test(d.getElementById('legTopicsBar').textContent));
  const pickable = chips().find(b => !['all', 'none'].includes(b.dataset.topic) && !b.disabled && chipN(b) > 0 && chipN(b) < nBills);
  if (pickable) {
    const k = chipN(pickable), label = chipText(pickable).replace(/\s*[\d,]+$/, '');
    fire(pickable, 'click');
    ok(`choosing a topic (${label}) narrows the result line, the table and its title to the ${k} bills that have it, marks the chip, shows Clear filters, and leaves the masthead saying what is loaded`,
       resultLine() === `${num(k)} of ${num(nBills)} bills.` && pickable.getAttribute('aria-pressed') === 'true' && clearFilters.classList.contains('is-on') &&
       rows('legBillsTable') === Math.min(PAGE, k) && d.getElementById('legBillsScope').textContent === `All jurisdictions · ${num(k)} ${k === 1 ? 'bill' : 'bills'}` && mastheadText() === mastBefore,
       `${resultLine()} / ${d.getElementById('legBillsScope').textContent}`);
    const fedLeft = Number(((/Federal items, not on the map\s*([\d,]+)/.exec(legend()) || [])[1] || '0').replace(/,/g, '')), stateLeft = k - fedLeft;
    ok('every bill left shows the topic on its row, and the panel\'s overview and the Federal count follow the filter (the state bills and the federal bills left add up to the bills the topic has)',
       [...billsTable().querySelectorAll('tbody tr')].every(tr => tr.textContent.includes('Topics: ') && tr.textContent.includes(label)) && stateLeft >= 0 &&
       (stateLeft ? new RegExp(`${num(stateLeft)} ${stateLeft === 1 ? 'bill' : 'bills'} in `).test(panel()) : !/ bills? in /.test(panel().replace(/federal bills?/, ''))) &&
       (fedLeft ? new RegExp(`${num(fedLeft)} federal ${fedLeft === 1 ? 'bill' : 'bills'}`).test(panel()) : !/federal bill/.test(panel())), `${k} left: ${stateLeft} state, ${fedLeft} federal; ` + panel());
    fire(clearFilters, 'click');
    ok('Reset all puts everything back (the chips, the table, the result line)',
       resultLine() === `${num(nBills)} of ${num(nBills)} bills.` && chipOf('all').getAttribute('aria-pressed') === 'true' && !clearFilters.classList.contains('is-on') &&
       rows('legBillsTable') === Math.min(PAGE, nBills), resultLine());
  } else ok('there is a topic that some, but not all, of the bills have (so the filter can be shown to narrow the list)', false, chips().map(chipText).join(' | '));
  const sample = String(w.eval("(() => { const re = /^[A-Za-z]{7,}$/; const b = LEGISLATION_DATA.find(x => !x.passing && x.title && x.title.split(/\\s+/).some(y => re.test(y))); return b ? b.title.split(/\\s+/).find(y => re.test(y)) : ''; })()") || '').toLowerCase();
  await typeInto(sample);
  ok(`searching for a word (${sample}) keeps the bills with it somewhere in what a row shows, and no others`,
     rows('legBillsTable') > 0 && [...billsTable().querySelectorAll('tbody tr')].every(tr => tr.textContent.toLowerCase().includes(sample)) && clearFilters.classList.contains('is-on') &&
     new RegExp(`^${rows('legBillsTable') < PAGE ? rows('legBillsTable') : '\\d[\\d,]*'} of ${num(nBills)} bills\\.$`).test(resultLine()), resultLine());
  await typeInto('qqzzxx');
  ok('a search nothing matches says so, in the table and the panel, with no pager and a count of none, and the chips run down to nothing',
     rows('legBillsTable') === 0 && /No bills match the search and filters chosen\./.test(billsTable().textContent) && pager.hidden && /No bills match/.test(panel()) && d.getElementById('legBillsTitle').textContent.trim() === 'All jurisdictions · 0 bills' &&
     resultLine() === `0 of ${num(nBills)} bills.` && chips().filter(b => !['all'].includes(b.dataset.topic)).every(b => b.disabled), billsTable().textContent);
  fire(clearFilters, 'click');
  ok('and Reset all clears the search too', searchBox.value === '' && rows('legBillsTable') === Math.min(PAGE, nBills) && resultLine() === `${num(nBills)} of ${num(nBills)} bills.`);

  // ── sort and status on the shipped bills
  const sortSelR = d.getElementById('legSort'), setSortR = v => { sortSelR.value = v; sortSelR.dispatchEvent(new w.Event('change', { bubbles: true })); };
  const oldestAction = w.eval("LEGISLATION_DATA.filter(b => !b.passing && b.lastAction && b.lastAction.date).map(b => b.lastAction.date).sort()[0]");
  setSortR('oldest');
  ok('Sort by Oldest action starts the table with the oldest last action, in order, and starts again at page 1 (it is not a filter, but the Reset button counts the order: Reset all (1))',
     dates()[0] === oldestAction && inOrder(dates(), false) && pager.querySelector('.pager-status').textContent === `Page 1 of ${pagesOf(nBills)}` && clearFilters.classList.contains('is-on') && d.getElementById('legResetText').textContent === 'Reset all (1)', `${dates().slice(0, 3)} vs ${oldestAction}`);
  setSortR('jurisdiction');
  ok('Sort by Jurisdiction puts Congress first (the first page is all federal bills while there are as many as a page)', nFed >= PAGE ? [...billsTable().querySelectorAll('tbody tr')].every(r => /^Federal/.test(r.firstElementChild.textContent)) : /^Federal/.test(billsTable().querySelector('tbody tr').textContent));
  setSortR('recent');
  const stageList = JSON.parse(w.eval("JSON.stringify(Object.keys(LEGISLATION_STAGES).filter(k => LEGISLATION_STAGES[k].active).map(k => ({ k, label: LEGISLATION_STAGES[k].label, n: LEGISLATION_DATA.filter(b => !b.passing && b.stage === k).length })))"));
  const statusR = d.getElementById('legStatus');
  ok('the Status menu offers All statuses and each stage that counts as active, in the data\'s order, each with the number of bills at it; Failed is not offered',
     [...statusR.options].map(o => o.textContent).join() === ['All statuses', ...stageList.map(s => `${s.label} (${num(s.n)})`)].join() && !/Failed/.test(statusR.textContent), [...statusR.options].map(o => o.textContent).join());
  const stagePick = stageList.find(s => s.n > 0 && s.n < nBills);
  if (stagePick) {
    statusR.value = stagePick.k; statusR.dispatchEvent(new w.Event('change', { bubbles: true }));
    ok(`choosing a status (${stagePick.label}) narrows the table and the result line to the ${stagePick.n} bills at that stage, and every row says so`,
       resultLine() === `${num(stagePick.n)} of ${num(nBills)} bills.` && rows('legBillsTable') === Math.min(PAGE, stagePick.n) && clearFilters.classList.contains('is-on') && mastheadText() === mastBefore &&
       [...billsTable().querySelectorAll('tbody tr')].every(tr => tr.textContent.includes(stagePick.label)), resultLine());
    fire(clearFilters, 'click');
    ok('and Reset all puts the status back to all', statusR.value === '' && resultLine() === `${num(nBills)} of ${num(nBills)} bills.`);
  } else ok('there is a stage that some, but not all, of the bills are at', false, stageList.map(s => s.label + s.n).join());

  // ── the Reset button: one button for the jurisdiction and every filter (the owner's choice, 2026-11-18)
  const resetText = () => d.getElementById('legResetText').textContent, liveSaid = () => d.getElementById('legAnnounce').textContent;
  ok('the Reset button is always there, the last thing in the sticky toolbar, a button and not a link, and reads Reset all, as an outline, while nothing is chosen or filtered',
     clearFilters.matches('button') && !!clearFilters.closest('#legSticky') && clearFilters.parentElement.lastElementChild === clearFilters && !clearFilters.hidden && !clearFilters.classList.contains('is-on') && resetText() === 'Reset all' && clearFilters.getAttribute('title').length > 20);
  fire(clearFilters, 'click');
  ok('pressing it with nothing on says so, rather than doing nothing silently', /Nothing is chosen or filtered/.test(liveSaid()), liveSaid());
  setSortR('oldest');
  const topicPick = chips().find(b => !['all', 'none'].includes(b.dataset.topic) && !b.disabled && chipN(b) > 0 && chipN(b) < nBills);
  fire(topicPick, 'click');
  statusR.value = stagePick.k; statusR.dispatchEvent(new w.Event('change', { bubbles: true }));
  await typeInto('a');
  if (!passWrap.hidden) fire(passBox, 'click');
  d.getElementById('legStateSelect').value = 'TX'; d.getElementById('legStateSelect').dispatchEvent(new w.Event('change', { bubbles: true }));
  const nOn = 1 + 1 + 1 + 1 + 1 + (passWrap.hidden ? 0 : 1);   // the state, the topic, the status, the word, the order (Oldest), and the checkbox when it is offered
  ok(`with a state, a topic, a status, a word, the order and the checkbox on, the button turns solid and counts them: Reset all (${nOn})`, clearFilters.classList.contains('is-on') && resetText() === `Reset all (${nOn})`, resetText());
  fire(clearFilters, 'click');
  ok('pressing it clears all of them at once: the state, the topic, the status, the word, the checkbox and the order (back to Most recent), and puts the table and the result line back',
     d.getElementById('legStateSelect').value === '' && searchBox.value === '' && statusR.value === '' && !passBox.checked && chipOf('all').getAttribute('aria-pressed') === 'true' && resultLine() === `${num(nBills)} of ${num(nBills)} bills.` &&
     !clearFilters.classList.contains('is-on') && resetText() === 'Reset all' && sortSelR.value === 'recent' && /Everything is reset/.test(liveSaid()), resultLine() + ' | ' + resetText());
  setSortR('recent');
  searchBox.value = 'qqzzxx'; searchBox.dispatchEvent(new w.Event('input', { bubbles: true }));
  fire(clearFilters, 'click');
  await wait(300);
  ok('words typed but not yet applied are cleared too, and the pending search does not come back after the button is pressed', searchBox.value === '' && resultLine() === `${num(nBills)} of ${num(nBills)} bills.` && resetText() === 'Reset all', searchBox.value + ' | ' + resultLine());


  // ── on bills and topics of our own ──
  w.__realE = w.eval('LEGISLATION_DATA.splice(0)');
  w.__topicsE = w.eval('LEGISLATION_TOPICS.splice(0)');
  w.eval(`LEGISLATION_TOPICS.push(
    { id: 'pets', label: 'Pets', words: ['dog', 'puppy', 'cat$'] },
    { id: 'cars', label: 'Cars', words: ['vehicle', 'truck', 'car$'] },
    { id: 'rules', label: 'Rules', words: ['rule'] })`);
  w.eval(`LEGISLATION_DATA.push(
    { id: 'f-1', level: 'state', state: 'TX', bill: 'HB 11', title: 'Dog licensing', stage: 'committee', summary: 'Licenses dogs.', lastAction: { date: '2026-03-01', text: 'Taken up' } },
    { id: 'f-2', level: 'state', state: 'TX', bill: 'HB 12', title: 'Cat and puppy parks', stage: 'introduced', lastAction: { date: '2026-05-10', text: 'Taken up' } },
    { id: 'f-3', level: 'state', state: 'OH', bill: 'SB 21', title: 'Truck weight limits', stage: 'enacted', lastAction: { date: '2026-01-15', text: 'Taken up' } },
    { id: 'f-4', level: 'state', state: 'OH', bill: 'SB 22', title: 'Registering a vehicle with a dog', stage: 'committee' },
    { id: 'f-5', level: 'state', state: 'CA', bill: 'AB 31', title: 'Animal welfare', stage: 'committee', summary: 'Covers a dog and a puppy.', lastAction: { date: '2026-05-10', text: 'Taken up' } },
    { id: 'f-6', level: 'state', state: 'CA', bill: 'AB 32', title: 'Animal welfare', stage: 'committee', summary: 'Covers a dog.', lastAction: { date: '2026-02-01', text: 'Taken up' } },
    { id: 'f-7', level: 'federal', bill: 'H.R. 41', title: 'Category review', stage: 'introduced' },
    { id: 'f-8', level: 'federal', bill: 'H.R. 42', title: 'A rule on vehicles', stage: 'introduced', lastAction: { date: '2026-04-20', text: 'Taken up' } },
    { id: 'f-9', level: 'state', state: 'TX', bill: 'HB 99', title: 'Dog tax', stage: 'committee', passing: true },
    { id: 'f-10', level: 'state', state: 'TX', bill: 'HB 100', title: 'Dog failure', stage: 'failed' })`);
  area.dispatchEvent(new w.Event('legislation:refresh'));
  const summary = () => chips().map(chipText).join('|');
  ok('the chips are built from the topics in the data: All, Pets, Cars, Rules and No topic, counted over the eight active bills (the one that only mentions AI waits behind the switch, the failed one is never listed)',
     summary() === 'All 8|Pets 4|Cars 3|Rules 1|No topic 2' && resultLine() === '8 of 8 bills.', summary());
  ok('a topic is a word in the title ("Dog licensing"), or two different words in the summary ("a dog and a puppy") but not one ("a dog"); and a $ makes a whole word, so "cat" is found in "Cat and puppy parks" but not in "Category review"',
     (() => { fire(chipOf('pets'), 'click'); return titles().sort().join('|') === ['Animal welfare', 'Cat and puppy parks', 'Dog licensing', 'Registering a vehicle with a dog'].join('|'); })() && resultLine() === '4 of 8 bills.', titles().join('|'));
  ok('each row names its topics, and the chips now count what choosing them would leave: Cars 1 (the vehicle with a dog), Rules 0 and dimmed, No topic 2',
     /Topics: Pets/.test(billsTable().textContent) && /Topics: Pets, Cars|Topics: Cars, Pets/.test(billsTable().textContent) && chipN(chipOf('cars')) === 1 && chipN(chipOf('rules')) === 0 && chipOf('rules').disabled && !chipOf('none').disabled, summary());
  ok('the map follows: Texas, Ohio and California are shaded for the pet bills (2, 1 and 1), the federal bills are not (none has pets), and the masthead is unchanged', 
     /fill-b/.test(path('TX').getAttribute('class')) && /fill-b/.test(path('OH').getAttribute('class')) && /fill-b/.test(path('CA').getAttribute('class')) && /Federal items, not on the map\s*0/.test(legend()) &&
     mastheadText() === GOV_BLURB, mastheadText() + ' / ' + legend());
  fire(chipOf('cars'), 'click');
  ok('two chips together mean both: Pets and Cars leave the one bill that has both', titles().join('|') === 'Registering a vehicle with a dog' && resultLine() === '1 of 8 bills.', titles().join('|'));
  fire(chipOf('pets'), 'click');
  ok('taking Pets off leaves Cars alone: three bills', titles().length === 3 && resultLine() === '3 of 8 bills.', titles().join('|'));
  fire(chipOf('none'), 'click');
  ok('No topic stands alone: it drops the other chips and leaves the two bills with no topic (a dog in one line of a summary, and "Category")',
     titles().sort().join('|') === 'Animal welfare|Category review' && chipOf('none').getAttribute('aria-pressed') === 'true' && chipOf('cars').getAttribute('aria-pressed') === 'false', titles().join('|'));
  fire(chipOf('pets'), 'click');
  ok('and choosing a topic takes No topic off', chipOf('none').getAttribute('aria-pressed') === 'false' && chipOf('pets').getAttribute('aria-pressed') === 'true' && titles().length === 4);
  fire(chipOf('all'), 'click');
  ok('All clears the topics', resultLine() === '8 of 8 bills.' && chips().filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.topic).join() === 'all');
  await typeInto('dog');
  ok('search finds a word anywhere a row shows it, titles and summaries alike: "dog" is in four of the eight', titles().length === 4 && resultLine() === '4 of 8 bills.', titles().join('|'));
  await typeInto('Dog PUPPY');
  ok('every word must be there, whatever the capitals: "Dog PUPPY" leaves the one summary that has both', titles().join('|') === 'Animal welfare' && /Covers a dog and a puppy/.test(billsTable().textContent), titles().join('|'));
  await typeInto('ohio');
  ok('a state\'s name, a bill number and a topic\'s label are searchable too: "ohio" finds its two, "hb 11" one, "pets" the four with that topic',
     titles().length === 2 && (await typeInto('hb 11'), titles().join('|') === 'Dog licensing') && (await typeInto('pets'), titles().length === 4), titles().join('|'));
  await typeInto('ohio');
  fire(chipOf('pets'), 'click');
  ok('search and topics narrow together: "ohio" and Pets leave the one Ohio bill that has pets', titles().join('|') === 'Registering a vehicle with a dog' && resultLine() === '1 of 8 bills.', titles().join('|'));
  fire(path('TX'), 'mouseover');
  ok('the hover panel follows the filters: Texas has no bill that is both in Ohio and about pets, and the panel says so rather than that nothing was added',
     /No bills in Texas match the search and filters chosen\./.test(panel()) && !/No legislation has been added/.test(panel()), panel());
  await leaveMap();
  fire(clearFilters, 'click');
  fire(chipOf('pets'), 'click');
  fire(path('TX'), 'mouseover');
  ok('with only Pets chosen the card for Texas counts its two pet bills, and not Ohio\'s', cardOk(2), panel());
  await leaveMap();
  sel.value = 'OH'; sel.dispatchEvent(new w.Event('change', { bubbles: true }));
  ok('a jurisdiction pinned and a topic chosen narrow together, and the table\'s title counts the result', titles().join('|') === 'Registering a vehicle with a dog' && d.getElementById('legBillsScope').textContent === 'Ohio · 1 bill', d.getElementById('legBillsScope').textContent);
  sel.value = ''; sel.dispatchEvent(new w.Event('change', { bubbles: true }));   // let go of Ohio with the menu, keeping the topic
  ok('the switch counts the bills it would add under the filters: one pet bill only mentions AI, so it offers 1, and turning it on makes five of nine',
     !passWrap.hidden && passWrap.querySelector('.leg-muted-count').textContent === '1' && (fire(passBox, 'click'), true) && titles().length === 5 && resultLine() === '5 of 9 bills.' && /Dog tax/.test(billsTable().textContent) &&
     /Mentions AI only in its text/.test(billsTable().textContent), titles().join('|'));
  fire(chipOf('cars'), 'click');
  ok('with the switch on it stays in view even when the filters leave it no bill to add, so it can be turned off', !passWrap.hidden && passBox.checked, passWrap.textContent);
  fire(passBox, 'click');
  ok('and off, with nothing for it to add, it is still offered, and counts none', !passWrap.hidden && !passBox.checked && passWrap.querySelector('.leg-muted-count').textContent === '0', passWrap.textContent);
  fire(clearFilters, 'click');
  // sorting: Most recent action (the default), Oldest action, Jurisdiction
  const nums = () => [...billsTable().querySelectorAll('tbody tr:not(.leg-empty-row)')].map(tr => tr.querySelector('.leg-num').textContent);
  const sortSel = d.getElementById('legSort'), setSort = v => { sortSel.value = v; sortSel.dispatchEvent(new w.Event('change', { bubbles: true })); };
  ok('the Sort menu offers Most recent action (the default), Oldest action and Jurisdiction, and the table is most recent first: the two bills dated May 10 lead (California before Texas on the tie), then the 20th of April, March, February, January, and the bills with no date come last',
     [...sortSel.options].map(o => o.textContent).join() === 'Most recent action,Oldest action,Jurisdiction' && sortSel.value === 'recent' && nums().join() === 'AB 31,HB 12,H.R. 42,HB 11,AB 32,SB 21,H.R. 41,SB 22', nums().join());
  setSort('oldest');
  ok('Oldest action reverses the dates but still puts the bills with no date last, Congress ahead of the states among them', nums().join() === 'SB 21,AB 32,HB 11,H.R. 42,AB 31,HB 12,H.R. 41,SB 22', nums().join());
  setSort('jurisdiction');
  ok('Jurisdiction puts Congress first, then the states A to Z, each with its most recently acted-on bill first', nums().join() === 'H.R. 42,H.R. 41,AB 31,AB 32,SB 21,SB 22,HB 12,HB 11', nums().join());
  // status
  const statusSel = d.getElementById('legStatus'), setStatus = v => { statusSel.value = v; statusSel.dispatchEvent(new w.Event('change', { bubbles: true })); };
  const statusSummary = () => [...statusSel.options].map(o => o.textContent + (o.disabled ? '!' : '')).join('|');
  ok('the Status menu offers All statuses and the stages that count as active, each with its count: three introduced, four in committee, one enacted, none passed (dimmed); the failed bill is not a status',
     statusSummary() === 'All statuses|Introduced (3)|In committee (4)|Passed one chamber (0)!|Passed both chambers (0)!|Enacted (1)', statusSummary());
  setStatus('committee');
  ok('choosing a status narrows to the bills at that stage, with Reset shown, and the masthead unchanged',
     nums().sort().join() === 'AB 31,AB 32,HB 11,SB 22' && resultLine() === '4 of 8 bills.' && clearFilters.classList.contains('is-on') && mastheadText() === GOV_BLURB &&
     [...billsTable().querySelectorAll('tbody tr')].every(tr => /In committee/.test(tr.textContent)), nums().join());
  ok('the topic chips are counted under the status: Pets 3, Cars 1, Rules 0 and dimmed, No topic 1',
     chipN(chipOf('pets')) === 3 && chipN(chipOf('cars')) === 1 && chipN(chipOf('rules')) === 0 && chipOf('rules').disabled && chipN(chipOf('none')) === 1, summary());
  fire(chipOf('pets'), 'click');
  ok('a status and a topic together: In committee and Pets leave three bills, and the Status menu is counted under the topic (introduced 1, committee 3, enacted none and dimmed)',
     nums().sort().join() === 'AB 31,HB 11,SB 22' && statusSummary() === 'All statuses|Introduced (1)|In committee (3)|Passed one chamber (0)!|Passed both chambers (0)!|Enacted (0)!', statusSummary() + ' / ' + nums().join());
  await typeInto('ohio');
  ok('and with a search as well: Ohio, Pets and In committee leave the one bill', nums().join() === 'SB 22' && resultLine() === '1 of 8 bills.', nums().join());
  fire(clearFilters, 'click');
  ok('Reset all puts the status back to all, and the order back to Most recent', statusSel.value === '' && resultLine() === '8 of 8 bills.' && sortSel.value === 'recent', sortSel.value);
  setSort('recent');
  setStatus('committee'); fire(passBox, 'click');
  ok('the checkbox adds the committee bill that only lightly mentions AI (five of nine) with the status; Clear filters turns it off again with everything else',
     nums().length === 5 && resultLine() === '5 of 9 bills.' && passBox.checked && (fire(clearFilters, 'click'), true) && !passBox.checked && resultLine() === '8 of 8 bills.', nums().join());
  // the stats bar on the test bills: three introduced, four in committee, one enacted
  ok('on the test bills the stats bar says where the eight stand: 3 introduced (38%), 4 in committee (50%), 1 enacted (13%), in the stages\' order, each percentage rounded on its own (they come to 101)',
     statsLabel() === 'Where the 8 bills stand: 3 introduced (38%), 4 in committee (50%), 1 enacted (13%).' && segs().map(segN).join() === '3,4,1' &&
     [...statsBar().querySelectorAll('.leg-stats-key li')].map(li => li.textContent).join() === '3 introduced (38%),4 in committee (50%),1 enacted (13%)' &&
     segs().map(x => x.getAttribute('title')).join('|') === 'Introduced: 3 (38%)|In committee: 4 (50%)|Enacted: 1 (13%)', statsLabel());
  const ohSel = d.getElementById('legStateSelect'); ohSel.value = 'OH'; ohSel.dispatchEvent(new w.Event('change', { bubbles: true }));
  ok('it follows the state chosen in the Show menu: Ohio has two bills, one in committee and one enacted, and the title says the same', statsLabel() === 'Where the 2 bills stand: 1 in committee (50%), 1 enacted (50%).' && scopeN() === 2, statsLabel());
  fire(d.getElementById('legReset'), 'click');
  setStatus('committee');
  ok('it follows the Status menu: only the four in committee are left, one segment', statsLabel() === 'Where the 4 bills stand: 4 in committee (100%).' && segs().length === 1 && scopeN() === 4, statsLabel());
  setStatus('');
  await typeInto('qqqqq');
  ok('and with no bills in view it is empty and out of sight', statsBar().hidden && statsBar().innerHTML === '', statsBar().innerHTML);
  await typeInto('');
  ok('clearing the search brings it back, as it was', !statsBar().hidden && statsLabel() === 'Where the 8 bills stand: 3 introduced (38%), 4 in committee (50%), 1 enacted (13%).', statsLabel());
  // paging: sixty more pet bills make sixty-eight bills, sixty-four of them about pets, PAGE to a page at most; a new filter starts again at page 1
  w.eval(`for (let i = 1; i <= 60; i++) LEGISLATION_DATA.push({ id: 'p-' + i, level: 'state', state: 'TX', bill: 'HB ' + (200 + i), title: 'Dog park number ' + i, stage: 'committee' })`);
  area.dispatchEvent(new w.Event('legislation:refresh'));
  const pageNote = () => pager.querySelector('.pager-status').textContent, pageOf = (n, of) => `Page ${n} of ${of}`, lastHolds = n => n - PAGE * (pagesOf(n) - 1);
  const turnNext = () => fire(pager.querySelector('button[aria-label="Next page"]'), 'click');
  ok(`with sixty-eight bills the table has ${pagesOf(68)} pages of ${PAGE} at most, and the first holds ${PAGE}`, pageNote() === pageOf(1, pagesOf(68)) && rows('legBillsTable') === PAGE, pager.textContent);
  for (let i = 1; i < pagesOf(68); i++) turnNext();
  ok(`${pagesOf(68) - 1} turns of Next land on the last page, which holds the other ${lastHolds(68)}`, pageNote() === pageOf(pagesOf(68), pagesOf(68)) && rows('legBillsTable') === lastHolds(68), pager.textContent);
  fire(chipOf('pets'), 'click');
  ok(`choosing a topic starts the table again at page 1 (sixty-four pet bills: ${pagesOf(64)} pages)`, pageNote() === pageOf(1, pagesOf(64)) && rows('legBillsTable') === PAGE && resultLine() === '64 of 68 bills.', pager.textContent + ' / ' + resultLine());
  turnNext();
  ok(`on page 2 of the pet bills, ${PAGE} more`, pageNote() === pageOf(2, pagesOf(64)) && rows('legBillsTable') === PAGE, pager.textContent);
  setSort('oldest');
  ok('changing the order starts the table again at page 1', pageNote() === pageOf(1, pagesOf(64)) && rows('legBillsTable') === PAGE, pager.textContent);
  setSort('recent');
  turnNext();
  await typeInto('number 33');
  ok('and a search starts again at page 1 too: every word must be there, and "number" with "33" is the one bill (its title, and no bill number has 33 in it but its own)', titles().join('|') === 'Dog park number 33' && pager.hidden, titles().join('|'));
  fire(clearFilters, 'click');
  // the percentages at the edges: a stage with bills never reads as none, and one that is not all of them never reads as all
  w.eval(`for (let i = 1; i <= 400; i++) LEGISLATION_DATA.push({ id: 'q-' + i, level: 'state', state: 'TX', bill: 'SB ' + (900 + i), title: 'Parking permit ' + i, stage: 'committee' })`);
  area.dispatchEvent(new w.Event('legislation:refresh'));
  ok('with four hundred and sixty-eight bills nearly all in committee, the three introduced and the one enacted read "<1%" and the committee ">99%", and a screen reader is told "under 1%" and "over 99%"',
     [...statsBar().querySelectorAll('.leg-stats-key li')].map(li => li.textContent).join() === '3 introduced (<1%),464 in committee (>99%),1 enacted (<1%)' &&
     statsLabel() === 'Where the 468 bills stand: 3 introduced (under 1%), 464 in committee (over 99%), 1 enacted (under 1%).', statsLabel());
  // put everything back
  w.eval('LEGISLATION_DATA.length = 0; LEGISLATION_TOPICS.length = 0');
  w.eval('LEGISLATION_DATA.push(...window.__realE); LEGISLATION_TOPICS.push(...window.__topicsE)');
  area.dispatchEvent(new w.Event('legislation:refresh'));
  ok('with the real bills and topics put back the filter bar is as it opened', resultLine() === `${num(nBills)} of ${num(nBills)} bills.` && chips().length === topicDefs.length + 2 && rows('legBillsTable') === Math.min(PAGE, nBills) && !passWrap.hidden && searchBox.value === '');
  await leaveMap();
};

/* ── Legislation: the bills load when the tab first opens ──────────────────────────────────────────────────── *
   data/legislation-bills.js is about 240 KB, so the page does not load it: the tab asks for it the first time it opens (legLoadBills), and
   the other tabs never wait for it. Asserted both ways round: absent at load, present and drawn after the tab is opened, and fetched too
   when the address is #legislation from the start. */
const legislationLoadTests = async () => {
  const { w, d } = load('index.html', '#about');
  const area = d.getElementById('legislationArea');
  ok('the bills are NOT loaded with the page: no rows, no source details, and the Legislation area has not asked for them',
     w.eval('typeof LEGISLATION_FEEDS') === 'undefined' && w.eval('LEGISLATION_DATA.length') === 0 && area.getAttribute('data-bills') === 'idle', area.getAttribute('data-bills'));
  click(w, d, 'viewGovernment');
  ok('opening the tab asks for them: the area says loading, and so does the result line; the masthead is the same words while they load', area.getAttribute('data-bills') === 'loading' && /Loading the bills/.test(d.getElementById('legResultLine').textContent) && d.getElementById('headerTabDescText').textContent === GOV_BLURB, area.getAttribute('data-bills'));
  await settle(10);
  ok('and they arrive: the area is ready, the data holds the bills, and the result line counts them; the masthead has not moved',
     area.getAttribute('data-bills') === 'ready' && w.eval('LEGISLATION_DATA.length') > 0 && w.eval('typeof LEGISLATION_FEEDS') === 'object' &&
     d.getElementById('legResultLine').textContent.startsWith(`${w.eval('LEGISLATION_DATA.filter(b => !b.passing).length').toLocaleString('en-US')} of `) && d.getElementById('headerTabDescText').textContent === GOV_BLURB, d.getElementById('legResultLine').textContent);
  const again = w.eval('LEGISLATION_DATA.length');
  click(w, d, 'viewPolicy'); click(w, d, 'viewGovernment'); await settle(10);
  ok('opening the tab again does not load them twice', w.eval('LEGISLATION_DATA.length') === again && w.eval('document.querySelectorAll("script[src$=\'legislation-bills.js\']").length') === 1);
  const direct = load('index.html', '#legislation');
  await settle(10);
  ok('a #legislation address at page load fetches them too', direct.d.getElementById('legislationArea').getAttribute('data-bills') === 'ready' && direct.w.eval('LEGISLATION_DATA.length') === again);
  const other = load('index.html', '#papers');
  await settle(10);
  ok('the other tabs never load them', other.w.eval('typeof LEGISLATION_FEEDS') === 'undefined' && other.w.eval('LEGISLATION_DATA.length') === 0);
};

/* ── lazy payload ───────────────────────────────────────────────────────────
   The Fact Bank data is fetched on first open rather than at page load. Assert
   both halves: absent at load, and present and rendered after the view is
   opened. Without the disk interceptor in dom.js this would silently no-op, so
   the "absent at load" half guards against a test that passes for the wrong
   reason. */
(async () => {
  await legislationTests();
  await legislationLoadTests();
  const { w, d, errors } = load('index.html', '#about');

  ok('Fact Bank payload is NOT loaded at page load', typeof w.FACT_BANK_LOADED === 'undefined' &&
     d.getElementById('allFactsView').children.length === 0);
  ok('Fact Bank tab is present anyway (enabled optimistically)', !!d.getElementById('viewFactBank'));

  click(w, d, 'viewFactBank');
  await settle(10);
  ok('opening Fact Bank fetches its payload and builds the view',
     d.getElementById('allFactsView').children.length > 0,
     'allFactsView children: ' + d.getElementById('allFactsView').children.length);
  ok('Fact Bank is one flat list of cards, with no display-mode toggle',
     !d.getElementById('modePaper') && !d.getElementById('modeAll') &&
     d.querySelectorAll('#allFactsView .fact-card').length === d.querySelectorAll('#allFactsView .cwrap').length);
  ok('every fact card leads with its verbatim quote (after its source band, which a card under a source header hides)',
     [...d.querySelectorAll('#allFactsView .fact-card')].every(c => [...c.children].filter(el => !el.classList.contains('fc-source'))[0].matches('blockquote.fact-quote')));
  ok('every fact card shows its category pills up front, outside the expandable detail',
     [...d.querySelectorAll('#allFactsView .fact-card')].every(c => !!c.querySelector('.fc-chips .chip') && !c.querySelector('.details .fc-chips')));
  ok('every fact card carries a source band with its paper\'s title and its author or writer, in the card\'s first position; the card head has no byline of its own',
     [...d.querySelectorAll('#allFactsView .fact-card')].every(c => c.firstElementChild.matches('.fc-source') && c.querySelector('.fc-source-title').textContent.trim().length > 0 &&
       !!c.querySelector('.fc-source-by .fc-author') && c.querySelector('.fc-source-by .fc-author').textContent.trim().length > 0 && !c.querySelector('.fc-head .fc-src')));
  ok('every source band carries a View Summary button to its own paper (the button a source header has), the same link as the card\'s expanded actions',
     [...d.querySelectorAll('#allFactsView .fact-card')].every(c => { const b = c.querySelector('.fc-source > a.act-btn'), a = c.querySelector('.fc-actions a.act-btn'); return !!b && b.textContent.trim() === 'View Summary →' && !!a && b.getAttribute('href') === a.getAttribute('href'); }));
  ok('every fact card shows both ratings as bars up front, with Truth amber only when it is 2 or lower',
     [...d.querySelectorAll('#allFactsView .fact-card')].every(c => {
       const bars = c.querySelectorAll('.fc-head .fc-bar');
       if (bars.length !== 2) return false;
       if (c.querySelector('.fc-head .fc-rate-lbl').textContent !== 'Political noteworthiness') return false;
       const pol = bars[0], tr = bars[1];
       return /^[1-5] of 5$/.test(pol.getAttribute('aria-label')) && /^[1-5] of 5$/.test(tr.getAttribute('aria-label')) &&
              !pol.classList.contains('is-low') &&
              tr.classList.contains('is-low') === (parseInt(tr.getAttribute('aria-label'), 10) <= 2);
     }));
  ok('no dot-glyph meters remain on the cards',
     !d.querySelector('#allFactsView .dots') && !d.querySelector('#allFactsView .fc-meter'));
  ok('every fact card explains both ratings in a rail-and-sentence row',
     [...d.querySelectorAll('#allFactsView .fact-card')].every(c => {
       const rows = c.querySelectorAll('.details .rd-row');
       return rows.length === 2 && rows[0].querySelector('.lbl-grot').textContent === 'Political noteworthiness' &&
         [...rows].every(r => /^[1-5]\/5$/.test(r.querySelector('.rd-rail .rd-score').textContent) && r.querySelector('.rd-why').textContent.trim().length > 0);
     }));
  ok('the surrounding-paragraph disclosure comes before Methods & sourcing in the expanded card',
     [...d.querySelectorAll('#allFactsView .fact-card')].every(c => {
       const ctx = c.querySelector('.details .fact-context-d'), m = c.querySelector('.details .fact-methods');
       return !!ctx && !!m && (ctx.compareDocumentPosition(m) & 4) === 4;   // 4 = m follows ctx
     }));
  ok('every fact card offers "View Summary", linking to its source entry',
     [...d.querySelectorAll('#allFactsView .fact-card')].every(c => {
       const a = c.querySelector('.details .fc-actions a.act-btn');
       return !!a && a.textContent.trim() === 'View Summary →' && /^#entry\/[^/]+$/.test(a.getAttribute('href'));
     }));
  ok('the surrounding paragraph is a panel like Methods & sourcing, with its label on the summary row',
     [...d.querySelectorAll('#allFactsView .fact-card')].every(c => {
       const s = c.querySelector('.details .fact-context-d > summary');
       return !!s && s.querySelector('.lbl-grot').textContent === 'Surrounding paragraph' &&
         c.querySelector('.details .fact-context-d .fc-ctx-body').textContent.trim().length > 0;
     }));
  ok('the surrounding paragraph starts expanded in every fact card',
     [...d.querySelectorAll('#allFactsView .fact-card')].every(c => c.querySelector('.details .fact-context-d').open === true));
  /* The paragraphs are a separate lazy file (FACT_CONTEXT), fetched when a card is first opened: before that every card
     shows a placeholder, after it every card built so far shows its own paragraph. */
  ok('before any card is opened the paragraphs are not loaded, and every card shows a placeholder',
     w.eval("typeof FACT_CONTEXT") === 'undefined' &&
     [...d.querySelectorAll('#allFactsView .fc-ctx-body')].every(b => /^Loading the surrounding paragraph/.test(b.textContent.trim())));
  d.querySelector('#allFactsView .fact-card').click();
  await settle(10);
  ok('opening a card loads the paragraphs, and every card built so far shows its own',
     w.eval("typeof FACT_CONTEXT") === 'object' &&
     [...d.querySelectorAll('#allFactsView .cwrap')].every(wr => {
       const own = w.eval('FACT_CONTEXT')[wr.dataset.fid];
       return !!own && wr.querySelector('.fc-ctx-body').textContent === own;
     }));
  d.querySelector('#allFactsView .fact-card').click();   // close it again
  ok('fact cards carry no plain-English line',
     [...d.querySelectorAll('#allFactsView .fact-card')].every(c => !c.querySelector('.fc-claim') && !c.querySelector('.fc-plain')));
  ok('the filter bar is the same three blocks as the Government action tab\'s, in the same order, always showing (no More filters): the toolbar (Evidence, both rating minimums, with the Reset button at its right end), the keyword chips, and the search bar (search, Sort and the result line)',
     (() => {
       const kids = [...d.getElementById('factBankArea').children].map(e => e.id).join();
       const tb = d.getElementById('kfToolbar'), ch = d.getElementById('kfChips'), sb = d.getElementById('kfFilters');
       return kids.includes('kfToolbar,kfChips,kfFilters') && tb.classList.contains('bar-toolbar') && ch.classList.contains('bar-chips') && sb.classList.contains('bar-search') &&
         ['kfEvidence', 'kfMinPol', 'kfMinTruth'].every(id => !!tb.querySelector('#' + id)) && tb.querySelector('.bar-toolbar-row').lastElementChild === d.getElementById('kfReset') &&
         !!ch.querySelector('#kwPills') && !!sb.querySelector('.search-wrap') && !!sb.querySelector('#kfSort') && !!sb.querySelector('#kfResultLine') &&
         !d.getElementById('kfMoreToggle') && !d.getElementById('kfMorePanel') && !d.getElementById('kfMoreCount') && !d.getElementById('kfClear') && !d.querySelector('#factBankArea .more-toggle, #factBankArea .more-panel');
     })());
  ok('Evidence sits beside Political noteworthiness and Truth, in that order, in the toolbar',
     (() => {
       const r = d.getElementById('kfEvidence').closest('.bar-toolbar-main');
       const selects = [...r.querySelectorAll('select')];
       return !!r && r === d.getElementById('kfMinPol').closest('.bar-toolbar-main') && r === d.getElementById('kfMinTruth').closest('.bar-toolbar-main') &&
         ['kfEvidence', 'kfMinPol', 'kfMinTruth'].map(id => selects.indexOf(d.getElementById(id))).join() === '0,1,2';
     })());
  const barCss = [...d.querySelectorAll('style')].map(el => el.textContent).join('\n');
  ok('the three blocks stick in order, each under the one before, as on the Government action tab (the toolbar at the top, the chips under it, the search bar under both), nothing sticks on a phone or a short window, and a jump to the list keeps clear of all three',
     /#factBankArea \.bar-toolbar[^{]*\{[^}]*position:\s*sticky;\s*top:\s*0/.test(barCss) && /#factBankArea \.bar-chips[^{]*\{[^}]*position:\s*sticky;\s*top:\s*var\(--bar-toolbar-h/.test(barCss) &&
     /#factBankArea \.bar-search[^{]*\{[^}]*position:\s*sticky;\s*top:\s*calc\(var\(--bar-toolbar-h,\s*0px\)\s*\+\s*var\(--bar-chips-h/.test(barCss) &&
     /@media \(max-width: 640px\), \(max-height: 760px\)\s*\{[^}]*#factBankArea \.bar-search[^}]*position:\s*static/.test(barCss) && /#cardsGrid, #allFactsView \{ scroll-margin-top: calc\(var\(--bar-h/.test(barCss));
  ok('the Foundational checkbox stays hidden while no fact is marked foundational',
     d.getElementById('kfFoundational').closest('.ctl-check').hidden === !(w.FACT_BANK || []).some(f => f.foundational));
  /* A card's source is read from its own View Summary link, not from its id: record ids are opaque
     (ADR 0003), and two of them (kf-41-1 and kf-41-3) belong to paper 228. */
  const pidOf = el => { const a = el.querySelector('.fc-actions a.act-btn'); return a ? a.getAttribute('href').replace('#entry/', '') : null; };
  {
    /* paging and source groups. A page holds at most 50 cards. Under the default sort a source's facts sit
       under one header and are never split across two pages (a page fills with whole sources, so it can hold a
       few fewer than fifty); the two ranking sorts stay flat and fill every page but the last to fifty. */
    const list = d.getElementById('allFactsView'), pager = d.getElementById('kfPager');
    const wraps = () => [...list.querySelectorAll('.cwrap')];
    const heads = () => [...list.querySelectorAll('.g-head')];
    const headPid = h => h.querySelector('a.act-btn').getAttribute('href').replace('#entry/', '');
    const nextBtn = () => pager.querySelector('[aria-label="Next page"]');
    const current = () => (pager.querySelector('[aria-current="page"]') || {}).textContent || null;
    const line = () => d.getElementById('kfResultLine').textContent;
    const snap = () => ({ ids: wraps().map(el => el.dataset.fid), pids: wraps().map(pidOf), inGroup: wraps().filter(el => el.classList.contains('in-group')).length,
                          heads: heads().map(h => [headPid(h), h.querySelector('.g-count').textContent]) });
    const walk = () => { const pages = [snap()]; for (let i = 0; i < 30 && !nextBtn().disabled; i++) { nextBtn().click(); pages.push(snap()); } return pages; };
    const setSort = v => { const s = d.getElementById('kfSort'); s.value = v; s.dispatchEvent(new w.Event('change', { bubbles: true })); };
    const total = Number(line().match(/of (\d+) facts/)[1]);
    ok('the list shows one page of at most 50 cards, with a pager under it that starts on page 1',
       wraps().length > 0 && wraps().length <= 50 && !pager.hidden && current() === '1' &&
       pager.querySelector('[aria-label="Previous page"]').disabled && new RegExp('Showing 1 to ' + wraps().length + '\\.$').test(line()), line());
    const pages = walk();
    const all = pages.flatMap(p => p.ids);
    ok('the pages cover every fact exactly once, at most 50 to a page',
       pages.length > 1 && pager.querySelector('.pager-status').textContent === 'Page ' + pages.length + ' of ' + pages.length &&
       pages.every(p => p.ids.length > 0 && p.ids.length <= 50) && all.length === total && new Set(all).size === total);
    ok('on the last page Next is disabled and the page is marked current',
       nextBtn().disabled && current() === String(pages.length) && !pager.querySelector('[aria-label="Previous page"]').disabled);
    const pageOf = {}; let split = 0;
    pages.forEach((p, i) => p.pids.forEach(pid => { if (pageOf[pid] !== undefined && pageOf[pid] !== i) split++; pageOf[pid] = i; }));
    ok('no source is split across pages', split === 0);
    ok('every header agrees with the cards under it on its page, and those cards drop their byline',
       pages.every(p => p.heads.every(([pid, txt]) => { const n = p.pids.filter(x => x === pid).length; return n >= 2 && txt === n + ' facts'; })) &&
       pages.every(p => p.inGroup === p.heads.reduce((n, [pid]) => n + p.pids.filter(x => x === pid).length, 0)));
    pager.querySelector('.pager-nums button[data-page="1"]').click();
    ok('fact cards and source headers carry no methodology / region / category line (that line is the Papers cards\')',
       !list.querySelector('.src-chips') && !list.querySelector('.fc-about'));
    ok('each source with two or more facts is a section holding its header and exactly its own cards, so the header can be pinned over them; a lone fact is not in a section',
       [...list.querySelectorAll('.g-group')].every(g => g.firstElementChild.matches('.g-head') && [...g.children].slice(1).length >= 2 &&
         [...g.children].slice(1).every(el => el.matches('.cwrap') && pidOf(el) === headPid(g.firstElementChild))) &&
       [...list.children].every(el => el.matches('.g-group') ? true : el.matches('.cwrap') && !el.classList.contains('in-group')));
    ok('the default sort puts a source\'s facts under one header: title, byline, count and View Summary',
       list.classList.contains('grouped') && (() => {
         const h = heads()[0];
         const next = h && h.nextElementSibling;
         return !!h && !!h.querySelector('h3.g-title').textContent.trim() && !!h.querySelector('.g-meta .fc-author') &&
           /^\d+ facts$/.test(h.querySelector('.g-count').textContent) &&
           h.querySelector('a.act-btn').textContent === 'View Summary →' && /^#entry\/\d+$/.test(h.querySelector('a.act-btn').getAttribute('href')) &&
           !!next && next.classList.contains('cwrap') && pidOf(next) === headPid(h);
       })());
    /* A pinned header's rounded top corners are cutouts, and the cards scrolling behind it showed their own square corners (and the green rule down their left
       side) through them: the owner's screenshot, 2026-11-18. A page-coloured shadow fills the cutouts. It is lifted by its own spread, so it ends at the header's
       bottom edge and never covers the card under it, and it is at least a quarter of the corner's radius, the least that reaches a cutout's far corner (the
       corner's centre sits r in from each edge, the shadow's arc r + s out from a centre s lower). jsdom does not paint, so the rule is read from the stylesheet;
       the tokens are read from it too, so the check follows them. */
    {
      const rule = /@media \(min-width: 641px\)\s*\{\s*#factBankArea \.g-head\s*\{([^}]*)\}/.exec(barCss);
      const sh = rule && /box-shadow:\s*0\s+-(\d+)px\s+0\s+(\d+)px\s+var\(--(\w+)\)/.exec(rule[1]);
      const radius = Number((/--r-card:\s*(\d+)px/.exec(barCss) || [])[1]);
      const pageBg = (/\n  body\s*\{[^}]*background:\s*var\(--(\w+)\)/.exec(barCss) || [])[1];
      const gap = Number((/#factBankArea \.g-group\s*\{\s*margin-top:\s*(\d+)px/.exec(barCss) || [])[1]);   // the space above a group: the shadow rises into it, and must stay short of the group above
      const baseRule = (/\n  #factBankArea \.g-head\s*\{[^}]*\}/.exec(barCss) || [''])[0];
      ok('a pinned source header fills the cutouts of its rounded top corners with a shadow in the page\'s colour, lifted by its own spread (so it ends at the header\'s bottom edge), wide enough to reach each cutout\'s far corner and short of the group above, and only on the screens where the header pins',
         !!sh && sh[1] === sh[2] && Number(sh[2]) >= radius / 4 && 2 * Number(sh[2]) < gap && !!pageBg && sh[3] === pageBg &&
         /border-radius:\s*var\(--r-card\) var\(--r-card\) 0 0/.test(baseRule) && baseRule.indexOf('box-shadow') === -1, sh && sh[0]);
    }
    for (const [sort, label] of [['political', 'Most noteworthy'], ['truth', 'Most rigorous']]) {
      setSort(sort);
      const flat = walk();
      ok(`"${label}" stays flat: no headers, no grouped cards, fifty to every page but the last`,
         !list.classList.contains('grouped') && flat.every(p => p.heads.length === 0 && p.inGroup === 0) &&
         flat.slice(0, -1).every(p => p.ids.length === 50) && flat.flatMap(p => p.ids).length === total);
    }
    setSort('date');
    ok('changing the sort goes back to page 1, and on "Most recent" the groups return', current() === '1' && list.classList.contains('grouped') && heads().length > 0);
    pager.querySelector('.pager-nums button[data-page="3"]').click();
    ok('a page number jumps straight to that page, and the list takes focus', current() === '3' && d.activeElement === list);
    const open = wraps()[0].querySelector('.fact-card'); open.click();
    const keep = wraps()[0].dataset.fid;
    pager.querySelector('.pager-nums button[data-page="2"]').click();
    ok('only the current page is in the document', !list.querySelector(`.cwrap[data-fid="${keep}"]`));
    pager.querySelector('.pager-nums button[data-page="3"]').click();
    ok('a card that was open is still open when its page comes back', list.querySelector(`.cwrap[data-fid="${keep}"] .fact-card`).classList.contains('open'));
    list.querySelector(`.cwrap[data-fid="${keep}"] .fact-card`).click();
    pager.querySelector('.pager-nums button[data-page="1"]').click();
  }
  {
    const chips = [...d.querySelectorAll('#kwPills .kw-pill')];
    const reset = () => d.getElementById('kfReset'), resetText = () => d.getElementById('kfResetText').textContent;   // the Reset button: solid with the count while anything differs from how the tab opens
    // The list holds one page, so the number of matches is read from the result line.
    const lineB = () => d.getElementById('kfResultLine').textContent;
    const visible = () => Number(lineB().match(/^(\d+) of/)[1]);
    const total = Number(lineB().match(/of (\d+) facts/)[1]);
    const pagerB = d.getElementById('kfPager');
    ok('the filter state starts clean: "All" pressed, and the Reset button is an outline reading Reset all',
       chips[0].dataset.kw === 'all' && chips[0].getAttribute('aria-pressed') === 'true' &&
       d.querySelectorAll('#kwPills .kw-pill[aria-pressed="true"]').length === 1 && !reset().classList.contains('is-on') && resetText() === 'Reset all');
    chips[1].click();
    ok('choosing a keyword narrows the list, releases "All", and the Reset button turns solid and counts it: Reset all (1)',
       chips[0].getAttribute('aria-pressed') === 'false' && chips[1].getAttribute('aria-pressed') === 'true' &&
       visible() > 0 && visible() < total && reset().classList.contains('is-on') && resetText() === 'Reset all (1)');
    ok('under a filter each header still agrees with its cards ("k of N facts"), and a lone match is a plain card',
       (() => {
         const lst = d.getElementById('allFactsView');
         const cards = [...lst.querySelectorAll('.cwrap')];
         const heads = [...lst.querySelectorAll('.g-head')];
         return heads.every(h => {
           const id = h.querySelector('a.act-btn').getAttribute('href').replace('#entry/', '');
           const mine = cards.filter(x => pidOf(x) === id);
           return mine.length >= 2 && mine.every(x => x.classList.contains('in-group')) &&
             new RegExp('^' + mine.length + ' (facts|of \\d+ facts)$').test(h.querySelector('.g-count').textContent);
         }) && cards.filter(x => !x.classList.contains('in-group')).every(x => cards.filter(y => pidOf(y) === pidOf(x)).length === 1);
       })());
    const pol = d.getElementById('kfMinPol'), ev = d.getElementById('kfEvidence');
    ok('under a filter each header still agrees with its cards ("k of N facts"), and a lone match is a plain card',
       (() => {
         const lst = d.getElementById('allFactsView');
         const cards = [...lst.querySelectorAll('.cwrap')];
         const heads = [...lst.querySelectorAll('.g-head')];
         return heads.every(h => {
           const id = h.querySelector('a.act-btn').getAttribute('href').replace('#entry/', '');
           const mine = cards.filter(x => pidOf(x) === id);
           return mine.length >= 2 && mine.every(x => x.classList.contains('in-group')) &&
             new RegExp('^' + mine.length + ' (facts|of \\d+ facts)$').test(h.querySelector('.g-count').textContent);
         }) && cards.filter(x => !x.classList.contains('in-group')).every(x => cards.filter(y => pidOf(y) === pidOf(x)).length === 1);
       })());
    pol.value = '4'; pol.dispatchEvent(new w.Event('change', { bubbles: true }));
    ok('a rating minimum is counted too: Reset all (2)', resetText() === 'Reset all (2)');
    ev.value = ev.options[1].value; ev.dispatchEvent(new w.Event('change', { bubbles: true }));
    ok('Evidence is counted too: Reset all (3)', resetText() === 'Reset all (3)');
    reset().click();
    ok('Reset all puts Evidence, the rating minimums and the keywords back and restores the whole list',
       chips[0].getAttribute('aria-pressed') === 'true' && chips[1].getAttribute('aria-pressed') === 'false' &&
       pol.value === '1' && d.getElementById('kfMinTruth').value === '1' && ev.value === 'all' &&
       !reset().classList.contains('is-on') && resetText() === 'Reset all' && visible() === total);
    ev.value = ev.options[1].value; ev.dispatchEvent(new w.Event('change', { bubbles: true }));
    ok('a filter that leaves one page of cards hides the pager', visible() < 50 && pagerB.hidden && !/Showing/.test(lineB()));
    reset().click();
    ok('resetting it brings the pager and page 1 back', !pagerB.hidden && (pagerB.querySelector('[aria-current="page"]') || {}).textContent === '1');
    // the search words and the order count and reset too (the owner, 2026-11-18: Reset all, as on the Government action tab)
    const kfBox = d.getElementById('kfSearch'), kfSort = d.getElementById('kfSort'), kfWords = String(w.eval('FACT_BANK').find(f => f.fact).fact).split(/\s+/).find(x => /^[A-Za-z]{6,}$/.test(x)).toLowerCase();
    kfBox.value = kfWords; kfBox.dispatchEvent(new w.Event('input', { bubbles: true }));
    kfSort.value = 'political'; kfSort.dispatchEvent(new w.Event('change', { bubbles: true }));
    ok('the search words and the order count as well: Reset all (2)', resetText() === 'Reset all (2)' && reset().classList.contains('is-on') && visible() > 0 && visible() < total, resetText() + ' / ' + lineB());
    reset().click();
    ok('Reset all clears the search and puts the order back to Most recent, with every fact showing',
       kfBox.value === '' && kfSort.value === 'date' && visible() === total && resetText() === 'Reset all' && /Everything is reset/.test(d.getElementById('kfAnnounce').textContent), lineB());
    reset().click();
    ok('pressing it with nothing to reset says so, rather than doing nothing silently', /Nothing is chosen or filtered/.test(d.getElementById('kfAnnounce').textContent), d.getElementById('kfAnnounce').textContent);
  }
  /* ── the Papers bar ───────────────────────────────────────────────────────
     The Papers tab's search-and-filters bar is the Fact Bank's bar (src/styles/filterbar.css),
     so it has the same shape as the Government action tab's: the toolbar (Methodology, Category and Region, always showing, with the Reset button at its right end), then the search bar (search, Sort and the
     result line), each sticky under the one before. The sidebar and the pill rows it replaced are gone. */
  {
    const pg = load('index.html', '#papers');
    const pw = pg.w, pd = pg.d;
    const fire = (el, type) => el.dispatchEvent(new pw.Event(type, { bubbles: true }));
    const pick = (id, value) => { const s = pd.getElementById(id); s.value = value; fire(s, 'change'); };
    // The list holds one page (50 rows at most), so the number of matches is read from the result line.
    const rows = () => pd.querySelectorAll('#cardsGrid .src-row').length;
    const line = () => pd.getElementById('ppResultLine').textContent;
    const matches = () => Number(line().match(/^(\d+) of/)[1]);
    const reset = () => pd.getElementById('ppReset'), resetText = () => pd.getElementById('ppResetText').textContent;   // the Reset button: solid with the count while anything differs from how the tab opens
    const total = matches();
    ok('the Papers list holds every paper but shows 50 rows at a time, with a pager under it',
       total > 100 && rows() === 50 && !pd.getElementById('ppPager').hidden && line() === `${total} of ${total} papers. Showing 1 to 50.`,
       'rows: ' + rows() + ', line: ' + line());
    ok('the sidebar, the pill rows, the sort toggle and the drawer button are gone',
       !pd.getElementById('sidebar') && !pd.getElementById('inlineFilters') && !pd.getElementById('sortBtn') &&
       !pd.getElementById('sidebarToggle') && !pd.getElementById('searchInput'));
    const kidsP = [...pd.getElementById('papersArea').children].map(e => e.id).join();
    const tbP = pd.getElementById('ppToolbar'), sbP = pd.getElementById('ppFilters');
    ok('the bar is the same two blocks as the Government action tab\'s toolbar and search bar, in that order, always showing (no More filters): the toolbar holds Category, Methodology and Region with the Reset button at its right end, the search bar holds search, Sort and the result line',
       kidsP.includes('ppToolbar,ppFilters') && tbP.classList.contains('bar-toolbar') && sbP.classList.contains('bar-search') && ['ppCategory', 'ppMethod', 'ppRegion'].every(id => !!tbP.querySelector('#' + id)) &&
       tbP.querySelector('.bar-toolbar-row').lastElementChild === pd.getElementById('ppReset') && !!sbP.querySelector('.search-wrap') && !!sbP.querySelector('#ppSort') && !!sbP.querySelector('#ppResultLine') &&
       !pd.getElementById('ppMoreToggle') && !pd.getElementById('ppMorePanel') && !pd.getElementById('ppMoreCount') && !pd.getElementById('ppClear') && !pd.querySelector('#papersArea .more-toggle, #papersArea .more-panel'));
    ok('Category, Methodology and Region are one row of the toolbar, in that order',
       (() => { const r = pd.getElementById('ppCategory').closest('.bar-toolbar-main'), s = [...r.querySelectorAll('select')]; return !!r && ['ppCategory', 'ppMethod', 'ppRegion'].map(id => s.indexOf(pd.getElementById(id))).join() === '0,1,2'; })());
    const barCssP = [...pd.querySelectorAll('style')].map(el => el.textContent).join('\n');
    ok('the toolbar and the search bar stick in order, the search bar under the toolbar, and nothing sticks on a phone or a short window',
       /#papersArea \.bar-toolbar[^{]*\{[^}]*position:\s*sticky;\s*top:\s*0/.test(barCssP) && /#papersArea \.bar-search[^{]*\{[^}]*position:\s*sticky;\s*top:\s*calc\(var\(--bar-toolbar-h,\s*0px\)\s*\+\s*var\(--bar-chips-h/.test(barCssP) &&
       /@media \(max-width: 640px\), \(max-height: 760px\)\s*\{[^}]*#papersArea \.bar-search[^}]*position:\s*static/.test(barCssP));
    ok('every Methodology, Category and Region has an option, with a count in its label',
       [['ppMethod', n => n === 6], ['ppCategory', n => n >= 10], ['ppRegion', n => n === 2]].every(([id, fits]) => {
         const opts = [...pd.getElementById(id).options].filter(o => o.value !== 'all');
         return fits(opts.length) && opts.every(o => / \(\d+\)$/.test(o.textContent));
       }));
    ok('the bar starts clean: the whole list, and the Reset button is an outline reading Reset all',
       line().startsWith(`${total} of ${total} papers.`) && !reset().classList.contains('is-on') && resetText() === 'Reset all');

    const months = () => [...pd.querySelectorAll('#cardsGrid .src-meta')].map(m => Date.parse('1 ' + m.textContent.split(' · ').pop()));
    const ordered = (a, dir) => a.every((v, i) => i === 0 || (dir === 'desc' ? a[i - 1] >= v : a[i - 1] <= v));
    ok('the list starts newest first', ordered(months(), 'desc'));
    pick('ppSort', 'asc');
    ok('Sort "Oldest first" reverses it without dropping a paper; it is not a filter, but the Reset button counts the order: Reset all (1)',
       ordered(months(), 'asc') && matches() === total && rows() === 50 && resetText() === 'Reset all (1)');
    pick('ppSort', 'desc');
    ok('and back to "Newest first"', ordered(months(), 'desc') && matches() === total && rows() === 50);

    pick('ppMethod', 'peer-reviewed');
    ok('choosing a Methodology narrows the list and counts in the Reset button: Reset all (1)',
       matches() > 0 && matches() < total && rows() === Math.min(matches(), 50) && reset().classList.contains('is-on') && resetText() === 'Reset all (1)');
    const cat = [...pd.getElementById('ppCategory').options].find(o => o.value !== 'all' && !o.disabled);
    pick('ppCategory', cat.value);
    ok('a Category counts too, and narrows the list further',
       resetText() === 'Reset all (2)' && matches() > 0 && matches() < total);
    const reg = [...pd.getElementById('ppRegion').options].find(o => o.value !== 'all' && !o.disabled);
    pick('ppRegion', reg.value);
    ok('and so does a Region', resetText() === 'Reset all (3)' && matches() > 0);
    ok('an option with nothing behind it is disabled unless it is the current choice',
       [...pd.getElementById('ppMethod').options].every(o => o.value === 'all' || o.disabled === (/\(0\)$/.test(o.textContent) && pd.getElementById('ppMethod').value !== o.value)));
    reset().click();
    ok('Reset all puts Methodology, Category and Region back and restores the list',
       ['ppMethod', 'ppCategory', 'ppRegion'].every(id => pd.getElementById(id).value === 'all') &&
       matches() === total && rows() === 50 && !reset().classList.contains('is-on') && resetText() === 'Reset all' && line().startsWith(`${total} of ${total} papers.`));

    const box = pd.getElementById('ppSearch');
    box.value = 'zzzz no paper has this text'; fire(box, 'input');
    await wait(300);
    ok('a search with no match empties the list, says so, and offers "Clear all filters"',
       rows() === 0 && line() === `0 of ${total} papers.` && pd.getElementById('emptyState').classList.contains('visible') &&
       pd.getElementById('emptyStateClear').style.display !== 'none');
    pd.getElementById('emptyStateClear').click();
    ok('"Clear all filters" there clears the search as well', box.value === '' && matches() === total && rows() === 50 && !pd.getElementById('emptyState').classList.contains('visible'));
    box.value = 'surveillance'; fire(box, 'input');
    await wait(300);
    const narrowed = matches();
    ok('a search narrows the list, and counts in the Reset button: Reset all (1)', narrowed > 0 && narrowed < total && resetText() === 'Reset all (1)');
    pick('ppMethod', 'analysis');
    reset().click();
    ok('Reset all clears the search too, and the Methodology, and puts the order back',
       box.value === '' && matches() === total && pd.getElementById('ppMethod').value === 'all' && pd.getElementById('ppSort').value === 'desc' && resetText() === 'Reset all' && /Everything is reset/.test(pd.getElementById('ppAnnounce').textContent));
    reset().click();
    ok('pressing it with nothing to reset says so, rather than doing nothing silently', /Nothing is chosen or filtered/.test(pd.getElementById('ppAnnounce').textContent), pd.getElementById('ppAnnounce').textContent);

    ok('there is no Database / What\'s New toggle: Papers is one list, and Sort puts the newest first',
       !pd.getElementById('researchSubviewToggle') && !pd.getElementById('resSubviewChangelog') && !pd.getElementById('changelogArea') && !pd.body.classList.contains('changelog-subview'));
    // the data validator logs one console.error about archived papers cited by themes; that is not this bar's
    const own = pg.errors.filter(e => !/data validation/.test(e));
    ok('no console errors from the Papers bar', own.length === 0, own[0]);
  }
  /* ── paging in Papers ────────────────────────────────────────────────────
     The list shows 50 rows at a time. The pager walks every paper once, every filter starts again at page 1,
     and a #entry/<id> link narrows the list to the paper. */
  {
    const pg = load('index.html', '#papers');
    const pw = pg.w, pd = pg.d;
    const fire = (el, type) => el.dispatchEvent(new pw.Event(type, { bubbles: true }));
    const grid = pd.getElementById('cardsGrid'), pager = pd.getElementById('ppPager');
    const rows = () => [...grid.querySelectorAll('.src-row')];
    const line = () => pd.getElementById('ppResultLine').textContent;
    const current = () => (pager.querySelector('[aria-current="page"]') || {}).textContent || null;
    const nextBtn = () => pager.querySelector('[aria-label="Next page"]');
    const total = Number(line().match(/^(\d+) of/)[1]);
    const ids = rows().map(r => r.dataset.entryId), sizes = [rows().length];
    for (let i = 0; i < 30 && !nextBtn().disabled; i++) { nextBtn().click(); sizes.push(rows().length); ids.push(...rows().map(r => r.dataset.entryId)); }
    ok('the pager walks every paper once, fifty to a page, the last page holding the rest',
       sizes.length === Math.ceil(total / 50) && sizes.slice(0, -1).every(n => n === 50) && ids.length === total && new Set(ids).size === total);
    ok('the last page says where it is, and Next is disabled', new RegExp('Showing \\d+ to ' + total + '\\.$').test(line()) && nextBtn().disabled && current() === String(sizes.length));
    pager.querySelector('.pager-nums button[data-page="3"]').click();
    ok('a page number jumps straight to that page, and the list takes focus', current() === '3' && pd.activeElement === grid && /Showing 101 to 150\./.test(line()));
    const m = pd.getElementById('ppMethod'); m.value = 'peer-reviewed'; fire(m, 'change');
    ok('a filter starts again at page 1, and a short result has no pager', rows().length > 0 && rows().length < 50 && pager.hidden && !/Showing/.test(line()));
    pd.getElementById('ppReset').click();
    ok('resetting it brings page 1 and the pager back', current() === '1' && rows().length === 50 && !pager.hidden);
    // a #entry link (a fact's View Summary) narrows the list to the paper, as a source's facts link narrows the Fact Bank
    const research = pw.eval('RESEARCH_DATA');
    const target = research.slice().sort((a, b) => new Date(b.date) - new Date(a.date))[170];
    const linked = load('index.html', '#entry/' + target.id);
    await wait(250);
    const lrow = linked.d.querySelector(`.src-row[data-entry-id="${target.id}"]`);
    const lsearch = linked.d.getElementById('ppSearch'), lcount = () => linked.d.querySelectorAll('#cardsGrid .src-row').length;
    ok('#entry/<id> puts the paper\'s title in the search box, narrows the list to that paper, opens its row, and highlights nothing',
       !!lrow && lrow.classList.contains('open') && lsearch.value === target.title && lcount() >= 1 && lcount() < 10 &&
       linked.d.getElementById('ppPager').hidden && !linked.d.querySelector('.deep-link-flash'));
    linked.d.querySelector('.header-nav-btn[data-view="cards"]').click();
    ok('opening Papers by its tab again clears the title the link put in the search box and shows every paper',
       lsearch.value === '' && lcount() === 50);
    const own = pg.errors.filter(e => !/data validation/.test(e));
    ok('no console errors from paging', own.length === 0, own[0]);
  }
  /* ── paper summaries (the pilot) ──────────────────────────────────────────
     A paper with a summary shows a lede, a body paragraph, an optional "Take note" and where the text
     came from, in place of its key finding and bullets; every other paper is unchanged. An open row
     shows the paper's facts in one line, then its text across the whole row, then its four citation
     buttons. Search covers whichever text the row shows. The list holds one page, and its rows are
     rebuilt on every search, so each pilot paper is found by its title and read while it is on the page. */
  {
    const pg = load('index.html', '#papers');
    const sd = pg.d, sw = pg.w;
    const fire = (el, type) => el.dispatchEvent(new sw.Event(type, { bubbles: true }));
    const open = row => { const tg = row.querySelector('.src-toggle'); if (tg.getAttribute('aria-expanded') !== 'true') tg.click(); return row; };
    const box = sd.getElementById('ppSearch');
    const research = sw.eval('RESEARCH_DATA');
    // A summary whose paper is archived is never shown (nothing attaches it), so there is no row to read for it
    const pilotIds = Object.keys(sw.eval('PAPER_SUMMARIES')).filter(id => research.some(r => String(r.id) === id));
    const kids = row => [...row.querySelector('.src-body').children].map(c => c.className.split(' ')[0]).join();
    const facts = row => ({ layout: kids(row), belowLead: !!row.querySelector('.src-text > .src-finding + .src-chips'), labels: [...row.querySelectorAll('.src-chips .src-chip')].map(c => c.dataset.kind).join(), facts: row.querySelectorAll('.src-chips .src-chip').length, published: [...row.querySelectorAll('.src-chips .src-chip')].some(c => c.dataset.kind === 'Published'), buttons: [...row.querySelectorAll('.src-actions .cite-act')].map(b => b.textContent.trim()).join(' | '), side: !!row.querySelector('.src-side'), detail: !!row.querySelector('.src-detail') });
    const read = async id => {
      box.value = research.find(r => String(r.id) === id).title; fire(box, 'input'); await wait(300);
      const row = open(sd.querySelector(`.src-row[data-entry-id="${id}"]`));
      const take = row.querySelector('.src-take'), lede = row.querySelector('.src-lede'), basis = row.querySelector('.src-basis');
      return { id, marked: row.hasAttribute('data-summary'), lede: lede && lede.textContent.trim(), hasPara: !!row.querySelector('.src-para'), bullets: !!row.querySelector('.src-takeaways'),
               basis: basis && basis.textContent.trim(), hasTake: !!take, takeOk: !take || (take.querySelector('.src-take-label').textContent === 'Take note' && take.querySelectorAll('.src-para').length === 1), ...facts(row) };
    };
    const pilot = [];
    for (const id of pilotIds) pilot.push(await read(id));
    box.value = ''; fire(box, 'input'); await wait(300);
    const plain = open(sd.querySelector('.src-row:not([data-summary])'));
    const plainId = plain.dataset.entryId, plainBullet = plain.querySelector('.src-takeaways li').textContent.trim().toLowerCase().slice(0, 40);
    ok('some papers carry a summary and the rest do not', pilot.length > 0 && pilot.length < research.length && pilot.every(p => p.marked) && !!plain, 'summarised rows: ' + pilot.length);
    ok('an open summary row shows a lede and a body paragraph, and no bullets',
       pilot.every(p => p.lede && p.lede.length > 20 && p.hasPara && !p.bullets));
    // the note in parentheses can hold parentheses of its own, so it is matched up to the last one
    ok('every summary says where its text came from and whether it was reviewed',
       pilot.every(p => /^Summary written from the (full text|abstract only)( \(.+\))?\. (Draft, not yet reviewed|Reviewed )/.test(p.basis)));
    ok('a "Take note" paragraph, when there is one, is labelled and is a single paragraph', pilot.every(p => p.takeOk));
    ok('a summary written from the abstract only has no note', pilot.filter(p => /abstract only/.test(p.basis)).every(p => !p.hasTake));
    ok('a paper without a summary keeps its key finding and bullets', !!plain.querySelector('.src-finding') && !plain.querySelector('.src-lede') && !!plain.querySelector('.src-takeaways li'));
    ok('every open row shows its text, with the details pills (Category, Methodology, Region) directly under the key finding, then Open source and Copy summary + citation',
       [...pilot, facts(plain)].every(p => p.layout === 'src-text,src-actions' && p.belowLead && /^Category,Methodology,Region$/.test(p.labels) && /^(Open source ↗ \| )?Copy summary \+ citation$/.test(p.buttons) && !p.side && !p.detail));
    // jsdom has no clipboard, so copyText takes its textarea path; capture what it selects
    let copied = null;
    sw.HTMLTextAreaElement.prototype.select = function () { copied = this.value; };
    sw.document.execCommand = () => true;
    const copyOf = row => { copied = null; row.querySelector('.src-actions button[data-fmt="summary"]').click(); return copied; };
    const plainCopy = copyOf(plain);
    ok('Copy summary + citation on a paper without a summary copies its key finding, its takeaways and its citation',
       !!plainCopy && plainCopy.startsWith(plain.querySelector('.src-finding').textContent.trim()) && plainCopy.includes('\n- ') && /\n\nSource: .+ \(\d{4}\)\. .+ https?:\/\//s.test(plainCopy), plainCopy);
    ok('an open row does not say the date twice: the facts line holds no Published, the byline above it has the date',
       [...pilot, facts(plain)].every(p => !p.published) && /\b(19|20)\d\d$/.test(plain.querySelector('.src-meta').textContent.trim()));
    const find = async q => { box.value = q; fire(box, 'input'); await wait(300); return [...sd.querySelectorAll('#cardsGrid .src-row')].map(r => r.dataset.entryId); };
    const hits = await find(pilot[0].lede.toLowerCase().slice(0, 40));
    ok('searching a phrase from a summary finds that paper', hits.includes(pilot[0].id), hits.length + ' hits');
    const hits2 = await find(plainBullet);
    ok('searching a phrase from a bullet still finds a paper that has no summary', hits2.includes(plainId), hits2.length + ' hits');
    box.value = ''; fire(box, 'input'); await wait(300);
    ok('the summaries pass the console validator', pg.warns.filter(m => /summary \d+:/.test(m)).length === 0, pg.warns.filter(m => /summary \d+:/.test(m))[0]);
    const own = pg.errors.filter(e => !/data validation/.test(e));
    ok('no console errors with summaries on the page', own.length === 0, own[0]);
  }
  /* ── the console validator ────────────────────────────────────────────────
     A reference to a paper that is not published (archived, or under review, in the Sheet) is left out of
     the page on purpose, so the validator reports it once at info level and raises no error. A mistake in
     the data still raises the error. */
  {
    const pg = load('index.html', '#about');
    ok('references to unpublished papers are one info line, not an error',
       !pg.errors.some(e => /data validation/.test(e)) && pg.infos.filter(m => /not published/.test(m)).length <= 1, pg.errors[0] || pg.infos[0]);
    // break the data on purpose: point every policy cross-reference at a policy that does not exist
    const bad = load('index.html', '#about', { transform: html => html.replace(/\{\{pol:[a-z0-9-]+\|/g, '{{pol:zz-no-such-policy|') });
    ok('a real mistake in the data still raises the console error', bad.errors.some(e => /data validation: \d+ problem/.test(e)), bad.errors[0]);
  }
  ok('Fact Bank tab survives the lazy load', !!d.getElementById('viewFactBank'));
  ok('no console errors across the lazy paths', errors.length === 0, errors[0]);

  console.log(failed ? `\ninteractions.js: ${failed} FAILING` : '\ninteractions.js: all interactions pass');
  process.exit(failed ? 1 : 0);
})();
