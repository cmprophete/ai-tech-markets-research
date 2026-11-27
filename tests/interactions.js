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
const GOV_BLURB = 'A centralized repository of active bills, key cases and enforcement actions about AI, both federal and in the states. Use the switch to see everything together or one kind at a time, and hover a state or choose a place in the Show menu to narrow what you see.';
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
    ['viewAgenda', 'agenda', '#brief'],
    ['viewPolicy', 'policy', '#policy'],
    ['viewGovernment', 'legislation', '#legislation'],   // one tab for Legislation, Enforcement, Cases and All: from another tab it opens the section that was open last, Legislation at first (the owner, 2026-11-24; All was the one it opened on from 2026-11-18)
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
   The nav has ONE tab for Legislation, Enforcement, Cases and All (until 2026-11-17 they were two tabs, Enforcement and Legislation; the owner preferred one; All, which holds everything, was added on 2026-11-18). Under the
   masthead a switch moves between the four sections, each a view of its own with an address of its own (#all, #cases, #enforcement, #legislation); the nav tab stays marked for all four, the open section is pressed in the switch,
   and the tab opens the section that was open last, Legislation at first (the owner, 2026-11-24; All from 2026-11-18). The switch is there for the four sections only. */
{
  const { w, d } = load('index.html', '#about');
  const SECTIONS = [['govSwitchLegislation', 'legislation', '#legislation'], ['govSwitchEnforcement', 'enforcement', '#enforcement'], ['govSwitchCases', 'cases', '#cases'], ['govSwitchAll', 'all', '#all']];   // the switch's order: Legislation, Enforcement, Cases, then All (the owner, 2026-11-23)
  const nav = d.getElementById('viewGovernment'), pressed = () => SECTIONS.filter(([id]) => d.getElementById(id).getAttribute('aria-pressed') === 'true').map(([id]) => id).join();
  // the switch is in the toolbar of the Government action area, so it shows when no ancestor is hidden: 'none' while another tab is open, 'block' on the three sections
  const shown = () => { for (let n = d.getElementById('govSwitch'); n && n !== d.body; n = n.parentElement) if (w.getComputedStyle(n).display === 'none') return 'none'; return 'block'; };
  ok('the switch has four buttons in the owner\'s order, Legislation, Enforcement, Cases and then All last (2026-11-23), and it is hidden, with none pressed, while another tab is open',
     [...d.querySelectorAll('#govSwitch .pol-subview-btn')].map(b => b.textContent.trim()).join() === 'Legislation,Enforcement,Cases,All' && pressed() === '' && shown() === 'none', shown());
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
   The header nav is three labelled groups: Research (Fact Bank, Papers: alphabetical), Policy (Brief, then Landscape) and
   Government action (ONE tab, labelled Enforcement and Legislation above the group label (it read Legislation and Enforcement on 2026-11-23, when her reviewers asked for Legislation first, and the owner put it back on 2026-11-24); it holds Legislation, Enforcement, Cases and All, which were two tabs, Enforcement and Legislation,
   until 2026-11-17, and Legislation was the group of its own from 2026-11-12, when it left Policy). About has no door
   cards: it sets out the three names as sections, each opening with the question it answers and then what the dashboard offers for it. The Research and Policy copy is the owner's own and is
   guarded below; the Government action section (added 2026-11-12 at the owner's request, after the owner asked for About to carry the day's work) is drafted copy for the owner to edit. */
{
  const { w, d } = load('index.html', '#about');
  const groups = [...d.querySelectorAll('.header-tabs > .tab-group')].map(g =>
    `${g.dataset.group}:${g.querySelector('.tab-group-label').textContent.trim()}:` +
    [...g.querySelectorAll('.tab-group-btns > .header-nav-btn')].map(b => b.id).join('+'));
  ok('the nav is three labelled groups: Research (Fact Bank, Papers), Policy (Brief, Landscape) and Government action, whose one tab reads Enforcement and Legislation',
     groups.join() === 'research:Research:viewFactBank+viewCards,policy:Policy:viewAgenda+viewPolicy,government:Government action:viewGovernment', groups.join());
  ok('the tabs read Fact Bank, Papers, Brief, Landscape, Enforcement and Legislation (Legislation, Enforcement, Cases and All are the last one\'s sections, not tabs)',
     [...d.querySelectorAll('.header-nav-btn')].map(b => b.textContent.trim()).join() === 'Fact Bank,Papers,Brief,Landscape,Enforcement and Legislation' && !d.getElementById('viewEnforcement') && !d.getElementById('viewLegislation'));
  ok('the tabs of each group are in alphabetical order',
     [...d.querySelectorAll('.tab-group')].every(g => {
       const names = [...g.querySelectorAll('.header-nav-btn')].map(b => b.textContent.trim());
       return names.join() === [...names].sort().join();
     }));
  ok('the group labels are for the eye (aria-hidden), and the tabs that would not make sense on their own (Brief, Landscape) carry a fuller accessible name that still contains the visible text, and the Enforcement and Legislation tab is clear alone (it has none)',
     [...d.querySelectorAll('.tab-group-label')].every(l => l.getAttribute('aria-hidden') === 'true') &&
     ['viewAgenda', 'viewPolicy'].every(id => {
       const b = d.getElementById(id);
       return b.getAttribute('aria-label').toLowerCase().includes(b.textContent.trim().toLowerCase());
     }) &&
     ['viewAgenda', 'viewPolicy'].map(id => d.getElementById(id).getAttribute('aria-label')).join() === 'Policy brief,Policy landscape' &&
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
  ok('each section ends with links to the tabs and sections it describes: Research to the Fact Bank and Papers, Policy to the Brief and Landscape, Government action to Legislation, Enforcement, Cases and All, in the switch\'s order',
     labelled.length === 3 && labelled.every(sec => sec.lastElementChild.matches('.about-links')) &&
     labelled.map(sec => [...sec.querySelectorAll('.about-links a')].map(a => a.getAttribute('href')).join()).join('|') === '#fact-bank,#papers|#brief,#policy|#legislation,#enforcement,#cases,#all');
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
  ok('the Government action section names the sources behind the Legislation tab (GovInfo, Open States and the Congressional Research Service; the Associated Press is gone with the midterm results), says the topics are our reading, names no tracker or advocacy group, and states no number that the page computes and would let go stale',
     !!govSec && ['GovInfo', 'Open States', 'Congressional Research Service'].every(n => govSec.querySelector('.about-note').textContent.includes(n)) && !/Associated Press|midterm/i.test(govSec.textContent) &&
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

/* ── Brief (view key agenda): Becky Chao's brief ─────────────────────────────────────────────────────────────────────────────────────
   The tab, called Agenda until 2026-11-19 (its view key and internal names still say agenda), is an excerpt of "Ideas for Shared Economic Prosperity in the AI Transition" (April 2026), drawn by src/js/35-agenda.js from data/agenda-data.js. What is pinned:
   the page says what the data says, character for character (the words are the author's, so every check compares the page with the data file and never with a sentence typed here); the data is whole (four pathways
   in the Landscape's four areas, eight ideas, every note cited once, in order, every opening line a real prefix, every "On the Landscape" pointer a real card); the page does what it offers (ideas open and
   close, a footnote number opens its source under its paragraph, the Sources list leads back, a pointer opens the policy dialog, each section has an address); and with no data file the tab says so instead of throwing. */
{
  const fs = require('fs'), path = require('path');
  const { w, d, errors } = load('index.html', '#brief');
  const A = w.eval('AGENDA_DATA'), POL = w.eval('POLICY_DATA'), AREAS = w.eval('Object.keys(MERGED_POLICY_CATEGORIES)');
  const ideas = A.pathways.flatMap(p => p.ideas);
  const plain = s => s.replace(/\*/g, '').replace(/\[\^(\d+)\]/g, '$1');          // the data's markup as the page shows it: the marks gone, a footnote mark as its number
  const noMarks = s => s.replace(/\*/g, '').replace(/\[\^\d+\]/g, '');
  const spell = n => { const o = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'], t = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']; return n < 20 ? o[n] : t[Math.floor(n / 10)] + (n % 10 ? '-' + o[n % 10] : ''); };
  const urlsOf = s => (s.replace(/\*/g, '').match(/https?:\/\/\S+/g) || []).map(u => u.replace(/[.,;]+$/, ''));
  const idea = id => d.getElementById('ag-' + id);
  const isOpen = id => idea(id).classList.contains('is-open') && idea(id).querySelector('.ag-idea-btn').getAttribute('aria-expanded') === 'true' && !idea(id).querySelector('.ag-idea-body').hidden;
  const fire = (el, type = 'click', init = {}) => { const ev = new w.MouseEvent(type, Object.assign({ bubbles: true, cancelable: true }, init)); el.dispatchEvent(ev); return ev; };
  const ref = n => d.querySelector('#agendaRoot .ag-ref[data-note="' + n + '"]');
  const drawer = n => d.getElementById('ag-src-' + n);
  const openDrawers = () => [...d.querySelectorAll('#agendaRoot .ag-source:not([hidden])')];

  /* ── the data is whole ── */
  ok('the data is four pathways and eight ideas', A.pathways.length === 4 && ideas.length === 8);
  ok('the four pathways are the Landscape\'s four areas, in the Landscape\'s order (the pathways of the brief, in its order)', A.pathways.map(p => p.area).join() === AREAS.join(), A.pathways.map(p => p.area).join() + ' vs ' + AREAS.join());
  const ids = [...A.pathways.map(p => p.id), ...ideas.map(i => i.id), 'sources'];
  ok('every section id is unique and plain (lower-case letters, digits and hyphens), so each can be an address', new Set(ids).size === ids.length && ids.every(i => /^[a-z0-9-]+$/.test(i)), ids.join());
  ok('each idea\'s opening line, shown while it is closed, is the start of its first paragraph, word for word', ideas.every(i => noMarks(i.blocks[0].p).startsWith(i.lede)), ideas.filter(i => !noMarks(i.blocks[0].p).startsWith(i.lede)).map(i => i.id).join());
  const strings = [];
  A.pathways.forEach(p => p.ideas.forEach(i => i.blocks.forEach(b => b.p ? strings.push(b.p) : b.list.forEach(it => strings.push(it.text)))));
  const marks = [];
  strings.forEach(s => { for (const m of s.matchAll(/\[\^(\d+)\]/g)) marks.push(+m[1]); });
  const noteNums = Object.keys(A.notes).map(Number).sort((a, b) => a - b);
  ok('every note is cited once by the text, in order, and every citation has its note', marks.join() === noteNums.join() && marks.every((m, k) => k === 0 || m > marks[k - 1]), marks.join());
  /* Left out at the owner's request (2026-11-19; the data file's header says so): the conclusion and the whole introduction, so the page is the ideas alone, and with them the notes only that text cited (1 to 13). The brief's
     footnote numbers are kept, nothing renumbered, so the notes run from 14 to 57 and the page's first footnote is 14. This pins the cuts, so a merge or a "restore it from the PDF" cannot quietly bring any of it back. */
  const wholeData = JSON.stringify(A);
  ok('the introduction and the conclusion are left out, as the owner asked, and with them notes 1 to 13: the data has no intro and no conclusion, none of their paragraphs, the notes run 14 to 57 in the brief\'s own numbers, and nothing cites a number below 14',
     A.intro === undefined && A.conclusion === undefined &&
     ['Artificial Intelligence (AI) is transforming our economy', 'At the same time, the rush to build AI tools', 'People are rightfully nervous about AI', 'While it remains uncertain how many workers', 'Ultimately, how society builds AI', 'Given the universal uncertainty',
      'These ideas require additional analysis', 'This brief lays out policy ideas', 'AI is rapidly developing and becoming increasingly integrated into our society'].every(t => !wholeData.includes(t)) &&
     noteNums.join() === Array.from({ length: 44 }, (_, k) => k + 14).join() && marks.every(m => m >= 14), noteNums.join());
  /* The brief's words are the author's and must not drift: not by a copyedit, a "fixed" typo, a smart-quote pass or a merge that took the wrong side. Every other check here compares the page with the data file, so a changed word
     in the file would pass them all; this one pins the file. It is a fingerprint of the brief's own words only (title, date, author, every idea's heading, paragraph and list item, and every note, in order) and nothing of ours (labels, ids,
     areas, opening lines, pointers). When the author publishes a revision, replace the text in data/agenda-data.js from the new version (docs/agenda.md) and put the new value here: that is the one deliberate edit. (It was recomputed on 2026-11-19, when the owner had the introduction, the conclusion and the notes only they cited left out: see the data file's header.) */
  const BRIEF_FINGERPRINT = '2fb9820714b7e6aee24b2c036da5ee17a932479bdffd5d098578628cda713c46';
  const briefWords = { title: A.title, date: A.date, author: A.author,
    pathways: A.pathways.map(p => ({ title: p.title, ideas: p.ideas.map(i => ({ title: i.title, blocks: i.blocks.map(b => b.p ? { p: b.p } : { list: b.list.map(it => ({ lead: it.lead, text: it.text })) }) })) })),
    notes: A.notes };
  const fingerprint = require('crypto').createHash('sha256').update(JSON.stringify(briefWords)).digest('hex');
  ok('the brief\'s words, less the cuts above, are exactly as published: their fingerprint is the one recorded when the data was read from the PDF and cut (a deliberate revision updates both)', fingerprint === BRIEF_FINGERPRINT, fingerprint);
  const first = ideas[0], list0 = first.blocks.find(b => b.list).list;
  ok('the first idea has the brief\'s four emerging ideas as a list, each led by a bold run-in that ends in a colon', list0.length === 4 && list0.every(it => /:$/.test(it.lead)), list0.map(it => it.lead).join(' | '));
  const rel = ideas.flatMap(i => [...i.related, ...i.blocks.filter(b => b.list).flatMap(b => b.list.flatMap(it => it.related))]);
  ok('every "On the Landscape" pointer names a policy card that exists', rel.length > 0 && rel.every(id => POL.some(p => p.id === id)), rel.filter(id => !POL.some(p => p.id === id)).join());

  /* ── the tab ── */
  const btn = d.getElementById('viewAgenda');
  ok('#brief opens the brief view (its key is still agenda) and keeps its address bar', bodyView(d) === 'agenda' && w.location.hash === '#brief', `view ${bodyView(d)}, hash ${w.location.hash}`);
  ok('#brief marks the Brief button active, and not Landscape, and the panel is labelled by it',
     btn.classList.contains('active') && btn.getAttribute('aria-selected') === 'true' && !d.getElementById('viewPolicy').classList.contains('active') &&
     d.getElementById('viewPanel').getAttribute('aria-labelledby') === 'viewAgenda');
  const mast = d.getElementById('headerTabDescText').textContent, lede = d.getElementById('headerTabDescLede').textContent.trim();
  ok('the masthead asks a question about what the brief is for, not the tab\'s name ("How do we make sure AI benefits everyone?", written 2026-11-19; it was "What is our policy agenda?")', lede === 'How do we make sure AI benefits everyone?' && lede.endsWith('?'), lede);
  const mastLink = d.querySelector('#headerTabDescText a');
  ok('the standfirst is the owner\'s own sentence, "Pulled from <author>\'s April 2026 brief, <title>, below are <n> pathways, from modernizing the social contract to mitigating AI\'s role in exacerbating the affordability crisis. Open an idea to read it, and any footnote number to see its source.", with the brief\'s title linked to the full paper in a new tab and the count of pathways computed from the data',
     mast === 'Pulled from ' + A.author + '\u2019s April 2026 brief, ' + A.title + ', below are ' + spell(A.pathways.length) + ' pathways, from modernizing the social contract to mitigating AI\u2019s role in exacerbating the affordability crisis. Open an idea to read it, and any footnote number to see its source.' &&
     A.url === 'https://economicsecurityproject.org/resource/ai-transition/' && d.querySelectorAll('#headerTabDescText a').length === 1 && !!mastLink && mastLink.getAttribute('href') === A.url && mastLink.textContent === A.title && mastLink.target === '_blank' && /noopener/.test(mastLink.rel), mast);
  const agendaJs = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', '35-agenda.js'), 'utf8'), mastFn = agendaJs.slice(agendaJs.indexOf('function agendaMasthead'), agendaJs.indexOf('// ── the data\'s markup'));
  ok('the standfirst quotes no count of ideas or sources (the owner keeps counts out of mastheads; the Sources row shows that one), and the count of pathways is computed, not typed',
     !/\b(eight|forty|fifty|sixty)\b|\d+ (ideas|sources)/i.test(mast) && mastFn.length > 100 && !/\bfour\b/.test(mastFn), mast);
  ok('the masthead no longer says coming soon, and the placeholder note is gone', !/coming soon/i.test(mast) && !d.querySelector('#agendaArea .placeholder-note'));
  ok('it is a view of its own, with no policy list: the policy view class is off and the Landscape area is empty', !d.body.classList.contains('policy-view') && d.getElementById('policyArea').children.length === 0, d.body.className);
  ok('the screen reader announcement names the view', d.getElementById('viewAnnounce').textContent === 'Policy brief view');
  ok('no console errors on load', errors.length === 0, errors[0]);
  const before = d.getElementById('headerTabDescText').innerHTML;
  click(w, d, 'viewPolicy');
  ok('another tab\'s standfirst is plain text again: the link is the Brief\'s alone', !d.querySelector('#headerTabDescText a') && /^Policy interventions grouped into /.test(d.getElementById('headerTabDescText').textContent));
  click(w, d, 'viewAgenda');
  ok('and coming back to the Brief writes its standfirst, link and all, again', d.getElementById('headerTabDescText').innerHTML === before && !!d.querySelector('#headerTabDescText a'));

  /* ── what the page shows is what the data says ── */
  ok('the page has no jump bar, no overview of the four pathways, no "How this page is built" note, no note box under the masthead, no introduction, no conclusion and no Expand all ideas button: the owner had each taken out (2026-11-19), so the page is the ideas alone: the first thing under the masthead is the first pathway',
     !d.querySelector('#agBar, .ag-bar, #agendaArea .controls, .ag-overview, .ag-paths, .ag-path, .ag-excerpt, #agendaArea .about-note, #ag-conclusion, #ag-introduction, #ag-introduction-h, #agToggleAll, .ag-tools') &&
     !/How this page is built|Four pathways|Jump to|\bIntroduction\b|\bConclusion\b|An excerpt\.|Expand all|Collapse all/.test(d.getElementById('agendaRoot').textContent) &&
     d.querySelector('#agendaArea .ag-body').firstElementChild.id === 'ag-' + A.pathways[0].id && d.querySelector('#agendaArea .ag-body').lastElementChild.id === 'ag-sources');
  const land = load('index.html', '#policy');
  const rowColor = {}, tileColor = {};
  land.d.querySelectorAll('.pol-cat-row').forEach(r => { rowColor[r.dataset.cat] = r.style.getPropertyValue('--cat-color'); r.querySelectorAll('.pol-cat-card-title').forEach(t => { tileColor[t.textContent.trim()] = rowColor[r.dataset.cat]; }); });
  ok('each pathway wears the colour of the Landscape row it is',
     A.pathways.every(p => d.getElementById('ag-' + p.id).style.getPropertyValue('--cat-color') === rowColor[p.area] && !!rowColor[p.area]),
     A.pathways.map(p => d.getElementById('ag-' + p.id).style.getPropertyValue('--cat-color') + '/' + rowColor[p.area]).join());
  ok('every pathway heading, idea title and opening line is the data\'s, word for word',
     A.pathways.every(p => d.querySelector('#ag-' + p.id + '-h > span:not(.ag-num)').textContent === p.title && p.ideas.every(i => idea(i.id).querySelector('.ag-idea-title').textContent === i.title && idea(i.id).querySelector('.ag-idea-lede').textContent === i.lede)));
  ok('every idea\'s paragraphs are the data\'s, word for word, with each footnote mark reading as its number',
     ideas.every(i => [...idea(i.id).querySelectorAll('.ag-idea-body > .ag-p')].map(p => p.textContent).join('\n') === i.blocks.filter(b => b.p).map(b => plain(b.p)).join('\n')));
  ok('the four emerging ideas are the brief\'s list items: the bold run-in, a space, then the text, word for word',
     [...idea(first.id).querySelectorAll('.ag-li-text')].map(p => p.textContent).join('\n') === list0.map(it => it.lead + ' ' + plain(it.text)).join('\n') &&
     [...idea(first.id).querySelectorAll('.ag-li-text > strong.ag-lead')].map(s => s.textContent).join('|') === list0.map(it => it.lead).join('|'));
  const ours = [...A.pathways.map(p => p.label), lede, mast, d.getElementById('ag-sources-card').querySelector('.ag-idea-lede').textContent];
  ok('nothing we wrote on the page has an em-dash', !ours.some(s => s.includes('—')), ours.filter(s => s.includes('—')).join(' | '));

  /* ── ideas open and close ── */
  ok('every idea starts closed, its button saying so and its text hidden, and so does the Sources list',
     ideas.every(i => !isOpen(i.id)) && !d.getElementById('ag-sources-card').classList.contains('is-open'));
  fire(idea(first.id).querySelector('.ag-idea-btn'));
  ok('pressing an idea\'s title opens it, and only it', isOpen(first.id) && ideas.slice(1).every(i => !isOpen(i.id)));
  fire(idea(first.id).querySelector('.ag-idea-btn'));
  ok('pressing it again closes it', !isOpen(first.id));

  /* ── footnotes: a number opens its source under its paragraph ── */
  const refs = [...d.querySelectorAll('#agendaRoot .ag-ref')];
  ok('the brief\'s footnote numbers that are left in are buttons in the text, in order, each named "Source n" and closed',
     refs.map(r => +r.dataset.note).join() === noteNums.join() && refs.every(r => r.tagName === 'BUTTON' && r.getAttribute('aria-label') === 'Source ' + r.dataset.note && r.getAttribute('aria-expanded') === 'false'), refs.length + ' refs');
  fire(idea('resiliency').querySelector('.ag-idea-btn'));
  fire(ref(14));
  ok('a footnote number opens its source in a drawer right under the paragraph that cites it, and says so (aria-expanded, aria-controls)',
     !!drawer(14) && !drawer(14).hidden && drawer(14).previousElementSibling === ref(14).closest('.ag-p') && ref(14).getAttribute('aria-expanded') === 'true' && ref(14).getAttribute('aria-controls') === 'ag-src-14');
  ok('the drawer shows the note as the brief gives it, labelled with its number, and nothing else besides its two controls',
     drawer(14).querySelector('.ag-source-text').textContent === A.notes[14].replace(/\*/g, '') && drawer(14).querySelector('.ag-kicker').textContent === 'Source 14' &&
     [...drawer(14).querySelectorAll('button, a')].map(e => e.textContent.trim()).filter(t => t === 'Close' || t === 'All sources').length === 2);
  const a14 = [...drawer(14).querySelectorAll('.ag-source-text a')];
  ok('a web address in the note is a link to itself, opening in a new tab without handing the page over',
     a14.length === urlsOf(A.notes[14]).length && a14.every((a, k) => a.getAttribute('href') === urlsOf(A.notes[14])[k] && a.textContent === a.getAttribute('href') && a.target === '_blank' && /noopener/.test(a.rel)), a14.map(a => a.href).join());
  fire(ref(15));
  ok('opening another number closes the first: one drawer at a time', openDrawers().length === 1 && openDrawers()[0].id === 'ag-src-15' && ref(14).getAttribute('aria-expanded') === 'false' && ref(15).getAttribute('aria-expanded') === 'true');
  fire(ref(15));
  ok('pressing the open number closes its drawer', openDrawers().length === 0 && ref(15).getAttribute('aria-expanded') === 'false');
  fire(ref(14));
  drawer(14).dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  ok('Escape closes the open source and puts focus back on its number', openDrawers().length === 0 && d.activeElement === ref(14) && ref(14).getAttribute('aria-expanded') === 'false');
  fire(ref(14));
  fire(drawer(14).querySelector('.ag-source-close'));
  ok('the drawer\'s Close button closes it and returns focus to the number', openDrawers().length === 0 && d.activeElement === ref(14));
  fire(ref(14));
  fire(idea('resiliency').querySelector('.ag-idea-btn'));
  ok('closing an idea closes a source open under it', !isOpen('resiliency') && openDrawers().length === 0 && ref(14).getAttribute('aria-expanded') === 'false');
  const emerging = ref(16);
  fire(idea('resiliency').querySelector('.ag-idea-btn'));
  fire(emerging);
  ok('a number inside one of the four emerging ideas opens its source under that item', !drawer(16).hidden && drawer(16).previousElementSibling === emerging.closest('.ag-li-text') && drawer(16).parentElement.matches('li.ag-li'));
  fire(emerging);

  /* ── the Sources list ── */
  const card = d.getElementById('ag-sources-card');
  const noteEls = [...d.querySelectorAll('#ag-sources .ag-note')];
  ok('the Sources list holds every note that is cited, numbered as the brief numbers them and in order, each the note word for word, and it is closed until asked for',
     noteEls.length === noteNums.length && noteEls.every((li, k) => li.querySelector('.ag-note-n').textContent === String(noteNums[k]) && li.querySelector('.ag-note-text').textContent === A.notes[noteNums[k]].replace(/\*/g, '')) && !card.classList.contains('is-open'));
  const anchors = [...d.querySelectorAll('#ag-sources .ag-note-text a')], wanted = Object.keys(A.notes).sort((a, b) => a - b).flatMap(n => urlsOf(A.notes[n]));
  ok('every web address in every note is a link, as in the PDF: the links are exactly the addresses the notes contain, each linking to what it shows',
     anchors.map(a => a.getAttribute('href')).join('\n') === wanted.join('\n') && anchors.every(a => a.textContent === a.getAttribute('href') && a.target === '_blank' && /noopener/.test(a.rel)), `${anchors.length} links, ${wanted.length} addresses`);
  const italicNote = noteNums.find(n => /\*/.test(A.notes[n]));
  ok('an italic in a note is an <em> (when this was written, notes 22 and 23 set a title in italics), and no note shows an asterisk', italicNote !== undefined && !!noteEls[noteNums.indexOf(italicNote)].querySelector('.ag-note-text em') && !/\*/.test(d.getElementById('ag-sources').textContent), 'first italic note: ' + italicNote);
  fire(card.querySelector('.ag-idea-btn'));
  ok('the Sources row opens like an idea', card.classList.contains('is-open') && !card.querySelector('.ag-idea-body').hidden);
  fire(card.querySelector('.ag-idea-btn'));
  const back = d.querySelector('.ag-back[data-note="30"]');
  fire(back);
  const p30 = ref(30).closest('.ag-p');
  ok('"See in the text" on a source opens the idea that cites it, opens the source under its paragraph, and marks the paragraph for a moment',
     isOpen('public-ai') && !!drawer(30) && !drawer(30).hidden && p30.classList.contains('ag-flash') && back.getAttribute('aria-label') === 'See source 30 in the text');

  /* ── "On the Landscape" ── */
  ideas.forEach(i => { if (!isOpen(i.id)) fire(idea(i.id).querySelector('.ag-idea-btn')); });   // every idea open for the next checks ('public-ai' already is)
  const got = i => [...idea(i.id).querySelectorAll('.ag-idea-body > .ag-related .ag-pol')].map(b => b.dataset.pol);
  ok('each idea\'s "On the Landscape" row has the data\'s pointers, in the data\'s order, and an idea with none has no row', ideas.every(i => got(i).join() === i.related.join()) && !idea('energy-costs').querySelector('.ag-related'),
     ideas.map(i => got(i).join('+') + '/' + i.related.join('+')).join(' ; '));
  ok('each of the four emerging ideas has its own pointers: unemployment insurance and its reskilling, health coverage, an income floor, the shorter workweek',
     [...idea('resiliency').querySelectorAll('.ag-li')].map(li => [...li.querySelectorAll('.ag-pol')].map(b => b.dataset.pol).join('+')).join('|') === list0.map(it => it.related.join('+')).join('|'));
  const pols = [...d.querySelectorAll('#agendaRoot .ag-pol')];
  ok('a pointer is labelled with the card\'s own title and carries the colour of the Landscape row that card is in',
     pols.length === rel.length && pols.every(b => b.textContent === POL.find(p => p.id === b.dataset.pol).title && b.style.getPropertyValue('--cat-color') === tileColor[b.textContent]),
     pols.filter(b => b.style.getPropertyValue('--cat-color') !== tileColor[b.textContent]).map(b => b.textContent + ' ' + b.style.getPropertyValue('--cat-color') + '/' + tileColor[b.textContent]).join(' ; '));
  fire(idea('public-ai').querySelector('.ag-pol'));
  ok('pressing a pointer opens that policy\'s dialog over the page, and the page stays on the Brief',
     d.getElementById('polModal').classList.contains('open') && d.getElementById('polModalTitle').textContent === POL.find(p => p.id === 'public-ai-compute').title && bodyView(d) === 'agenda');
  fire(d.getElementById('polModalClose'));
  ok('closing the dialog leaves the Brief as it was', !d.getElementById('polModal').classList.contains('open') && isOpen('public-ai'));

  /* ── jumping: a source drawer's link to the Sources, and motion ── */
  const hist = w.history.length, calls = [];
  w.Element.prototype.scrollIntoView = function (o) { calls.push([this.id, o && o.behavior, o && o.block]); };
  const toSources = () => d.querySelector('#ag-src-30 .ag-source-all');
  const ev = fire(toSources());
  ok('"All sources" in a drawer jumps to the Sources list without following the link: it opens the list, scrolls it into view smoothly to the top, and rewrites the address in place (no history entry)',
     ev.defaultPrevented && card.classList.contains('is-open') && w.location.hash === '#brief/sources' && w.history.length === hist && calls.length === 1 && calls[0].join() === 'ag-sources,smooth,start', `${w.location.hash} ${JSON.stringify(calls)}`);
  w.matchMedia = q => ({ matches: /reduce/.test(q), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  fire(toSources());
  ok('for a reader whose device asks for less motion the jump is instant', calls.length === 2 && calls[1][0] === 'ag-sources' && calls[1][1] === 'auto', JSON.stringify(calls));
  w.matchMedia = () => ({ matches: false, media: '', addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  const mod = fire(toSources(), 'click', { ctrlKey: true });
  ok('a modified click (a new tab) is left to the browser, with nothing scrolled', !mod.defaultPrevented && calls.length === 2);
  click(w, d, 'viewPolicy'); click(w, d, 'viewAgenda');
  ok('leaving the tab and coming back keeps what was built: it is drawn once, with its ideas as the reader left them', d.querySelectorAll('.ag-idea').length === 9 && d.querySelectorAll('#agendaRoot .ag-body').length === 1 && isOpen('public-ai') && w.location.hash === '#brief');

  /* ── addresses of its own ── */
  {
    const r = load('index.html', '#brief/workers');
    ok('#brief/workers (a pathway) opens the Agenda, keeps its address, and opens no idea', bodyView(r.d) === 'agenda' && r.w.location.hash === '#brief/workers' && r.d.querySelectorAll('.ag-idea.is-open').length === 0 && r.errors.length === 0, `${bodyView(r.d)} ${r.w.location.hash}`);
    const q = load('index.html', '#brief/wage-setting');
    ok('#brief/<an idea> opens that idea, and only it', bodyView(q.d) === 'agenda' && q.w.location.hash === '#brief/wage-setting' && [...q.d.querySelectorAll('.ag-idea.is-open')].map(e => e.dataset.ag).join() === 'wage-setting');
    const s = load('index.html', '#brief/sources');
    ok('#brief/sources opens the Sources list', s.d.getElementById('ag-sources-card').classList.contains('is-open') && s.w.location.hash === '#brief/sources');
    const x = load('index.html', '#brief/not-a-section');
    ok('a section the Brief does not have is a stale link: the Brief opens anyway, and the address goes back to #brief', bodyView(x.d) === 'agenda' && x.w.location.hash === '#brief' && x.errors.length === 0 && x.d.querySelectorAll('.ag-idea.is-open').length === 0, x.w.location.hash);
    const old1 = load('index.html', '#agenda'), old2 = load('index.html', '#agenda/workers'), old3 = load('index.html', '#agenda/wage-setting'), old4 = load('index.html', '#agenda/not-a-section');
    ok('the old address still works: #agenda lands on the Brief and the address bar is rewritten to #brief', bodyView(old1.d) === 'agenda' && old1.w.location.hash === '#brief' && old1.errors.length === 0 && old1.d.getElementById('viewAgenda').classList.contains('active'), old1.w.location.hash);
    ok('and so do the old section addresses: #agenda/<section> opens that section and is rewritten to #brief/<section> (a section it does not have goes back to #brief)',
       old2.w.location.hash === '#brief/workers' && [...old3.d.querySelectorAll('.ag-idea.is-open')].map(e => e.dataset.ag).join() === 'wage-setting' && old3.w.location.hash === '#brief/wage-setting' && old4.w.location.hash === '#brief' &&
       [old2, old3, old4].every(r => bodyView(r.d) === 'agenda' && r.errors.length === 0), [old2, old3, old4].map(r => r.w.location.hash).join(' '));
    const y = load('index.html', '#brief/INTRODUCTION');
    ok('an address in capitals does not match a section either (ids are lower-case)', y.w.location.hash === '#brief' && bodyView(y.d) === 'agenda');
    const z = load('index.html', '#brief/x%22%5D%5Bdata-ag');
    ok('an address with quotes and brackets in it never reaches a selector: the tab opens, nothing throws, and the address goes back to #brief', bodyView(z.d) === 'agenda' && z.w.location.hash === '#brief' && z.errors.length === 0, z.errors[0] || z.w.location.hash);
  }

  /* ── the data is missing, or a card has gone ── */
  {
    const noData = html => html.replace('const AGENDA_DATA = {', 'const AGENDA_DATA_SET_ASIDE = {');
    const n = load('index.html', '#brief', { transform: noData });
    const root = n.d.getElementById('agendaRoot');
    ok('with no agenda data the tab says so, with a link to Landscape, the masthead falls back to Coming soon, and nothing throws',
       n.errors.length === 0 && /did not load/.test(root.textContent) && root.querySelector('a').getAttribute('href') === '#policy' && /coming soon/i.test(n.d.getElementById('headerTabDescText').textContent) && !n.d.querySelector('.ag-idea'));
    const more = load('index.html', '#brief', { transform: html => html.replace('notes: {\n', 'notes: {\n    58: "An extra note.",\n') });
    const total = noteNums.length + 1;
    ok('the counts are computed from the data: with one more note in the file the Sources row says one more, and the list has it',
       more.errors.length === 0 && new RegExp('All ' + total + ' sources').test(more.d.getElementById('ag-sources-card').textContent) && more.d.querySelectorAll('#ag-sources .ag-note').length === total);
    const noUrl = load('index.html', '#brief', { transform: html => html.replace('url: "https://economicsecurityproject.org/resource/ai-transition/",', '') });
    const nuMast = noUrl.d.getElementById('headerTabDescText');
    ok('with no url in the data the standfirst is the same sentence with the title as plain text, and nothing throws', noUrl.errors.length === 0 && !nuMast.querySelector('a') && /^Pulled from /.test(nuMast.textContent) && nuMast.textContent.includes(', ' + noUrl.w.eval('AGENDA_DATA.title') + ', below are '));
    const n2 = load('index.html', '#brief/workers', { transform: noData });
    ok('and an address on a section opens the tab all the same, back at #brief', n2.errors.length === 0 && bodyView(n2.d) === 'agenda' && n2.w.location.hash === '#brief');
    const gone = load('index.html', '#brief', { transform: html => html.replace('related: ["ui-reform", "reskilling-accounts"]', 'related: ["zz-gone", "reskilling-accounts"]').replace('related: ["public-ai-compute"]', 'related: ["zz-gone"]') });
    const items = [...gone.d.querySelectorAll('#ag-resiliency .ag-li')];
    ok('a pointer to a card that is gone is left out of its row, and a row with none left is not drawn (the page does not throw)',
       gone.errors.length === 0 && [...items[0].querySelectorAll('.ag-pol')].map(b => b.dataset.pol).join() === 'reskilling-accounts' && !gone.d.querySelector('#ag-public-ai .ag-related'));
  }

  /* ── the styles ── */
  {
    const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles', 'agenda.css'), 'utf8');
    ok('nothing on the page animates: the styles hold transitions (and a reduced-motion rule), no keyframes and no animation property', !/@keyframes|\banimation\s*:|\banimation-[a-z-]+\s*:/.test(css));
    ok('a passage the reader was sent to fades its mark in only for a reader who has not asked for less motion', /@media \(prefers-reduced-motion: no-preference\)\s*\{[^}]*\.ag-flash|@media \(prefers-reduced-motion: no-preference\)\s*\{[^}]*transition: background/.test(css));
    const phone = css.indexOf('@media (max-width: 700px)') < 0 ? '' : css.slice(css.indexOf('@media (max-width: 700px)'));
    ok('a phone gets tighter padding in an open idea and in the first idea\'s list items', /\.ag-idea-body \{ padding: 12px 13px 14px; \}/.test(phone) && /\.ag-li \{ padding: 10px 12px 11px; \}/.test(phone));
    ok('the Brief\'s type is the site\'s: no font-size outside the sizes the other tabs use (11, 12, 13, 14, 15 and 20px, and the footnote mark\'s 0.72em)',
       [...css.matchAll(/font-size:\s*([^;]+);/g)].every(m => ['11px', '12px', '13px', '14px', '15px', '20px', '0.72em'].includes(m[1].trim())), [...css.matchAll(/font-size:\s*([^;]+);/g)].map(m => m[1].trim()).join(' '));
  }
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
  const pills = () => [...d.querySelectorAll('#enfTopicPills button[data-topic]')];
  const pill = id => pills().find(b => b.dataset.topic === id);
  // The chips carry no counts (the owner, 2026-11-24: "Remove counts from topics in the Government Action tab"), so what a chip leaves is read as a reader would find it out: by choosing it and putting it back. A chip that is on leaves what is in view now,
  // one with nothing behind it is dimmed and leaves none, and All (when it is not on) would clear the topics, which cannot be put back, so it is not read.
  const pillN = b => {
    if (b.disabled) return 0;
    const line = () => Number(d.getElementById('enfResultLine').textContent.replace(/,/g, '').match(/^(\d+) of/)[1]);
    if (b.getAttribute('aria-pressed') === 'true') return line();
    if (b.dataset.topic === 'all') return NaN;
    fire(b, 'click'); const n = line(); fire(pill(b.dataset.topic), 'click');
    return n;
  };
  const pillHasCount = () => pills().some(b => b.querySelector('.kw-count') || /\d/.test(b.textContent));

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
  ok('the topic filter is the Papers chips: All, then only the topics some enforcement action bears on, in the order of the bills\' topics, with no count on any chip (choosing each leaves 3, 1, 1, 1 and 2 actions)',
     pills().map(b => b.dataset.topic).join() === 'all,chatbots,kids,bias,consumer' && !pillHasCount() && pills().map(pillN).join() === '3,1,1,1,2' && pills()[0].getAttribute('aria-pressed') === 'true', pills().map(b => b.dataset.topic + ' ' + pillN(b)).join(' | '));
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
  ok('All clears the topics: the chips on Cases are All, then the topics some case bears on, with no count on any (choosing each leaves what it did)', !pillHasCount() && pills().map(pillN).join() === '2,1,1,1' && pills()[0].getAttribute('aria-pressed') === 'true' && d.getElementById('legResetText').textContent === 'Reset all (1)', pills().map(b => b.dataset.topic + ' ' + pillN(b)).join(' | '));

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
  ok('searching finds a row by any of its words, topics included, and Reset all clears the search too', idsOf(secs()[0]) === 'zz-tx-1' && (fire(d.getElementById('legReset'), 'click'), search.value === '' && bodyView(d) === 'legislation' && (goto('govSwitchAll'), secs().map(titleOf).join('|') === 'All jurisdictions · 2 key cases|All jurisdictions · 3 enforcement actions')));   // Reset puts the tab back on Legislation (2026-11-24), so All is opened again to see the lists
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
  ok('on Legislation the card for Texas holds the bills alone: nothing of what Enforcement and Cases list', labelsNow() === 'Bills' && !/Enforcement|Pieces|Sample/.test(card()), card());
  goto('govSwitchAll');
  fire(d.querySelector('#legMap path[data-state="TX"]'), 'mouseover');
  ok('on All it holds everything, in the owner\'s order: the bills, then the key cases and the enforcement actions, each a block of its own (the midterm results that used to come first were removed on 2026-11-23)', labelsNow() === 'Bills,Key cases,Enforcement actions', labelsNow());
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

  // All's page: the bills, then the key cases and the enforcement actions, narrowed together by the bills' own search and chips, by the place and by the Sort menu
  fire(d.getElementById('legReset'), 'click');
  goto('govSwitchAll');
  const order = () => [...d.querySelectorAll('#legBillsSection, #enfLists section')].map(e => e.id || e.dataset.kind).join();
  const resultLine = () => d.getElementById('legResultLine').textContent;
  const nBillsAll = Number((/^([\d,]+) of /.exec(resultLine()) || [])[1].replace(/,/g, ''));
  ok('on All the page holds the bills first, then the key cases, then the enforcement actions, each with its own count',
     order() === 'legBillsSection,case,enforcement' && secs().map(titleOf).join('|') === 'All jurisdictions · 2 key cases|All jurisdictions · 3 enforcement actions' && idsOf(secs()[0]) === 'zz-ca-1,zz-case-1' && idsOf(secs()[1]) === 'zz-tx-1,zz-fed-1,zz-fed-2', order() + ' ' + secs().map(titleOf).join('|'));
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
  goto('govSwitchAll');   // Reset puts the tab back on Legislation (2026-11-24), so All is opened again
  fire(d.querySelector('#legTopicPills button[data-topic="bias"]'), 'click');
  ok('so do the bills\' topic chips: Bias and automated decisions leaves one key case and one enforcement action', idsOf(secs()[0]) === 'zz-case-1' && idsOf(secs()[1]) === 'zz-fed-2' && /, 1 of 2 key cases and 1 of 3 enforcement actions\.$/.test(resultLine()), resultLine());
  fire(d.getElementById('legReset'), 'click');
  goto('govSwitchAll');
  change(place, 'TX');
  ok('a place narrows the lists as it narrows the bills: Texas has no key case and one enforcement action, and the address stays #all',
     secs().map(titleOf).join('|') === 'Texas · 0 key cases|Texas · 1 enforcement action' && idsOf(secs()[1]) === 'zz-tx-1' && w.location.hash === '#all', secs().map(titleOf).join('|') + ' ' + w.location.hash);
  fire(d.getElementById('legReset'), 'click');
  goto('govSwitchAll');
  change(d.getElementById('legSort'), 'oldest');
  ok('the Sort menu orders every list: Oldest puts the 2025 case and the December 2025 action first', idsOf(secs()[0]) === 'zz-case-1,zz-ca-1' && idsOf(secs()[1]) === 'zz-fed-2,zz-fed-1,zz-tx-1', idsOf(secs()[0]) + ' ' + idsOf(secs()[1]));
  change(d.getElementById('legSort'), 'recent');
  goto('govSwitchLegislation');
  ok('Legislation holds the bills alone: no list of cases or enforcement actions, and the same masthead as every other section',
     !shownBlock('enforcementArea') && shownBlock('legBillsSection') && mast() === allMastText, mast());

  // the Reset button puts the whole tab back as it opens (the owner: "reset should also reset views"): no place, no filter in ANY section, the order, and the Legislation view (where the tab opens since 2026-11-24, All before); its count says how many things differ
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
  ok('pressing it returns to Legislation, where the tab opens, and clears the chip, the place and the order, and the address is #legislation', bodyView(d) === 'legislation' && place.value === '' && w.location.hash === '#legislation' && resetText() === 'Reset all' && d.getElementById('legSort').value === 'recent', resetText() + ' ' + w.location.hash);
  goto('govSwitchLegislation');
  ok('the topic chosen on Legislation, which was not on the page when it was pressed, is cleared too', d.querySelector('#legTopicPills button[data-topic="bias"]').getAttribute('aria-pressed') === 'false' && d.querySelector('#legTopicPills button[data-topic="all"]').getAttribute('aria-pressed') === 'true' && resetText() === 'Reset all', resetText());
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
    ok(`${name}: the section's own lists are showing and the others' are not: the bills on Legislation and All, the cases and enforcement lists on All, Enforcement and Cases, and no results table anywhere`,
       shown(id('legBillsSection')) === leg && shown(id('enforcementArea')) === !isLeg && !d.getElementById('legResultsSection') &&
       (!isAll || !!(id('legBillsSection').compareDocumentPosition(id('enforcementArea')) & 4)), route);
    const cardLabels = [...d.querySelectorAll('#legPanel .leg-block .leg-label')].map(x => x.textContent);
    const ownLabel = route === 'cases' ? 'Key cases' : 'Enforcement actions';
    ok(`${name}: the card holds ${isAll ? 'everything: the bills, then the key cases and the enforcement actions' : isLeg ? 'the bills alone' : 'this section\'s own block alone'}`,
       isAll ? cardLabels.join() === 'Bills,Key cases,Enforcement actions' : isLeg ? cardLabels.join() === 'Bills' : cardLabels.join() === ownLabel, cardLabels.join());
    const sortId = leg ? 'legSort' : 'enfSort', otherSort = leg ? 'enfSort' : 'legSort';
    ok(`${name}: there is a Sort menu in the search bar's first row after the search box, with ${leg ? 'its five choices (the bills\' two Status orders, by progress, as well as the dates and the jurisdiction)' : 'the three choices (a list has no stage to order by)'}, and the other section's menu is not showing`,
       shown(id(sortId)) && !shown(id(otherSort)) && id(sortId).closest('.controls-row') === id(searchId).closest('.controls-row') && before(searchId, sortId) &&
       [...id(sortId).options].map(o => o.value).join() === (leg ? 'recent,oldest,status,status-desc,jurisdiction' : 'recent,oldest,jurisdiction') &&
       [...id(sortId).options].map(o => o.textContent).join('|') === (leg ? 'Most recent action|Oldest action|Status, least progress first|Status, most progress first|Jurisdiction' : 'Most recent|Oldest|Jurisdiction'), route);
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
      ok(`${name}: the card for ${stateName} holds this section's block alone, with a "See more details below" link for its rows, and nothing about the bills`,
         stateLabels.join() === ownLabel && !!kindLink && kindLink.textContent === 'See more details below' && kindLink.getAttribute('data-kind') === kind && !/Bills|Midterm/.test(d.getElementById('legPanel').textContent), stateLabels.join());
    }
  }
  // the bills' own filters apply on Legislation and All only: set on Legislation, they show there and on All and nowhere else
  const { w, d } = load('index.html', '#legislation');
  await settle(10);
  const id = x => d.getElementById(x), fire = (el, type) => el.dispatchEvent(new w.MouseEvent(type, { bubbles: true })), legend = () => id('legLegend').textContent;
  const fedIn = () => Number((/Federal bills, not on the map\s*([\d,]+)/.exec(legend()) || [])[1].replace(/,/g, ''));
  const chip = [...d.querySelectorAll('#legTopicPills button[data-topic]')].find(b => !['all', 'none'].includes(b.dataset.topic) && !b.disabled && fedIn() > 0);
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

/* ── Landscape: the Links view follows the links from one policy ──────────────────────────────────────────────────────────
   2026-11-24, the owner, from four sketches: a view that "starts from one policy and lets you browse outward: compatible neighbours on the left, competing ones on the right, with reasons below.
   Click any neighbour to move to it." (src/js/30-policy-links.js, docs/adr/0008-policy-links-view-follow-the-links.md; it replaced the force graph). What to expect is worked out here from the cards
   themselves, with code of its own: a link written on either card is a link between the two, an id that is no policy (or the policy itself) is nothing, and a policy's own entries come first, then the
   policies that name it, so these checks hold whatever the authors record. jsdom has no layout, so the columns are checked as markup, and the lines with a width given to the stage. */
const linksFacts = pg => JSON.parse(pg.w.eval(`JSON.stringify((() => {
  const live = new Set(POLICY_DATA.map(p => p.id));
  const own = field => Object.fromEntries(POLICY_DATA.map(p => [p.id, (p[field] || []).filter(l => live.has(l.id) && l.id !== p.id)]));
  const rel = {}, why = {};
  [['pair', 'pairsWith'], ['riv', 'competesWith']].forEach(([kind, field]) => {
    const o = own(field), out = {};
    POLICY_DATA.forEach(p => { out[p.id] = o[p.id].map(l => l.id).filter((x, i, a) => a.indexOf(x) === i); });
    POLICY_DATA.forEach(p => o[p.id].forEach(l => { if (!out[l.id].includes(p.id)) out[l.id].push(p.id); }));
    rel[kind] = out;
    why[kind] = {};
    POLICY_DATA.forEach(p => o[p.id].forEach(l => { why[kind][p.id + '|' + l.id] = l.why || ''; }));
  });
  return {
    order: POLICY_DATA.map(p => p.id),
    title: Object.fromEntries(POLICY_DATA.map(p => [p.id, p.title])),
    area: Object.fromEntries(POLICY_DATA.map(p => [p.id, CATEGORY_MERGE_MAP[p.category]])),
    areas: Object.entries(MERGED_POLICY_CATEGORIES),
    pair: rel.pair, riv: rel.riv, why,
  };
})())`));
// The reasons the page should show for a policy and a neighbour: each author's, once when the two wrote the same.
const linksReasons = (F, kind, a, b) => [F.why[kind][a + '|' + b], F.why[kind][b + '|' + a]].filter((w, i, all) => w && all.indexOf(w) === i);
// Where the view opens: the policy with the most neighbours (partners and rivals, each counted once), ties by title.
const linksStart = F => { const reach = id => new Set([...F.pair[id], ...F.riv[id]]).size; return F.order.slice().sort((a, b) => reach(b) - reach(a) || F.title[a].localeCompare(F.title[b]))[0]; };
{
  const sameList = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const open = pg => { click(pg.w, pg.d, 'polSubviewLinks'); return pg; };
  const all = (pg, s) => [...pg.d.querySelectorAll(s)];
  const middle = pg => pg.d.querySelector('.pol-links-name').textContent;
  const goIds = (pg, s) => all(pg, s).map(t => t.dataset.go);
  const pick = (pg, id) => { const m = pg.d.getElementById('polLinksPick'); m.value = id; m.dispatchEvent(new pg.w.Event('change', { bubbles: true })); };
  const press = (pg, el) => el.dispatchEvent(new pg.w.MouseEvent('click', { bubbles: true }));
  const pathText = pg => all(pg, '#polLinksPath .kw-pill, #polLinksPath .pol-links-here').map(e => e.textContent);
  const menuValue = pg => pg.d.getElementById('polLinksPick').value;

  const pg = open(load('index.html', '#policy'));
  const F = linksFacts(pg), start = linksStart(F);
  ok('the Links view opens on the policy with the most links, with a menu, a path, the two columns, the policy in the middle and the reasons, and logs no error',
     middle(pg) === F.title[start] && menuValue(pg) === start && !!pg.d.getElementById('polLinksPath') && !!pg.d.getElementById('polLinksPartners') && !!pg.d.getElementById('polLinksRivals') && !!pg.d.getElementById('polLinksCard') && !!pg.d.getElementById('polLinksWhy') && pg.errors.length === 0,
     `${middle(pg)} vs ${F.title[start]} | ${pg.errors.join(' | ')}`);
  ok('the old graph is gone: no graph function, no svg of nodes and edges', pg.w.eval('typeof renderPolicyLinksGraph') === 'undefined' && !pg.d.querySelector('.pol-links-svg, .pol-links-node, .pol-links-edge'), '');

  const groups = all(pg, '#polLinksPick optgroup'), wantGroups = F.areas.filter(([a]) => F.order.some(id => F.area[id] === a));
  ok('the menu lists every policy once, under its area, in the order the All view lists them: the areas in their order, the policies alphabetically',
     sameList(groups.map(g => g.label), wantGroups.map(([, label]) => label)) &&
     sameList(groups.map(g => [...g.querySelectorAll('option')].map(o => o.value)), wantGroups.map(([a]) => F.order.filter(id => F.area[id] === a).sort((x, y) => F.title[x].localeCompare(F.title[y])))) &&
     all(pg, '#polLinksPick option').length === F.order.length, `${groups.map(g => g.label)}`);

  // Every policy in turn, from the menu: the columns, the counts, the middle and the reasons.
  const wrongCols = [], wrongRows = [], wrongMid = [];
  F.order.forEach(id => {
    pick(pg, id);
    if (!sameList(goIds(pg, '#polLinksPartners .pol-links-tile'), F.pair[id]) || !sameList(goIds(pg, '#polLinksRivals .pol-links-tile'), F.riv[id]) ||
        pg.d.querySelector('#polLinksPartners .pol-links-hd').textContent !== `Works well with · ${F.pair[id].length}` || pg.d.querySelector('#polLinksRivals .pol-links-hd').textContent !== `Competes with · ${F.riv[id].length}`) wrongCols.push(F.title[id]);
    const rows = all(pg, '.pol-links-row'), want = F.pair[id].map(q => ['pair', q]).concat(F.riv[id].map(q => ['riv', q]));
    if (rows.length !== want.length || want.some(([kind, q], i) => rows[i].querySelector('.pol-links-go').dataset.go !== q || rows[i].classList.contains('pol-links-row--rival') !== (kind === 'riv') ||
        !sameList([...rows[i].querySelectorAll('.pol-links-text')].map(p => p.textContent), linksReasons(F, kind, id, q)))) wrongRows.push(F.title[id]);
    const area = F.areas.find(([a]) => a === F.area[id]);
    if (middle(pg) !== F.title[id] || !pg.d.getElementById('polLinksCard').textContent.includes(area[1]) || menuValue(pg) !== id) wrongMid.push(F.title[id]);
  });
  ok('for every policy, the left column is exactly what works well with it and the right column exactly what competes with it, in the order of the cards, each headed with its count',
     wrongCols.length === 0, `${wrongCols.length} of ${F.order.length} wrong: ${wrongCols.slice(0, 3).join('; ')}`);
  ok('for every policy, under the columns each neighbour comes again as a row, partners then rivals, with the authors\' reasons as written (a paragraph for each author) and the dashed rule on a rival\'s row',
     wrongRows.length === 0, `${wrongRows.length} wrong: ${wrongRows.slice(0, 3).join('; ')}`);
  ok('for every policy, the middle names it and its area and the menu shows it', wrongMid.length === 0, wrongMid.slice(0, 3).join('; '));

  pick(pg, start);
  const tiles = all(pg, '.pol-links-tile');
  ok('a neighbour is a button, in a column that is a group named for how it is linked to the policy in the middle',
     tiles.length > 0 && tiles.every(t => t.tagName === 'BUTTON' && t.type === 'button' && t.getAttribute('aria-label')) &&
     pg.d.getElementById('polLinksPartners').getAttribute('role') === 'group' && pg.d.getElementById('polLinksPartners').getAttribute('aria-label') === 'Works well with ' + F.title[start] &&
     pg.d.getElementById('polLinksRivals').getAttribute('role') === 'group' && pg.d.getElementById('polLinksRivals').getAttribute('aria-label') === 'Competes with ' + F.title[start], `${tiles.length} tiles`);
  ok('a partner\'s tile has a solid outline and a rival\'s a dashed one (the class the styles read), and the two columns are told apart by shape and not by colour alone',
     all(pg, '#polLinksPartners .pol-links-tile').every(t => t.classList.contains('pol-links-tile--partner') && !t.classList.contains('pol-links-tile--rival')) && all(pg, '#polLinksRivals .pol-links-tile').every(t => t.classList.contains('pol-links-tile--rival')), '');

  // Walking: a start A, a neighbour B of it, and a neighbour C of B that is not A (the data has one: the policies are linked in groups of at least two, and a group of two has no C, so the search goes on until it finds a longer one).
  const near = id => F.pair[id].concat(F.riv[id]);
  const A = [start].concat(F.order).find(a => near(a).some(b => near(b).some(c => c !== a))), B = near(A).find(b => near(b).some(c => c !== A)), C = near(B).find(c => c !== A);
  if (!A) throw new Error('the Links walk checks need three policies in a row: A linked to B, B linked to C');
  pick(pg, A);
  press(pg, all(pg, '.pol-links-tile').find(t => t.dataset.go === B));
  ok('clicking a neighbour moves to it: it is in the middle, the path has one more step ending in it, the menu follows, the focus is on the card, and a screen reader is told',
     middle(pg) === F.title[B] && sameList(pathText(pg), [F.title[A], F.title[B]]) && menuValue(pg) === B && pg.d.activeElement === pg.d.getElementById('polLinksCard') &&
     pg.d.getElementById('polLinksStatus').textContent.startsWith('Showing ' + F.title[B]),
     `${middle(pg)} | ${pathText(pg)} | ${pg.d.activeElement && pg.d.activeElement.id} | ${pg.d.getElementById('polLinksStatus').textContent}`);
  press(pg, all(pg, '.pol-links-go').find(b => b.dataset.go === C));
  ok('the name of a neighbour in the list of reasons moves to it too', middle(pg) === F.title[C] && sameList(pathText(pg), [F.title[A], F.title[B], F.title[C]]), `${middle(pg)} | ${pathText(pg)}`);
  press(pg, all(pg, '.pol-links-tile').find(t => t.dataset.go === B));
  ok('stepping to the policy you came from is a step back: the path gets shorter instead of longer', middle(pg) === F.title[B] && sameList(pathText(pg), [F.title[A], F.title[B]]), `${middle(pg)} | ${pathText(pg)}`);

  // A walk along the links that never steps straight back: the first neighbour that is not the policy just left (the data has no dead end in 14 steps; the check says so if it ever has).
  const walk = n => {
    for (let i = 0; i < n; i++) {
      const before = pathText(pg).slice(-2, -1)[0], t = all(pg, '.pol-links-tile').find(x => x.querySelector('.pol-links-tile-title').textContent !== before);
      if (!t) throw new Error(`the walk reached a dead end after ${i} steps, at ${middle(pg)}: every neighbour is the policy it came from`);
      press(pg, t);
    }
  };
  pick(pg, start);
  walk(3);
  press(pg, all(pg, '#polLinksPath [data-step]')[0]);
  ok('an earlier step of the path is a button that goes back to it and drops the steps after it', sameList(pathText(pg), [F.title[start]]) && middle(pg) === F.title[start] && menuValue(pg) === start, `${pathText(pg)}`);

  // The path keeps the last 12 steps and shows the latest 5: the first of the pills it shows is step 7 of the 12 kept.
  pick(pg, start);
  walk(14);
  const steps = all(pg, '#polLinksPath [data-step]');
  ok('the path remembers 12 steps and shows the latest 5, with an ellipsis before them', pathText(pg).length === 5 && steps.length === 4 && steps[0].dataset.step === '7' && /…/.test(pg.d.getElementById('polLinksPath').textContent), `${pathText(pg).length} shown, first step ${steps[0] && steps[0].dataset.step}`);
  const other = F.order.find(id => id !== menuValue(pg));
  pick(pg, other);
  ok('choosing a policy from the menu starts a new path from it', pathText(pg).length === 1 && middle(pg) === F.title[other] && all(pg, '#polLinksPath [data-step]').length === 0, `${pathText(pg)}`);

  press(pg, pg.d.querySelector('#polLinksCard [data-open]'));
  ok('the button in the middle opens that policy\'s dialog', pg.d.getElementById('polModalTitle').textContent === F.title[other], pg.d.getElementById('polModalTitle').textContent);

  // Wide enough for three columns the lines are drawn; narrower they are not. (jsdom has no layout: the stage is given a width.)
  pick(pg, start);
  const stage = pg.d.getElementById('polLinksStage'), width = w => { Object.defineProperty(stage, 'clientWidth', { configurable: true, get: () => w }); pg.w.dispatchEvent(new pg.w.Event('resize')); };
  width(900);
  const nP = F.pair[start].length, nR = F.riv[start].length;
  ok('given the width for three columns, a line joins each neighbour to the middle: solid for each that works well with it, dashed for each that competes with it',
     !stage.classList.contains('is-stacked') && all(pg, '.pol-links-line').length === nP + nR && all(pg, '.pol-links-line--partner').length === nP && all(pg, '.pol-links-line--rival').length === nR, `${all(pg, '.pol-links-line').length} lines for ${nP} + ${nR}`);
  width(400);
  ok('narrower than that the columns stack and no line is drawn', stage.classList.contains('is-stacked') && all(pg, '.pol-links-line').length === 0, `${all(pg, '.pol-links-line').length} lines`);
  // The menu's place and the pills beside it (the owner, 2026-11-24): "Start from" is in line with the views, there is no line of instructions, the headings are the dialog's own label, and Randomize and Refresh are as on Compare.
  const slotEl = pg.d.getElementById('polLinksSlot'), cmpSlotEl = pg.d.getElementById('polCmpSlot'), barEl = pg.d.querySelector('.pol-subview-bar'), menuEl = pg.d.getElementById('polLinksPick'), slotStates = [], pinStates = [];
  const seeSlots = () => { slotStates.push(slotEl.hidden); pinStates.push(barEl.classList.contains('is-pinned')); };
  click(pg.w, pg.d, 'polSubviewAll'); seeSlots(); click(pg.w, pg.d, 'polSubviewCompare'); seeSlots(); click(pg.w, pg.d, 'polSubviewLinks'); seeSlots();
  ok('"Start from" is on the same row as the switch, in line with the views: the menu is in the slot beside the three view buttons and not in the view under them, and the slot shows only while Links is on',
     !!barEl && barEl.contains(slotEl) && !!barEl.querySelector('.pol-subview-toggle') && slotEl.contains(menuEl) && !pg.d.getElementById('polLinksArea').contains(menuEl) && sameList(slotStates, [true, true, false]), JSON.stringify(slotStates));
  ok('the row is marked pinned (it sticks under the top of a wide window, policy.css) only while Compare is showing: not on All, not on Links',
     sameList(pinStates, [false, true, false]), JSON.stringify(pinStates));
  ok('the two views have a slot each on that row, Links\' and Compare\'s, and exactly the slot of the view showing is shown (none for All)',
     !!cmpSlotEl && barEl.contains(cmpSlotEl) && slotEl !== cmpSlotEl && !!slotEl.hidden === false && cmpSlotEl.hidden === true, `links hidden ${slotEl.hidden}, compare hidden ${cmpSlotEl.hidden}`);
  ok('there is no line of instructions in the view: "Click any policy on either side to move to it." is gone (the owner, 2026-11-24)', !/Click any policy/.test(pg.d.getElementById('policyArea').textContent) && !pg.d.querySelector('.pol-links-hint'), '');
  const heads = all(pg, '#polLinksPartners .pol-links-hd, #polLinksRivals .pol-links-hd');
  ok('the headings over the two columns are the dialog\'s own label, as Compare\'s row labels are (15.5px bold), so the same words are the same type in both views',
     heads.length === 2 && heads.every(h => h.classList.contains('pol-modal-label') && h.getAttribute('role') === 'heading'), heads.map(h => h.className).join(' | '));
  const pillWords = [...slotEl.querySelectorAll('.kw-pill')].map(b => b.textContent);
  ok('beside the menu are the Back, Copy Draft, Copy link, Print, Randomize and Refresh pills, in alphabetical order (the owner, 2026-11-24), as one unit, and there is no Add button (she took it out the same day)',
     sameList(pillWords, ['Back', 'Copy Draft', 'Copy link', 'Print', 'Randomize', 'Refresh']) && sameList(pillWords, pillWords.slice().sort((x, y) => x.localeCompare(y))) && slotEl.querySelectorAll('.pol-subview-pills').length === 1 && !pg.d.getElementById('polLinksAdd') && !/\bAdd\b/.test(slotEl.textContent), pillWords.join());
  const slotKids = [...slotEl.children];
  ok('the menu comes first in the slot and the pills after it, each as a unit (the owner, 2026-11-24: "the policy selections should be before" the buttons): the menu is the first thing after the switch, and the six pills follow it',
     slotKids.length === 2 && slotKids[0].classList.contains('pol-subview-pick') && slotKids[1].classList.contains('pol-subview-pills') && slotKids[0].contains(menuEl) && sameList([...slotKids[1].children].map(b => b.id), ['polLinksBack', 'polLinksCopyDraft', 'polLinksCopy', 'polLinksPrint', 'polLinksRandom', 'polLinksRefresh']), slotKids.map(k => k.className).join(' | '));

  // Randomize and Refresh. The check sets the random numbers, so it knows which policy they choose (the page picks the one at the place a number names in the order of the cards).
  const idAt = x => F.order[Math.floor(x * F.order.length)], stub = values => { const q = values.slice(); pg.w.Math.random = () => q.length ? q.shift() : 0.5; };
  const n1 = [0.2, 0.4, 0.6, 0.8].find(x => idAt(x) !== start), n2 = [0.1, 0.3, 0.5, 0.7, 0.9].find(x => idAt(x) !== idAt(n1));
  pick(pg, start);
  stub([n1]); press(pg, pg.d.getElementById('polLinksRandom'));
  ok('Randomize goes to a policy at random and starts a new path there: the number ' + n1 + ' chooses the policy at that place, the menu follows, and the path is that policy alone',
     middle(pg) === F.title[idAt(n1)] && menuValue(pg) === idAt(n1) && sameList(pathText(pg), [F.title[idAt(n1)]]), `${middle(pg)} | ${pathText(pg)}`);
  stub([n1, n2]); press(pg, pg.d.getElementById('polLinksRandom'));
  ok('and Randomize never picks the policy that is already in the middle: when the number would, it draws again', middle(pg) === F.title[idAt(n2)], `${middle(pg)}`);
  walk(2); while (middle(pg) === F.title[start]) walk(1);
  const awayFromStart = middle(pg) !== F.title[start] && pathText(pg).length > 1;
  press(pg, pg.d.getElementById('polLinksRefresh'));
  ok('Refresh takes the view back to where it opens, the policy with the most links, with a new path', awayFromStart && middle(pg) === F.title[start] && menuValue(pg) === start && sameList(pathText(pg), [F.title[start]]), `${middle(pg)} | ${pathText(pg)}`);
  const histBefore = pg.w.history.length;
  press(pg, pg.d.getElementById('polLinksRefresh'));
  ok('and Refresh does nothing when the view is already there with no path behind it: no step is added', pg.w.history.length === histBefore && sameList(pathText(pg), [F.title[start]]), `${pg.w.history.length - histBefore} steps`);
  ok('nothing logs an error through all of it', pg.errors.length === 0, pg.errors.join(' | '));
}

/* ── Landscape: the type matches across the three views (Links, Compare, All) ─────────────────────────────────────────────────
   The owner, 2026-11-24: "match the typography across all those views". Where the same thing appears in more than one view it is set in the same style. jsdom cannot resolve a stylesheet, so this reads the rules
   themselves (comments out) and compares the declarations of the selectors that stand for the same role, so that a change made to one and not to the others fails here. The sizes were also measured in a real browser,
   view by view, on the day: the Links view's column headings were 12px labels where Compare sets the same words in the dialog's 15.5px label, and the policy in the middle was 15.5px where Compare and the All view
   set a policy or an area as the subject in 20px. */
{
  const fs = require('fs'), path = require('path');
  const css = ['policy.css', 'cards.css', 'modals.css'].map(f => fs.readFileSync(path.join(__dirname, '..', 'src', 'styles', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')).join('\n');
  const declsOf = sel => {
    const out = {};
    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!m[1].split(',').some(x => x.trim() === sel)) continue;
      m[2].split(';').forEach(d => { const i = d.indexOf(':'); if (i > 0) out[d.slice(0, i).trim()] = d.slice(i + 1).trim(); });
    }
    return out;
  };
  const TILE = ['font-size', 'font-weight', 'line-height'], NAME = ['font-family', 'font-size', 'font-weight', 'letter-spacing', 'line-height'];
  const roles = [
    ['a policy\'s title in a tile: the All view\'s tile, a Compare sample, a Links neighbour', '.pol-cat-card-title', ['.pol-cmp-sample-title', '.pol-links-tile-title'], TILE],
    ['the policy that is the subject: an area\'s title in the All view, a policy\'s name over Compare\'s comparison, the policy in the middle of Links', '.pol-cat-row-title', ['.pol-cmp-name', '.pol-links-name'], NAME],
    ['the authors\' reasons: Compare\'s samples and the Links list', '.pol-cmp-sample-why', ['.pol-links-text'], ['font-size', 'line-height', 'color']],
    ['the area under a title: Compare\'s name boxes and head cells, a Links neighbour', '.pol-cmp-areaname', ['.pol-cmp-area', '.pol-links-tile-area'], ['font-size', 'color']],
    ['a line of notes with nothing in it: Compare\'s "No recorded partners" and the Links empty column', '.pol-cmp-none', ['.pol-links-none'], ['font-size', 'color']],
  ];
  const wrong = [];
  roles.forEach(([what, base, others, props]) => others.forEach(o => props.forEach(p => { const a = declsOf(base)[p], b = declsOf(o)[p]; if (a === undefined || b === undefined || a !== b) wrong.push(`${what}: ${p} is ${a} on ${base} and ${b} on ${o}`); })));
  ok('the type matches across the three views: the same role has the same family, size, weight, spacing, line height and colour wherever it appears (a title in a tile, the policy that is the subject, the authors\' reasons, the area under a title, a line of notes)',
     wrong.length === 0, wrong.slice(0, 4).join(' | '));
}

/* ── Landscape: the cards the Sheet's policy map tab archives are left out ──────────────────────────────────────────────────────
   data/policy-map.js (generated by tools/policy_map.py from the tab; docs/policy-doc-sync.md) lists the ids of the archived cards, and the page
   takes them out of POLICY_DATA before anything reads it, so the Landscape, its counts, the Links view and the dialogs all leave them out. These
   checks lay a POLICY_MAP of their own over the shipped file, so they hold whichever cards the tab archives. */
{
  const fs = require('fs'), path = require('path');
  const inl = f => f.replace(/<\/script/gi, '<\\/script');
  const shippedMap = inl(fs.readFileSync(path.join(__dirname, '..', 'data', 'policy-map.js'), 'utf8'));
  const withMap = file => html => {
    if (!html.includes(shippedMap)) throw new Error('data/policy-map.js is not inlined as the test expects');
    return html.replace(shippedMap, () => inl(file));
  };
  const idsOf = pg => JSON.parse(pg.w.eval('JSON.stringify(POLICY_DATA.map(p => p.id))'));
  const shown = pg => pg.d.querySelectorAll('#policyArea .pol-cat-card').length;
  const sameList = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const open = pg => { const b = [...pg.d.querySelectorAll('.pol-subview-btn')].find(x => /^links/i.test(x.textContent.trim())); b.dispatchEvent(new pg.w.MouseEvent('click', { bubbles: true })); return pg; };
  const none = load('index.html', '#policy', { transform: withMap('const POLICY_MAP = { archived: [] };') });
  const every = idsOf(none);
  const real = load('index.html', '#policy');
  const archived = JSON.parse(real.w.eval('JSON.stringify(POLICY_MAP.archived)'));
  ok('the shipped data/policy-map.js has an archived list, and every id in it is a card the page would otherwise show',
     Array.isArray(archived) && archived.every(id => typeof id === 'string' && every.includes(id)) && new Set(archived).size === archived.length, JSON.stringify(archived));
  ok('the page shows every card except the archived ones, in their order, with no console errors', sameList(idsOf(real), every.filter(id => !archived.includes(id))) && real.errors.length === 0, `${idsOf(real).length} of ${every.length}`);
  ok('the Landscape has one card fewer for each archived one', shown(real) === shown(none) - archived.length && shown(none) === every.length, `${shown(real)} shown, ${shown(none)} with none archived`);
  const syn = open(load('index.html', '#policy', { transform: withMap('const POLICY_MAP = { archived: ["min-wage-indexing", "no-such-card"] };') }));
  const menuIds = [...syn.d.querySelectorAll('#polLinksPick option')].map(o => o.value), neighbours = [...syn.d.querySelectorAll('.pol-links-tile')].map(t => t.dataset.go);
  ok('an archived card is not in the Links view\'s menu, a card that pointed at it has no tile for it, an id that is no card is ignored, and nothing logs an error',
     sameList(idsOf(syn), every.filter(id => id !== 'min-wage-indexing')) && sameList(menuIds.slice().sort(), idsOf(syn).slice().sort()) && !neighbours.includes('min-wage-indexing') && neighbours.every(id => menuIds.includes(id)) && syn.errors.length === 0,
     `${menuIds.length} in the menu (${every.length - 1} expected), ${neighbours.length} neighbours`);
  const missing = load('index.html', '#policy', { transform: withMap('') });
  ok('with no policy map file the page shows every card', sameList(idsOf(missing), every) && missing.errors.length === 0, `${idsOf(missing).length} of ${every.length}`);
}

/* ── Landscape: the Links view shows a link whichever card wrote it ──────────────────────────────────────────────────────────
   Its neighbours come from each card's pairsWith, read the way the Compare view reads them: a link written on one card is a link between the two, an id that is no policy (or the policy itself) is nothing,
   and when both cards write a reason both are shown. The card's dialog stopped listing them when its "How it interacts" section was removed (2026-11-17), so the Landscape is the one place they show. Each
   check lays a statement over the cards before the page reads them, so it holds whichever links the authors record. */
{
  const fs = require('fs'), path = require('path');
  const inl = f => f.replace(/<\/script/gi, '<\\/script');
  const shippedMap = inl(fs.readFileSync(path.join(__dirname, '..', 'data', 'policy-map.js'), 'utf8'));
  const afterMap = js => html => {
    if (!html.includes(shippedMap)) throw new Error('data/policy-map.js is not inlined as the test expects');
    return html.replace(shippedMap, () => shippedMap + '\n' + inl(js));
  };
  const sameList = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const open = pg => { click(pg.w, pg.d, 'polSubviewLinks'); return pg; };
  const all = (pg, s) => [...pg.d.querySelectorAll(s)];
  const pick = (pg, id) => { const m = pg.d.getElementById('polLinksPick'); m.value = id; m.dispatchEvent(new pg.w.Event('change', { bubbles: true })); };
  const goIds = (pg, s) => all(pg, s).map(t => t.dataset.go);
  const reasonOf = (pg, id) => { const r = all(pg, '.pol-links-row').find(x => x.querySelector('.pol-links-go').dataset.go === id); return r ? [...r.querySelectorAll('.pol-links-text')].map(p => p.textContent) : null; };

  const real = open(load('index.html', '#policy'));
  const F = linksFacts(real);
  const linked = (a, b) => F.pair[a].includes(b) || F.riv[a].includes(b);
  const X = F.order.find(a => F.order.some(b => b !== a && !linked(a, b))), Y = F.order.find(b => b !== X && !linked(X, b));
  if (!X || !Y) throw new Error('the one-sided link checks need two policies with no link between them');
  const add = (id, field, link) => `POLICY_DATA.find(p => p.id === ${JSON.stringify(id)}).${field} = (POLICY_DATA.find(p => p.id === ${JSON.stringify(id)}).${field} || []).concat([${JSON.stringify(link)}]);`;

  const one = open(load('index.html', '#policy', { transform: afterMap(add(X, 'pairsWith', { id: Y, why: 'ONE-SIDED REASON' })) }));
  pick(one, Y);
  ok('a link written on one card only is a link between the two: the other policy lists it, and the reason is shown',
     goIds(one, '#polLinksPartners .pol-links-tile').includes(X) && sameList(reasonOf(one, X), ['ONE-SIDED REASON']) && one.errors.length === 0, `${goIds(one, '#polLinksPartners .pol-links-tile')} | ${reasonOf(one, X)}`);
  pick(one, X);
  ok('and the card that wrote it lists the other, with the same reason', goIds(one, '#polLinksPartners .pol-links-tile').includes(Y) && sameList(reasonOf(one, Y), ['ONE-SIDED REASON']), `${reasonOf(one, Y)}`);

  const two = open(load('index.html', '#policy', { transform: afterMap(add(X, 'pairsWith', { id: Y, why: 'REASON FROM X' }) + add(Y, 'pairsWith', { id: X, why: 'REASON FROM Y' })) }));
  pick(two, X);
  const fromX = reasonOf(two, Y);
  pick(two, Y);
  const fromY = reasonOf(two, X);
  ok('when both cards write a reason about the same pair each is shown, the policy\'s own first, as a paragraph apiece', sameList(fromX, ['REASON FROM X', 'REASON FROM Y']) && sameList(fromY, ['REASON FROM Y', 'REASON FROM X']) && two.errors.length === 0, `${fromX} | ${fromY}`);
  const same = open(load('index.html', '#policy', { transform: afterMap(add(X, 'pairsWith', { id: Y, why: 'THE SAME REASON' }) + add(Y, 'pairsWith', { id: X, why: 'THE SAME REASON' })) }));
  pick(same, X);
  ok('and when they wrote the same sentence it is shown once', sameList(reasonOf(same, Y), ['THE SAME REASON']), `${reasonOf(same, Y)}`);

  const bogus = open(load('index.html', '#policy', { transform: afterMap([X, Y].map(id => add(id, 'pairsWith', { id: 'no-such-policy', why: 'x' }) + add(id, 'pairsWith', { id, why: 'itself' }) + add(id, 'competesWith', { id: 'no-such-policy', why: 'x' }) + add(id, 'competesWith', { id, why: 'itself' })).join('\n')) }));
  const same2 = F.order.every(id => { pick(bogus, id); return sameList(goIds(bogus, '#polLinksPartners .pol-links-tile'), F.pair[id]) && sameList(goIds(bogus, '#polLinksRivals .pol-links-tile'), F.riv[id]); });
  ok('an id that is no policy, and a policy that lists itself, draw nothing in either column, and nothing logs an error', same2 && bogus.errors.length === 0, bogus.errors.join(' | '));
}

/* ── Landscape: the All / Links / Compare switch, and the Featured label ───────────────────────────────────────────────────
   The Landscape has three views (the owner, 2026-11-19: all policies, how the policies are related to one another, and a Compare view). A policy the owner has featured is not a
   view of its own (there was a Featured view for part of that day, and the owner replaced it with this): it carries a "Featured" label on its tile in the All view, and the only
   thing that makes one is the `featured` list in data/policy-map.js, which tools/policy_map.py writes from the `featured` column of the Sheet's policy map tab (the owner, 2026-11-19:
   "whatever's labeled on the google sheet"). These checks set that list themselves, by laying a statement over the shipped file before the page reads it, so they hold whichever
   policies the tab features; the last one reads the shipped file. */
{
  const fs = require('fs'), path = require('path');
  const inl = f => f.replace(/<\/script/gi, '<\\/script');
  const shippedMap = inl(fs.readFileSync(path.join(__dirname, '..', 'data', 'policy-map.js'), 'utf8'));
  const afterMap = js => html => {
    if (!html.includes(shippedMap)) throw new Error('data/policy-map.js is not inlined as the test expects');
    return html.replace(shippedMap, () => shippedMap + '\n' + inl(js));
  };
  const features = ids => afterMap(`POLICY_MAP.featured = ${JSON.stringify(ids)};`);
  const sameList = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const byTitle = (a, b) => a.localeCompare(b);
  const labels = pg => [...pg.d.querySelectorAll('#policyArea .pol-subview-btn')].map(b => b.textContent.trim());
  const pressed = pg => ['polSubviewAll', 'polSubviewLinks', 'polSubviewCompare'].map(id => pg.d.getElementById(id).getAttribute('aria-pressed'));
  const tiles = pg => [...pg.d.querySelectorAll('#policyArea .pol-cat-card-title')].map(t => t.textContent);
  const flagged = pg => [...pg.d.querySelectorAll('#policyArea .pol-cat-card')].filter(c => c.querySelector('.pol-cat-card-flag')).map(c => c.querySelector('.pol-cat-card-title').textContent);
  const counts = pg => [...pg.d.querySelectorAll('#policyArea .pol-cat-row-count')].map(c => c.textContent.trim());
  const hidden = (pg, id) => pg.d.getElementById(id).style.display === 'none';

  const none = load('index.html', '#policy', { transform: features([]) });
  const all = JSON.parse(none.w.eval('JSON.stringify(POLICY_DATA.map(p => ({ id: p.id, title: p.title, area: CATEGORY_MERGE_MAP[p.category] })))'));
  const areas = JSON.parse(none.w.eval('JSON.stringify(Object.keys(MERGED_POLICY_CATEGORIES))'));
  const inArea = a => all.filter(p => p.area === a);
  const picks = [inArea(areas[0])[0], inArea(areas[0])[1], inArea(areas[2])[0]];   // two in the first area and one in the third
  if (!picks.every(Boolean)) throw new Error('the Featured label test needs two policies in the first area and one in the third');

  ok('the Landscape has three views, Links, Compare and All in that order (the owner, 2026-11-24: "order the views like Links Compare All"), and still opens on All, the last of them, with every policy; there is no Featured view',
     sameList(labels(none), ['Links', 'Compare', 'All']) && sameList(pressed(none), ['true', 'false', 'false']) && tiles(none).length === all.length && !none.d.getElementById('polSubviewFeatured') && none.errors.length === 0,
     `${labels(none)} | pressed ${pressed(none)} | ${tiles(none).length} of ${all.length} policies`);
  ok('with no policy featured, no tile carries a label and the page says nothing about it', flagged(none).length === 0 && !/Featured/i.test(none.d.getElementById('policyArea').textContent), flagged(none).join());

  const stale = load('index.html', '#policy', { transform: afterMap('POLICY_MAP.featured = ["no-such-card"];') });
  const older = load('index.html', '#policy', { transform: afterMap('delete POLICY_MAP.featured;') });
  const ownFlag = load('index.html', '#policy', { transform: afterMap('POLICY_DATA[0].featured = true; POLICY_MAP.featured = [];') });
  ok('only the Sheet\'s list features a policy: an id in it that is no policy, a file with no list, and a flag on a card itself all feature nobody, and nothing logs an error',
     [stale, older, ownFlag].every(x => flagged(x).length === 0 && x.errors.length === 0), [stale, older, ownFlag].map(x => `${flagged(x).length} labelled, ${x.errors.length} errors`).join(' | '));
  // (a policy whose text comes from a Google Doc is not the one to archive here: the validator reports synced text for a card that is gone, which is a different check)
  const syncedIds = JSON.parse(none.w.eval('JSON.stringify(Object.keys(POLICY_TEXT))'));
  const victim = all.find(p => !syncedIds.includes(p.id));
  const both = load('index.html', '#policy', { transform: afterMap(`POLICY_MAP.archived.push(${JSON.stringify(victim.id)}); POLICY_MAP.featured = [${JSON.stringify(victim.id)}];`) });
  ok('a policy that is both archived and featured is not shown at all, and nothing logs an error',
     !tiles(both).includes(victim.title) && flagged(both).length === 0 && tiles(both).length === all.length - 1 && both.errors.length === 0, `${tiles(both).length} of ${all.length}, ${both.errors.join(' | ')}`);

  const pg = load('index.html', '#policy', { transform: features(picks.map(p => p.id)) });
  ok('a policy the owner has featured carries a Featured label on its tile in the All view, no other tile does, and every policy is still listed',
     sameList(flagged(pg).slice().sort(byTitle), picks.map(p => p.title).sort(byTitle)) && sameList(tiles(pg).slice().sort(byTitle), all.map(p => p.title).sort(byTitle)) && pg.errors.length === 0, `${flagged(pg)} | ${tiles(pg).length} of ${all.length}`);
  const main = [...pg.d.querySelectorAll('#policyArea .pol-cat-card')].find(c => c.querySelector('.pol-cat-card-flag')).querySelector('.pol-cat-card-main');
  ok('the label is the word Featured, text in the tile ahead of the title (so it is read with it), and the title and each row\'s count are what they were without it',
     main.firstElementChild.className === 'pol-cat-card-flag' && main.firstElementChild.textContent === 'Featured' && main.lastElementChild.className === 'pol-cat-card-title' && sameList(counts(pg), counts(none)) && sameList(tiles(pg), tiles(none)),
     `${main.firstElementChild.className} / ${main.lastElementChild.className} | ${counts(pg)} vs ${counts(none)}`);
  const featuredTile = [...pg.d.querySelectorAll('#policyArea .pol-cat-card')].find(c => c.querySelector('.pol-cat-card-flag'));
  featuredTile.dispatchEvent(new pg.w.MouseEvent('click', { bubbles: true }));
  ok('clicking a featured tile opens its policy, titled as the policy and not as the label', picks.map(p => p.title).includes(pg.d.getElementById('polModalTitle').textContent) && pg.d.getElementById('polModalTitle').textContent === featuredTile.querySelector('.pol-cat-card-title').textContent, pg.d.getElementById('polModalTitle').textContent);

  click(pg.w, pg.d, 'polSubviewLinks');
  ok('Links hides the rows and shows its view, with every policy in the menu', hidden(pg, 'polCatRows') && !hidden(pg, 'polLinksArea') && pg.d.querySelectorAll('#polLinksPick option').length === all.length && sameList(pressed(pg), ['false', 'true', 'false']),
     `${pg.d.querySelectorAll('#polLinksPick option').length} policies in the menu, pressed ${pressed(pg)}`);
  click(pg.w, pg.d, 'polSubviewAll');
  ok('coming back to All shows the rows again with the same labels, and hides the Links view', !hidden(pg, 'polCatRows') && hidden(pg, 'polLinksArea') && sameList(flagged(pg).slice().sort(byTitle), picks.map(p => p.title).sort(byTitle)) && sameList(pressed(pg), ['true', 'false', 'false']), flagged(pg).join());

  const real = load('index.html', '#policy');
  const listed = JSON.parse(real.w.eval('JSON.stringify(POLICY_MAP.featured)'));
  const titleOf = JSON.parse(real.w.eval('JSON.stringify(Object.fromEntries(POLICY_DATA.map(p => [p.id, p.title])))'));
  const archivedIds = JSON.parse(real.w.eval('JSON.stringify(POLICY_MAP.archived)'));
  const ownFlags = real.w.eval('POLICY_DATA.some(p => "featured" in p)');
  ok('in the shipped data/policy-map.js the featured list is the tab\'s: ids of cards on the site, each once; the tiles labelled Featured are exactly those of them that are shown, and no card carries a flag of its own',
     Array.isArray(listed) && new Set(listed).size === listed.length && listed.every(id => typeof id === 'string' && (id in titleOf || archivedIds.includes(id))) && !ownFlags &&
     sameList(flagged(real).slice().sort(byTitle), listed.filter(id => id in titleOf).map(id => titleOf[id]).sort(byTitle)) && real.errors.length === 0, `${listed.length} listed, ${flagged(real).length} labelled, own flags: ${ownFlags}`);
}

/* ── Landscape: the Links view puts the policies that compete with a policy on the right, dashed ─────────────────────────────
   Each card's competesWith (a substitute or alternative approach: a job guarantee against a shorter workweek) is shown in the right column, as a tile with a dashed outline, a dashed line to the policy in the middle
   and a row with a dashed rule in the list of reasons: the same kind of mark three times, so what competes is told apart from what works well with it by shape and not by colour alone. */
{
  const fs = require('fs'), path = require('path');
  const inl = f => f.replace(/<\/script/gi, '<\\/script');
  const shippedMap = inl(fs.readFileSync(path.join(__dirname, '..', 'data', 'policy-map.js'), 'utf8'));
  const afterMap = js => html => {
    if (!html.includes(shippedMap)) throw new Error('data/policy-map.js is not inlined as the test expects');
    return html.replace(shippedMap, () => shippedMap + '\n' + inl(js));
  };
  const sameList = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const open = pg => { click(pg.w, pg.d, 'polSubviewLinks'); return pg; };
  const all = (pg, s) => [...pg.d.querySelectorAll(s)];
  const pick = (pg, id) => { const m = pg.d.getElementById('polLinksPick'); m.value = id; m.dispatchEvent(new pg.w.Event('change', { bubbles: true })); };
  const goIds = (pg, s) => all(pg, s).map(t => t.dataset.go);

  const real = open(load('index.html', '#policy'));
  const F = linksFacts(real);
  const both = F.order.filter(id => F.pair[id].some(q => F.riv[id].includes(q)));
  ok('no two policies are authored as both pairing with and competing with each other (a neighbour would be in both columns: it should be one or the other)', both.length === 0, both.map(id => F.title[id]).join(', '));

  const rivalPairs = new Set(F.order.flatMap(a => F.riv[a].map(b => [a, b].sort().join('|'))));
  let dashed = 0, dashedRows = 0, solidInRival = 0;
  F.order.forEach(id => { pick(real, id); dashed += all(real, '#polLinksRivals .pol-links-tile--rival').length; dashedRows += all(real, '.pol-links-row--rival').length; solidInRival += all(real, '#polLinksRivals .pol-links-tile--partner').length; });
  ok('each pair of policies that compete is a dashed tile on the right of both of them, and a dashed row in the reasons of both',
     rivalPairs.size > 0 && dashed === 2 * rivalPairs.size && dashedRows === 2 * rivalPairs.size && solidInRival === 0, `${dashed} dashed tiles, ${dashedRows} dashed rows for ${rivalPairs.size} pairs`);
  // the policy to archive is a rival that no card's text points at with a {{pol:...}} reference (archiving one that is pointed at is a data mistake the validator rightly reports, which is another test's business)
  const polText = real.w.eval('JSON.stringify(POLICY_DATA)'), unpointed = id => !polText.includes('{{pol:' + id + '|');
  const [a, b] = [...rivalPairs].map(k => k.split('|')).map(([x, y]) => unpointed(y) ? [x, y] : unpointed(x) ? [y, x] : null).find(Boolean);
  pick(real, a);
  const stage = real.d.getElementById('polLinksStage');
  Object.defineProperty(stage, 'clientWidth', { configurable: true, get: () => 900 });
  real.w.dispatchEvent(new real.w.Event('resize'));
  ok('the line from the policy in the middle to a rival is dashed, and one to a partner is not', all(real, '.pol-links-line--rival').length === F.riv[a].length && all(real, '.pol-links-line--partner').length === F.pair[a].length, `${all(real, '.pol-links-line--rival').length} dashed for ${F.riv[a].length}`);

  const gone = b;
  const arch = open(load('index.html', '#policy', { transform: afterMap(`POLICY_MAP.archived.push(${JSON.stringify(gone)});`) }));
  pick(arch, a);
  ok('a rival that is archived is in neither column, nor the menu, nor the reasons, and nothing logs an error',
     !goIds(arch, '.pol-links-tile').includes(gone) && !goIds(arch, '.pol-links-go').includes(gone) && !all(arch, '#polLinksPick option').some(o => o.value === gone) && sameList(goIds(arch, '#polLinksRivals .pol-links-tile'), F.riv[a].filter(q => q !== gone)) && arch.errors.length === 0, `${goIds(arch, '#polLinksRivals .pol-links-tile')}`);

  const bare = open(load('index.html', '#policy', { transform: afterMap('POLICY_DATA.forEach(p => { p.competesWith = []; });') }));
  let noneSaid = 0, anyDashed = 0;
  const said1 = (pg, sel) => (pg.d.querySelector(sel) || {}).textContent;
  F.order.forEach(id => { pick(bare, id); anyDashed += all(bare, '.pol-links-tile--rival, .pol-links-row--rival').length; if (said1(bare, '#polLinksRivals .pol-links-none') === 'No recorded competing policies.') noneSaid++; });
  ok('with no rival policies recorded the right column says so for every policy, nothing is dashed, and nothing logs an error', noneSaid === F.order.length && anyDashed === 0 && bare.errors.length === 0, `${noneSaid} of ${F.order.length} say so, ${anyDashed} dashed`);

  // Where the view opens counts rivals as links too: give one policy (not the one it opens on) a rival in every other policy, and it has the most.
  const start0 = linksStart(F), many = F.order.find(id => id !== start0), others = F.order.filter(id => id !== many);
  const rivalrous = open(load('index.html', '#policy', { transform: afterMap(`(() => { const z = POLICY_DATA.find(p => p.id === ${JSON.stringify(many)}); z.competesWith = (z.competesWith || []).concat(${JSON.stringify(others.map(id => ({ id, why: 'a rival' })))}); })();`) }));
  ok('the view opens on the policy with the most links, rivals counted as links too',
     many !== start0 && rivalrous.d.querySelector('.pol-links-name').textContent === F.title[many] && rivalrous.errors.length === 0, `${rivalrous.d.querySelector('.pol-links-name').textContent} (wanted ${F.title[many]}, not ${F.title[start0]})`);

  const none = open(load('index.html', '#policy', { transform: afterMap('POLICY_DATA.forEach(p => { p.pairsWith = []; p.competesWith = []; });') }));
  const byTitle = F.order.slice().sort((x, y) => F.title[x].localeCompare(F.title[y]))[0];
  let said = 0;
  F.order.forEach(id => { pick(none, id); if (said1(none, '#polLinksPartners .pol-links-none') === 'No recorded partners.' && said1(none, '#polLinksRivals .pol-links-none') === 'No recorded competing policies.' && none.d.getElementById('polLinksWhy').textContent.trim() === 'No links are recorded for this policy.') said++; });
  const fresh = open(load('index.html', '#policy', { transform: afterMap('POLICY_DATA.forEach(p => { p.pairsWith = []; p.competesWith = []; });') }));
  ok('with no links recorded at all every policy says so in both columns and under them, the view opens on the first policy by title, and nothing logs an error',
     said === F.order.length && fresh.d.querySelector('.pol-links-name').textContent === F.title[byTitle] && none.errors.length === 0 && fresh.errors.length === 0, `${said} of ${F.order.length}; opens on ${fresh.d.querySelector('.pol-links-name').textContent} (wanted ${F.title[byTitle]})`);
}

/* ── Landscape: each policy in the Links view has an address, and the browser's Back and Forward walk the path ────────────────────────
   2026-11-24, the owner's "Yes, add it", as Compare has: the policy in the middle is the address (#links/<policy-id>), a link opens Links on it (40-router.js), and each move the reader makes (a neighbour, a name in the
   list, a step of the path, the menu, Randomize, Refresh) adds ONE step to the browser's history, which remembers the whole path in history.state, so Back and Forward bring the path back with the policy. A Copy link
   pill copies the address. The rest of the site still only rewrites the address: the switch under the masthead, the tabs and the policy dialog. The checks that wait for the browser (a Back finishes a moment after it is
   made) are in one async function, which the last async block at the end of the file runs in order after the others. docs/adr/0009-links-policy-addresses.md */
{
  const fs = require('fs'), path = require('path');
  const inl = f => f.replace(/<\/script/gi, '<\\/script');
  const shippedMap = inl(fs.readFileSync(path.join(__dirname, '..', 'data', 'policy-map.js'), 'utf8'));
  const afterMap = js => html => {
    if (!html.includes(shippedMap)) throw new Error('data/policy-map.js is not inlined as the test expects');
    return html.replace(shippedMap, () => shippedMap + '\n' + inl(js));
  };
  const sameList = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  linksAddressTests = async () => {
    const baseline = load('index.html', '#policy'); await settle(5);
    const F = linksFacts(baseline), start = linksStart(F), near = id => F.pair[id].concat(F.riv[id]);
    const hashFor = id => '#links/' + id, stepsOf = x => x.w.history.length;
    const midOf = x => (x.d.querySelector('.pol-links-name') || { textContent: '(no view)' }).textContent;
    const menuOf = x => (x.d.getElementById('polLinksPick') || { value: '(no menu)' }).value;
    const pathOf = x => [...x.d.querySelectorAll('#polLinksPath .kw-pill, #polLinksPath .pol-links-here')].map(e => e.textContent);
    const tileFor = (x, id) => [...x.d.querySelectorAll('.pol-links-tile')].find(t => t.dataset.go === id);
    const nameFor = (x, id) => [...x.d.querySelectorAll('.pol-links-go')].find(b => b.dataset.go === id);
    const press = (x, el) => el.dispatchEvent(new x.w.MouseEvent('click', { bubbles: true }));
    const pickIn = (x, id) => { const m = x.d.getElementById('polLinksPick'); m.value = id; m.dispatchEvent(new x.w.Event('change', { bubbles: true })); };
    const trailOf = x => { const s = x.w.history.state; return s && s.polLinks ? s.polLinks.trail : null; };
    const attrOf = (x, id, a) => { const e = x.d.getElementById(id); return e ? e.getAttribute(a) : '(no #' + id + ')'; };
    const areaHidden = x => { const e = x.d.getElementById('polLinksArea'); return !e || e.style.display === 'none'; };
    const snap = x => JSON.stringify({ mid: midOf(x), menu: menuOf(x), path: pathOf(x), hash: x.w.location.hash });
    const idAt = x => F.order[Math.floor(x * F.order.length)];
    // A check that cannot run (a mutation took the view away, say) fails by name instead of throwing in the section after it.
    const section = async (what, fn) => { try { await fn(); } catch (e) { ok(`${what}: the checks could not finish (${e.message})`, false, String(e.stack || e).split('\n').slice(0, 3).join(' | ')); } };
    // Three policies in a row, as the walking checks above find them: A, a neighbour B of it, and a neighbour C of B that is not A; and one more, for the menu.
    const A = [start].concat(F.order).find(a => near(a).some(b => near(b).some(c => c !== a))), B = near(A).find(b => near(b).some(c => c !== A)), C = near(B).find(c => c !== A);
    const other = F.order.find(id => id !== A && id !== B && id !== C);

    await section('an address opens Links on the policy it names', async () => {
      const X = F.order.find(id => id !== start);
      const lk = load('index.html', hashFor(X)); await settle(10);
      ok('an address for a policy opens the Landscape on Links with it in the middle (the Policy tab current, Links pressed, the menu and the path), adds no step to the history, and logs no error',
         lk.d.getElementById('viewPolicy').getAttribute('aria-selected') === 'true' && attrOf(lk, 'polSubviewLinks', 'aria-pressed') === 'true' && !areaHidden(lk) && midOf(lk) === F.title[X] && menuOf(lk) === X && sameList(pathOf(lk), [F.title[X]]) &&
         lk.w.location.hash === hashFor(X) && stepsOf(lk) === 1 && lk.errors.length === 0, `${lk.w.location.hash} ${midOf(lk)} ${pathOf(lk)} steps ${stepsOf(lk)} ${lk.errors[0] || ''}`);
      const bare0 = load('index.html', '#links'); await settle(10);
      ok('#links opens Links on the policy it opens with (the one with the most links), and the address is rewritten to name it, with no step added',
         midOf(bare0) === F.title[start] && bare0.w.location.hash === hashFor(start) && stepsOf(bare0) === 1 && bare0.errors.length === 0, `${bare0.w.location.hash} ${midOf(bare0)}`);
    });

    await section('an address that does not name a policy on the page', async () => {
      // (a policy whose text comes from a Google Doc is not the one to archive here: the page's data check reports synced text for a card that is gone, which is a different check)
      const synced = JSON.parse(baseline.w.eval('JSON.stringify(Object.keys(POLICY_TEXT))')), goneId = F.order.find(i => i !== start && !synced.includes(i));
      const inj = encodeURIComponent('<img src=x onerror=alert(1)>'), inj2 = encodeURIComponent('"]\'[x');
      const badLinks = [
        ['an id that is no policy', '#links/zz-no-such-policy'],
        ['an id in capitals', '#links/' + start.toUpperCase()],
        ['markup where the id goes', '#links/' + inj],
        ['quotes where the id goes', '#links/' + inj2],
        ['a policy the Sheet has archived', hashFor(goneId), afterMap(`POLICY_MAP.archived.push(${JSON.stringify(goneId)});`)],
      ];
      const badOut = [];
      for (const [what, h, transform] of badLinks) {
        const x = load('index.html', h, transform ? { transform } : undefined); await settle(10);
        const there = linksFacts(x), want = transform ? linksStart(there) : start;   // archiving a policy can change which one has the most links
        badOut.push([what, midOf(x) === there.title[want], x.w.location.hash === hashFor(want), stepsOf(x) === 1, x.errors.length === 0, !x.d.querySelector('img[src="x"]')]);
      }
      ok('an address that does not name a policy on the page (an id that is no policy, capitals, markup, quotes, a policy the Sheet has archived) opens Links on its first policy, the address is rewritten to say so, no step is added, nothing from the address reaches the page, and nothing logs an error',
         badOut.length === 5 && badOut.every(r => r.slice(1).every(Boolean)), badOut.filter(r => !r.slice(1).every(Boolean)).map(r => JSON.stringify(r)).join(' | '));
      const extra = load('index.html', hashFor(A) + '/extra/parts'); await settle(10);
      ok('parts after the id are dropped from the address', midOf(extra) === F.title[A] && extra.w.location.hash === hashFor(A) && extra.errors.length === 0, `${extra.w.location.hash}`);
    });

    await section('a move adds one step, however it is made', async () => {
      const st = load('index.html', hashFor(A)); await settle(10);
      const rows = [], st0 = stepsOf(st);
      const rnd = vals => { const q = vals.slice(); st.w.Math.random = () => q.length ? q.shift() : 0.5; };
      const doStep = (what, fn) => {
        const n = stepsOf(st); fn();
        const now = menuOf(st), tr = trailOf(st);
        rows.push([what, stepsOf(st) - n === 1, st.w.location.hash === hashFor(now), !!tr && tr[tr.length - 1] === now, !!tr && sameList(tr.slice(-5).map(id => F.title[id]), pathOf(st))]);
      };
      doStep('a neighbour', () => press(st, tileFor(st, B)));
      doStep('a name in the list', () => press(st, nameFor(st, C)));
      doStep('an earlier step of the path', () => press(st, st.d.querySelector('#polLinksPath [data-step="0"]')));
      doStep('the menu', () => pickIn(st, other));
      const aim = [0.2, 0.4, 0.6, 0.8].find(x => idAt(x) !== other && idAt(x) !== start);
      doStep('Randomize', () => { rnd([aim]); press(st, st.d.getElementById('polLinksRandom')); });
      doStep('Refresh', () => press(st, st.d.getElementById('polLinksRefresh')));
      const sameBefore = [stepsOf(st), st.w.location.hash];
      press(st, st.d.getElementById('polLinksRefresh'));
      ok('every move adds exactly one step to the history, at the policy\'s address, and the step remembers the path: a neighbour, a name in the list, an earlier step of the path, the menu, Randomize, and Refresh; Refresh on the policy the view opens on, with no path behind it, adds nothing',
         rows.length === 6 && rows.every(r => r.slice(1).every(Boolean)) && sameList([stepsOf(st), st.w.location.hash], sameBefore) && stepsOf(st) === st0 + 6 && st.errors.length === 0, JSON.stringify(rows.filter(r => !r.slice(1).every(Boolean))) + ` steps ${st0} -> ${stepsOf(st)}`);
      const keptSteps = stepsOf(st), keptPath = pathOf(st), keptMid = midOf(st);
      click(st.w, st.d, 'viewCards'); const awayHash = st.w.location.hash;
      click(st.w, st.d, 'viewPolicy');
      ok('leaving the tab and coming back keeps the policy, its path and its address, and adds no step: Papers is #papers, and the Policy tab is Links on the same policy again',
         awayHash === '#papers' && st.w.location.hash === hashFor(menuOf(st)) && midOf(st) === keptMid && sameList(pathOf(st), keptPath) && stepsOf(st) === keptSteps && st.errors.length === 0, `${awayHash} ${st.w.location.hash} steps ${keptSteps}/${stepsOf(st)}`);
    });

    await section('Back and Forward walk the path', async () => {
      const bf = load('index.html', hashFor(A)); await settle(10);
      const bf0 = stepsOf(bf), seen = [snap(bf)];
      press(bf, tileFor(bf, B)); seen.push(snap(bf));
      press(bf, nameFor(bf, C)); seen.push(snap(bf));
      pickIn(bf, other); seen.push(snap(bf));
      const bfSteps = stepsOf(bf), walked = [];
      for (let i = seen.length - 2; i >= 0; i--) { bf.w.history.back(); await settle(3); walked.push(['back', snap(bf) === seen[i], stepsOf(bf) === bfSteps]); }
      for (let i = 1; i < seen.length; i++) { bf.w.history.forward(); await settle(3); walked.push(['forward', snap(bf) === seen[i], stepsOf(bf) === bfSteps]); }
      ok('the browser\'s Back and Forward walk the path: each policy is drawn in full again with the path that led to it (the middle, the menu, the path and the address), and neither adds a step',
         seen.length === 4 && bfSteps === bf0 + 3 && walked.length === 6 && walked.every(r => r[1] && r[2]) && bf.errors.length === 0, JSON.stringify(walked) + ` ${bf0}/${bfSteps}`);
    });

    await section('the Back pill walks back through the policies', async () => {
      const bk = load('index.html', hashFor(A)); await settle(10);
      const backBtn = bk.d.getElementById('polLinksBack'), startsOff = backBtn.disabled;
      press(bk, tileFor(bk, B)); const onAfter = !backBtn.disabled, tip = backBtn.title, atB = midOf(bk);
      press(bk, nameFor(bk, C)); const atC = midOf(bk);
      pickIn(bk, other); const atOther = midOf(bk);
      const aimBack = [0.2, 0.4, 0.6, 0.8].find(x => idAt(x) !== other), qb = [aimBack]; bk.w.Math.random = () => qb.length ? qb.shift() : 0.5;
      press(bk, bk.d.getElementById('polLinksRandom')); const atRandom = midOf(bk);
      // The pill presses the browser's Back, which finishes a moment later: wait for it, as a reader's next glance would.
      const back = [];
      for (let i = 0; i < 4; i++) { backBtn.click(); await settle(3); back.push(midOf(bk)); }
      ok('Back is off until a move has been made, names the policy it goes back to, and then undoes each move in turn, whatever made it (a neighbour, a name in the list, the menu, Randomize), until it is at the first policy and off again',
         startsOff && onAfter && tip === 'Back to ' + F.title[A] && atRandom === F.title[idAt(aimBack)] && sameList(back, [atOther, atC, atB, F.title[A]]) && backBtn.disabled && bk.errors.length === 0, JSON.stringify([startsOff, onAfter, tip, atRandom, back]));
    });

    await section("the Back pill is the browser's Back, and an address typed in", async () => {
      const arr = load('index.html', '#about'); await settle(10);
      arr.w.location.hash = hashFor(B); await settle(5);
      const backBtn = () => arr.d.getElementById('polLinksBack');
      const arrOff = backBtn().disabled, arr1 = stepsOf(arr);
      press(arr, tileFor(arr, C));
      const arrOn = !backBtn().disabled, arrTip = backBtn().title, arr2 = stepsOf(arr);
      backBtn().click(); await settle(3);
      ok('a page opened on a policy by an address starts with Back off, even with history behind it (the step an address makes remembers no earlier policy); after a move it is on and names the policy; pressing it is the browser\'s Back: the policy and its address come back, no step is added, and it is off again',
         arr1 === 2 && arrOff && arrOn && arrTip === 'Back to ' + F.title[B] && arr2 === arr1 + 1 && midOf(arr) === F.title[B] && arr.w.location.hash === hashFor(B) && stepsOf(arr) === arr2 && backBtn().disabled && arr.errors.length === 0,
         `${arr1} ${arrOff} ${arrOn} ${arrTip} ${arr2}/${stepsOf(arr)} ${arr.w.location.hash}`);
      // leaving for another view and coming back: the pill follows the step the page is on now
      press(arr, tileFor(arr, C));
      const onBefore = !backBtn().disabled;
      click(arr.w, arr.d, 'polSubviewAll'); click(arr.w, arr.d, 'polSubviewLinks');
      ok('the Back pill still follows the step after the Landscape\'s switch has been used (the switch rewrites the address and keeps the step)', onBefore && !backBtn().disabled && backBtn().title === 'Back to ' + F.title[B] && arr.errors.length === 0, backBtn().title);
    });

    await section('the path a step remembers, and a step that cannot be trusted', async () => {
      const rs = load('index.html', hashFor(A)); await settle(10);
      const apply = async state => { rs.w.history.replaceState(state, '', hashFor(C)); rs.w.dispatchEvent(new rs.w.HashChangeEvent('hashchange')); await settle(3); return pathOf(rs); };
      const good = await apply({ polLinks: { trail: [A, B, C] } });
      const twelve = [A, B, A, B, A, B, A, B, A, B, A, C], thirteen = [B].concat(twelve);
      const longGood = await apply({ polLinks: { trail: twelve } });
      const bads = [];
      for (const state of [{ polLinks: { trail: [A, B] } }, { polLinks: { trail: [A, 'zz-no-such-policy', C] } }, { polLinks: { trail: thirteen } }, { polLinks: { trail: 'abc' } }, { polLinks: {} }, null, { polCmp: { prev: [A, B] } }]) bads.push(sameList(await apply(state), [F.title[C]]));
      ok('an address restores the path its step remembers (a reload, Back, Forward) when the path ends at that policy and every policy in it is on the page, keeping at most twelve steps; a step that remembers a path that ends elsewhere, names a policy that is not there, is too long, is not a list, or is another view\'s, starts a new path at the policy',
         sameList(good, [A, B, C].map(id => F.title[id])) && sameList(longGood, twelve.slice(-5).map(id => F.title[id])) && bads.length === 7 && bads.every(Boolean) && rs.errors.length === 0, JSON.stringify([good, longGood, bads]));
    });

    await section('a policy dialog opened from Links', async () => {
      const dlg = load('index.html', hashFor(A)); await settle(10);
      press(dlg, tileFor(dlg, B));
      const dlgSteps = stepsOf(dlg), dlgTrail = trailOf(dlg);
      press(dlg, dlg.d.querySelector('#polLinksCard [data-open]'));
      const whileOpen = [dlg.w.location.hash, stepsOf(dlg)];
      dlg.d.getElementById('polModalClose').click();
      const afterClose = [dlg.w.location.hash, stepsOf(dlg), sameList(trailOf(dlg), dlgTrail)];
      ok('a policy dialog opened from Links is #policy/<id> while it is open and gives the policy its address back when it closes; the step is rewritten, not added, and still remembers the path',
         whileOpen[0] === '#policy/' + B && whileOpen[1] === dlgSteps && afterClose[0] === hashFor(B) && afterClose[1] === dlgSteps && afterClose[2] && dlg.errors.length === 0, JSON.stringify([whileOpen, afterClose]));
    });

    await section('Copy link', async () => {
      const cp = load('index.html', hashFor(A)); await settle(10);
      const copied = [];
      cp.w.document.execCommand = () => { const t = cp.w.document.querySelector('textarea'); copied.push(t && t.value); return true; };
      const copyBtn = cp.d.getElementById('polLinksCopy');
      copyBtn.click();
      const flash = copyBtn.textContent;
      press(cp, tileFor(cp, B));
      copyBtn.click();
      ok('Copy link copies the address of the policy on screen, built from the page\'s own location, says it has ("Copied"), and follows the policy when it changes',
         sameList(copied, [`https://example.org/${hashFor(A)}`, `https://example.org/${hashFor(B)}`]) && flash === 'Copied ✓' && cp.errors.length === 0, JSON.stringify(copied));
    });

    await section('Refresh on the policy the view opens on, with a path behind it', async () => {
      const P = near(start).find(p => near(p).some(q => q !== start && q !== p && near(q).includes(start))), Q = P && near(P).find(q => q !== start && q !== P && near(q).includes(start));
      if (!P || !Q) throw new Error('this check needs three policies that link in a ring with the one the view opens on');
      const rf = load('index.html', hashFor(start)); await settle(10);
      press(rf, tileFor(rf, P)); press(rf, tileFor(rf, Q)); press(rf, tileFor(rf, start));
      const long = pathOf(rf).length, before = stepsOf(rf);
      press(rf, rf.d.getElementById('polLinksRefresh'));
      const afterRefresh = [pathOf(rf).length, stepsOf(rf), sameList(trailOf(rf), [start]), rf.w.location.hash];
      rf.w.history.back(); await settle(3);
      ok('Refresh, when the policy in the middle is already the one the view opens on but a path is behind it, shortens the path and rewrites the step instead of adding one (two steps with one address would make Back fire no hashchange and change nothing); Back then goes to the policy before',
         long === 4 && afterRefresh[0] === 1 && afterRefresh[1] === before && afterRefresh[2] && afterRefresh[3] === hashFor(start) && midOf(rf) === F.title[Q] && sameList(pathOf(rf), [start, P, Q].map(id => F.title[id])) && rf.errors.length === 0, JSON.stringify([long, afterRefresh, midOf(rf), pathOf(rf)]));
    });

    await section('no switch while the cards are hidden', async () => {
      const hideCards = html => { const m = 'let policyCardsHidden = false;'; if (!html.includes(m)) throw new Error('policyCardsHidden is no longer declared as the test expects'); return html.replace(m, 'let policyCardsHidden = true;'); };
      const hid = load('index.html', hashFor(A), { transform: hideCards }); await settle(10);
      ok('while the policy cards are hidden (policyCardsHidden) there is no Links view to put an address on: an address for a policy opens the tab on its notice, with no error, and the address is the tab\'s own',
         /temporarily unavailable/.test(hid.d.getElementById('policyArea').textContent) && hid.w.location.hash === '#policy' && bodyView(hid.d) === 'policy' && hid.errors.length === 0, `${hid.w.location.hash} ${hid.errors[0] || ''}`);
    });
  };
}

/* ── Landscape: Copy Draft and Print, on the Links row and on the Compare row ────────────────────────────────────────────────
   2026-11-24, the owner: 'Add "Add", "Copy Draft", and "Print" buttons', then "remove the add button" (src/js/32-policy-draft.js). What is left acts on what is on screen: on Links the policy in the middle, on Compare the two being compared, A
   then B. Copy Draft is the dialog's own "Copy as draft" for each (so these checks compare it with what the dialog itself copies, not with a copy of its code), a rule between two; Print fills a sheet that is shown only when printing, each
   policy from a page of its own, in the dialog's words. jsdom has no clipboard and no print dialog: the text is caught where the page falls back to a hidden textarea, and window.print is a stand-in that notes what the page looked like when it was called. */
{
  const fs = require('fs'), path = require('path');
  const sameList = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const all = (pg, s) => [...pg.d.querySelectorAll(s)];
  const press = (pg, el) => el.dispatchEvent(new pg.w.MouseEvent('click', { bubbles: true }));
  const policies = pg => JSON.parse(pg.w.eval('JSON.stringify(POLICY_DATA.map(p => ({ id: p.id, title: p.title, area: MERGED_POLICY_CATEGORIES[CATEGORY_MERGE_MAP[p.category]] || null })))'));
  const copies = pg => { const got = []; pg.w.document.execCommand = () => { const t = pg.w.document.querySelector('textarea'); got.push(t && t.value); return true; }; return got; };
  const prints = pg => { const seen = []; pg.w.print = () => seen.push({ cls: pg.d.body.className, titles: all(pg, '#polDraftSheet .pol-draft-title').map(h => h.textContent), docs: all(pg, '#polDraftSheet .pol-draft-doc').length }); return seen; };
  // What a card's dialog says (the labels over its text and lists, with what is under each) and what its own "Copy as draft" copies, read by opening it from the All view's tile and closing it again.
  const labelled = root => !root ? [] : all({ d: root }, '.pol-modal-label').map(l => [l.textContent.trim(), ((l.nextElementSibling && l.nextElementSibling.textContent) || '').replace(/\s+/g, ' ').trim()]).filter(([, t]) => t);
  const dialogOf = (pg, title, got) => {
    const tile = all(pg, '.pol-cat-card').find(c => c.querySelector('.pol-cat-card-title').textContent === title);
    if (!tile) return { draft: '(no tile for ' + title + ')', sections: [] };
    tile.dispatchEvent(new pg.w.MouseEvent('click', { bubbles: true }));
    const before = got.length;
    press(pg, pg.d.getElementById('polCopyDraft'));
    const out = { draft: got[before], sections: labelled(pg.d.getElementById('polModalBody')) };
    press(pg, pg.d.getElementById('polModalClose'));
    return out;
  };
  const sheetSections = (pg, k) => labelled(all(pg, '#polDraftSheet .pol-draft-doc')[k]);

  // ── Links: one policy ──
  const lk = load('index.html', '#policy');
  click(lk.w, lk.d, 'polSubviewLinks');
  const F = linksFacts(lk), middle = () => lk.d.querySelector('.pol-links-name').textContent;
  const lkCopied = copies(lk), lkPrinted = prints(lk), P = policies(lk);
  const titleOf = id => P.find(p => p.id === id).title;
  press(lk, lk.d.getElementById('polLinksCopyDraft'));
  const here = linksStart(F), viaDialog = dialogOf(lk, titleOf(here), lkCopied);
  ok('on Links, Copy Draft copies the policy in the middle exactly as the dialog\'s own "Copy as draft" does, and says it has ("Copied")',
     lkCopied.length === 2 && lkCopied[0] === viaDialog.draft && /^# /.test(lkCopied[0]) && lkCopied[0].includes('# ' + titleOf(here)) && lk.d.getElementById('polLinksCopyDraft').textContent === 'Copied ✓', `${lkCopied.length} copies, first line "${(lkCopied[0] || '').split('\n')[0]}"`);
  // a step along the links (a neighbour's tile): the path is now two steps long and the policy in the middle is the second, not the one the path began with
  const firstTile = lk.d.querySelector('.pol-links-tile'), stepTo = firstTile ? firstTile.dataset.go : null, nA = lkCopied.length;
  if (firstTile) press(lk, firstTile);
  press(lk, lk.d.getElementById('polLinksCopyDraft'));
  ok('after a step along the links Copy Draft copies the policy now in the middle, not the one the path began with',
     !!stepTo && stepTo !== here && lkCopied.length === nA + 1 && sameList((lkCopied[nA] || '').match(/^# .*/gm), ['# ' + titleOf(stepTo)]) && lk.d.querySelector('.pol-links-name').textContent === titleOf(stepTo), (lkCopied[nA] || '(no copy)').split('\n')[0]);
  const other = F.order.find(id => id !== here);
  const menu = lk.d.getElementById('polLinksPick'); menu.value = other; menu.dispatchEvent(new lk.w.Event('change', { bubbles: true }));
  const n0 = lkCopied.length;
  press(lk, lk.d.getElementById('polLinksCopyDraft'));
  ok('and it follows the policy in the middle: after a move it copies the new one, and only that one (no rule, no second document)',
     lkCopied.length === n0 + 1 && /^# /.test(lkCopied[n0]) && lkCopied[n0].startsWith('# ' + titleOf(other)) && !/\n---\n/.test(lkCopied[n0]) && (lkCopied[n0].match(/^# /gm) || []).length === 1, (lkCopied[n0] || '').split('\n')[0]);
  press(lk, lk.d.getElementById('polLinksPrint'));
  const dlg = dialogOf(lk, titleOf(other), lkCopied), sheet1 = sheetSections(lk, 0);
  ok('on Links, Print fills a sheet with the policy in the middle alone, and shows it for printing: the page is marked while the print dialog is open',
     lkPrinted.length === 1 && lkPrinted[0].docs === 1 && sameList(lkPrinted[0].titles, [titleOf(other)]) && /\bpol-draft-printing\b/.test(lkPrinted[0].cls), JSON.stringify(lkPrinted[0]));
  ok('the sheet says what the dialog says: the same sections in the same order, the same words under each (the dialog always shows What it is and The challenge; the sheet leaves one out only when the card has no words for it)',
     sheet1.length > 0 && sameList(sheet1, dlg.sections), `${sheet1.map(s => s[0])} against ${dlg.sections.map(s => s[0])}`);
  const docEl = all(lk, '#polDraftSheet .pol-draft-doc')[0], areaOf = P.find(p => p.id === other).area;
  ok('each policy on the sheet leads with its name and its area, and ends with where it is on the site (its address, built from the page\'s own location)',
     !!docEl && docEl.querySelector('h1').textContent === titleOf(other) && (docEl.querySelector('.pol-draft-area') ? docEl.querySelector('.pol-draft-area').textContent === areaOf : !areaOf) && docEl.querySelector('.pol-draft-foot').textContent.includes(`https://example.org/#policy/${other}`), '');
  lk.w.dispatchEvent(new lk.w.Event('afterprint'));
  ok('when the print dialog closes the page is put back: the mark is off and the sheet is empty (so a later print of the dialog is the dialog)',
     !/pol-draft-printing/.test(lk.d.body.className) && lk.d.getElementById('polDraftSheet').innerHTML === '', lk.d.body.className);
  ok('there is no Add button on Links, and no count of a draft, and Copy Draft and Print are always on', !lk.d.getElementById('polLinksAdd') && !lk.d.querySelector('.pol-draft-count') && !lk.d.getElementById('polLinksCopyDraft').disabled && !lk.d.getElementById('polLinksPrint').disabled, '');
  ok('the Links page logged no error', lk.errors.length === 0, lk.errors.join(' | '));

  // ── Compare: two policies ──
  const [a, b] = [F.order[0], F.order[1]], cm = load('index.html', `#compare/${a}/${b}`);
  const cmCopied = copies(cm), cmPrinted = prints(cm);
  const cmKids = [...cm.d.getElementById('polCmpSlot').children];
  ok('on Compare the two menus come first in the slot, as a unit, and the six pills after them (the owner, 2026-11-24: "the policy selections should be before" the buttons), as on Links',
     cmKids.length === 2 && cmKids[0].classList.contains('pol-subview-pick') && cmKids[1].classList.contains('pol-subview-pills') && sameList([...cmKids[1].children].map(b => b.id), ['polCmpBack', 'polCmpCopyDraft', 'polCmpCopy', 'polCmpPrint', 'polCmpRandom', 'polCmpRefresh']) &&
     sameList([...cmKids[0].querySelectorAll('select')].map(m => m.id), ['polCmpA', 'polCmpB']), cmKids.map(k => k.className).join(' | '));
  press(cm, cm.d.getElementById('polCmpCopyDraft'));
  const dA = dialogOf(cm, titleOf(a), cmCopied), dB = dialogOf(cm, titleOf(b), cmCopied);
  ok('on Compare, Copy Draft copies both policies, A then B, each exactly as the dialog\'s own "Copy as draft" does, a blank line, a rule and a blank line between them',
     cmCopied.length === 3 && cmCopied[0] === dA.draft + '\n---\n\n' + dB.draft && (cmCopied[0].match(/^# /gm) || []).length === 2, `${(cmCopied[0] || '').match(/^# .*/gm)}`);
  const swap = (id, v) => { const m = cm.d.getElementById(id); m.value = v; m.dispatchEvent(new cm.w.Event('change', { bubbles: true })); };
  swap('polCmpA', b); swap('polCmpB', a);
  press(cm, cm.d.getElementById('polCmpCopyDraft'));
  const swapped = cmCopied[cmCopied.length - 1] || '';
  ok('and it is in the order on screen: with the menus the other way round it copies B\'s policy first', swapped.startsWith('# ' + titleOf(b)) && swapped.indexOf('# ' + titleOf(a)) > swapped.indexOf('# ' + titleOf(b)) && swapped === dB.draft + '\n---\n\n' + dA.draft, (swapped.match(/^# .*/gm) || []).join(' | '));
  press(cm, cm.d.getElementById('polCmpPrint'));
  const s0 = sheetSections(cm, 0), s1 = sheetSections(cm, 1);
  ok('on Compare, Print fills the sheet with both policies, in the order on screen, and marks the page while the print dialog is open',
     cmPrinted.length === 1 && cmPrinted[0].docs === 2 && sameList(cmPrinted[0].titles, [titleOf(b), titleOf(a)]) && /\bpol-draft-printing\b/.test(cmPrinted[0].cls), JSON.stringify(cmPrinted[0]));
  ok('each of the two says what its dialog says (the same words under the same labels)', dB.sections.length > 0 && sameList(s0, dB.sections) && sameList(s1, dA.sections), `${s0.length} and ${s1.length} sections`);
  press(cm, cm.d.getElementById('polCmpPrint'));
  ok('pressing Print again does not stack a second copy on the sheet: it is filled anew each time', cmPrinted.length === 2 && all(cm, '#polDraftSheet .pol-draft-doc').length === 2, `${all(cm, '#polDraftSheet .pol-draft-doc').length} documents`);
  cm.w.dispatchEvent(new cm.w.Event('afterprint'));
  swap('polCmpA', a); swap('polCmpB', a);
  const sameN = cmCopied.length;
  press(cm, cm.d.getElementById('polCmpCopyDraft')); press(cm, cm.d.getElementById('polCmpPrint'));
  ok('with the same policy in both menus the policy is taken once, by Copy Draft and by Print', cmCopied.length === sameN + 1 && cmCopied[sameN] === dA.draft && cmPrinted.length === 3 && cmPrinted[2].docs === 1, `${cmPrinted[2] && cmPrinted[2].docs} document(s) on the sheet`);
  ok('there is no Add button on Compare either, and no count of a draft; the Compare page logged no error', !cm.d.getElementById('polCmpAdd') && !cm.d.querySelector('.pol-draft-count') && cm.errors.length === 0, cm.errors.join(' | '));

  // The Back pill follows the step the page is on, also after the other view has moved on: a Randomize on Compare makes a step with a pair before it; a move on Links is a step of its own, with no pair before it, so back on Compare
  // there is nothing to go back to and the pill says so (it stayed on, and did nothing, before the switch re-checked it).
  const sw = load('index.html', `#compare/${a}/${b}`), backPill = () => sw.d.getElementById('polCmpBack');
  press(sw, sw.d.getElementById('polCmpRandom'));
  const backAfterRandom = !backPill().disabled;
  click(sw.w, sw.d, 'polSubviewLinks');
  const lpick = sw.d.getElementById('polLinksPick'); lpick.value = F.order.find(id => id !== linksStart(F)); lpick.dispatchEvent(new sw.w.Event('change', { bubbles: true }));
  click(sw.w, sw.d, 'polSubviewCompare');
  ok('the Back pill on Compare follows the step the page is on: on after a Randomize, off again when the page is back on Compare after a move on Links', backAfterRandom && backPill().disabled && sw.errors.length === 0, `on after Randomize: ${backAfterRandom}; disabled after the move on Links: ${backPill().disabled}; ${sw.errors.join(' | ')}`);

  // ── the dialog's own Print is left alone, and the sheet's styles ──
  const css = ['policy.css', 'cards.css'].map(f => fs.readFileSync(path.join(__dirname, '..', 'src', 'styles', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')).join('\n');
  const printBlock = /@media print \{([^@]*?\.pol-draft-foot[^@]*?)\n  \}/.exec(css);
  ok('the sheet is never seen on a screen: it is hidden outside print, and for printing everything else on the page is hidden, but only while no dialog is open (the dialog\'s own print rules take over then)',
     /\.pol-draft-sheet \{ display: none; \}/.test(css) && !!printBlock && /body\.pol-draft-printing:not\(\.pol-modal-open\) > \*:not\(#polDraftSheet\) \{ display: none !important; \}/.test(printBlock[1]) &&
     /body\.pol-draft-printing:not\(\.pol-modal-open\) #polDraftSheet \{ display: block !important;/.test(printBlock[1]), printBlock ? '' : 'no print block for the sheet');
  ok('each policy after the first starts a page of its own, and a link says where it goes (a printed page cannot be clicked), as in the dialog\'s print',
     !!printBlock && /\.pol-draft-doc \+ \.pol-draft-doc \{ break-before: page; \}/.test(printBlock[1]) && /\.pol-draft-doc \.pol-modal-text a::after[^{]*\{ content: " \(" attr\(href\) "\)";/.test(printBlock[1]), '');
}

/* ── Landscape: the Compare view ───────────────────────────────────────────────────────────────────────────────────────────
   The second view, after Links (the owner, 2026-11-19: "a main view comparing policies with sample complementary policies and sample conflicting policies" and "a fun graphic of the two
   policies fighting each other"). Two policies sit side by side under a ring: a fight when the cards record them as rivals (competesWith), a tag team when they record them as
   partners (pairsWith), gloves held apart when they record nothing. Under each is the card in the dialog's own words and up to three samples of what works well with it and what
   competes with it, with the authors' reasons. What to expect is derived here from the cards themselves (a link written on either card is a link between the two), so these
   checks hold whatever the authors record.

   2026-11-23, the owner: "address this", the problems found in reading the view (two long cards that did not line up, and on a phone the second four screens down; a picture that moved for
   ever; a white VS on gold at 2.6:1; small grey text; playful words, "fight" suggesting a winner; a sample that moved the page and a tag team button with no count and no way back; a faint
   focus ring, small touch targets, sample buttons read out as paragraphs). The comparison is now rows, the words are plain, and each fix has a check below, after the original ones. */
{
  const fs = require('fs'), path = require('path');
  const inl = f => f.replace(/<\/script/gi, '<\\/script');
  const shippedMap = inl(fs.readFileSync(path.join(__dirname, '..', 'data', 'policy-map.js'), 'utf8'));
  const afterMap = js => html => {
    if (!html.includes(shippedMap)) throw new Error('data/policy-map.js is not inlined as the test expects');
    return html.replace(shippedMap, () => shippedMap + '\n' + inl(js));
  };
  const sameList = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const openCmp = opts => { const pg = load('index.html', '#policy', opts); click(pg.w, pg.d, 'polSubviewCompare'); return pg; };
  const pick = (pg, id, which) => { const s = pg.d.getElementById('polCmp' + which); s.value = id; s.dispatchEvent(new pg.w.Event('change', { bubbles: true })); };
  const menu = (pg, which) => pg.d.getElementById('polCmp' + which).value;
  const ring = pg => pg.d.getElementById('polCmpRing').className.replace('pol-cmp-ring ', '');
  const reason = pg => pg.d.getElementById('polCmpReason').textContent;
  // The comparison is rows: the first is each policy's name (a head cell), then one row for each section, its label across the top and a cell for each side.
  const head = (pg, side) => pg.d.querySelector(`#polCmpCols .pol-cmp-row-head .pol-cmp-cell[data-side="${side}"]`);
  const rowsOf = pg => [...pg.d.querySelectorAll('#polCmpCols .pol-cmp-row:not(.pol-cmp-row-head)')];
  const rowLabels = pg => rowsOf(pg).map(r => r.querySelector('.pol-cmp-rowlabel').textContent);
  const cellOf = (pg, side, label) => { const r = rowsOf(pg).find(x => x.querySelector('.pol-cmp-rowlabel').textContent === label); return r ? r.querySelector(`.pol-cmp-cell[data-side="${side}"]`) : null; };
  const cellsOf = (pg, side) => [...pg.d.querySelectorAll(`#polCmpCols .pol-cmp-cell[data-side="${side}"]`)];
  const textOf = c => c ? c.textContent : '(no cell)';   // a missing cell fails the check that asks for it, rather than crashing the checks after it
  const hidden = (pg, id) => pg.d.getElementById(id).style.display === 'none';
  const samplesOf = (pg, side, label) => {
    const sec = cellOf(pg, side, label);
    return sec ? { n: sec.querySelectorAll('.pol-cmp-sample').length, titles: [...sec.querySelectorAll('.pol-cmp-sample-title')].map(t => t.textContent), whys: [...sec.querySelectorAll('.pol-cmp-sample-why')].map(t => t.textContent),
                   more: (sec.querySelector('.pol-cmp-more') || {}).textContent || '', text: sec.textContent } : null;
  };

  const pg = openCmp();
  const facts = JSON.parse(pg.w.eval(`JSON.stringify((() => {
    const ids = POLICY_DATA.map(p => p.id), has = id => ids.includes(id);
    const one = kind => { const m = {}; POLICY_DATA.forEach(p => (p[kind] || []).forEach(l => { if (has(l.id) && l.id !== p.id) m[p.id + '>' + l.id] = l.why || ''; })); return m; };
    return { title: Object.fromEntries(POLICY_DATA.map(p => [p.id, p.title])), order: ids, pair: one('pairsWith'), riv: one('competesWith') };
  })())`));
  const keys = m => Object.keys(m).map(k => k.split('>'));
  const linkedIn = (m, a, b) => (a + '>' + b) in m || (b + '>' + a) in m;
  const whyIn = (m, a, b) => m[a + '>' + b] || m[b + '>' + a] || '';
  const whysIn = (m, a, b) => [m[a + '>' + b], m[b + '>' + a]].filter((w, i, all) => w && all.indexOf(w) === i);
  const partnersIn = (m, id) => {
    const own = [...new Set(keys(m).filter(([a]) => a === id).map(([, b]) => b))];
    return own.concat(facts.order.filter(q => (q + '>' + id) in m && !own.includes(q)));
  };
  const distinctPairs = m => { const seen = new Set(), out = []; keys(m).forEach(([a, b]) => { const k = [a, b].sort().join('|'); if (!seen.has(k)) { seen.add(k); out.push([a, b]); } }); return out; };
  const rivals = distinctPairs(facts.riv), teams = distinctPairs(facts.pair);
  const most = m => facts.order.slice().sort((x, y) => partnersIn(m, y).length - partnersIn(m, x).length)[0];

  ok('Compare is the second view: opening it hides the rows and the Links view, builds the view, and nothing logs an error',
     pg.d.getElementById('polSubviewCompare').getAttribute('aria-pressed') === 'true' && hidden(pg, 'polCatRows') && hidden(pg, 'polLinksArea') && !hidden(pg, 'polCompareArea') && pg.d.querySelectorAll('#polCmpCols .pol-cmp-row-head .pol-cmp-cell').length === 2 && pg.errors.length === 0, `${pg.d.querySelectorAll('#polCmpCols .pol-cmp-row-head .pol-cmp-cell').length} columns`);
  ok('it opens on the first fight the cards record, in the order of the cards, both menus showing it',
     rivals.length > 0 && menu(pg, 'A') === rivals[0][0] && menu(pg, 'B') === rivals[0][1] && ring(pg) === 'pol-cmp-fight' && sameList(['a', 'b'].map(s => head(pg, s).querySelector('.pol-cmp-name').textContent), [facts.title[rivals[0][0]], facts.title[rivals[0][1]]]),
     `${menu(pg, 'A')} / ${menu(pg, 'B')} / ${ring(pg)}`);
  ok('every policy is in both menus, under its area, and the menus hold nothing else', ['A', 'B'].every(w => pg.d.querySelectorAll(`#polCmp${w} option`).length === facts.order.length && pg.d.querySelectorAll(`#polCmp${w} optgroup`).length > 0), `${pg.d.querySelectorAll('#polCmpA option').length} of ${facts.order.length}`);

  ok('the rows of recorded pairs are gone (the owner, 2026-11-24): no pill for each competing pair, no Previous, Next or count of the pairs that work well together, and the row of the view is the Back, Copy Draft, Copy link, Print, Randomize and Refresh pills, in alphabetical order, and then the two menus',
     !pg.d.getElementById('polCmpFightRow') && !pg.d.getElementById('polCmpTeamRow') && !pg.d.getElementById('polCmpTeam') && !pg.d.getElementById('polCmpTeamPrev') && !pg.d.getElementById('polCmpTeamCount') && !pg.d.querySelector('.pol-cmp-starts, .pol-cmp-scroll') &&
     sameList([...pg.d.querySelectorAll('#polCmpSlot .kw-pill')].map(b => b.textContent), ['Back', 'Copy Draft', 'Copy link', 'Print', 'Randomize', 'Refresh']) && !/Competing pairs|Pairs that work well together|Previous|Next/.test(pg.d.getElementById('polCompareArea').textContent + pg.d.getElementById('polCmpSlot').textContent),
     [...pg.d.querySelectorAll('#polCmpSlot .kw-pill')].map(b => b.textContent).join());
  const fightsOk = rivals.every(([a, b]) => {
    pick(pg, a, 'A'); pick(pg, b, 'B');
    return menu(pg, 'A') === a && menu(pg, 'B') === b && ring(pg) === 'pol-cmp-fight' && /^Why they compete:/.test(reason(pg)) && whysIn(facts.riv, a, b).every(w => reason(pg).includes(w));
  });
  ok('choosing a competing pair in the menus sets both, draws it, and gives the authors\' own reason, as written', fightsOk && rivals.length > 0, reason(pg));
  const teamRuns = teams.map(t => { pick(pg, t[0], 'A'); pick(pg, t[1], 'B'); return menu(pg, 'A') === t[0] && menu(pg, 'B') === t[1] && ring(pg) === 'pol-cmp-team' && /^Why they work well together:/.test(reason(pg)) && whysIn(facts.pair, t[0], t[1]).every(w => reason(pg).includes(w)); });
  ok('and a pair the cards record as working well together is drawn as a team, each with the authors\' own reason, as written', teams.length > 0 && teamRuns.every(Boolean), `${teams.length} teams`);

  // Randomize (the owner, 2026-11-24): two different policies at random, as a change of the pair like any other. The check sets the random numbers, so it knows which policies they choose: the page picks the policy
  // at the place a number names in the order of the cards (a number from 0 up to but not including 1, times the count, rounded down).
  const realRandom = pg.w.Math.random, rand = values => { const q = values.slice(); pg.w.Math.random = () => q.length ? q.shift() : 0.5; };
  const at = x => facts.order[Math.floor(x * facts.order.length)];
  const ringWant = (a, b) => a === b ? 'pol-cmp-same' : linkedIn(facts.riv, a, b) ? 'pol-cmp-fight' : linkedIn(facts.pair, a, b) ? 'pol-cmp-team' : 'pol-cmp-idle';
  const randomBtn = pg.d.getElementById('polCmpRandom');
  pick(pg, at(0.9), 'A'); pick(pg, at(0.95), 'B');
  rand([0.2, 0.6]); randomBtn.click();
  ok('Randomize puts two policies at random in the two menus and draws the pair: the numbers 0.2 and 0.6 choose the policies at those places, and the ring and the reason are those of the pair',
     menu(pg, 'A') === at(0.2) && menu(pg, 'B') === at(0.6) && ring(pg) === ringWant(at(0.2), at(0.6)) && reason(pg).length > 0, `${menu(pg, 'A')} / ${menu(pg, 'B')} / ${ring(pg)}`);
  rand([0.3, 0.3, 0.7, 0.1]); randomBtn.click();
  ok('Randomize never picks the same policy for both sides: when the numbers would, it draws again', menu(pg, 'A') === at(0.7) && menu(pg, 'B') === at(0.1) && menu(pg, 'A') !== menu(pg, 'B'), `${menu(pg, 'A')} / ${menu(pg, 'B')}`);
  rand([0.7, 0.1, 0.4, 0.8]); randomBtn.click();
  ok('and never the pair that is already on screen: when the numbers would pick it, it draws again', menu(pg, 'A') === at(0.4) && menu(pg, 'B') === at(0.8), `${menu(pg, 'A')} / ${menu(pg, 'B')}`);
  pg.w.Math.random = realRandom;
  const drawn = [], seenIds = new Set();
  for (let i = 0; i < 300; i++) { const before = menu(pg, 'A') + '|' + menu(pg, 'B'); randomBtn.click(); const now = menu(pg, 'A') + '|' + menu(pg, 'B'); drawn.push([before, now]); seenIds.add(menu(pg, 'A')); seenIds.add(menu(pg, 'B')); }
  ok('over 300 draws with real random numbers every draw is two different policies and a pair other than the one before, many different pairs come up, and every policy is chosen at least once (no policy and no pair is left out)',
     drawn.every(([before, now]) => now !== before && now.split('|')[0] !== now.split('|')[1]) && new Set(drawn.map(d => d[1])).size > 100 && seenIds.size === facts.order.length && pg.errors.length === 0, `${new Set(drawn.map(d => d[1])).size} distinct pairs, ${seenIds.size} of ${facts.order.length} policies`);

  // Refresh (the owner, 2026-11-24): back to the pair the view opens on, as a change of the pair like any other.
  const refreshBtn = pg.d.getElementById('polCmpRefresh');
  pick(pg, at(0.9), 'A'); pick(pg, at(0.95), 'B');
  const stepsBefore = pg.w.history.length;
  refreshBtn.click();
  ok('Refresh takes the view back to the pair it opens on, the first competing pair the cards record: both menus, the ring and the reason, as one step of the history, at that pair\'s address',
     menu(pg, 'A') === rivals[0][0] && menu(pg, 'B') === rivals[0][1] && ring(pg) === 'pol-cmp-fight' && /^Why they compete:/.test(reason(pg)) && pg.w.history.length === stepsBefore + 1 && pg.w.location.hash === '#compare/' + rivals[0].join('/'), `${menu(pg, 'A')} / ${menu(pg, 'B')} / ${pg.w.history.length - stepsBefore} steps`);
  const stepsAt = pg.w.history.length;
  refreshBtn.click();
  ok('and Refresh does nothing when that pair is already showing: no step is added and the pair stays', pg.w.history.length === stepsAt && menu(pg, 'A') === rivals[0][0] && menu(pg, 'B') === rivals[0][1], `${pg.w.history.length - stepsAt} steps`);

  const idle = (() => { for (let i = 0; i < facts.order.length; i++) for (let j = i + 1; j < facts.order.length; j++) { const a = facts.order[i], b = facts.order[j]; if (!linkedIn(facts.riv, a, b) && !linkedIn(facts.pair, a, b)) return [a, b]; } return null; })();
  pick(pg, idle[0], 'A'); pick(pg, idle[1], 'B');
  ok('two policies the cards record nothing between are not staged as a fight or a team: the picture is a grey burst and the view says so',
     ring(pg) === 'pol-cmp-idle' && /No recorded link between these two/.test(reason(pg)) && pg.d.querySelectorAll('#polCmpRing .pol-cmp-burst').length === 1 && pg.d.querySelectorAll('#polCmpRing .pol-cmp-gl, #polCmpRing .pol-cmp-gr').length === 0, `${ring(pg)} | ${reason(pg)}`);
  pick(pg, idle[0], 'B');
  ok('the same policy twice asks for two different ones', ring(pg) === 'pol-cmp-same' && /Pick two different policies\./.test(reason(pg)), ring(pg));

  const topPair = most(facts.pair), topRiv = most(facts.riv);
  pick(pg, topPair, 'A'); pick(pg, topRiv === topPair ? facts.order.find(i => i !== topPair) : topRiv, 'B');
  const wantPartners = partnersIn(facts.pair, topPair), a1 = samplesOf(pg, 'a', 'Works well with');
  ok('under a policy, up to three of the policies that work well with it are shown, its own entries first, each with its author\'s reason, and the rest are counted',
     wantPartners.length > 0 && a1.n === Math.min(3, wantPartners.length) && sameList(a1.titles, wantPartners.slice(0, 3).map(i => facts.title[i])) &&
     sameList(a1.whys, wantPartners.slice(0, 3).map(i => whyIn(facts.pair, topPair, i)).filter(Boolean)) && a1.more === (wantPartners.length > 3 ? `and ${wantPartners.length - 3} more` : ''),
     `${JSON.stringify(a1)} vs ${wantPartners.map(i => facts.title[i])}`);
  const wantRivals = partnersIn(facts.riv, topRiv), b1 = samplesOf(pg, 'b', 'Competes with');
  ok('and the same for the policies that compete with it', wantRivals.length > 0 && b1.n === Math.min(3, wantRivals.length) && sameList(b1.titles, wantRivals.slice(0, 3).map(i => facts.title[i])) && b1.more === (wantRivals.length > 3 ? `and ${wantRivals.length - 3} more` : ''), JSON.stringify(b1));
  const loner = facts.order.find(i => !partnersIn(facts.pair, i).length);
  if (loner) { pick(pg, loner, 'A'); ok('a policy with no recorded partners says so, with no sample and no count', samplesOf(pg, 'a', 'Works well with').n === 0 && /No recorded partners\./.test(samplesOf(pg, 'a', 'Works well with').text)); }

  pick(pg, topPair, 'A'); pick(pg, facts.order.find(i => i !== topPair), 'B');
  const sampleA = pg.d.querySelector('.pol-cmp-sample[data-side="a"]');
  const idA = sampleA.dataset.id;
  sampleA.click();
  ok('clicking a sample under the left policy makes it the right one, and the left one stays', menu(pg, 'B') === idA && menu(pg, 'A') === topPair && head(pg, 'b').querySelector('.pol-cmp-name').textContent === facts.title[idA], `${menu(pg, 'A')} / ${menu(pg, 'B')}`);
  const sampleB = pg.d.querySelector('.pol-cmp-sample[data-side="b"]');
  const idB = sampleB.dataset.id;
  sampleB.click();
  ok('and a sample under the right policy makes it the left one', menu(pg, 'A') === idB && menu(pg, 'B') === idA, `${menu(pg, 'A')} / ${menu(pg, 'B')}`);

  const synced = JSON.parse(pg.w.eval('JSON.stringify(typeof POLICY_TEXT === "object" ? Object.keys(POLICY_TEXT) : [])'));
  const two = synced.length >= 2 ? synced.slice(0, 2) : facts.order.slice(0, 2);
  pick(pg, two[0], 'A'); pick(pg, two[1], 'B');
  const same = [0, 1].map(i => {
    const side = ['a', 'b'][i], mine = { summary: cellOf(pg, side, 'What it is').querySelector('.pol-modal-text').innerHTML, lists: cellsOf(pg, side).flatMap(c => [...c.querySelectorAll('.pol-modal-list')]).map(u => u.innerHTML) };
    return mine.summary.length > 0 && mine.lists.length > 0;
  });
  ok('each side carries its card: what it is and its lists are filled in, and there is no "Read the full policy" button under either policy (the owner took it off, 2026-11-25)', same.every(Boolean) && !pg.d.querySelector('#polCmpCols .pol-cmp-open') && !/Read the full policy/.test(pg.d.getElementById('polCompareArea').textContent), same.join());
  ok('the rows are the dialog\'s sections in kind and in the order: what it is, what works well with it, what competes with it, strengths, risks',
     sameList(rowLabels(pg), ['What it is', 'Works well with', 'Competes with', 'Strengths', 'Risks']), rowLabels(pg).join());

  const lone = idle;
  const oneSided = openCmp({ transform: afterMap(`(() => { const p = POLICY_DATA.find(x => x.id === ${JSON.stringify(lone[0])}); p.competesWith = (p.competesWith || []).concat([{ id: ${JSON.stringify(lone[1])}, why: 'A one-sided reason, for the test.' }]); })();`) });
  pick(oneSided, lone[0], 'A'); pick(oneSided, lone[1], 'B');
  const fromWriter = ring(oneSided) === 'pol-cmp-fight' && /A one-sided reason, for the test\./.test(reason(oneSided));
  pick(oneSided, lone[1], 'A'); pick(oneSided, lone[0], 'B');
  const back = samplesOf(oneSided, 'a', 'Competes with');
  ok('a link written on one card only counts for both: the fight shows from either side, and the policy that was named lists the one that named it, with that reason',
     fromWriter && ring(oneSided) === 'pol-cmp-fight' && back.titles.includes(facts.title[lone[0]]) && back.whys.includes('A one-sided reason, for the test.'), JSON.stringify(back));

  const gone = rivals[0][1];
  const arch = openCmp({ transform: afterMap(`POLICY_MAP.archived.push(${JSON.stringify(gone)});`) });
  const archAll = [...arch.d.querySelectorAll('#polCmpA option')].map(o => o.value);
  pick(arch, rivals[0][0], 'A');
  const archPicked = new Set();
  for (let i = 0; i < 120; i++) { arch.d.getElementById('polCmpRandom').click(); archPicked.add(menu(arch, 'A')); archPicked.add(menu(arch, 'B')); }
  ok('an archived policy is in no menu, no sample, and is never chosen by Randomize, and nothing logs an error',
     !archAll.includes(gone) && archAll.length === facts.order.length - 1 && !arch.d.getElementById('polCmpCols').textContent.includes(facts.title[gone]) && !archPicked.has(gone) && archPicked.size > 20 && arch.errors.length === 0, `${archAll.length} in the menu, ${archPicked.size} chosen, ${arch.errors.length} errors`);

  // A card whose text comes from its Google Doc has its summary replaced by the Doc's as the page loads, so the cross-link is written into one that is not.
  const [xs, ys] = facts.order.filter(i => !synced.includes(i));
  const linked = openCmp({ transform: afterMap(`(() => { const p = POLICY_DATA.find(x => x.id === ${JSON.stringify(xs)}); p.summary = (p.summary || '') + ' See {{pol:${ys}|the other policy}}.'; })();`) });
  pick(linked, xs, 'A');
  const xref = cellsOf(linked, 'a').map(c => c.querySelector('.pol-xref')).find(Boolean);
  if (xref) xref.click();
  ok('a cross-link written inside a card\'s text still opens the policy it names, from the Compare view as in the dialog', !!xref && xref.textContent === 'the other policy' && linked.d.getElementById('polModalTitle').textContent === facts.title[ys], xref ? linked.d.getElementById('polModalTitle').textContent : 'no cross-link');

  click(pg.w, pg.d, 'polSubviewAll');
  const kept = [menu(pg, 'A'), menu(pg, 'B'), ring(pg)];
  ok('leaving Compare shows the rows again and hides it, and coming back finds the same two policies', !hidden(pg, 'polCatRows') && hidden(pg, 'polCompareArea') && pg.d.getElementById('polSubviewAll').getAttribute('aria-pressed') === 'true', '');
  click(pg.w, pg.d, 'polSubviewCompare');
  ok('and it is still those two, in the same state', sameList([menu(pg, 'A'), menu(pg, 'B'), ring(pg)], kept) && pg.errors.length === 0, kept.join());

  const everyWhy = Object.values(facts.pair).concat(Object.values(facts.riv));
  const rich = everyWhy.filter(w => /[<>]|\{\{|&[a-z#0-9]+;/i.test(w));
  ok('every reason the cards give for a link is plain text, which is how the view shows it (no markup, no tokens, no entities)', rich.length === 0, rich.join(' | ').slice(0, 200));
  const both = rivals.filter(([a, b]) => linkedIn(facts.pair, a, b));
  ok('no two policies are recorded as both rivals and partners (the view stages one or the other)', both.length === 0, both.map(p => p.join('+')).join(', '));

  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles', 'policy.css'), 'utf8');
  const sect = css.slice(css.indexOf('Landscape: the Compare view'));
  const motion = /@media \(prefers-reduced-motion: no-preference\) \{([\s\S]*?)\n  \}/.exec(sect);
  const outside = motion ? sect.replace(motion[0], '') : sect;
  ok('the fight graphic moves only for a reader who has not asked their device for less motion: every animation in the Compare styles sits inside a no-preference media query',
     !!motion && /animation:/.test(motion[1]) && !/animation\s*:|animation-[a-z]+\s*:/.test(outside), motion ? 'an animation sits outside the media query' : 'no no-preference media query');

  /* ── "address this" (2026-11-23): one check for each problem the reading of the view found ────────────────────────────────────── */
  const cmpCss = sect.slice(0, sect.indexOf('.pol-subview-toggle')), bare = cmpCss.replace(/\/\*[\s\S]*?\*\//g, '');
  // 1. the two cards did not line up: rows
  pick(pg, rivals[0][0], 'A'); pick(pg, rivals[0][1], 'B');
  const rowEls = [...pg.d.querySelectorAll('#polCmpCols > .pol-cmp-row')];
  const sidesOf = r => [...r.children].filter(c => c.classList.contains('pol-cmp-cell')).map(c => c.dataset.side).join();
  ok('the comparison is rows, not two columns: the first row is the two names, then a row for each section with its label across the top and the two policies\' cells next to each other, A then B, so the same section of both sits at the same height',
     rowEls.length >= 4 && rowEls[0].classList.contains('pol-cmp-row-head') && rowEls.every(r => sidesOf(r) === 'a,b') && rowEls.slice(1).every(r => r.firstElementChild.classList.contains('pol-cmp-rowlabel')) && !pg.d.querySelector('.pol-cmp-col'), rowEls.map(sidesOf).join(' | '));
  ok('the row labels are headings a screen reader can jump between, and the markup order is the reading order: nothing in the Compare styles reorders it (no order property, no reversed direction), so a keyboard meets the cells as they are seen',
     rowsOf(pg).every(r => { const l = r.querySelector('.pol-cmp-rowlabel'); return l.getAttribute('role') === 'heading' && l.getAttribute('aria-level') === '4'; }) && !/(?<![-\w])order\s*:/.test(bare) && !/-reverse/.test(bare), '');
  ok('under its label each cell says whose it is, since a cell far down the page has no policy name in view',
     rowsOf(pg).every(r => ['a', 'b'].every(sd => (r.querySelector(`.pol-cmp-cell[data-side="${sd}"] .pol-cmp-who`) || { textContent: '(no name)' }).textContent === facts.title[rivals[0][sd === 'a' ? 0 : 1]])), '');
  const lop = openCmp({ transform: afterMap(`(() => { const a = POLICY_DATA.find(x => x.id === ${JSON.stringify(xs)}), b = POLICY_DATA.find(x => x.id === ${JSON.stringify(ys)}); a.risks = []; a.strengths = ['A strength, for the test.']; b.risks = ['A risk, for the test.']; b.strengths = []; })();`) });
  pick(lop, xs, 'A'); pick(lop, ys, 'B');
  ok('a section only one of the two policies has is still a row, and the other cell says so, so the rows keep lining up: Strengths for the one that lists them, Risks for the other',
     sameList(rowLabels(lop), ['What it is', 'Works well with', 'Competes with', 'Strengths', 'Risks']) && /A strength, for the test\./.test(textOf(cellOf(lop, 'a', 'Strengths'))) && /None listed on this card\./.test(textOf(cellOf(lop, 'b', 'Strengths'))) &&
     /None listed on this card\./.test(textOf(cellOf(lop, 'a', 'Risks'))) && /A risk, for the test\./.test(textOf(cellOf(lop, 'b', 'Risks'))), rowLabels(lop).join());
  lop.w.eval(`POLICY_DATA.find(x => x.id === ${JSON.stringify(ys)}).risks = []`);
  pick(lop, facts.order.find(i => i !== xs && i !== ys), 'B'); pick(lop, ys, 'B');
  ok('and a section neither has is left out, as the dialog leaves out a section a card has none of', !rowLabels(lop).includes('Risks') && rowLabels(lop).includes('Strengths') && lop.errors.length === 0, rowLabels(lop).join());

  // 2 and 3. the picture: it plays and rests, and says in words what it shows
  const nocomments = bare;
  const anim = [...nocomments.matchAll(/animation:\s*[\w-]+\s+([\d.]+)s\s+[\w-]+\s+(\d+)/g)].map(m => [+m[1], +m[2]]);
  const longest = Math.max(...anim.map(([dur, n]) => dur * n));
  ok('the picture plays and then rests: no animation loops for ever and none runs longer than five seconds (three pops of the burst, for a competing pair and for a pair that works well together), where it looped for as long as the page was open and could not be stopped',
     anim.length >= 2 && !/infinite/.test(nocomments) && longest > 0 && longest <= 5 && /\.pol-cmp-team \.pol-cmp-burst \{ animation: pol-cmp-pop 1s ease-in-out 3;/.test(nocomments) && !/pol-cmp-shake|pol-cmp-bump/.test(nocomments), JSON.stringify([anim, longest]));
  ok('and it ends where it rests: the pop starts and ends at full size, so the burst does not jump when it stops',
     /@keyframes pol-cmp-pop \{ 0%, 100% \{ transform: scale\(1\); \}/.test(nocomments), '');
  const caps = [], announces = [], caption = () => (pg.d.getElementById('polCmpRing').getAttribute('aria-label') || '').split(': ').pop(), announce = () => [...pg.d.querySelectorAll('.pol-cmp-announce')].map(e => e.textContent).join('/');
  const uiWords = () => [...pg.d.querySelectorAll('.pol-cmp-announce, .pol-cmp-lead, .pol-cmp-vs, .pol-cmp-rowlabel, .pol-cmp-who, #polCmpRandom, #polCmpBack, #polCmpCopy, .pol-cmp-none, .pol-cmp-note')].map(e => e.textContent).join(' | ');
  pick(pg, rivals[0][0], 'A'); pick(pg, rivals[0][1], 'B'); caps.push(caption()); announces.push(announce());
  const fightWords = uiWords(), fightReason = reason(pg), fightLabel = pg.d.getElementById('polCmpRing').getAttribute('aria-label');
  pick(pg, teams[0][0], 'A'); pick(pg, teams[0][1], 'B'); caps.push(caption()); announces.push(announce());
  const teamWords = uiWords(), teamReason = reason(pg);
  pick(pg, idle[0], 'A'); pick(pg, idle[1], 'B'); caps.push(caption()); announces.push(announce());
  pick(pg, idle[0], 'B'); caps.push(caption()); announces.push(announce());
  ok('nothing is printed under the mark (the owner, 2026-11-25), but the ring still says in words what it shows, in its accessible name: they compete, they work well together, no recorded link, the same policy (the burst\'s VS, + and ? mean nothing alone)', !pg.d.querySelector('.pol-cmp-vs') && sameList(caps, ['they compete', 'they work well together', 'no recorded link', 'the same policy']), caps.join(' | '));
  ok('the words are plain: Policy A and Policy B over the two names in every state, and no fight, tag team, corner or teammate in the labels, the caption or the buttons (the authors\' own reasons are theirs)',
     announces.every(a => a === 'Policy A/Policy B') && !/fight|tag team|corner|teammate/i.test(fightWords + teamWords), fightWords + ' || ' + teamWords);
  ok('a competing pair says that competing is not ranking, in the view\'s own words, and a pair that works well together does not need to; the ring is a group with a name that says both policies and how they are linked',
     /This view does not rank them\./.test(fightReason) && !/rank/.test(teamReason) && fightLabel === `${facts.title[rivals[0][0]]} and ${facts.title[rivals[0][1]]}: they compete` && pg.d.getElementById('polCmpRing').getAttribute('role') === 'group', fightLabel);

  // the picture for each state (the owner, 2026-11-24: "in compare when policies work well together the graphic should be shaking hands"): gloves and a burst for a competing pair, held apart for no
  // recorded link and for the same policy twice, and for a pair that works well together two hands shaking, in the same pink (A) and gold (B), with no gloves and no burst
  const picture = () => {
    const q = sel => [...pg.d.querySelectorAll('#polCmpRing ' + sel)], svg = pg.d.querySelector('#polCmpRing svg'), shake = pg.d.querySelector('#polCmpRing .pol-cmp-shake');
    return {
      gloves: q('.pol-cmp-gl, .pol-cmp-gr').length, burst: q('.pol-cmp-burst').length, burstText: (q('.pol-cmp-burst-text')[0] || { textContent: '' }).textContent,
      shake: q('.pol-cmp-shake').length, cuffsInShake: shake ? shake.querySelectorAll('.pol-cmp-cuff').length : 0, palmA: q('.pol-cmp-palm.pol-cmp-glove-a').length, palmB: q('.pol-cmp-palm.pol-cmp-glove-b').length,
      fingers: q('.pol-cmp-finger.pol-cmp-glove-b').length, thumb: q('.pol-cmp-thumb.pol-cmp-glove-a').length, marks: q('.pol-cmp-marks').length, marksOutside: q('.pol-cmp-marks').every(m => !m.closest('.pol-cmp-shake')),
      hidden: !!svg && svg.getAttribute('aria-hidden') === 'true' && svg.getAttribute('viewBox') === '0 0 200 110',
    };
  };
  const pics = {};
  pick(pg, rivals[0][0], 'A'); pick(pg, rivals[0][1], 'B'); pics.fight = picture();
  pick(pg, teams[0][0], 'A'); pick(pg, teams[0][1], 'B'); pics.team = picture();
  pick(pg, idle[0], 'A'); pick(pg, idle[1], 'B'); pics.idle = picture();
  pick(pg, idle[0], 'B'); pics.same = picture();
  ok('a pair that works well together is drawn as a + burst, and a competing pair as a VS burst, with no gloves (the owner, 2026-11-25: VS for policies that compete, + for policies that work well together), the picture hidden from a screen reader and the size it always was',
     pics.team.gloves === 0 && pics.team.burst === 1 && pics.team.burstText === '+' && pics.fight.gloves === 0 && pics.fight.burst === 1 && pics.fight.burstText === 'VS' && pics.team.hidden && pics.fight.hidden, JSON.stringify([pics.team, pics.fight]));
  ok('no state draws gloves or hands any more (the owner, 2026-11-25: marks only): and a pair with no recorded link gets a grey ? (the owner, 2026-11-25), as does the same policy twice',
     ['fight', 'team', 'idle', 'same'].every(k => pics[k].shake === 0 && pics[k].fingers === 0 && pics[k].thumb === 0 && pics[k].marks === 0) && pics.idle.burstText === '?' && pics.same.burstText === '?', JSON.stringify(['fight', 'team', 'idle', 'same'].map(k => [k, pics[k].gloves, pics[k].burst, pics[k].burstText])));
  pick(pg, teams[0][0], 'A'); pick(pg, teams[0][1], 'B');
  ok('the blurb on why the pair competes or works well together is inside the ring, under Policy A and Policy B and after them in the markup, and is still the only element with that id', !!pg.d.querySelector('#polCmpRing #polCmpReason') && pg.d.querySelectorAll('#polCmpReason').length === 1 && pg.d.querySelector('#polCmpRing').lastElementChild.id === 'polCmpReason' && /^Why they work well together:/.test(pg.d.getElementById('polCmpReason').textContent), pg.d.getElementById('polCmpReason') && pg.d.getElementById('polCmpReason').textContent.slice(0, 60));

  // (the Back pill's check waits for the browser's Back, so it is with the address checks below, in compareAddressTests)
  // a sample that sits beside the ring need not move the page: it is scrolled to the ring only when the ring is out of view
  pick(pg, topPair, 'A'); pick(pg, topRiv === topPair ? facts.order.find(i => i !== topPair) : topRiv, 'B');
  const ringEl = pg.d.getElementById('polCmpRing'), barEl = pg.d.querySelector('.pol-subview-bar'), pairNow2 = () => [menu(pg, 'A'), menu(pg, 'B')]; let scrolls = 0;
  ringEl.scrollIntoView = () => { scrolls++; };
  barEl.getBoundingClientRect = () => ({ top: 0, bottom: 100 });
  // a sample that changes the pair (one that is not already the other side)
  const changing = () => [...pg.d.querySelectorAll('.pol-cmp-sample')].find(b => b.dataset.id !== (b.dataset.side === 'a' ? menu(pg, 'B') : menu(pg, 'A')));
  ringEl.getBoundingClientRect = () => ({ top: 200, bottom: 400 });
  changing().click();
  const inView = [scrolls, pg.d.activeElement === ringEl];
  ringEl.getBoundingClientRect = () => ({ top: -900, bottom: -700 });
  changing().click();
  ok('pressing a sample puts the focus on the ring (the cells were drawn again) and scrolls to it only when the ring is out of view: not when it is already showing under the menus, and yes when it is above the window',
     inView[0] === 0 && inView[1] === true && scrolls === 1 && pg.d.activeElement === ringEl, JSON.stringify([inView, scrolls]));
  // the ring partly behind the pinned row (the switch and the menus, whose bottom the page measures: here 100): it is not out of the window, but it is out of sight
  const scrollsUnder = scrolls;
  ringEl.getBoundingClientRect = () => ({ top: 50, bottom: 250 });
  changing().click();
  ok('and it scrolls when the ring is hidden behind the pinned row of the switch and the menus (its top is above that row\'s bottom), which is measured from the row and not from the view', scrolls === scrollsUnder + 1, `${scrolls - scrollsUnder} scrolls`);

  // a sample that is already the other side changes nothing, so it moves nothing: the focus stays on the button and the page is not scrolled
  const already = teams.find(([ta, tb]) => { pick(pg, ta, 'A'); pick(pg, tb, 'B'); return !!pg.d.querySelector(`.pol-cmp-sample[data-side="a"][data-id="${tb}"]`); });
  const sameBtn = already ? pg.d.querySelector(`.pol-cmp-sample[data-side="a"][data-id="${already[1]}"]`) : null, scrollsBefore = scrolls;
  ringEl.getBoundingClientRect = () => ({ top: -900, bottom: -700 });
  if (sameBtn) { sameBtn.focus(); sameBtn.click(); }
  ok('pressing a sample that is already the other side changes nothing and moves nothing: the pair is the same, the button is still there with the focus on it, and the page is not scrolled to the ring (even with the ring out of view)',
     !!sameBtn && sameBtn.isConnected && pg.d.activeElement === sameBtn && scrolls === scrollsBefore && sameList(pairNow2(), already), already ? already.join('+') : 'no pair shows its partner as a sample');

  // 8. a sample button is named for what it does and described by the author's reason, not read out whole as its name
  pick(pg, topPair, 'A'); pick(pg, topRiv === topPair ? facts.order.find(i => i !== topPair) : topRiv, 'B');
  const smp = [...pg.d.querySelectorAll('.pol-cmp-sample')], smpIds = smp.map(b => b.getAttribute('aria-describedby')).filter(Boolean);
  ok('a sample is named for what pressing it does, "Compare A with B", and the author\'s reason is its description rather than part of its name (read out as a name it was a whole paragraph); each reason has an id of its own',
     smp.length > 0 && smpIds.length > 0 && new Set(smpIds).size === smpIds.length && smp.every(b => {
       const mine = facts.title[b.dataset.side === 'a' ? menu(pg, 'A') : menu(pg, 'B')], theirs = facts.title[b.dataset.id], why = b.querySelector('.pol-cmp-sample-why');
       return b.getAttribute('aria-label') === (b.dataset.side === 'a' ? `Compare ${mine} with ${theirs}` : `Compare ${theirs} with ${mine}`) && (why ? b.getAttribute('aria-describedby') === why.id && pg.d.getElementById(why.id) === why : !b.hasAttribute('aria-describedby'));
     }), smp.map(b => b.getAttribute('aria-label')).join(' | '));

  // 4, 5 and 8 in the styles: contrast, size, the focus ring, touch targets, the phone's layout
  const lum = hex => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const tokens = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles', 'tokens.css'), 'utf8');
  const tok = name => { const all = [...tokens.matchAll(new RegExp('--' + name + ':\\s*(#[0-9a-fA-F]{6})', 'g'))]; return all.length ? all[all.length - 1][1] : null; };   // the last declaration wins, as in the page
  const vs = ratio(tok('headline'), tok('gold-deep')), qm = ratio('#ffffff', tok('muted'));
  ok('the VS on the gold burst is readable: dark (the headline colour) on the gold, not white (2.6:1), at 4.5:1 or better, and the white on the grey burst is too (a pair that works well together has no burst, so no white on navy any more)',
     /\.pol-cmp-fight \.pol-cmp-burst-text \{ fill: var\(--headline\); \}/.test(bare) && /\.pol-cmp-burst-text \{[^}]*fill: #fff/.test(bare) && /\.pol-cmp-team \.pol-cmp-burst-shape \{ fill: var\(--navy\); \}/.test(bare) && vs >= 4.5 && qm >= 4.5, `${vs.toFixed(2)} / ${qm.toFixed(2)}`);
  const onBeige = ratio(tok('text'), tok('beige')), mutedOnBeige = ratio(tok('muted'), tok('beige')), mutedOnCard = ratio(tok('muted'), tok('light-beige'));
  ok('the small text on the beige name boxes is the body colour (8.7:1), not the grey (4.3:1 there), and the grey that is left is on the card, where it is 4.5:1 or better',
     /\.pol-cmp-announce \{[^}]*color: var\(--text\)/.test(bare) && /\.pol-cmp-areaname \{[^}]*color: var\(--text\)/.test(bare) && onBeige >= 4.5 && mutedOnBeige < 4.5 && mutedOnCard >= 4.5, `${onBeige.toFixed(2)} / ${mutedOnBeige.toFixed(2)} / ${mutedOnCard.toFixed(2)}`);
  const sizes = [...bare.matchAll(/font-size:\s*([\d.]+)px/g)].map(m => +m[1]);
  ok('nothing in the Compare styles is under 12px (it had 11px labels, and 7% of the text was 11 or 12px), and the smallest text is the site\'s 13px notes size or the 12px labels', sizes.length > 10 && Math.min(...sizes) >= 12, 'smallest ' + Math.min(...sizes) + 'px');
  ok('the keyboard focus ring is the site\'s navy, 2px, on the ring and on a sample (the green one was 2.6:1), and nothing in the Compare styles draws a green outline',
     /\.pol-cmp-ring:focus-visible \{ outline: 2px solid var\(--navy\)/.test(bare) && /\.pol-cmp-sample:focus-visible \{ outline: 2px solid var\(--navy\)/.test(bare) && !/outline[^;}]*var\(--green\)/.test(bare) && ratio(tok('navy'), tok('light-beige')) >= 3, '');
  const policyBare = css.replace(/\/\*[\s\S]*?\*\//g, '');
  ok('the menus and the pills are a unit each, the menus first: the slot goes under the switch when it has less than the 460px the six pills take; the menus are a unit that grows from 320px, the same on both views, so that on one line the pills keep their size and end the row at the same place on Links and on Compare, and a menu is at most 520px wide; the pills are one unit that wraps (to a line of their own under the menus) only when they do not fit beside them, and wrap among themselves only on a phone; no view has a basis of its own',
     /\.pol-subview-slot\.controls \{[^}]*flex: 1 1 460px; min-width: 0;/.test(policyBare) && /\.pol-subview-slot \.pol-subview-pills \{[^}]*flex: 0 1 auto; min-width: 0; min-height: 32px;/.test(policyBare) && /\.pol-subview-pick \{[^}]*flex: 1 1 320px; min-width: 0;/.test(policyBare) &&
     /\.pol-subview-pick \.ctl-pair \{ flex: 1 1 150px; min-width: 0; max-width: 520px; \}/.test(policyBare) && !/#polLinksSlot \.pol-subview-pick|#polCmpSlot \.pol-subview-pick|#polLinksSlot \.ctl-pair|#polCmpSlot \.ctl-pair/.test(policyBare) &&
     /\.pol-subview-pick \.ctl-pair select \{[^}]*width: 100%/.test(policyBare) && /\.pol-subview-slot \.kw-pill \{ flex: none; \}/.test(policyBare) && !/pol-cmp-bar|pol-cmp-pills|pol-draft-count/.test(policyBare), '');
  const phone = /@media \(max-width: 700px\) \{([\s\S]*?)\n  \}/.exec(bare), narrow = /@media \(max-width: 780px\) \{([\s\S]*?)\n  \}/.exec(bare);
  ok('the row with the switch and the menus sticks under the top of the window only while Compare is showing and the window is wide enough (above 780px, where the row is the switch and the menus with the pills under them, two lines, 91px, or one line from about 1125px, and not three): it takes the bar\'s background and rule so that what scrolls under it is covered, keeps the switch where it was, and the ring\'s scroll margin clears its measured height',
     /\.pol-subview-bar\.is-pinned \{ position: sticky; top: 0; z-index: 100; margin-top: 10px; padding: 10px 0; background: var\(--beige\); border-bottom: 1px solid var\(--divider\); \}/.test(policyBare) &&
     !!narrow && /\.pol-subview-bar\.is-pinned \{ position: static; \}/.test(narrow[1]) && /\.pol-cmp-ring \{ scroll-margin-top: 12px; \}/.test(narrow[1]) && /\.pol-cmp-ring \{[^}]*scroll-margin-top: calc\(var\(--pol-bar-h, 76px\) \+ 10px\)/.test(bare), narrow ? '' : 'no 780px block');
  ok('on a phone the two cells of a row stack, the ring is only the picture and its words (the names are in the cells below), the row with the switch and the menus scrolls away instead of covering a third of the window, each menu has a line of its own, and the buttons, pills and menus are 44px tall; above that width a row is two columns',
     !!phone && /\.pol-cmp-row \{ grid-template-columns: 1fr; \}/.test(phone[1]) && /\.pol-cmp-corner \{ display: none; \}/.test(phone[1]) && /\.pol-cmp-clash \{ width: 150px; height: 83px; \}/.test(phone[1]) && /\.pol-subview-bar\.is-pinned \{ margin-top: 16px; padding: 0 0 10px; \}/.test(phone[1]) &&
     /\.pol-cmp \.pol-action-btn \{ min-height: 44px; \}/.test(phone[1]) && /\.pol-subview-slot select, \.pol-subview-slot \.kw-pill, [^{]*\{ min-height: 44px; \}/.test(policyBare) && /\.pol-subview-pick \.ctl-pair \{ flex-basis: 100%; max-width: none; \}/.test(phone[1]) &&
     /\.pol-cmp-row \{ display: grid; grid-template-columns: 1fr 1fr;/.test(bare), phone ? '' : 'no phone block');
  ok('the rows of recorded pairs left no styles behind: nothing in the Compare styles is for the competing-pair pills, the strip they sat in, the count of pairs or a row to swipe along', !/pol-cmp-scroll|pol-cmp-starts|pol-cmp-count/.test(bare), '');

  /* ── "Yes, try it" (2026-11-24): on a phone a long "What it is" is folded to its first lines, with a button that opens it ───────────────────── */
  const foldedPg = openCmp({ transform: afterMap(`(() => { const a = POLICY_DATA.find(x => x.id === ${JSON.stringify(xs)}), b = POLICY_DATA.find(x => x.id === ${JSON.stringify(ys)}); a.summary = 'A long summary. ' + 'Words go on and on and on. '.repeat(40) + 'See {{pol:${ys}|the other policy}}.'; b.summary = 'A short summary.'; })();`) });
  pick(foldedPg, xs, 'A'); pick(foldedPg, ys, 'B');
  const noBtn = { getAttribute: () => '(no button)', textContent: '(no button)', click: () => {}, dispatchEvent: () => {} };   // a missing button fails the checks that look at it, rather than crashing the ones after
  const foldOf = side => cellOf(foldedPg, side, 'What it is').querySelector('.pol-cmp-fold'), rawBtn = side => foldOf(side).querySelector('.pol-cmp-fold-btn'), btnOf = side => rawBtn(side) || noBtn, foldText = side => foldOf(side).querySelector('.pol-modal-text');
  ok('a summary of more than 600 characters has a fold with a Show more button (closed, named for the policy, pointing at the text); a short one has neither, and the two cells of the row fold on their own',
     foldOf('a').classList.contains('is-long') && !foldOf('a').classList.contains('is-open') && !!rawBtn('a') && btnOf('a').getAttribute('aria-expanded') === 'false' && btnOf('a').textContent === 'Show more' &&
     btnOf('a').getAttribute('aria-label') === `Show more about ${facts.title[xs]}` && !!foldText('a').id && btnOf('a').getAttribute('aria-controls') === foldText('a').id && !foldOf('b').classList.contains('is-long') && !rawBtn('b'), foldOf('a').className + ' / ' + foldOf('b').className);
  const fullText = foldText('a').textContent;
  ok('folding never touches the words: the whole summary is in the page from the first word to the last, folded or open (it is only clipped by the styles), and a short one is as it was',
     fullText.startsWith('A long summary.') && fullText.endsWith('the other policy.') && (fullText.match(/Words go on and on and on\./g) || []).length === 40 && foldText('b').textContent === 'A short summary.', String(fullText.length));
  const edges = facts.order.map(id => { pick(pg, id, 'A'); const f = cellOf(pg, 'a', 'What it is').querySelector('.pol-cmp-fold'); return [id, f.querySelector('.pol-modal-text').textContent.length, f.classList.contains('is-long'), !!f.querySelector('.pol-cmp-fold-btn')]; });
  ok('every card folds by the same rule, whether its words are in the data or synced from its Doc: more than 600 characters of text, and then it has the button (one that is not long has none)',
     edges.length === facts.order.length && edges.every(([, n, long, btn]) => long === (n > 600) && btn === long), edges.filter(([, n, long]) => long !== (n > 600)).map(e => e.join(':')).join());
  btnOf('a').click();
  const open1 = [foldOf('a').classList.contains('is-open'), btnOf('a').getAttribute('aria-expanded'), btnOf('a').textContent, btnOf('a').getAttribute('aria-label')];
  btnOf('a').click();
  const open2 = [foldOf('a').classList.contains('is-open'), btnOf('a').getAttribute('aria-expanded'), btnOf('a').textContent, btnOf('a').getAttribute('aria-label')];
  ok('pressing Show more opens the summary (aria-expanded true, "Show less about ...") and pressing it again folds it',
     sameList(open1, [true, 'true', 'Show less', `Show less about ${facts.title[xs]}`]) && sameList(open2, [false, 'false', 'Show more', `Show more about ${facts.title[xs]}`]), JSON.stringify([open1, open2]));
  const xr = foldText('a').querySelector('.pol-xref');
  if (xr) xr.dispatchEvent(new foldedPg.w.FocusEvent('focusin', { bubbles: true }));
  const byFocus = foldOf('a').classList.contains('is-open') && btnOf('a').getAttribute('aria-expanded') === 'true';
  btnOf('a').click();
  btnOf('a').dispatchEvent(new foldedPg.w.FocusEvent('focusin', { bubbles: true }));
  ok('keyboard focus that lands in a folded summary (on a link in the part that is out of sight) opens it, so the focus is never on something that cannot be seen; focus on the Show more button itself does not',
     !!xr && byFocus && !foldOf('a').classList.contains('is-open'), '');
  btnOf('a').click();
  pick(foldedPg, facts.order.find(i => i !== xs && i !== ys), 'B'); pick(foldedPg, ys, 'B');
  ok('a pair drawn again starts folded again', foldOf('a').classList.contains('is-long') && !foldOf('a').classList.contains('is-open') && btnOf('a').textContent === 'Show more' && foldedPg.errors.length === 0, foldOf('a').className);
  const modalsCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles', 'modals.css'), 'utf8'), dialogLine = +(/\.pol-modal-text \{[^}]*line-height: ([\d.]+)/.exec(modalsCss) || [0, 0])[1];
  const outsidePhone = bare.replace(phone ? phone[0] : '', '');
  ok('the fold is for a phone only: the clip (seven lines of the dialog\'s text, faded out) and the button are inside the phone rules; outside them nothing is clipped and the button is not shown',
     !!phone && dialogLine > 0 && Math.abs(7 * dialogLine - 11.9) < 0.01 && /\.pol-cmp-fold\.is-long:not\(\.is-open\) \.pol-modal-text \{ max-height: 11\.9em; overflow: hidden;[^}]*mask-image: linear-gradient/.test(phone[1]) && /\.pol-cmp-fold\.is-long \.pol-cmp-fold-btn \{ display: inline-block; \}/.test(phone[1]) &&
     /\.pol-cmp-fold-btn \{ display: none;/.test(outsidePhone) && !/max-height/.test(outsidePhone) && !/\.pol-cmp-fold[^{]*\.pol-modal-text \{/.test(outsidePhone), `line-height ${dialogLine}`);

  /* The Compare checks that have to wait for the browser (a Back, or an address typed in, finishes a moment after it is made) are in one async function, which the last async block at the end of the file
     runs in order after the other groups, as it does legislationTests and the rest: an async block of its own here would race the exit. */
  compareAddressTests = async () => {
    /* ── "Yes, go ahead" (2026-11-24): each comparison has an address, and the browser's Back and Forward walk through the pairs ─────────────────────
       The pair on screen is in the address (#compare/<a>/<b>); a link opens Compare on it (40-router.js); each change of the pair (polCmpGo) adds ONE step to the browser's history, which remembers the pair before it,
       and the Back pill is the browser's Back limited to that (it finishes a moment later, so these wait for it); a Copy link pill copies the address. The rest of the site still only rewrites the address, adding no
       step: the switch under the masthead, the tabs and the policy dialog are checked here too, because they now write the pair's address and must not add to the history. docs/adr/0007-compare-pair-addresses-push-history.md */
    const cmpHash = ids => '#compare/' + ids.join('/');
    const namesIn = x => [...x.d.querySelectorAll('#polCmpCols .pol-cmp-row-head .pol-cmp-name')].map(e => e.textContent);
    const stepsOf = x => x.w.history.length;
    const ringFor = ([a, b]) => a === b ? 'pol-cmp-same' : linkedIn(facts.riv, a, b) ? 'pol-cmp-fight' : linkedIn(facts.pair, a, b) ? 'pol-cmp-team' : 'pol-cmp-idle';

    const el = (x, id) => x.d.getElementById(id);
    const pairIn = x => ['A', 'B'].map(which => { const e = el(x, 'polCmp' + which); return e ? e.value : '(no menu)'; });
    const ringOf = x => { const e = el(x, 'polCmpRing'); return e ? e.className.replace('pol-cmp-ring ', '') : '(no ring)'; };
    const textIn = (x, id) => { const e = el(x, id); return e ? e.textContent : '(no #' + id + ')'; };
    const attrOf = (x, id, a) => { const e = el(x, id); return e ? e.getAttribute(a) : '(no #' + id + ')'; };
    const isHidden = (x, id) => { const e = el(x, id); return !e || e.style.display === 'none'; };
    const backOf = x => el(x, 'polCmpBack') || { disabled: false, title: '(no Back pill)', click() {} };
    // Everything a reader sees of a pair that comes from the pair itself (and its address), so that a pair drawn again by Back or Forward can be compared with the same pair as it was first drawn.
    const snap = x => JSON.stringify({ pair: pairIn(x), hash: x.w.location.hash, ring: ringOf(x), names: namesIn(x), reason: textIn(x, 'polCmpReason'), rows: rowLabels(x) });
    // A check that cannot run (a mutation took the view away, say) fails by name instead of throwing in the section after it.
    const section = async (what, fn) => { try { await fn(); } catch (e) { ok(`${what}: the checks could not finish (${e.message})`, false, String(e.stack || e).split('\n').slice(0, 3).join(' | ')); } };

    await section('the Back pill walks back through the pairs', async () => {
      const bk = openCmp(), backBtn = bk.d.getElementById('polCmpBack'), pairOf = x => [menu(x, 'A'), menu(x, 'B')], start = pairOf(bk), startsOff = backBtn.disabled;
      pick(bk, facts.order.find(i => !start.includes(i)), 'A');                          // a menu
      const afterMenu = pairOf(bk), onAfter = !backBtn.disabled, tip = backBtn.title;
      [...bk.d.querySelectorAll('.pol-cmp-sample')].find(b => b.dataset.id !== (b.dataset.side === 'a' ? menu(bk, 'B') : menu(bk, 'A'))).click();   // a sample
      const afterSample = pairOf(bk);
      const q = [0.15, 0.85]; bk.w.Math.random = () => q.length ? q.shift() : 0.5;
      bk.d.getElementById('polCmpRandom').click();                                        // Randomize
      const afterRandom = pairOf(bk);
      // The pill presses the browser's Back (2026-11-24), which finishes a moment later: wait for it, as a reader's next glance would.
      backBtn.click(); await settle(3); const back1 = pairOf(bk);
      backBtn.click(); await settle(3); const back2 = pairOf(bk);
      backBtn.click(); await settle(3); const back3 = pairOf(bk);
      ok('Back is off until the pair has been changed, names the pair it goes back to, and then undoes each change in turn, whatever made it (a menu, a sample, Randomize), until it is at the first pair and off again',
         startsOff && onAfter && tip.includes(facts.title[start[0]]) && tip.includes(facts.title[start[1]]) && !sameList(afterRandom, afterSample) && sameList(back1, afterSample) && sameList(back2, afterMenu) && sameList(back3, start) && backBtn.disabled && bk.errors.length === 0, JSON.stringify([start, afterMenu, afterSample, afterRandom, back1, back2, back3]));
    });

    await section('an address opens Compare on the pair it names', async () => {
      // 1. an address opens Compare on the pair it names
      const lk = load('index.html', cmpHash(teams[0])); await settle(10);
      ok('an address for a pair opens the Landscape on Compare with those two policies (the Policy tab current, Compare pressed, both menus, both names and the ring), adds no step to the history, and logs no error',
         lk.d.getElementById('viewPolicy').getAttribute('aria-selected') === 'true' && attrOf(lk, 'polSubviewCompare', 'aria-pressed') === 'true' && !isHidden(lk, 'polCompareArea') && sameList(pairIn(lk), teams[0]) &&
         sameList(namesIn(lk), teams[0].map(id => facts.title[id])) && ringOf(lk) === ringFor(teams[0]) && lk.w.location.hash === cmpHash(teams[0]) && stepsOf(lk) === 1 && lk.errors.length === 0,
         `${lk.w.location.hash} ${pairIn(lk)} ${ringOf(lk)} steps ${stepsOf(lk)} ${lk.errors[0] || ''}`);
      const bare0 = load('index.html', '#compare'); await settle(10);
      ok('#compare opens Compare on the pair it opens with (the first competing pair the cards record), and the address is rewritten to name that pair, with no step added',
         sameList(pairIn(bare0), rivals[0]) && bare0.w.location.hash === cmpHash(rivals[0]) && stepsOf(bare0) === 1 && bare0.errors.length === 0, `${bare0.w.location.hash} ${pairIn(bare0)} ${bare0.errors[0] || ''}`);
    });

    await section('an address that does not name two policies on the page', async () => {
      // 2. an address that does not name two policies on the page
      const goneId = facts.order.find(i => !rivals[0].includes(i) && !teams[0].includes(i));
      const inj = encodeURIComponent('<img src=x onerror=alert(1)>'), inj2 = encodeURIComponent('"]\'[x');
      const badLinks = [
        ['an id that is no policy', `#compare/zz-no-such-policy/${teams[0][1]}`],
        ['one id alone', `#compare/${teams[0][0]}`],
        ['ids in capitals', `#compare/${teams[0][0].toUpperCase()}/${teams[0][1].toUpperCase()}`],
        ['markup and quotes where the ids go', `#compare/${inj}/${inj2}`],
        ['a policy the Sheet has archived', `#compare/${goneId}/${teams[0][1]}`, afterMap(`POLICY_MAP.archived.push(${JSON.stringify(goneId)});`)],
      ];
      const badOut = [];
      for (const [what, h, transform] of badLinks) {
        const x = load('index.html', h, transform ? { transform } : undefined); await settle(10);
        badOut.push([what, sameList(pairIn(x), rivals[0]), x.w.location.hash === cmpHash(rivals[0]), stepsOf(x) === 1, x.errors.length === 0, !x.d.querySelector('img[src="x"]')]);
      }
      ok('an address that does not name two policies on the page (an id that is no policy, one id alone, capitals, markup and quotes, a policy the Sheet has archived) opens Compare on its first pair, the address is rewritten to say so, no step is added, and nothing from the address reaches the page',
         badOut.length === 5 && badOut.every(r => r.slice(1).every(Boolean)), badOut.filter(r => !r.slice(1).every(Boolean)).map(r => JSON.stringify(r)).join(' | '));
      const same0 = load('index.html', cmpHash([teams[0][0], teams[0][0]])); await settle(10);
      const extra0 = load('index.html', cmpHash(teams[0]) + '/extra/parts'); await settle(10);
      ok('the same policy twice is a valid address (it opens as the picture\'s "same policy" and the address is kept), and parts after the two ids are dropped from the address',
         sameList(pairIn(same0), [teams[0][0], teams[0][0]]) && ringOf(same0) === 'pol-cmp-same' && same0.w.location.hash === cmpHash([teams[0][0], teams[0][0]]) && sameList(pairIn(extra0), teams[0]) && extra0.w.location.hash === cmpHash(teams[0]) && same0.errors.length + extra0.errors.length === 0,
         `${same0.w.location.hash} ${ringOf(same0)} ${extra0.w.location.hash}`);
    });

    await section("the Landscape's switch gives the address of what is on screen", async () => {
      // 3. the Landscape's switch writes the address of what is on screen, and adds no step
      const sw = load('index.html', '#policy'); await settle(10);
      const sw0 = stepsOf(sw), swHash = [];
      click(sw.w, sw.d, 'polSubviewCompare'); swHash.push(sw.w.location.hash);
      click(sw.w, sw.d, 'polSubviewLinks'); swHash.push(sw.w.location.hash);
      click(sw.w, sw.d, 'polSubviewCompare'); swHash.push(sw.w.location.hash);
      click(sw.w, sw.d, 'polSubviewAll'); swHash.push(sw.w.location.hash);
      const swSteps = stepsOf(sw);
      click(sw.w, sw.d, 'polSubviewCompare');
      sw.w.location.hash = '#policy'; await settle(5);
      ok('the Landscape\'s switch gives the address of what is on screen and adds no step (Compare is the pair it opens on, Links is the policy it opens on, All is #policy), and the address #policy, typed while Compare is showing, puts the Landscape back on All',
         sameList(swHash, [cmpHash(rivals[0]), '#links/' + linksStart(linksFacts(sw)), cmpHash(rivals[0]), '#policy']) && swSteps === sw0 && attrOf(sw, 'polSubviewAll', 'aria-pressed') === 'true' && !isHidden(sw, 'polCatRows') && isHidden(sw, 'polCompareArea') && sw.w.location.hash === '#policy' && sw.errors.length === 0,
         `${swHash} steps ${sw0}/${swSteps} ${sw.w.location.hash}`);
    });

    await section('a change of pair adds one step, however it is made', async () => {
      // 4. a change of pair adds one step, however it is made
      const st = openCmp(); await settle(5);
      const stOut = [], st0 = stepsOf(st);
      const doStep = (what, fn) => {
        const n = stepsOf(st), was = pairIn(st).join('/');
        fn();
        const now = pairIn(st);
        stOut.push([what, stepsOf(st) - n === 1, now.join('/') !== was, st.w.location.hash === cmpHash(now), sameList(st.w.history.state, { polCmp: { prev: was.split('/') } })]);
      };
      const others = () => facts.order.filter(i => i !== menu(st, 'A') && i !== menu(st, 'B'));
      const rnd = vals => { const q = vals.slice(); st.w.Math.random = () => q.length ? q.shift() : 0.5; };
      doStep('menu A', () => pick(st, others()[0], 'A'));
      doStep('menu B', () => pick(st, others()[1], 'B'));
      doStep('Randomize', () => { rnd([0.15, 0.85]); st.d.getElementById('polCmpRandom').click(); });
      doStep('menu A, to a policy that has samples', () => pick(st, others().sort((x, y) => partnersIn(facts.pair, y).length - partnersIn(facts.pair, x).length)[0], 'A'));
      doStep('a sample', () => { const s = [...st.d.querySelectorAll('.pol-cmp-sample')].find(b => b.dataset.id !== (b.dataset.side === 'a' ? menu(st, 'B') : menu(st, 'A'))); if (s) s.click(); });
      doStep('Refresh', () => st.d.getElementById('polCmpRefresh').click());
      const sameBefore = [stepsOf(st), st.w.location.hash];
      pick(st, menu(st, 'A'), 'A');
      st.d.getElementById('polCmpRefresh').click();
      ok('every way of changing the pair adds exactly one step to the history, at the new pair\'s address, and the step remembers the pair before it: a menu (A, then B), Randomize, a menu again, a sample, and Refresh; choosing the pair that is already showing, or pressing Refresh on the pair the view opens on, adds nothing',
         stOut.length === 6 && stOut.every(r => r.slice(1).every(Boolean)) && sameList([stepsOf(st), st.w.location.hash], sameBefore) && stepsOf(st) === st0 + 6 && st.errors.length === 0, JSON.stringify(stOut.filter(r => !r.slice(1).every(Boolean))) + ` steps ${st0} -> ${stepsOf(st)}`);
      const keptSteps = stepsOf(st), keptPair = pairIn(st);
      click(st.w, st.d, 'viewCards'); const awayHash = st.w.location.hash;
      click(st.w, st.d, 'viewPolicy');
      ok('leaving the tab and coming back keeps the pair, its address and the step Back goes to, and adds no step: Papers is #papers, and the Policy tab is Compare on the same pair again',
         awayHash === '#papers' && st.w.location.hash === cmpHash(keptPair) && sameList(pairIn(st), keptPair) && stepsOf(st) === keptSteps && !backOf(st).disabled && !!(st.w.history.state && st.w.history.state.polCmp) && st.errors.length === 0,
         `${awayHash} ${st.w.location.hash} steps ${keptSteps}/${stepsOf(st)} ${JSON.stringify(st.w.history.state)}`);
    });

    await section('Back and Forward', async () => {
      // 5. Back and Forward
      const bf = openCmp(); await settle(5);
      const bfSteps0 = stepsOf(bf), seen = [snap(bf)];
      const bfq = [0.15, 0.85]; bf.w.Math.random = () => bfq.length ? bfq.shift() : 0.5;
      bf.d.getElementById('polCmpRandom').click(); seen.push(snap(bf));
      pick(bf, facts.order.find(i => !rivals[0].includes(i) && i !== menu(bf, 'A') && i !== menu(bf, 'B')), 'B'); seen.push(snap(bf));
      bf.d.getElementById('polCmpRefresh').click(); seen.push(snap(bf));
      const bfSteps = stepsOf(bf), walked = [];
      for (let i = seen.length - 2; i >= 0; i--) { bf.w.history.back(); await settle(3); walked.push(['back', snap(bf) === seen[i], stepsOf(bf) === bfSteps]); }
      for (let i = 1; i < seen.length; i++) { bf.w.history.forward(); await settle(3); walked.push(['forward', snap(bf) === seen[i], stepsOf(bf) === bfSteps]); }
      ok('the browser\'s Back and Forward walk through the pairs: each is drawn in full again (menus, names, ring, reason, rows) at its own address, and neither adds a step',
         seen.length === 4 && bfSteps === bfSteps0 + 3 && walked.length === 6 && walked.every(r => r[1] && r[2]) && bf.errors.length === 0, JSON.stringify(walked) + ` ${bfSteps0}/${bfSteps}`);
      bf.w.history.back(); await settle(3); bf.w.history.back(); await settle(3);
      const atTwo = snap(bf);
      pick(bf, facts.order.find(i => !pairIn(bf).includes(i)), 'B');
      const fresh = snap(bf);
      bf.w.history.forward(); await settle(3);
      ok('a change of pair made after going Back drops the steps ahead of it, as any page does: the history is the earlier pairs and the new one, and Forward has nowhere to go',
         stepsOf(bf) === bfSteps0 + 2 && snap(bf) === fresh && fresh !== atTwo && bf.errors.length === 0, `steps ${bfSteps0} -> ${stepsOf(bf)}`);
    });

    await section("the Back pill is the browser's Back, and an address typed in", async () => {
      // 6. the Back pill is the browser's Back, limited to the pairs
      const arr = load('index.html', '#about'); await settle(10);
      arr.w.location.hash = cmpHash(teams[1]); await settle(5);
      const arrOff = backOf(arr).disabled, arr1 = stepsOf(arr);
      pick(arr, facts.order.find(i => !teams[1].includes(i)), 'B');
      const arrOn = !backOf(arr).disabled, arrTip = backOf(arr).title, arr2 = stepsOf(arr);
      backOf(arr).click(); await settle(3);
      ok('a page opened on a pair by an address starts with Back off, even with history behind it (the step an address makes remembers no earlier pair); after a change it is on and names the pair; pressing it is the browser\'s Back: the pair and its address come back, no step is added, and it is off again',
         arr1 === 2 && arrOff && arrOn && arrTip.includes(facts.title[teams[1][0]]) && arrTip.includes(facts.title[teams[1][1]]) && arr2 === arr1 + 1 && sameList(pairIn(arr), teams[1]) && arr.w.location.hash === cmpHash(teams[1]) && stepsOf(arr) === arr2 && backOf(arr).disabled && arr.errors.length === 0,
         `${arr1} ${arrOff} ${arrOn} ${arrTip} ${arr2}/${stepsOf(arr)} ${arr.w.location.hash}`);
    });

    await section('a policy dialog opened from Compare', async () => {
      // 7. a policy dialog opened from Compare rewrites the step's address and gives it back
      const dlg = openCmp(); await settle(5);
      pick(dlg, facts.order.find(i => !pairIn(dlg).includes(i)), 'B');
      const dlgPair = pairIn(dlg), dlgSteps = stepsOf(dlg);
      const xrefBtn = dlg.d.querySelector('#polCmpCols .pol-xref'), xrefId = xrefBtn ? xrefBtn.dataset.polId : null;
      if (xrefBtn) xrefBtn.click();
      const whileOpen = [dlg.w.location.hash, stepsOf(dlg)];
      dlg.d.getElementById('polModalClose').click();
      const afterClose = [dlg.w.location.hash, stepsOf(dlg), !backOf(dlg).disabled, !!(dlg.w.history.state && dlg.w.history.state.polCmp)];
      ok('a policy dialog opened from Compare (from a cross-reference in the cards, as the Read the full policy button is gone) is #policy/<id> while it is open and gives the pair its address back when it closes; the step is rewritten, not added, and the Back pill still knows its pair',
         (!xrefBtn || whileOpen[0] === '#policy/' + xrefId) && whileOpen[1] === dlgSteps && afterClose[0] === cmpHash(dlgPair) && afterClose[1] === dlgSteps && afterClose[2] && afterClose[3] && dlg.errors.length === 0, JSON.stringify([whileOpen, afterClose]));
    });

    await section('Copy link and the bar', async () => {
      // 8. Copy link
      const cp = load('index.html', cmpHash(teams[0])); await settle(10);
      const copied = [];
      cp.w.document.execCommand = () => { const t = cp.w.document.querySelector('textarea'); copied.push(t && t.value); return true; };
      const copyBtn = cp.d.getElementById('polCmpCopy');
      copyBtn.click();
      const flash = copyBtn.textContent;
      pick(cp, facts.order.find(i => !teams[0].includes(i)), 'B');
      copyBtn.click();
      ok('Copy link copies the address of the pair on screen, built from the page\'s own location, says it has ("Copied"), and follows the pair when it changes',
         sameList(copied, [`https://example.org/${cmpHash(teams[0])}`, `https://example.org/${cmpHash(pairIn(cp))}`]) && flash === 'Copied ✓' && cp.errors.length === 0, JSON.stringify(copied));
      const barCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles', 'policy.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      const barKids = [...pg.d.getElementById('polCmpSlot').children], pickBox = barKids[0], pillsBox = barKids[1];
      ok('the switch\'s row holds the two menus as one unit and then Back, Copy Draft, Copy link, Print, Randomize and Refresh, in alphabetical order, as another (so that where there is no room the pills drop to a line of their own together, under the menus)',
         barKids.length === 2 && !!pillsBox && pillsBox.classList.contains('pol-subview-pills') && !!pickBox && pickBox.classList.contains('pol-subview-pick') && sameList([...pickBox.children].map(e => e.querySelector('select').id), ['polCmpA', 'polCmpB']) &&
         sameList([...pillsBox.children].map(e => e.id), ['polCmpBack', 'polCmpCopyDraft', 'polCmpCopy', 'polCmpPrint', 'polCmpRandom', 'polCmpRefresh']) && !pg.d.getElementById('polCmpAdd') && !/\bAdd\b/.test(pg.d.getElementById('polCmpSlot').textContent) &&
         pg.d.getElementById('polCmpCopy').textContent === 'Copy link' && !!pg.d.getElementById('polCmpCopy').title && pg.d.getElementById('polCmpRandom').textContent === 'Randomize' && !!pg.d.getElementById('polCmpRandom').title && /\.pol-subview-slot \.pol-subview-pills \{ display: inline-flex; flex-wrap: wrap;/.test(barCss), `${barKids.length} children`);
    });

    await section('no switch while the cards are hidden', async () => {
      // 9. no switch to put on Compare while the cards are hidden
      const hideCards = html => { const m = 'let policyCardsHidden = false;'; if (!html.includes(m)) throw new Error('policyCardsHidden is no longer declared as the test expects'); return html.replace(m, 'let policyCardsHidden = true;'); };
      const hid = load('index.html', cmpHash(teams[0]), { transform: hideCards }); await settle(10);
      ok('while the policy cards are hidden (policyCardsHidden) there is no switch to put on Compare: an address for a pair opens the tab on its notice, with no error, and the address is the tab\'s own',
         /temporarily unavailable/.test(hid.d.getElementById('policyArea').textContent) && hid.w.location.hash === '#policy' && bodyView(hid.d) === 'policy' && hid.errors.length === 0, `${hid.w.location.hash} ${hid.errors[0] || ''}`);
    });
  };
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
   the dialog and from "Copy as draft" at the owner's request. The two fields stay in the data: pairsWith fills the Links view's left column and
   competesWith its right one (checked above), and a cross-link written inside a card's own text still opens the card it names (checked at the end of this block).

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
   The section opens; its masthead says what is loaded, from the data; the map draws all 50 states and DC; pointing at a state shows it in the card (its bills; there are no midterm results); clicking pins it and narrows the
   bills table. The bills (federal ones from GovInfo, state ones from Open States) are a file of their own, fetched when a section of Government action first opens, so every test here waits for them. The 2026 midterm results
   that used to be on the page (a layer of the map until 2026-11-18, then a block in the card, totals in its overview and a table at the head of All) were removed on 2026-11-23; part B checks that nothing of them is left. Part A checks the shipped bills and the
   view the section opens on, part B the card and pinning, part C paging, the hover card's cap, the territories and the sources, and part D the bill paths with five test bills of its own (the real
   ones are set aside and put back), so that what counts as active (introduced and not failed) and what is left out are both checked. */
const legislationTests = async () => {
  // These checks run on Legislation, the section the tab opens on and the one the Reset button puts it back on (the owner, 2026-11-24; they ran on All until then, when All was where the tab opened, and a long chain of Resets that
  // each go back to the opening section has to stay on one section). Legislation holds the bills and the card with them; All's own words (its legend counts items, its card says Bills in Congress) are checked in the Government action block
  // above and in the Federal and States block below. The Enforcement rows are set aside (noActions): the card shows them in a block of its own, which the Enforcement checks test; these checks are about the bills.
  const { w, d } = load('index.html', '#legislation', { transform: noActions });
  await settle(10);
  const fire = (el, type) => el.dispatchEvent(new w.MouseEvent(type, { bubbles: true }));
  const path = code => d.querySelector(`#legMap path[data-state="${code}"]`);
  const panel = () => d.getElementById('legPanel').textContent;
  const rows = id => d.querySelectorAll(`#${id} tbody tr:not(.leg-empty-row)`).length;
  const mastheadText = () => d.getElementById('headerTabDescText').textContent;
  const legend = () => d.getElementById('legLegend').textContent;
  const num = n => n.toLocaleString('en-US');
  const area = d.getElementById('legislationArea');
  // the shipped bills
  const nBills = w.eval('LEGISLATION_DATA.filter(b => !b.passing).length'), nPassing = w.eval('LEGISLATION_DATA.filter(b => b.passing).length'), nFed = w.eval("LEGISLATION_DATA.filter(b => b.level === 'federal' && !b.passing).length"), nFedPassing = w.eval("LEGISLATION_DATA.filter(b => b.level === 'federal' && b.passing).length"), nState = nBills - nFed;
  const countOf = code => w.eval(`LEGISLATION_DATA.filter(b => b.level === 'state' && b.state === '${code}' && !b.passing).length`);
  const counts = JSON.parse(w.eval("(() => { const c = {}; LEGISLATION_DATA.forEach(b => { if (b.level === 'state' && !b.passing && US_MAP.states[b.state]) c[b.state] = (c[b.state] || 0) + 1; }); return JSON.stringify(c); })()"));
  const nTerritory = w.eval("LEGISLATION_DATA.filter(b => b.level === 'state' && !b.passing && !US_MAP.states[b.state]).length");
  const feeds = JSON.parse(w.eval('JSON.stringify(LEGISLATION_FEEDS)'));
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const longDay = iso => { const [y, m, day] = iso.split('-'); return `${MONTHS[+m - 1]} ${+day}, ${y}`; };   // "2026-11-17" as the page writes it
  const PAGE = 10, pagesOf = n => Math.max(1, Math.ceil(n / PAGE));   // the bills table's page (LEG_PAGE_SIZE); the Papers list and the Fact Bank keep fifty
  // The pointer leaving the map: with nothing pinned the card stays on the state last pointed at for LEG_CARD_GRACE ms (so the pointer can reach its link), so a test that wants the card
  // back at the overview waits that long.
  const GRACE = 450, leaveMap = async () => { d.getElementById('legMap').dispatchEvent(new w.MouseEvent('mouseleave', { bubbles: true })); await wait(GRACE + 80); };
  const joinAnd = l => l.length > 2 ? l.slice(0, -1).join(', ') + ' and ' + l[l.length - 1] : l.join(' and ');
  const names = Object.values(feeds).map(f => f.short || f.org), joinNames = names.length > 2 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names.join(' and ');

  /* ── A. the shipped bills, and the view the tab opens on ─────────────────────────────────────────────────── */
  ok('#legislation opens the Legislation view', bodyView(d) === 'legislation', `body view was ${bodyView(d)}`);
  ok('#legislation keeps its address bar', w.location.hash === '#legislation', `hash was ${w.location.hash}`);
  const btn = d.getElementById('viewGovernment');
  ok('#legislation marks the Enforcement and Legislation tab active, and not Landscape, and presses Legislation in the switch',
     btn.classList.contains('active') && btn.getAttribute('aria-selected') === 'true' && !d.getElementById('viewPolicy').classList.contains('active') && d.getElementById('govSwitchLegislation').getAttribute('aria-pressed') === 'true');
  ok('the screen reader announcement names the tab and the section', d.getElementById('viewAnnounce').textContent === 'Government action: Legislation view');
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
  ok('the tab\'s masthead is the owner\'s own question and blurb: a centralized repository of the bills, cases and actions, and how to use the switch and the Show menu; it quotes no count and says nothing of the midterm results',
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
  ok('the Show menu offers "All jurisdictions", then Federal (Congress), then All states (the States button\'s place, first in its group) and each of the 51 states once, then Puerto Rico, the one territory a source covers',
     options.length === 55 && options[0].textContent === 'All jurisdictions' && options[1].value === 'federal' && options[2].value === 'states' && options[2].textContent === 'All states' && groups === 'Federal:1,States:52,Territories:1' &&
     options.slice(2).every(o => o.value && o.value !== 'federal' && o.textContent) && new Set(options.map(o => o.value)).size === 55, groups);
  ok('the section switch is the first thing in the toolbar, then the Show menu, then the Status menu and the checkbox for the bills that only lightly mention AI, and the Reset button last, in that order',
     [...d.querySelectorAll('#legSticky .leg-controls-main > *')].map(e => e.id).join() === 'govSwitch,legShowPair,legStatusPair,legPassingWrap' && d.querySelector('#legSticky .leg-controls').lastElementChild === d.getElementById('legReset') &&
     [...d.querySelectorAll('#govSwitch button')].map(b => b.textContent).join() === 'Legislation,Enforcement,Cases,All' && !d.getElementById('legLayerResults') && !d.getElementById('legOfficeToggle'), [...d.querySelectorAll('#legSticky .leg-controls-main > *')].map(e => e.id).join());
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
     ['legBillsSection'].every(sid => { const s = d.getElementById(sid); return s.lastElementChild.matches('nav.pager') && s.lastElementChild.previousElementSibling.classList.contains('leg-source'); }));
  ok('the topics sit above the search bar, always showing: the chips come before the search box, there is no note under them, there is no More filters toggle and no panel for it, and the Status menu and the checkbox are in the toolbar, not behind anything',
     !d.getElementById('legMoreToggle') && !d.getElementById('legMorePanel') && !d.getElementById('legMoreCount') && !d.querySelector('#legislationArea .more-toggle, #legislationArea .more-panel') &&
     !!(d.getElementById('legTopicPills').compareDocumentPosition(d.getElementById('legSearch')) & 4) && topicsBar.compareDocumentPosition(searchBar) === 4 && !!d.querySelector('#legSticky #legStatus') && !!d.querySelector('#legSticky #legPassing') &&
     w.getComputedStyle(d.getElementById('legTopicPills')).display !== 'none' && !d.getElementById('legTopicNote') && !d.querySelector('#legTopicsBar p'));
  ok('there is no Federal button, since Congress is the Federal entry in the Show menu, and the masthead says where to find places (the card no longer has the hint)',
     !d.getElementById('legFed') && ![...d.querySelectorAll('.leg-controls button')].some(b => /Federal/.test(b.textContent)) && !!d.querySelector('#legStateSelect option[value="federal"]') &&
     /choose a place in the Show menu/.test(mastheadText()) && !/Hover a state to see how its bills stand|choose Federal in the Show menu/.test(panel()), mastheadText());
  // the Bills layer: the shading steps are thirds of the states that have bills, and the legend names what each holds
  const readSteps = () => [...d.querySelectorAll('#legLegend .leg-legend-item')].map(i => {
    const sw = i.querySelector('.leg-swatch'), lv = sw && (sw.className.match(/fill-b(\d)/) || [])[1], m = /^([\d,]+)(?: to ([\d,]+))? bills?\b/.exec(i.textContent.trim());   // on Legislation the legend counts bills (on All it counts items, which All's own checks read)
    return lv && m ? { lv: +lv, lo: +m[1].replace(/,/g, ''), hi: +(m[2] || m[1]).replace(/,/g, ''), n: +i.querySelector('.leg-muted-count').textContent } : null;
  }).filter(Boolean);
  const steps = readSteps();
  const stepOf = n => (steps.find(s => n >= s.lo && n <= s.hi) || {}).lv;
  const most = Math.max(...Object.values(counts)), fewest = Math.min(...Object.values(counts));
  const noBills = (() => { const i = [...d.querySelectorAll('#legLegend .leg-legend-item')].find(x => /^No bills/.test(x.textContent.trim())); return i ? +i.querySelector('.leg-muted-count').textContent : 0; })();
  ok('the map is shaded by thirds of the states that have bills: every state is in the step its count falls in, and the legend\'s ranges run from the fewest to the most and account for every state',
     steps.length >= 1 && steps.length <= 3 &&
     Object.keys(counts).every(c => new RegExp(`fill-b${stepOf(counts[c])}\\b`).test(path(c).getAttribute('class'))) && steps[0].lo === fewest && steps[steps.length - 1].hi === most &&
     steps.reduce((s, x) => s + x.n, 0) + noBills === 51 && noBills === 51 - Object.keys(counts).length, legend());
  ok('the legend counts the federal and the territory bills, which are not on the map, and (it is Legislation, not All) does not call them items', new RegExp(`Federal bills, not on the map\\s*${num(nFed)}`).test(legend()) &&
     (nTerritory ? new RegExp(`Territory bills, not on the map\\s*${num(nTerritory)}`).test(legend()) : !/Territory bills/.test(legend())) && !/Items are the bills, key cases and enforcement actions/.test(legend()), legend());
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

  /* ── B. the card and the pinning. The 2026 midterm results are gone from the page (removed 2026-11-23 at the owner's request: they were a layer of the map, then a block in the card, totals in its overview and a table of every state
        at the head of All), so these checks also say that nothing of them is left: no table, no block in the card, no source line for them, no data. ────────────────────────────────── */
  const mapSource = d.getElementById('legMapSource'), links = [...mapSource.querySelectorAll('a')].map(a => a.getAttribute('href'));
  const PAGE_TEXT = () => d.getElementById('legislationArea').textContent + d.getElementById('headerTabDescText').textContent + d.getElementById('aboutArea').textContent;
  ok('there are no midterm results on the page: no layer toggle, no office toggle, no results section, table, pager or note, nothing marked data-layer or data-office, and the map is shaded by bills alone',
     !d.getElementById('legLayerResults') && !d.getElementById('legLayerBills') && !d.getElementById('legOfficeToggle') && !d.getElementById('legResultsSection') && !d.getElementById('legResultsTable') && !d.getElementById('legResultsPager') && !d.getElementById('legSource') &&
     !area.hasAttribute('data-layer') && !d.getElementById('legMap').hasAttribute('data-layer') && !d.querySelector('#legislationArea [data-office], #legislationArea [data-layer], #legislationArea .gov-all-only'));
  ok('nothing on the tab, in its masthead or on About says midterm, election results, the Associated Press or AP, and none of the data that held them (MIDTERM_*) is loaded',
     !/midterm|election result|associated press|\bAP\b/i.test(PAGE_TEXT()) && w.eval("typeof MIDTERM_RESULTS === 'undefined' && typeof MIDTERM_SOURCES === 'undefined' && typeof MIDTERM_PAGES === 'undefined' && typeof MIDTERM_NOTE === 'undefined' && typeof MIDTERM_NATIONAL === 'undefined'"), PAGE_TEXT().match(/.{20}(midterm|election result|associated press|\bAP\b).{20}/i));
  ok('the line below the map cites the two feeds the bills come from, GovInfo and Open States, and nobody else, and the map has no pattern or fill for a race not yet called',
     d.getElementById('legLegend').nextElementSibling === mapSource && links.join() === Object.values(feeds).map(f => f.url).join() && !/Associated Press/.test(mapSource.textContent) && !d.getElementById('legHatch') && !d.querySelector('#legMap defs'), mapSource.textContent);
  fire(path('TX'), 'mouseover');
  ok('pointing at Texas shows its bills in one card, with no source line and no links: the sources are cited under the map, and the card has no results block',
     /Texas/.test(panel()) && /Bills/.test(panel()) && !/Midterm|Senate|House|Governor|Democrat|Republican|Uncalled/.test(panel()) && !/Source/.test(panel()) && !d.querySelector('#legPanel a') && !d.querySelector('#legPanel .leg-office, #legPanel .leg-result'), panel());
  ok('the pointed-at state is outlined', d.getElementById('legRingHover').getAttribute('d') === path('TX').getAttribute('d') && path('TX').getAttribute('d').length > 20);
  fire(path('DC'), 'mouseover');
  ok('DC\'s card lists no bills, only that none have been added, and has no "See more details below" link: there is nothing in the table below to see',
     /District of Columbia/.test(panel()) && d.querySelectorAll('#legPanel .leg-bill-list li').length === 0 && /No legislation has been added for District of Columbia yet\./.test(panel()) && !d.querySelector('#legPanel .leg-more-link'), panel());
  await leaveMap();
  ok('moving off the map returns the card to the overview: the bills, in how many states and how many federal, and nothing about results or totals',
     /United States/.test(panel()) && d.getElementById('legRingHover').getAttribute('d') === '' && /Bills/.test(panel()) && / bills? in /.test(panel()) && /federal bills/.test(panel()) && !/National totals|Midterm|Democrat|Republican|were up/.test(panel()), panel());
  ok('the bills table has its note under the table, above its pager', billsTable().nextElementSibling === d.getElementById('legBillsNote') && d.getElementById('legBillsNote').nextElementSibling === pager);
  fire(path('GA'), 'click');
  const gaN = countOf('GA');
  ok('clicking Georgia pins it: the menu follows, Clear shows, and the bills table narrows to Georgia\'s bills',
     d.getElementById('legStateSelect').value === 'GA' && d.getElementById('legReset').classList.contains('is-on') &&
     rows('legBillsTable') === Math.min(PAGE, gaN) && [...billsTable().querySelectorAll('tbody tr')].every(r => r.getAttribute('data-state') === 'GA') &&
     d.getElementById('legBillsScope').textContent === `Georgia · ${num(gaN)} ${gaN === 1 ? 'bill' : 'bills'}`, `${rows('legBillsTable')} rows for ${gaN} bills`);
  ok('a state\'s bills table has a Summary column only if one of its bills has a summary: only the columns something fills',
     heads() === `Jurisdiction,Bill,Title,Status,Last action,${w.eval("LEGISLATION_DATA.some(b => b.state === 'GA' && !b.passing && b.summary)") ? 'Summary,' : ''}Source`, heads());
  await leaveMap();
  ok('a pinned state keeps the card and its outline after the pointer leaves', /Georgia/.test(panel()) && d.getElementById('legRingPinned').getAttribute('d') === path('GA').getAttribute('d'));
  fire(d.getElementById('legReset'), 'click');
  ok('Clear returns to all jurisdictions', d.getElementById('legStateSelect').value === '' && !d.getElementById('legReset').classList.contains('is-on') && rows('legBillsTable') === Math.min(PAGE, nBills));
  const sel = d.getElementById('legStateSelect');
  sel.value = 'AK'; sel.dispatchEvent(new w.Event('change', { bubbles: true }));
  ok('choosing a state in the menu does what clicking it does, for keyboard users', /Alaska/.test(panel()) && d.getElementById('legBillsScope').textContent.startsWith('Alaska'));
  fire(d.getElementById('legReset'), 'click');
  fire(tile('RI'), 'mouseover');
  ok('pointing at a small state\'s button does what pointing at its shape does: the card shows the state, the map outlines it, and the button is marked',
     /Rhode Island/.test(panel()) && d.getElementById('legRingHover').getAttribute('d') === path('RI').getAttribute('d') && tile('RI').classList.contains('is-hover'), panel());
  fire(path('CT'), 'mouseover');
  ok('pointing at a small state\'s shape marks its button, and only its button', tile('CT').classList.contains('is-hover') && !tile('RI').classList.contains('is-hover') && tiles.filter(b => b.classList.contains('is-hover')).length === 1);
  await leaveMap();
  ok('moving off the map unmarks the buttons', tiles.every(b => !b.classList.contains('is-hover')) && /United States/.test(panel()));
  fire(tile('RI'), 'click');
  ok('clicking a small state\'s button pins it: the button is pressed and outlined, the menu follows, Clear shows, and the bills table narrows to it',
     tile('RI').getAttribute('aria-pressed') === 'true' && tile('RI').classList.contains('is-pinned') && d.getElementById('legStateSelect').value === 'RI' && d.getElementById('legReset').classList.contains('is-on') &&
     d.getElementById('legRingPinned').getAttribute('d') === path('RI').getAttribute('d') && d.getElementById('legBillsScope').textContent.startsWith('Rhode Island') && tiles.filter(b => b.getAttribute('aria-pressed') === 'true').length === 1);
  fire(tile('RI'), 'click');
  ok('clicking it again lets go', tile('RI').getAttribute('aria-pressed') === 'false' && !tile('RI').classList.contains('is-pinned') && d.getElementById('legStateSelect').value === '' && d.getElementById('legBillsScope').textContent === `All jurisdictions · ${num(nBills)} bills`);
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
  ok('following the link pins the state, so the table below is about it, and takes the reader to the details: the Bills title, with focus on the table',
     d.getElementById('legStateSelect').value === 'NY' && d.getElementById('legBillsScope').textContent === `New York · ${num(nyN)} ${nyN === 1 ? 'bill' : 'bills'}` &&
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
  ok('a territory, which has no shape on the map, is chosen from the menu: its card gives its stats',
     /Puerto Rico/.test(panel()) && cardOk(prN), panel());
  ok('and Puerto Rico\'s bills are named for it in the table', rows('legBillsTable') === Math.min(PAGE, prN) && [...billsTable().querySelectorAll('tbody tr')].every(r => /Puerto Rico/.test(r.firstElementChild.textContent)));
  fire(d.getElementById('legReset'), 'click');
  sel.value = 'federal'; sel.dispatchEvent(new w.Event('change', { bubbles: true }));
  ok('choosing Federal in the Show menu narrows the bills table to Congress\'s bills, paged, and the card gives Congress\'s stats with the link to them',
     sel.value === 'federal' && rows('legBillsTable') === Math.min(PAGE, nFed) &&
     cardOk(nFed) &&
     heads() === 'Jurisdiction,Bill,Title,Status,Last action,Summary,Source' && d.getElementById('legBillsNote').textContent === `Federal bills are ${feeds.govinfo.scope}. ${feeds.govinfo.summaries}${nFedPassing ? ' ' + passNote(nFedPassing) : ''}`, `${heads()} | ${d.getElementById('legBillsNote').textContent}`);
  fire(d.getElementById('legReset'), 'click');
  const links2 = [...d.getElementById('legMapSource').querySelectorAll('a')].map(a => a.getAttribute('href'));
  ok('the line below the map cites GovInfo for the federal bills and Open States for the state bills, each with a link to its page, and nobody else: no Associated Press, and no tracker',
     /^Sources: U\.S\. Government Publishing Office, “Bill Status XML Bulk Data” \(bulk data, read /.test(d.getElementById('legMapSource').textContent) &&
     /Open States, “Bill search” \(API v3, read /.test(d.getElementById('legMapSource').textContent) && !/Associated Press/.test(d.getElementById('legMapSource').textContent) &&
     links2.join() === Object.values(feeds).map(f => f.url).join() && !/tracker/i.test(d.getElementById('legMapSource').textContent), d.getElementById('legMapSource').textContent);
  // the newest of the sources' own dates: the feeds give the day they were read, and the latest wins
  const newestStamp = (() => { const days = Object.values(feeds).map(f => f.read).filter(Boolean).sort(); return days.length ? longDay(days[days.length - 1]) : ''; })();
  ok('and it ends with when the page was last updated, on a line of its own: the newest of the feeds\' days, while each source\'s own date stays in its citation',
     !!newestStamp && d.querySelectorAll('#legMapSource .leg-map-updated').length === 1 && d.querySelector('#legMapSource .leg-map-updated').textContent === `Last updated ${newestStamp}.` &&
     d.getElementById('legMapSource').textContent.endsWith(` Last updated ${newestStamp}.`) && Object.values(feeds).every(f => d.getElementById('legMapSource').textContent.includes(`read ${longDay(f.read)})`)), d.getElementById('legMapSource').textContent);
  const readDays = Object.keys(feeds).map(k => [k, feeds[k].read]);
  readDays.forEach(([k]) => w.eval(`LEGISLATION_FEEDS.${k}.read = ''`));
  area.dispatchEvent(new w.Event('legislation:refresh'));
  ok('with no source dated the line makes up no date: it still cites the sources, and says nothing about when they were updated',
     /^Sources: /.test(d.getElementById('legMapSource').textContent) && !/Last updated/.test(d.getElementById('legMapSource').textContent) && !d.querySelector('#legMapSource .leg-map-updated'), d.getElementById('legMapSource').textContent);
  readDays.forEach(([k, v]) => w.eval(`LEGISLATION_FEEDS.${k}.read = ${JSON.stringify(v)}`));
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
  ok('choosing Federal in the Show menu shows Congress\'s stats in the card: its one bill, and a link to it below', d.querySelector('#legPanel .leg-panel-title').textContent === 'Federal (Congress)' && /Bills/.test(panel()) && !/agencies and courts/.test(panel()) && cardOk(1) && d.querySelector('#legPanel .leg-more-link').getAttribute('data-more') === 'federal', panel());
  ok('and pins it: the bills table narrows to Congress, and its title says so',
     d.getElementById('legStateSelect').value === 'federal' && rows('legBillsTable') === 1 && /H\.R\. 3/.test(billsTable().textContent) && /Federal \(Congress\)/.test(d.getElementById('legBillsScope').textContent));
  fire(d.getElementById('legReset'), 'click');
  ok('Clear returns from Federal to all jurisdictions', d.getElementById('legStateSelect').value === '' && rows('legBillsTable') === 3);
  sel.value = 'OH'; sel.dispatchEvent(new w.Event('change', { bubbles: true }));
  ok('a column that is empty for every bill in view is left out: Ohio\'s one bill has no last action and no summary, so the table has neither column', heads() === 'Jurisdiction,Bill,Title,Status,Source', heads());
  fire(d.getElementById('legReset'), 'click');
  ok('the map shades only states with an active state bill, and the legend counts the federal bills that are not on the map',
     /fill-b1/.test(path('TX').getAttribute('class')) && /fill-b1/.test(path('OH').getAttribute('class')) && !/fill-b/.test(path('CA').getAttribute('class')) &&
     /1 bill\s*2/.test(legend()) && /Federal bills, not on the map\s*1/.test(legend()), legend());
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
  const chipText = b => b.textContent.replace(/\s+/g, ' ').trim();
  const resultLine = () => d.getElementById('legResultLine').textContent;
  // The chips carry no counts (the owner, 2026-11-24), so what choosing a chip would leave is read by choosing it and putting it back (the result line is the count). A chip that is on leaves what is in view now; a dimmed one leaves none; and All or
  // No topic, when other topics are picked, would clear them, which cannot be put back, so they are not read (NaN).
  const chipN = b => {
    if (b.disabled) return 0;
    const line = () => Number(resultLine().replace(/,/g, '').match(/^(\d+) of/)[1]), key = b.dataset.topic, picked = chips().filter(c => c.dataset.topic !== 'all' && c.getAttribute('aria-pressed') === 'true');
    if (b.getAttribute('aria-pressed') === 'true') return line();
    if ((key === 'all' || key === 'none') && picked.length) return NaN;
    fire(b, 'click'); const n = line(); fire(b, 'click');
    return n;
  };
  const typeInto = async text => { searchBox.value = text; searchBox.dispatchEvent(new w.Event('input', { bubbles: true })); await wait(260); };
  const titles = () => [...billsTable().querySelectorAll('tbody tr:not(.leg-empty-row)')].map(tr => tr.querySelector('td.leg-col-title').childNodes[0].textContent);
  const topicDefs = JSON.parse(w.eval('JSON.stringify(LEGISLATION_TOPICS.map(t => ({ id: t.id, label: t.label, words: t.words.length })))'));
  const mastBefore = mastheadText();
  ok('above the map there is a filter bar: a search box under the topics, and a result line that counts the bills against all the filters, with no Clear filters yet',
     !!d.getElementById('legFilters') && d.getElementById('legFilters').classList.contains('controls') && searchBox.type === 'search' && searchBox.getAttribute('aria-label') &&
     !clearFilters.classList.contains('is-on') && resultLine() === `${num(nBills)} of ${num(nBills)} bills.`, resultLine());
  ok('the topics are defined in the data, each with an id, a label and some words, and no two share an id',
     topicDefs.length >= 5 && new Set(topicDefs.map(t => t.id)).size === topicDefs.length && topicDefs.every(t => t.id && t.label && t.words > 0 && t.id !== 'all' && t.id !== 'none'), JSON.stringify(topicDefs.map(t => t.id)));
  /* A bill's status is a label to read, so it is not a pill (a pill looks like a button): it is its stage in words, as plain text. (The status had a row of dots under its words for a few hours on 2026-11-17; the owner
     preferred the words alone. A race's result was another such label, a square and the words; the midterm results were removed on 2026-11-23.) */
  const stageLabels = JSON.parse(w.eval("JSON.stringify(Object.keys(LEGISLATION_STAGES).map(k => LEGISLATION_STAGES[k].label))"));
  const statusRows = [...billsTable().querySelectorAll('tbody tr:not(.leg-empty-row)')];
  ok('a bill\'s status is its stage in words as plain text: the cell\'s own text starts with the stage, with no pill and no dots',
     statusRows.length > 0 && statusRows.every(tr => { const cell = tr.children[3], first = cell.firstChild; return !!first && first.nodeType === 3 && stageLabels.includes(first.textContent) && !cell.querySelector('.leg-chip, .leg-step, .leg-track'); }),
     statusRows.slice(0, 2).map(tr => tr.children[3].textContent).join(' | '));
  ok('the chips are All, then one for each topic in the data\'s order, then No topic; none carries a count (the owner, 2026-11-24), and All leaves every bill',
     chips().length === topicDefs.length + 2 && chipText(chips()[0]).startsWith('All') && chipN(chips()[0]) === nBills && !chips().some(b => b.querySelector('.kw-count') || /\d/.test(b.textContent)) && chipText(chips()[chips().length - 1]).startsWith('No topic') &&
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
    const fedLeft = Number(((/Federal bills, not on the map\s*([\d,]+)/.exec(legend()) || [])[1] || '0').replace(/,/g, '')), stateLeft = k - fedLeft;
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
  const summary = () => chips().map(b => chipText(b) + ' ' + chipN(b)).join('|');   // each chip's words and what choosing it leaves (the chips themselves carry no count)
  ok('the chips are built from the topics in the data: All, Pets, Cars, Rules and No topic, counted over the eight active bills (the one that only mentions AI waits behind the switch, the failed one is never listed)',
     summary() === 'All 8|Pets 4|Cars 3|Rules 1|No topic 2' && resultLine() === '8 of 8 bills.', summary());
  ok('a topic is a word in the title ("Dog licensing"), or two different words in the summary ("a dog and a puppy") but not one ("a dog"); and a $ makes a whole word, so "cat" is found in "Cat and puppy parks" but not in "Category review"',
     (() => { fire(chipOf('pets'), 'click'); return titles().sort().join('|') === ['Animal welfare', 'Cat and puppy parks', 'Dog licensing', 'Registering a vehicle with a dog'].join('|'); })() && resultLine() === '4 of 8 bills.', titles().join('|'));
  ok('each row names its topics, and the chips now count what choosing them would leave: Cars 1 (the vehicle with a dog), Rules 0 and dimmed, No topic 2',
     /Topics: Pets/.test(billsTable().textContent) && /Topics: Pets, Cars|Topics: Cars, Pets/.test(billsTable().textContent) && chipN(chipOf('cars')) === 1 && chipN(chipOf('rules')) === 0 && chipOf('rules').disabled && !chipOf('none').disabled, summary());
  ok('the map follows: Texas, Ohio and California are shaded for the pet bills (2, 1 and 1), the federal bills are not (none has pets), and the masthead is unchanged', 
     /fill-b/.test(path('TX').getAttribute('class')) && /fill-b/.test(path('OH').getAttribute('class')) && /fill-b/.test(path('CA').getAttribute('class')) && /Federal bills, not on the map\s*0/.test(legend()) &&
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
  ok('the Sort menu offers Most recent action (the default), Oldest action, the two Status orders and Jurisdiction, and the table is most recent first: the two bills dated May 10 lead (California before Texas on the tie), then the 20th of April, March, February, January, and the bills with no date come last',
     [...sortSel.options].map(o => o.textContent).join('|') === 'Most recent action|Oldest action|Status, least progress first|Status, most progress first|Jurisdiction' && sortSel.value === 'recent' && nums().join() === 'AB 31,HB 12,H.R. 42,HB 11,AB 32,SB 21,H.R. 41,SB 22', nums().join());
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

/* ── Government action: Federal on the map, the Status and Last action columns, the order of progress, the chamber and date, and Export to CSV ──────────
   The owner's reviewers' feedback, 2026-11-23 (round 2, linking the policy cards to the legislation, is NOT built). (1) A clickable Federal button on the map, a Capitol-dome icon and the word, with the small-state
   buttons: Congress is a place like a state, so it works the way a state does in every section. (2) The Status and Last action columns of the bills table sort when their header is clicked and are searchable, and the one
   sort state is shared with the Sort menu. (3) An Export to CSV pill that saves every bill in view. (4) Status sorts by progress (Introduced, In committee, Passed one chamber, Passed both chambers, Enacted), never
   alphabetically. (5) A bill that passed one chamber says which, and when, and one that passed both says both. (6) The tab order is Legislation, Enforcement, Cases, then All (the sections' order is tested with the switch, above). Part A is the Federal button,
   B the columns, C the order of progress, D the chamber and date, E the export. */
const govBillsTests = async () => {
  const TODAY = new Date();
  const two = n => String(n).padStart(2, '0'), isoToday = `${TODAY.getFullYear()}-${two(TODAY.getMonth() + 1)}-${two(TODAY.getDate())}`;
  const num = n => n.toLocaleString('en-US');
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const longDay = iso => { const [y, m, day] = iso.split('-'); return `${MONTHS[+m - 1]} ${+day}, ${y}`; };
  const MISSING = 'Which chamber passed it, and when, is not in our data.', MISSING_BOTH = 'Which chambers passed it, and when, is not in our data.', OTHER_MISSING = 'The other chamber and its date are not in our data.';
  const RANK = { failed: 0, introduced: 1, committee: 2, 'one-chamber': 3, 'both-chambers': 4, enacted: 5 };
  const LABEL_RANK = { 'Introduced': 1, 'In committee': 2, 'Passed one chamber': 3, 'Passed both chambers': 4, 'Enacted': 5 };
  const CSV_HEAD = ['Type', 'Jurisdiction', 'Bill number', 'Session', 'Title', 'Status', 'Chambers that passed it', 'Dates it passed', 'Last action date', 'Last action', 'Status note from the source',
                    'Who acted', 'Date of the action or ruling', 'Outcome', 'Checked on', 'Summary', 'Topics', 'Mentions AI only in its text', 'Source', 'Link'];
  const COL = Object.fromEntries(CSV_HEAD.map((h, i) => [h, i]));   // a column by its name: the header is the contract, the order is its own business
  // a minimal RFC 4180 reader, so the export is read back the way a spreadsheet reads it
  const parseCsv = text => {
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\r' && text[i + 1] === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; }
      else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
  };
  // what a page needs for a download in jsdom: a Blob URL the test can read, and an anchor whose click does not navigate
  const catchDownloads = w => {
    const saved = [];
    w.URL.createObjectURL = blob => { saved.push({ blob }); return 'blob:test/' + saved.length; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () { const s = saved[saved.length - 1]; if (s) { s.name = this.download; s.href = this.href; s.attached = this.isConnected; } };
    const read = (blob, as) => new Promise((res, rej) => { const fr = new w.FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr[as === 'bytes' ? 'readAsArrayBuffer' : 'readAsText'](blob); });
    return { saved, text: async blob => read(blob), bytes: async blob => new Uint8Array(await read(blob, 'bytes')) };
  };

  /* ── A. Federal and States on the map: two more places, in every section ───────────────────────────────────────
     Federal (since 2026-11-23) is Congress, or the federal agencies and courts; States (the owner, 2026-11-24) is every state at once, the other level of government, so the two together are every jurisdiction. They are the map's bottom right,
     side by side; the nine small-state buttons stay in the gutter at its right edge. Each is a place like a state: it previews its card, pins the list to it and lets go when pressed again. The place also decides what the map shades (the owner, 2026-11-24:
     "highlight only federal legislation and enforcement actions. It's likely that nothing will be highlighted"): Federal shades nothing, since a federal row is on no state; All states shades what the map always shades, the states' own rows; one state, or nothing, shades every state. */
  for (const [route, name] of [['legislation', 'Legislation'], ['all', 'All'], ['enforcement', 'Enforcement'], ['cases', 'Cases']]) {
    const { w, d } = load('index.html', '#' + route);
    await settle(10);
    const id = x => d.getElementById(x), fire = (el, type) => el.dispatchEvent(new w.MouseEvent(type, { bubbles: true }));
    const fed = id('legFedBtn'), states = id('legStatesBtn'), levels = id('legLevels'), gutter = id('legGutter'), tiles = id('legTiles');
    const bills = route === 'legislation' || route === 'all', css = [...d.querySelectorAll('style')].map(el => el.textContent).join('\n');
    const rows = JSON.parse(w.eval('JSON.stringify(LEGISLATION_ACTIONS)')), kind = route === 'cases' ? 'case' : 'enforcement';
    const nFedBills = w.eval("LEGISLATION_DATA.filter(b => b.level === 'federal' && !b.passing && LEGISLATION_STAGES[b.stage] && LEGISLATION_STAGES[b.stage].active).length");
    const nFedRows = rows.filter(a => a.kind === kind && a.level === 'federal').length;
    const fedName = { legislation: 'Federal (Congress)', all: 'Federal (Congress, agencies and courts)', enforcement: 'Federal (agencies and courts)', cases: 'Federal (agencies and courts)' }[route];
    ok(`${name}: Federal is a real button on the map with the word Federal, a Capitol-dome icon (inline SVG, drawn in the button's own colour, hidden from a screen reader) and aria-pressed, in the group at the map's bottom right (with States) and apart from the gutter of small-state buttons`,
       fed.matches('button[type="button"]') && fed.textContent.trim() === 'Federal' && !!fed.querySelector('svg[aria-hidden="true"]') && fed.querySelectorAll('svg path').length >= 5 && /stroke="currentColor"/.test(fed.querySelector('svg').outerHTML) &&
       /\.leg-level \{[^}]*color:\s*var\(--navy\)/.test(css) && fed.getAttribute('aria-pressed') === 'false' && fed.parentElement === levels && tiles.parentElement === gutter && !tiles.contains(fed) && !gutter.contains(fed) && id('legMapBox').contains(levels) && id('legMapBox').contains(gutter), route);
    if (route === 'legislation') ok("Federal and States are at the map's bottom right (the owner, 2026-11-24): one group in the map's box, side by side, positioned at its right and bottom edges and before the gutter of small-state buttons, which stays at the right edge; on a phone a row under the map, at its right",
       !!(levels.compareDocumentPosition(gutter) & 4) && /\.leg-levels \{[^}]*position:\s*absolute;[^}]*right:\s*0;[^}]*bottom:\s*0;[^}]*display:\s*flex;/.test(css) && /\.leg-gutter \{[^}]*position:\s*absolute;[^}]*top:[^}]*right:\s*0;/.test(css) &&
       /@media \(max-width: 520px\) \{[^@]*?\.leg-levels \{ position: static; justify-content: flex-end;/.test(css) && /\.leg-level \{ width: auto; height: 44px;/.test(css), route);
    ok(`${name}: the button is named by the body it is about (${fedName}), and the visible word begins the name`, fed.getAttribute('aria-label') === fedName && fed.title === fedName && fedName.startsWith(fed.textContent.trim()), fed.getAttribute('aria-label'));
    ok(`${name}: it is the same place as the Show menu's Federal entry, and no letters were added to the map for it`, !!d.querySelector(`#legStateSelect option[value="federal"]`) && fed.getAttribute('data-state') === 'federal' && d.querySelectorAll('#legMap text').length === 0);
    fire(fed, 'mouseover');
    ok(`${name}: pointing at it previews Federal in the card without pinning anything`, d.querySelector('#legPanel .leg-panel-title').textContent === fedName && fed.classList.contains('is-hover') && id('legStateSelect').value === '' && fed.getAttribute('aria-pressed') === 'false', d.querySelector('#legPanel .leg-panel-title').textContent);
    fire(id('legMapBox'), 'mouseleave');
    await wait(530);
    fire(fed, 'click');
    const title = bills ? id('legBillsTitle').textContent.trim() : id('enfLists').querySelector('.leg-section-title').textContent.trim();
    ok(`${name}: pressing it selects federal as a place, as a state is selected: the Show menu says Federal, the button is pressed, ringed and filled, and Reset counts it`,
       id('legStateSelect').value === 'federal' && fed.getAttribute('aria-pressed') === 'true' && fed.classList.contains('is-pinned') && id('legReset').classList.contains('is-on') && /^Reset all \(\d+\)$/.test(id('legResetText').textContent) &&
       /\.leg-level\.is-pinned \{[^}]*background:\s*var\(--navy\)[^}]*box-shadow/.test(css), `${id('legStateSelect').value} ${id('legResetText').textContent}`);
    ok(`${name}: the title and count say Federal, and the list holds only federal items`,
       bills ? (title === `Federal (Congress) · ${num(nFedBills)} bills` && [...id('legBillsTable').querySelectorAll('tbody tr')].every(tr => tr.getAttribute('data-state') === 'federal'))
             : (title.startsWith(`Federal (agencies and courts) · ${nFedRows} `) && w.location.hash === `#${route}/federal` && [...id('enfLists').querySelectorAll('tbody tr:not(.leg-empty-row)')].every(tr => { const a = rows.find(r => r.id === tr.getAttribute('data-id')); return a && a.level === 'federal'; })), title);
    const card = id('legPanel'), cardTitle = card.querySelector('.leg-panel-title').textContent;
    ok(`${name}: the card is Federal's: its title, and stats like a state's card (${bills ? 'the bills\' count and stage bar' : 'this section\'s count'}), with its link to the details below wherever there is something to see`,
       cardTitle === fedName && (bills ? (card.querySelector('.leg-card-total').textContent === `${num(nFedBills)} bills` && !!card.querySelector('.leg-stats--card .leg-stats-bar')) : (nFedRows ? new RegExp(`${nFedRows} (enforcement actions?|key cases?)`).test(card.textContent) : /None listed for Federal/.test(card.textContent))) &&
       (!!card.querySelector('.leg-more-link') === (bills || nFedRows > 0)), cardTitle + ' | ' + card.textContent.slice(0, 120));
    fire(fed, 'click');
    ok(`${name}: pressing it again lets go, as a state does: every jurisdiction, nothing pressed`, id('legStateSelect').value === '' && fed.getAttribute('aria-pressed') === 'false' && !fed.classList.contains('is-pinned') && (bills ? /^All jurisdictions · /.test(id('legBillsTitle').textContent) : /^All jurisdictions · /.test(id('enfLists').querySelector('.leg-section-title').textContent)));
    fire(fed, 'click');
    fire(id('legReset'), 'click');
    ok(`${name}: Reset clears it, and the button is unpressed`, id('legStateSelect').value === '' && fed.getAttribute('aria-pressed') === 'false' && !fed.classList.contains('is-pinned') && id('legResetText').textContent === 'Reset all');
    fire(id('govSwitch' + name), 'click');   // Reset puts the tab back on Legislation (2026-11-24): come back to the section this round is about
    // the Show menu and the button are one choice: choosing Federal in the menu presses the button, and choosing a state unpresses it
    const sel = id('legStateSelect');
    sel.value = 'federal'; sel.dispatchEvent(new w.Event('change', { bubbles: true }));
    const pressedAfterMenu = fed.getAttribute('aria-pressed');
    sel.value = 'TX'; sel.dispatchEvent(new w.Event('change', { bubbles: true }));
    ok(`${name}: the Show menu and the button stay one choice: Federal in the menu presses the button, a state in the menu lets it go`, pressedAfterMenu === 'true' && fed.getAttribute('aria-pressed') === 'false');
    sel.value = ''; sel.dispatchEvent(new w.Event('change', { bubbles: true }));

    // ── States: every state at once (the owner, 2026-11-24) ──
    const nStateBills = w.eval("LEGISLATION_DATA.filter(b => b.level === 'state' && !b.passing && LEGISLATION_STAGES[b.stage] && LEGISLATION_STAGES[b.stage].active).length");
    const nStateRows = rows.filter(a => a.kind === kind && a.state).length;
    const titleNow = () => bills ? id('legBillsTitle').textContent.trim() : id('enfLists').querySelector('.leg-section-title').textContent.trim();
    ok(`${name}: States is a real button beside Federal: the word States, a four-tile icon (inline SVG in the button's own colour, hidden from a screen reader), aria-pressed, named All states, one place with the Show menu's All states entry (in its States group), and no letters added to the map`,
       states.matches('button[type="button"]') && states.textContent.trim() === 'States' && !!states.querySelector('svg[aria-hidden="true"]') && states.querySelectorAll('svg rect').length === 4 && /stroke="currentColor"/.test(states.querySelector('svg').outerHTML) &&
       states.getAttribute('aria-pressed') === 'false' && states.getAttribute('aria-label') === 'All states' && states.title === 'All states' && states.getAttribute('data-state') === 'states' &&
       states.parentElement === levels && [...levels.children].map(e => e.id).join() === 'legFedBtn,legStatesBtn' && levels.getAttribute('role') === 'group' && /Federal/.test(levels.getAttribute('aria-label') || '') && /states/.test(levels.getAttribute('aria-label') || '') && !!d.querySelector('#legStateSelect optgroup[label="States"] option[value="states"]') && d.querySelectorAll('#legMap text').length === 0, route);
    fire(states, 'mouseover');
    ok(`${name}: pointing at States previews it in the card without pinning anything`, d.querySelector('#legPanel .leg-panel-title').textContent === 'All states' && states.classList.contains('is-hover') && id('legStateSelect').value === '' && states.getAttribute('aria-pressed') === 'false', d.querySelector('#legPanel .leg-panel-title').textContent);
    fire(id('legMapBox'), 'mouseleave');
    await wait(530);
    const allTitle = titleNow();
    fire(states, 'click');
    ok(`${name}: pressing States selects every state as a place: the Show menu says All states, only that button is pressed, ringed and filled, the title and count say All states, the list holds only state items, and Reset counts it`,
       id('legStateSelect').value === 'states' && states.getAttribute('aria-pressed') === 'true' && states.classList.contains('is-pinned') && fed.getAttribute('aria-pressed') === 'false' && !fed.classList.contains('is-pinned') && id('legReset').classList.contains('is-on') &&
       (bills ? (titleNow() === `All states · ${num(nStateBills)} bills` && [...id('legBillsTable').querySelectorAll('tbody tr')].length > 0 && [...id('legBillsTable').querySelectorAll('tbody tr')].every(tr => tr.getAttribute('data-state') !== 'federal'))
              : (titleNow().startsWith(`All states · ${nStateRows} `) && w.location.hash === `#${route}/states` && [...id('enfLists').querySelectorAll('tbody tr:not(.leg-empty-row)')].every(tr => { const a = rows.find(r => r.id === tr.getAttribute('data-id')); return a && !!a.state; }))), titleNow() + ' ' + w.location.hash);
    const stCard = id('legPanel'), stCardTitle = stCard.querySelector('.leg-panel-title').textContent;
    ok(`${name}: the card is All states': its title, and stats like a state's card (${bills ? 'the bills\' count and stage bar' : 'this section\'s count'}), with its link to the details below wherever there is something to see`,
       stCardTitle === 'All states' && (bills ? (stCard.querySelector('.leg-card-total').textContent === `${num(nStateBills)} bills` && !!stCard.querySelector('.leg-stats--card .leg-stats-bar')) : (nStateRows ? new RegExp(`${nStateRows} (enforcement actions?|key cases?)`).test(stCard.textContent) : /None listed for the states/.test(stCard.textContent))) &&
       (!!stCard.querySelector('.leg-more-link') === (bills || nStateRows > 0)), stCardTitle + ' | ' + stCard.textContent.slice(0, 120));
    fire(states, 'click');
    ok(`${name}: pressing it again lets go: every jurisdiction, nothing pressed, and the federal and the state items add up to every jurisdiction's`,
       id('legStateSelect').value === '' && states.getAttribute('aria-pressed') === 'false' && !states.classList.contains('is-pinned') && /^All jurisdictions · /.test(titleNow()) &&
       (bills ? allTitle === `All jurisdictions · ${num(nFedBills + nStateBills)} bills` : true), titleNow());
    // the Show menu and the two buttons are one choice
    sel.value = 'states'; sel.dispatchEvent(new w.Event('change', { bubbles: true }));
    const afterStatesMenu = [states.getAttribute('aria-pressed'), fed.getAttribute('aria-pressed')];
    sel.value = 'federal'; sel.dispatchEvent(new w.Event('change', { bubbles: true }));
    const afterFedMenu = [states.getAttribute('aria-pressed'), fed.getAttribute('aria-pressed')];
    sel.value = 'TX'; sel.dispatchEvent(new w.Event('change', { bubbles: true }));
    ok(`${name}: the menu and the two buttons are one choice: All states in the menu presses States alone, Federal presses Federal alone, and a state lets both go`,
       afterStatesMenu.join() === 'true,false' && afterFedMenu.join() === 'false,true' && states.getAttribute('aria-pressed') === 'false' && fed.getAttribute('aria-pressed') === 'false', [afterStatesMenu, afterFedMenu].join(' | '));
    sel.value = 'states'; sel.dispatchEvent(new w.Event('change', { bubbles: true }));
    fire(id('legReset'), 'click');
    ok(`${name}: Reset clears States too`, id('legStateSelect').value === '' && states.getAttribute('aria-pressed') === 'false' && !states.classList.contains('is-pinned') && id('legResetText').textContent === 'Reset all');
    fire(id('govSwitch' + name), 'click');

    // ── what the map shades follows the level pinned ──
    const shade = () => [...d.querySelectorAll('#legMap .leg-state')].map(p => p.getAttribute('data-state') + ((p.getAttribute('class').match(/fill-b\d/) || [''])[0])).join(), tileShade = () => [...d.querySelectorAll('#legTiles .leg-tile')].map(b => b.getAttribute('data-state') + ((b.getAttribute('class').match(/fill-b\d/) || [''])[0])).join();
    const legendNow = () => id('legLegend').textContent.replace(/\s+/g, ' ').trim(), swatches = () => id('legLegend').querySelectorAll('.leg-swatch').length;
    const unpinned = [shade(), tileShade(), legendNow(), swatches()];
    sel.value = 'federal'; sel.dispatchEvent(new w.Event('change', { bubbles: true }));
    const onFed = [shade(), tileShade(), legendNow(), swatches()];
    ok(`${name}: with Federal pinned the map shades nothing (a federal row is on no state): no state and no small-state button is coloured, and the legend is only how many federal ${route === 'all' ? 'items' : bills ? 'bills' : kind === 'case' ? 'cases' : 'actions'} there are, with no step to count states under`,
       (route === 'cases' || /fill-b/.test(unpinned[0])) && !/fill-b/.test(onFed[0]) && !/fill-b/.test(onFed[1]) && onFed[3] === 0 && /^Federal [a-z]+, not on the map [\d,]+/.test(onFed[2]) && !/Territory/.test(onFed[2]) && !/^No /.test(onFed[2]) &&
       (route !== 'legislation' || onFed[2] === `Federal bills, not on the map ${num(nFedBills)}`), onFed[2]);
    sel.value = 'states'; sel.dispatchEvent(new w.Event('change', { bubbles: true }));
    const onStates = [shade(), tileShade(), legendNow(), swatches()];
    ok(`${name}: with All states pinned the map is shaded exactly as with nothing pinned (the states' own rows are all it ever shades), and the legend leaves out the federal rows, which are not in view`,
       onStates[0] === unpinned[0] && onStates[1] === unpinned[1] && onStates[3] === unpinned[3] && !/Federal/.test(onStates[2]) && (route === 'cases' || /Federal/.test(unpinned[2])), onStates[2]);   // (the legend with nothing pinned does have the federal line, apart from Cases, where it may be none)
    // one state pinned: only that state is shaded (the owner, 2026-11-24: "pinning a single state also shade only that state")
    const shadeMap = () => Object.fromEntries([...d.querySelectorAll('#legMap .leg-state')].map(p => [p.getAttribute('data-state'), (p.getAttribute('class').match(/fill-b\d/) || [''])[0]]));
    const shadedNow = () => { const m = shadeMap(); return Object.keys(m).filter(k => m[k]); };
    const tilesNow = () => [...d.querySelectorAll('#legTiles .leg-tile')].filter(b => /fill-b/.test(b.getAttribute('class'))).map(b => b.getAttribute('data-state'));
    const stateName = code => w.eval(`US_MAP.states[${JSON.stringify(code)}].name`);
    const billsIn = code => w.eval(`LEGISLATION_DATA.filter(b => b.level === 'state' && b.state === ${JSON.stringify(code)} && !b.passing && LEGISLATION_STAGES[b.stage] && LEGISLATION_STAGES[b.stage].active).length`);
    const rowsIn = code => rows.filter(a => (route === 'all' || a.kind === kind) && a.state === code).length;
    const inPlace = code => (bills ? billsIn(code) : 0) + (route === 'legislation' ? 0 : rowsIn(code));
    const noun = n => route === 'all' ? (n === 1 ? 'item' : 'items') : bills ? (n === 1 ? 'bill' : 'bills') : kind === 'case' ? (n === 1 ? 'case' : 'cases') : (n === 1 ? 'action' : 'actions');
    const pinState = code => { sel.value = code; sel.dispatchEvent(new w.Event('change', { bubbles: true })); };
    const legendItems = () => [...id('legLegend').querySelectorAll('.leg-legend-item')].map(i => i.textContent.replace(/\s+/g, ' ').trim());
    const before = shadeMap(), withRows = Object.keys(before).filter(k => before[k]), nothing = Object.keys(before).find(k => !before[k] && inPlace(k) === 0);
    const tileCodes = [...d.querySelectorAll('#legTiles .leg-tile')].map(b => b.getAttribute('data-state')), smallWithRows = tileCodes.find(c => inPlace(c) > 0);
    if (withRows.length) {
      const one = withRows.find(c => !tileCodes.includes(c)) || withRows[0], n = inPlace(one);   // a state with a shape big enough to point at, if one has rows
      pinState(one);
      ok(`${name}: with one state pinned (${stateName(one)}) only that state is shaded, in the shade it has with nothing pinned, and the other states and the small-state buttons are plain`,
         shadedNow().join() === one && shadeMap()[one] === before[one] && tilesNow().join() === (tileCodes.includes(one) ? one : ''), `${shadedNow()} ${tilesNow()}`);
      const items = legendItems();
      ok(`${name}: and the legend is the one line about it, in its shade (${stateName(one)} ${n} ${noun(n)}), with no step counts for states that are not shaded, no federal line and no territory line`,
         items[0] === `${stateName(one)} ${n} ${noun(n)}` && items.length === (route === 'all' ? 2 : 1) && id('legLegend').querySelectorAll('.leg-swatch').length === 1 && id('legLegend').querySelector('.leg-swatch').classList.contains(before[one]) && !/Federal|Territory|^No /.test(items.join('|')), items.join(' | '));
      if (smallWithRows) {
        pinState(smallWithRows);
        ok(`${name}: a small state is shaded alone too, and so is its button (${stateName(smallWithRows)})`, shadedNow().join() === smallWithRows && tilesNow().join() === smallWithRows && shadeMap()[smallWithRows] === before[smallWithRows], `${shadedNow()} ${tilesNow()}`);
      }
    }
    if (nothing) {
      pinState(nothing);
      ok(`${name}: a state with none of this section's rows pinned shades nothing, and the legend says so (${stateName(nothing)} no ${noun(2)})`, shadedNow().length === 0 && tilesNow().length === 0 && legendItems()[0] === `${stateName(nothing)} no ${noun(2)}`, `${shadedNow()} | ${legendItems().join(' | ')}`);
    }
    pinState('PR');
    ok(`${name}: a territory has no shape on the map, so pinning it shades nothing, and the legend counts it apart (or says none)`,
       shadedNow().length === 0 && tilesNow().length === 0 && /^Puerto Rico (bills|items|actions|cases), not on the map [\d,]+$|^Puerto Rico no (bills|items|actions|cases)$/.test(legendItems()[0]), legendItems().join(' | '));
    pinState('');
    ok(`${name}: letting the state go brings every state back, in the shades it had`, JSON.stringify(shadeMap()) === JSON.stringify(before) && [shade(), tileShade(), legendNow(), swatches()].join('|') === unpinned.join('|'));
    sel.value = ''; sel.dispatchEvent(new w.Event('change', { bubbles: true }));
    ok(`${name}: letting go brings the shading and the legend back`, [shade(), tileShade(), legendNow(), swatches()].join('|') === unpinned.join('|'));
    // hovering a place only previews it
    fire(fed, 'mouseover');
    ok(`${name}: pointing at Federal changes no shading: only pinning it does`, [shade(), tileShade(), legendNow(), swatches()].join('|') === unpinned.join('|'));
    fire(id('legMapBox'), 'mouseleave');
    await wait(530);

    // ── the topic chips carry no counts (the owner, 2026-11-24) ──
    const chipBox = bills ? id('legTopicPills') : id('enfTopicPills'), chipBtns = [...chipBox.querySelectorAll('button[data-topic]')];
    ok(`${name}: the topic chips carry no counts: no chip has a number or a count element`, (!bills || chipBtns.length > 3) && !chipBtns.some(b => b.querySelector('.kw-count') || /\d/.test(b.textContent)), chipBtns.slice(0, 3).map(b => b.textContent).join(' | '));
  }

  /* ── B and C. the columns, the one sort state, the order of progress, and the chamber and date: on bills of our own ──────────────────────── */
  {
    const { w, d } = load('index.html', '#legislation', { transform: noActions });
    await settle(10);
    const id = x => d.getElementById(x), fire = (el, type) => el.dispatchEvent(new w.MouseEvent(type, { bubbles: true })), css = [...d.querySelectorAll('style')].map(el => el.textContent).join('\n');
    w.eval('LEGISLATION_DATA.splice(0)');   // the real bills are set aside: this page is ours alone and is not used again
    w.eval(`LEGISLATION_DATA.push(
      { id: 'g-1', level: 'state', state: 'TX', bill: 'HB 11', title: 'Alpha', stage: 'enacted', passed: [{ chamber: 'House', date: '2026-01-05' }, { chamber: 'Senate', date: '2026-01-08' }], lastAction: { date: '2026-01-10', text: 'Signed by the governor' } },
      { id: 'g-2', level: 'state', state: 'TX', bill: 'HB 12', title: 'Bravo', stage: 'committee', lastAction: { date: '2026-05-10', text: 'Referred to committee' } },
      { id: 'g-3', level: 'state', state: 'CA', bill: 'AB 31', title: 'Charlie', stage: 'one-chamber', passed: [{ chamber: 'Assembly', date: '2026-03-02' }], lastAction: { date: '2026-04-01', text: 'Sent to the upper chamber' } },
      { id: 'g-4', level: 'state', state: 'OH', bill: 'SB 21', title: 'Delta', stage: 'one-chamber', passed: [{ chamber: 'Senate', date: '2026-02-03' }], lastAction: { date: '2026-02-20', text: 'Sent to the lower chamber' } },
      { id: 'g-5', level: 'federal', bill: 'H.R. 41', title: 'Echo', stage: 'one-chamber', passed: [{ chamber: 'House', date: '2026-06-24' }], lastAction: { date: '2026-06-25', text: 'Sent to the other chamber' }, status: 'Introduced May 1, 2026. Committee: Judiciary' },
      { id: 'g-6', level: 'federal', bill: 'H.R. 42', title: 'Foxtrot', stage: 'one-chamber', lastAction: { date: '2026-07-13', text: 'Held at the desk' } },
      { id: 'g-7', level: 'state', state: 'TX', bill: 'HB 13', title: 'Golf', stage: 'introduced', lastAction: { date: '2026-06-01', text: 'Filed' } },
      { id: 'g-8', level: 'state', state: 'OH', bill: 'SB 22', title: 'Hotel', stage: 'both-chambers', passed: [{ chamber: 'Senate', date: '2026-01-30' }, { chamber: 'House', date: '2026-02-01' }], lastAction: { date: '2026-02-01', text: 'Sent to the governor' } },
      { id: 'g-9', level: 'state', state: 'CA', bill: 'AB 32', title: 'India', stage: 'committee', lastAction: { date: '2026-05-10', text: 'Referred to committee' } },
      { id: 'g-10', level: 'state', state: 'TX', bill: 'HB 14', title: 'Juliet', stage: 'committee' },
      { id: 'g-11', level: 'state', state: 'TX', bill: 'HB 15', title: 'Kilo', stage: 'failed', lastAction: { date: '2026-02-02', text: 'Died' } })`);
    // HB 11 (enacted) carries passed data on purpose: the page names the chambers for the two stages that mean one or two chambers and for no other, whatever the data lists
    id('legislationArea').dispatchEvent(new w.Event('legislation:refresh'));
    const nums = () => [...d.querySelectorAll('#legBillsTable tbody tr:not(.leg-empty-row)')].map(tr => tr.querySelector('.leg-num').textContent);
    const th = label => [...d.querySelectorAll('#legBillsTable th')].find(t => t.textContent.trim() === label);
    const sortSel = id('legSort'), setSort = v => { sortSel.value = v; sortSel.dispatchEvent(new w.Event('change', { bubbles: true })); };
    const ARROWS = t => t.querySelectorAll('.leg-sort-icon path').length;
    const RECENT = 'H.R. 42,H.R. 41,HB 13,AB 32,HB 12,AB 31,SB 21,SB 22,HB 11,HB 14';   // the newest action first, the tie on the 10th of May by bill number, the bill with no date last
    const ASC = 'HB 13,AB 32,HB 12,HB 14,H.R. 42,H.R. 41,AB 31,SB 21,SB 22,HB 11';       // introduced; committee (most recent first, the tie on the date by bill number, no date last); passed one chamber; both; enacted
    const DESC = 'HB 11,SB 22,H.R. 42,H.R. 41,AB 31,SB 21,AB 32,HB 12,HB 14,HB 13';
    // B. the columns
    ok('the Status and Last action headers, and only those two, are buttons that sort: each button is in its th, which says aria-sort; the table opens sorted by Last action, newest first',
       [...d.querySelectorAll('#legBillsTable th')].filter(t => t.querySelector('button[data-sort-col]')).map(t => t.textContent.trim()).join() === 'Status,Last action' && th('Status').getAttribute('aria-sort') === 'none' && th('Last action').getAttribute('aria-sort') === 'descending' &&
       [...d.querySelectorAll('#legBillsTable th')].filter(t => !t.querySelector('button')).every(t => !t.hasAttribute('aria-sort')) && [...d.querySelectorAll('#legBillsTable th button')].every(b => b.type === 'button' && b.tabIndex === 0) &&
       sortSel.value === 'recent' && nums().join() === RECENT, nums().join());
    ok('the headers read as they did: the buttons and the arrows add no glyph to the text of a header (no Summary column here: none of these bills has one)', [...d.querySelectorAll('#legBillsTable th')].map(t => t.textContent.trim()).join() === 'Jurisdiction,Bill,Title,Status,Last action,Source');
    ok('each sortable header carries an arrow made of two triangles (up and down), faint while it is not the order, and only the one that points the way when it is: the stylesheet hides the other',
       ARROWS(th('Status')) === 2 && ARROWS(th('Last action')) === 2 && /\.leg-table th\[aria-sort="ascending"\] \.leg-sort-icon \.down, \.leg-table th\[aria-sort="descending"\] \.leg-sort-icon \.up \{ display: none; \}/.test(css) && /\.leg-sort-icon \{[^}]*opacity: 0\.4/.test(css));
    // C. Status by progress
    id('legBillsTable').querySelector('[data-sort-col="status"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    ok('clicking Status sorts by progress, the least first: Introduced, In committee, Passed one chamber, Passed both chambers, Enacted, and not alphabetically (alphabetical would open with Enacted)',
       nums().join() === ASC && th('Status').getAttribute('aria-sort') === 'ascending' && th('Last action').getAttribute('aria-sort') === 'none', nums().join());
    ok('the Sort menu says the same: one sort state, so the menu now reads Status, least progress first, and the header\'s tooltip offers the other direction', sortSel.value === 'status' && sortSel.selectedOptions[0].textContent === 'Status, least progress first' && /most progress first/.test(th('Status').querySelector('button').title), sortSel.value);
    ok('the keyboard stays on the header that was pressed (the table is drawn again, and the focus is put back), so a keyboard reader can press it again', d.activeElement === th('Status').querySelector('button') && d.activeElement.getAttribute('data-sort-col') === 'status', String(d.activeElement && d.activeElement.outerHTML).slice(0, 80));
    th('Status').querySelector('button').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    ok('pressing it again reverses it: the furthest along first, Enacted down to Introduced, with the descending arrow and the menu following', nums().join() === DESC && th('Status').getAttribute('aria-sort') === 'descending' && sortSel.value === 'status-desc' && th('Status').querySelectorAll('.leg-sort-icon').length === 1, nums().join());
    th('Last action').querySelector('button').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    ok('pressing Last action while Status is the order gives the newest first (its first direction), and Status lets go of its arrow', sortSel.value === 'recent' && th('Last action').getAttribute('aria-sort') === 'descending' && th('Status').getAttribute('aria-sort') === 'none' && nums().join() === RECENT, nums().join());
    ok('and pressing Last action again gives the oldest first, with the bills that have no date last in both', (th('Last action').querySelector('button').dispatchEvent(new w.MouseEvent('click', { bubbles: true })), true) && sortSel.value === 'oldest' && th('Last action').getAttribute('aria-sort') === 'ascending' && nums().slice(-1)[0] === 'HB 14', nums().join());
    setSort('status-desc');
    ok('choosing a Status order in the menu moves the header: the menu is one state with the headers', th('Status').getAttribute('aria-sort') === 'descending' && th('Last action').getAttribute('aria-sort') === 'none' && nums().join() === DESC);
    setSort('jurisdiction');
    ok('the Jurisdiction order belongs to no sortable column, so both headers say none; then a press on Status starts from its first direction', th('Status').getAttribute('aria-sort') === 'none' && th('Last action').getAttribute('aria-sort') === 'none' &&
       (th('Status').querySelector('button').dispatchEvent(new w.MouseEvent('click', { bubbles: true })), sortSel.value === 'status' && nums().join() === ASC));
    ok('a sort is part of what Reset all counts, whichever way it was set (a header or the menu), at once: the button turns solid and counts it (the order alone: the section is Legislation, where the tab opens, so it is not counted)', id('legReset').classList.contains('is-on') && id('legResetText').textContent === 'Reset all (1)', id('legResetText').textContent);
    id('legReset').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    fire(id('govSwitchLegislation'), 'click');
    ok('Reset all puts the order back to the newest action first', sortSel.value === 'recent' && th('Last action').getAttribute('aria-sort') === 'descending');
    // the rank is the one place: the Status menu, the stats bar and the sort all read it from LEGISLATION_STAGES
    ok('the order of progress is kept in one place, the rank of each stage in data/legislation-data.js: introduced 1, committee 2, one-chamber 3, both-chambers 4, enacted 5, and a failed stage 0, below every one that is alive',
       (() => { const got = JSON.parse(w.eval('JSON.stringify(LEGISLATION_STAGES)')); return Object.keys(got).length === Object.keys(RANK).length && Object.keys(RANK).every(k => got[k] && got[k].rank === RANK[k]); })(), w.eval('JSON.stringify(LEGISLATION_STAGES)'));
    ok('the Status menu runs in that order too, not alphabetically', [...id('legStatus').options].slice(1).map(o => o.value).join() === 'introduced,committee,one-chamber,both-chambers,enacted');
    // the search finds what the two columns show
    const searchBox = id('legSearch'), titles = () => nums().sort().join(), typeInto = async v => { searchBox.value = v; searchBox.dispatchEvent(new w.Event('input', { bubbles: true })); await wait(260); };
    await typeInto('passed assembly');
    ok('the search finds a bill by what its Status column shows: "passed assembly" finds the one bill the Assembly passed', titles() === 'AB 31', titles());
    await typeInto('passed house');
    ok('"passed house" finds the bills the House passed: the one that passed it alone and the one that passed both chambers (the other that passed one chamber has no chamber in the data, so it cannot be found by one; the enacted bill\'s data lists a House passage, which the page does not show for that stage)', titles() === 'H.R. 41,SB 22', titles());
    await typeInto('passed senate');
    ok('"passed senate" finds the bills the Senate passed: the one that passed it alone and the one that passed both chambers', titles() === 'SB 21,SB 22', titles());
    await typeInto('january 30 2026');
    ok('it finds a bill that passed both chambers by the date either one passed it: "January 30, 2026" is the day its Senate passed it (not its last action, which is a day later)', titles() === 'SB 22', titles());
    await typeInto('enacted');
    ok('and the stage itself: "enacted" finds the enacted bill', titles() === 'HB 11', titles());
    await typeInto('march 2 2026');
    ok('it finds a bill by the date it passed, written as the page writes it ("March 2, 2026")', titles() === 'AB 31', titles());
    await typeInto('2026-05-10');
    ok('and by the Last action column: the date written the other way, "2026-05-10", finds the two bills last acted on that day', titles() === 'AB 32,HB 12', titles());
    await typeInto('may 10');
    ok('"may 10" finds the same two', titles() === 'AB 32,HB 12', titles());
    await typeInto('held at the desk');
    ok('and the words of the last action: "held at the desk" finds that bill', titles() === 'H.R. 42', titles());
    await typeInto('');
    ok('the search box says what it finds: its placeholder names status and dates', /status, dates/.test(searchBox.placeholder), searchBox.placeholder);
    // D. which chamber, and when
    const cellOf = b => [...d.querySelectorAll('#legBillsTable tbody tr')].find(tr => tr.querySelector('.leg-num').textContent === b).cells[3];
    const lineOf = b => (cellOf(b).querySelector('.leg-passed') || { textContent: '(no line)' }).textContent;   // the chamber line of a bill, or a words that fail the check instead of a crash that hides the checks after it
    ok('a bill that passed one chamber says which, and when, under its status: "Passed Assembly, March 2, 2026" for a California bill (the legislature\'s own word, never House), "Passed Senate, February 3, 2026", "Passed House, June 24, 2026" for a federal one',
       cellOf('AB 31').textContent.startsWith('Passed one chamber') && lineOf('AB 31') === 'Passed Assembly, March 2, 2026' && lineOf('SB 21') === 'Passed Senate, February 3, 2026' &&
       lineOf('H.R. 41') === 'Passed House, June 24, 2026' && !/House/.test(cellOf('AB 31').textContent), cellOf('AB 31').textContent);
    ok('the source\'s own status words still follow it (a federal bill\'s "Introduced ... Committee: ..."), after the chamber and date', cellOf('H.R. 41').textContent === 'Passed one chamberPassed House, June 24, 2026Introduced May 1, 2026. Committee: Judiciary', cellOf('H.R. 41').textContent);
    const missingLine = (cellOf('H.R. 42').querySelector('.leg-passed') || { textContent: '(no line)' }).textContent;
    ok('a bill that passed one chamber with no chamber or date in the data says so, and shows no guess', missingLine === MISSING && !/House|Senate/.test(missingLine), cellOf('H.R. 42').textContent);
    ok('a bill that passed both chambers says both, in the order it passed them, each with its date: "Passed Senate, January 30, 2026; House, February 1, 2026"; the legislature\'s own name for each',
       cellOf('SB 22').textContent === 'Passed both chambersPassed Senate, January 30, 2026; House, February 1, 2026' && lineOf('SB 22') === 'Passed Senate, January 30, 2026; House, February 1, 2026', cellOf('SB 22').textContent);
    ok('no other stage shows a chamber line: committee, introduced and enacted bills have none (the enacted bill\'s data lists a House and a Senate passage, and the page leaves them out)', ['HB 12', 'HB 13', 'HB 11'].every(b => !cellOf(b).querySelector('.leg-passed')) && !/House|Senate/.test(cellOf('HB 11').textContent), cellOf('HB 11').textContent);
    // a bill that passed both chambers whose data has less than that: the page says what is missing and shows no guess (the data is put back after)
    const passedOf = (bill, v) => w.eval(`(() => { const b = LEGISLATION_DATA.find(x => x.id === '${bill}'); ${v === undefined ? 'delete b.passed' : 'b.passed = ' + JSON.stringify(v)}; })()`);
    const refresh = () => id('legislationArea').dispatchEvent(new w.Event('legislation:refresh'));
    const SB22 = [{ chamber: 'Senate', date: '2026-01-30' }, { chamber: 'House', date: '2026-02-01' }];
    passedOf('g-8', [SB22[0]]); refresh();
    ok('with one of its two chambers in the data, the page shows that one and says the other chamber and its date are not in the data', lineOf('SB 22') === 'Passed Senate, January 30, 2026. ' + OTHER_MISSING, cellOf('SB 22').textContent);
    passedOf('g-8', undefined); refresh();
    const missingBoth = lineOf('SB 22');
    ok('with neither in the data, it says which chambers and when are not in the data, and names none', missingBoth === MISSING_BOTH && !/House|Senate/.test(missingBoth), missingBoth);
    passedOf('g-8', [SB22[1], SB22[0]]); refresh();
    ok('the order is the data\'s own, as the generator wrote it (the page does not sort the list, so the order is decided in one place): given the House first, the page says the House first', lineOf('SB 22') === 'Passed House, February 1, 2026; Senate, January 30, 2026', cellOf('SB 22').textContent);
    passedOf('g-8', SB22); refresh();
    ok('and put back, the bill says what it said', lineOf('SB 22') === 'Passed Senate, January 30, 2026; House, February 1, 2026');
    // the Status column keeps the width its second line needs whichever of the two stages is in view (a view of the both-chambers bills alone had a 100px column: the width rule only looked at one stage)
    const statusMenu = id('legStatus'), statusCls = () => (d.querySelector('#legBillsTable tbody tr:not(.leg-empty-row)') || { cells: [] }).cells[3] ? d.querySelector('#legBillsTable tbody tr:not(.leg-empty-row)').cells[3].className : '(no row)';   // the column's class is on its cells
    statusMenu.value = 'both-chambers'; statusMenu.dispatchEvent(new w.Event('change', { bubbles: true }));
    ok('with only the bills that passed both chambers in view, the Status column still gets its minimum width (its cells carry a second line)', nums().join() === 'SB 22' && statusCls() === 'leg-col-status' && /\.leg-table \.leg-col-status \{ min-width: 168px; \}/.test(css), statusCls() + ' / ' + nums().join());
    statusMenu.value = 'one-chamber'; statusMenu.dispatchEvent(new w.Event('change', { bubbles: true }));
    ok('and with only the bills that passed one chamber in view', nums().length === 4 && statusCls() === 'leg-col-status', statusCls() + ' / ' + nums().join());
    statusMenu.value = 'committee'; statusMenu.dispatchEvent(new w.Event('change', { bubbles: true }));
    ok('but with bills that have nothing under their stage in view (committee bills with no status note) the column is left to size itself', nums().length > 0 && !/leg-col-status/.test(statusCls()), statusCls() + ' / ' + nums().join());
    statusMenu.value = ''; statusMenu.dispatchEvent(new w.Event('change', { bubbles: true }));
    // F. the key under the Bills title is pressable: a Status filter (the owner, 2026-11-23: "the chart key ... should be clickable")
    setSort('recent');
    const keyBtns = () => [...d.querySelectorAll('#legBillsStats .leg-stats-key button[data-stats-stage]')], keyOn = () => keyBtns().filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.statsStage).join();
    const keyText = () => keyBtns().map(b => b.textContent).join('|'), press = stage => keyBtns().find(b => b.dataset.statsStage === stage).dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    const statsLabelNow = () => (id('legBillsStats').querySelector('.leg-stats-bar') || { getAttribute: () => '' }).getAttribute('aria-label');
    const KEY0 = '1 introduced (10%)|3 in committee (30%)|4 passed one chamber (40%)|1 passed both chambers (10%)|1 enacted (10%)';
    ok('each stage in the key under the Bills title is a button with aria-pressed, none on to begin with, and it reads as it did (the same words and shares)',
       keyBtns().length === 5 && keyText() === KEY0 && keyOn() === '' && keyBtns().every(b => b.type === 'button' && b.tabIndex === 0 && !!b.querySelector('.leg-stats-swatch')) &&
       [...d.querySelectorAll('#legBillsStats .leg-stats-key li')].map(li => li.textContent).join('|') === KEY0 && keyBtns().every(b => /^Show only .+ bills$/.test(b.title)), keyText());
    fire(d.querySelector('#legMap path[data-state="TX"]'), 'mouseover');
    ok('the card\'s own key, a hover preview, stays plain text: pressing it would filter the table without pinning the place the card is about',
       d.querySelectorAll('#legPanel .leg-stats-key li').length > 0 && d.querySelectorAll('#legPanel .leg-stats-key button').length === 0 && !d.querySelector('#legPanel .leg-stats-key--pills'));
    fire(d.getElementById('legMapBox'), 'mouseleave'); await wait(520);
    press('one-chamber');
    ok('pressing a stage shows only the bills at that stage, exactly as choosing it in the Status menu does: the menu follows, the table, its title and the result line say four, the pressed entry is marked, and Reset counts it',
       id('legStatus').value === 'one-chamber' && nums().join() === 'H.R. 42,H.R. 41,AB 31,SB 21' && id('legBillsScope').textContent === 'All jurisdictions · 4 bills' && /^4 of 10 bills/.test(id('legResultLine').textContent) && keyOn() === 'one-chamber' &&
       keyBtns().find(b => b.dataset.statsStage === 'one-chamber').title === 'Showing only “Passed one chamber” bills. Press to show every status.' && id('legResetText').textContent === 'Reset all (1)', `${id('legStatus').value} ${nums().join()} ${keyOn()}`);
    ok('the key still lists every stage, counted before the Status filter (as the Status menu counts), so another can be pressed at once, while the bar follows the bills in view: that one stage, whole',
       keyText() === KEY0 && [...d.querySelectorAll('#legBillsStats .leg-stats-seg')].map(x => x.dataset.stage).join() === 'one-chamber' && statsLabelNow() === 'Where the 4 bills stand: 4 passed one chamber (100%).', keyText() + ' | ' + statsLabelNow());
    ok('the keyboard stays on the pressed entry, though the bar is drawn again, so it can be pressed again', !!d.activeElement && d.activeElement.dataset.statsStage === 'one-chamber', String(d.activeElement && d.activeElement.outerHTML).slice(0, 80));
    press('committee');
    ok('pressing another stage switches to it directly, without clearing first', id('legStatus').value === 'committee' && nums().join() === 'AB 32,HB 12,HB 14' && keyOn() === 'committee' && id('legBillsScope').textContent === 'All jurisdictions · 3 bills');
    press('committee');
    ok('pressing the one that is on shows every status again: the menu says All statuses, ten bills, nothing marked, and the table is back on its first page',
       id('legStatus').value === '' && nums().length === 10 && keyOn() === '' && id('legBillsScope').textContent === 'All jurisdictions · 10 bills' && id('legResetText').textContent === 'Reset all');
    const setStatusMenu = v => { id('legStatus').value = v; id('legStatus').dispatchEvent(new w.Event('change', { bubbles: true })); };
    setStatusMenu('enacted');
    ok('the menu and the key are one state: choosing a stage in the Status menu presses its entry in the key', keyOn() === 'enacted' && nums().join() === 'HB 11');
    setStatusMenu('');
    await typeInto('texas');
    ok('the key counts what the search leaves, so it follows the search and the topics (and the place and the checkbox): the four Texas bills are 1 introduced, 2 in committee and 1 enacted',
       keyText() === '1 introduced (25%)|2 in committee (50%)|1 enacted (25%)', keyText());
    press('enacted');
    ok('with a status on and a search, the key keeps the stages the search leaves: the status does not hide the others', keyText() === '1 introduced (25%)|2 in committee (50%)|1 enacted (25%)' && keyOn() === 'enacted' && nums().join() === 'HB 11', keyText());
    setStatusMenu('both-chambers');
    ok('a status that leaves no bill in view (Texas has none that passed both chambers): the table is empty and the bar is gone, but the key is still there, with that stage at 0, so it can be pressed to clear it',
       nums().length === 0 && !id('legBillsStats').hidden && !id('legBillsStats').querySelector('.leg-stats-bar') && keyText() === '1 introduced (25%)|2 in committee (50%)|0 passed both chambers (0%)|1 enacted (25%)' && keyOn() === 'both-chambers', keyText());
    press('both-chambers');
    ok('pressing it clears the status and the four Texas bills are back', id('legStatus').value === '' && nums().length === 4 && keyOn() === '');
    await typeInto('qqqqq');
    ok('with nothing in view at all (a search that finds nothing) there is no bar and no key: out of sight, as before', id('legBillsStats').hidden && id('legBillsStats').innerHTML === '');
    await typeInto('');
    ok('each entry is a pill, the Topics chips\' own values (Haas 12px, a navy outline on the pale fill, navy with white text and semibold when it is the one on), and the card\'s plain key is not styled as one',
       /\.leg-stats-btn \{[^}]*padding: 4px 12px[^}]*background: var\(--light-beige\); border: 1px solid var\(--navy\); border-radius: var\(--r-ctl\)/.test(css) && /\.leg-stats-btn\[aria-pressed="true"\] \{ background: var\(--navy\); color: #fff; font-weight: 600; \}/.test(css) &&
       /\.leg-stats-btn:focus-visible \{ outline: 2px solid var\(--navy\)/.test(css) && !/\.leg-stats--card \.leg-stats-btn/.test(css));
    // E. the export, on these bills
    const dl = catchDownloads(w), exp = id('legExport');
    const savedText = async () => (await dl.text(dl.saved[dl.saved.length - 1].blob)), names = () => dl.saved.map(s => s.name);
    ok('Export to CSV is a pill (a button, the Fact Bank\'s action pill value for value) at the right of the bills\' title, outside the heading, enabled while bills are in view', exp.matches('button[type="button"]') && exp.textContent === 'Export to CSV' && !exp.disabled && exp.parentElement.classList.contains('leg-section-head') && !id('legBillsTitle').contains(exp) &&
       id('legBillsTitle').textContent.trim() === 'All jurisdictions · 10 bills' && /\.leg-export \{[^}]*border: 1px solid var\(--navy\)[^}]*border-radius: var\(--r-ctl\)[^}]*padding: 4px 12px[^}]*font-size: 12px; font-weight: 600/.test(css) && /Save the 10 bills/.test(exp.title), exp.title);
    setSort('status');
    exp.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await wait(30);
    const bytes = await dl.bytes(dl.saved[0].blob), csv = await savedText(), table = parseCsv(csv.replace(/^\uFEFF/, ''));
    ok('it saves a file named for the place and the day, with a byte order mark so Excel reads the accents and quotes, lines ending CRLF, made by a hidden temporary link that is out of the page again', dl.saved.length === 1 && dl.saved[0].name === `ai-bills-all-${isoToday}.csv` && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF &&
       dl.saved[0].blob.type.startsWith('text/csv') && /\r\n$/.test(csv) && !/[^\r]\n/.test(csv.replace(/"(?:[^"]|"")*"/g, '')) && dl.saved[0].attached === true && !d.querySelector('body > a[download]'), `${dl.saved[0].name} ${dl.saved[0].blob.type}`);
    ok('the file has a header row, and then one row for each of the ten bills in view (all of them, in the order the table is in now: least progress first)',
       table[0].join('|') === CSV_HEAD.join('|') && table.length === 11 && table.slice(1).every(r => r.length === CSV_HEAD.length && r[COL['Type']] === 'Bill') && table.slice(1).map(r => r[COL['Bill number']]).join() === ASC, table.slice(1).map(r => r[COL['Bill number']]).join());
    const row = b => table.find(r => r[COL['Bill number']] === b), cell = (b, h) => row(b)[COL[h]];
    ok('a bill that passed both chambers has both in the file, in the order it passed them, and the dates in the same order, so each date lines up with its chamber: "Senate; House" and "2026-01-30; 2026-02-01"',
       cell('SB 22', 'Status') === 'Passed both chambers' && cell('SB 22', 'Chambers that passed it') === 'Senate; House' && cell('SB 22', 'Dates it passed') === '2026-01-30; 2026-02-01', JSON.stringify(row('SB 22')));
    ok('its columns carry the table\'s (and a bill at another stage has no chamber or date, whatever its data lists): the jurisdiction, the bill number, the stage in words, the chamber and the date it passed (YYYY-MM-DD), the last action\'s date and words, and the link; the columns that are for cases and actions are empty on a bill',
       cell('AB 31', 'Jurisdiction') === 'California' && cell('AB 31', 'Status') === 'Passed one chamber' && cell('AB 31', 'Chambers that passed it') === 'Assembly' && cell('AB 31', 'Dates it passed') === '2026-03-02' && cell('AB 31', 'Last action date') === '2026-04-01' && cell('AB 31', 'Last action') === 'Sent to the upper chamber' &&
       cell('H.R. 41', 'Jurisdiction') === 'Federal' && cell('H.R. 41', 'Chambers that passed it') === 'House' && cell('H.R. 41', 'Status note from the source') === 'Introduced May 1, 2026. Committee: Judiciary' && cell('HB 12', 'Chambers that passed it') === '' && cell('HB 12', 'Dates it passed') === '' &&
       cell('H.R. 42', 'Chambers that passed it') === '' && cell('H.R. 42', 'Dates it passed') === '' && cell('HB 11', 'Chambers that passed it') === '' && cell('HB 11', 'Dates it passed') === '' &&
       ['Who acted', 'Date of the action or ruling', 'Outcome', 'Checked on'].every(h => cell('AB 31', h) === ''), JSON.stringify(row('AB 31')));
    // a filter narrows the file as it narrows the table
    await typeInto('texas');
    exp.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await wait(30);
    const txTable = parseCsv((await savedText()).replace(/^\uFEFF/, ''));
    ok('with a search on, the file holds exactly the bills the table does (the four Texas bills, in the same order), and the button\'s tooltip says how many', txTable.length === 5 && txTable.slice(1).map(r => r[COL['Bill number']]).join() === 'HB 13,HB 12,HB 14,HB 11' && /Save the 4 bills/.test(exp.title) && /Exported 4 bills to ai-bills-all-/.test(id('legAnnounce').textContent), txTable.map(r => r[COL['Bill number']]).join());
    await typeInto('');
    id('legStateSelect').value = 'CA'; id('legStateSelect').dispatchEvent(new w.Event('change', { bubbles: true }));
    exp.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    id('legStateSelect').value = 'federal'; id('legStateSelect').dispatchEvent(new w.Event('change', { bubbles: true }));
    exp.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await wait(30);
    ok('a place goes in the file name: California is ai-bills-california-<day>.csv and Federal ai-bills-federal-<day>.csv', names().slice(-2).join() === `ai-bills-california-${isoToday}.csv,ai-bills-federal-${isoToday}.csv`, names().join());
    id('legStateSelect').value = ''; id('legStateSelect').dispatchEvent(new w.Event('change', { bubbles: true }));
    await typeInto('qqqqq');
    const before = dl.saved.length;
    exp.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    ok('with no bill in view the pill is out of use and saves nothing', exp.disabled && dl.saved.length === before && /nothing in view/.test(exp.title), exp.title);
    await typeInto('');
    // a cell that starts with = + - @ (or a tab or a return) cannot run as a formula; commas, quotes and line breaks cannot break a row
    w.eval(`LEGISLATION_DATA.push(
      { id: 'x-1', level: 'state', state: 'TX', bill: 'HB 91', title: '=HYPERLINK("http://example.org","click")', stage: 'committee', summary: '+1 summary, with a comma' },
      { id: 'x-2', level: 'state', state: 'TX', bill: 'HB 92', title: '-2+3', stage: 'committee', summary: '@SUM(A1:A2)' },
      { id: 'x-3', level: 'state', state: 'TX', bill: 'HB 93', title: 'A "quoted" title, and a comma', stage: 'committee', summary: 'Line one\\nline two' },
      { id: 'x-4', level: 'state', state: 'TX', bill: 'HB 94', title: '\\tTabbed', stage: 'committee', summary: 'Safe-ish - text = fine @ home' })`);
    id('legislationArea').dispatchEvent(new w.Event('legislation:refresh'));
    exp.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await wait(30);
    const raw = await savedText(), nasty = parseCsv(raw.replace(/^\uFEFF/, '')), nr = b => nasty.find(r => r[COL['Bill number']] === b), T = COL['Title'], S = COL['Summary'];
    ok('a cell that starts with =, +, - or @ (or a tab) is neutralised with a leading apostrophe, in the title and in the summary, so a spreadsheet shows it as text and never runs it',
       nr('HB 91')[T] === '\'=HYPERLINK("http://example.org","click")' && nr('HB 91')[S] === '\'+1 summary, with a comma' && nr('HB 92')[T] === '\'-2+3' && nr('HB 92')[S] === '\'@SUM(A1:A2)' && nr('HB 94')[T] === '\'\tTabbed' &&
       nasty.slice(1).every(r => r.every(c => !/^[=+\-@\t\r]/.test(c))), JSON.stringify([nr('HB 91')[T], nr('HB 92')[T]]));
    ok('a quote inside a cell is doubled, and a comma or a line break inside a cell stays inside it, so every row still has its twenty cells; a dash or an equals sign that is not first is left alone',
       nr('HB 93')[T] === 'A "quoted" title, and a comma' && nr('HB 93')[S] === 'Line one\nline two' && /"A ""quoted"" title, and a comma"/.test(raw) && nasty.slice(1).every(r => r.length === CSV_HEAD.length) && nr('HB 94')[S] === 'Safe-ish - text = fine @ home', JSON.stringify(nr('HB 93')));
  }

  /* ── the CSV on All also holds the key cases and the enforcement actions (the owner, 2026-11-23: "the CSV file should also include the cases and enforcement actions") ───────────────────────────────── */
  {
    const { w, d } = load('index.html', '#all');
    await settle(10);
    const id = x => d.getElementById(x), fire = (el, type) => el.dispatchEvent(new w.MouseEvent(type, { bubbles: true })), dl = catchDownloads(w), exp = id('legExport'), T = COL['Type'], J = COL['Jurisdiction'], TI = COL['Title'];
    const acts = JSON.parse(w.eval('JSON.stringify(LEGISLATION_ACTIONS)')), cases = acts.filter(a => a.kind === 'case'), enf = acts.filter(a => a.kind === 'enforcement');
    const topicLabel = Object.fromEntries(JSON.parse(w.eval('JSON.stringify(LEGISLATION_TOPICS.map(t => [t.id, t.label]))')));
    const billsIn = f => w.eval(`LEGISLATION_DATA.filter(b => !b.passing && LEGISLATION_STAGES[b.stage] && LEGISLATION_STAGES[b.stage].active && (${f})).length`);
    const readCsv = async i => parseCsv((await dl.text(dl.saved[i].blob)).replace(/^\uFEFF/, ''));
    const place = code => w.eval(`(() => { const sel = document.getElementById('legStateSelect'); sel.value = '${code}'; sel.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    const nBills = billsIn('true'), kinds = rows => rows.map(r => r[T]).filter((x, i, a) => i === 0 || a[i - 1] !== x).join();
    ok('there are real cases and enforcement actions to put in the file (this checks them against the data, so it needs the rows)', cases.length > 0 && enf.length > 0 && cases.every(a => a.title && a.date) && enf.every(a => a.title && a.date), `${cases.length} cases, ${enf.length} actions`);
    fire(exp, 'click');
    await wait(40);
    const all = await readCsv(0), body = all.slice(1);
    ok('on All the file holds the bills and also the key cases and the enforcement actions: one row for each, under the same header as the bills\' file, and no row is lost or added',
       all[0].join('|') === CSV_HEAD.join('|') && body.length === nBills + cases.length + enf.length && body.filter(r => r[T] === 'Bill').length === nBills && body.filter(r => r[T] === 'Key case').length === cases.length &&
       body.filter(r => r[T] === 'Enforcement action').length === enf.length && body.every(r => r.length === CSV_HEAD.length), `${body.length} rows: ${nBills} + ${cases.length} + ${enf.length}`);
    ok('in the page\'s order: the bills first, then the key cases, then the enforcement actions, each kind together', kinds(body) === 'Bill,Key case,Enforcement action', kinds(body));
    const rowOf = (a, type) => body.find(r => r[T] === type && r[TI] === a.title), host = u => String(u || '').replace(/^https?:\/\/(www\.)?/i, '').split('/')[0];
    const checkRow = (a, type) => { const r = rowOf(a, type); return !!r && r[J] === (a.state ? w.eval(`US_MAP.states['${a.state}'].name`) : 'Federal') && r[COL['Status']] === (a.status || '') && r[COL['Who acted']] === (a.body || '') && r[COL['Date of the action or ruling']] === a.date &&
      r[COL['Outcome']] === (a.outcome || '') && r[COL['Checked on']] === (a.asOf || '') && r[COL['Summary']] === (a.what || '') && r[COL['Topics']] === (a.uses || []).map(u => topicLabel[u] || u).join('; ') && r[COL['Source']] === host(a.url) && r[COL['Link']] === a.url &&
      ['Bill number', 'Session', 'Chambers that passed it', 'Dates it passed', 'Last action date', 'Last action', 'Status note from the source', 'Mentions AI only in its text'].every(h => r[COL[h]] === ''); };
    ok('a key case\'s row carries what its list shows: its place (Federal, or its state), title, status, who acted, the date, the outcome, the day it was last checked, our description as the Summary, its topics, the host as the Source and the link; and the columns that are for bills are empty',
       cases.every(a => checkRow(a, 'Key case')), cases.filter(a => !checkRow(a, 'Key case')).map(a => a.id).join());
    ok('and so does every enforcement action\'s: a state attorney general\'s action is under its state, an agency\'s under Federal', enf.every(a => checkRow(a, 'Enforcement action')) && enf.some(a => a.state) && enf.some(a => !a.state), enf.filter(a => !checkRow(a, 'Enforcement action')).map(a => a.id).join());
    const wordsAll = `${num(nBills)} bills, ${cases.length} key case${cases.length === 1 ? '' : 's'} and ${enf.length} enforcement action${enf.length === 1 ? '' : 's'}`;
    ok('on All the file is named for all of it, not for the bills (ai-government-action-all-<day>.csv), and the pill\'s tooltip and the announcement say what is in it, kind by kind',
       dl.saved[0].name === `ai-government-action-all-${isoToday}.csv` && exp.title === `Save the ${wordsAll} in view, not just this page, as a CSV file` && id('legAnnounce').textContent === `Exported ${wordsAll} to ai-government-action-all-${isoToday}.csv.`, exp.title + ' | ' + id('legAnnounce').textContent);
    // a place narrows all three kinds at once, as it narrows the page
    const st = (enf.find(a => a.state) || {}).state, nameOf = code => w.eval(`US_MAP.states['${code}'].name`), slug = code => nameOf(code).toLowerCase().replace(/ /g, '-');
    place(st);
    fire(exp, 'click');
    await wait(40);
    const inSt = await readCsv(1), nS = billsIn(`b.level === 'state' && b.state === '${st}'`), cS = cases.filter(a => a.state === st).length, eS = enf.filter(a => a.state === st).length;
    ok(`pinning ${nameOf(st)} narrows the file to its bills, its cases and its actions: ${nS} + ${cS} + ${eS}, all ${nameOf(st)}, in a file named for it`,
       inSt.length - 1 === nS + cS + eS && inSt.slice(1).every(r => r[J] === nameOf(st)) && dl.saved[1].name === `ai-government-action-${slug(st)}-${isoToday}.csv` && eS > 0, `${inSt.length - 1} rows`);
    place('federal');
    fire(exp, 'click');
    await wait(40);
    const fed = await readCsv(2), nF = billsIn("b.level === 'federal'"), cF = cases.filter(a => !a.state && a.level === 'federal').length, eF = enf.filter(a => !a.state && a.level === 'federal').length;
    ok(`pinning Federal does the same for Congress and the federal agencies and courts: ${nF} + ${cF} + ${eF}, all Federal, in ai-government-action-federal-<day>.csv`,
       fed.length - 1 === nF + cF + eF && fed.slice(1).every(r => r[J] === 'Federal') && dl.saved[2].name === `ai-government-action-federal-${isoToday}.csv` && eF > 0, `${fed.length - 1} rows`);
    place('');
    // the order is the tab's Sort menu: the lists follow Most recent or Oldest, and a Status order (which a list has none of) leaves them most recent first
    const dateSeq = (rows, type) => rows.filter(r => r[T] === type).map(r => r[COL['Date of the action or ruling']]);
    const nonInc = a => a.every((x, i) => i === 0 || a[i - 1] >= x), nonDec = a => a.every((x, i) => i === 0 || a[i - 1] <= x);
    const setSort = v => { id('legSort').value = v; id('legSort').dispatchEvent(new w.Event('change', { bubbles: true })); };
    setSort('oldest'); fire(exp, 'click'); await wait(40);
    const oldest = await readCsv(3);
    ok('the Sort menu orders the lists in the file as it orders them on the page: Oldest puts the earliest action first', nonDec(dateSeq(oldest.slice(1), 'Enforcement action')) && enf.length > 1 && dateSeq(oldest.slice(1), 'Enforcement action')[0] === enf.map(a => a.date).sort()[0], dateSeq(oldest.slice(1), 'Enforcement action').join());
    setSort('status'); fire(exp, 'click'); await wait(40);
    const byStatus = await readCsv(4);
    ok('and under a Status order (the bills\' own: a list has no stage) the actions are most recent first, while the bills are in order of progress',
       nonInc(dateSeq(byStatus.slice(1), 'Enforcement action')) && byStatus.slice(1).filter(r => r[T] === 'Bill').map(r => LABEL_RANK[r[COL['Status']]]).every((x, i, a) => i === 0 || a[i - 1] <= x));
    setSort('recent');
    // Legislation is the bills alone, with the same header, and a file named for the bills
    fire(id('govSwitchLegislation'), 'click');
    fire(exp, 'click'); await wait(40);
    const leg = await readCsv(5);
    ok('on Legislation the file is the bills alone, as that section is (the same header, every row a Bill, named ai-bills-all-<day>.csv), and the pill\'s tooltip says so',
       leg[0].join('|') === CSV_HEAD.join('|') && leg.length - 1 === nBills && leg.slice(1).every(r => r[T] === 'Bill') && dl.saved[5].name === `ai-bills-all-${isoToday}.csv` && exp.title === `Save the ${num(nBills)} bills in view, not just this page, as a CSV file`, exp.title);
  }
  {
    // the bills file does not arrive: the pill is out of use, because a file made without them would leave them out without saying so, though the lists have rows
    const { w, d } = load('index.html', '#all', { transform: html => html.replace("loadPayload('data/legislation-bills.js')", "loadPayload('data/no-such-bills.js')") });
    await settle(10);
    const dl = catchDownloads(w), exp = d.getElementById('legExport');
    exp.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    ok('while the bills have not arrived (here they never do) the pill is out of use and saves nothing, however many cases and actions there are: it says why',
       d.getElementById('legislationArea').getAttribute('data-bills') === 'failed' && exp.disabled && dl.saved.length === 0 && /could not be loaded/.test(exp.title), exp.title + ' | ' + d.getElementById('legislationArea').getAttribute('data-bills'));
  }

  /* ── C again. the rank is the one place: change it in the data, and the sort, the Status menu and the stats bar follow ───────────────── */
  {
    // swap the ranks of "In committee" and "Passed one chamber" in the data file as the page loads it: nothing else is touched
    const swapped = html => html.replace(/'committee':(\s*)\{ label: 'In committee',(\s*)active: true,(\s*)rank: 2 \}/, "'committee':$1{ label: 'In committee',$2active: true,$3rank: 3 }").replace(/'one-chamber':(\s*)\{ label: 'Passed one chamber',(\s*)active: true,(\s*)rank: 3 \}/, "'one-chamber':$1{ label: 'Passed one chamber',$2active: true,$3rank: 2 }");
    const { w, d } = load('index.html', '#legislation', { transform: html => swapped(noActions(html)) });
    await settle(10);
    const id = x => d.getElementById(x);
    w.eval('LEGISLATION_DATA.splice(0)');
    w.eval(`LEGISLATION_DATA.push(
      { id: 'r-1', level: 'state', state: 'TX', bill: 'HB 1', title: 'A', stage: 'committee', lastAction: { date: '2026-01-01', text: 'x' } },
      { id: 'r-2', level: 'state', state: 'TX', bill: 'HB 2', title: 'B', stage: 'one-chamber', passed: [{ chamber: 'House', date: '2026-01-02' }], lastAction: { date: '2026-01-02', text: 'x' } },
      { id: 'r-3', level: 'state', state: 'TX', bill: 'HB 3', title: 'C', stage: 'introduced', lastAction: { date: '2026-01-03', text: 'x' } })`);
    id('legislationArea').dispatchEvent(new w.Event('legislation:refresh'));
    id('legBillsTable').querySelector('[data-sort-col="status"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    const nums = () => [...d.querySelectorAll('#legBillsTable tbody tr')].map(tr => tr.querySelector('.leg-num').textContent).join();
    ok('the rank, and nothing else, decides: with the ranks of In committee and Passed one chamber swapped in the data, the Status sort, the Status menu and the stats bar all swap too',
       w.eval('LEGISLATION_STAGES.committee.rank') === 3 && w.eval("LEGISLATION_STAGES['one-chamber'].rank") === 2 && nums() === 'HB 3,HB 2,HB 1' && [...id('legStatus').options].slice(1).map(o => o.value).join() === 'introduced,one-chamber,committee,both-chambers,enacted' && [...id('legBillsStats').querySelectorAll('.leg-stats-seg')].map(x => x.getAttribute('data-stage')).join() === 'introduced,one-chamber,committee', nums());
  }

  /* ── C and D on the shipped bills ───────────────────────────────────────────────────────────────────────── */
  {
    const { w, d } = load('index.html', '#legislation', { transform: noActions });
    await settle(10);
    const id = x => d.getElementById(x), fire = (el, type) => el.dispatchEvent(new w.MouseEvent(type, { bubbles: true }));
    const bills = JSON.parse(w.eval('JSON.stringify(LEGISLATION_DATA)')), active = bills.filter(b => !b.passing);
    const lowerIsAssembly = ['CA', 'NY', 'NJ', 'NV', 'WI'];   // states whose lower chamber the legislature calls the Assembly: a page that said House for these would be wrong
    const oneChamber = bills.filter(b => b.stage === 'one-chamber'), bothChambers = bills.filter(b => b.stage === 'both-chambers');
    ok('every bill that passed one chamber carries which chamber and when, from its source: a federal one House or Senate, a state one the legislature\'s own name for it (Assembly for CA, NY, NJ, NV and WI, never House), and a real date that is not in the future and not after the bill\'s last action',
       oneChamber.length > 0 && oneChamber.every(b => Array.isArray(b.passed) && b.passed.length >= 1 && b.passed.every(p => typeof p.chamber === 'string' && p.chamber.length > 2 && /^\d{4}-\d{2}-\d{2}$/.test(p.date) && p.date >= '2025-01-01' && p.date <= isoToday && (!b.lastAction || p.date <= b.lastAction.date)) &&
       (b.level === 'federal' ? b.passed.every(p => ['House', 'Senate'].includes(p.chamber)) : b.passed.every(p => !(p.chamber === 'House' && lowerIsAssembly.includes(b.state))))),
       oneChamber.filter(b => !(Array.isArray(b.passed) && b.passed.length)).map(b => b.bill).join() + ' | ' + oneChamber.filter(b => b.passed && b.passed.some(p => p.date > (b.lastAction || {}).date)).map(b => b.bill).join());
    ok('every bill that passed both chambers carries them: two different chambers, each with a real date that is not in the future and not after the bill\'s last action, in the order they passed it (the earlier date first), or, where the source has only one, that one (California\'s SCR 82: the Assembly\'s two "passages" are committee votes, which are not named); a federal one House and Senate, a state one the legislature\'s own names (never House for an Assembly state)',
       bothChambers.length > 0 && bothChambers.filter(b => b.passed && b.passed.length === 2).length >= bothChambers.length - 1 && bothChambers.every(b => Array.isArray(b.passed) && [1, 2].includes(b.passed.length) && (b.passed.length < 2 || (b.passed[0].chamber !== b.passed[1].chamber && b.passed[0].date <= b.passed[1].date)) &&
         b.passed.every(p => typeof p.chamber === 'string' && p.chamber.length > 2 && /^\d{4}-\d{2}-\d{2}$/.test(p.date) && p.date >= '2025-01-01' && p.date <= isoToday && (!b.lastAction || p.date <= b.lastAction.date)) &&
         (b.level === 'federal' ? b.passed.every(p => ['House', 'Senate'].includes(p.chamber)) : b.passed.every(p => !(p.chamber === 'House' && lowerIsAssembly.includes(b.state))))),
       bothChambers.filter(b => !(Array.isArray(b.passed) && b.passed.length === 2)).map(b => b.bill + ':' + ((b.passed || []).length)).join() + ' | ' + bothChambers.filter(b => b.passed && b.passed.length === 2 && b.passed[0].date > b.passed[1].date).map(b => b.bill).join());
    ok('a committee\'s vote is not named as a chamber\'s passage: no bill at those stages has a passage dated on a day its source only records a committee vote (California\'s SCR 82 names its Senate and not its Assembly)',
       !bills.some(b => b.state === 'CA' && b.bill === 'SCR 82' && (b.passed || []).some(p => p.chamber === 'Assembly')) && ((bothChambers.find(b => b.state === 'CA' && b.bill === 'SCR 82') || {}).passed || []).length <= 1);
    ok('and no bill at any other stage carries one: it is for the bills that passed one chamber or both (the enacted federal bills passed both too, and the scan has the dates, but the page and the data say it for the two stages only)', bills.filter(b => !['one-chamber', 'both-chambers'].includes(b.stage)).every(b => !('passed' in b)), bills.filter(b => !['one-chamber', 'both-chambers'].includes(b.stage) && 'passed' in b).map(b => b.bill).join());
    ok('the Assembly is in the data where it belongs: some California or New York bill passed the Assembly, and none of those states shows a House passage', oneChamber.some(b => b.passed.some(p => p.chamber === 'Assembly')) && !oneChamber.some(b => lowerIsAssembly.includes(b.state) && b.passed.some(p => p.chamber === 'House')));
    // the Status filter on the one-chamber stage: every row says which chamber and when, exactly as the data has it
    const st = id('legStatus'); st.value = 'one-chamber'; st.dispatchEvent(new w.Event('change', { bubbles: true }));
    const shownRows = [...d.querySelectorAll('#legBillsTable tbody tr')];
    const billOfRow = (tr, stage) => active.find(x => x.stage === stage && x.bill === tr.querySelector('.leg-num').textContent && (x.level === 'federal') === (tr.getAttribute('data-state') === 'federal') && (x.level === 'federal' || tr.cells[0].textContent === w.eval(`US_MAP.states['${x.state}'] ? US_MAP.states['${x.state}'].name : LEGISLATION_TERRITORIES['${x.state}']`)));
    const sayingOf = (tr, stage) => { const cell = tr.cells[3], b = billOfRow(tr, stage), need = stage === 'both-chambers' ? 2 : 1; return !!b && !!cell.querySelector('.leg-passed') &&
      cell.querySelector('.leg-passed').textContent === 'Passed ' + (b.passed || []).map(p => `${p.chamber}, ${longDay(p.date)}`).join('; ') + ((b.passed || []).length < need ? '. ' + OTHER_MISSING : ''); };
    ok('on the real bills, every row of the one-chamber stage says "Passed <chamber>, <date>" in its Status cell, matching its data, and none says the chamber is missing',
       shownRows.length === 10 && shownRows.every(tr => sayingOf(tr, 'one-chamber')), shownRows.map(tr => tr.cells[3].textContent).join(' || '));
    st.value = 'both-chambers'; st.dispatchEvent(new w.Event('change', { bubbles: true }));
    const bothRows = [...d.querySelectorAll('#legBillsTable tbody tr')], bothActive = active.filter(b => b.stage === 'both-chambers');
    ok('and every row of the both-chambers stage says both: "Passed <chamber>, <date>; <chamber>, <date>", in the order the data has them; a bill with only one of the two in its data (SCR 82) says that one and that the other chamber and its date are not in the data, and no row says neither is',
       bothActive.length > 0 && bothRows.length === Math.min(10, bothActive.length) && bothRows.every(tr => sayingOf(tr, 'both-chambers') && !new RegExp(MISSING_BOTH.slice(0, 30)).test(tr.cells[3].textContent)) &&
       bothRows.filter(tr => /^Passed [^;,]+, [A-Z][a-z]+ \d{1,2}, \d{4}; [^;,]+, [A-Z][a-z]+ \d{1,2}, \d{4}$/.test((tr.cells[3].querySelector('.leg-passed') || { textContent: '' }).textContent)).length >= bothRows.length - 1, bothRows.map(tr => tr.cells[3].textContent).join(' || '));
    st.value = ''; st.dispatchEvent(new w.Event('change', { bubbles: true }));
    // sorting the real bills by progress: every bill, across every page, through the export (which holds all of them in the table's order)
    const dl = catchDownloads(w);
    id('legBillsTable').querySelector('[data-sort-col="status"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    id('legExport').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await wait(40);
    const table = parseCsv((await dl.text(dl.saved[0].blob)).replace(/^\uFEFF/, '')), body = table.slice(1), ST = COL['Status'], ranks = body.map(r => LABEL_RANK[r[ST]]);
    const counts = {}; active.forEach(b => { counts[b.stage] = (counts[b.stage] || 0) + 1; });
    ok(`Status sorted by progress on the real bills: the export holds all ${num(active.length)} of them (not the ten on the page), in order of progress, so each stage's bills come together in the order Introduced, In committee, Passed one chamber, Passed both chambers, Enacted`,
       body.length === active.length && ranks.every(r => r >= 1) && ranks.every((r, i) => i === 0 || ranks[i - 1] <= r) && body[0][ST] === 'Introduced' && body[body.length - 1][ST] === 'Enacted' &&
       ['introduced', 'committee', 'one-chamber', 'both-chambers', 'enacted'].every(k => body.filter(r => r[ST] === d.defaultView.eval(`LEGISLATION_STAGES['${k}'].label`)).length === counts[k]), body.map(r => r[ST]).filter((x, i, a) => i === 0 || a[i - 1] !== x).join(' > '));
    ok('and it is not alphabetical: the first page is Introduced bills, where an alphabetical sort would open with Enacted ones, and Enacted ones come last', body.slice(0, 10).every(r => r[ST] === 'Introduced') && body.slice(-10).every(r => r[ST] === 'Enacted') && JSON.stringify(body.map(r => r[ST]).filter((x, i, a) => i === 0 || a[i - 1] !== x)) !== JSON.stringify(['Enacted', 'In committee', 'Introduced', 'Passed both chambers', 'Passed one chamber']));
    // within a stage, the most recent action first
    ok('within each stage the bill acted on most recently comes first (the tie-break does not flip when the order does)',
       ['Introduced', 'In committee', 'Passed one chamber', 'Passed both chambers', 'Enacted'].every(lab => {
         const ds = body.filter(r => r[ST] === lab).map(r => r[COL['Last action date']]), dated = ds.filter(x => x);
         return ds.slice(0, dated.length).every(x => x) && ds.slice(dated.length).every(x => !x) && dated.every((x, i) => i === 0 || dated[i - 1] >= x);   // the dated ones first, newest first, then the ones with no date
       }));
    id('legBillsTable').querySelector('[data-sort-col="status"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    id('legExport').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await wait(40);
    const desc = parseCsv((await dl.text(dl.saved[1].blob)).replace(/^\uFEFF/, '')).slice(1);
    ok('pressed again, the furthest along come first: Enacted, then Passed both chambers, down to Introduced', desc[0][ST] === 'Enacted' && desc[desc.length - 1][ST] === 'Introduced' && desc.map(r => LABEL_RANK[r[ST]]).every((r, i, a) => i === 0 || a[i - 1] >= r));
    // the export of a place
    const nyCount = active.filter(b => b.level === 'state' && b.state === 'NY').length;
    id('legStateSelect').value = 'NY'; id('legStateSelect').dispatchEvent(new w.Event('change', { bubbles: true }));
    id('legExport').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await wait(40);
    const ny = parseCsv((await dl.text(dl.saved[2].blob)).replace(/^\uFEFF/, '')).slice(1);
    ok(`exporting New York gives every one of its ${nyCount} bills (more than a page), all New York, in the order in view, in a file named for it`, ny.length === nyCount && nyCount > 10 && ny.every(r => r[COL['Jurisdiction']] === 'New York') && dl.saved[2].name === `ai-bills-new-york-${isoToday}.csv` && ny.map(r => LABEL_RANK[r[ST]]).every((r, i, a) => i === 0 || a[i - 1] >= r), `${ny.length} of ${nyCount}`);
    ok('a New York bill that passed one chamber has the chamber and the date in the file: the Assembly or the Senate, and a YYYY-MM-DD date', ny.filter(r => r[ST] === 'Passed one chamber').length > 0 && ny.filter(r => r[ST] === 'Passed one chamber').every(r => ['Assembly', 'Senate'].includes(r[COL['Chambers that passed it']]) && /^\d{4}-\d{2}-\d{2}$/.test(r[COL['Dates it passed']])));
    const nyBoth = ny.filter(r => r[ST] === 'Passed both chambers');
    ok('and one that passed both has both in the file: the Assembly and the Senate in the order it passed them, and two YYYY-MM-DD dates in that same order (earlier first), so each date lines up with its chamber',
       nyBoth.length > 0 && nyBoth.every(r => { const c = r[COL['Chambers that passed it']].split('; '), ds = r[COL['Dates it passed']].split('; '); return c.length === 2 && ds.length === 2 && [...c].sort().join() === 'Assembly,Senate' && ds.every(x => /^\d{4}-\d{2}-\d{2}$/.test(x)) && ds[0] <= ds[1]; }), nyBoth.map(r => r[COL['Chambers that passed it']] + ' ' + r[COL['Dates it passed']]).join(' | '));
    // the search finds the Last action date on the real bills
    const sample = active.find(b => b.lastAction && b.lastAction.date), words = longDay(sample.lastAction.date);
    id('legStateSelect').value = ''; id('legStateSelect').dispatchEvent(new w.Event('change', { bubbles: true }));
    const box = id('legSearch'); box.value = words; box.dispatchEvent(new w.Event('input', { bubbles: true }));
    await wait(260);
    const wantAtLeast = active.filter(b => b.lastAction && b.lastAction.date === sample.lastAction.date).length, got = Number((/^([\d,]+) of /.exec(id('legResultLine').textContent) || [])[1].replace(/,/g, ''));
    ok(`searching a Last action date written as the page writes it ("${words}") finds at least every bill last acted on that day (${wantAtLeast})`, got >= wantAtLeast && wantAtLeast >= 1, `${got} / ${wantAtLeast}`);
    box.value = ''; box.dispatchEvent(new w.Event('input', { bubbles: true }));
  }

  /* ── a bill whose veto stands is not listed ───────────────────────────────────────────────────────────────────────────────────────── *
     Found 2026-11-23 by a scan of the page's data: California's SB 7 and SB 11 were at Passed both chambers with "Veto sustained." as their last action, SB 903 with "Consideration of Governor's veto pending.",
     and New York's A 3411 (vetoed, then "TABLED", which does not even say veto) as well. The stage rule (os_stage in tools/legislation.py) only looked at a bill's LAST action, so a veto hid behind any later line
     Open States gives no class. It now reads a veto wherever it sits (os_veto_stands): a bill whose veto stands is failed, which the page never lists. These run on the shipped bills, so they fail if the data is
     built by a rule that lets a vetoed bill through. (The rule itself is tested in tests/test_legislation.py, including the vetoes that must not end a bill: a conditional one and a line-item one.) */
  {
    const { w, d } = load('index.html', '#legislation', { transform: noActions });
    await settle(10);
    const id = x => d.getElementById(x), ev = (el, type) => el.dispatchEvent(new w.Event(type, { bubbles: true }));
    const bills = JSON.parse(w.eval('JSON.stringify(LEGISLATION_DATA)'));
    const rows = () => [...d.querySelectorAll('#legBillsTable tbody tr')].filter(tr => tr.querySelector('.leg-num')), nums = () => rows().map(tr => tr.querySelector('.leg-num').textContent);
    const pick = (el, v) => { el.value = v; ev(el, 'change'); };
    const VETOED = [['os-ca-4-sb-7', 'California SB 7, veto sustained'], ['os-ca-4-sb-11', 'California SB 11, veto sustained'], ['os-ca-4-sb-903', 'California SB 903, veto pending'], ['os-ny-41-a-3411', 'New York A 3411, vetoed and tabled']];
    ok('the bills a governor vetoed are not in the data the page lists: ' + VETOED.map(v => v[1]).join('; ') + ' (each was at Passed both chambers until the veto rule was fixed)',
       VETOED.every(([vid]) => !bills.some(b => b.id === vid)), VETOED.filter(([vid]) => bills.some(b => b.id === vid)).map(v => v[0]).join());
    ok('and no bill that is not law says "veto" in its last action (a line-item veto leaves a bill enacted; a conditional veto would be the one exception, and is looked at when it comes: the build prints a "veto:" line for it)',
       bills.every(b => b.stage === 'enacted' || !/\bveto/i.test((b.lastAction || {}).text || '')), bills.filter(b => b.stage !== 'enacted' && /\bveto/i.test((b.lastAction || {}).text || '')).map(b => b.id).join());
    // through the page, the way a reader would look for them: the Status menu's Passed both chambers, state by state
    pick(id('legStatus'), 'both-chambers');
    const anywhere = nums();
    pick(id('legStateSelect'), 'CA');
    const ca = nums();
    pick(id('legStateSelect'), 'NY');
    const ny = nums();
    ok('Passed both chambers, for California and for New York, lists none of the four vetoed bills (SB 7, SB 11, SB 903, A 3411), though the stage is not empty: some bill passed both chambers and is listed',
       anywhere.length >= 1 && !ca.some(n => ['SB 7', 'SB 11', 'SB 903'].includes(n)) && !ny.includes('A 3411'), anywhere.join() + ' | CA ' + ca.join() + ' | NY ' + ny.join());
    // and by a search, the way a reader would find a bill that says veto: whatever the page lists for that word is law (the line-item vetoes of the budget bills), with the bills that only lightly mention AI on and off
    pick(id('legStateSelect'), ''); pick(id('legStatus'), '');
    const search = id('legSearch');
    search.value = 'veto'; ev(search, 'input'); await wait(260);
    const byDefault = rows();
    id('legPassing').dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(260);
    const withLight = rows();
    ok('searching "veto" lists only bills that became law: with the bills that only lightly mention AI off (the default) and on, every bill found says Enacted, and with them on the search does find some (so it works)',
       byDefault.every(tr => tr.cells[3].textContent.startsWith('Enacted')) && withLight.length >= 1 && withLight.every(tr => tr.cells[3].textContent.startsWith('Enacted')),
       'default: ' + byDefault.map(tr => tr.querySelector('.leg-num').textContent + ' ' + tr.cells[3].textContent).join(' | ') + ' / with the light ones: ' + withLight.map(tr => tr.querySelector('.leg-num').textContent + ' ' + tr.cells[3].textContent).join(' | '));
  }

  /* ── the Export pill lives in the bills' section only, and the lists' Sort menu falls back under a Status order ──────────────────────── */
  for (const [route, name] of [['all', 'All'], ['legislation', 'Legislation'], ['enforcement', 'Enforcement'], ['cases', 'Cases']]) {
    const { w, d } = load('index.html', '#legislation');
    await settle(10);
    const id = x => d.getElementById(x);
    id('legSort').value = 'status'; id('legSort').dispatchEvent(new w.Event('change', { bubbles: true }));
    id('govSwitch' + name).dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await settle(5);
    const shown = el => { for (let n = el; n && n !== d.body; n = n.parentElement) if (w.getComputedStyle(n).display === 'none') return false; return true; };
    const leg = route === 'all' || route === 'legislation';
    ok(`${name}: the Export to CSV pill is ${leg ? 'showing, with the bills\' table' : 'not showing: there is no bills\' table in this section'}`, shown(id('legExport')) === leg, route);
    if (!leg) ok(`${name}: the lists' Sort menu shows Most recent while the bills' Status order is chosen, since a list has no stage to order by, and the one setting is kept for when the bills come back`, id('enfSort').value === 'recent' && id('legSort').value === 'status' && id('legResetText').textContent.startsWith('Reset all ('), id('enfSort').value + ' ' + id('legSort').value);
    if (route === 'all') {
      const acts = JSON.parse(w.eval('JSON.stringify(LEGISLATION_ACTIONS)')).filter(a => a.kind === 'enforcement').sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title)).slice(0, 10).map(a => a.id).join();
      ok('All: the bills\' Status order is the tab\'s order, and its lists, which have no stage to order by, list the most recent first', id('legSort').value === 'status' && [...id('enfLists').querySelectorAll('section[data-kind="enforcement"] tbody tr')].map(tr => tr.getAttribute('data-id')).join() === acts, acts);
    }
  }
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

/* ── policy cards: text synced from a Google Doc ────────────────────────────────────────────────────────────
   The words of a card are written in its Google Doc and carried by tools/policy_docs.py into data/policy-text.js (generated, never
   hand-edited), which the page lays over the hand-kept POLICY_DATA (src/js/00-state.js). The fixtures are the pilot card's Word
   export run through the tool, and what the Doc says section by section, read from the Doc itself (tests/test_policy_docs.py proves
   both are current). What is proved here is what only the page can show: that the browser's own HTML parser turns the generated
   strings back into exactly the Doc's paragraphs, bullets, links and characters; that every field the Doc does not carry is
   untouched (the other cards too); and that a bad entry cannot break the page. */
const syncedTextTests = async () => {
  const fs = require('fs'), path = require('path');
  const FIX = path.join(__dirname, 'fixtures', 'policy-docs');
  const text = fs.readFileSync(path.join(FIX, 'ui-reform-policy-text.js'), 'utf8');
  const doc = JSON.parse(fs.readFileSync(path.join(FIX, 'ui-reform-doc-sections.json'), 'utf8'));
  const SYNCED = ['title', 'summary', 'rationale', 'strengths', 'risks', 'landscape', 'references', 'docModified', 'docUpdated'];
  const inlined = f => f.replace(/<\/script/gi, '<\\/script');
  const shipped = inlined(fs.readFileSync(path.join(__dirname, '..', 'data', 'policy-text.js'), 'utf8'));
  // lay another POLICY_TEXT over the page, in place of the shipped file (a function replacer: the text has $ in it)
  const swap = file => html => {
    if (!html.includes(shipped)) throw new Error('data/policy-text.js is not inlined as the test expects');
    return html.replace(shipped, () => inlined(file));
  };
  const open = async (id, opts) => {
    const pg = load('index.html', '#policy', opts);
    pg.w.location.hash = '#policy/' + id;
    await settle(5);
    return pg;
  };
  const label = (d, t) => [...d.querySelectorAll('#polModalBody .pol-modal-label')].find(l => l.textContent.trim() === t);
  const proseOf = el => {            // paragraphs and bullets, read the way a person reads the DOM
    const out = []; let cur = null;
    for (const n of el.childNodes) {
      if (n.nodeName === 'UL') { if (cur !== null) { out.push(['p', cur]); cur = null; } for (const li of n.children) out.push(['li', li.textContent]); }
      else if (n.nodeName === 'BR') { if (cur !== null) { out.push(['p', cur]); cur = null; } }
      else cur = (cur === null ? '' : cur) + n.textContent;
    }
    if (cur !== null) out.push(['p', cur]);
    return out;
  };
  const itemsAfter = l => [...l.parentElement.querySelectorAll('li')].map(li => li.textContent);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const firstDiff = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return `#${i}: ${JSON.stringify(a[i])} vs ${JSON.stringify(b[i])}`; return ''; };
  // every field of a card except the ones a Doc supplies, as one string (so no field is named here)
  const rest = (w, id) => w.eval(`JSON.stringify(Object.fromEntries(Object.entries(POLICY_DATA.find(p => p.id === ${JSON.stringify(id)})).filter(([k]) => !${JSON.stringify(SYNCED)}.includes(k))))`);

  // the page as it is with NO card synced (an empty POLICY_TEXT laid over the shipped file), whatever data/policy-text.js holds: the checks
  // below compare a synced card with the same card unsynced, so they must not depend on which cards are synced when the tests run
  const base = await open('ui-reform', { transform: swap('const POLICY_TEXT = {};') });
  const shippedPage = await open('ui-reform');
  const baseInteracts = base.d.querySelectorAll('#polModalBody .pol-rel-item').length;
  const baseRest = rest(base.w, 'ui-reform');
  const baseOther = base.w.eval('JSON.stringify(POLICY_DATA.filter(p => p.id !== "ui-reform"))');
  ok('the shipped data/policy-text.js is a file the page can load (a POLICY_TEXT object)', shippedPage.w.eval('typeof POLICY_TEXT') === 'object' && shippedPage.errors.length === 0, shippedPage.errors[0]);

  const pg = await open('ui-reform', { transform: swap(text) });
  const { w, d } = pg;
  ok('a synced card opens with no console errors', pg.errors.length === 0, pg.errors[0]);
  ok('the dialog title is the Doc\'s title line', d.getElementById('polModalTitle').textContent === doc.title, d.getElementById('polModalTitle').textContent);
  for (const [lab, field] of [['What it is', 'summary'], ['The challenge', 'rationale'], ['Precedents & landscape', 'landscape']]) {
    const got = proseOf(label(d, lab).parentElement.querySelector('.pol-modal-text'));
    ok(`${field}: the page shows the Doc's paragraphs and bullets, character for character`, same(got, doc[field]), firstDiff(got, doc[field]));
  }
  for (const [lab, field] of [['Strengths', 'strengths'], ['Risks', 'risks']]) {
    const got = itemsAfter(label(d, lab));
    ok(`${field}: the page shows the Doc's bullets, character for character`, same(got, doc[field]), firstDiff(got, doc[field]));
  }
  const refs = itemsAfter(label(d, 'References'));
  ok('References: a section of their own, listed as the Doc wrote them', same(refs, doc.references), firstDiff(refs, doc.references));
  ok('the References section comes after the card text and before the Last reviewed line',
     (() => { const secs = [...d.querySelectorAll('#polModalBody > *')]; const i = secs.indexOf(label(d, 'References').parentElement), land = secs.indexOf(label(d, 'Precedents & landscape').parentElement), rev = secs.findIndex(e => e.classList.contains('pol-modal-lastreviewed')); return i > land && (rev < 0 || i < rev); })());
  const holders = [...d.querySelectorAll('#polModalBody .pol-modal-text, #polModalBody .pol-modal-list')];   // where a card's own words sit
  const anchors = holders.flatMap(h => [...h.querySelectorAll('a[href]')]);
  ok('every link in the Doc is a real link with its own address and text, in order', same(anchors.map(a => [a.textContent, a.getAttribute('href')]), doc.links),
     firstDiff(anchors.map(a => [a.textContent, a.getAttribute('href')]), doc.links));
  ok('every such link opens in a new tab without handing over the opener', anchors.length > 0 && anchors.every(a => a.getAttribute('target') === '_blank' && a.getAttribute('rel') === 'noopener noreferrer'));
  ok('the synced text has no citation markers and no script in it', !/\{\{|<script|onclick=|javascript:/i.test(holders.map(h => h.innerHTML).join(' ')));
  ok('the bullets in the summary are a real list inside the text block', d.querySelectorAll('#polModalBody .pol-modal-text ul > li').length >= 3);
  ok('what the Doc does not carry is untouched: the dialog\'s other sections show as before, and so does every other field of the card',
     d.querySelectorAll('#polModalBody .pol-rel-item').length === baseInteracts && rest(w, 'ui-reform') === baseRest && baseRest.length > 20);
  // the date line: the Doc's last-modified day replaces "Last reviewed", for a card that has a Doc and for no other
  const fmt = day => new Date(day + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const dateLine = dd => (dd.querySelector('#polModalBody .pol-modal-lastreviewed') || {}).textContent;
  ok('a card with no Doc shows no date line, and never the old "Last reviewed"',
     dateLine(base.d) === undefined && !/Last reviewed|Last updated/i.test(base.d.getElementById('polModalBody').textContent), String(dateLine(base.d)));
  ok('a synced card says "Last updated" with the day its Doc was last modified, in the dialog\'s own date format',
     dateLine(d) === 'Last updated: ' + fmt(doc.docUpdated) && !!doc.docUpdated, String(dateLine(d)));
  ok('the date line is the last thing in the dialog, below the References', d.getElementById('polModalBody').lastElementChild === d.querySelector('#polModalBody .pol-modal-lastreviewed'));
  ok('the other cards are untouched', w.eval('JSON.stringify(POLICY_DATA.filter(p => p.id !== "ui-reform"))') === baseOther);

  // "Copy as draft" keeps the bullets, the links and the escaped characters; its References sit under Precedents
  let copied = null;
  w.HTMLTextAreaElement.prototype.select = function () { copied = this.value; };
  w.document.execCommand = () => true;
  d.getElementById('polCopyDraft').click();
  ok('"Copy as draft" writes the bullets as a list and the links as Markdown links, with no HTML left in them',
     !!copied && /\n- Expanding eligibility/.test(copied) && /\[eliminating 10 to 15% of U\.S\. jobs\]\(https:\/\/www\.bcg\.com\//.test(copied) &&
     !/<\/?(ul|li|a|strong|br)\b/i.test(copied), (copied || '').slice(0, 300));
  ok('"Copy as draft" ends its footer with "Last updated" and the Doc\'s day, never "Last reviewed"',
     !!copied && copied.includes('. Last updated ' + fmt(doc.docUpdated) + '.*') && !/Last reviewed/.test(copied), (copied || '').slice(0, 400));
  let baseCopied = null;
  base.w.HTMLTextAreaElement.prototype.select = function () { baseCopied = this.value; };
  base.w.document.execCommand = () => true;
  base.d.getElementById('polCopyDraft').click();
  ok('"Copy as draft" of a card with no Doc has no date in its footer', !!baseCopied && !/Last (updated|reviewed)/.test(baseCopied), (baseCopied || '').slice(0, 400));
  ok('"Copy as draft" lists the References under Precedents, as ### References (not ## References: the page tests forbid that list)',
     !!copied && /\n### References\n\n- New Jersey Legislature\./.test(copied), (copied || '').slice(-400));

  // a bad or partial entry cannot break the page
  const nasty = 'const POLICY_TEXT = ' + JSON.stringify({
    'wage-insurance': { summary: 'Tom &amp; Jerry &lt;b&gt;x&lt;/b&gt; 1 &lt; 2 \u2014 \u201cquoted\u201d $5 \\ done' },
    'ui-reform': { title: 'Only a new title' },
    'no-such-card': { title: 'Nobody', summary: 'x' },
    '__proto__': { title: 'x' },
  }) + ';';
  const odd = await open('wage-insurance', { transform: swap(nasty) });
  ok('a synced summary with & < > quotes, a dash, a dollar sign and a backslash shows exactly those characters',
     odd.d.querySelector('#polModalBody .pol-modal-text').textContent === 'Tom & Jerry <b>x</b> 1 < 2 \u2014 \u201cquoted\u201d $5 \\ done', odd.d.querySelector('#polModalBody .pol-modal-text').textContent);
  ok('a partial entry replaces only the fields it has', odd.w.eval('(p => p.title === "Only a new title" && p.summary.length > 40 && p.strengths.length > 0)(POLICY_DATA.find(p => p.id === "ui-reform"))'));
  ok('an entry for an id that is not a card is ignored, and a card with no entry keeps its text',
     odd.w.eval('POLICY_DATA.length') === base.w.eval('POLICY_DATA.length') && !odd.w.eval('POLICY_DATA.some(p => p.title === "Nobody")') && odd.errors.length === 0, odd.errors[0]);
};

/* ── lazy payload ───────────────────────────────────────────────────────────
   The Fact Bank data is fetched on first open rather than at page load. Assert
   both halves: absent at load, and present and rendered after the view is
   opened. Without the disk interceptor in dom.js this would silently no-op, so
   the "absent at load" half guards against a test that passes for the wrong
   reason. */
(async () => {
  await legislationTests();
  await govBillsTests();
  await legislationLoadTests();
  if (compareAddressTests) await compareAddressTests();   // the Compare checks that wait for the browser's Back or a typed address (set up in the Compare block)
  if (linksAddressTests) await linksAddressTests();   // the Links checks that wait for the browser's Back or a typed address (set up in the Links address block)
  await syncedTextTests();
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
    const facts = row => ({ layout: kids(row), aboveButtons: !!row.querySelector('.src-body > .src-chips + .src-actions'), labels: [...row.querySelectorAll('.src-chips .src-chip')].map(c => c.dataset.kind).join(), facts: row.querySelectorAll('.src-chips .src-chip').length, published: [...row.querySelectorAll('.src-chips .src-chip')].some(c => c.dataset.kind === 'Published'), buttons: [...row.querySelectorAll('.src-actions .cite-act')].map(b => b.textContent.trim()).join(' | '), side: !!row.querySelector('.src-side'), detail: !!row.querySelector('.src-detail') });
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
    ok('every open row shows its text, with the details pills (Category, Methodology, Region) directly above the buttons, then Open source and Copy summary + citation',
       [...pilot, facts(plain)].every(p => p.layout === 'src-text,src-chips,src-actions' && p.aboveButtons && /^Category,Methodology,Region$/.test(p.labels) && /^(Open source ↗ \| )?Copy summary \+ citation$/.test(p.buttons) && !p.side && !p.detail));
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
