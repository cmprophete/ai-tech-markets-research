  /* ── ROUTER ──────────────────────────────────────────────────────────────
     One place that knows how location.hash and app state map onto each other.

     Routes
       #about #papers #fact-bank #policy #all #legislation #enforcement #cases
                                               ... the flat views, in VIEWS below
                                                   (#all, #legislation, #enforcement and #cases are the four sections of the one Government action tab)
                                                   (#sources, #research and #changelog are retired
                                                   aliases of #papers, and #solutions of #policy)
       #policy/<policy-id> #entry/<entry-id> #fact-bank/<paper-id> #enforcement/<place> #cases/<place>
                                               ... parameterised (a place is federal or a state's name: #enforcement/texas)
     Anything else falls through to About, including the retired #tracker,
     #tracker/<tab>, #job-displacement, #adoption, #themes and #theme/<id>
     routes (Data Tracker + Job Displacement removed 2026-08).

     The address bar tracks navigation with replaceState (no history spam);
     hashchange handles pasted links and back/forward.

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
    policy:             { view: 'policy' },
    // A placeholder tab, first in the Policy group of the nav; nothing is behind it yet.
    agenda:             { view: 'agenda' },
    // Retired tab, merged into Policy. Kept so old links land on a real view;
    // `alias` has applyHashRoute rewrite the address bar to the canonical route.
    solutions:          { view: 'policy', alias: true },
    // Government action is ONE tab with four sections (since 2026-11-17; Enforcement and Legislation were two tabs of a group before that; All, which holds everything, was added on 2026-11-18), each a view of its own with an address of its own,
    // and the nav tab for all three is #viewGovernment (setView in 70-render.js marks it, and the switch under the masthead moves between them). `legislation` is the map and the bills and keeps the
    // route it has always had (it was in the Policy group until 2026-11-12); `enforcement` and `cases` are the two kinds of row in data/legislation-actions.js (55-enforcement.js).
    all:                { view: 'all' },   // everything at once: the bills, the enforcement actions, the key cases and the midterm results; the tab opens on it
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

  // Write the address-bar hash without triggering hashchange.
  function setHash(route) {
    if (routeApplying) return;
    const target = '#' + route;
    if (location.hash === target) return;
    history.replaceState(null, '', target);
  }

  // The canonical route for the current view state (modal-free).
  function currentRoute() {
    // The address of Enforcement and of Cases carries the place they are showing, which they share with Legislation (enfRoute in 55-enforcement.js).
    if (activeView === 'enforcement' || activeView === 'cases') return enfRoute();
    return ROUTE_FOR_VIEW[activeView] || 'about';
  }

  // Apply location.hash to the app. Returns true if it matched a route.
  function applyHashRoute() {
    const h = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (!h) return false;
    routeApplying = true;
    try {
      const [head, tail] = h.split('/');

      // ── flat views ────────────────────────────────────────────────────
      if (!tail && VIEWS[head]) {
        const cfg = VIEWS[head];
        if (cfg.guard && !cfg.guard()) return false;
        if (cfg.enter) cfg.enter();
        setView(cfg.view);
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

