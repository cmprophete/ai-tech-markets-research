  /* ── Landscape: the Compare view ──────────────────────────────────────────────────────────────────────────────────
     The Landscape's second view, between Links and All (2026-11-19, the owner: "a main view comparing policies with sample
     complementary policies and sample conflicting policies" and "a fun graphic of the two policies fighting each other"). Two policies are
     set side by side: chosen in two menus, by clicking a sample under either one, or at random with the Randomize button. A ring above them says, with a picture and in words, whether the two are recorded as competing (competesWith), recorded as
     working well together (pairsWith) or neither, and the comparison under it sets the two out in the dialog's own words, with up to three of the
     policies each works well with and up to three that compete with it.

     Nothing here is made up. Complementary is each card's pairsWith, conflicting its competesWith, and every reason shown is the author's own
     `why`, as written. A link written on one card only is read as a link between the two (the Links view reads it through this same index), so a policy's samples
     are its own entries first, in the order they were written, then the policies that name it. There are no scores and no winner: the gloves
     picture "these two compete", they do not rank, and the reason for a competing pair says so. Most pairs of policies have no recorded link at all
     (6 of the 435 pairs of 30 compete, 29 work well together, on 2026-11-19), and the view says so rather than staging a contest.

     2026-11-23, the owner: "address this", the problems found in reading the view. What was changed, and why:
     * The comparison is ROWS, not two columns. A row is one section (what it is, what works well with it, what competes with it, strengths, risks) with
       the two policies' cells next to each other, so the same section of both sits at the same height (in two columns, "Strengths" began 386px apart at 1024px,
       and on a phone the second policy began four screens below the first). On a phone the two cells of a row stack, so one policy's Strengths are under the
       other's. A cell far down the page has no column heading in view, so each names its policy. The order in the markup is the reading order at every width:
       nothing is reordered with CSS, which would split what a keyboard and a screen reader meet from what is seen.
     * The picture says what it shows in words under it ("They compete", "They work well together"), because "VS", "+" and "?" mean nothing alone; the VS
       is dark on the gold, where it was white at 2.6:1; and the gloves move three times (a tag team twice, slower) when a pair is drawn and then rest, where they
       looped for as long as the page was open (policy.css).
     * The words are plain: Policy A and Policy B, competing pairs, pairs that work well together. "Fight" suggested a winner. The picture stays, as asked. The
       state classes in the code are still pol-cmp-fight and pol-cmp-team.
     * Back goes to the pair before, whichever way the pair was changed (a menu, a sample, Randomize): a sample replaces the other side and brings the new pair to the top, and there was no way back from that.
     * 2026-11-24, the owner: the pills are in alphabetical order, Back, Copy Draft, Copy link, Print, Randomize, Refresh (the same order on the Links view, which has them all).
     * 2026-11-24, the owner: the row of the six competing pairs (a pill each) and the row that stepped through the 29 pairs that work well together (Previous, Pair 3 of 29, Next) were removed, and a Randomize
       button put beside Back and Copy link: it picks two different policies at random, every pair as likely as any other, so most picks have no recorded link and say so. A recorded pair is still one click away:
       a sample under either policy makes it the other side. Later the same day, a Refresh button beside it (the owner: "both Randomize and Refresh buttons on the Links view and the Compare view"), which takes the view
       back to the pair it opens on: the owner's word, read as "start over", since Randomize already is "show me another".
     * 2026-11-24, the owner: the two menus and the pills moved from a bar inside the view onto the row of the Landscape's switch (a slot beside it, 20-cite-export.js), "inline with the views", and then "the rest of the buttons ... in
       line with the row across compare and link views", then "the policy selections should be before" the buttons: the menus come first and the pills after them, ending the row at the same place as on the Links row
       (docs/adr/0010-landscape-switch-row-holds-view-controls.md).
       Copy Draft and Print (32-policy-draft.js) were added to the pills at her word, and take both policies, A then B. The row stays under the top of a wide window while the long rows are read (policy.css, .is-pinned).
     * A sample's name for a screen reader is "Compare A with B", with the author's reason as its description, not the whole paragraph read out as a name.
     * 2026-11-24, her "Yes, try it" to folding the long summaries on a phone (about 1,000px each there): a summary of more than 600 characters (29 of the 32 cards) is shown as its first seven
       lines, fading out, with a Show more button. The text itself is never changed or cut (the card's words are verbatim): it is clipped by the styles, on a phone only, and a keyboard focus that
       lands in the part out of sight opens it. A row's two cells fold alone, so a short one stays whole beside a folded one.
     * 2026-11-24, her "Yes, go ahead" to giving each comparison its own address, "for sharing and the browser's Back": the pair on screen is in the address, #compare/<policy-a>/<policy-b>, so a link
       opens Compare on it (40-router.js), and each change of the pair (a menu, a sample, Randomize) adds ONE step to the browser's history, so its Back and Forward walk through the pairs. The step
       remembers the pair before it in history.state, and the Back pill is the browser's Back limited to that: on only when there is an earlier pair to go back to, naming it, and pressing it presses the
       browser's Back, so there is one timeline and not two (the list of pairs this file kept for Back, and its cap of 30, are gone). A Copy link pill beside it copies the address, because inside the website's
       embed the page's own address is not the one in the address bar: the embed's address does not follow the pair (docs/adr/0007-compare-pair-addresses-push-history.md).

     The card text in each cell is the dialog's, drawn the same way (injectPolicyLinks, the same label, text and list styles), so a card reads the same here
     and there. The motion is CSS only, and only for a reader who has not asked their device for less of it (policy.css). */
  let polCmpA = null, polCmpB = null, polCmpIdx = null;

  // The links between live policies, both ways round. Built the first time the view opens, from POLICY_DATA as it stands then (after the overlays
  // and the archived cards have been taken out, so an archived policy is nowhere in it and a card that pointed at one has no link to it).
  function polCmpIndex() {
    if (polCmpIdx) return polCmpIdx;
    const live = new Set(POLICY_DATA.map(p => p.id));
    const field = { pair: 'pairsWith', riv: 'competesWith' };
    const own = { pair: new Map(), riv: new Map() };        // 'a>b' -> what a's author wrote about b
    const partners = { pair: new Map(), riv: new Map() };   // id -> the policies it is linked to, its own entries first
    POLICY_DATA.forEach(p => { partners.pair.set(p.id, []); partners.riv.set(p.id, []); });
    ['pair', 'riv'].forEach(kind => {
      POLICY_DATA.forEach(p => (p[field[kind]] || []).forEach(l => {
        if (!live.has(l.id) || l.id === p.id) return;       // an id that is no policy (or an archived one), or a card pointing at itself
        own[kind].set(p.id + '>' + l.id, l.why || '');
        const list = partners[kind].get(p.id);
        if (!list.includes(l.id)) list.push(l.id);
      }));
      // The policies that name it but that it does not name back come after its own, in the order of the cards.
      const authored = new Map([...partners[kind]].map(([id, list]) => [id, list.slice()]));
      POLICY_DATA.forEach(p => authored.get(p.id).forEach(q => {
        const back = partners[kind].get(q);
        if (!back.includes(p.id)) back.push(p.id);
      }));
    });
    const pairsOf = kind => {
      const seen = new Set(), out = [];
      own[kind].forEach((why, key) => {
        const [a, b] = key.split('>'), k = [a, b].sort().join('|');
        if (!seen.has(k)) { seen.add(k); out.push([a, b]); }
      });
      return out;
    };
    polCmpIdx = {
      partners: (id, kind) => partners[kind].get(id) || [],
      linked: (a, b, kind) => own[kind].has(a + '>' + b) || own[kind].has(b + '>' + a),
      // Each author's reason for the pair, as written, the same sentence once when both wrote it.
      whys: (a, b, kind) => [own[kind].get(a + '>' + b), own[kind].get(b + '>' + a)].filter((w, i, all) => w && all.indexOf(w) === i),
      whyFor: (a, b, kind) => own[kind].get(a + '>' + b) || own[kind].get(b + '>' + a) || '',
      pairs: { pair: pairsOf('pair'), riv: pairsOf('riv') },
    };
    return polCmpIdx;
  }

  function polCmpPolicy(id) { return POLICY_DATA.find(p => p.id === id) || POLICY_DATA[0]; }
  const polCmpAreaColor = p => { const area = policyAreaOf(p); return area ? CAT_COLOR_VARS[area.id] : 'var(--muted)'; };

  // Every policy in the menus, under its area, in the order the All view lists them.
  function polCmpOptions() {
    return Object.entries(MERGED_POLICY_CATEGORIES).map(([areaId, label]) => {
      const items = POLICY_DATA.filter(p => (policyAreaOf(p) || {}).id === areaId).sort((x, y) => x.title.localeCompare(y.title));
      return items.length ? `<optgroup label="${escapeHTML(label)}">${items.map(p => `<option value="${escapeHTML(p.id)}">${escapeHTML(p.title)}</option>`).join('')}</optgroup>` : '';
    }).join('');
  }

  // The picture in the ring: two gloves and a burst. The state decides the burst and how the gloves sit; the colours and the motion are CSS (policy.css).
  function polCmpGlove(cls) {
    return `<rect class="pol-cmp-cuff" x="2" y="32" width="22" height="30" rx="4"/><ellipse class="${cls}" cx="50" cy="46" rx="29" ry="25"/><ellipse class="${cls}" cx="45" cy="26" rx="15" ry="10"/><path class="pol-cmp-knuckle" d="M68 36q8 10 0 20"/>`;
  }
  function polCmpStar(cx, cy, outer, inner, points) {
    const pts = [];
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 ? inner : outer, a = Math.PI * i / points - Math.PI / 2;
      pts.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1));
    }
    return pts.join(' ');
  }
  function polCmpClash(state) {
    const label = state === 'team' ? '+' : state === 'same' ? '?' : 'VS';
    return '<svg class="pol-cmp-clash" viewBox="0 0 200 110" aria-hidden="true" focusable="false">'
      + `<g class="pol-cmp-gl">${polCmpGlove('pol-cmp-glove-a')}</g>`
      + `<g transform="translate(200,0) scale(-1,1)"><g class="pol-cmp-gr">${polCmpGlove('pol-cmp-glove-b')}</g></g>`
      + `<g class="pol-cmp-burst"><polygon class="pol-cmp-burst-shape" points="${polCmpStar(100, 48, 30, 19, 10)}"/><text class="pol-cmp-burst-text" x="100" y="54" text-anchor="middle">${label}</text></g></svg>`;
  }
  // What the picture means, in words under it: the burst's VS, + and ? are decoration and mean nothing alone.
  const POL_CMP_CAPTION = { fight: 'They compete', team: 'They work well together', idle: 'No recorded link', same: 'The same policy' };
  const POL_CMP_NOTE = 'Competing means they are alternatives. This view does not rank them.';
  const polCmpMid = state => `<div class="pol-cmp-mid">${polCmpClash(state)}<div class="pol-cmp-vs">${POL_CMP_CAPTION[state]}</div></div>`;

  // A summary longer than this many characters is folded on a phone (see polCmpFold and policy.css); a shorter one would save little and is always shown whole.
  const POL_CMP_FOLD_AT = 600;

  // What one policy puts in each row: the card in the dialog's words, up to three samples each of what works well with it and what competes with it, then its strengths and its risks.
  function polCmpContent(p, side) {
    const idx = polCmpIndex();
    const paperMap = Object.fromEntries([...RESEARCH_DATA, ...POLICY_SOURCES].map(r => [r.id, r]));
    const li = arr => (arr || []).map(item => `<li>${injectPolicyLinks(item, paperMap)}</li>`).join('');
    const samples = (kind, none) => {
      const list = idx.partners(p.id, kind);
      if (!list.length) return `<div class="pol-cmp-none">${none}</div>`;
      const shown = list.slice(0, 3).map(id => {
        const q = polCmpPolicy(id), why = idx.whyFor(p.id, id, kind), whyId = `polCmpWhy-${side}-${kind}-${id}`;
        // The name is the short sentence and the author's reason is its description: read out as a name, the whole paragraph would be one long button label.
        const name = side === 'a' ? `Compare ${p.title} with ${q.title}` : `Compare ${q.title} with ${p.title}`;
        return `<button type="button" class="pol-cmp-sample" data-side="${side}" data-id="${escapeHTML(id)}" style="--cat-color:${polCmpAreaColor(q)}" aria-label="${escapeHTML(name)}"${why ? ` aria-describedby="${escapeHTML(whyId)}"` : ''}><span class="pol-cmp-sample-title">${escapeHTML(q.title)}</span>`
          + (why ? `<span class="pol-cmp-sample-why" id="${escapeHTML(whyId)}">${escapeHTML(why)}</span>` : '')
          + '<span class="pol-cmp-sample-go">Compare <span class="ui-chevron sm right" aria-hidden="true"></span></span></button>';
      }).join('');
      return `<div class="pol-cmp-samples">${shown}${list.length > 3 ? `<div class="pol-cmp-more">and ${list.length - 3} more</div>` : ''}</div>`;
    };
    const list = arr => (Array.isArray(arr) && arr.length) ? `<ul class="pol-modal-list">${li(arr)}</ul>` : '';
    // The summary is measured as the reader meets it, in characters of text (entities and tags do not count), so the same rule holds for a card written in the data and one synced from its Doc.
    const summary = injectPolicyLinks(p.summary, paperMap), probe = document.createElement('div'), textId = `polCmpWhat-${side}`;
    probe.innerHTML = summary;
    const long = probe.textContent.length > POL_CMP_FOLD_AT;
    return {
      what: `<div class="pol-cmp-fold${long ? ' is-long' : ''}"><div class="pol-modal-text" id="${textId}">${summary}</div>`
        + (long ? `<button type="button" class="pol-action-btn pol-cmp-fold-btn" data-title="${escapeHTML(p.title)}" aria-expanded="false" aria-controls="${textId}" aria-label="Show more about ${escapeHTML(p.title)}">Show more</button>` : '') + '</div>',
      works: samples('pair', 'No recorded partners.'),
      competes: samples('riv', 'No recorded competing policies.'),
      strengths: list(p.strengths),
      risks: list(p.risks),
    };
  }

  // The two cards as rows. The first row is each policy's name, its area and the button that opens its dialog; each row after it is one section, its label across both cells, then A's cell and B's.
  const POL_CMP_NONE = '<div class="pol-cmp-none">None listed on this card.</div>';
  function polCmpRows(a, b) {
    const head = (p, side) => {
      const area = policyAreaOf(p);
      return `<div class="pol-cmp-cell" data-side="${side}" style="--cat-color:${polCmpAreaColor(p)}"><h3 class="pol-cmp-name">${escapeHTML(p.title)}</h3><div class="pol-cmp-area">${area ? escapeHTML(area.label) : ''}</div>`
        + `<div><button type="button" class="pol-action-btn pol-cmp-open" data-id="${escapeHTML(p.id)}">Read the full policy</button></div></div>`;
    };
    const cell = (p, side, html) => `<div class="pol-cmp-cell" data-side="${side}" style="--cat-color:${polCmpAreaColor(p)}"><div class="pol-cmp-who">${escapeHTML(p.title)}</div>${html}</div>`;
    const x = polCmpContent(a, 'a'), y = polCmpContent(b, 'b');
    // A row nobody has anything for is left out (the dialog leaves out a section a card has none of); one that only one side has says so on the other side, so the rows still line up.
    const row = (label, key, always) => (always || x[key] || y[key])
      ? `<div class="pol-cmp-row"><div class="pol-modal-label pol-cmp-rowlabel" role="heading" aria-level="4">${label}</div>${cell(a, 'a', x[key] || POL_CMP_NONE)}${cell(b, 'b', y[key] || POL_CMP_NONE)}</div>` : '';
    return `<div class="pol-cmp-row pol-cmp-row-head">${head(a, 'a')}${head(b, 'b')}</div>`
      + row('What it is', 'what', true) + row('Works well with', 'works', true) + row('Competes with', 'competes', true) + row('Strengths', 'strengths') + row('Risks', 'risks');
  }

  // Opens or folds one summary: the class the styles clip by, and the button's words and state. It only matters on a phone; elsewhere nothing is clipped and the button is not shown.
  function polCmpFold(box, open) {
    const btn = box.querySelector('.pol-cmp-fold-btn');
    box.classList.toggle('is-open', open);
    if (!btn) return;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.textContent = open ? 'Show less' : 'Show more';
    btn.setAttribute('aria-label', `${open ? 'Show less' : 'Show more'} about ${btn.dataset.title}`);
  }

  // Draws everything that depends on the two chosen policies; the menus and the pills are built once, in renderPolicyCompare.
  function polCmpDraw() {
    const idx = polCmpIndex(), a = polCmpPolicy(polCmpA), b = polCmpPolicy(polCmpB);
    polCmpA = a.id; polCmpB = b.id;
    const rival = idx.linked(a.id, b.id, 'riv'), partner = idx.linked(a.id, b.id, 'pair');
    const state = a.id === b.id ? 'same' : rival ? 'fight' : partner ? 'team' : 'idle';
    document.getElementById('polCmpA').value = a.id;
    document.getElementById('polCmpB').value = b.id;
    const corner = (p, role, cls) => `<div class="pol-cmp-corner${cls}" style="--cat-color:${polCmpAreaColor(p)}"><div class="pol-cmp-announce">${role}</div><div class="pol-cmp-name-sm">${escapeHTML(p.title)}</div><div class="pol-cmp-areaname">${escapeHTML((policyAreaOf(p) || {}).label || '')}</div></div>`;
    const ring = document.getElementById('polCmpRing');
    ring.className = 'pol-cmp-ring pol-cmp-' + state;
    ring.setAttribute('role', 'group');
    ring.setAttribute('aria-label', `${a.title} and ${b.title}: ${POL_CMP_CAPTION[state].toLowerCase()}`);
    ring.innerHTML = corner(a, 'Policy A', '') + polCmpMid(state) + corner(b, 'Policy B', ' pol-cmp-corner-b');
    const reason = document.getElementById('polCmpReason');
    reason.className = 'pol-cmp-reason pol-cmp-reason-' + state;
    if (state === 'fight' || state === 'team') {
      const kind = state === 'fight' ? 'riv' : 'pair', whys = idx.whys(a.id, b.id, kind);
      reason.innerHTML = `<span class="pol-cmp-lead">${state === 'fight' ? 'Why they compete:' : 'Why they work well together:'}</span> `
        + (whys.length ? whys.map(escapeHTML).join('<br>') : `These two are recorded as ${state === 'fight' ? 'competing' : 'working well together'}, with no reason given.`)
        + (state === 'fight' ? `<span class="pol-cmp-note">${POL_CMP_NOTE}</span>` : '');
    } else {
      reason.textContent = state === 'same' ? 'Pick two different policies.' : 'No recorded link between these two. The cards do not list either as competing with the other, or as working well with it.';
    }
    document.getElementById('polCmpCols').innerHTML = polCmpRows(a, b);
  }

  // The address of the pair on screen: #compare/<policy-a>/<policy-b>. A policy's id is lower-case letters, digits and hyphens, so it needs no escaping. Before any pair has been chosen it is #compare.
  function polCmpRoute() { return polCmpA && polCmpB ? 'compare/' + polCmpA + '/' + polCmpB : 'compare'; }

  // The pair the browser's Back would go to: the one the step the page is on was made from. A step made by a change of pair remembers it (polCmpGo); the first step (a link, a reload, the view just opened) has none,
  // and neither does one whose pair has since been archived, which is not gone back to from here.
  function polCmpPrev() {
    const s = history.state, prev = s && s.polCmp && s.polCmp.prev;
    return Array.isArray(prev) && prev.length === 2 && prev.every(id => POLICY_DATA.some(p => p.id === id)) ? prev : null;
  }
  // The Back pill follows the step the page is on, so it is set after anything that changes the step (a change of pair, an address) and not by the drawing of a pair.
  function polCmpSyncBack() {
    const back = document.getElementById('polCmpBack'), prev = polCmpPrev();
    if (!back) return;
    back.disabled = !prev;
    back.title = prev ? `Back to ${polCmpPolicy(prev[0]).title} and ${polCmpPolicy(prev[1]).title}` : 'There is no earlier pair to go back to';
  }

  // Every change of the pair the reader makes comes through here (a menu, a sample, Randomize): the pair is drawn, and the browser gets ONE step for it, at the pair's address, remembering the pair before it.
  function polCmpGo(a, b) {
    if (a === polCmpA && b === polCmpB) return;
    const before = polCmpA && polCmpB ? [polCmpA, polCmpB] : null;
    polCmpA = a; polCmpB = b;
    polCmpDraw();
    // A browser that refuses the step (Safari limits how often a page may add one) must not break the view: the pair is drawn all the same, and only the address and Back are lost.
    try { history.pushState(before ? { polCmp: { prev: before } } : null, '', '#' + polCmpRoute()); } catch (e) { /* no step: the comparison is still drawn */ }
    polCmpSyncBack();
  }
  // The pair from an address (the router, 40-router.js: a link, a reload, or the browser's Back and Forward). Both ids have to be policies on the page, or nothing changes and false comes back. It draws the pair if the view
  // has been built, and it never writes the address or adds a step, because the address is where the pair came from; the first build of the view (renderPolicyCompare) takes the pair as it is left here.
  function polCmpSet(a, b) {
    const live = id => typeof id === 'string' && POLICY_DATA.some(p => p.id === id);
    if (!live(a) || !live(b)) return false;
    const built = !!document.getElementById('polCmpCols');
    if (a !== polCmpA || b !== polCmpB) {
      polCmpA = a; polCmpB = b;
      if (built) polCmpDraw();
    }
    if (built) polCmpSyncBack();
    return true;
  }
  // The Back pill is the browser's Back, so the pairs have one timeline; it is on only when polCmpPrev has a pair to go back to.
  function polCmpBack() { if (polCmpPrev()) history.back(); }

  // Two different policies at random (the owner, 2026-11-24). Every pair is as likely as any other, so most are pairs the cards record no link for (6 of the 435 pairs compete and 29 work well together, on
  // 2026-11-24) and the view says so; the pair already on screen is not picked again. It is a change of the pair like any other, through polCmpGo: one step in the browser's history, which Back undoes.
  // The pair the view opens on: the first competing pair the cards record, in the order of the cards; with none recorded, the first two policies. Refresh goes back to it.
  function polCmpStart() {
    const first = polCmpIndex().pairs.riv[0];
    return first ? [first[0], first[1]] : [POLICY_DATA[0].id, (POLICY_DATA[1] || POLICY_DATA[0]).id];
  }
  // Refresh (the owner, 2026-11-24): back to the pair the view opens on, as a change of the pair like any other (one step in the browser's history, which Back undoes); nothing happens when it is already showing.
  function polCmpRefresh() { const [a, b] = polCmpStart(); polCmpGo(a, b); }

  function polCmpRandomize() {
    const ids = POLICY_DATA.map(p => p.id);
    if (ids.length < 2) return;
    const pickOne = () => ids[Math.floor(Math.random() * ids.length)];
    let a, b;
    do { a = pickOne(); b = pickOne(); } while (a === b || (a === polCmpA && b === polCmpB));
    polCmpGo(a, b);
  }

  // `slot` is the room beside the Landscape's switch (20-cite-export.js): the two menus and the pills are on the switch's row, in line with the views, and not in the view under it (the owner, 2026-11-24).
  function renderPolicyCompare(container, slot) {
    container.innerHTML = '';
    slot.innerHTML = '';
    if (!POLICY_DATA.length) { container.innerHTML = '<p class="pol-cmp-empty">There are no policies to compare.</p>'; return; }
    const idx = polCmpIndex();
    // It opens on the pair an address named (polCmpSet, before the view is first built), else on the first competing pair the cards record, in the order of the cards; with none recorded, on the first two policies.
    if (!polCmpA || !polCmpB) [polCmpA, polCmpB] = polCmpStart();
    const opts = polCmpOptions();
    // The two menus come first and the pills after them, the whole row on the switch's line where it fits (the owner, 2026-11-24: "the policy selections should be before" the buttons, after "make sure the rest of the buttons
    // are in line with the row across compare and link views"). The menus and the pills are the shared filter bar's (filterbar.css). The pills are in alphabetical order (the owner, 2026-11-24), Copy Draft and Print
    // (32-policy-draft.js) among them: Back, Copy Draft, Copy link, Print, Randomize, Refresh. They are one unit (.pol-subview-pills), and so are the two menus (.pol-subview-pick), so that where there is no room for all of it on
    // the switch's line the pills drop together to a line of their own, under the menus. Where it does fit the menus take what the pills leave, so the pills end the row at the same place as on the Links row.
    slot.innerHTML = `<div class="pol-subview-pick"><span class="ctl-pair"><label class="ctl-label" for="polCmpA">Policy A</label><select id="polCmpA">${opts}</select></span>`
      + `<span class="ctl-pair"><label class="ctl-label" for="polCmpB">Policy B</label><select id="polCmpB">${opts}</select></span></div>`
      + '<span class="pol-subview-pills"><button class="kw-pill" type="button" id="polCmpBack" disabled>Back</button>' + polDraftPill('copy', 'Cmp', 'Copy both policies as one Markdown primer draft')
      + '<button class="kw-pill" type="button" id="polCmpCopy" title="Copy a link to this comparison">Copy link</button>' + polDraftPill('print', 'Cmp', 'Print both policies, or save them as a PDF')
      + '<button class="kw-pill" type="button" id="polCmpRandom" title="Compare two policies chosen at random">Randomize</button><button class="kw-pill" type="button" id="polCmpRefresh" title="Back to the pair this view opens on">Refresh</button></span>';
    container.innerHTML = `
      <div class="pol-cmp-ring" id="polCmpRing" tabindex="-1"></div>
      <p class="pol-cmp-reason" id="polCmpReason" aria-live="polite"></p>
      <div class="pol-cmp-cols" id="polCmpCols"></div>`;
    document.getElementById('polCmpA').addEventListener('change', e => polCmpGo(e.target.value, polCmpB));
    document.getElementById('polCmpB').addEventListener('change', e => polCmpGo(polCmpA, e.target.value));
    document.getElementById('polCmpBack').addEventListener('click', polCmpBack);
    // The link is built from the page's own location (appURL, 20-cite-export.js), as the policy dialog's Copy link is: inside the website's embed that is the dashboard's own address, which opens it on this pair.
    document.getElementById('polCmpCopy').addEventListener('click', e => copyText(appURL(polCmpRoute()), e.currentTarget));
    document.getElementById('polCmpRandom').addEventListener('click', polCmpRandomize);
    document.getElementById('polCmpRefresh').addEventListener('click', polCmpRefresh);
    polDraftWire('Cmp', () => [polCmpA, polCmpB]);   // Copy Draft and Print take both policies, A then B
    const cols = document.getElementById('polCmpCols');
    const go = e => {
      const open = e.target.closest ? e.target.closest('.pol-cmp-open') : null;
      if (open) { openPolModalById(open.dataset.id); return true; }
      const xref = e.target.closest ? e.target.closest('.pol-xref') : null;
      if (xref) { e.stopPropagation(); openPolModalById(xref.dataset.polId); return true; }
      return false;
    };
    cols.addEventListener('click', e => {
      if (go(e)) return;
      const foldBtn = e.target.closest ? e.target.closest('.pol-cmp-fold-btn') : null;
      if (foldBtn) {
        const box = foldBtn.closest('.pol-cmp-fold'), opening = !box.classList.contains('is-open');
        polCmpFold(box, opening);
        // Folding a long summary the reader has scrolled to the end of leaves the page far below it: bring the top of it back into view.
        if (!opening && box.scrollIntoView && box.getBoundingClientRect().top < 0) box.scrollIntoView({ block: 'start' });
        return;
      }
      const sample = e.target.closest ? e.target.closest('.pol-cmp-sample') : null;
      if (!sample) return;
      const before = polCmpA + '|' + polCmpB;
      // A sample under one side becomes the other side.
      if (sample.dataset.side === 'a') polCmpGo(polCmpA, sample.dataset.id); else polCmpGo(sample.dataset.id, polCmpB);
      if (polCmpA + '|' + polCmpB === before) return;   // it was already the other side: nothing was drawn again, so the focus is still on the button and the page stays where it is
      // The cells were drawn again, so the focus has to be put somewhere: on the ring, which is also where the new pair is. The page is scrolled to it only when it is not already in
      // view (under the sticky menus, or below the window), instead of always: pressing a sample that sat beside the ring need not move the page at all.
      const ring = document.getElementById('polCmpRing');
      ring.focus({ preventScroll: true });
      const bar = slot.parentNode, r = ring.getBoundingClientRect(), under = bar && bar.getBoundingClientRect ? bar.getBoundingClientRect().bottom : 0;
      if (ring.scrollIntoView && (r.top < under || r.bottom > (window.innerHeight || 0))) ring.scrollIntoView({ block: 'start', behavior: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
    // Keyboard focus that lands inside a folded summary (a link in the part that is out of sight) opens it, so the focus is never on something that cannot be seen. The Show more button itself does not.
    cols.addEventListener('focusin', e => {
      const box = e.target.closest ? e.target.closest('.pol-cmp-fold.is-long') : null;
      if (box && !box.classList.contains('is-open') && !(e.target.classList && e.target.classList.contains('pol-cmp-fold-btn'))) polCmpFold(box, true);
    });
    cols.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('pol-xref')) { e.preventDefault(); go(e); }
    });
    polCmpDraw();
    polCmpSyncBack();
  }
