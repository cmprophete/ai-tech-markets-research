  /* ── REGULATION ──────────────────────────────────────────────────────────
     Three pages behind one view: The Tech, Workers, Cash. Routes are
     #regulate-tech / #regulate-workers / #regulate-cash, all landing on
     setView('regulation') and differing only in activeRegulation, the same
     shape as Case Studies and as #research/#changelog.

     Each page opens on one argument and one drawing. The drawings are
     authored here rather than in the view markup because their geometry is
     computed from the data (how many firms sit at a layer, how many kinds
     hang off a branch), so hand-written SVG would go stale the moment the
     content file changed.

     Prose comes from REGULATION in data/regulation-data.js and is authored,
     so it is written with innerHTML the way THEMES and CASE_STUDIES are.

     COLOR. This tab's accent is --purple-light on the navy band and --purple
     (true Deep Purple) for marks on beige. See the note in tokens.css: Deep
     Purple scores 1.02:1 on navy and cannot be the band accent, so the band
     gets a lightened sibling at the same hue. Do not swap one for the other.
     All drawings use currentColor or the tokens, never a literal hex, so the
     palette stays in one place. */

  let _regBuilt = {};

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

  /* ── 1. THE TECH: the stack, and who recurs up it ─────────────────── */
  function regTechStackSVG(d) {
    const BAND_H = 70, GAP = 14, TOP = 34;
    const LABEL_W = 148, PILL_X = 160, PILL_MAX = 596;
    // Data is authored bottom-to-top (chips first); the drawing reads
    // top-to-top-down like a stack diagram, so render it reversed.
    const layers = d.stack.slice().reverse();
    const H = TOP + layers.length * BAND_H + (layers.length - 1) * GAP + 10;

    const bands = layers.map((layer, i) => {
      const y = TOP + i * (BAND_H + GAP);
      // Flow the firm pills, wrapping to a second row when the first fills.
      let cx = PILL_X, row = 0;
      const pills = layer.firms.map(f => {
        const w = Math.round(regTextW(f.name, 11.5)) + 24;
        if (cx + w > PILL_MAX && row === 0) { row = 1; cx = PILL_X; }
        const px = cx; cx += w + 8;
        const py = y + (row === 0 ? 20 : 20 + 28);
        const cls = 'reg-pill' + (f.integrated ? ' reg-pill--int' : '') + (f.wide ? ' reg-pill--wide' : '');
        return `<g class="${cls}">
            <rect x="${px}" y="${py}" width="${w}" height="24" rx="5"/>
            <text x="${px + w / 2}" y="${py + 16}" text-anchor="middle">${f.name}</text>
          </g>`;
      }).join('');
      return `<g class="reg-band">
          <rect class="reg-band-bg" x="0" y="${y}" width="${PILL_MAX + 10}" height="${BAND_H}" rx="7"/>
          <text class="reg-band-name" x="14" y="${y + 27}">${layer.name}</text>
          ${regWrap(layer.note, 22).map((l, k) =>
            `<text class="reg-band-note" x="14" y="${y + 45 + k * 13}">${l}</text>`).join('')}
          ${pills}
        </g>`;
    }).join('');

    /* The integration gutter. One track per parent that appears at more than
       one layer, with a filled dot where it is present and a hollow one where
       it is not. This is the argument the drawing exists to make, so it gets
       its own column rather than a tangle of connector lines through the
       pills. */
    const INT = [
      { key: 'google', name: 'Google' },
      { key: 'amazon', name: 'Amazon' },
      { key: 'microsoft', name: 'Microsoft' }
    ];
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
      return `<g class="reg-track">
          <line class="reg-track-line" x1="${x}" y1="${y0}" x2="${x}" y2="${y1}"/>
          ${dots}
          <text class="reg-track-name" x="${x}" y="${TOP - 12}" text-anchor="middle">${p.name}</text>
        </g>`;
    }).join('');

    return `<svg class="reg-svg reg-svg--stack" viewBox="0 0 820 ${H}" role="img"
         aria-label="The AI stack in four layers from applications down to chips, with Google, Amazon and Microsoft present at nearly every layer.">
        <text class="reg-gutter-label" x="700" y="${TOP - 26}" text-anchor="middle">Present at every layer</text>
        ${bands}${tracks}
      </svg>`;
  }

  function regTechHTML(d) {
    const col = (c, tone) => `
      <div class="reg-vs-col reg-vs-col--${tone}">
        <div class="reg-vs-label">${c.label}</div>
        <ul class="reg-vs-list">${c.points.map(p => `<li>${p}</li>`).join('')}</ul>
      </div>`;
    return `
      ${regFrameHTML(d)}
      <section class="reg-section">
        <h3 class="reg-h">The stack, and who owns it</h3>
        ${regTechStackSVG(d)}
        <p class="reg-takeaway">${d.stackTakeaway}</p>
      </section>
      <section class="reg-section">
        <h3 class="reg-h">${d.contrast.heading}</h3>
        <div class="reg-vs">
          ${col(d.contrast.tech, 'tech')}
          <div class="reg-vs-rule" aria-hidden="true"></div>
          ${col(d.contrast.firms, 'firms')}
        </div>
        <p class="reg-takeaway">${d.contrast.close}</p>
      </section>
      <section class="reg-section">
        <h3 class="reg-h">${d.actionsLabel}</h3>
        <div class="reg-actions">
          ${d.actions.map(a => `
            <article class="reg-action">
              <div class="reg-action-n">${a.n}</div>
              <h4 class="reg-action-title">${a.title}</h4>
              <p class="reg-action-text">${a.text}</p>
            </article>`).join('')}
        </div>
      </section>
      ${regSourceHTML(d)}`;
  }

  /* ── 2. WORKERS: the fork ─────────────────────────────────────────── */
  function regWorkersFlowSVG(d) {
    const W = 820;
    const left = d.branches.find(b => b.tone === 'against');
    const right = d.branches.find(b => b.tone === 'for');
    const KIND_H = 56, KIND_GAP = 10, BRANCH_Y = 206, KIND_Y = 262;
    const maxKinds = Math.max(left.kinds.length, right.kinds.length);
    const H = KIND_Y + maxKinds * (KIND_H + KIND_GAP) + 16;

    const branchCol = (b, cx, cw) => {
      const x = cx - cw / 2;
      const kinds = b.kinds.map((k, i) => {
        const y = KIND_Y + i * (KIND_H + KIND_GAP);
        return `<g class="reg-kind">
            <rect x="${x}" y="${y}" width="${cw}" height="${KIND_H}" rx="7"/>
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
    return `<svg class="reg-svg reg-svg--flow" viewBox="0 0 ${W} ${H}" role="img"
         aria-label="A flow diagram. A new AI capability meets one test, does it make human skills and expertise more valuable. No leads to labor-replacing technologies, yes leads to pro-worker ones. The default path runs toward labor-replacing.">
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

  function regWorkersHTML(d) {
    return `
      ${regFrameHTML(d)}
      <section class="reg-section">
        <h3 class="reg-h">One test, five kinds of technology</h3>
        ${regWorkersFlowSVG(d)}
      </section>
      <section class="reg-section reg-gravity">
        <h3 class="reg-h">${d.gravity.heading}</h3>
        <p class="reg-takeaway">${d.gravity.text}</p>
      </section>
      <section class="reg-section">
        <h3 class="reg-h">${d.leversLabel}</h3>
        <p class="reg-note">${d.leverNote}</p>
        <div class="reg-levers">
          ${d.leverGroups.map(g => `
            <article class="reg-lever">
              <h4 class="reg-lever-name">${g.name}</h4>
              <ul class="reg-lever-list">${g.items.map(i => `<li>${i}</li>`).join('')}</ul>
            </article>`).join('')}
        </div>
      </section>
      ${regSourceHTML(d)}`;
  }

  /* ── 3. CASH: one shock, two paths ────────────────────────────────── */
  function regCashDiagramSVG(d) {
    const W = 820, H = 358;
    const X0 = 40, SHOCK = 268, FORK = 344, XE = 742, BASE = 112;
    const bad = d.diagram.paths.find(p => p.tone === 'bad');
    const good = d.diagram.paths.find(p => p.tone === 'good');
    /* Three beats per path after the shared one. The y values are a shape,
       not a quantity: the diagram carries no units and must not be read as
       one. Bad labels hang below their dot and good labels sit above, so the
       two sets cannot collide even where the lines cross. */
    const XS = [FORK + 126, FORK + 258, XE];
    const badY = [196, 254, 300];
    const goodY = [138, 112, BASE - 26];
    const FORK_Y = 150;

    const path = (ys) => `M${SHOCK},${BASE} L${FORK},${FORK_Y} ` + XS.map((x, i) => `L${x},${ys[i]}`).join(' ');
    const LH = 12;
    const beats = (p, ys, bad_) => XS.map((x, i) => {
      // Above-the-point labels grow downward from their start, so lift them
      // by the extra lines or the last line lands on the path.
      const lines = regWrap(p.beats[i], 16).length;
      const dy = bad_ ? 22 : -16 - (lines - 1) * LH;
      const anchor = i === XS.length - 1 ? 'end' : 'middle';
      const tx = i === XS.length - 1 ? x - 10 : x;
      return `<g class="reg-beat reg-beat--${bad_ ? 'bad' : 'good'}">
          <circle cx="${x}" cy="${ys[i]}" r="5"/>
          <text text-anchor="${anchor}">${regTspans(p.beats[i], tx, ys[i] + dy, LH, 16)}</text>
        </g>`;
    }).join('');

    return `<svg class="reg-svg reg-svg--cash" viewBox="0 0 ${W} ${H}" role="img"
         aria-label="A line diagram. A household runs along a stable baseline until a transition, where income drops. Without cash the path steps down to lasting insecurity; with cash it dips and returns to baseline.">
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
        <g class="reg-beat reg-beat--shared">
          <circle cx="${FORK}" cy="${FORK_Y}" r="5"/>
          <text text-anchor="middle">${regTspans(d.diagram.shared, FORK,
            FORK_Y - 16 - (regWrap(d.diagram.shared, 16).length - 1) * LH, LH, 16)}</text>
        </g>

        ${beats(bad, badY, true)}
        ${beats(good, goodY, false)}
      </svg>`;
  }

  function regCashHTML(d) {
    return `
      ${regFrameHTML(d)}
      <section class="reg-section">
        <h3 class="reg-h">What a transition does, with and without cash</h3>
        ${regCashDiagramSVG(d)}
        <p class="reg-takeaway">${d.diagram.note}</p>
      </section>
      <section class="reg-section">
        <h3 class="reg-h">${d.momentsLabel}</h3>
        <ul class="reg-moments">${d.moments.map(m => `<li>${m}</li>`).join('')}</ul>
      </section>
      <section class="reg-section">
        <h3 class="reg-h">${d.scaleLabel}</h3>
        <div class="reg-scale">
          ${d.scale.map(s => `
            <div class="reg-scale-item">
              <div class="reg-scale-stat">${s.stat}</div>
              <div class="reg-scale-text">${s.text}</div>
            </div>`).join('')}
        </div>
      </section>
      <section class="reg-section">
        <h3 class="reg-h">${d.evidenceLabel}</h3>
        <p class="reg-note">${d.evidenceNote}</p>
        <div class="reg-evidence">
          ${d.evidence.map(e => `
            <article class="reg-ev${e.nullResult ? ' reg-ev--null' : ''}">
              <div class="reg-ev-stat">${e.stat}</div>
              <div class="reg-ev-text">${e.text}</div>
              <div class="reg-ev-where">${e.where}</div>
              <div class="reg-ev-design">${e.design}</div>
              ${e.caveat ? `<p class="reg-ev-caveat">${e.caveat}</p>` : ''}
            </article>`).join('')}
        </div>
      </section>
      <section class="reg-section">
        <h3 class="reg-h">${d.politicsLabel}</h3>
        <p class="reg-takeaway">${d.politics}</p>
      </section>
      ${regSourceHTML(d)}`;
  }

  // ── shared chrome ───────────────────────────────────────────────────
  function regFrameHTML(d) {
    return `<figure class="reg-frame">
        <blockquote class="reg-frame-quote">&ldquo;${d.frame.quote}&rdquo;</blockquote>
        <figcaption class="reg-frame-attrib">${d.frame.attrib}</figcaption>
      </figure>`;
  }

  function regSourceHTML(d) {
    return `<p class="reg-source">Built on
        <a href="${d.source.url}" target="_blank" rel="noopener noreferrer">${d.source.label}</a></p>`;
  }

  function buildRegulation() {
    const d = REGULATION[activeRegulation] || REGULATION.tech;
    if (!document.getElementById('regulationArea')) return;
    document.getElementById('regLede').innerHTML = d.lede;
    document.getElementById('regStandfirst').innerHTML = d.standfirst;
    const body = document.getElementById('regBody');
    if (!body) return;
    if (_regBuilt.id === d.id) return;
    body.innerHTML = d.id === 'tech' ? regTechHTML(d)
                   : d.id === 'workers' ? regWorkersHTML(d)
                   : regCashHTML(d);
    _regBuilt.id = d.id;
  }

  /* Sets the page and nothing else. activeTabIdFor() in 70-render.js owns the
     nav buttons, and setView() always runs after this. Same contract as
     setCaseStudy(); see the note there. */
  function setRegulation(which) {
    activeRegulation = REGULATION[which] ? which : 'tech';
    if (activeView === 'regulation') buildRegulation();
  }
