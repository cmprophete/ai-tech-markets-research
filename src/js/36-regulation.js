  /* ── REGULATION ──────────────────────────────────────────────────────────
     THREE PAGES, one argument: The Tech, Workers, Cash. Each act is its own
     view, reached by #regulate-tech / #regulate-workers / #regulate-cash and
     by the act rail at the top. They were briefly a single scrolling page;
     that put roughly 35,000px between Act 1 and Act 3, which is not a page
     anyone reads, so each act renders on its own again.

     The argument still runs across them. Acts 1 and 2 close on a handoff line
     and a button to the next act, Act 3 closes the argument, and the rail is
     always visible, so the three read as a sequence rather than as three
     unrelated tabs.

     EVERY DIAGRAM IS CLICKABLE. A layer of the stack, a branch of the fork, a
     beat on either cash path: each is a hit target carrying data-act and
     data-detail, resolved against REGULATION[act].details by one delegated
     listener. The hit targets are <g role="button" tabindex="0"> rather than
     <a>, so they are reachable and operable from the keyboard; SVG elements
     do not fire a click on Enter the way a <button> does, hence the keydown
     handler at the bottom.

     Prose comes from REGULATION in data/regulation-data.js and is authored,
     so it is written with innerHTML the way THEMES and CASE_STUDIES are.

     COLOR. --purple-light on the navy band, --purple (true Deep Purple) for
     marks on beige. See the note in tokens.css: Deep Purple scores 1.02:1 on
     navy and cannot be the band accent. Do not swap one for the other. */

  let _regBuilt = {};   // act id -> true once that act's DOM exists

  // ── small SVG helpers ───────────────────────────────────────────────
  // Rough advance width. Good enough to lay out pills and wrap labels
  // without measuring the DOM, which we cannot do before insertion.
  function regTextW(s, size) { return String(s).replace(/&[a-z]+;/g, 'x').length * size * 0.545; }

  function regWrap(s, maxChars) {
    const words = String(s).split(' ');
    const lines = []; let cur = '';
    for (const w of words) {
      if (cur && (cur + ' ' + w).length > maxChars) { lines.push(cur); cur = w; }
      else cur = cur ? cur + ' ' + w : w;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function regTspans(s, x, y, lh, maxChars) {
    return regWrap(s, maxChars).map((l, i) =>
      `<tspan x="${x}" y="${y + i * lh}">${l}</tspan>`).join('');
  }

  // Attributes that turn any <g> into a keyboard-operable hit target.
  function regHit(act, id, label) {
    return `class="reg-hit" role="button" tabindex="0" data-act="${act}" data-detail="${id}" aria-label="${label}"`;
  }

  /* ── ACT 1: the stack ─────────────────────────────────────────────── */
  function regStackSVG(d) {
    const BAND_H = 70, GAP = 14, TOP = 34;
    const PILL_X = 160, PILL_MAX = 596;
    // Authored bottom-to-top (chips first); drawn top-down like a stack.
    const layers = d.stack.slice().reverse();
    const H = TOP + layers.length * BAND_H + (layers.length - 1) * GAP + 10;

    const bands = layers.map((layer, i) => {
      const y = TOP + i * (BAND_H + GAP);
      let cx = PILL_X, row = 0;
      const pills = layer.firms.map(f => {
        const w = Math.round(regTextW(f.name, 11.5)) + 24;
        if (cx + w > PILL_MAX && row === 0) { row = 1; cx = PILL_X; }
        const px = cx; cx += w + 8;
        const py = y + (row === 0 ? 20 : 48);
        const cls = 'reg-pill' + (f.integrated ? ' reg-pill--int' : '') + (f.wide ? ' reg-pill--wide' : '');
        return `<g class="${cls}">
            <rect x="${px}" y="${py}" width="${w}" height="24" rx="5"/>
            <text x="${px + w / 2}" y="${py + 16}" text-anchor="middle">${f.name}</text>
          </g>`;
      }).join('');
      return `<g ${regHit('tech', layer.id, layer.name + ' layer. Open details.')}>
          <rect class="reg-band-bg" x="0" y="${y}" width="${PILL_MAX + 10}" height="${BAND_H}" rx="7"/>
          <text class="reg-band-name" x="14" y="${y + 27}">${layer.name}</text>
          ${regWrap(layer.note, 22).map((l, k) =>
            `<text class="reg-band-note" x="14" y="${y + 45 + k * 13}">${l}</text>`).join('')}
          ${pills}
        </g>`;
    }).join('');

    /* The integration gutter: one track per parent that appears at more than
       one layer, filled where present and hollow where not. This is the
       argument the drawing exists to make, so it gets its own column rather
       than connector lines threaded through the pills. */
    const INT = [{ key: 'google', name: 'Google' }, { key: 'amazon', name: 'Amazon' }, { key: 'microsoft', name: 'Microsoft' }];
    const tracks = INT.map((p, j) => {
      const x = 642 + j * 58;
      const dots = layers.map((layer, i) => {
        const y = TOP + i * (BAND_H + GAP) + BAND_H / 2;
        // 'giants' is the applications layer's catch-all for the same three
        // parents, so it counts as a presence for each of them.
        const here = layer.firms.some(f => f.key === p.key || f.key === 'giants');
        return `<circle class="reg-dot${here ? ' reg-dot--on' : ''}" cx="${x}" cy="${y}" r="5"/>`;
      }).join('');
      const y0 = TOP + BAND_H / 2;
      const y1 = TOP + (layers.length - 1) * (BAND_H + GAP) + BAND_H / 2;
      return `<g ${regHit('tech', p.key, p.name + '. Open details.')}>
          <rect class="reg-track-hit" x="${x - 26}" y="${TOP - 22}" width="52" height="${y1 - y0 + BAND_H}" rx="6"/>
          <line class="reg-track-line" x1="${x}" y1="${y0}" x2="${x}" y2="${y1}"/>
          ${dots}
          <text class="reg-track-name" x="${x}" y="${TOP - 12}" text-anchor="middle">${p.name}</text>
        </g>`;
    }).join('');

    return `<svg class="reg-svg reg-svg--stack" viewBox="0 0 820 ${H}" role="group"
         aria-label="The AI stack in four layers from applications down to chips, with Google, Amazon and Microsoft present at nearly every layer. Each layer and each firm opens a detail panel.">
        <text class="reg-gutter-label" x="700" y="${TOP - 26}" text-anchor="middle">Present at every layer</text>
        ${bands}${tracks}
      </svg>`;
  }

  /* ── ACT 2: the fork ──────────────────────────────────────────────── */
  function regForkSVG(d) {
    const W = 820;
    const left = d.branches.find(b => b.tone === 'against');
    const right = d.branches.find(b => b.tone === 'for');
    const KIND_H = 56, KIND_GAP = 10, BRANCH_Y = 206, KIND_Y = 262;
    const H = KIND_Y + Math.max(left.kinds.length, right.kinds.length) * (KIND_H + KIND_GAP) + 16;

    const branchCol = (b, cx, cw) => {
      const x = cx - cw / 2;
      const kinds = b.kinds.map((k, i) => {
        const y = KIND_Y + i * (KIND_H + KIND_GAP);
        return `<g ${regHit('workers', k.id, k.name + '. Open details.')}>
            <rect class="reg-kind-bg" x="${x}" y="${y}" width="${cw}" height="${KIND_H}" rx="7"/>
            <text class="reg-kind-name" x="${x + 14}" y="${y + 21}">${k.name}</text>
            ${regWrap(k.note, 42).map((l, j) =>
              `<text class="reg-kind-note" x="${x + 14}" y="${y + 37 + j * 13}">${l}</text>`).join('')}
            ${k.flag ? `<text class="reg-kind-flag" x="${x + cw - 14}" y="${y + 21}" text-anchor="end">${k.flag}</text>` : ''}
          </g>`;
      }).join('');
      return `<g class="reg-branch reg-branch--${b.tone}">
          <rect class="reg-branch-head" x="${x}" y="${BRANCH_Y}" width="${cw}" height="40" rx="7"/>
          <text class="reg-branch-answer" x="${x + 14}" y="${BRANCH_Y + 25}">${b.answer}</text>
          <text class="reg-branch-label" x="${x + cw - 14}" y="${BRANCH_Y + 25}" text-anchor="end">${b.label}</text>
          ${kinds}
        </g>`;
    };

    const CW = 376, LX = 202, RX = 618;
    return `<svg class="reg-svg reg-svg--flow" viewBox="0 0 ${W} ${H}" role="group"
         aria-label="A flow diagram. A new AI capability meets one test: does it make human skills and expertise more valuable. No leads to labor-replacing technologies, yes to pro-worker ones. Each of the five categories opens a detail panel.">
        <defs>
          <marker id="regArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" class="reg-arrowhead"/>
          </marker>
        </defs>
        <g class="reg-node reg-node--start">
          <rect x="310" y="8" width="200" height="40" rx="7"/>
          <text x="410" y="33" text-anchor="middle">A new AI capability</text>
        </g>
        <line class="reg-link" x1="410" y1="48" x2="410" y2="74" marker-end="url(#regArrow)"/>
        <g class="reg-node reg-node--test">
          <rect x="190" y="78" width="440" height="56" rx="7"/>
          ${regWrap(d.test, 46).map((l, i) =>
            `<text x="410" y="${103 + i * 18}" text-anchor="middle">${l}</text>`).join('')}
        </g>
        <!-- The default is drawn heavier than the alternative: the paper's
             point is that this is not a 50/50 fork. -->
        <path class="reg-link reg-link--default" d="M410,134 L410,168 L${LX},168 L${LX},${BRANCH_Y - 6}" marker-end="url(#regArrow)"/>
        <path class="reg-link reg-link--steered" d="M410,134 L410,168 L${RX},168 L${RX},${BRANCH_Y - 6}" marker-end="url(#regArrow)"/>
        <text class="reg-link-note" x="${LX + 90}" y="156">where the money points</text>
        <text class="reg-link-note reg-link-note--alt" x="${RX - 90}" y="156" text-anchor="end">needs steering</text>
        ${branchCol(left, LX, CW)}
        ${branchCol(right, RX, CW)}
      </svg>`;
  }

  /* ── ACT 3: one shock, two paths ──────────────────────────────────── */
  function regCashSVG(d) {
    const W = 820, H = 358;
    const X0 = 40, SHOCK = 268, FORK = 344, XE = 742, BASE = 112;
    const bad = d.diagram.paths.find(p => p.tone === 'bad');
    const good = d.diagram.paths.find(p => p.tone === 'good');
    /* The y values are a shape, not a quantity: the diagram carries no units
       and must not be read as one. Bad labels hang below their dot and good
       labels sit above, so the sets cannot collide where the lines cross. */
    const XS = [FORK + 126, FORK + 258, XE];
    const badY = [196, 254, 300], goodY = [138, 112, BASE - 26];
    const FORK_Y = 150, LH = 12;

    const path = (ys) => `M${SHOCK},${BASE} L${FORK},${FORK_Y} ` + XS.map((x, i) => `L${x},${ys[i]}`).join(' ');
    const beats = (p, ys, isBad) => XS.map((x, i) => {
      const b = p.beats[i];
      // Above-the-point labels grow downward from their start, so lift them
      // by the extra lines or the last line lands on the path.
      const lines = regWrap(b.label, 16).length;
      const dy = isBad ? 22 : -16 - (lines - 1) * LH;
      const last = i === XS.length - 1;
      return `<g ${regHit('cash', b.id, b.label + '. Open details.')}>
          <rect class="reg-beat-hit" x="${x - 54}" y="${Math.min(ys[i], ys[i] + dy) - 12}" width="108" height="${Math.abs(dy) + lines * LH + 16}" rx="6"/>
          <g class="reg-beat reg-beat--${isBad ? 'bad' : 'good'}">
            <circle cx="${x}" cy="${ys[i]}" r="5"/>
            <text text-anchor="${last ? 'end' : 'middle'}">${regTspans(b.label, last ? x - 10 : x, ys[i] + dy, LH, 16)}</text>
          </g>
        </g>`;
    }).join('');

    const sh = d.diagram.shared;
    return `<svg class="reg-svg reg-svg--cash" viewBox="0 0 ${W} ${H}" role="group"
         aria-label="A line diagram. A household runs along a stable baseline until a transition, where income drops. Without cash the path steps down to lasting insecurity; with cash it dips and returns to baseline. Each point opens a detail panel.">
        <g class="reg-legend">
          <rect class="reg-legend-key reg-legend-key--good" x="${W - 250}" y="14" width="16" height="4" rx="2"/>
          <text class="reg-path-label reg-path-label--good" x="${W - 228}" y="21">${good.label}</text>
          <rect class="reg-legend-key reg-legend-key--bad" x="${W - 250}" y="36" width="16" height="4" rx="2"/>
          <text class="reg-path-label reg-path-label--bad" x="${W - 228}" y="43">${bad.label}</text>
        </g>
        <line class="reg-base" x1="${X0}" y1="${BASE}" x2="${SHOCK}" y2="${BASE}"/>
        <text class="reg-base-label" x="${X0}" y="${BASE - 14}">${d.diagram.baseline}</text>
        <line class="reg-shock" x1="${SHOCK}" y1="62" x2="${SHOCK}" y2="${H - 22}"/>
        <text class="reg-shock-label" x="${SHOCK - 8}" y="56" text-anchor="end">${d.diagram.shock}</text>
        <path class="reg-path reg-path--bad"  d="${path(badY)}"/>
        <path class="reg-path reg-path--good" d="${path(goodY)}"/>
        <!-- The shared beat: one event, one label, both lines through it. -->
        <g ${regHit('cash', sh.id, sh.label + '. Open details.')}>
          <rect class="reg-beat-hit" x="${FORK - 54}" y="${FORK_Y - 44}" width="108" height="62" rx="6"/>
          <g class="reg-beat reg-beat--shared">
            <circle cx="${FORK}" cy="${FORK_Y}" r="5"/>
            <text text-anchor="middle">${regTspans(sh.label, FORK,
              FORK_Y - 16 - (regWrap(sh.label, 16).length - 1) * LH, LH, 16)}</text>
          </g>
        </g>
        ${beats(bad, badY, true)}
        ${beats(good, goodY, false)}
      </svg>`;
  }

  /* ── the shared detail panel ──────────────────────────────────────── */
  // Field order differs per act, so each gets its own row list. Rows whose
  // field is absent are dropped rather than rendered empty.
  const REG_ROWS = {
    tech:    [['what', 'What it is'], ['who', 'Who is there'], ['chokepoint', 'Why it is a chokepoint'], ['policy', 'What applies here']],
    workers: [['what', 'What it is'], ['why', 'Why it matters'], ['lever', 'The lever']],
    cash:    [['what', 'What is happening'], ['evidence', 'The evidence'], ['design', 'Design limit']]
  };

  function regDetailHTML(act, id) {
    const det = (REGULATION[act].details || {})[id];
    if (!det) return '';
    const rows = REG_ROWS[act].filter(([k]) => det[k]).map(([k, label]) =>
      `<div class="reg-d-row"><div class="reg-d-label">${label}</div><p class="reg-d-text">${det[k]}</p></div>`).join('');
    return `<div class="reg-d-head">
          <span class="reg-d-kicker">${det.kicker || ''}</span>
          <button type="button" class="reg-d-close" data-reg-close="${act}" aria-label="Close details">&times;</button>
        </div>${rows}`;
  }

  function regSelect(act, id) {
    const panel = document.getElementById('regDetail-' + act);
    if (!panel) return;
    const html = regDetailHTML(act, id);
    if (!html) return;
    // Mark the selected hit target in this act only.
    document.querySelectorAll(`#regAct-${act} .reg-hit`).forEach(g => {
      const on = g.dataset.detail === id;
      g.classList.toggle('reg-hit--on', on);
      g.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    panel.innerHTML = html;
    panel.hidden = false;
  }

  function regCloseDetail(act) {
    const panel = document.getElementById('regDetail-' + act);
    if (!panel) return;
    panel.hidden = true; panel.innerHTML = '';
    document.querySelectorAll(`#regAct-${act} .reg-hit`).forEach(g => {
      g.classList.remove('reg-hit--on'); g.setAttribute('aria-pressed', 'false');
    });
  }

  /* ── act bodies ───────────────────────────────────────────────────── */
  function regActBody(act, d) {
    const diagram = act === 'tech' ? regStackSVG(d) : act === 'workers' ? regForkSVG(d) : regCashSVG(d);
    const prompt = act === 'tech' ? 'Click any layer, or any firm on the right, to open it up.'
                 : act === 'workers' ? 'Click any of the five categories to open it up.'
                 : 'Click any point on either path to open it up.';
    const figure = `
      <div class="reg-figure">
        ${diagram}
        <p class="reg-prompt">${prompt}</p>
        <div class="reg-detail" id="regDetail-${act}" aria-live="polite" hidden></div>
      </div>`;

    if (act === 'tech') {
      const col = (c, tone) => `
        <div class="reg-vs-col reg-vs-col--${tone}">
          <div class="reg-vs-label">${c.label}</div>
          <ul class="reg-vs-list">${c.points.map(p => `<li>${p}</li>`).join('')}</ul>
        </div>`;
      return `${figure}
        <p class="reg-takeaway">${d.stackTakeaway}</p>
        <h4 class="reg-sub">${d.contrast.heading}</h4>
        <div class="reg-vs">${col(d.contrast.tech, 'tech')}<div class="reg-vs-rule" aria-hidden="true"></div>${col(d.contrast.firms, 'firms')}</div>
        <p class="reg-takeaway">${d.contrast.close}</p>
        <h4 class="reg-sub">${d.actionsLabel}</h4>
        <div class="reg-actions">${d.actions.map(a => `
          <article class="reg-action">
            <div class="reg-action-n">${a.n}</div>
            <h5 class="reg-action-title">${a.title}</h5>
            <p class="reg-action-text">${a.text}</p>
          </article>`).join('')}</div>`;
    }

    if (act === 'workers') {
      return `${figure}
        <h4 class="reg-sub">${d.gravity.heading}</h4>
        <p class="reg-takeaway">${d.gravity.text}</p>
        <h4 class="reg-sub">${d.leversLabel}</h4>
        <p class="reg-note">${d.leverNote}</p>
        <div class="reg-levers">${d.leverGroups.map(g => `
          <article class="reg-lever">
            <h5 class="reg-lever-name">${g.name}</h5>
            <ul class="reg-lever-list">${g.items.map(i => `<li>${i}</li>`).join('')}</ul>
          </article>`).join('')}</div>`;
    }

    return `${figure}
      <p class="reg-takeaway">${d.diagram.note}</p>
      <h4 class="reg-sub">${d.momentsLabel}</h4>
      <ul class="reg-moments">${d.moments.map(m => `<li>${m}</li>`).join('')}</ul>
      <h4 class="reg-sub">${d.scaleLabel}</h4>
      <div class="reg-scale">${d.scale.map(s => `
        <div class="reg-scale-item"><div class="reg-scale-stat">${s.stat}</div><div class="reg-scale-text">${s.text}</div></div>`).join('')}</div>
      <h4 class="reg-sub">${d.evidenceLabel}</h4>
      <p class="reg-note">${d.evidenceNote}</p>
      <div class="reg-evidence">${d.evidence.map(e => `
        <article class="reg-ev${e.nullResult ? ' reg-ev--null' : ''}">
          <div class="reg-ev-stat">${e.stat}</div>
          <div class="reg-ev-text">${e.text}</div>
          <div class="reg-ev-where">${e.where}</div>
          <div class="reg-ev-design">${e.design}</div>
          ${e.caveat ? `<p class="reg-ev-caveat">${e.caveat}</p>` : ''}
        </article>`).join('')}</div>
      <h4 class="reg-sub">${d.politicsLabel}</h4>
      <p class="reg-takeaway">${d.politics}</p>`;
  }

  /* Fades each figure in as it comes into view. Gated on reduced-motion, and
     gated on IntersectionObserver existing: without either, the figures are
     simply visible from the start, which is the correct no-JS-frills state
     rather than a blank diagram. */
  function regObserveFigures() {
    const figs = document.querySelectorAll('#regBody .reg-figure');
    const reduce = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      figs.forEach(f => f.classList.add('reg-in'));
      return;
    }
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('reg-in');
        obs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    figs.forEach(f => io.observe(f));
  }

  function buildRegulation() {
    const area = document.getElementById('regulationArea');
    if (!area) return;
    const P = REGULATION.page, k = activeRegulation, d = REGULATION[k];
    document.getElementById('regLede').innerHTML = P.lede;
    document.getElementById('regStandfirst').innerHTML = P.standfirst;

    const rail = `<nav class="reg-rail" aria-label="The three acts">
        ${P.order.map(a => `<button type="button" class="reg-rail-btn${a === k ? ' active' : ''}"
            data-reg-jump="${a}" aria-current="${a === k ? 'page' : 'false'}">
            <span class="reg-rail-act">${REGULATION[a].act}</span>
            <span class="reg-rail-name">${REGULATION[a].label}</span>
          </button>`).join('')}
      </nav>`;

    /* The handoff. Acts 1 and 2 end on the line that leads into the next act
       plus a button to it, so the three pages still read as one argument;
       Act 3 ends on the argument's own closing line. */
    const i = P.order.indexOf(k), next = P.order[i + 1];
    const foot = next
      ? `<div class="reg-handoff">
           <p class="reg-transition">${P.transitions[k] || ''}</p>
           <button type="button" class="reg-next" data-reg-jump="${next}">
             <span class="reg-next-label">${REGULATION[next].act}</span>
             <span class="reg-next-name">${REGULATION[next].label}</span>
             <span class="reg-next-arrow" aria-hidden="true">&rarr;</span>
           </button>
         </div>`
      : `<p class="reg-close">${P.close}</p>`;

    document.getElementById('regBody').innerHTML = rail + `
      <section class="reg-act" id="regAct-${k}" tabindex="-1" aria-labelledby="regActH-${k}">
        <div class="reg-act-head">
          <span class="reg-act-n">${d.act}</span>
          <h3 class="reg-act-title" id="regActH-${k}">${d.question}</h3>
          <p class="reg-act-stand">${d.standfirst}</p>
        </div>
        <figure class="reg-frame">
          <blockquote class="reg-frame-quote">&ldquo;${d.frame.quote}&rdquo;</blockquote>
          <figcaption class="reg-frame-attrib">${d.frame.attrib}</figcaption>
        </figure>
        ${regActBody(k, d)}
        <p class="reg-source">Built on <a href="${d.source.url}" target="_blank" rel="noopener noreferrer">${d.source.label}</a></p>
      </section>` + foot;
    _regBuilt[k] = true;
    regObserveFigures();
  }

  /* Each act is its own view. activeRegulation drives both which act renders
     and which nav tab reads as current (activeTabIdFor in 70-render.js).

     The router runs `enter` BEFORE setView, so at setRegulation() time
     activeView may not be 'regulation' yet and #regulationArea is not on
     screen; in that case just set the state and let render() build. */
  function setRegulation(which) {
    activeRegulation = REGULATION[which] && REGULATION[which].act ? which : 'tech';
    if (activeView !== 'regulation') return;
    buildRegulation();
    // Switching act is a page change, so start at the top of it rather than
    // wherever the previous act had been scrolled to.
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  // One delegated listener for every hit target, the rail, and the close
  // buttons. SVG <g> does not fire click on Enter the way <button> does, so
  // keydown is handled alongside.
  function regActivate(t) {
    const jump = t.closest('[data-reg-jump]');
    if (jump) {
      setRegulation(jump.dataset.regJump);
      // setView syncs the top nav tab, the panel label, the announcement and
      // the hash for the act we just switched to.
      if (typeof setView === 'function') setView('regulation');
      return true;
    }
    const close = t.closest('[data-reg-close]');
    if (close) { regCloseDetail(close.dataset.regClose); return true; }
    const hit = t.closest('.reg-hit');
    if (hit) { regSelect(hit.dataset.act, hit.dataset.detail); return true; }
    return false;
  }
  document.addEventListener('click', e => { regActivate(e.target); });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const hit = e.target.closest && e.target.closest('.reg-hit');
    if (!hit) return;
    e.preventDefault();
    regSelect(hit.dataset.act, hit.dataset.detail);
  });
