  /* ── ROUTER ──────────────────────────────────────────────────────────────
     One place that knows how location.hash and app state map onto each other.

     Routes
       #about #research #changelog #fact-bank #policy #solutions
                                               ... the flat views, in VIEWS below
       #policy/<policy-id> #entry/<entry-id>   ... parameterised
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
    research:           { view: 'cards',     enter: () => setResearchSubview('database') },
    changelog:          { view: 'cards',     enter: () => setResearchSubview('changelog') },
    'fact-bank':        { view: 'fact-bank', guard: () => factBankEnabled },
    policy:             { view: 'policy' },
    solutions:          { view: 'solutions' },
  };
  // Reverse map, for currentRoute(). First key wins, so `research` beats
  // `changelog` as the generic name for the cards view; the sub-view is
  // resolved explicitly below.
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
    if (activeView === 'cards') return researchSubview === 'changelog' ? 'changelog' : 'research';
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
        return true;
      }

      // ── parameterised ─────────────────────────────────────────────────
      if (head === 'policy' && tail && POLICY_DATA.some(pl => pl.id === tail)) {
        setView('policy');
        openPolModalById(tail);
        return true;
      }
      if (head === 'entry' && tail && RESEARCH_DATA.some(r => r.id === +tail)) {
        const entry = RESEARCH_DATA.find(r => r.id === +tail);
        if (activeLens === 'economist' && !isEconRelevant(entry)) setLens('general');
        activeCat = 'all'; activeStatus = 'all'; activeGeo = 'all'; activeEvidence = 'all';
        searchQuery = '';
        const si = document.getElementById('searchInput'); if (si) si.value = '';
        setResearchSubview('database');
        setView('cards');
        // setTimeout rather than requestAnimationFrame: rAF never fires in a
        // background tab, and shared links routinely open in one.
        setTimeout(() => {
          const el = document.querySelector(`.card[data-entry-id="${+tail}"]`);
          if (!el) return;
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('deep-link-flash');
          setTimeout(() => el.classList.add('fading'), 1600);
          setTimeout(() => el.classList.remove('deep-link-flash', 'fading'), 3000);
        }, 60);
        return true;
      }
      return false;
    } finally {
      routeApplying = false;
    }
  }

