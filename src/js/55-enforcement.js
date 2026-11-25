  /* ── Enforcement and Cases ────────────────────────────────────────────────────────────────────
     Two of the four sections of the Government action tab (All and Legislation, the others, are 60-legislation.js). Enforcement lists what agencies and attorneys general have done about AI, and Cases what courts
     have decided or are deciding, both from LEGISLATION_ACTIONS (data/legislation-actions.js, which tools/actions.py generates from the `enforcement` and `cases` tabs of the Google Sheet and nobody edits by hand: the row format is at the top of that file, and the rules for filling a row in, which are strict, are in content/README.md). They are ONE list
     drawn twice: the open view (enforcement or cases, activeView) says which kind of row is listed, and the two share the list's area (#enforcementArea), the search and the topic chips and, with Legislation, the toolbar, the Show menu and the map (the Government action area, src/views/60-legislation.html). While the
     file has no row of the kind the section is the placeholder it was (the note in src/views/60-legislation.html, under the tab's one masthead); the first row of the kind turns its list on, so nothing about
     a section changes on the live site until a row has been approved in the Sheet.

     One tab, four sections, one PLACE. The nav has one tab, Government action; a switch in the toolbar (src/views/60-legislation.html) moves between Legislation, Enforcement, Cases and All, and each section
     has an address of its own (#cases, #enforcement, #legislation). A jurisdiction is a filter here, not a home, so the place chosen in the Show menu or on the map is SHARED by the three (legView.pinned in
     60-legislation.js): pick Texas on one and it is still Texas on the others. "Federal" is two different bodies, Congress on Legislation and the federal agencies and courts here, and the two menus say so. A
     federal row has no state; a state attorney general's action or a state court's case carries its state's USPS code, and that is where it is listed. The address carries the place (#enforcement/texas,
     #cases/federal, #cases/states for every state at once: the States button, 2026-11-24), so a link opens the section on it, and the map's card on Legislation (legPanel) counts the rows of the place it shows and links to each section that has some (enfCardBlock): the card is
     the one-screen summary of a place, and the sections are where its detail is.

     Actions and cases are never counted with the bills, nor with each other: a settlement or a ruling is not a bill, and a total that mixed them would mean nothing. Adding a kind is a row in ENF_KINDS, a
     route (VIEWS in 40-router.js), a button in the switch, and its words in the data file's header (the masthead is the tab's, one for all its sections). A status and an outcome are plain text, not pills (a pill looks
     like a button, and these are labels to read; the owner's preference, 2026-11-17); the topic filter is the Papers chips, as on Legislation.

     ALL, the fourth section (the owner, 2026-11-18: "There should be an All view that's separate from the Legislation view. Currently it looks like legislation holds all the data"), holds everything, in this order in its
     card and on its page: the bills, then both of these lists, the key cases and the enforcement actions (enfRenderAll; ENF_KINDS_ALL says the order). It shows the bills' controls (Status, the checkbox, the chips, the search, Sort), and those narrow the lists here as well: a
     row's words and topics are the same vocabulary as a bill's, so what the chips and the search mean is the same on every list (enfFilt says whose state they are). Legislation, Enforcement and Cases show their own data alone.

     THE MAP follows the open section. It is the same map in all four, and legPaint (60-legislation.js) shades its states by how many of that section's rows each has: the bills on Legislation, the enforcement
     actions on Enforcement, the key cases on Cases, all three added up on All (enfMapData, above), with a legend that says which. The card holds the section's own block or blocks (enfCardBlock), each with a "See more details below" link where the place has rows. A place that has
     none of the section's rows is left plain, which is the data's own answer: the lists are kept by hand and are not complete (see the note under each).

     PAGES. A list shows ten rows to a page, as the bills' table does (LEG_PAGE_SIZE), with the Papers pager under it (enfSection, enfPagers); the title counts every row in view. Each kind keeps its own page, and a change in what
     is in view (the place, the search, the topics, the order, the section) starts them again at 1 (enfSyncPages).

     SORT. The Sort menu is on every section, in the same place (the search bar's first row, after the search), and its three choices mean the same thing on each: Most recent (the default), Oldest and
     Jurisdiction (the federal side first, then the states A to Z, each place's rows newest first). The bills' menu is #legSort and the lists' is #enfSort, two menus because the two sections' own
     controls are separate throughout, but one setting for the tab, legView.sort: choose Oldest on one section and the others open oldest first. Sort is not a filter, so "Clear filters" leaves it alone. (The bills' menu also has two Status orders, by progress; a list has no stage to order by, so under one of them it lists most recent first and its menu says Most recent.)

     ORDER. This file runs BEFORE 60-legislation.js, because the first card is drawn when that file finishes (buildLegislationView) and the card calls enfCardBlock: what the card uses here is a
     function declaration or a const at the top of this file. What this file takes from the Legislation script (legView, legName, legSlug, ...) is read when it runs, never when it loads. */
  const ENF_KINDS = [
    { kind: 'enforcement', view: 'enforcement', one: 'enforcement action', many: 'enforcement actions', tag: 'action', tags: 'actions' },   // tag and tags: the short names the map's legend counts in
    { kind: 'case',        view: 'cases',       one: 'key case',           many: 'key cases',           tag: 'case',   tags: 'cases' },
  ];
  // The order All holds them in, in its card and on its page (the owner, 2026-11-18: the bills, "and then cases and enforcement"; the midterm results that came before the bills were removed on 2026-11-23): the key cases, then the enforcement actions.
  const ENF_KINDS_ALL = [ENF_KINDS[1], ENF_KINDS[0]];
  const ENF_FED_NAME = 'Federal (agencies and courts)';   // the Legislation menu says "Federal (Congress)": two different bodies, so two names
  // pages: the page each list is on, by kind (a list shows LEG_PAGE_SIZE rows, ten, like the bills' table: the owner, 2026-11-18, "There should be a max of 10 bills per page").
  const enfView = { q: '', topics: new Set(), pages: { enforcement: 1, case: 1 } };
  // The note under each list's table, above the divider under its page numbers (the owner, 2026-11-18: each blurb below its table and above the divider). It also carries the caution each section's own blurb used to
  // carry, now that the masthead is the tab's and one for all four sections: an allegation is not a finding; a ruling is only what that court held.
  const ENF_NOTES = {
    enforcement: "Each entry is checked against the agency's or attorney general's own page before it goes in, and an allegation is described as an allegation: most actions end in a settlement with no admission. The list is kept by hand and is not complete: a place with none listed may still have actions we have not added.",
    case: "Each entry is checked against the court's own page before it goes in. A ruling is only what that court held, and a case can still change. The list is kept by hand and is not complete: a place with none listed may still have cases we have not added.",
  };
  let enfSig = '';   // what was in view when the pages were last put right (enfSyncPages)
  let enfSearchTimer;   // the pause before the search box narrows the list (the Reset button cancels a pending one)
  let enfPillsFor = null;   // the kind and the list of topic ids the pills were built for

  /* The list's order, a key of enfSorters (the Sort menu, whose setting is legView.sort, shared with the bills). "Most recent" and "Oldest" go by the row's date, a tie by title, and a row with no date comes
     last either way (the data file requires a date, so that is only a guard). "Jurisdiction" puts the federal agencies and courts first, then the states A to Z, then a row with no place, each place's
     rows newest first. */
  const enfByDate = asc => (a, b) => { const x = String(a.date || ''), y = String(b.date || ''); if (!x !== !y) return x ? -1 : 1; return (x === y ? 0 : ((x < y) === asc ? -1 : 1)) || String(a.title || '').localeCompare(String(b.title || '')); };
  const enfRank = a => { const p = enfPlaceOf(a); return p === LEG_FED ? 0 : p ? 1 : 2; };
  const enfSorters = {
    recent: enfByDate(false),
    oldest: enfByDate(true),
    jurisdiction: (a, b) => (enfRank(a) - enfRank(b)) || (enfRank(a) === 1 ? legName(enfPlaceOf(a)).localeCompare(legName(enfPlaceOf(b))) : 0) || enfByDate(false)(a, b),
  };

  // The kind of row the open section lists: Enforcement the enforcement actions, Cases the cases.
  const enfCurrent = () => ENF_KINDS.find(k => k.view === activeView) || ENF_KINDS[0];

  function enfRows() {
    const raw = (typeof LEGISLATION_ACTIONS !== 'undefined' && Array.isArray(LEGISLATION_ACTIONS)) ? LEGISLATION_ACTIONS : [];
    return raw.filter(a => a && a.id && ENF_KINDS.some(k => k.kind === a.kind));
  }
  const enfRowsOf = k => enfRows().filter(a => a.kind === k.kind);
  // Where a row is listed in the Show menu: a federal row under Federal, a state attorney general's action or a state court's case under its state; a row with neither is listed only while all
  // jurisdictions are showing.
  function enfPlaceOf(a) { return a.state ? String(a.state) : (a.level === 'federal' ? LEG_FED : ''); }
  const enfPlaceName = place => place === LEG_FED ? ENF_FED_NAME : place === LEG_STATES ? legScopeName(LEG_STATES) : legName(place);
  // What a place is called inside a sentence ("None listed for the states yet."): the States place (every state at once, 60-legislation.js) reads as a plural there, not as the menu's "All states".
  const enfPlaceWords = place => place === LEG_STATES ? legScopeWords(LEG_STATES) : enfPlaceName(place);
  const enfSlug = place => place === LEG_FED ? LEG_FED : place === LEG_STATES ? LEG_STATES : legSlug(place);

  /* The rows of the open section in view: the place, the search and the topics. skipTopics leaves the topics out, which is what the topic pills are counted against. */
  const enfHayMemo = new WeakMap();
  function enfHay(a) {
    let h = enfHayMemo.get(a);
    if (h === undefined) {
      h = [a.title, a.body, a.what, a.outcome, a.status, a.date, a.state ? legName(a.state) : (a.level === 'federal' ? 'federal' : ''), (a.uses || []).map(legTopicLabel).join(' ')].filter(Boolean).join(' ').toLowerCase();
      enfHayMemo.set(a, h);
    }
    return h;
  }
  const enfTopicsOk = (a, picked) => { let ok = true; picked.forEach(id => { if ((a.uses || []).indexOf(id) < 0) ok = false; }); return ok; };
  // The search and the topics that narrow the rows: the lists' own (enfView) on Enforcement and Cases, and the bills' (legView) on All, which shows the bills' controls and lets them apply to everything it holds.
  const enfFilt = () => activeView === 'all' ? legView : enfView;
  function enfList(skipTopics, anyPlace, kind) {   // anyPlace leaves the place out: what the map counts (its steps are every state's; legPaint then shades only the pinned state, when one is); kind says which rows (the open section's by default)
    const f = enfFilt(), words = legWords(f.q), place = anyPlace ? null : legView.pinned;
    return enfRowsOf(kind || enfCurrent()).filter(a => legPlaceIn(enfPlaceOf(a), place) && words.every(w => enfHay(a).indexOf(w) >= 0) && (skipTopics || enfTopicsOk(a, f.topics)));
  }
  // The topics some row of the open section bears on, in the order of LEGISLATION_TOPICS (the same list as the bills' topics, so a topic means the same thing on every section).
  function enfTopicIds() {
    const used = new Set();
    enfRowsOf(enfCurrent()).forEach(a => (a.uses || []).forEach(id => used.add(id)));
    return legTopicRules().rules.map(r => r.id).filter(id => used.has(id));
  }

  /* The map's data on Enforcement and Cases (legPaint in 60-legislation.js shades and counts from it): the open section's rows by state, with the lists' own search and chips applied, as the bills' filters apply to the
     map on Legislation, and the place left out (but not its level: Federal counts only the federal rows, which are on no state, and All states only the states', so `level`, from legPaint; a single pinned state is left out here too, and legPaint shades only it). A federal row (an agency's action, a federal court's case) is on no state, and a row under a place with no shape (a territory) has none to colour: the legend counts
     both apart. */
  function enfMapData(kinds, level) {   // kinds: the open section's by default; All passes both. level: what the place pinned limits the map to (legPaint): 'federal' counts only the federal rows, 'state' only the states' and territories', else all
    const ks = kinds || [enfCurrent()], counts = {};
    let fed = 0, terr = 0;
    ks.forEach(k => enfList(false, true, k).forEach(a => {
      const p = enfPlaceOf(a);
      if (level === 'federal' ? p !== LEG_FED : level === 'state' && p === LEG_FED) return;
      if (p === LEG_FED) fed++; else if (p && legOnMap(p)) counts[p] = (counts[p] || 0) + 1; else if (p) terr++;
    }));
    return { k: ks[0], counts, fed, terr };
  }
  // All's result line (legFilterBar in 60-legislation.js) says, after the bills' count, how many of each list the search and the topics leave (the place is not part of the count, as for the bills): each kind on its own, never added together.
  const enfAllLine = () => ENF_KINDS_ALL.filter(k => enfRowsOf(k).length).map(k => { const n = enfRowsOf(k).length; return `${legNum(enfList(false, true, k).length)} of ${legNum(n)} ${n === 1 ? k.one : k.many}`; });

  /* The place, in the address bar and from it. */
  function enfRoute() { return enfCurrent().view + (legView.pinned ? '/' + enfSlug(legView.pinned) : ''); }
  function enfPlaceFromSlug(slug) {
    const s = String(slug || '').toLowerCase();
    if (s === LEG_FED) return LEG_FED;
    if (s === LEG_STATES) return LEG_STATES;
    const sel = document.getElementById('legStateSelect');
    const codes = sel ? [...sel.options].map(o => o.value).filter(v => v && v !== LEG_FED) : [];
    return codes.find(c => legSlug(c) === s) || null;
  }
  // From a link (the router): an unknown place, a stale or mistyped link, shows every jurisdiction.
  function enfOpenPlace(slug) { legSetPinned(enfPlaceFromSlug(slug)); }

  /* The map card's blocks (legPanel in 60-legislation.js), one for each kind the card holds: the key cases, then the enforcement actions, on All; the open kind alone on Enforcement and Cases. Each says what is listed for
     the place the card shows, as a count (no titles: the list below has them, as the bills' block has no previews), and where the place has rows it ends with a "See more details below" link that pins the place and takes the reader to that list (the owner, 2026-11-18: a
     link wherever the table below has information for the place, and none where there is no data yet to show). A place with none says "None listed", never "none" (the list is kept by hand and is not complete), and has
     no link. A kind with no row at all in the file has no block, so the card does not advertise a list that is not there. The whole country's card is not a place and has no link: the lists below are in full.
     code is null for the whole country, LEG_FED for the federal card, or a state's USPS code. */
  function enfCardBlock(code, kinds) {
    return (kinds || ENF_KINDS_ALL).map(k => {
      const all = enfRowsOf(k);
      if (!all.length) return '';
      const here = code ? all.filter(a => legPlaceIn(enfPlaceOf(a), code)) : all, label = capitalizeFirst(k.many);
      if (!here.length) return `<div class="leg-block"><div class="leg-label">${label}</div><p class="leg-muted">None listed${code ? ` for ${escapeHTML(enfPlaceWords(code))}` : ''} yet.</p></div>`;
      return `<div class="leg-block"><div class="leg-label">${label}</div><p>${legNum(here.length)} ${here.length === 1 ? k.one : k.many}${code ? '' : ', federal and in the states'}.</p>` +
        (code ? `<p class="leg-more"><button type="button" class="leg-more-link" data-more="${escapeHTML(code)}" data-kind="${k.kind}">See more details below</button></p>` : '') + '</div>';
    }).join('');
  }
  /* The card's "See more details below" in a block of cases or enforcement actions: pin the place, so the list below is about it, and take the reader to that list (legGoToDetails does the same for the bills). */
  function enfGoToDetails(kindKey, code) {
    const k = ENF_KINDS.find(x => x.kind === kindKey);
    if (code && legView.pinned !== code) legSetPinned(code);
    if (k) enfTableTop(k);
  }

  /* A list ten rows to a page, with the Papers pager under it (renderPager). A change in what is in view (the place, the search, the topics, the order, or the section) starts every list again at page 1; a page the reader
     turns to leaves what is in view alone, so it stays. The title counts every row in view, not the page's. */
  function enfSyncPages() {
    const f = enfFilt(), sig = [activeView, legView.pinned || '', f.q, [...f.topics].sort().join('|'), legView.sort].join('\x01');
    if (sig !== enfSig) { enfSig = sig; Object.keys(enfView.pages).forEach(k => { enfView.pages[k] = 1; }); }
  }
  function enfSection(k, rows, emptyText, scope) {
    const pages = Math.max(1, Math.ceil(rows.length / LEG_PAGE_SIZE)), page = enfView.pages[k.kind] = Math.min(Math.max(1, enfView.pages[k.kind] || 1), pages);
    const shown = rows.slice((page - 1) * LEG_PAGE_SIZE, page * LEG_PAGE_SIZE);
    return `<section class="leg-section" data-kind="${k.kind}"><h3 class="leg-section-title" id="enfTitle-${k.kind}"><span class="leg-scope leg-scope--title">${scope} · ${legNum(rows.length)} ${rows.length === 1 ? k.one : k.many}</span></h3>` +
      `<div class="leg-table-wrap" id="enfTable-${k.kind}" tabindex="-1">${legTable(['Date', 'Who acted', 'Matter', 'Outcome', 'Source'], shown.map(enfRow), emptyText, 'leg-table--enf')}</div><p class="leg-source">${escapeHTML(ENF_NOTES[k.kind])}</p><nav class="pager" data-kind="${k.kind}" hidden></nav></section>`;
  }
  // The pagers are drawn once the sections are in the document (renderPager writes into a <nav>); counts is each kind's number of rows in view.
  function enfPagers(kinds, counts) {
    kinds.forEach(k => {
      const nav = document.querySelector(`#enfLists nav.pager[data-kind="${k.kind}"]`);
      if (nav) renderPager(nav, { page: enfView.pages[k.kind], pages: Math.max(1, Math.ceil((counts[k.kind] || 0) / LEG_PAGE_SIZE)), noun: k.many, onPage: n => { enfView.pages[k.kind] = n; enfRender(); enfTableTop(k); } });
    });
  }
  // After a page change: the top of that list, with the keyboard on it so a reader starts at its first row, not at the pager they used (as legTableTop does for the bills).
  function enfTableTop(k) {
    const title = document.getElementById('enfTitle-' + k.kind), wrap = document.getElementById('enfTable-' + k.kind);
    if (title && typeof title.scrollIntoView === 'function') title.scrollIntoView({ block: 'start' });
    if (wrap) wrap.focus({ preventScroll: true });
  }

  /* One row of a list. The date is the action's or the ruling's; the outcome is plain text with the status and the date it was last checked beneath it (a case moves, so a status always says
     when it was looked at); the source is the agency's or court's own page, shown as its host, and is a link only when it is http or https. */
  function enfRow(a) {
    const url = legSafeUrl(a.url), host = url ? url.replace(/^https?:\/\/(www\.)?/i, '').split('/')[0] : '';
    const topics = (a.uses || []).map(id => escapeHTML(legTopicLabel(id)));
    const status = [a.status ? escapeHTML(a.status) : '', a.asOf ? `checked ${escapeHTML(legDateLong(a.asOf) || a.asOf)}` : ''].filter(Boolean).join(', ');
    const outcome = a.outcome ? escapeHTML(a.outcome) + (status ? `<div class="leg-status-note">${status}</div>` : '') : (status || LEG_DASH);
    return `<tr data-id="${escapeHTML(a.id)}"><td>${escapeHTML(legDateLong(a.date) || a.date || '')}</td><td>${escapeHTML(a.body || '')}</td>` +
      `<td class="leg-col-matter"><div class="enf-title">${escapeHTML(a.title || a.id)}</div>${a.what ? `<div>${escapeHTML(a.what)}</div>` : ''}${topics.length ? `<div class="leg-status-note">Topics: ${topics.join(', ')}</div>` : ''}</td>` +
      `<td>${outcome}</td><td>${url ? `<a href="${escapeHTML(url)}" target="_blank" rel="noopener">${escapeHTML(host)}</a>` : LEG_DASH}</td></tr>`;
  }

  // How many rows of a kind are listed in the place chosen, before the search and the topics: what an empty list needs to know to say "match the search" rather than "none listed".
  const enfInPlace = k => enfRowsOf(k).filter(a => legPlaceIn(enfPlaceOf(a), legView.pinned)).length;
  function enfEmpty(k, inPlace) {
    const place = legView.pinned, where = place ? ` in ${escapeHTML(enfPlaceWords(place))}` : '', f = enfFilt();
    if ((legWords(f.q).length || f.topics.size) && inPlace > 0) return `No ${k.many}${where} match the search and filters chosen.`;
    return place ? `None listed for ${escapeHTML(enfPlaceWords(place))} yet.` : 'None listed yet.';
  }

  /* All: both kinds' lists, one after the other, each with its own count, narrowed by the place and by the search and the topics in the bar above (on All those are the bills' own, legView). A kind with no row is left out, All has no
     placeholder, and with no row of either kind the whole area is hidden. The order is the tab's Sort setting. */
  function enfRenderAll(live, note) {
    const kinds = ENF_KINDS_ALL.filter(k => enfRowsOf(k).length), lists = document.getElementById('enfLists');
    live.hidden = !kinds.length;
    note.hidden = true;
    if (!lists) return;
    enfSyncPages();
    const place = legView.pinned, scope = escapeHTML(place ? enfPlaceName(place) : 'All jurisdictions'), order = enfSorters[legView.sort] || enfSorters.recent, counts = {};
    lists.innerHTML = kinds.map(k => {
      const rows = enfList(false, false, k).sort(order);
      counts[k.kind] = rows.length;
      return enfSection(k, rows, enfEmpty(k, enfInPlace(k)), scope);
    }).join('');
    enfPagers(kinds, counts);
  }

  function enfRender() {
    const live = document.getElementById('enfLive'), note = document.getElementById('enfPlaceholder');
    if (!live || !note) return;
    legSyncReset();   // the Reset button counts what is on, and the lists' own search and chips are part of it
    if (activeView === 'all') { enfRenderAll(live, note); return; }
    const k = enfCurrent(), all = enfRowsOf(k);
    const what = document.getElementById('enfPlaceholderWhat');
    if (what) what.textContent = capitalizeFirst(k.many);
    live.hidden = !all.length;
    note.hidden = !!all.length;
    // The lists' own controls (the chips, the search and the result line, in the shared bars above the map) go while there is nothing to narrow.
    ['enfTopicPills', 'enfSearchWrap', 'enfSortPair', 'enfResultRow'].forEach(id => { const el = document.getElementById(id); if (el) el.hidden = !all.length; });
    if (!all.length) { legPaint(); return; }   // (the map's legend says there is nothing to shade)
    const place = legView.pinned;   // the Show menu is the shared one (its Federal entry is renamed for these sections by govViewChanged in 60-legislation.js)
    const search = document.getElementById('enfSearch');
    if (search) { search.placeholder = `Search the ${k.many}…`; search.setAttribute('aria-label', `Search the ${k.many}`); }
    // the order is the tab's one setting (legView.sort), so the menu says what the bills' menu says; the bills' Status orders are not ones a list has (a row has no stage), so a list under one is ordered most recent
    // first and its menu says so, rather than show a choice it does not offer
    const sort = document.getElementById('enfSort');
    if (sort) { sort.value = enfSorters[legView.sort] ? legView.sort : 'recent'; sort.setAttribute('aria-label', `Sort the ${k.many}`); }
    // The topic pills: the topics some row of this section bears on, built once for that list. They carry no counts (the owner, 2026-11-24: "Remove counts from topics in the Government Action tab"); a topic that would leave nothing
    // with the place and the search applied is disabled, as it was when its count said 0. A topic picked
    // on the other section that this one has no row for is dropped, so the filter never hides everything for a reason the reader cannot see.
    const ids = enfTopicIds(), wrap = document.getElementById('enfTopicPills'), key = k.kind + ':' + ids.join('|');
    enfView.topics.forEach(id => { if (ids.indexOf(id) < 0) enfView.topics.delete(id); });
    if (wrap && enfPillsFor !== key) {
      enfPillsFor = key;
      const chip = (id, label) => `<button class="kw-pill" type="button" data-topic="${escapeHTML(id)}" aria-pressed="false">${escapeHTML(label)}</button>`;
      wrap.innerHTML = ids.length ? '<span class="ctl-label kw-label">Topics</span>' + chip('all', 'All') + ids.map(id => chip(id, legTopicLabel(id))).join('') : '';
    }
    const base = enfList(true);
    if (wrap) wrap.querySelectorAll('button[data-topic]').forEach(btn => {
      const id = btn.getAttribute('data-topic'), on = id === 'all' ? !enfView.topics.size : enfView.topics.has(id);
      const n = id === 'all' ? base.length : base.filter(a => enfTopicsOk(a, new Set([...enfView.topics, id]))).length;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.disabled = n === 0 && !on;
    });
    const shown = enfList();
    const line = document.getElementById('enfResultLine');
    if (line) line.textContent = `${legNum(shown.length)} of ${legNum(all.length)} ${all.length === 1 ? k.one : k.many}.`;
    // The list, with its count, in the order the Sort menu says (newest first until it is changed).
    const scope = escapeHTML(place ? enfPlaceName(place) : 'All jurisdictions'), lists = document.getElementById('enfLists');
    if (lists) {
      enfSyncPages();
      const rows = shown.slice().sort(enfSorters[legView.sort] || enfSorters.recent);
      lists.innerHTML = enfSection(k, rows, enfEmpty(k, enfInPlace(k)), scope);
      enfPagers([k], { [k.kind]: rows.length });
    }
    // The map is shaded from the same rows (the search and the topics, not the place), so it is drawn again whenever the list is: after the topics a section lacks were dropped above, too.
    legPaint();
  }

  // The place is shared by the four sections and chosen in the shared Show menu or on the shared map: legSetPinned (60-legislation.js) calls this when it changes, and when Enforcement or Cases is open the list is
  // drawn again and the place goes in the address.
  function enfPlaceChanged() {
    if (activeView === 'enforcement' || activeView === 'cases') { enfRender(); setHash(enfRoute()); }
    else if (activeView === 'all') enfRender();   // All lists the place too, and its address carries none
  }
  function enfFiltersChanged() { enfRender(); }

  (function wireEnforcement() {
    const area = document.getElementById('enforcementArea');
    const search = document.getElementById('enfSearch'), wrap = document.getElementById('enfTopicPills');
    if (!area) return;
    if (search) search.addEventListener('input', () => { clearTimeout(enfSearchTimer); enfSearchTimer = setTimeout(() => { enfView.q = search.value; enfFiltersChanged(); }, 150); });
    // "All" clears the topics; any other is added or taken off (the topics are ANDed, as on Legislation and in the Fact Bank: a row must bear on every one picked).
    if (wrap) wrap.addEventListener('click', e => {
      const b = e.target.closest ? e.target.closest('button[data-topic]') : null;
      if (!b || b.disabled) return;
      const id = b.getAttribute('data-topic');
      if (id === 'all') enfView.topics.clear(); else if (enfView.topics.has(id)) enfView.topics.delete(id); else enfView.topics.add(id);
      enfFiltersChanged();
    });
    // Sort is one setting for the tab (legView.sort); changing it here leaves the bills' menu to catch up the next time Legislation is drawn (legFilterBar sets it from legView.sort).
    const sort = document.getElementById('enfSort');
    if (sort) sort.addEventListener('change', () => { legView.sort = sort.value; enfFiltersChanged(); });
    // A refresh means the data changed under the page (a late load, or a test): build the pills again and redraw.
    area.addEventListener('enforcement:refresh', () => { enfPillsFor = null; enfRender(); });
  })();
