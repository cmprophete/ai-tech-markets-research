  /* ── ROUTER ──────────────────────────────────────────────────────────────
     One place that knows how location.hash and app state map onto each other.

     Routes
       #about #papers #fact-bank #policy #all #legislation #enforcement #cases
                                               ... the flat views, in VIEWS below
                                                   (#all, #legislation, #enforcement and #cases are the four sections of the one Government action tab)
                                                   (#sources, #research and #changelog are retired
                                                   aliases of #papers, and #solutions of #policy)
       #policy/<policy-id> #entry/<entry-id> #fact-bank/<paper-id> #enforcement/<place> #cases/<place> #brief/<section> #links #links/<policy-id> #compare #compare/<policy-a>/<policy-b>
                                               ... parameterised (a place is federal, states (every state at once) or a state's name: #enforcement/texas; a section of the Brief is a pathway, an idea
                                                   or sources: #brief/workers; the tab was called Agenda until 2026-11-19, and #agenda and #agenda/<section> still land on it;
                                                   the Landscape's Compare view is #compare/<policy-a>/<policy-b>, two policies' ids with A on the left, and #compare on the pair it opens with:
                                                   two ids that are not both policies on the page open Compare on that first pair, with the address rewritten; its Links view is #links/<policy-id>, the policy
                                                   in the middle, and #links on the policy it opens with (an id that is no policy on the page opens it there, with the address rewritten); #policy is the Landscape on All)
     Anything else falls through to About, including the retired #tracker,
     #tracker/<tab>, #job-displacement, #adoption, #themes and #theme/<id>
     routes (Data Tracker + Job Displacement removed 2026-08).

     The address bar tracks navigation with replaceState (no history spam);
     hashchange handles pasted links and back/forward. The two exceptions are a change of the pair in Compare (polCmpGo in
     30-policy-compare.js) and a move to another policy in Links (polLinksCommit in 30-policy-links.js): each adds ONE history step, so the browser's Back and
     Forward walk through the pairs, or the path, the reader looked at (docs/adr/0007-compare-pair-addresses-push-history.md, docs/adr/0009-links-policy-addresses.md). A Compare
     step remembers the pair before it in history.state, which the Back pill reads, and a Links step remembers the whole path, which the address restores, so
     setHash and the Compare and Links rewrites below keep the state of the step they rewrite instead of nulling it.

     Ordering note: this file runs before the render layer is defined and refers
     to it. That is safe because everything here is a
     hoisted function declaration and nothing runs until init calls it, by
     which point the whole IIFE has evaluated. Keep them function declarations,
     not const arrows, or they will land in the temporal dead zone. */
  let routeApplying = false;
  let viewInitialized = false;   // set on the first setView

  /* Flat views: a route with no segments that maps to one view, plus optional
     setup and a guard. Adding a plain view is a row here and nothing else,
     which is the property the old if-ladder did not have.
       view   the setView key
       enter  extra state to apply before the view switches
       after  extra state to apply once the view has switched (#policy: the Landscape's own view, below)
       guard  false means the route does not match (falls through to default) */
  const VIEWS = {
    about:              { view: 'about' },
    papers:             { view: 'cards', enter: clearPapersLink },
    // Retired names of the same tab: it was Papers, then briefly Sources (that clashed with
    // the "source" on every fact card), then Papers again; #changelog was its What's New feed,
    // removed because the list sorts newest first. Kept so old links land on a real view; the
    // address bar is rewritten to #papers.
    sources:            { view: 'cards',     alias: true },
    research:           { view: 'cards',     alias: true },
    changelog:          { view: 'cards',     alias: true },
    'fact-bank':        { view: 'fact-bank', guard: () => factBankEnabled, enter: clearFactBankLink },
    policy:             { view: 'policy', after: showPolicyAll },
    // First in the Policy group of the nav: Becky Chao's brief, the Brief tab (35-agenda.js; the view key and every internal name still say agenda, as the Landscape's still say policy). It was called Agenda until 2026-11-19, so
    // #agenda still works: it lands here and the address bar is rewritten to #brief. `brief` must come first, since the first key of a view is its canonical route (ROUTE_FOR_VIEW). #brief/<section> is the parameterised route below.
    brief:              { view: 'agenda' },
    agenda:             { view: 'agenda', alias: true },
    // Retired tab, merged into Policy. Kept so old links land on a real view;
    // `alias` has applyHashRoute rewrite the address bar to the canonical route.
    solutions:          { view: 'policy', alias: true, after: showPolicyAll },
    // Government action is ONE tab with four sections (since 2026-11-17; Enforcement and Legislation were two tabs of a group before that; All, which holds everything, was added on 2026-11-18), each a view of its own with an address of its own,
    // and the nav tab for all three is #viewGovernment (setView in 70-render.js marks it, and the switch under the masthead moves between them). `legislation` is the map and the bills and keeps the
    // route it has always had (it was in the Policy group until 2026-11-12); `enforcement` and `cases` are the two kinds of row in data/legislation-actions.js (55-enforcement.js).
    all:                { view: 'all' },   // everything at once: the bills, the enforcement actions and the key cases; the tab opens on it
    legislation:        { view: 'legislation' },
    enforcement:        { view: 'enforcement' },
    cases:              { view: 'cases' },
  };
  // Reverse map, for currentRoute(). First key wins, so `papers` is the canonical name of the
  // cards view (the retired aliases after it never are).
  const ROUTE_FOR_VIEW = {};
  for (const [route, cfg] of Object.entries(VIEWS)) {
    if (!(cfg.view in ROUTE_FOR_VIEW)) ROUTE_FOR_VIEW[cfg.view] = route;
  }

  // Write the address-bar hash without triggering hashchange. The history step keeps what it remembers (history.state): a step made by a change of pair in Compare holds the pair before it,
  // for the Back pill, and a tab, the Landscape's switch or a dialog rewriting the address must not wipe it.
  function setHash(route) {
    if (routeApplying) return;
    const target = '#' + route;
    if (location.hash === target) return;
    history.replaceState(history.state, '', target);
  }

  // #policy is the Landscape on All, so that its address says what is on screen (Compare has its own). Only an address does this: the nav tab goes to setView directly and opens the view the reader left it on.
  function showPolicyAll() { if (polShowView) polShowView('all'); }

  // The canonical route for the current view state (modal-free).
  function currentRoute() {
    // The address of Enforcement and of Cases carries the place they are showing, which they share with Legislation (enfRoute in 55-enforcement.js).
    if (activeView === 'enforcement' || activeView === 'cases') return enfRoute();
    // The Landscape on Compare carries the pair on screen (polCmpRoute in 30-policy-compare.js); its other two views are the tab's own address.
    if (activeView === 'policy' && polViewMode === 'compare') return polCmpRoute();
    // ... and on Links the policy in the middle (polLinksRoute in 30-policy-links.js).
    if (activeView === 'policy' && polViewMode === 'links') return polLinksRoute();
    return ROUTE_FOR_VIEW[activeView] || 'about';
  }

  // Apply location.hash to the app. Returns true if it matched a route.
  function applyHashRoute() {
    const h = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (!h) return false;
    routeApplying = true;
    try {
      const [head, tail, tail2] = h.split('/');

      // ── flat views ────────────────────────────────────────────────────
      if (!tail && VIEWS[head]) {
        const cfg = VIEWS[head];
        if (cfg.guard && !cfg.guard()) return false;
        if (cfg.enter) cfg.enter();
        setView(cfg.view);
        if (cfg.after) cfg.after();
        // A retired route: setHash is suppressed while a route is being applied,
        // so write the canonical one directly, or a copied link keeps the dead name.
        if (cfg.alias) history.replaceState(null, '', '#' + ROUTE_FOR_VIEW[cfg.view]);
        return true;
      }

      // ── parameterised ─────────────────────────────────────────────────
      // Enforcement or Cases on a place (a link in the map's card): the place is the one the four sections share, so it is set here and the view switch draws the section. A place that is not
      // one, a stale or mistyped link, shows every jurisdiction, and the address bar is rewritten to say so (setHash is off while a route is applied).
      if ((head === 'enforcement' || head === 'cases') && tail) {
        enfOpenPlace(tail);
        setView(head);
        history.replaceState(null, '', '#' + enfRoute());
        return true;
      }
      // The Brief on one of its sections (a link from one of its source drawers, or one that was shared; #agenda/<section> was the address before 2026-11-19 and is still read): the view opens and the section is scrolled to,
      // an idea opened. A section it does not have is a stale or mistyped link: the Brief still opens, and the address bar goes back to #brief (setHash is off while a route is applied, so it is written here).
      if ((head === 'brief' || head === 'agenda') && tail) {
        setView('agenda');
        const hit = agendaGo(tail, { quiet: true });
        history.replaceState(null, '', '#' + (hit ? 'brief/' + hit : 'brief'));
        return true;
      }
      // The Landscape on Compare, on a pair: a link that was shared, a reload, or the browser's Back and Forward between the steps the reader's changes of pair made (polCmpGo adds them). The view is built here the first
      // time, drawn on the pair the address names. Two ids that are not both policies on the page (a mistyped or stale link, or a policy that has since been archived), a single id, or none at all
      // (#compare) leave the pair that is on screen, which is the first competing pair on a first visit, and the address is rewritten to say so (setHash is off while a route is applied, so it is written here,
      // with the step's state kept). Nothing is added to the history, and nothing from the address reaches the page but an id that was found in POLICY_DATA.
      if (head === 'compare') {
        setView('policy');
        polCmpSet(tail, tail2);
        if (polShowView) polShowView('compare');
        const target = '#' + currentRoute();
        if (location.hash !== target) history.replaceState(history.state, '', target);
        return true;
      }
      // The Landscape on Links, on a policy: a link that was shared, a reload, or the browser's Back and Forward between the steps the reader's moves made (polLinksCommit adds them). As Compare's, but with one id: the view is
      // built here the first time, on the policy the address names, with the path its step remembers (polLinksSet reads history.state) or a new one. An id that is no policy on the page (mistyped, stale, or archived since), or none at
      // all (#links), leaves the policy that is on screen, which is the one with the most links on a first visit, and the address is rewritten to say so. Nothing is added to the history, and nothing from the address reaches
      // the page but an id that was found in POLICY_DATA.
      if (head === 'links') {
        setView('policy');
        polLinksSet(tail);
        if (polShowView) polShowView('links');
        const target = '#' + currentRoute();
        if (location.hash !== target) history.replaceState(history.state, '', target);
        return true;
      }
      if (head === 'policy' && tail && POLICY_DATA.some(pl => pl.id === tail)) {
        setView('policy');
        openPolModalById(tail);
        return true;
      }
      // A source's facts. The Fact Bank searches paper titles, so the title as a
      // query narrows it to that source. The Fact Bank builds lazily: the query is
      // parked in factBankQuery for its builder, and applied now if it is ready.
      if (head === 'fact-bank' && tail && factBankEnabled && RESEARCH_DATA.some(r => r.id === +tail)) {
        factBankQuery = RESEARCH_DATA.find(r => r.id === +tail).title;
        setView('fact-bank');
        applyFactBankQuery();
        return true;
      }
      // A paper, from a fact's "View Summary". It works as a source's facts link does for the Fact Bank above: the
      // paper's title goes into the Papers search box, so the list is narrowed to that paper, and its row is opened.
      // Nothing is scrolled to or highlighted, because there is nothing to hunt for. clearPapersLink undoes it when
      // Papers is opened any other way.
      if (head === 'entry' && tail && RESEARCH_DATA.some(r => r.id === +tail)) {
        searchQuery = papersLinkQuery = RESEARCH_DATA.find(r => r.id === +tail).title;
        resetPaperFilters();   // the three filters back to All, so nothing hides the paper; it also syncs the search box
        papersPage = 1;
        setView('cards');
        // setTimeout rather than requestAnimationFrame: rAF never fires in a
        // background tab, and shared links routinely open in one.
        setTimeout(() => {
          const el = document.querySelector(`.src-row[data-entry-id="${+tail}"]`);
          if (el) setSourceRowOpen(el, true);   // the link is about this source, so show its body
          showListTop(document.getElementById('cardsGrid'));
        }, 60);
        return true;
      }
      return false;
    } finally {
      routeApplying = false;
    }
  }

