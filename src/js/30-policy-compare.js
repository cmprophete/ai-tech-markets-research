  /* ── Landscape: the Compare view ──────────────────────────────────────────────────────────────────────────────────
     The Landscape's third view, after All and Links (2026-11-19, the owner: "a main view comparing policies with sample
     complementary policies and sample conflicting policies" and "a fun graphic of the two policies fighting each other"). Two policies are
     set side by side: chosen in two menus, from the fights and the tag teams the cards record, or by clicking a sample under either one.
     A ring above them says whether the two are recorded rivals (a fight), recorded partners (a tag team) or neither, and each side is set out
     under it in the dialog's own words, with up to three of the policies it works well with and up to three that compete with it.

     Nothing here is made up. Complementary is each card's pairsWith, conflicting its competesWith, and every reason shown is the author's own
     `why`, as written. A link written on one card only is read as a link between the two (the Links graph does the same), so a policy's samples
     are its own entries first, in the order they were written, then the policies that name it. There are no scores and no winner: the gloves
     picture "these two compete", they do not rank. Most pairs of policies have no recorded link at all (6 of the 435 pairs of 30 are rivals,
     29 are partners, on 2026-11-19), and the view says so rather than staging a fight.

     The card text under each side is the dialog's, drawn the same way (injectPolicyLinks, the same label, text and list styles), so a card
     reads the same here and there. The motion is CSS only, and only for a reader who has not asked their device for less of it (policy.css). */
  let polCmpA = null, polCmpB = null, polCmpTeam = -1, polCmpIdx = null;

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

  // One side: the card in the dialog's words, then up to three samples each of what works well with it and what competes with it.
  function polCmpColumn(p, side) {
    const idx = polCmpIndex(), area = policyAreaOf(p);
    const paperMap = Object.fromEntries([...RESEARCH_DATA, ...POLICY_SOURCES].map(r => [r.id, r]));
    const li = arr => (arr || []).map(item => `<li>${injectPolicyLinks(item, paperMap)}</li>`).join('');
    const samples = (kind, none) => {
      const list = idx.partners(p.id, kind);
      if (!list.length) return `<div class="pol-cmp-none">${none}</div>`;
      const shown = list.slice(0, 3).map(id => {
        const q = polCmpPolicy(id);
        return `<button type="button" class="pol-cmp-sample" data-side="${side}" data-id="${escapeHTML(id)}" style="--cat-color:${polCmpAreaColor(q)}"><span class="pol-cmp-sample-title">${escapeHTML(q.title)}</span>`
          + (idx.whyFor(p.id, id, kind) ? `<span class="pol-cmp-sample-why">${escapeHTML(idx.whyFor(p.id, id, kind))}</span>` : '')
          + '<span class="pol-cmp-sample-go">Compare <span class="ui-chevron sm right" aria-hidden="true"></span></span></button>';
      }).join('');
      return `<div class="pol-cmp-samples">${shown}${list.length > 3 ? `<div class="pol-cmp-more">and ${list.length - 3} more</div>` : ''}</div>`;
    };
    const section = (label, inner) => `<div class="pol-modal-section"><div class="pol-modal-label">${label}</div>${inner}</div>`;
    const lists = [['Strengths', p.strengths], ['Risks', p.risks]].filter(([, arr]) => Array.isArray(arr) && arr.length)
      .map(([label, arr]) => section(label, `<ul class="pol-modal-list">${li(arr)}</ul>`)).join('');
    return `<div class="pol-cmp-col" style="--cat-color:${polCmpAreaColor(p)}">`
      + `<h3 class="pol-cmp-name">${escapeHTML(p.title)}</h3>`
      + `<div class="pol-cmp-area">${area ? escapeHTML(area.label) : ''}</div>`
      + `<div><button type="button" class="pol-action-btn pol-cmp-open" data-id="${escapeHTML(p.id)}">Read the full policy</button></div>`
      + section('What it is', `<div class="pol-modal-text">${injectPolicyLinks(p.summary, paperMap)}</div>`)
      + section('Works well with', samples('pair', 'No recorded partners.'))
      + section('Competes with', samples('riv', 'No recorded rivals.'))
      + lists
      + '</div>';
  }

  // Draws everything that depends on the two chosen policies; the menus and the pills are built once, in renderPolicyCompare.
  function polCmpDraw() {
    const idx = polCmpIndex(), a = polCmpPolicy(polCmpA), b = polCmpPolicy(polCmpB);
    polCmpA = a.id; polCmpB = b.id;
    const rival = idx.linked(a.id, b.id, 'riv'), partner = idx.linked(a.id, b.id, 'pair');
    const state = a.id === b.id ? 'same' : rival ? 'fight' : partner ? 'team' : 'idle';
    document.getElementById('polCmpA').value = a.id;
    document.getElementById('polCmpB').value = b.id;
    document.querySelectorAll('#polCmpFightRow button[data-a]').forEach(btn => {
      const on = (btn.dataset.a === a.id && btn.dataset.b === b.id) || (btn.dataset.a === b.id && btn.dataset.b === a.id);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    const announce = state === 'fight' ? ['In this corner', 'And in this corner'] : state === 'team' ? ['Teammate', 'Teammate'] : ['Policy A', 'Policy B'];
    const corner = (p, role, cls) => `<div class="pol-cmp-corner${cls}" style="--cat-color:${polCmpAreaColor(p)}"><div class="pol-cmp-announce">${role}</div><div class="pol-cmp-name-sm">${escapeHTML(p.title)}</div><div class="pol-cmp-areaname">${escapeHTML((policyAreaOf(p) || {}).label || '')}</div></div>`;
    const ring = document.getElementById('polCmpRing');
    ring.className = 'pol-cmp-ring pol-cmp-' + state;
    ring.innerHTML = corner(a, announce[0], '') + polCmpClash(state) + corner(b, announce[1], ' pol-cmp-corner-b');
    const reason = document.getElementById('polCmpReason');
    reason.className = 'pol-cmp-reason pol-cmp-reason-' + state;
    if (state === 'fight' || state === 'team') {
      const kind = state === 'fight' ? 'riv' : 'pair', whys = idx.whys(a.id, b.id, kind);
      reason.innerHTML = `<span class="pol-cmp-lead">${state === 'fight' ? 'What they are fighting over:' : 'Why they team up:'}</span> `
        + (whys.length ? whys.map(escapeHTML).join('<br>') : `These two are recorded as ${state === 'fight' ? 'rivals' : 'partners'}, with no reason given.`);
    } else {
      reason.textContent = state === 'same' ? 'Pick two different policies.' : 'No recorded link between these two, so there is no fight and no team-up.';
    }
    document.getElementById('polCmpCols').innerHTML = polCmpColumn(a, 'a') + polCmpColumn(b, 'b');
  }

  function renderPolicyCompare(container) {
    container.innerHTML = '';
    if (!POLICY_DATA.length) { container.innerHTML = '<p class="pol-cmp-empty">There are no policies to compare.</p>'; return; }
    const idx = polCmpIndex(), title = id => polCmpPolicy(id).title;
    // It opens on the first recorded fight, in the order of the cards; with none recorded, on the first two policies.
    if (!polCmpA || !polCmpB) {
      const first = idx.pairs.riv[0];
      polCmpA = first ? first[0] : POLICY_DATA[0].id;
      polCmpB = first ? first[1] : (POLICY_DATA[1] || POLICY_DATA[0]).id;
    }
    const opts = polCmpOptions();
    // The two menus are the shared filter bar's (filterbar.css), which sticks under the switch while the cards below are read; the pills under it are the same bar's pills.
    container.innerHTML = `
      <div class="controls pol-cmp-bar" role="region" aria-label="Choose two policies to compare">
        <div class="controls-row">
          <span class="ctl-pair"><label class="ctl-label" for="polCmpA">Policy A</label><select id="polCmpA">${opts}</select></span>
          <span class="ctl-pair"><label class="ctl-label" for="polCmpB">Policy B</label><select id="polCmpB">${opts}</select></span>
        </div>
      </div>
      <div class="controls pol-cmp-starts">
        <div class="pill-row" id="polCmpFightRow" role="group" aria-label="Recorded fights"${idx.pairs.riv.length ? '' : ' hidden'}><span class="ctl-label kw-label">Fights</span>${idx.pairs.riv.map(([x, y]) => `<button class="kw-pill" type="button" data-a="${escapeHTML(x)}" data-b="${escapeHTML(y)}" aria-pressed="false">${escapeHTML(title(x))} vs ${escapeHTML(title(y))}</button>`).join('')}</div>
        <div class="pill-row" id="polCmpTeamRow" role="group" aria-label="Recorded tag teams"${idx.pairs.pair.length ? '' : ' hidden'}><span class="ctl-label kw-label">Tag teams</span><button class="kw-pill" type="button" id="polCmpTeam">Show a tag team</button></div>
      </div>
      <div class="pol-cmp-ring" id="polCmpRing" tabindex="-1"></div>
      <p class="pol-cmp-reason" id="polCmpReason" aria-live="polite"></p>
      <div class="pol-cmp-cols" id="polCmpCols"></div>`;
    document.getElementById('polCmpA').addEventListener('change', e => { polCmpA = e.target.value; polCmpDraw(); });
    document.getElementById('polCmpB').addEventListener('change', e => { polCmpB = e.target.value; polCmpDraw(); });
    document.getElementById('polCmpFightRow').addEventListener('click', e => {
      const btn = e.target.closest ? e.target.closest('button[data-a]') : null;
      if (!btn) return;
      polCmpA = btn.dataset.a; polCmpB = btn.dataset.b; polCmpDraw();
    });
    // The tag teams are many (every recorded pair of partners), so one button walks through them in the order of the cards instead of listing them all.
    document.getElementById('polCmpTeam').addEventListener('click', () => {
      const teams = idx.pairs.pair;
      if (!teams.length) return;
      polCmpTeam = (polCmpTeam + 1) % teams.length;
      polCmpA = teams[polCmpTeam][0]; polCmpB = teams[polCmpTeam][1];
      polCmpDraw();
    });
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
      const sample = e.target.closest ? e.target.closest('.pol-cmp-sample') : null;
      if (!sample) return;
      // A sample under one side becomes the other side.
      if (sample.dataset.side === 'a') polCmpB = sample.dataset.id; else polCmpA = sample.dataset.id;
      polCmpDraw();
      // The sample that was clicked is gone and the new fight is at the top: bring the ring into view, and the focus with it.
      const ring = document.getElementById('polCmpRing');
      ring.focus({ preventScroll: true });
      if (ring.scrollIntoView) ring.scrollIntoView({ block: 'start', behavior: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
    cols.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('pol-xref')) { e.preventDefault(); go(e); }
    });
    polCmpDraw();
  }
