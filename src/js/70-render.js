  /* ── render ──────────────────────────────────────────────────── */

  // View-DOM cache. Each view's DOM is built once and re-shown on tab switch;
  // it rebuilds only when its inputs (its "signature") change. This stops
  // #cardsGrid from being torn down on every switch — the actual source of
  // tab-switch jank. (Dataset cloning,
  // ~0.5ms/render, was never the bottleneck; DOM construction is.)
  let _cardsSig  = null;   // null = never built
  const cardsSig  = () => [activeCat, activeGeo, activeEvidence, sortOrder, searchQuery.trim(), papersPage].join('\x01');

  function render() {
    const grid  = document.getElementById('cardsGrid');
    const empty = document.getElementById('emptyState');

    document.body.classList.toggle('cards-view', activeView === 'cards');

    if (activeView === 'policy') {
      // The Policy tab is the map, built by buildPolicyView(); its cards can be hidden behind a notice (policyCardsHidden
      // in 00-state.js).
      buildPolicyView();
      return;
    }
    // About, Agenda and Enforcement are static markup, and Legislation is drawn by its own script (60-legislation.js): there is nothing to build here.
    if (activeView === 'about' || activeView === 'agenda' || activeView === 'enforcement' || activeView === 'legislation') { return; }

    // ── Papers (cards) view ──
    const sig = cardsSig();
    if (_cardsSig === sig) return;   // cached: DOM already reflects these inputs
    _cardsSig = sig;

    const visible = getVisible();
    // Fifty rows at a time. A filter that leaves fewer pages than the reader was on puts them on the last one.
    const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
    papersPage = Math.min(Math.max(papersPage, 1), pages);
    _cardsSig = cardsSig();
    const first = (papersPage - 1) * PAGE_SIZE;
    const onPage = visible.slice(first, first + PAGE_SIZE);
    refreshPapersBar(visible.length, pages > 1 ? [first + 1, first + onPage.length] : null);

    empty.classList.toggle('visible', visible.length === 0);
    const hasFilters = activeCat !== 'all' || activeGeo !== 'all' || activeEvidence !== 'all' || searchQuery.trim();
    ppEl('emptyStateClear').style.display = visible.length === 0 && hasFilters ? 'inline-block' : 'none';

    grid.innerHTML = '';
    const rows = document.createDocumentFragment();
    onPage.forEach(e => rows.appendChild(buildSourceRow(e)));
    grid.appendChild(rows);
    renderPager(ppEl('ppPager'), { page: papersPage, pages, noun: 'papers', onPage: goToPapersPage });
    loadFactCounts();
  }

  /* ── Papers bar ───────────────────────────────────────────────
     The search-and-filters bar above the list. It is the Fact Bank's bar (same markup shape, same
     styles: src/styles/filterbar.css) with this tab's facets: search and Sort in view, Methodology,
     Category and Region behind "More filters". The select options are built once and
     refreshPapersBar() only rewrites their labels, so a select that is in use keeps its focus. */
  const ppEl = id => document.getElementById(id);
  const ppSearch = ppEl('ppSearch'), ppSort = ppEl('ppSort'), ppMethod = ppEl('ppMethod');
  const ppCategory = ppEl('ppCategory'), ppRegion = ppEl('ppRegion');
  const ppMoreCount = ppEl('ppMoreCount'), ppClear = ppEl('ppClear'), ppResultLine = ppEl('ppResultLine');

  [[ppMethod, Object.entries(EVIDENCE_META).map(([k, m]) => [k, m.label])],
   [ppCategory, CATEGORIES.map(c => [c.id, c.label])],
   [ppRegion, Object.entries(GEOGRAPHY_META).map(([k, g]) => [k, g.label])]].forEach(([select, options]) => {
    options.forEach(([value, label]) => {
      const o = document.createElement('option');
      o.value = value; o.dataset.label = label; o.textContent = label;
      select.appendChild(o);
    });
  });

  // Put the controls back in step with the state, for the places that change the state from
  // outside them ("Clear filters", a #entry/<id> link).
  function syncPapersControls() {
    ppSearch.value = searchQuery;
    ppSort.value = sortOrder;
    ppMethod.value = activeEvidence;
    ppCategory.value = activeCat;
    ppRegion.value = activeGeo;
  }
  // The three filters "Clear filters" resets. Search and sort are left alone, as in the Fact Bank;
  // a link to one paper resets them too and puts the paper's title in the search (see the router).
  function resetPaperFilters({ search = false } = {}) {
    activeEvidence = 'all'; activeCat = 'all'; activeGeo = 'all';
    if (search) searchQuery = '';
    syncPapersControls();
  }

  function refreshPapersBar(shown, range) {
    // Each option carries a count taken with every other filter applied, so it says what choosing
    // it would leave. An option with nothing behind it is disabled unless it is the current choice.
    const tally = (rows, key) => rows.reduce((m, r) => { const k = key(r); m[k] = (m[k] || 0) + 1; return m; }, {});
    const relabel = (select, current, counts) => [...select.options].forEach(o => {
      if (o.value === 'all') return;
      const count = counts[o.value] || 0;
      o.textContent = `${o.dataset.label} (${count})`;
      o.disabled = count === 0 && o.value !== current;
    });
    relabel(ppMethod,   activeEvidence, tally(filteredBase({ excludeEvidence: true }), getEvidenceType));
    relabel(ppCategory, activeCat,      tally(filteredBase({ excludeCat: true }), r => r.category));
    relabel(ppRegion,   activeGeo,      tally(filteredBase({ excludeGeo: true }), r => r.geography || 'us'));
    // The badge counts what is switched on inside "More filters" (Methodology, Category, Region).
    // Sort stays in view and is not a filter.
    const inPanel = (activeEvidence !== 'all' ? 1 : 0) + (activeCat !== 'all' ? 1 : 0) + (activeGeo !== 'all' ? 1 : 0);
    ppMoreCount.hidden = inPanel === 0;
    ppMoreCount.textContent = inPanel;
    ppClear.hidden = inPanel === 0;
    ppResultLine.textContent = `${shown} of ${RESEARCH_DATA.length} papers.` + (range ? ` Showing ${range[0]} to ${range[1]}.` : '');
  }

  wireMoreFilters('ppMoreToggle', 'ppMorePanel');
  // Paging. Any change to what the list holds starts it again at page 1; the pager is the one thing that
  // moves between pages.
  const papersChanged = () => { papersPage = 1; render(); };
  function goToPapersPage(n) { papersPage = n; render(); showListTop(ppEl('cardsGrid')); }
  let ppSearchTimer;
  ppSearch.addEventListener('input', e => {
    clearTimeout(ppSearchTimer);
    ppSearchTimer = setTimeout(() => { searchQuery = e.target.value; papersChanged(); }, 200);
  });
  ppMethod.addEventListener('change',   e => { activeEvidence = e.target.value; papersChanged(); });
  ppCategory.addEventListener('change', e => { activeCat = e.target.value; papersChanged(); });
  ppRegion.addEventListener('change',   e => { activeGeo = e.target.value; papersChanged(); });
  ppSort.addEventListener('change',     e => { sortOrder = e.target.value; papersChanged(); });
  ppClear.addEventListener('click', () => { resetPaperFilters(); papersChanged(); });
  // The empty state's button also clears the search, since either can be why nothing matched.
  ppEl('emptyStateClear').addEventListener('click', () => { resetPaperFilters({ search: true }); papersChanged(); });

  // Papers rows: open and close, and the copy button in an open row, through one
  // delegated listener. A row's body is built the first time it opens.
  function setSourceRowOpen(row, open) {
    const body = row.querySelector('.src-body');
    if (open && !body.firstChild) {
      body.innerHTML = buildSourceBody(RESEARCH_DATA.find(r => r.id === +row.dataset.entryId));
    }
    row.classList.toggle('open', open);
    row.querySelector('.src-toggle').setAttribute('aria-expanded', String(open));
    body.hidden = !open;
  }
  document.getElementById('cardsGrid').addEventListener('click', e => {
    const toggle = e.target.closest('.src-toggle');
    if (toggle) {
      const row = toggle.closest('.src-row');
      setSourceRowOpen(row, !row.classList.contains('open'));
      return;
    }
    const act = e.target.closest('button[data-fmt]');
    if (!act) return;
    copyText(summaryWithCitation(RESEARCH_DATA.find(r => r.id === +act.closest('.src-row').dataset.entryId)), act);
  });

  // ── topbar controls ──────────────────────────────────────────
  // `lede` is the question or statement the tab opens on, set at the
  // shared --lede-size; `text` is the standfirst underneath, which
  // carries the masthead's closing hairline. Papers, Policy and Legislation read this
  // table for display — the other two hide
  // .header-tab-desc and carry their own markup — but every entry keeps
  // a lede so the pattern survives a tab being switched over later.
  const TAB_DESCS = {
    cards: { lede: 'What does the research show?', text: 'A curated database of peer-reviewed studies, policy reports, and investigative journalism on AI, automation, and labor markets.' },
    'fact-bank': { lede: 'Which numbers can you cite?', text: 'Short, number-bearing statements quoted verbatim from sources in the research database, each rated for political noteworthiness and for the rigour of its evidence.' },
    // The Policy tab's masthead is the map's own; getTabDesc swaps in a notice while the map's cards are hidden.
    policyMap: {
      lede: 'What could policy do about it?',
      // The counts come from the data the map is drawn from, not from here: this line once said "Twenty-seven" while the
      // map listed 32. A getter, so every reader of .text gets the figures as they stand when it asks.
      get text() {
        const c = policyMapCounts();
        return `${capitalizeFirst(spellNumber(c.policies))} policy interventions grouped into ${spellNumber(c.areas)} policy areas, listed alphabetically within each. Click any policy for rationale, precedents, and supporting research.`;
      },
    },
    about: { lede: 'Welcome to our AI dashboard.', text: 'How this tracker is structured and how to use it.' },
    // A placeholder tab, first in the Policy group: this masthead and the one note under it (src/views/40-agenda.html) are all it says. Replace both when there is an agenda.
    agenda: { lede: 'What is our policy agenda?', text: 'Coming soon.' },
    // A placeholder tab, first in the Government action group: this masthead and the one note under it (src/views/65-enforcement.html) are all it says. Replace both when there is something to list.
    enforcement: { lede: 'What has been enforced, and what have the courts said?', text: 'Coming soon: enforcement actions and key cases.' },
    // What is loaded, said from the data (legislationMasthead() in 60-legislation.js), so it cannot go stale.
    // Getters, so the question and the standfirst follow the layer: the bills on Bills, the 2026 midterm results on 2026 Midterm results.
    legislation: { get lede() { return legislationLede(); }, get text() { return legislationMasthead(); } },
  };
  /* Counts quoted in copy are computed from the data they describe, never typed. spellNumber() is the house style (small
     numbers in words; 100 and over fall back to digits). policyMapCounts() applies the rule buildPolicyView() draws the
     map by, so the masthead cannot disagree with the page: a policy is listed when its category maps to one of the
     four rows (MERGED_POLICY_CATEGORIES), and a row with no policies is not drawn. */
  function spellNumber(n) {
    const ones = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
      'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    if (!Number.isInteger(n) || n < 0 || n > 99) return String(n);
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? '-' + ones[n % 10] : '');
  }
  const capitalizeFirst = str => str.charAt(0).toUpperCase() + str.slice(1);
  function policyMapCounts() {
    const rows = new Map();
    POLICY_DATA.forEach(p => {
      const row = CATEGORY_MERGE_MAP[p.category];
      if (row in MERGED_POLICY_CATEGORIES) rows.set(row, (rows.get(row) || 0) + 1);
    });
    return { policies: [...rows.values()].reduce((a, b) => a + b, 0), areas: rows.size };
  }
  function getTabDesc(view) {
    if (view === 'policy') {
      // The map hidden (see 00-state.js): one "being updated" line.
      if (policyCardsHidden) {
        return { lede: 'What should we do?', text: 'Our policy work is being updated and is temporarily unavailable here.' };
      }
      return TAB_DESCS.policyMap;
    }
    return TAB_DESCS[view] || null;
  }

  /* The only writer of the masthead's copy. A view switch changes it (as did a lens switch and a Research
     sub-tab switch, until both were removed), so it reads the state and writes the copy in one place. Read the
     state, don't push to it. */
  function applyMastheadCopy() {
    const desc = getTabDesc(activeView);
    if (!desc) return;
    const ld = document.getElementById('headerTabDescLede');
    const t  = document.getElementById('headerTabDescText');
    if (ld) ld.textContent = desc.lede || '';
    if (t)  t.textContent  = desc.text;
  }

  const VIEW_TAB_IDS = { cards: 'viewCards', 'fact-bank': 'viewFactBank', agenda: 'viewAgenda', policy: 'viewPolicy', legislation: 'viewLegislation', enforcement: 'viewEnforcement', about: 'homeTitleLink' };

  function setView(view) {
    activeView = view;
    viewInitialized = true;
    ['viewCards', 'viewFactBank', 'viewAgenda', 'viewPolicy', 'viewLegislation', 'viewEnforcement'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const active = id === VIEW_TAB_IDS[view];
      el.classList.toggle('active', active);
      el.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    // Update header tab description
    applyMastheadCopy();
    document.body.classList.toggle('policy-view',   view === 'policy');
    document.body.classList.toggle('about-view',    view === 'about');
    document.body.classList.toggle('agenda-view',   view === 'agenda');
    document.body.classList.toggle('enforcement-view', view === 'enforcement');
    document.body.classList.toggle('legislation-view', view === 'legislation');
    document.body.classList.toggle('fact-bank-view',   view === 'fact-bank');
    if (view === 'fact-bank' && typeof initFactBank === 'function') initFactBank();
    if (view === 'legislation' && typeof legLoadBills === 'function') legLoadBills();   // the bills are a file of their own, fetched on first open
    render();
    const activeTabId = VIEW_TAB_IDS[view] || ('view' + view.charAt(0).toUpperCase() + view.slice(1));
    const panel = document.getElementById('viewPanel');
    if (panel) panel.setAttribute('aria-labelledby', activeTabId);
    const ann = document.getElementById('viewAnnounce');
    if (ann) {
      // Must match the tabs' accessible names in src/views/10-header.html (the visible label, plus an aria-label
      // where the tab needs its group to make sense): this is what a screen reader announces on a view change.
      const names = { cards: 'Papers', 'fact-bank': 'Fact Bank', agenda: 'Policy agenda', policy: 'Policy landscape', legislation: 'Legislation', enforcement: 'Enforcement actions and key cases', about: 'About' };
      ann.textContent = (names[view] || view) + ' view';
    }
    setHash(currentRoute());
  }
  /* One delegated listener for the whole view nav, keyed on data-view in
     src/views/10-header.html. This replaced six near-identical listeners that
     had to be edited in lockstep with the markup; now adding a view button is
     a data-view attribute and a VIEWS row in 40-router.js. */
  document.addEventListener('click', e => {
    const btn = e.target.closest('.header-nav-btn[data-view]');
    if (!btn) return;
    const view = btn.dataset.view;
    if (view === 'fact-bank') clearFactBankLink();
    if (view === 'cards') clearPapersLink();
    setView(view);
  });

  // ── sources modal ─────────────────────────────────────────────
  (function() {
    const modal   = document.getElementById('sourcesModal');
    const body    = document.getElementById('sourcesModalBody');
    const openBtn = document.getElementById('sourcesInfoBtn');
    const closeBtn= document.getElementById('sourcesModalClose');

    function openModal() {
      modal._lastFocus = document.activeElement;
      if (!body.hasChildNodes()) {
        const intro = document.createElement('p');
        intro.className = 'modal-sources-intro';
        intro.textContent = 'These are the institutions and organizations whose work is tracked in this database.';
        body.appendChild(intro);

        Object.entries(PRIORITY_SOURCE_GROUPS).forEach(([group, names]) => {
          const g = document.createElement('div');
          g.className = 'modal-group';
          const rows = names.map(name => {
            const meta = INST_META[name] || {};
            const nameEl = meta.url
              ? `<a class="modal-source-link" href="${meta.url}" target="_blank" rel="noopener">${name}<span class="modal-source-ext">↗</span></a>`
              : `<span class="modal-source-link">${name}</span>`;
            return `<div class="modal-source-row">
              <div class="modal-source-top">${nameEl}</div>
            </div>`;
          }).join('');
          g.innerHTML = `<div class="modal-group-name">${group}</div>
            <div class="modal-sources-list">${rows}</div>`;
          body.appendChild(g);
        });
      }
      modal.classList.add('open');
      requestAnimationFrame(() => { closeBtn.focus(); });
    }
    function closeModal() {
      modal.classList.remove('open');
      if (modal._lastFocus) { modal._lastFocus.focus(); modal._lastFocus = null; }
    }

    openBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  })();

  // ── about modal ──────────────────────────────────────────────
  (function() {
    const modal    = document.getElementById('aboutModal');
    const openBtn  = document.getElementById('aboutInfoBtn');
    const closeBtn = document.getElementById('aboutModalClose');
    function openModal()  {
      modal._lastFocus = document.activeElement;
      modal.classList.add('open');
      requestAnimationFrame(() => { closeBtn.focus(); });
    }
    function closeModal() {
      modal.classList.remove('open');
      if (modal._lastFocus) { modal._lastFocus.focus(); modal._lastFocus = null; }
    }
    openBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  })();

  // ── Home: the site title is the About page ───────────────────
  document.getElementById('homeTitleLink')?.addEventListener('click', e => {
    e.preventDefault();
    setView('about');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.getElementById('aboutInfoBtnTopbar')?.addEventListener('click', () => {
    document.getElementById('aboutInfoBtn').click();
  });
  document.getElementById('sourcesInfoBtnTopbar')?.addEventListener('click', () => {
    document.getElementById('sourcesInfoBtn').click();
  });

  // ── Modal focus trap (keyboard accessibility) ───────────────
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const open = document.querySelector('.modal-backdrop.open');
    if (!open) return;
    const f = [...open.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter(el => el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // ── R7: data-validation guard (console-only) ────────────────
  // Catches the silent-reference-rot class of bug (e.g. an entry carrying a
  // theme id as its category, a cite token pointing at a deleted entry) at load.
  (function validateData() {
    const problems = [];
    const catIds = new Set(CATEGORIES.map(c => c.id));
    const ids = new Set();
    RESEARCH_DATA.forEach(e => {
      if (ids.has(String(e.id))) problems.push(`duplicate entry id ${e.id}`);
      ids.add(String(e.id));
      if (!catIds.has(e.category)) problems.push(`entry ${e.id}: unknown category "${e.category}"`);
      if (e.geography && !GEOGRAPHY_META[e.geography]) problems.push(`entry ${e.id}: unknown geography "${e.geography}"`);
      if (!e.date || isNaN(new Date(e.date + 'T00:00:00'))) problems.push(`entry ${e.id}: bad date "${e.date}"`);
      if (e.added && isNaN(new Date(e.added + 'T00:00:00'))) problems.push(`entry ${e.id}: bad added "${e.added}"`);
    });
    (typeof POLICY_SOURCES !== 'undefined' ? POLICY_SOURCES : []).forEach(s => ids.add(String(s.id)));
    const polIds = new Set(POLICY_DATA.map(p => p.id));
    POLICY_DATA.forEach(p => {
      (p.paperIds || []).forEach(pid => { if (!ids.has(String(pid))) problems.push(`policy ${p.id}: paperId ${pid} not found`); });
      if (!POLICY_CATEGORIES[p.category]) problems.push(`policy ${p.id}: unknown category "${p.category}"`);
      if (!DISRUPTION_LEVELS.some(l => l.id === p.level)) problems.push(`policy ${p.id}: unknown level "${p.level}"`);
      // A base category with no CATEGORY_MERGE_MAP entry drops its policies
      // out of the Policy Map rows entirely — the rows filter by merged
      // category, so the card renders nowhere and nothing errors.
      if (!CATEGORY_MERGE_MAP[p.category]) problems.push(`policy ${p.id}: category "${p.category}" has no CATEGORY_MERGE_MAP entry, so it renders in no Policy Map row`);
      else if (!MERGED_POLICY_CATEGORIES[CATEGORY_MERGE_MAP[p.category]]) problems.push(`policy ${p.id}: category "${p.category}" merges to unknown row "${CATEGORY_MERGE_MAP[p.category]}"`);
    });
    Object.entries(CATEGORY_MERGE_MAP).forEach(([orig, merged]) => {
      if (!POLICY_CATEGORIES[orig]) problems.push(`merge map: unknown base category "${orig}"`);
      if (!MERGED_POLICY_CATEGORIES[merged]) problems.push(`merge map: "${orig}" points at unknown merged category "${merged}"`);
    });
    Object.keys(MERGED_POLICY_CATEGORIES).forEach(mc => {
      if (!MERGED_CAT_DESCS[mc]) problems.push(`merged category "${mc}": no MERGED_CAT_DESCS entry`);
    });
    const scanTokens = (obj, label) => {
      const s = JSON.stringify(obj);
      for (const m of s.matchAll(/\{\{citep?:([\w-]+)\}\}/g)) {
        if (!ids.has(m[1])) problems.push(`${label}: cite token ${m[1]} resolves to no entry`);
      }
      for (const m of s.matchAll(/\{\{pol:([a-z0-9-]+)\|/g)) {
        if (!polIds.has(m[1])) problems.push(`${label}: policy cross-reference "${m[1]}" resolves to no policy`);
      }
    };
    // Paper summaries (the pilot, data/paper-summaries.js): shape and house rules
    (typeof PAPER_SUMMARIES !== 'undefined' ? Object.entries(PAPER_SUMMARIES) : []).forEach(([id, s]) => {
      if (!RESEARCH_DATA.some(e => String(e.id) === id)) problems.push(`summary ${id}: no such paper`);
      if (!s.lede || !s.body) problems.push(`summary ${id}: needs a lede and a body paragraph`);
      if (s.basis !== 'full text' && s.basis !== 'abstract only') problems.push(`summary ${id}: basis must be "full text" or "abstract only"`);
      if (s.basis === 'abstract only' && s.note) problems.push(`summary ${id}: a summary written from the abstract only carries no "Take note" paragraph`);
      [s.lede, s.body, s.note].forEach(txt => { if (txt && /\u2014/.test(txt)) problems.push(`summary ${id}: an em-dash in the prose`); });
    });
    scanTokens(POLICY_DATA, 'policies');
    if (problems.length) {
      console.error(`[tracker] data validation: ${problems.length} problem(s) found`);
      problems.slice(0, 25).forEach(p => console.warn('[tracker]', p));
    }
  })();

