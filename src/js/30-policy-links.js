  /* ── Landscape: the Links view ─────────────────────────────────────────────────────────────────────────────────────────────
     The Landscape's second view, between All and Compare. Until 2026-11-24 it was a force-directed graph of every policy (a hand-rolled SVG layout, docs/adr/0002), and for one day before that a set of cards
     of linked policies. The owner asked on 2026-11-24 for other ways to show how the policies link to one another, was shown four sketches (a board of tiles with lines between the linked ones, the four areas and
     the links between them, this view, and every link as a row of words) and chose this one, in her own words: it "starts from one policy and lets you browse outward: compatible neighbours on the left,
     competing ones on the right, with reasons below. Click any neighbour to move to it." docs/adr/0008-policy-links-view-follow-the-links.md has the reasoning.

     One policy is in the middle. The policies that work well with it (pairsWith) are on the left and the policies that compete with it (competesWith) are on the right, each joined to it by a line, solid for
     works well with and dashed for competes with, and the outline of a neighbour says the same (solid or dashed), so the two differ by shape and never by colour alone. Under them every neighbour comes again with the
     authors' reasons in full. Clicking a neighbour, in a column or in the list, moves to it. The path above remembers where you have been: each earlier step is a pill that goes back to it, and stepping to the policy
     you came from is a step back, not a loop. The menu starts a new path from any policy. The view opens on the policy with the most links (ties by title), worked out from the cards, so no policy is named in the
     code and nobody has chosen which one is shown first. Where the three columns do not fit (a phone) they stack, in the same reading order, and the lines are not drawn.

     Nothing here is made up. The links are read exactly as the Compare view reads them (polCmpIndex, 30-policy-compare.js: a link written on one card counts for both, and an id that is no policy, or one that
     is archived, is nowhere), so the two views never disagree about what is linked. Every reason is the authors' own `why`, as written: one paragraph for each author when the two wrote different reasons. The
     words are Compare's too (Works well with, Competes with, No recorded partners). A pair that two cards record as both partners and rivals is shown in both columns, because that is what the cards say; a test
     fails if the data authors both, since it should be one or the other.

     2026-11-24, the owner's "Yes, add it" to giving each policy its own address, as Compare has: the policy in the middle is the address, #links/<policy-id> (a policy's id is lower-case letters, digits and hyphens, so nothing
     is escaped), a link opens the Links view on it (40-router.js), and each move the reader makes (a neighbour, a name in the list, a step of the path, the menu) adds ONE step to the browser's history, so Back and
     Forward walk the path. The step remembers the whole path in history.state (an address alone, a link or a typed one, has no path to remember and starts one at its policy), which is also why a reload keeps it. A
     Copy link pill on the menu's row copies the address, because inside the website's embed the page's own address is not the one in the address bar (docs/adr/0009-links-policy-addresses.md). A Back pill beside it
     (the owner, 2026-11-24: "add a back button to the links view") is the browser's Back limited to the moves, as Compare's is: on only when the step the page is on was made by a move, naming the policy that move
     left (the step remembers it, as Compare's remembers its pair); it undoes the last move whatever made it, which the path's pills (earlier steps of one walk) do not: a Randomize or a menu choice starts a new path.

     Also among the pills, as on Compare's (the owner, 2026-11-24: "both Randomize and Refresh buttons on the Links view and the Compare view"): Randomize, a policy at random as the start of a new path, and Refresh, back
     to the policy the view opens on, the one with the most links, with a new path. Refresh is the owner's word, read as "start over", since Randomize is "show me another".

     The menu and the pills are not in the view but on the row of the Landscape's switch, in a slot beside it (20-cite-export.js; the owner, 2026-11-24: "Start from should be in line with the views"), the menu first and the pills
     after it, the pills ending the row at the same place as on Compare's (docs/adr/0010-landscape-switch-row-holds-view-controls.md). The pills are in alphabetical order, the owner's rule: Back, Copy Draft, Copy link, Print,
     Randomize, Refresh. Copy Draft and Print (32-policy-draft.js) take the policy in the middle. */
  let polLinksTrail = [];                 // the policies visited, oldest first; the last is the one in the middle
  const POL_LINKS_KEEP = 12;              // steps the path remembers
  const POL_LINKS_SHOW = 5;               // steps of it the page shows (the latest)
  const POL_LINKS_STACK_AT = 720;         // below this width of the stage the columns stack: the middle one is then under 230px, which is as narrow as a policy's name (20px) runs without breaking in five lines

  // The policy with the most neighbours (partners and rivals, each counted once), ties by title: where the view opens.
  function polLinksStart() {
    const idx = polCmpIndex(), reach = p => new Set([...idx.partners(p.id, 'pair'), ...idx.partners(p.id, 'riv')]).size;
    return POLICY_DATA.slice().sort((a, b) => reach(b) - reach(a) || a.title.localeCompare(b.title))[0].id;
  }

  // A neighbour as a tile: its title over its area, the area's colour as the dot before the title. A button, because it moves the view.
  function polLinksTile(id, kind) {
    const q = polCmpPolicy(id), area = policyAreaOf(q);
    return `<button type="button" class="pol-links-tile pol-links-tile--${kind}" data-go="${escapeHTML(id)}" style="--cat-color:${polCmpAreaColor(q)}" aria-label="${escapeHTML(area ? q.title + ', ' + area.label : q.title)}">`
      + `<span class="pol-links-tile-title">${escapeHTML(q.title)}</span>${area ? `<span class="pol-links-tile-area">${escapeHTML(area.label)}</span>` : ''}</button>`;
  }

  // Everything that depends on the policy in the middle, drawn from polLinksTrail. `moved` is a click on a neighbour or on a step of the path (not the menu: a keyboard user arrowing through the menu must keep
  // it): the focus goes to the card, which the click had just taken it from, and the stage is brought into view if a click far down the page had left it behind.
  function polLinksDraw(moved) {
    const idx = polCmpIndex(), id = polLinksTrail[polLinksTrail.length - 1], p = polCmpPolicy(id), area = policyAreaOf(p);
    const partners = idx.partners(id, 'pair'), rivals = idx.partners(id, 'riv'), titleOf = q => polCmpPolicy(q).title;
    const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
    document.getElementById('polLinksPick').value = id;

    // The path: the latest steps, each earlier one a pill that goes back to it, the policy in the middle plain. When older steps are not shown the row begins with an ellipsis.
    const shown = polLinksTrail.slice(-POL_LINKS_SHOW), first = polLinksTrail.length - shown.length;
    document.getElementById('polLinksPath').innerHTML = '<span class="ctl-label kw-label">Path</span>' + (first ? '<span class="pol-links-sep" aria-hidden="true">&hellip; &rsaquo;</span>' : '')
      + shown.map((q, k) => k === shown.length - 1
        ? `<span class="pol-links-here" aria-current="step">${escapeHTML(titleOf(q))}</span>`
        : `<button class="kw-pill" type="button" data-step="${first + k}">${escapeHTML(titleOf(q))}</button><span class="pol-links-sep" aria-hidden="true">&rsaquo;</span>`).join('');

    // The two columns. A column with nothing in it says so, in Compare's words.
    const column = (kind, label, ids, none) => `<div class="pol-modal-label pol-links-hd" role="heading" aria-level="4">${label} &middot; ${ids.length}</div>`
      + (ids.length ? ids.map(q => polLinksTile(q, kind)).join('') : `<p class="pol-links-none">${none}</p>`);
    const left = document.getElementById('polLinksPartners'), right = document.getElementById('polLinksRivals');
    left.setAttribute('aria-label', 'Works well with ' + p.title);
    left.innerHTML = column('partner', 'Works well with', partners, 'No recorded partners.');
    right.setAttribute('aria-label', 'Competes with ' + p.title);
    right.innerHTML = column('rival', 'Competes with', rivals, 'No recorded competing policies.');

    // The policy in the middle: its name and area, and the button that opens its dialog (the one way from here to the card's own words).
    document.getElementById('polLinksMid').innerHTML = `<div class="pol-links-card" id="polLinksCard" tabindex="-1" style="--cat-color:${polCmpAreaColor(p)}"><h3 class="pol-links-name">${escapeHTML(p.title)}</h3>`
      + `${area ? `<div class="pol-links-area">${escapeHTML(area.label)}</div>` : ''}<button type="button" class="pol-action-btn" data-open="${escapeHTML(id)}">Read the full policy</button></div>`;

    // Why each neighbour is linked: the authors' reasons as written, a paragraph for each author (the same sentence once when both wrote it). The name is a button that moves there, as the tile is.
    const row = (q, kind) => `<div class="pol-links-row pol-links-row--${kind === 'pair' ? 'partner' : 'rival'}" style="--cat-color:${polCmpAreaColor(polCmpPolicy(q))}">`
      + `<div class="pol-links-row-name"><button type="button" class="pol-links-go" data-go="${escapeHTML(q)}">${escapeHTML(titleOf(q))}</button><span class="pol-links-kind">${kind === 'pair' ? 'works well with' : 'competes with'} this policy</span></div>`
      + idx.whys(id, q, kind).map(w => `<p class="pol-links-text">${escapeHTML(w)}</p>`).join('') + '</div>';
    const rows = partners.map(q => row(q, 'pair')).concat(rivals.map(q => row(q, 'riv')));
    document.getElementById('polLinksWhy').innerHTML = rows.length
      ? '<div class="pol-modal-label pol-links-rowlabel" role="heading" aria-level="4">Why they are linked</div>' + rows.join('')
      : '<p class="pol-links-none pol-links-nolinks">No links are recorded for this policy.</p>';

    // What a screen reader is told when the middle changes (the stage itself is not a live region: it is rewritten whole).
    document.getElementById('polLinksStatus').textContent = moved ? `Showing ${p.title}. It works well with ${count(partners.length, 'policy', 'policies')} and competes with ${rivals.length}.` : '';

    polLinksLayout();
    if (moved) {
      const card = document.getElementById('polLinksCard');
      if (card && typeof card.focus === 'function') card.focus({ preventScroll: true });
      polLinksReveal(document.getElementById('polLinksStage'));
    }
  }

  // A step to a policy: onto the path, or off it when it is the policy the path came from (a step back, not a loop). `how` is 'start' for a new path from the menu.
  function polLinksGo(id, how) {
    if (!POLICY_DATA.some(p => p.id === id)) return;
    const was = polLinksTrail.join('|'), here = polLinksTrail[polLinksTrail.length - 1], before = polLinksTrail[polLinksTrail.length - 2];
    if (how === 'start') polLinksTrail = [id];
    else if (id === before) polLinksTrail.pop();
    else if (id !== here) polLinksTrail.push(id);
    if (polLinksTrail.length > POL_LINKS_KEEP) polLinksTrail.shift();
    if (polLinksTrail.join('|') !== was) polLinksCommit(how !== 'start', here);
  }

  // Every move the reader makes (a neighbour, a name in the list, a step of the path, the menu) comes through here once the path has been changed: the view is drawn, and the browser gets ONE step for it, at the policy's
  // address, remembering the path, so that Back and Forward bring the path back with the policy.
  function polLinksCommit(moved, before) {
    polLinksDraw(moved);
    // A browser that refuses the step (Safari limits how often a page may add one) must not break the view: it is drawn all the same, and only the address and Back are lost.
    // When the policy is the same (the path shortened to it: Refresh while it is already in the middle, an earlier step that is the same policy), the address does not change: the step is rewritten, not added, because Back
    // between two steps with one address fires no hashchange and would leave the view unchanged.
    // The step remembers the path and the policy before it (`before`), for the Back pill; a rewritten step keeps the one it already had.
    const target = '#' + polLinksRoute(), same = location.hash === target, old = history.state && history.state.polLinks;
    const state = { polLinks: { trail: polLinksTrail.slice(), prev: same ? (old ? old.prev : null) : (before || null) } };
    try { if (same) history.replaceState(state, '', target); else history.pushState(state, '', target); } catch (e) { /* no step: the view is still drawn */ }
    polLinksSyncBack();
  }

  // The policy the browser's Back would go to: the one the step the page is on was made from. A step made by a move remembers it (polLinksCommit); the first step (a link, a reload, the view just opened) has none, and
  // neither does one whose policy has since been archived, which is not gone back to from here.
  function polLinksPrev() {
    const s = history.state, prev = s && s.polLinks && s.polLinks.prev;
    return typeof prev === 'string' && POLICY_DATA.some(p => p.id === prev) ? prev : null;
  }
  // The Back pill follows the step the page is on, so it is set after anything that changes the step (a move, an address) and not by the drawing of a policy, which happens before the step is made.
  function polLinksSyncBack() {
    const back = document.getElementById('polLinksBack'), prev = polLinksPrev();
    if (!back) return;
    back.disabled = !prev;
    back.title = prev ? `Back to ${polCmpPolicy(prev).title}` : 'There is no earlier policy to go back to';
  }
  // The Back pill is the browser's Back, so the policies have one timeline; it is on only when polLinksPrev has a policy to go back to.
  function polLinksBack() { if (polLinksPrev()) history.back(); }

  // Randomize (the owner, 2026-11-24): a policy at random, other than the one in the middle, as the start of a new path (it is not a step along the links, so the path is not carried on). Every policy is as likely as any other.
  function polLinksRandomize() {
    const ids = POLICY_DATA.map(p => p.id), here = polLinksTrail[polLinksTrail.length - 1];
    if (ids.length < 2) return;
    let id;
    do { id = ids[Math.floor(Math.random() * ids.length)]; } while (id === here);
    polLinksGo(id, 'start');
  }
  // Refresh (the owner, 2026-11-24): back to where the view opens, the policy with the most links, with a new path; nothing happens when it is already there with no path behind it.
  function polLinksRefresh() { polLinksGo(polLinksStart(), 'start'); }

  // The address of the policy in the middle: #links/<policy-id>. Before the view has been built, with no policy chosen yet, it is #links.
  function polLinksRoute() { return polLinksTrail.length ? 'links/' + polLinksTrail[polLinksTrail.length - 1] : 'links'; }

  // The policy from an address (the router, 40-router.js: a link that was shared, a reload, or the browser's Back and Forward between the steps the reader's moves made). It has to be a policy on the page, or nothing changes and
  // false comes back. The path comes from the step the page is on (history.state), when that step remembers a path that ends at this policy and every policy in it is still on the page; otherwise (a link, a typed address)
  // the path starts at the policy. It draws if the view has been built, and never writes the address or adds a step, because the address is where the policy came from; the first build of the view takes the path as it is left here.
  function polLinksSet(id) {
    const live = x => typeof x === 'string' && POLICY_DATA.some(p => p.id === x);
    if (!live(id)) return false;
    const s = history.state, kept = s && s.polLinks && s.polLinks.trail;
    polLinksTrail = Array.isArray(kept) && kept.length > 0 && kept.length <= POL_LINKS_KEEP && kept.every(live) && kept[kept.length - 1] === id ? kept.slice() : [id];
    if (document.getElementById('polLinksStage')) { polLinksDraw(false); polLinksSyncBack(); }
    return true;
  }

  // The lines, measured from where the tiles are: from each tile on the left to the card, and from the card to each tile on the right. Wide enough, the columns sit side by side and the lines are drawn;
  // narrower, they stack and nothing is drawn, so the outline of a tile (solid or dashed) and the heading over its column are what say which is which. This runs when the middle changes, when the area is
  // shown again (it is hidden while another view is on, and a hidden area measures nothing) and when the stage changes size.
  function polLinksLayout() {
    const stage = document.getElementById('polLinksStage'), svg = document.getElementById('polLinksLines'), card = document.getElementById('polLinksCard');
    if (!stage || !svg || !card) return;
    const W = stage.clientWidth, stacked = W < POL_LINKS_STACK_AT;
    stage.classList.toggle('is-stacked', stacked);
    if (stacked) { svg.innerHTML = ''; return; }
    // A rect is in zoomed pixels (the page is zoomed, tokens.css) and the SVG is drawn in the stage's own, hence the division by the body zoom, as syncBarStack (00-state.js) does.
    const zoom = parseFloat(getComputedStyle(document.body).zoom) || 1;
    const base = stage.getBoundingClientRect(), c = card.getBoundingClientRect(), n = v => (v / zoom).toFixed(1);
    const cl = c.left - base.left, cr = c.right - base.left, cy = c.top - base.top + c.height / 2;
    svg.setAttribute('width', W);
    svg.setAttribute('height', stage.clientHeight);
    svg.innerHTML = [...stage.querySelectorAll('.pol-links-tile')].map(t => {
      const b = t.getBoundingClientRect(), ty = b.top - base.top + b.height / 2;
      if (t.classList.contains('pol-links-tile--rival')) {
        const tx = b.left - base.left, m = (cr + tx) / 2;
        return `<path class="pol-links-line pol-links-line--rival" d="M${n(cr)} ${n(cy)} C${n(m)} ${n(cy)} ${n(m)} ${n(ty)} ${n(tx)} ${n(ty)}"/>`;
      }
      const tx = b.right - base.left, m = (tx + cl) / 2;
      return `<path class="pol-links-line pol-links-line--partner" d="M${n(tx)} ${n(ty)} C${n(m)} ${n(ty)} ${n(m)} ${n(cy)} ${n(cl)} ${n(cy)}"/>`;
    }).join('');
  }

  // After a move, bring the stage into view if a click far down the page (a name in the list of reasons) left it above the window. Nothing moves when it is already near the top; scroll-margin-top
  // (policy.css) leaves a little room above it, and a reader whose device asks for less motion gets no smooth scrolling.
  function polLinksReveal(stage) {
    if (!stage || typeof stage.scrollIntoView !== 'function') return;
    const top = stage.getBoundingClientRect().top;
    if (top >= 0 && top < window.innerHeight / 2) return;
    const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    stage.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }

  // `slot` is the room beside the Landscape's switch (20-cite-export.js): the menu is on the switch's row, in line with the views, and not in the view under it (the owner, 2026-11-24).
  function renderPolicyLinks(container, slot) {
    container.innerHTML = '';
    slot.innerHTML = '';
    if (!POLICY_DATA.length) { container.innerHTML = '<p class="pol-links-empty">There are no policies to show.</p>'; return; }
    if (!polLinksTrail.length) polLinksTrail = [polLinksStart()];   // an address may have named the policy already (polLinksSet)
    // The menu and its label are the shared filter bar's, as Compare's are (filterbar.css); the path under the switch is the same bar's pills.
    // The menu comes first and the pills after it, the whole row on the switch's line where it fits (the owner, 2026-11-24: "the policy selections should be before" the buttons, after "make sure the rest of the buttons are in
    // line with the row across compare and link views"); the pills are in alphabetical order (the owner, 2026-11-24), Copy Draft and Print (32-policy-draft.js) among them: Back, Copy Draft, Copy link, Print, Randomize, Refresh.
    slot.innerHTML = `<div class="pol-subview-pick"><span class="ctl-pair"><label class="ctl-label" for="polLinksPick">Start from</label><select id="polLinksPick">${polCmpOptions()}</select></span></div>`
      + '<span class="pol-subview-pills"><button class="kw-pill" type="button" id="polLinksBack" disabled>Back</button>' + polDraftPill('copy', 'Links', 'Copy this policy as a Markdown primer draft')
      + '<button class="kw-pill" type="button" id="polLinksCopy" title="Copy a link to this policy">Copy link</button>' + polDraftPill('print', 'Links', 'Print this policy, or save it as a PDF')
      + '<button class="kw-pill" type="button" id="polLinksRandom" title="Go to a policy chosen at random">Randomize</button><button class="kw-pill" type="button" id="polLinksRefresh" title="Back to the policy this view opens on">Refresh</button></span>';
    container.innerHTML = `
      <div class="pol-links">
        <div class="controls pol-links-trail"><div class="pill-row" id="polLinksPath" role="group" aria-label="Where you have been"></div></div>
        <div class="pol-links-stage" id="polLinksStage">
          <svg class="pol-links-lines" id="polLinksLines" aria-hidden="true" focusable="false"></svg>
          <div class="pol-links-col" id="polLinksPartners" role="group"></div>
          <div class="pol-links-mid" id="polLinksMid"></div>
          <div class="pol-links-col" id="polLinksRivals" role="group"></div>
        </div>
        <div class="pol-links-why" id="polLinksWhy"></div>
        <p class="sr-only" id="polLinksStatus" role="status"></p>
      </div>`;
    document.getElementById('polLinksPick').addEventListener('change', e => polLinksGo(e.target.value, 'start'));
    document.getElementById('polLinksBack').addEventListener('click', polLinksBack);
    document.getElementById('polLinksRandom').addEventListener('click', polLinksRandomize);
    document.getElementById('polLinksRefresh').addEventListener('click', polLinksRefresh);
    // The link is built from the page's own location (appURL, 20-cite-export.js), as the policy dialog's and Compare's Copy link are: inside the website's embed that is the dashboard's own address, which opens it on this policy.
    document.getElementById('polLinksCopy').addEventListener('click', e => copyText(appURL(polLinksRoute()), e.currentTarget));
    polDraftWire('Links', () => [polLinksTrail[polLinksTrail.length - 1]]);   // Copy Draft and Print take the policy in the middle
    container.addEventListener('click', e => {
      const hit = sel => (e.target.closest ? e.target.closest(sel) : null);
      const open = hit('[data-open]');
      if (open) { openPolModalById(open.dataset.open); return; }
      const step = hit('[data-step]');
      if (step) { const here = polLinksTrail[polLinksTrail.length - 1]; polLinksTrail = polLinksTrail.slice(0, +step.dataset.step + 1); polLinksCommit(true, here); return; }
      const go = hit('[data-go]');
      if (go) polLinksGo(go.dataset.go);
    });
    if (typeof ResizeObserver === 'function') new ResizeObserver(polLinksLayout).observe(document.getElementById('polLinksStage'));
    window.addEventListener('resize', polLinksLayout);
    polLinksDraw(false);
    polLinksSyncBack();
  }
