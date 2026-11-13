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
const ok = (name, cond, detail) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (cond || !detail ? '' : '\n           ' + detail));
  if (!cond) failed++;
};

const wait = ms => new Promise(r => setTimeout(r, ms));
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
    ['viewLegislation', 'legislation', '#legislation'],
    ['viewEnforcement', 'enforcement', '#enforcement'],
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

/* ── the grouped nav and the front page ───────────────────────────────────
   The header nav is three labelled groups: Research (Fact Bank, Papers: alphabetical), Policy (Agenda, a placeholder, then Landscape) and
   Government action (Enforcement, a placeholder, then Legislation: the group of its own that Legislation became on 2026-11-12, when it left Policy, named that evening). About has no door
   cards: it sets out the three names as sections, each opening with the question it answers and then what the dashboard offers for it. The Research and Policy copy is the owner's own and is
   guarded below; the Government action section (added 2026-11-12 at the owner's request, after the owner asked for About to carry the day's work) is drafted copy for the owner to edit. */
{
  const { w, d } = load('index.html', '#about');
  const groups = [...d.querySelectorAll('.header-tabs > .tab-group')].map(g =>
    `${g.dataset.group}:${g.querySelector('.tab-group-label').textContent.trim()}:` +
    [...g.querySelectorAll('.tab-group-btns > .header-nav-btn')].map(b => b.id).join('+'));
  ok('the nav is three labelled groups: Research (Fact Bank, Papers), Policy (Agenda, Landscape) and Government action (Enforcement, Legislation)',
     groups.join() === 'research:Research:viewFactBank+viewCards,policy:Policy:viewAgenda+viewPolicy,government:Government action:viewEnforcement+viewLegislation', groups.join());
  ok('the tabs read Fact Bank, Papers, Agenda, Landscape, Enforcement, Legislation',
     [...d.querySelectorAll('.header-nav-btn')].map(b => b.textContent.trim()).join() === 'Fact Bank,Papers,Agenda,Landscape,Enforcement,Legislation');
  ok('the tabs of each group are in alphabetical order',
     [...d.querySelectorAll('.tab-group')].every(g => {
       const names = [...g.querySelectorAll('.header-nav-btn')].map(b => b.textContent.trim());
       return names.join() === [...names].sort().join();
     }));
  ok('the group labels are for the eye (aria-hidden), and the tabs that would not make sense on their own (Agenda, Landscape, Enforcement) carry a fuller accessible name that still contains the visible text, and Legislation is clear alone (it has none)',
     [...d.querySelectorAll('.tab-group-label')].every(l => l.getAttribute('aria-hidden') === 'true') &&
     ['viewAgenda', 'viewPolicy', 'viewEnforcement'].every(id => {
       const b = d.getElementById(id);
       return b.getAttribute('aria-label').toLowerCase().includes(b.textContent.trim().toLowerCase());
     }) &&
     ['viewAgenda', 'viewPolicy', 'viewEnforcement'].map(id => d.getElementById(id).getAttribute('aria-label')).join() === 'Policy agenda,Policy landscape,Enforcement actions and key cases' &&
     !d.getElementById('viewLegislation').hasAttribute('aria-label'));
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
  ok('each section ends with links to the tabs it describes: Research to the Fact Bank and Papers, Policy to Landscape, Government action to Enforcement and Legislation (Agenda is a placeholder with nothing to say yet, so it is not linked)',
     labelled.length === 3 && labelled.every(sec => sec.lastElementChild.matches('.about-links')) &&
     labelled.map(sec => [...sec.querySelectorAll('.about-links a')].map(a => a.getAttribute('href')).join()).join('|') === '#fact-bank,#papers|#policy|#enforcement,#legislation');
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
  ok('the Government action section names the sources behind the Legislation tab (the Brennan Center, GovInfo, Open States and the Associated Press), says the topics are our reading and the federal summaries were written with the help of AI, and states no number that the page computes and would let go stale',
     !!govSec && ['Brennan Center', 'GovInfo', 'Open States', 'Associated Press'].every(n => govSec.querySelector('.about-note').textContent.includes(n)) &&
     /Topics are our reading/.test(govSec.querySelector('.about-note').textContent) && /written with the help of AI/.test(govSec.querySelector('.about-note').textContent) &&
     !/\d/.test(govSec.textContent.replace('2026', '')), govSec && govSec.textContent);
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

/* ── Enforcement: a placeholder tab, first in the Government action group ───────────────────────────────────────────
   It opens, asks its question, says it is coming (enforcement actions and key cases), and shows one note: nothing is here yet, with a link to Legislation (#legislation).
   Nothing is behind it, and it does not ask for the bills file. */
{
  const { w, d } = load('index.html', '#enforcement');
  ok('#enforcement opens the enforcement view', bodyView(d) === 'enforcement', `body view was ${bodyView(d)}`);
  ok('#enforcement keeps its address bar', w.location.hash === '#enforcement', `hash was ${w.location.hash}`);
  const btn = d.getElementById('viewEnforcement');
  ok('#enforcement marks the Enforcement button active, and not Legislation, and the panel is labelled by it',
     btn.classList.contains('active') && btn.getAttribute('aria-selected') === 'true' && !d.getElementById('viewLegislation').classList.contains('active') &&
     d.getElementById('viewPanel').getAttribute('aria-labelledby') === 'viewEnforcement');
  ok('the masthead asks a question and says enforcement actions and key cases are coming soon',
     d.getElementById('headerTabDescLede').textContent.trim().endsWith('?') && /coming soon/i.test(d.getElementById('headerTabDescText').textContent) && /enforcement actions and key cases/i.test(d.getElementById('headerTabDescText').textContent));
  const note = d.querySelector('#enforcementArea .placeholder-note');
  ok('the placeholder says nothing is here yet and links to Legislation (#legislation)',
     !!note && /nothing is here yet/i.test(note.textContent) && note.querySelector('a').getAttribute('href') === '#legislation');
  ok('it is a view of its own and asks for no bills: the legislation view class is off and the bills file has not been asked for',
     !d.body.classList.contains('legislation-view') && d.getElementById('legislationArea').getAttribute('data-bills') === 'idle', d.body.className);
  ok('the screen reader announcement names the view', d.getElementById('viewAnnounce').textContent === 'Enforcement actions and key cases view');
}

/* ── the Landscape masthead: its counts come from the data ────────────────────
   The map's masthead says how many policies it lists and in how many areas. Those figures are computed from the data the
   map is drawn from (they were typed once as "Twenty-seven" and went stale at 32), so the masthead is checked against what
   the page actually lists. A masthead without the count sentence, such as the agenda's when that half is shown, passes. */
{
  const { d } = load('index.html', '#policy');
  const ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' ');
  const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
  const num = word => { word = word.toLowerCase(); if (ONES.includes(word)) return ONES.indexOf(word); const [t, o] = word.split('-'); return (TENS[t] || NaN) + (o ? ONES.indexOf(o) : 0); };
  const text = d.getElementById('headerTabDescText').textContent;
  const m = /^(\S+) policy interventions grouped into (\S+) policy areas/.exec(text);
  const listed = d.querySelectorAll('#policyArea .pol-item-wrap').length, rows = d.querySelectorAll('#policyArea .pol-cat-row').length;
  ok('the Landscape masthead counts the policies the map lists and the areas it draws them in', !m || (num(m[1]) === listed && num(m[2]) === rows && listed > 0), `${text} | listed ${listed} in ${rows} rows`);
}

/* ── policy cards: no paper listed twice ────────────────────────────────────
   A card's Research basis lists a paper once (a paper that is both a curated POLICY_SOURCES entry and a live tracker entry used
   to appear again under "related"), and "Copy as draft" lists each reference once (a paper that was both a numeric paperId and
   a {{cite}} token used to appear twice). Checked on every policy. */
(async () => {
  const { w, d } = load('index.html', '#policy');
  let copied = null;
  w.HTMLTextAreaElement.prototype.select = function () { copied = this.value; };
  w.document.execCommand = () => true;
  const ids = w.eval('POLICY_DATA.map(p => p.id)');
  const dupBasis = [], dupRefs = [];
  for (const id of ids) {
    w.location.hash = '#policy/' + id;
    await settle(5);
    const hrefs = [...d.querySelectorAll('#polModal .pol-basis-ref')].map(a => a.getAttribute('href')).filter(Boolean);
    if (new Set(hrefs).size !== hrefs.length) dupBasis.push(id);
    copied = null;
    const btn = d.getElementById('polCopyDraft');
    if (btn) btn.click();
    const refs = ((copied || '').split('## References')[1] || '').split('\n').filter(l => l.startsWith('- '));
    if (new Set(refs).size !== refs.length) dupRefs.push(id);
  }
  ok('no policy card lists a paper twice in its Research basis', dupBasis.length === 0, dupBasis.join(', '));
  ok('"Copy as draft" lists each reference once on every policy', dupRefs.length === 0, dupRefs.join(', '));
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

/* ── Legislation: a map of the states, a panel that follows the pointer, and two tables ─────────────────────────
   The tab opens; its masthead says what is loaded, from the data; the map draws all 50 states and DC; pointing at a state shows it
   in the panel; clicking pins it and narrows both tables. The bills (federal ones from the Brennan Center and GovInfo, state ones from Open States) are a
   file of their own, fetched when the tab first opens, so every test here waits for them. The midterm results (Senate, House,
   governor) come from the Associated Press's pages and are cited in every row and below the map. Part A checks the shipped bills
   and the view the tab opens on, part B the midterm results layer, part C paging, the hover panel's cap, the territories and each
   layer's sources, and part D the bill paths with five test bills of its own (the real ones are set aside and put back), so that
   what counts as active (introduced and not failed) and what is left out are both checked. */
const legislationTests = async () => {
  const { w, d } = load('index.html', '#legislation');
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
  const nBills = w.eval('LEGISLATION_DATA.filter(b => !b.passing).length'), nPassing = w.eval('LEGISLATION_DATA.filter(b => b.passing).length'), nFed = w.eval("LEGISLATION_DATA.filter(b => b.level === 'federal').length"), nState = nBills - nFed;
  const countOf = code => w.eval(`LEGISLATION_DATA.filter(b => b.level === 'state' && b.state === '${code}' && !b.passing).length`);
  const counts = JSON.parse(w.eval("(() => { const c = {}; LEGISLATION_DATA.forEach(b => { if (b.level === 'state' && !b.passing && US_MAP.states[b.state]) c[b.state] = (c[b.state] || 0) + 1; }); return JSON.stringify(c); })()"));
  const nTerritory = w.eval("LEGISLATION_DATA.filter(b => b.level === 'state' && !b.passing && !US_MAP.states[b.state]).length");
  const feeds = JSON.parse(w.eval('JSON.stringify(LEGISLATION_FEEDS)'));
  const PAGE = 10, pagesOf = n => Math.max(1, Math.ceil(n / PAGE));   // the bills table's page (LEG_PAGE_SIZE); the Papers list and the Fact Bank keep fifty
  const RPAGE = 10, rpagesOf = n => Math.max(1, Math.ceil(n / RPAGE));   // the results table's page (LEG_RESULTS_PAGE_SIZE): states to a page
  // The pointer leaving the map: with nothing pinned the card stays on the state last pointed at for LEG_CARD_GRACE ms (so the pointer can reach its link), so a test that wants the card
  // back at the overview waits that long.
  const GRACE = 450, leaveMap = async () => { d.getElementById('legMap').dispatchEvent(new w.MouseEvent('mouseleave', { bubbles: true })); await wait(GRACE + 80); };
  const joinAnd = l => l.length > 2 ? l.slice(0, -1).join(', ') + ' and ' + l[l.length - 1] : l.join(' and ');
  const names = Object.values(feeds).map(f => f.short || f.org), joinNames = names.length > 2 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names.join(' and ');

  /* ── A. the shipped bills, and the view the tab opens on ─────────────────────────────────────────────────── */
  ok('#legislation opens the legislation view', bodyView(d) === 'legislation', `body view was ${bodyView(d)}`);
  ok('#legislation keeps its address bar', w.location.hash === '#legislation', `hash was ${w.location.hash}`);
  const btn = d.getElementById('viewLegislation');
  ok('#legislation marks the Legislation button active, and not Landscape',
     btn.classList.contains('active') && btn.getAttribute('aria-selected') === 'true' && !d.getElementById('viewPolicy').classList.contains('active'));
  ok('the screen reader announcement names the view', d.getElementById('viewAnnounce').textContent === 'Legislation view');
  ok('the bills are loaded: the federal ones from the Brennan Center (each with its record from GovInfo), the state ones from Open States, as many as each says it holds, and from nobody else',
     area.getAttribute('data-bills') === 'ready' && nBills > 0 && nFed === feeds.brennan.included && nState === feeds.openstates.included &&
     w.eval("LEGISLATION_DATA.every(b => b.source && /^https?:\\/\\//.test(b.source.url) && (b.level === 'federal' ? ['Congress.gov', 'Bill text'].includes(b.source.label) : ['Legislature', 'Open States'].includes(b.source.label)))"),
     `${nFed} federal of ${feeds.brennan.included}, ${nState} state of ${feeds.openstates.included}`);
  ok('every bill is well formed: a unique id, a place the page knows (a state on the map, a territory, or Congress), a stage that counts as active, and no account token anywhere (the links to a legislature and to Open States carry none)',
     w.eval("new Set(LEGISLATION_DATA.map(b => b.id)).size === LEGISLATION_DATA.length && LEGISLATION_DATA.every(b => b.level === 'federal' || US_MAP.states[b.state] || LEGISLATION_TERRITORIES[b.state]) && LEGISLATION_DATA.every(b => LEGISLATION_STAGES[b.stage] && LEGISLATION_STAGES[b.stage].active)") &&
     !w.eval('/statenet|ciq=|client_md|urn:user/i.test(JSON.stringify(LEGISLATION_DATA) + JSON.stringify(LEGISLATION_FEEDS))'));
  ok('each federal bill has a summary in our own words and its Congress, each one with a number has its official last action (from GovInfo), and each state bill its session and its official title (and its last action, when it has one)',
     w.eval("LEGISLATION_DATA.filter(b => b.level === 'federal').every(b => b.summary && b.session === '119th Congress')") &&
     w.eval("LEGISLATION_DATA.filter(b => b.level === 'federal' && b.lastAction && b.lastAction.date && b.lastAction.text).length") === feeds.govinfo.included &&
     w.eval("LEGISLATION_DATA.filter(b => b.level === 'state').every(b => typeof b.session === 'string' && b.title && (!b.lastAction || b.lastAction.date))"));
  ok('no bill\'s last action is dated in the future: a scheduled effective date is not an action taken, and as the "last action" it would sort the bill to the top by recency (one day of slack for the time zone)',
     w.eval("(() => { const t = new Date(Date.now() + 86400000).toISOString().slice(0, 10); return LEGISLATION_DATA.every(b => !b.lastAction || !b.lastAction.date || b.lastAction.date <= t); })()"),
     w.eval("LEGISLATION_DATA.filter(b => b.lastAction && b.lastAction.date > new Date(Date.now() + 86400000).toISOString().slice(0, 10)).map(b => b.bill + ' ' + b.lastAction.date).join()"));
  ok('where the note says a legislature\'s own summary was read from its site (Illinois), every one of that state\'s bills carries it: run tools/state_summaries.py, then the build, when this fails',
     !/Illinois/.test(feeds.openstates.summaries || '') || w.eval("LEGISLATION_DATA.filter(b => b.state === 'IL').every(b => b.summary && b.summary.length > 20)"),
     w.eval("LEGISLATION_DATA.filter(b => b.state === 'IL' && !b.summary).map(b => b.bill).join()"));
  ok('the masthead asks a question, counts the bills from the data, says where they come from, and says the same in digits throughout',
     d.getElementById('headerTabDescLede').textContent.trim().endsWith('?') &&
     mastheadText().startsWith(`${num(nBills)} active bills: ${num(nState)} in `) && mastheadText().includes(`and ${num(nFed)} in Congress, from ${joinNames}.`), mastheadText());
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
  ok('there are two views, 2026 Midterm results and Bills (the two layers of the map), and the 2026 Midterm results layer chooses between the Senate, the House and governors',
     d.getElementById('legLayerResults').textContent === '2026 Midterm results' && d.getElementById('legLayerBills').textContent === 'Bills' && !d.getElementById('legLayerUseCases') && !d.getElementById('legUseCases') &&
     [...d.querySelectorAll('.leg-controls button[data-layer]')].map(b => b.textContent).join() === '2026 Midterm results,Bills' && d.querySelector('.leg-controls [role="group"]').getAttribute('aria-label') === 'View' &&
     [...d.querySelectorAll('#legOfficeToggle button')].map(b => b.textContent).join() === 'Senate,House,Governor');
  ok('the Bills section has no word Bills in its title: the title is the jurisdiction and the count, the section is still named Bills for a screen reader, and the results section keeps its own title',
     d.getElementById('legBillsTitle').textContent.trim() === `All jurisdictions · ${num(nBills)} bills` && d.getElementById('legBillsTitle').textContent.trim() === d.getElementById('legBillsScope').textContent.trim() &&
     d.getElementById('legBillsSection').getAttribute('aria-label') === 'Bills' && !d.getElementById('legBillsSection').hasAttribute('aria-labelledby') &&
     /^2026 Midterm results/.test(d.getElementById('legResultsTitle').textContent.trim()), d.getElementById('legBillsTitle').textContent);
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
  const stickyBar = d.getElementById('legSticky');
  ok('the toolbar (the layers, the office toggle, the Show menu, Clear) and the search and filter bar stick together at the top of the window, as the bars on Papers and the Fact Bank do: one sticky wrapper holds both, the shared bar is not sticky on its own inside it, and a title jumped to keeps clear of them',
     !!stickyBar && stickyBar.contains(d.querySelector('.leg-controls')) && stickyBar.contains(d.getElementById('legFilters')) && stickyBar.parentElement === d.getElementById('legislationArea') &&
     !!d.querySelector('#legSticky .leg-controls #legStateSelect') && !!d.querySelector('#legSticky .leg-controls #legLayerBills') && !!d.querySelector('#legSticky .leg-controls #legOfficeSenate') &&
     /\.leg-sticky\s*\{[^}]*position:\s*sticky;\s*top:\s*0/.test(legCss) && /#legislationArea \.controls\s*\{[^}]*position:\s*static/.test(legCss) &&
     /\.leg-section-title\s*\{\s*scroll-margin-top:\s*calc\(var\(--leg-bar-h,\s*0px\)\s*\+\s*16px\)/.test(legCss) &&
     /^\d+(\.\d+)?px$/.test(d.getElementById('legislationArea').style.getPropertyValue('--leg-bar-h').trim()), d.getElementById('legislationArea').style.getPropertyValue('--leg-bar-h'));
  ok('the toolbar has the layers, the Show menu and (when something is pinned) Clear: no Federal button, since Congress is the Federal entry in the Show menu, and no switch; and the panel says where to find Federal',
     !d.getElementById('legFed') && ![...d.querySelectorAll('.leg-controls button')].some(b => /Federal|Include bills/.test(b.textContent)) && !!d.querySelector('#legStateSelect option[value="federal"]') &&
     /choose Federal in the Show menu/.test(mastheadText()) && /choose Federal in the Show menu/.test(panel()), mastheadText());
  ok('the data covers every race AP lists: 50 states, 35 Senate seats, 36 governor races and all 435 House districts',
     nStates === 50 && races('senate') === 35 && races('governor') === 36 && seats === 435, `${nStates} states, ${races('senate')} Senate, ${races('governor')} governor, ${seats} districts`);
  // the Bills layer: the shading steps are thirds of the states that have bills, and the legend names what each holds
  const readSteps = () => [...d.querySelectorAll('#legLegend .leg-legend-item')].map(i => {
    const sw = i.querySelector('.leg-swatch'), lv = sw && (sw.className.match(/fill-b(\d)/) || [])[1], m = /^([\d,]+)(?: to ([\d,]+))? bills?\b/.exec(i.textContent.trim());
    return lv && m ? { lv: +lv, lo: +m[1].replace(/,/g, ''), hi: +(m[2] || m[1]).replace(/,/g, ''), n: +i.querySelector('.leg-muted-count').textContent } : null;
  }).filter(Boolean);
  const steps = readSteps();
  const stepOf = n => (steps.find(s => n >= s.lo && n <= s.hi) || {}).lv;
  const most = Math.max(...Object.values(counts)), fewest = Math.min(...Object.values(counts));
  const noBills = (() => { const i = [...d.querySelectorAll('#legLegend .leg-legend-item')].find(x => /^No bills/.test(x.textContent.trim())); return i ? +i.querySelector('.leg-muted-count').textContent : 0; })();
  ok('the map opens on the Bills layer, shaded by thirds of the states that have bills: every state is in the step its count falls in, and the legend\'s ranges run from the fewest to the most and account for every state',
     d.getElementById('legMap').getAttribute('data-layer') === 'bills' && d.getElementById('legLayerBills').getAttribute('aria-pressed') === 'true' && steps.length >= 1 && steps.length <= 3 &&
     Object.keys(counts).every(c => new RegExp(`fill-b${stepOf(counts[c])}\\b`).test(path(c).getAttribute('class'))) && steps[0].lo === fewest && steps[steps.length - 1].hi === most &&
     steps.reduce((s, x) => s + x.n, 0) + noBills === 51 && noBills === 51 - Object.keys(counts).length, legend());
  ok('the legend counts the federal bills and the territory bills, which are not on the map', new RegExp(`Federal bills, not on the map\\s*${num(nFed)}`).test(legend()) &&
     (nTerritory ? new RegExp(`Territory bills, not on the map\\s*${num(nTerritory)}`).test(legend()) : !/Territory bills/.test(legend())), legend());
  ok('the small-state buttons are shaded like their states on this layer too: a state with bills, a shade; one without, none', tilesMatch() && tiles.every(b => !!counts[b.textContent] === /fill-b[123]/.test(b.getAttribute('class'))), tiles.map(b => b.textContent + ':' + fillOf(b)).join());
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
  const passNote = n => `${num(n)} more active ${n === 1 ? 'bill mentions' : 'bills mention'} AI only in ${n === 1 ? 'its' : 'their'} text; "Include bills that only mention AI", under More filters, adds ${n === 1 ? 'it' : 'them'}.`;
  ok('a note under the table says what the state list is, how many more bills the search found and why they are left out (not active), and how many more the checkbox under More filters would add',
     d.getElementById('legBillsNote').textContent === `State bills are ${feeds.openstates.scope}. ${feeds.openstates.summaries ? feeds.openstates.summaries + ' ' : ''}Open States found ${joinAnd(feeds.openstates.omitted.filter(o => o.n).map(o => `${num(o.n)} more bills that ${o.why}`))}; none is included.${nPassing ? ` ${passNote(nPassing)}` : ''}`, d.getElementById('legBillsNote').textContent);
  /* the checkbox, under More filters, for the bills that only mention AI in their text */
  const passWrap = d.getElementById('legPassingWrap'), passBox = d.getElementById('legPassing'), pcode = nPassing ? w.eval("LEGISLATION_DATA.find(b => b.passing).state") : '';
  ok('under More filters a checkbox offers the bills that only mention AI in their text, says how many, and starts off: none of them is in the table',
     nPassing > 0 && !passWrap.hidden && !passBox.checked && passBox.type === 'checkbox' && !!passWrap.closest('#legMorePanel') && passWrap.querySelector('.leg-muted-count').textContent === num(nPassing) &&
     !/Mentions AI only in its text/.test(billsTable().textContent), passWrap.textContent);
  const stepsOff = steps.map(x => `${x.lo}-${x.hi}`).join();
  fire(passBox, 'click');
  const onTotal = nBills + nPassing, countsOn = JSON.parse(w.eval("(() => { const c = {}; LEGISLATION_DATA.forEach(b => { if (b.level === 'state' && US_MAP.states[b.state]) c[b.state] = (c[b.state] || 0) + 1; }); return JSON.stringify(c); })()"));
  const stepsOn = readSteps();
  ok('turning it on adds them everywhere at once: the number of bills in the title, the masthead, the map shading and legend (recomputed from the larger counts), and the note',
     passBox.checked && d.getElementById('legBillsScope').textContent === `All jurisdictions · ${num(onTotal)} bills` && mastheadText().startsWith(`${num(onTotal)} active bills`) &&
     stepsOn.length >= 1 && stepsOn[stepsOn.length - 1].hi === Math.max(...Object.values(countsOn)) && stepsOn[0].lo === Math.min(...Object.values(countsOn)) &&
     Object.keys(countsOn).every(c => new RegExp(`fill-b${(stepsOn.find(s => countsOn[c] >= s.lo && countsOn[c] <= s.hi) || {}).lv}\\b`).test(path(c).getAttribute('class'))) &&
     /Bills that mention AI only in their text are included, and marked\./.test(d.getElementById('legBillsNote').textContent), `${stepsOff} -> ${stepsOn.map(x => `${x.lo}-${x.hi}`).join()} | ${mastheadText().slice(0, 60)}`);
  d.getElementById('legStateSelect').value = pcode; d.getElementById('legStateSelect').dispatchEvent(new w.Event('change', { bubbles: true }));
  const pRows = [...billsTable().querySelectorAll('tbody tr')].filter(r => /Mentions AI only in its text/.test(r.textContent)).length, pInState = w.eval(`LEGISLATION_DATA.filter(b => b.level === 'state' && b.state === '${pcode}' && b.passing).length`);
  ok('and each such bill is marked in the table as one that only mentions AI in its text: in a state that has some, as many marked rows as it has such bills (up to the page)',
     pRows === Math.min(pInState, PAGE) && pRows > 0 && d.getElementById('legBillsScope').textContent === `${w.eval(`US_MAP.states.${pcode}.name`)} · ${num(countOf(pcode) + pInState)} ${countOf(pcode) + pInState === 1 ? 'bill' : 'bills'}`, `${pRows} marked of ${pInState}`);
  fire(d.getElementById('legClear'), 'click');
  fire(passBox, 'click');
  ok('turning it off again puts everything back: the count, the masthead, the shading steps and the marks', !passBox.checked &&
     d.getElementById('legBillsScope').textContent === `All jurisdictions · ${num(nBills)} bills` && mastheadText().startsWith(`${num(nBills)} active bills`) && readSteps().map(x => `${x.lo}-${x.hi}`).join() === stepsOff &&
     !/Mentions AI only in its text/.test(billsTable().textContent) && d.getElementById('legBillsNote').textContent.includes(passNote(nPassing)));
  d.getElementById('legStateSelect').value = 'federal'; d.getElementById('legStateSelect').dispatchEvent(new w.Event('change', { bubbles: true }));
  ok('a federal bill shows its title, its bill number and Congress, the Brennan Center\'s labels, its stage and the dates it was introduced, its summary, and a link to Congress.gov',
     (() => { const r = [...billsTable().querySelectorAll('tbody tr')].find(x => /TAKE IT DOWN/.test(x.textContent)) || billsTable().querySelectorAll('tbody tr')[1];
       return /119th Congress/.test(r.textContent) && /Brennan Center labels: /.test(r.textContent) && !!r.querySelector('a[href^="https://"]'); })());
  fire(d.getElementById('legClear'), 'click');

  /* ── B. the midterm results layer ────────────────────────────────────────────────────────────────────────── */
  fire(d.getElementById('legLayerResults'), 'click');
  ok('choosing Midterm results colours the map by the Senate races, and the legend counts come from the data',
     d.getElementById('legMap').getAttribute('data-layer') === 'results' && d.getElementById('legMap').getAttribute('data-office') === 'senate' &&
     new RegExp(`Democratic gain\\s*${cnt('senate', 'd-gain')}`).test(legend()) && new RegExp(`Republican hold\\s*${cnt('senate', 'r-hold')}`).test(legend()) &&
     new RegExp(`Uncalled\\s*${cnt('senate', 'uncalled')}`).test(legend()) && new RegExp(`No 2026 Senate race\\s*${51 - races('senate')}`).test(legend()), legend());
  ok('the buttons wear their states\' colours: on the Senate layer New Hampshire is a Democratic hold and Vermont, which has no Senate race, has none',
     tilesMatch() && /fill-d-hold/.test(tile('NH').getAttribute('class')) && !/fill-/.test(tile('VT').getAttribute('class')), tiles.map(b => b.textContent + ':' + fillOf(b)).join());
  fire(d.getElementById('legOfficeHouse'), 'click');
  ok('choosing House colours each state by which party won more of its seats, and the legend counts them',
     d.getElementById('legMap').getAttribute('data-office') === 'house' && new RegExp(`Democrats won more seats\\s*${houseStates('d')}`).test(legend()) &&
     new RegExp(`Republicans won more seats\\s*${houseStates('r')}`).test(legend()) && new RegExp(`Split evenly\\s*${houseStates('even')}`).test(legend()) &&
     /fill-h-d/.test(path('CA').getAttribute('class')) && /fill-h-r/.test(path('TX').getAttribute('class')) && /fill-h-even/.test(path('WI').getAttribute('class')), legend());
  ok('the buttons follow the House layer too: each small state\'s delegation went to Democrats, and its button says so', tilesMatch() && tiles.every(b => b.textContent === 'DC' || /fill-h-d/.test(b.getAttribute('class'))) && !/fill-/.test(tile('DC').getAttribute('class')),
     tiles.map(b => b.textContent + ':' + fillOf(b)).join());
  fire(d.getElementById('legOfficeGovernor'), 'click');
  ok('choosing Governor colours the 36 states with a governor race, and the rest are marked as having none',
     d.getElementById('legMap').getAttribute('data-office') === 'governor' && /fill-d-gain/.test(path('TX').getAttribute('class')) && /fill-r-hold/.test(path('FL').getAttribute('class')) &&
     !/fill-/.test(path('MT').getAttribute('class')) && new RegExp(`No 2026 governor race\\s*${51 - races('governor')}`).test(legend()), legend());
  ok('and the Governor layer: New Hampshire and Vermont are Republican holds, Maryland a Democratic hold, and New Jersey and Delaware, with no governor race, have none',
     tilesMatch() && /fill-r-hold/.test(tile('NH').getAttribute('class')) && /fill-r-hold/.test(tile('VT').getAttribute('class')) && /fill-d-hold/.test(tile('MD').getAttribute('class')) &&
     !/fill-/.test(tile('NJ').getAttribute('class')) && !/fill-/.test(tile('DE').getAttribute('class')), tiles.map(b => b.textContent + ':' + fillOf(b)).join());
  fire(d.getElementById('legOfficeSenate'), 'click');
  const mapSource = d.getElementById('legMapSource'), links = [...mapSource.querySelectorAll('a')].map(a => a.getAttribute('href'));
  ok('on this layer the source is cited in a line directly below the map, with a link to AP\'s midterm results page, the one source for the Senate, the House and governors, and nothing else',
     d.getElementById('legLegend').nextElementSibling === mapSource && /^Source: The Associated Press, “2026 Midterm Election Results: Senate, House and Governor Races”/.test(mapSource.textContent) &&
     links.length === 1 && links[0] === AP && !/U\.S\. Senate Election Results/.test(mapSource.textContent), mapSource.textContent);
  fire(path('TX'), 'mouseover');
  ok('pointing at Texas shows its Senate, House and governor results, with no source line and no links: AP is cited under the map and in the results table',
     /Texas/.test(panel()) && /SenateDemocratic gain/.test(panel()) && /HouseDemocrats 14, Republicans 24/.test(panel()) && /GovernorDemocratic gain/.test(panel()) &&
     !/Source/.test(panel()) && !d.querySelector('#legPanel a'), panel());
  ok('the pointed-at state is outlined', d.getElementById('legRingHover').getAttribute('d') === path('TX').getAttribute('d') && path('TX').getAttribute('d').length > 20);
  fire(path('NE'), 'mouseover');
  ok('a Republican hold reads as one, in the Senate and for governor', /Nebraska/.test(panel()) && (panel().match(/Republican hold/g) || []).length === 2 && /HouseDemocrats 1, Republicans 2/.test(panel()), panel());
  fire(path('AK'), 'mouseover');
  ok('an uncalled race says so and names who leads, and an uncalled House seat is counted',
     /Alaska/.test(panel()) && (panel().match(/Uncalled/g) || []).length === 2 && /Peltola/.test(panel()) && /Not yet called: 1 Republican-leading/.test(panel()), panel());
  fire(path('MS'), 'mouseover');
  ok('Mississippi is a Democratic gain, naming the winner', /Mississippi/.test(panel()) && /Democratic gain/.test(panel()) && /Colom/.test(panel()), panel());
  fire(path('MT'), 'mouseover');
  ok('a state with no governor race says so', /Montana/.test(panel()) && /No 2026 governor race/.test(panel()), panel());
  fire(path('DC'), 'mouseover');
  ok('DC, which AP lists no races for, says so, and on this layer its card lists no bills',
     /District of Columbia/.test(panel()) && /AP lists no 2026 races for District of Columbia/.test(panel()) && d.querySelectorAll('#legPanel .leg-bill-list li').length === 0 && !/Bills/.test(panel()), panel());
  await leaveMap();
  ok('moving off the map returns the panel to the overview, with the national totals AP showed and who they are from, and no word of bills on this layer',
     /United States/.test(panel()) && d.getElementById('legRingHover').getAttribute('d') === '' && /National totals/.test(panel()) &&
     !/ bills? in /.test(panel()) && !/federal bill/.test(panel()) && !/Bills/.test(panel()) &&
     panel().includes(`Senate: Democrats ${nat.senate.democrats}, Republicans ${nat.senate.republicans}, ${nat.senate.toBeCalled} to be called.`) &&
     panel().includes(`House: Democrats ${nat.house.democrats}, Republicans ${nat.house.republicans}, ${nat.house.toBeCalled} to be called.`) &&
     panel().includes(`Governors: Democrats ${nat.governor.democrats}, Republicans ${nat.governor.republicans}, ${nat.governor.toBeCalled} to be called.`) && /The Associated Press, updated/.test(panel()), panel());
  /* the layer is only about the results */
  ok('the 2026 Midterm results layer is only about the results: the filter bar and the bills table are out of view, the results table is in view, and the map is described as the results',
     area.getAttribute('data-layer') === 'results' && d.getElementById('legFilters').hidden && d.getElementById('legBillsSection').hidden && !d.getElementById('legResultsSection').hidden &&
     /midterm results/.test(d.getElementById('legMap').getAttribute('aria-label')) && !/bill|legislation/i.test(d.getElementById('legMap').getAttribute('aria-label')), d.getElementById('legMap').getAttribute('aria-label'));
  ok('its masthead asks about the midterms and counts the races from the data, with no word of bills',
     /^How did the 2026 midterms go\?$/.test(d.getElementById('headerTabDescLede').textContent.trim()) &&
     mastheadText() === `The 2026 midterm results, according to The Associated Press: ${races('senate')} Senate seats, ${races('governor')} governor races and ${seats} House districts, in ${nStates} states. Hover a state to see how its races went; the table below lists every state.` &&
     !/bill|legislation/i.test(mastheadText() + d.getElementById('headerTabDescLede').textContent), mastheadText());
  const groupState = () => [...d.querySelectorAll('#legStateSelect optgroup')].map(g => `${g.label}:${g.hidden && g.disabled ? 'out' : 'in'}`).join();
  ok('the Show menu offers only the states here (Congress and Puerto Rico have no results to show)', groupState() === 'Federal:out,States:in,Territories:out', groupState());
  fire(path('TX'), 'mouseover');
  ok('a state\'s card on this layer holds only its results: no Bills heading and no list of bills', /Texas/.test(panel()) && /2026 Midterm results/.test(panel()) && !/Bills/.test(panel()) && d.querySelectorAll('#legPanel .leg-bill-list').length === 0, panel());
  await leaveMap();
  fire(d.getElementById('legLayerBills'), 'click');
  ok('back on Bills the filter bar, the bills table and the bills in the card return, the Show menu has Congress and the territory again, and the masthead is about bills',
     area.getAttribute('data-layer') === 'bills' && !d.getElementById('legFilters').hidden && !d.getElementById('legBillsSection').hidden && groupState() === 'Federal:in,States:in,Territories:in' &&
     /^What is currently on the table\?$/.test(d.getElementById('headerTabDescLede').textContent.trim()) && /active bills/.test(mastheadText()) && /Bills/.test(panel()), mastheadText());
  const showMenu = d.getElementById('legStateSelect'); showMenu.value = 'federal'; showMenu.dispatchEvent(new w.Event('change', { bubbles: true }));
  fire(d.getElementById('legLayerResults'), 'click');
  ok('choosing the results layer lets go of Congress, which has no results: nothing is pinned, the menu says All jurisdictions, and the card is the overview',
     showMenu.value === '' && d.getElementById('legClear').hidden && /United States/.test(panel()) && !/Federal/.test(panel()), panel());
  const resultsTable = d.getElementById('legResultsTable');
  const resultsPager = d.getElementById('legResultsPager');
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
  const resultsShape = () => { const t = resultsTable.querySelector('table'); return !!t && t.classList.contains('leg-table--results') && [...t.querySelectorAll('th')].map(h => h.textContent).join() === 'State,Senate,House,Governor,Source'; };
  ok('the results table is the one whose column widths are fixed in the stylesheet (leg-table--results, columns State, Senate, House, Governor, Source), so every page of states is laid out as one state is', resultsShape());
  const ia = resultsTable.querySelector('tr[data-state="IA"]');
  ok('each result row links its offices to AP\'s race pages for that state',
     [...ia.querySelectorAll('a')].map(a => a.getAttribute('href')).join() === `${AP}iowa-us-senate-results/,${AP}iowa-us-house-results/,${AP}iowa-governor-results/`, ia.textContent);
  const sumD = w.eval('Object.values(MIDTERM_RESULTS).reduce((n, s) => n + (s.house.d || 0), 0)'), sumR = w.eval('Object.values(MIDTERM_RESULTS).reduce((n, s) => n + (s.house.r || 0), 0)');
  const note = d.getElementById('legSource').textContent;
  ok('the note under the results table reports it whenever the district results do not add up to AP\'s chamber total, and only then',
     (sumD === nat.house.democrats && sumR === nat.house.republicans) ? !/add up to/.test(note) : (new RegExp(`add up to ${sumD} Democratic and ${sumR} Republican wins`).test(note) && note.includes(`showed ${nat.house.democrats} and ${nat.house.republicans}`)), note);
  fire(path('GA'), 'click');
  const gaN = countOf('GA');
  ok('clicking Georgia pins it: the menu follows, Clear shows, and both tables narrow to it, the bills table to Georgia\'s bills',
     d.getElementById('legStateSelect').value === 'GA' && !d.getElementById('legClear').hidden && rows('legResultsTable') === 1 && /Georgia/.test(resultsTable.textContent) &&
     rows('legBillsTable') === Math.min(PAGE, gaN) && [...billsTable().querySelectorAll('tbody tr')].every(r => r.getAttribute('data-state') === 'GA') &&
     d.getElementById('legBillsScope').textContent === `Georgia · ${num(gaN)} ${gaN === 1 ? 'bill' : 'bills'}`, `${rows('legBillsTable')} rows for ${gaN} bills`);
  ok('narrowed to one state it is the same table with the same columns, so it keeps the same widths, and with one row it has no pager', resultsShape() && rows('legResultsTable') === 1 && resultsPager.hidden);
  ok('a state\'s bills table has a Summary column only if one of its bills has a summary: only the columns something fills',
     heads() === `Jurisdiction,Bill,Title,Status,Last action,${w.eval("LEGISLATION_DATA.some(b => b.state === 'GA' && !b.passing && b.summary)") ? 'Summary,' : ''}Source`, heads());
  await leaveMap();
  ok('a pinned state keeps the panel and its outline after the pointer leaves', /Georgia/.test(panel()) && d.getElementById('legRingPinned').getAttribute('d') === path('GA').getAttribute('d'));
  fire(d.getElementById('legClear'), 'click');
  ok('Clear returns to all states', d.getElementById('legStateSelect').value === '' && d.getElementById('legClear').hidden && rows('legResultsTable') === Math.min(RPAGE, nStates) && resultsPager.querySelector('.pager-status').textContent === `Page 1 of ${rpagesOf(nStates)}` && rows('legBillsTable') === Math.min(PAGE, nBills));
  const sel = d.getElementById('legStateSelect');
  sel.value = 'AK'; sel.dispatchEvent(new w.Event('change', { bubbles: true }));
  ok('choosing a state in the menu does what clicking it does, for keyboard users', /Alaska/.test(panel()) && rows('legResultsTable') === 1);
  fire(d.getElementById('legClear'), 'click');
  fire(tile('RI'), 'mouseover');
  ok('pointing at a small state\'s button does what pointing at its shape does: the panel shows the state, the map outlines it, and the button is marked',
     /Rhode Island/.test(panel()) && /Democratic hold/.test(panel()) && d.getElementById('legRingHover').getAttribute('d') === path('RI').getAttribute('d') && tile('RI').classList.contains('is-hover'), panel());
  fire(path('CT'), 'mouseover');
  ok('pointing at a small state\'s shape marks its button, and only its button', tile('CT').classList.contains('is-hover') && !tile('RI').classList.contains('is-hover') && tiles.filter(b => b.classList.contains('is-hover')).length === 1);
  await leaveMap();
  ok('moving off the map unmarks the buttons', tiles.every(b => !b.classList.contains('is-hover')) && /United States/.test(panel()));
  fire(tile('RI'), 'click');
  ok('clicking a small state\'s button pins it: the button is pressed and outlined, the menu follows, Clear shows, and both tables narrow to it',
     tile('RI').getAttribute('aria-pressed') === 'true' && tile('RI').classList.contains('is-pinned') && d.getElementById('legStateSelect').value === 'RI' && !d.getElementById('legClear').hidden &&
     d.getElementById('legRingPinned').getAttribute('d') === path('RI').getAttribute('d') && rows('legResultsTable') === 1 && /Rhode Island/.test(resultsTable.textContent) && tiles.filter(b => b.getAttribute('aria-pressed') === 'true').length === 1);
  fire(tile('RI'), 'click');
  ok('clicking it again lets go', tile('RI').getAttribute('aria-pressed') === 'false' && !tile('RI').classList.contains('is-pinned') && d.getElementById('legStateSelect').value === '' && rows('legResultsTable') === Math.min(RPAGE, nStates));
  tile('DE').dispatchEvent(new w.Event('focusin', { bubbles: true }));
  ok('giving a button the keyboard\'s focus previews its state, as pointing at it does', /Delaware/.test(panel()) && tile('DE').classList.contains('is-hover') && d.getElementById('legRingHover').getAttribute('d') === path('DE').getAttribute('d'), panel());
  tile('DE').dispatchEvent(new w.Event('focusout', { bubbles: true }));
  ok('and taking the focus away returns the panel to the overview', /United States/.test(panel()) && !tile('DE').classList.contains('is-hover'));
  sel.value = 'NJ'; sel.dispatchEvent(new w.Event('change', { bubbles: true }));
  ok('choosing a small state in the Show menu marks its button pressed too, and only that one', tile('NJ').getAttribute('aria-pressed') === 'true' && tiles.filter(b => b.getAttribute('aria-pressed') === 'true').length === 1 && /New Jersey/.test(panel()));
  fire(d.getElementById('legClear'), 'click');
  ok('Clear lets go of it', tiles.every(b => b.getAttribute('aria-pressed') === 'false' && !b.classList.contains('is-pinned')));

  /* ── C. paging, the hover panel's cap, the territories, and each layer's sources ─────────────────────────── */
  fire(d.getElementById('legLayerBills'), 'click');
  // A jurisdiction's card gives its stats (its bill count, and the stats bar's bar and key) and links to the details below; it previews none of its bills (the owner had the previews taken
  // out, 2026-11-12). With no bills it says so instead. The only list items in it are the stats key's.
  const cardOk = total => !d.querySelector('#legPanel .leg-bill-list') && !!d.querySelector('#legPanel .leg-more-link') && !/more in the table below/.test(panel()) &&
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
  fire(d.getElementById('legClear'), 'click');
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
  ['legBillsTitle', 'legResultsTitle'].forEach(id => { d.getElementById(id).scrollIntoView = function () { jumps.push(this.id); }; });   // a test DOM has no layout: record where the page is sent
  fire(moreLink(), 'click');
  ok('following the link pins the state, so the tables below are about it, and takes the reader to the details: the Bills title, with focus on the table',
     d.getElementById('legStateSelect').value === 'NY' && d.getElementById('legBillsScope').textContent === `New York · ${num(nyN)} ${nyN === 1 ? 'bill' : 'bills'}` && rows('legResultsTable') === 1 &&
     jumps.join() === 'legBillsTitle' && d.activeElement === billsTable(), `${d.getElementById('legStateSelect').value} / ${jumps} / ${d.getElementById('legBillsScope').textContent}`);
  fire(d.getElementById('legClear'), 'click');
  fire(d.getElementById('legLayerResults'), 'click');
  jumps = [];
  ok('on the results layer the state\'s card has the link too, after its results', !!moreLink() && /New York/.test(panel()) && !d.querySelector('#legPanel .leg-bill-list') && moreLink().textContent === 'See more details below', panel());
  fire(moreLink(), 'click');
  ok('and it takes the reader to the results: the 2026 Midterm results title, with focus on that table, narrowed to the state',
     d.getElementById('legStateSelect').value === 'NY' && jumps.join() === 'legResultsTitle' && d.activeElement === d.getElementById('legResultsTable') && rows('legResultsTable') === 1 && d.getElementById('legResultsPager').hidden, jumps.join());
  fire(d.getElementById('legClear'), 'click');
  fire(d.getElementById('legLayerBills'), 'click');
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
  fire(d.getElementById('legClear'), 'click');
  fire(path('NY'), 'mouseover');
  await leaveMap();
  sel.value = 'PR'; sel.dispatchEvent(new w.Event('change', { bubbles: true }));
  const prN = countOf('PR');
  ok('a territory, which has no shape on the map, is chosen from the menu: its card gives its stats, and the results table says AP lists no races for it',
     /Puerto Rico/.test(panel()) && cardOk(prN) &&
     /AP lists no 2026 races for Puerto Rico/.test(d.getElementById('legResultsTable').textContent), panel());
  ok('and Puerto Rico\'s bills are named for it in the table', rows('legBillsTable') === Math.min(PAGE, prN) && [...billsTable().querySelectorAll('tbody tr')].every(r => /Puerto Rico/.test(r.firstElementChild.textContent)));
  fire(d.getElementById('legClear'), 'click');
  sel.value = 'federal'; sel.dispatchEvent(new w.Event('change', { bubbles: true }));
  ok('choosing Federal in the Show menu narrows the bills table to Congress\'s bills, paged, and the card gives Congress\'s stats with the link to them',
     sel.value === 'federal' && rows('legBillsTable') === Math.min(PAGE, nFed) &&
     cardOk(nFed) &&
     heads() === 'Jurisdiction,Bill,Title,Status,Last action,Summary,Source' && d.getElementById('legBillsNote').textContent === '', `${heads()} | ${d.getElementById('legBillsNote').textContent}`);
  fire(d.getElementById('legClear'), 'click');
  const links2 = [...d.getElementById('legMapSource').querySelectorAll('a')].map(a => a.getAttribute('href'));
  ok('on the Bills layer the line below the map cites the Brennan Center for the federal list, GovInfo for the federal bills\' official records and Open States for the state bills, each with a link to its page, and not AP',
     /^Sources: Brennan Center for Justice, “Artificial Intelligence Legislation Tracker” \(tracker, updated /.test(d.getElementById('legMapSource').textContent) &&
     /Open States, “Bill search” \(API v3, read /.test(d.getElementById('legMapSource').textContent) &&
     /U\.S\. Government Publishing Office, “Bill Status XML Bulk Data” \(bulk data, read /.test(d.getElementById('legMapSource').textContent) &&
     links2.join() === Object.values(feeds).map(f => f.url).join() && !/Associated Press/.test(d.getElementById('legMapSource').textContent), d.getElementById('legMapSource').textContent);
  fire(d.getElementById('legLayerResults'), 'click');
  ok('and back on Midterm results it cites AP alone', links.length === 1 && [...d.getElementById('legMapSource').querySelectorAll('a')].map(a => a.getAttribute('href')).join() === AP);
  fire(d.getElementById('legLayerBills'), 'click');

  /* ── D. the bill paths, with five bills of our own ───────────────────────────────────────────────────────── */
  const real = w.eval('LEGISLATION_DATA.splice(0)');
  area.dispatchEvent(new w.Event('legislation:refresh'));
  ok('with no bills the masthead says so, and names its one source, the midterm results; and the table says nothing is loaded',
     /no legislation has been added yet/i.test(mastheadText()) && /how its 2026 midterm races went, according to The Associated Press;/.test(mastheadText()) &&
     rows('legBillsTable') === 0 && /No legislation has been added yet/.test(billsTable().textContent) && pager.hidden && d.getElementById('legBillsTitle').textContent.trim() === 'All jurisdictions · 0 bills', mastheadText());
  ok('and with no bills that only mention AI the checkbox is not offered', passWrap.hidden && !/Include bills that only mention AI/.test(d.getElementById('legBillsNote').textContent));
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
  ok('the masthead counts both levels, in words while the count is small', /Three active bills: two in two states and one in Congress/.test(mastheadText()), mastheadText());
  ok('a bill shows its stage as a chip, with the source\'s own words beneath when they differ, its last action, and a dash for what a source does not give',
     /In committee/.test(billsTable().querySelector('tr[data-state="TX"]').textContent) && /Referred to the House Technology Committee/.test(billsTable().querySelector('tr[data-state="TX"]').textContent) &&
     /March 1, 2026: Referred to committee/.test(billsTable().textContent) && /–/.test(billsTable().querySelector('tr[data-state="OH"]').textContent));
  ok('a link is shown only when its address is http or https', billsTable().querySelectorAll('a').length === 1 && billsTable().querySelector('a').getAttribute('href') === 'https://example.org/bill');
  fire(path('TX'), 'mouseover');
  ok('the state card counts the state\'s active bill, in committee, and not its failed one', cardOk(1) && d.querySelector('#legPanel .leg-stats--card .leg-stats-key').textContent === '1 in committee (100%)', panel());
  await leaveMap();
  d.getElementById('legStateSelect').value = 'federal'; d.getElementById('legStateSelect').dispatchEvent(new w.Event('change', { bubbles: true }));
  ok('choosing Federal in the Show menu shows Congress\'s stats in the card: its one bill, and a link to it below', /Federal \(Congress\)/.test(panel()) && cardOk(1) && d.querySelector('#legPanel .leg-more-link').getAttribute('data-more') === 'federal', panel());
  ok('and pins it: both tables narrow to Congress',
     d.getElementById('legStateSelect').value === 'federal' && rows('legBillsTable') === 1 && /H\.R\. 3/.test(billsTable().textContent) &&
     rows('legResultsTable') === 0 && /results are by state/.test(d.getElementById('legResultsTable').textContent) && /Federal \(Congress\)/.test(d.getElementById('legBillsScope').textContent));
  ok('and when there is nothing to show (Federal) the results table still has its columns', resultsShape());
  fire(d.getElementById('legClear'), 'click');
  ok('Clear returns from Federal to all jurisdictions', d.getElementById('legStateSelect').value === '' && rows('legBillsTable') === 3);
  sel.value = 'OH'; sel.dispatchEvent(new w.Event('change', { bubbles: true }));
  ok('a column that is empty for every bill in view is left out: Ohio\'s one bill has no last action and no summary, so the table has neither column', heads() === 'Jurisdiction,Bill,Title,Status,Source', heads());
  fire(d.getElementById('legClear'), 'click');
  fire(d.getElementById('legLayerBills'), 'click');
  ok('the Bills layer shades only states with an active state bill, and the legend counts the federal bills that are not on the map',
     d.getElementById('legMap').getAttribute('data-layer') === 'bills' && /fill-b1/.test(path('TX').getAttribute('class')) && /fill-b1/.test(path('OH').getAttribute('class')) && !/fill-b/.test(path('CA').getAttribute('class')) &&
     /1 bill\s*2/.test(legend()) && /Federal bills, not on the map\s*1/.test(legend()), legend());
  ok('the buttons follow the Bills layer as well: none of the small states has a test bill, so none is shaded', tilesMatch() && tiles.every(b => !/fill-/.test(b.getAttribute('class'))), tiles.map(b => b.textContent + ':' + fillOf(b)).join());
  w.eval('LEGISLATION_DATA.length = 0');
  w.__real = real; w.eval('LEGISLATION_DATA.push(...window.__real)');
  area.dispatchEvent(new w.Event('legislation:refresh'));
  ok('with the real bills put back the tab is as it opened, checkbox included', rows('legBillsTable') === Math.min(PAGE, nBills) && mastheadText().startsWith(`${num(nBills)} active bills`) && !passWrap.hidden && passWrap.querySelector('.leg-muted-count').textContent === num(nPassing));
  await leaveMap();

  /* ── E. the filter bar: search, and topic chips behind More filters ─────────────────────────────────────────────
     First on the shipped bills (what the page does with real data), then on ten test bills and three test topics of our own, whose words and
     counts can be worked out by hand: a word in the title, two different words in the summary, a whole-word marker, AND between chips, "No topic",
     search across everything a row shows, the switch and the filters together, a jurisdiction pinned, an empty result, and paging. */
  const searchBox = d.getElementById('legSearch'), moreToggle = d.getElementById('legMoreToggle'), clearFilters = d.getElementById('legFilterClear');
  const chips = () => [...d.querySelectorAll('#legTopicPills button[data-topic]')], chipOf = id => d.querySelector(`#legTopicPills button[data-topic="${id}"]`);
  const chipText = b => b.textContent.replace(/\s+/g, ' ').trim(), chipN = b => Number(b.querySelector('.kw-count').textContent.replace(/,/g, ''));
  const resultLine = () => d.getElementById('legResultLine').textContent, moreBadge = d.getElementById('legMoreCount');
  const typeInto = async text => { searchBox.value = text; searchBox.dispatchEvent(new w.Event('input', { bubbles: true })); await wait(260); };
  const titles = () => [...billsTable().querySelectorAll('tbody tr:not(.leg-empty-row)')].map(tr => tr.querySelector('td.leg-col-title').childNodes[0].textContent);
  const topicDefs = JSON.parse(w.eval('JSON.stringify(LEGISLATION_TOPICS.map(t => ({ id: t.id, label: t.label, words: t.words.length })))'));
  const mastBefore = mastheadText();
  ok('under the toolbar there is a filter bar: a search box, More filters (closed, with no badge) and a result line that counts the bills against all of them, with no Clear filters yet',
     !!d.getElementById('legFilters') && d.getElementById('legFilters').classList.contains('controls') && searchBox.type === 'search' && searchBox.getAttribute('aria-label') &&
     moreToggle.getAttribute('aria-expanded') === 'false' && !d.getElementById('legMorePanel').classList.contains('open') && moreBadge.hidden && clearFilters.hidden &&
     resultLine() === `${num(nBills)} of ${num(nBills)} bills.`, resultLine());
  ok('the topics are defined in the data, each with an id, a label and some words, and no two share an id',
     topicDefs.length >= 5 && new Set(topicDefs.map(t => t.id)).size === topicDefs.length && topicDefs.every(t => t.id && t.label && t.words > 0 && t.id !== 'all' && t.id !== 'none'), JSON.stringify(topicDefs.map(t => t.id)));
  ok('the chips are All, then one for each topic in the data\'s order, then No topic; each carries its count, and All counts every bill',
     chips().length === topicDefs.length + 2 && chipText(chips()[0]).startsWith('All') && chipN(chips()[0]) === nBills && chipText(chips()[chips().length - 1]).startsWith('No topic') &&
     topicDefs.every((t, i) => chipText(chips()[i + 1]).startsWith(t.label)) && chips().every(b => b.getAttribute('aria-pressed') === (b.dataset.topic === 'all' ? 'true' : 'false')), chips().map(chipText).join(' | '));
  fire(moreToggle, 'click');
  ok('More filters opens the panel that holds the chips, and says what the topics are and how many bills have none',
     d.getElementById('legMorePanel').classList.contains('open') && moreToggle.getAttribute('aria-expanded') === 'true' &&
     new RegExp(`${num(chipN(chipOf('none')))} of ${num(nBills)} have none`).test(d.getElementById('legTopicNote').textContent), d.getElementById('legTopicNote').textContent);
  const pickable = chips().find(b => !['all', 'none'].includes(b.dataset.topic) && !b.disabled && chipN(b) > 0 && chipN(b) < nBills);
  if (pickable) {
    const k = chipN(pickable), label = chipText(pickable).replace(/\s*[\d,]+$/, '');
    fire(pickable, 'click');
    ok(`choosing a topic (${label}) narrows the result line, the table and its title to the ${k} bills that have it, marks the chip, shows the badge and Clear filters, and leaves the masthead saying what is loaded`,
       resultLine() === `${num(k)} of ${num(nBills)} bills.` && pickable.getAttribute('aria-pressed') === 'true' && moreBadge.textContent === '1' && !moreBadge.hidden && !clearFilters.hidden &&
       rows('legBillsTable') === Math.min(PAGE, k) && d.getElementById('legBillsScope').textContent === `All jurisdictions · ${num(k)} ${k === 1 ? 'bill' : 'bills'}` && mastheadText() === mastBefore,
       `${resultLine()} / ${d.getElementById('legBillsScope').textContent}`);
    const fedLeft = Number(((/Federal bills, not on the map\s*([\d,]+)/.exec(legend()) || [])[1] || '0').replace(/,/g, '')), stateLeft = k - fedLeft;
    ok('every bill left shows the topic on its row, and the panel\'s overview and the Federal count follow the filter (the state bills and the federal bills left add up to the bills the topic has)',
       [...billsTable().querySelectorAll('tbody tr')].every(tr => tr.textContent.includes('Topics: ') && tr.textContent.includes(label)) && stateLeft >= 0 &&
       (stateLeft ? new RegExp(`${num(stateLeft)} ${stateLeft === 1 ? 'bill' : 'bills'} in `).test(panel()) : !/ bills? in /.test(panel().replace(/federal bills?/, ''))) &&
       (fedLeft ? new RegExp(`${num(fedLeft)} federal ${fedLeft === 1 ? 'bill' : 'bills'}`).test(panel()) : !/federal bill/.test(panel())), `${k} left: ${stateLeft} state, ${fedLeft} federal; ` + panel());
    fire(clearFilters, 'click');
    ok('Clear filters puts everything back (the chips, the badge, the table, the result line) and returns the keyboard to the search box',
       resultLine() === `${num(nBills)} of ${num(nBills)} bills.` && chipOf('all').getAttribute('aria-pressed') === 'true' && moreBadge.hidden && clearFilters.hidden &&
       rows('legBillsTable') === Math.min(PAGE, nBills) && d.activeElement === searchBox, resultLine());
  } else ok('there is a topic that some, but not all, of the bills have (so the filter can be shown to narrow the list)', false, chips().map(chipText).join(' | '));
  const sample = String(w.eval("(() => { const re = /^[A-Za-z]{7,}$/; const b = LEGISLATION_DATA.find(x => !x.passing && x.title && x.title.split(/\\s+/).some(y => re.test(y))); return b ? b.title.split(/\\s+/).find(y => re.test(y)) : ''; })()") || '').toLowerCase();
  await typeInto(sample);
  ok(`searching for a word (${sample}) keeps the bills with it somewhere in what a row shows, and no others`,
     rows('legBillsTable') > 0 && [...billsTable().querySelectorAll('tbody tr')].every(tr => tr.textContent.toLowerCase().includes(sample)) && !clearFilters.hidden &&
     new RegExp(`^${rows('legBillsTable') < PAGE ? rows('legBillsTable') : '\\d[\\d,]*'} of ${num(nBills)} bills\\.$`).test(resultLine()), resultLine());
  await typeInto('qqzzxx');
  ok('a search nothing matches says so, in the table and the panel, with no pager and a count of none, and the chips run down to nothing',
     rows('legBillsTable') === 0 && /No bills match the search and filters chosen\./.test(billsTable().textContent) && pager.hidden && /No bills match/.test(panel()) && d.getElementById('legBillsTitle').textContent.trim() === 'All jurisdictions · 0 bills' &&
     resultLine() === `0 of ${num(nBills)} bills.` && chips().filter(b => !['all'].includes(b.dataset.topic)).every(b => b.disabled), billsTable().textContent);
  fire(clearFilters, 'click');
  ok('and Clear filters clears the search too', searchBox.value === '' && rows('legBillsTable') === Math.min(PAGE, nBills) && resultLine() === `${num(nBills)} of ${num(nBills)} bills.`);

  // ── sort and status on the shipped bills
  const sortSelR = d.getElementById('legSort'), setSortR = v => { sortSelR.value = v; sortSelR.dispatchEvent(new w.Event('change', { bubbles: true })); };
  const oldestAction = w.eval("LEGISLATION_DATA.filter(b => !b.passing && b.lastAction && b.lastAction.date).map(b => b.lastAction.date).sort()[0]");
  setSortR('oldest');
  ok('Sort by Oldest action starts the table with the oldest last action, in order, and starts again at page 1 (it is not a filter: no badge, no Clear filters)',
     dates()[0] === oldestAction && inOrder(dates(), false) && pager.querySelector('.pager-status').textContent === `Page 1 of ${pagesOf(nBills)}` && moreBadge.hidden && clearFilters.hidden, `${dates().slice(0, 3)} vs ${oldestAction}`);
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
    ok(`choosing a status (${stagePick.label}) narrows the table, the result line and the badge to the ${stagePick.n} bills at that stage, and every row says so`,
       resultLine() === `${num(stagePick.n)} of ${num(nBills)} bills.` && rows('legBillsTable') === Math.min(PAGE, stagePick.n) && moreBadge.textContent === '1' && !clearFilters.hidden && mastheadText() === mastBefore &&
       [...billsTable().querySelectorAll('tbody tr')].every(tr => tr.textContent.includes(stagePick.label)), resultLine());
    fire(clearFilters, 'click');
    ok('and Clear filters puts the status back to all', statusR.value === '' && resultLine() === `${num(nBills)} of ${num(nBills)} bills.` && moreBadge.hidden);
  } else ok('there is a stage that some, but not all, of the bills are at', false, stageList.map(s => s.label + s.n).join());


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
  ok('the map follows: Texas, Ohio and California are shaded for the pet bills (2, 1 and 1), the federal bills are not (none has pets), and the masthead still counts all eight', 
     /fill-b/.test(path('TX').getAttribute('class')) && /fill-b/.test(path('OH').getAttribute('class')) && /fill-b/.test(path('CA').getAttribute('class')) && /Federal bills, not on the map\s*0/.test(legend()) &&
     /Eight active bills: six in three states and two in Congress/.test(mastheadText()), mastheadText() + ' / ' + legend());
  fire(chipOf('cars'), 'click');
  ok('two chips together mean both: Pets and Cars leave the one bill that has both, and the badge says 2', titles().join('|') === 'Registering a vehicle with a dog' && resultLine() === '1 of 8 bills.' && moreBadge.textContent === '2', titles().join('|'));
  fire(chipOf('pets'), 'click');
  ok('taking Pets off leaves Cars alone: three bills', titles().length === 3 && resultLine() === '3 of 8 bills.' && moreBadge.textContent === '1', titles().join('|'));
  fire(chipOf('none'), 'click');
  ok('No topic stands alone: it drops the other chips and leaves the two bills with no topic (a dog in one line of a summary, and "Category")',
     titles().sort().join('|') === 'Animal welfare|Category review' && chipOf('none').getAttribute('aria-pressed') === 'true' && chipOf('cars').getAttribute('aria-pressed') === 'false' && moreBadge.textContent === '1', titles().join('|'));
  fire(chipOf('pets'), 'click');
  ok('and choosing a topic takes No topic off', chipOf('none').getAttribute('aria-pressed') === 'false' && chipOf('pets').getAttribute('aria-pressed') === 'true' && titles().length === 4);
  fire(chipOf('all'), 'click');
  ok('All clears the topics', resultLine() === '8 of 8 bills.' && chips().filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.topic).join() === 'all' && moreBadge.hidden);
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
  fire(d.getElementById('legClear'), 'click');
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
  ok('choosing a status narrows to the bills at that stage, with the badge at 1 and Clear filters shown, and the masthead still counting all eight',
     nums().sort().join() === 'AB 31,AB 32,HB 11,SB 22' && resultLine() === '4 of 8 bills.' && moreBadge.textContent === '1' && !clearFilters.hidden && /Eight active bills/.test(mastheadText()) &&
     [...billsTable().querySelectorAll('tbody tr')].every(tr => /In committee/.test(tr.textContent)), nums().join());
  ok('the topic chips are counted under the status: Pets 3, Cars 1, Rules 0 and dimmed, No topic 1',
     chipN(chipOf('pets')) === 3 && chipN(chipOf('cars')) === 1 && chipN(chipOf('rules')) === 0 && chipOf('rules').disabled && chipN(chipOf('none')) === 1, summary());
  fire(chipOf('pets'), 'click');
  ok('a status and a topic together: In committee and Pets leave three bills, the badge says 2, and the Status menu is counted under the topic (introduced 1, committee 3, enacted none and dimmed)',
     nums().sort().join() === 'AB 31,HB 11,SB 22' && moreBadge.textContent === '2' && statusSummary() === 'All statuses|Introduced (1)|In committee (3)|Passed one chamber (0)!|Passed both chambers (0)!|Enacted (0)!', statusSummary() + ' / ' + nums().join());
  await typeInto('ohio');
  ok('and with a search as well: Ohio, Pets and In committee leave the one bill', nums().join() === 'SB 22' && resultLine() === '1 of 8 bills.', nums().join());
  fire(clearFilters, 'click');
  ok('Clear filters puts the status back to all, and leaves the order alone (Jurisdiction, as chosen)', statusSel.value === '' && resultLine() === '8 of 8 bills.' && moreBadge.hidden && sortSel.value === 'jurisdiction' && nums().join() === 'H.R. 42,H.R. 41,AB 31,AB 32,SB 21,SB 22,HB 12,HB 11', nums().join());
  setSort('recent');
  setStatus('committee'); fire(passBox, 'click');
  ok('the checkbox under More filters adds the committee bill that only mentions AI (five of nine) and counts in the badge with the status (2); Clear filters turns it off again with everything else',
     nums().length === 5 && resultLine() === '5 of 9 bills.' && moreBadge.textContent === '2' && passBox.checked && (fire(clearFilters, 'click'), true) && !passBox.checked && resultLine() === '8 of 8 bills.' && moreBadge.hidden, nums().join());
  // the stats bar on the test bills: three introduced, four in committee, one enacted
  ok('on the test bills the stats bar says where the eight stand: 3 introduced (38%), 4 in committee (50%), 1 enacted (13%), in the stages\' order, each percentage rounded on its own (they come to 101)',
     statsLabel() === 'Where the 8 bills stand: 3 introduced (38%), 4 in committee (50%), 1 enacted (13%).' && segs().map(segN).join() === '3,4,1' &&
     [...statsBar().querySelectorAll('.leg-stats-key li')].map(li => li.textContent).join() === '3 introduced (38%),4 in committee (50%),1 enacted (13%)' &&
     segs().map(x => x.getAttribute('title')).join('|') === 'Introduced: 3 (38%)|In committee: 4 (50%)|Enacted: 1 (13%)', statsLabel());
  const ohSel = d.getElementById('legStateSelect'); ohSel.value = 'OH'; ohSel.dispatchEvent(new w.Event('change', { bubbles: true }));
  ok('it follows the state chosen in the Show menu: Ohio has two bills, one in committee and one enacted, and the title says the same', statsLabel() === 'Where the 2 bills stand: 1 in committee (50%), 1 enacted (50%).' && scopeN() === 2, statsLabel());
  fire(d.getElementById('legClear'), 'click');
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
  click(w, d, 'viewLegislation');
  ok('opening the tab asks for them: the area says loading, and the masthead says so', area.getAttribute('data-bills') === 'loading' && /Loading the legislation/.test(d.getElementById('headerTabDescText').textContent), area.getAttribute('data-bills'));
  await settle(10);
  ok('and they arrive: the area is ready, the data holds the bills, and the masthead counts them',
     area.getAttribute('data-bills') === 'ready' && w.eval('LEGISLATION_DATA.length') > 0 && w.eval('typeof LEGISLATION_FEEDS') === 'object' &&
     d.getElementById('headerTabDescText').textContent.startsWith(`${w.eval('LEGISLATION_DATA.filter(b => !b.passing).length').toLocaleString('en-US')} active bills`), d.getElementById('headerTabDescText').textContent);
  const again = w.eval('LEGISLATION_DATA.length');
  click(w, d, 'viewPolicy'); click(w, d, 'viewLegislation'); await settle(10);
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
  ok('the filter bar keeps search and Sort in view, with Evidence, both rating minimums and Keywords behind "More filters"',
     (() => {
       const row = d.querySelector('#factBankArea .controls > .controls-row');
       const inRow = id => !!row.querySelector('#' + id);
       const panel = d.getElementById('kfMorePanel');
       return !!row.querySelector('.search-wrap') && ['kfSort', 'kfMoreToggle'].every(inRow) &&
         !inRow('kfEvidence') && !inRow('kfMinPol') && !inRow('kfMinTruth') && !inRow('kwPills') &&
         !!panel.querySelector('#kfEvidence') && !!panel.querySelector('#kfMinPol') && !!panel.querySelector('#kfMinTruth') && !!panel.querySelector('#kwPills');
     })());
  ok('Evidence sits beside Political noteworthiness and Truth, in that order, in one row of the panel',
     (() => {
       const r = d.getElementById('kfEvidence').closest('.controls-row');
       const selects = [...r.querySelectorAll('select')];
       return r === d.getElementById('kfMinPol').closest('.controls-row') && r === d.getElementById('kfMinTruth').closest('.controls-row') &&
         ['kfEvidence', 'kfMinPol', 'kfMinTruth'].map(id => selects.indexOf(d.getElementById(id))).join() === '0,1,2';
     })());
  ok('"More filters" starts closed, and opens and closes its panel',
     (() => {
       const tg = d.getElementById('kfMoreToggle'), pn = d.getElementById('kfMorePanel');
       const start = tg.getAttribute('aria-expanded') === 'false' && !pn.classList.contains('open');
       tg.click();
       const opened = tg.getAttribute('aria-expanded') === 'true' && pn.classList.contains('open');
       tg.click();
       return start && opened && tg.getAttribute('aria-expanded') === 'false' && !pn.classList.contains('open');
     })());
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
    const badge = () => d.getElementById('kfMoreCount'), clear = () => d.getElementById('kfClear');
    // The list holds one page, so the number of matches is read from the result line.
    const lineB = () => d.getElementById('kfResultLine').textContent;
    const visible = () => Number(lineB().match(/^(\d+) of/)[1]);
    const total = Number(lineB().match(/of (\d+) facts/)[1]);
    const pagerB = d.getElementById('kfPager');
    ok('the filter state starts clean: "All" pressed, no badge, no "Clear filters"',
       chips[0].dataset.kw === 'all' && chips[0].getAttribute('aria-pressed') === 'true' &&
       d.querySelectorAll('#kwPills .kw-pill[aria-pressed="true"]').length === 1 && badge().hidden && clear().hidden);
    chips[1].click();
    ok('choosing a keyword narrows the list, releases "All", and shows the badge and "Clear filters"',
       chips[0].getAttribute('aria-pressed') === 'false' && chips[1].getAttribute('aria-pressed') === 'true' &&
       visible() > 0 && visible() < total && !badge().hidden && badge().textContent === '1' && !clear().hidden);
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
    ok('a rating minimum, now inside the panel, is counted in the badge',
       !clear().hidden && badge().textContent === '2');
    ev.value = ev.options[1].value; ev.dispatchEvent(new w.Event('change', { bubbles: true }));
    ok('Evidence, now inside the panel, is counted in the badge too',
       !clear().hidden && badge().textContent === '3');
    clear().click();
    ok('"Clear filters" resets Evidence, the rating minimums and the keywords, and restores the whole list',
       chips[0].getAttribute('aria-pressed') === 'true' && chips[1].getAttribute('aria-pressed') === 'false' &&
       pol.value === '1' && d.getElementById('kfMinTruth').value === '1' && ev.value === 'all' &&
       badge().hidden && clear().hidden && visible() === total);
    ev.value = ev.options[1].value; ev.dispatchEvent(new w.Event('change', { bubbles: true }));
    ok('a filter that leaves one page of cards hides the pager', visible() < 50 && pagerB.hidden && !/Showing/.test(lineB()));
    clear().click();
    ok('clearing it brings the pager and page 1 back', !pagerB.hidden && (pagerB.querySelector('[aria-current="page"]') || {}).textContent === '1');
  }
  /* ── the Papers bar ───────────────────────────────────────────────────────
     The Papers tab's search-and-filters bar is the Fact Bank's bar (src/styles/filterbar.css),
     so it has the same shape: search and Sort in a row, every filter behind
     "More filters", then a result line and "Clear filters". The sidebar and the pill rows it
     replaced are gone. */
  {
    const pg = load('index.html', '#papers');
    const pw = pg.w, pd = pg.d;
    const fire = (el, type) => el.dispatchEvent(new pw.Event(type, { bubbles: true }));
    const pick = (id, value) => { const s = pd.getElementById(id); s.value = value; fire(s, 'change'); };
    // The list holds one page (50 rows at most), so the number of matches is read from the result line.
    const rows = () => pd.querySelectorAll('#cardsGrid .src-row').length;
    const line = () => pd.getElementById('ppResultLine').textContent;
    const matches = () => Number(line().match(/^(\d+) of/)[1]);
    const badge = () => pd.getElementById('ppMoreCount'), clear = () => pd.getElementById('ppClear');
    const total = matches();
    ok('the Papers list holds every paper but shows 50 rows at a time, with a pager under it',
       total > 100 && rows() === 50 && !pd.getElementById('ppPager').hidden && line() === `${total} of ${total} papers. Showing 1 to 50.`,
       'rows: ' + rows() + ', line: ' + line());
    ok('the sidebar, the pill rows, the sort toggle and the drawer button are gone',
       !pd.getElementById('sidebar') && !pd.getElementById('inlineFilters') && !pd.getElementById('sortBtn') &&
       !pd.getElementById('sidebarToggle') && !pd.getElementById('searchInput'));
    const row = pd.querySelector('#papersArea .controls > .controls-row');
    const inRow = id => !!row && row.contains(pd.getElementById(id));
    ok('search, Sort and "More filters" share the bar\'s first row, and Methodology is not in it',
       !!row && !!row.querySelector('.search-wrap') && ['ppSort', 'ppMoreToggle'].every(inRow) && !inRow('ppMethod'));
    ok('Methodology, Category and Region sit inside the "More filters" panel, Methodology beside Category',
       ['ppMethod', 'ppCategory', 'ppRegion'].every(id => pd.getElementById('ppMorePanel').contains(pd.getElementById(id))) &&
       pd.getElementById('ppMethod').closest('.controls-row') === pd.getElementById('ppCategory').closest('.controls-row'));
    ok('"More filters" starts closed, and opens and closes its panel',
       (() => {
         const tg = pd.getElementById('ppMoreToggle'), pn = pd.getElementById('ppMorePanel');
         const start = tg.getAttribute('aria-expanded') === 'false' && !pn.classList.contains('open');
         tg.click();
         const opened = tg.getAttribute('aria-expanded') === 'true' && pn.classList.contains('open');
         tg.click();
         return start && opened && tg.getAttribute('aria-expanded') === 'false' && !pn.classList.contains('open');
       })());
    ok('every Methodology, Category and Region has an option, with a count in its label',
       [['ppMethod', n => n === 6], ['ppCategory', n => n >= 10], ['ppRegion', n => n === 2]].every(([id, fits]) => {
         const opts = [...pd.getElementById(id).options].filter(o => o.value !== 'all');
         return fits(opts.length) && opts.every(o => / \(\d+\)$/.test(o.textContent));
       }));
    ok('the bar starts clean: the whole list, no badge, no "Clear filters"',
       line().startsWith(`${total} of ${total} papers.`) && badge().hidden && clear().hidden);

    const months = () => [...pd.querySelectorAll('#cardsGrid .src-meta')].map(m => Date.parse('1 ' + m.textContent.split(' · ').pop()));
    const ordered = (a, dir) => a.every((v, i) => i === 0 || (dir === 'desc' ? a[i - 1] >= v : a[i - 1] <= v));
    ok('the list starts newest first', ordered(months(), 'desc'));
    pick('ppSort', 'asc');
    ok('Sort "Oldest first" reverses it without dropping a paper, and Sort is not a filter (no "Clear filters")',
       ordered(months(), 'asc') && matches() === total && rows() === 50 && clear().hidden);
    pick('ppSort', 'desc');
    ok('and back to "Newest first"', ordered(months(), 'desc') && matches() === total && rows() === 50);

    pick('ppMethod', 'peer-reviewed');
    ok('choosing a Methodology narrows the list, counts in the badge and shows "Clear filters"',
       matches() > 0 && matches() < total && rows() === Math.min(matches(), 50) && !clear().hidden && badge().textContent === '1' && !badge().hidden);
    const cat = [...pd.getElementById('ppCategory').options].find(o => o.value !== 'all' && !o.disabled);
    pick('ppCategory', cat.value);
    ok('a Category counts in the badge too, and narrows the list further',
       badge().textContent === '2' && matches() > 0 && matches() < total);
    const reg = [...pd.getElementById('ppRegion').options].find(o => o.value !== 'all' && !o.disabled);
    pick('ppRegion', reg.value);
    ok('and so does a Region', badge().textContent === '3' && matches() > 0);
    ok('an option with nothing behind it is disabled unless it is the current choice',
       [...pd.getElementById('ppMethod').options].every(o => o.value === 'all' || o.disabled === (/\(0\)$/.test(o.textContent) && pd.getElementById('ppMethod').value !== o.value)));
    clear().click();
    ok('"Clear filters" resets Methodology, Category and Region and restores the list',
       ['ppMethod', 'ppCategory', 'ppRegion'].every(id => pd.getElementById(id).value === 'all') &&
       matches() === total && rows() === 50 && clear().hidden && badge().hidden && line().startsWith(`${total} of ${total} papers.`));

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
    ok('a search narrows the list; it is not a filter, so it brings no "Clear filters"', narrowed > 0 && narrowed < total && clear().hidden);
    pick('ppMethod', 'analysis');
    clear().click();
    ok('"Clear filters" leaves the search text alone',
       box.value === 'surveillance' && matches() === narrowed && pd.getElementById('ppMethod').value === 'all');
    box.value = ''; fire(box, 'input');
    await wait(300);

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
    pd.getElementById('ppClear').click();
    ok('clearing it brings page 1 and the pager back', current() === '1' && rows().length === 50 && !pager.hidden);
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
    const research = sw.eval('RESEARCH_DATA'), pilotIds = Object.keys(sw.eval('PAPER_SUMMARIES'));
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
    ok('some papers carry a summary (the pilot) and the rest do not', pilot.length > 0 && pilot.length < 30 && pilot.every(p => p.marked) && !!plain, 'pilot rows: ' + pilot.length);
    ok('an open summary row shows a lede and a body paragraph, and no bullets',
       pilot.every(p => p.lede && p.lede.length > 20 && p.hasPara && !p.bullets));
    ok('every summary says where its text came from and whether it was reviewed',
       pilot.every(p => /^Summary written from the (full text|abstract only)( \([^)]+\))?\. (Draft, not yet reviewed|Reviewed )/.test(p.basis)));
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
    ok('the pilot summaries pass the console validator', pg.warns.filter(m => /summary \d+:/.test(m)).length === 0, pg.warns.filter(m => /summary \d+:/.test(m))[0]);
    const own = pg.errors.filter(e => !/data validation/.test(e));
    ok('no console errors with summaries on the page', own.length === 0, own[0]);
  }
  ok('Fact Bank tab survives the lazy load', !!d.getElementById('viewFactBank'));
  ok('no console errors across the lazy paths', errors.length === 0, errors[0]);

  console.log(failed ? `\ninteractions.js: ${failed} FAILING` : '\ninteractions.js: all interactions pass');
  process.exit(failed ? 1 : 0);
})();
