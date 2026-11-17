  /* ── R1/R2: export, citation & deep-link helpers ─────────────── */

  // Copy text to the clipboard with a brief "Copied ✓" flash on the trigger button.
  function copyText(text, btn) {
    const done = () => {
      if (!btn) return;
      if (!btn.dataset.origLabel) btn.dataset.origLabel = btn.textContent;
      btn.textContent = 'Copied ✓';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = btn.dataset.origLabel; btn.classList.remove('copied'); }, 1600);
    };
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { /* clipboard unavailable */ }
      ta.remove();
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }

  // Absolute URL for an in-app route, e.g. appURL('policy/ubi').
  function appURL(route) {
    return location.origin + location.pathname + '#' + route;
  }

  // Convert prose carrying {{cite}}/{{citep}}/{{pol}} tokens and light HTML to plain text.
  function tokensToPlain(s, paperMap) {
    if (!s) return '';
    return String(s)
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/ ?\{\{(citep?):([\w-]+)\}\}/g, (m, kind, id) => {
        const p = paperMap[id];
        if (!p) return '';
        const year = p.date ? p.date.slice(0, 4) : 'n.d.';
        if (kind === 'citep') {
          const ap = (p.source || '').split(' — ')[0].trim();
          const author = ap.includes(',') ? ap.split(',')[0].trim() + ' et al.' : ap;
          return ` (${author}, ${year})`;
        }
        return ` (${year})`;
      })
      .replace(/\{\{pol:[a-z0-9-]+\|([^}]+)\}\}/g, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&rsquo;/g, '’').replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”').replace(/&quot;/g, '"')
      .trim();
  }

  // Plain-text APA (for the clipboard): strips <em> markup and appends the source URL.
  function formatAPAPlain(p) {
    const apa = formatAPACitation(p).replace(/<\/?em>/g, '');
    return p.sourceUrl ? `${apa} ${p.sourceUrl}` : apa;
  }

  // The policy area a card sits under on the Map: its category's merged row, one of the four MERGED_POLICY_CATEGORIES
  // (Economic Security, Labor & Worker Rights, AI Governance, Mitigating Harms). The dialog header and "Copy as draft"
  // both name it and both ask here, so neither can disagree with the Map. Null when the category maps to no row
  // (validateData reports that).
  function policyAreaOf(p) {
    const id = CATEGORY_MERGE_MAP[p.category];
    return (id && MERGED_POLICY_CATEGORIES[id]) ? { id, label: MERGED_POLICY_CATEGORIES[id] } : null;
  }

  // R1: assemble a policy card as a Markdown primer draft, with inline citations
  // resolved to (Year) or (Author, Year) text. There is no References list (removed
  // 2026-11-17): a card's sources are the links and citations in its own text.
  function policyToMarkdown(p) {
    const paperMap = Object.fromEntries([...RESEARCH_DATA, ...POLICY_SOURCES].map(r => [r.id, r]));
    const plain = s => tokensToPlain(s, paperMap);
    const fmtD = s => { if (!s) return ''; const d = new Date(s + 'T00:00:00'); return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }); };
    const md = [];
    const area = policyAreaOf(p);
    md.push(`# ${p.title}`);
    md.push('');
    // The Map's area, not the phase and fine category the draft used to open with (dropped 2026-11-17, with the same two
    // labels under the dialog's title).
    if (area) md.push(`**Area:** ${area.label}`, '');
    md.push(`*Draft prepared from AI Tracker: Research and Policy (${appURL('policy/' + p.id)})${p.lastReviewed ? `. Last reviewed ${fmtD(p.lastReviewed)}` : ''}.*`);
    const section = (label, body) => { if (body) { md.push('', `## ${label}`, '', plain(body)); } };
    const listSection = (label, arr) => {
      if (Array.isArray(arr) && arr.length) {
        md.push('', `## ${label}`, '');
        arr.forEach(item => md.push(`- ${plain(item)}`));
      }
    };
    section('What it is', p.summary);
    section('The challenge', p.rationale);
    listSection('Strengths', p.strengths);
    listSection('Risks', p.risks);
    section('Precedents & landscape', p.landscape);
    md.push('');
    return md.join('\n');
  }

  // Hoisted out of buildPolicyView() so renderPolicyLinksGraph() (the Links
  // sub-view) can share the exact same category→color mapping as the Map
  // sub-view — a policy should be the same color in both views.
  // Policy category identity colors. Every value is an ESP token or a
  // documented light/dark sibling of one (see :root) — no invented hues.
  const POL_CAT_COLORS = {
    'safety-net':    '#2C3254',  // Warm Navy
    'labor-rights':  '#70AD8F',  // Soft Green
    'tax-wealth':    '#472B51',  // Deep Purple
    'healthcare':    '#C99A3F',  // Warm Gold, darkened
    'work-structure':'#5A6285',  // Warm Navy, lightened
    'education':     '#4A8A70',  // Soft Green, darkened
    'antitrust':     '#7A5C85',  // Deep Purple, lightened
    'housing':       '#B8863B',  // Warm Gold, darkened further (8-9px marks)
    'jobs':          '#3C4164',  // Text Black
    'international': '#C4806A',  // Warm Pink, darkened (8-9px marks)
    'civil-rights':  '#A8623F',  // Warm Pink, darkened further — reads as caution
  };
  // Merged-category identity colors, also shared with the Links band legend.
  // Keys track MERGED_POLICY_CATEGORIES in tracker-data.js; a key that falls
  // out of sync degrades to var(--muted) grey rather than throwing, so it is
  // easy to miss. Gold is reserved for Mitigating Harms because that row
  // needs to read as a caution color next to the three structural ones.
  const CAT_COLOR_VARS = {
    'economic-security':   'var(--green)',   // Soft Green
    'labor-worker-rights': 'var(--navy)',    // Warm Navy
    'ai-governance':       'var(--purple)',  // Deep Purple
    'mitigating-harms':    'var(--gold)',    // Warm Gold
  };

  function buildPolicyView() {
    const area = document.getElementById('policyArea');

    // Policy cards temporarily hidden (see policyCardsHidden in 00-state.js).
    // Show a short notice instead of the Map/Links content; flip the flag to
    // restore. Placed at the single render entry so both sub-views are covered.
    if (policyCardsHidden) {
      if (area) area.innerHTML = '<p class="pol-hidden-note" style="padding:2.5rem 0;opacity:.75;">The policy cards are being updated and are temporarily unavailable.</p>';
      return;
    }

    // First visit: build the DOM. No intro bar: the masthead is
    // .header-tab-desc, fed from TAB_DESCS.policy.
    if (!area.hasChildNodes()) {

      // Map / Links sub-view toggle
      const subToggle = document.createElement('div');
      subToggle.className = 'pol-subview-toggle';
      subToggle.setAttribute('role', 'group');
      subToggle.setAttribute('aria-label', 'Policy Map display');
      subToggle.innerHTML = `
        <button class="pol-subview-btn active" id="polSubviewMap" type="button">Map</button>
        <button class="pol-subview-btn" id="polSubviewLinks" type="button">Links</button>`;
      area.appendChild(subToggle);

      const levelMap = Object.fromEntries(DISRUPTION_LEVELS.map(l => [l.id, l]));

      // Empty state msg
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'pol-empty-msg';
      emptyMsg.id = 'polEmptyMsg';
      emptyMsg.textContent = 'No policies match the current filters.';
      area.appendChild(emptyMsg);

      // Short descriptions per policy category
      const POL_CAT_DESCS = {
        'safety-net':    'Income floors and social insurance programs',
        'labor-rights':  'Worker protections and employment standards',
        'tax-wealth':    'Redistribution through progressive taxation',
        'healthcare':    'Health coverage decoupled from employment',
        'work-structure':'Flexible work arrangements and job design',
        'education':     'Skills training and lifelong learning systems',
        'antitrust':     'Market competition and platform regulation',
        'housing':       'Affordable housing and place-based support',
        'jobs':          'Direct job creation and sectoral investment',
        'international': 'Cross-border coordination and trade policy',
        'civil-rights':  'Discrimination testing and algorithmic accountability',
      };


      const columns = document.createElement('div');
      columns.className = 'pol-columns';

      Object.entries(POLICY_CATEGORIES).forEach(([catId, catLabel]) => {
        const policies = POLICY_DATA.filter(p => p.category === catId);
        if (!policies.length) return;

        const col = document.createElement('div');
        col.className = 'pol-col';
        col.dataset.cat = catId;
        const catColor = POL_CAT_COLORS[catId] || '#6d7091';
        col.style.setProperty('--pol-cat-color', catColor);

        // Header — with level distribution bar
        const desc = POL_CAT_DESCS[catId] || '';
        const distSegs = DISRUPTION_LEVELS.map(l => {
          const count = policies.filter(p => p.level === l.id).length;
          if (!count) return '';
          const pct = (count / policies.length * 100).toFixed(1);
          return `<span class="pol-col-distbar-seg" style="background:${l.color};width:${pct}%" title="${l.label}: ${count}"></span>`;
        }).join('');
        col.innerHTML = `
          <div class="pol-col-header">
            <div class="pol-col-title">${catLabel}</div>
            <div class="pol-col-desc">${desc}</div>
            <span class="pol-col-count">${policies.length} polic${policies.length===1?'y':'ies'}</span>
            <div class="pol-col-distbar">${distSegs}</div>
          </div>
          <div class="pol-item-list"></div>`;

        const itemList = col.querySelector('.pol-item-list');

        policies.forEach(p => {
          const lvl = levelMap[p.level] || {};

          const wrap = document.createElement('div');
          wrap.className = 'pol-item-wrap';
          wrap.dataset.level = p.level;
          wrap.dataset.id = p.id;
          if (lvl.color) wrap.style.setProperty('--level-color', lvl.color);

          wrap.innerHTML = `
            <div class="pol-item">
              <div class="pol-item-title">${p.title}</div>
              <span class="pol-item-badge">${lvl.label || p.level}</span>
            </div>`;

          wrap.querySelector('.pol-item').addEventListener('click', () => {
            openPolModal(p);
          });
          itemList.appendChild(wrap);
        });

        columns.appendChild(col);
      });
      area.appendChild(columns);

      // ── Category rows ────────────────────────────────────────
      // Phase (Repair→Transform) is no longer an axis of the map: the four
      // merged categories each get a full-width row, in curated order —
      // Becky's brief order, Economic Security first and Mitigating Harms
      // last (MERGED_POLICY_CATEGORIES key order, not sorted here).
      // A merged category with no policies is skipped rather than drawn
      // empty, which is what currently keeps the thin Mitigating Harms row
      // honest as cards get written for it.
      // Policies within a row are listed alphabetically and flow left→right,
      // so scrolling down reads category by category. Each category carries
      // its own ESP-palette color (contrast-tuned across the set). Color
      // rides the header rule and each card's left stripe; label text stays
      // dark (--headline) for ADA contrast on the light background.
      // (CAT_COLOR_VARS is now hoisted above buildPolicyView(), shared with Links.)

      // Reverse lookup: mergedCatId → array of original catIds
      const mergedToOriginal = {};
      Object.keys(MERGED_POLICY_CATEGORIES).forEach(mc => { mergedToOriginal[mc] = []; });
      Object.entries(CATEGORY_MERGE_MAP).forEach(([orig, merged]) => {
        mergedToOriginal[merged].push(orig);
      });

      const catRows = document.createElement('div');
      catRows.className = 'pol-cat-rows';
      catRows.id = 'polCatRows';

      Object.entries(MERGED_POLICY_CATEGORIES).forEach(([mcId, mcLabel]) => {
        const origCats = mergedToOriginal[mcId] || [];
        // Alphabetical by title within the category.
        const catPolicies = POLICY_DATA
          .filter(p => origCats.includes(p.category))
          .sort((a, b) => a.title.localeCompare(b.title));
        if (!catPolicies.length) return;

        const row = document.createElement('div');
        row.className = 'pol-cat-row';
        row.dataset.cat = mcId;
        row.style.setProperty('--cat-color', CAT_COLOR_VARS[mcId] || 'var(--muted)');

        const head = document.createElement('div');
        head.className = 'pol-cat-row-head';
        head.innerHTML = `
          <div class="pol-cat-row-title">${mcLabel}</div>
          <div class="pol-cat-row-desc">${MERGED_CAT_DESCS[mcId] || ''}</div>
          <div class="pol-cat-row-count">${catPolicies.length} polic${catPolicies.length===1?'y':'ies'}</div>`;
        row.appendChild(head);

        const cards = document.createElement('div');
        cards.className = 'pol-cat-row-cards';

        catPolicies.forEach(p => {
          const card = document.createElement('div');
          card.className = 'pol-cat-card';
          card.innerHTML = `<div class="pol-cat-card-title">${p.title}</div><span class="ui-chevron sm right pol-cat-card-arrow" aria-hidden="true"></span>`;
          card.addEventListener('click', () => openPolModal(p));
          cards.appendChild(card);
        });

        row.appendChild(cards);
        catRows.appendChild(row);
      });

      area.appendChild(catRows);

      // Links sub-view — built lazily on first activation (see below).
      const linksArea = document.createElement('div');
      linksArea.className = 'pol-links-wrap';
      linksArea.id = 'polLinksArea';
      linksArea.style.display = 'none';
      area.appendChild(linksArea);

      // Map / Links toggle wiring.
      const mapBtn = document.getElementById('polSubviewMap');
      const linksBtn = document.getElementById('polSubviewLinks');
      mapBtn.addEventListener('click', () => {
        if (mapBtn.classList.contains('active')) return;
        mapBtn.classList.add('active'); linksBtn.classList.remove('active');
        catRows.style.display = ''; linksArea.style.display = 'none';
      });
      linksBtn.addEventListener('click', () => {
        if (linksBtn.classList.contains('active')) return;
        linksBtn.classList.add('active'); mapBtn.classList.remove('active');
        catRows.style.display = 'none'; linksArea.style.display = '';
        if (!linksArea.dataset.built) {
          linksArea.dataset.built = '1';
          renderPolicyLinksGraph(linksArea);
        }
      });

    }
  }

  // ── Policy Links graph (test run) ───────────────────────────────────
  // Hand-rolled SVG force simulation, no external library — see
  // docs/adr/0002-policy-links-hand-rolled-svg.md. Edges are derived from
  // each policy's existing `pairsWith` field at render time; no new
  // connections data was authored for this pass — see
  // docs/adr/0001-policy-links-reuse-pairswith.md. Nodes softly gravitate
  // toward their merged category's vertical band (Economic Security top,
  // Mitigating Harms bottom — the curated order MERGED_POLICY_CATEGORIES is
  // already defined in), but the repel/spring physics can nudge a node off that
  // line, which is deliberate: it lets cross-category edges read as a
  // short, clear line rather than a rigid line punching across the canvas.
  function renderPolicyLinksGraph(container) {
    const W = 1040, H = 960;
    const mergedOrder = Object.keys(MERGED_POLICY_CATEGORIES); // curated top→bottom order
    const bandH = H / mergedOrder.length;

    // A node's label is HTML in a foreignObject, in the graph's own units. LABEL_FS is the font size .pol-links-node-label sets (13px, the notes size on the
    // other tabs); LABEL_W is how wide a label may get before it wraps. Both only size the boxes the layout keeps apart: the browser does the real wrapping.
    const LABEL_FS = 13, LABEL_W = 150, LABEL_LH = 1.28;
    // How tall a title's label is: its lines, estimated word by word (Public Sans averages about 0.57em a character), kept a little generous.
    const labelHeight = title => {
      const em = LABEL_FS * 0.57; let lines = 1, w = 0;
      title.split(/\s+/).forEach(word => {
        const ww = word.length * em;
        if (w && w + em + ww > LABEL_W) { lines++; w = ww; } else w += (w ? em : 0) + ww;
      });
      return Math.max(20, lines * LABEL_FS * LABEL_LH + 2);
    };

    // ── Build nodes, seeded with a golden-angle spread so the pre-settle
    // starting layout is already roughly non-overlapping. ──
    const nodes = POLICY_DATA.map((p, i) => {
      const mergedCat = CATEGORY_MERGE_MAP[p.category] || mergedOrder[mergedOrder.length - 1];
      const bandIdx = Math.max(0, mergedOrder.indexOf(mergedCat));
      const bandCenter = bandIdx * bandH + bandH / 2;
      const seed = (i * 137.5) % 360;
      const x = W / 2 + Math.cos(seed * Math.PI / 180) * (W / 2 - 100);
      const y = bandCenter + Math.sin(seed * Math.PI / 180) * (bandH / 2 - 30);
      return { id: p.id, title: p.title, category: p.category, mergedCat, bandCenter, x, y, vx: 0, vy: 0, h: labelHeight(p.title) };
    });
    const nodeById = Object.fromEntries(nodes.map(n => [n.id, n]));

    // Edges = each policy's `pairsWith`, de-duplicating mutual A↔B pairs
    // (most are authored on both sides) into a single edge.
    const edgeMap = new Map();
    POLICY_DATA.forEach(p => {
      (p.pairsWith || []).forEach(l => {
        if (!nodeById[l.id]) return; // guard against a stale id
        const key = [p.id, l.id].sort().join('|');
        if (!edgeMap.has(key)) edgeMap.set(key, { a: p.id, b: l.id, whys: [] });
        if (l.why) edgeMap.get(key).whys.push(l.why);
      });
    });
    const edges = [...edgeMap.values()];

    // ── Physics: repel + spring + soft per-band gravity, cooled over a
    // fixed number of ticks and settled before first paint. ──
    const REPEL = 4200, SPRING_LEN = 105, SPRING_K = 0.02, GRAVITY_K = 0.03, CENTER_K = 0.0015, DAMP = 0.82;
    let alpha = 1;
    function tick() {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          let dx = a.x - b.x, dy = a.y - b.y;
          const distSq = dx * dx + dy * dy || 0.01;
          const force = (REPEL * alpha) / distSq;
          const dist = Math.sqrt(distSq);
          dx /= dist; dy /= dist;
          a.vx += dx * force; a.vy += dy * force;
          b.vx -= dx * force; b.vy -= dy * force;
        }
      }
      edges.forEach(e => {
        const a = nodeById[e.a], b = nodeById[e.b];
        let dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const force = SPRING_K * (dist - SPRING_LEN) * alpha;
        dx /= dist; dy /= dist;
        a.vx += dx * force; a.vy += dy * force;
        b.vx -= dx * force; b.vy -= dy * force;
      });
      nodes.forEach(n => {
        n.vy += (n.bandCenter - n.y) * GRAVITY_K * alpha;
        n.vx += (W / 2 - n.x) * CENTER_K * alpha;
      });
      nodes.forEach(n => {
        n.vx *= DAMP; n.vy *= DAMP;
        n.x += n.vx; n.y += n.vy;
        n.x = Math.max(24, Math.min(W - 190, n.x));
        n.y = Math.max(16, Math.min(H - 16, n.y));
      });
      alpha *= 0.985;
    }
    for (let i = 0; i < 400 && alpha > 0.01; i++) tick();

    // The physics treats a node as a point, but each one carries a label to its right, so labels sat on top of each other. Once it has settled, push any
    // two nodes whose dot-and-label boxes touch apart along the shorter way out, a pass at a time, with a light pull back toward the node's band, until
    // none touch. The band names at the top left of each band are boxes that do not move. Deterministic, like the rest of the layout.
    const boxOf = n => ({ l: n.x - 10, r: n.x + 11 + LABEL_W, t: n.y - 10, b: n.y - 10 + n.h });
    const bandNames = mergedOrder.map((mcId, i) => ({ l: 8, r: 20 + MERGED_POLICY_CATEGORIES[mcId].length * 9, t: i * bandH + 4, b: i * bandH + 26 }));
    for (let pass = 0; pass < 240; pass++) {
      let touching = 0;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j], A = boxOf(a), B = boxOf(b);
          const ox = Math.min(A.r, B.r) - Math.max(A.l, B.l) + 6, oy = Math.min(A.b, B.b) - Math.max(A.t, B.t) + 4;
          if (ox <= 0 || oy <= 0) continue;
          touching++;
          if (oy <= ox) { const d = (oy / 2) * (a.y <= b.y ? -1 : 1); a.y += d; b.y -= d; }
          else { const d = (ox / 2) * (a.x <= b.x ? -1 : 1); a.x += d; b.x -= d; }
        }
      }
      nodes.forEach(n => {
        n.y += (n.bandCenter - n.y) * 0.01;
        bandNames.forEach(L => { const B = boxOf(n); if (B.r > L.l && B.l < L.r && B.b > L.t && B.t < L.b) n.y += L.b - B.t + 2; });
        n.x = Math.max(24, Math.min(W - 190, n.x));
        n.y = Math.max(16, Math.min(H - 6 - n.h, n.y));
      });
      if (!touching) break;
    }

    // ── Render as SVG (real DOM nodes — see ADR 0002 for why not canvas) ──
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('class', 'pol-links-svg');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Force-directed graph of policies connected by amplification links, ordered top to bottom from Economic Security to Global');

    mergedOrder.forEach((mcId, i) => {
      const y = i * bandH;
      if (i > 0) {
        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', 0); line.setAttribute('x2', W);
        line.setAttribute('y1', y); line.setAttribute('y2', y);
        line.setAttribute('stroke', 'var(--border)');
        line.setAttribute('stroke-dasharray', '3 5');
        svg.appendChild(line);
      }
      const label = document.createElementNS(svgNS, 'text');
      label.setAttribute('x', 14); label.setAttribute('y', y + 18);
      label.setAttribute('class', 'pol-links-band-label');
      label.textContent = MERGED_POLICY_CATEGORIES[mcId];
      svg.appendChild(label);
    });

    const edgeGroup = document.createElementNS(svgNS, 'g');
    const edgeEls = edges.map(e => {
      const a = nodeById[e.a], b = nodeById[e.b];
      const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('class', 'pol-links-edge');
      line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
      line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
      const title = document.createElementNS(svgNS, 'title');
      title.textContent = e.whys.join(' ');
      line.appendChild(title);
      edgeGroup.appendChild(line);
      return { el: line, a: e.a, b: e.b };
    });
    svg.appendChild(edgeGroup);

    const nodeGroup = document.createElementNS(svgNS, 'g');
    const nodeEls = {};
    nodes.forEach(n => {
      const g = document.createElementNS(svgNS, 'g');
      g.setAttribute('class', 'pol-links-node');
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', `${n.title}. Open this policy.`);

      const dot = document.createElementNS(svgNS, 'circle');
      dot.setAttribute('class', 'pol-links-node-dot');
      dot.setAttribute('cx', n.x); dot.setAttribute('cy', n.y); dot.setAttribute('r', 8);
      dot.setAttribute('fill', POL_CAT_COLORS[n.category] || 'var(--muted)');

      // foreignObject + div (not SVG <text>) so long titles wrap onto
      // multiple lines instead of running off as one unbroken string.
      const labelFo = document.createElementNS(svgNS, 'foreignObject');
      labelFo.setAttribute('class', 'pol-links-node-label-fo');
      labelFo.setAttribute('x', n.x + 11); labelFo.setAttribute('y', n.y - 10);
      labelFo.setAttribute('width', LABEL_W); labelFo.setAttribute('height', n.h);
      const labelDiv = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
      labelDiv.setAttribute('class', 'pol-links-node-label');
      labelDiv.textContent = n.title;
      labelFo.appendChild(labelDiv);

      // Larger invisible hit target — the 8px dot alone is too small to click/tap reliably.
      const hit = document.createElementNS(svgNS, 'circle');
      hit.setAttribute('class', 'pol-links-node-hit');
      hit.setAttribute('cx', n.x); hit.setAttribute('cy', n.y); hit.setAttribute('r', 14);

      g.appendChild(hit); g.appendChild(dot); g.appendChild(labelFo);
      nodeGroup.appendChild(g);
      nodeEls[n.id] = g;

      const openIt = () => openPolModalById(n.id);
      g.addEventListener('click', openIt);
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openIt(); } });

      const highlight = on => {
        Object.values(nodeEls).forEach(el => el.classList.remove('lit', 'dimmed'));
        edgeEls.forEach(e => e.el.classList.remove('lit', 'dimmed'));
        if (!on) return;
        const connected = new Set([n.id]);
        edgeEls.forEach(e => {
          const touches = e.a === n.id || e.b === n.id;
          e.el.classList.add(touches ? 'lit' : 'dimmed');
          if (touches) { connected.add(e.a); connected.add(e.b); }
        });
        Object.entries(nodeEls).forEach(([id, el]) => el.classList.add(connected.has(id) ? 'lit' : 'dimmed'));
      };
      g.addEventListener('mouseenter', () => highlight(true));
      g.addEventListener('mouseleave', () => highlight(false));
      g.addEventListener('focus', () => highlight(true));
      g.addEventListener('blur', () => highlight(false));
    });
    svg.appendChild(nodeGroup);

    const outer = document.createElement('div');
    outer.className = 'pol-links-graph-outer';
    outer.appendChild(svg);

    const legend = document.createElement('div');
    legend.className = 'pol-links-legend';
    // Only legend categories that actually have a node on the graph. Base
    // categories are allowed to sit empty while cards are being written for
    // them (antitrust does today), and an unfilterable legend dot pointing at
    // nothing reads as a rendering bug.
    legend.innerHTML = Object.entries(POLICY_CATEGORIES)
      .filter(([catId]) => POLICY_DATA.some(p => p.category === catId))
      .map(([catId, catLabel]) =>
      `<span class="pol-links-legend-item"><span class="pol-links-legend-dot" style="background:${POL_CAT_COLORS[catId]}"></span>${catLabel}</span>`
    ).join('');
    outer.appendChild(legend);

    container.innerHTML = '';
    container.appendChild(outer);
  }

  function openPolModal(p) {
    const backdrop = document.getElementById('polModal');
    const modal    = backdrop.querySelector('.pol-modal');
    const paperMap = Object.fromEntries([...RESEARCH_DATA, ...POLICY_SOURCES].map(r => [r.id, r]));
    // Preserve the original trigger when navigating policy → policy via cross-links.
    if (!backdrop.classList.contains('open')) backdrop._lastFocus = document.activeElement;
    document.getElementById('polModalTitle').textContent = p.title;
    // Under the title: the policy area the Map files the card under, led by that row's colour as a dot. The card's level
    // and fine category are not shown (dropped 2026-11-17: the area is what the Map is organized by). Rebuilt on every
    // open because a cross-link swaps one policy for another without closing the dialog.
    const area = policyAreaOf(p), areaEl = document.getElementById('polModalArea');
    areaEl.textContent = '';
    if (area) {
      const dot = document.createElement('span');
      dot.className = 'pol-modal-area-dot';
      dot.setAttribute('aria-hidden', 'true');
      dot.style.setProperty('--cat-color', CAT_COLOR_VARS[area.id] || 'var(--muted)');
      areaEl.appendChild(dot);
      areaEl.appendChild(document.createTextNode(area.label));
    }
    const li = (arr) => (arr || []).map(item => `<li>${injectPolicyLinks(item, paperMap)}</li>`).join('');
    const fmtDate = s => {
      if (!s) return '';
      const d = new Date(s + 'T00:00:00');
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    };
    const hasPros = Array.isArray(p.strengths) && p.strengths.length;
    const hasCons = Array.isArray(p.risks) && p.risks.length;
    const prosConsHTML = (hasPros || hasCons) ? `
      <div class="pol-modal-twocol">
        ${hasPros ? `<div>
          <div class="pol-modal-label">Strengths</div>
          <ul class="pol-modal-list">${li(p.strengths)}</ul>
        </div>` : '<div></div>'}
        ${hasCons ? `<div>
          <div class="pol-modal-label">Risks</div>
          <ul class="pol-modal-list">${li(p.risks)}</ul>
        </div>` : '<div></div>'}
      </div>` : '';
    // Where it stands and Precedents and examples were merged into one
    // section (single `landscape` field) so the modal doesn't split
    // precedent and current politics across two labels that readers had to
    // cross-reference themselves. The "Research basis" list that used to hang
    // off this section (the card's paperIds, plus related studies by category)
    // was removed on 2026-11-17 as no longer relevant: a card's sources are the
    // links in its own text. A "How it interacts" section (the card's pairsWith and
    // competesWith as lists of cross-links, with their why text) sat between
    // Strengths/Risks and this one until the same day; the two fields stay in the
    // data, because pairsWith draws the Links graph's lines.
    const landscapeHTML = p.landscape ? `
      <div class="pol-modal-section">
        <div class="pol-modal-label">Precedents & landscape</div>
        <div class="pol-modal-text">${injectPolicyLinks(p.landscape, paperMap)}</div>
      </div>` : '';
    const lastReviewedHTML = p.lastReviewed ? `<div class="pol-modal-lastreviewed">Last reviewed: ${fmtDate(p.lastReviewed)}</div>` : '';
    document.getElementById('polModalBody').innerHTML = `
      <div class="pol-modal-section">
        <div class="pol-modal-label">What it is</div>
        <div class="pol-modal-text">${injectPolicyLinks(p.summary, paperMap)}</div>
      </div>
      <div class="pol-modal-section">
        <div class="pol-modal-label">The challenge</div>
        <div class="pol-modal-text">${injectPolicyLinks(p.rationale, paperMap)}</div>
      </div>
      ${prosConsHTML}
      ${landscapeHTML}
      ${lastReviewedHTML}`;
    // Wire policy cross-reference links to open their target policy's modal.
    document.getElementById('polModalBody').querySelectorAll('.pol-xref').forEach(a => {
      const go = e => { e.stopPropagation(); openPolModalById(a.dataset.polId); };
      a.addEventListener('click', go);
      a.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(e); } });
    });
    // R1/R2: export & share actions for this policy
    const actions = document.getElementById('polModalActions');
    if (actions) {
      actions.innerHTML = `
        <button class="pol-action-btn" id="polCopyDraft" title="Copy this policy as a Markdown primer draft">Copy as draft</button>
        <button class="pol-action-btn" id="polCopyLink" title="Copy a shareable link to this policy">Copy link</button>
        <button class="pol-action-btn" id="polPrint" title="Print or save as a PDF">Print</button>`;
      document.getElementById('polCopyDraft').addEventListener('click', e => copyText(policyToMarkdown(p), e.currentTarget));
      document.getElementById('polCopyLink').addEventListener('click', e => copyText(appURL('policy/' + p.id), e.currentTarget));
      document.getElementById('polPrint').addEventListener('click', () => window.print());
    }
    backdrop.classList.add('open');
    document.body.classList.add('pol-modal-open');
    document.body.style.overflow = 'hidden';
    setHash('policy/' + p.id);
    requestAnimationFrame(() => { const cb = document.getElementById('polModalClose'); if (cb) cb.focus(); });
  }

  // Close policy modal
  (function() {
    const backdrop = document.getElementById('polModal');
    document.getElementById('polModalClose').addEventListener('click', closePolModal);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closePolModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && backdrop.classList.contains('open')) closePolModal(); });
    function closePolModal() {
      backdrop.classList.remove('open');
      document.body.classList.remove('pol-modal-open');
      document.body.style.overflow = '';
      setHash(currentRoute());
      if (backdrop._lastFocus) { backdrop._lastFocus.focus(); backdrop._lastFocus = null; }
    }
  })();

