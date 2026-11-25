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
      // text synced from a Google Doc can hold bullet lists and real links: keep both in the draft
      .replace(/<li>/gi, '\n- ').replace(/<\/?ul>/gi, '\n')
      .replace(/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (m, href, text) => `[${text}](${href.replace(/&amp;/g, '&')})`)
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
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&rsquo;/g, '’').replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”').replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')   // last, so that a typed "&amp;lt;" stays "&lt;"
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

  // Whether the Google Sheet's policy map tab has marked the policy featured: its id is in the `featured` list of data/policy-map.js, which
  // tools/policy_map.py generates from the tab's `featured` column (2026-11-19, the owner: "whatever's labeled on the google sheet"). That list is
  // the only thing that features a policy: a card carries no flag of its own, and a file with no list, or no file, features none.
  function polIsFeatured(p) {
    return typeof POLICY_MAP !== 'undefined' && !!POLICY_MAP && Array.isArray(POLICY_MAP.featured) && POLICY_MAP.featured.indexOf(p.id) >= 0;
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
    md.push(`*Draft prepared from AI Tracker: Research and Policy (${appURL('policy/' + p.id)})${p.docUpdated ? `. Last updated ${fmtD(p.docUpdated)}` : ''}.*`);
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
    // References written in the card's Google Doc (synced text only) belong to its Precedents & Examples
    if (Array.isArray(p.references) && p.references.length) {
      md.push('', '### References', '');
      p.references.forEach(item => md.push(`- ${plain(item)}`));
    }
    md.push('');
    return md.join('\n');
  }

  // Merged-category identity colors: the Map's rows, and the dots and stripes of the Compare and Links views (polCmpAreaColor).
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
    // Show a short notice instead of the All/Links/Compare content; flip the flag to
    // restore. Placed at the single render entry so all three views are covered.
    if (policyCardsHidden) {
      if (area) area.innerHTML = '<p class="pol-hidden-note" style="padding:2.5rem 0;opacity:.75;">The policy cards are being updated and are temporarily unavailable.</p>';
      return;
    }

    // First visit: build the DOM. No intro bar: the masthead is
    // .header-tab-desc, fed from TAB_DESCS.policy.
    if (!area.hasChildNodes()) {

      // Links / Compare / All view switch, in that order since 2026-11-24 (the owner: "order the views like Links Compare All"); the Landscape still opens on All, the last of the three, and #policy is All.
      // All is the four area rows with every policy, a policy the team features carrying a "Featured" label on its tile
      // (marked in the `featured` column of the Sheet's policy map tab, which reaches the page as data/policy-map.js); Links follows the links from one policy to the next: what works well with it on the
      // left, what competes with it on the right (30-policy-links.js); Compare sets two policies side by side with a fight graphic and samples of what works well with each and what competes with it
      // (30-policy-compare.js). The first view was called Map until 2026-11-19. There was a Featured view of its own for part of that day (the featured policies
      // alone, in the same rows); the owner replaced it the same day with the label, so a featured policy is seen where it sits among the others.
      const subToggle = document.createElement('div');
      subToggle.className = 'pol-subview-toggle';
      subToggle.setAttribute('role', 'group');
      subToggle.setAttribute('aria-label', 'Landscape view');
      subToggle.innerHTML = `
        <button class="pol-subview-btn" id="polSubviewLinks" type="button" aria-pressed="false">Links</button>
        <button class="pol-subview-btn" id="polSubviewCompare" type="button" aria-pressed="false">Compare</button>
        <button class="pol-subview-btn active" id="polSubviewAll" type="button" aria-pressed="true">All</button>`;
      // The switch and, beside it on the same row, the controls of the view showing (the owner, 2026-11-24: "Start from should be in line with the views", then the same for Compare's two menus). Each of Links and Compare has a
      // room of its own for them (30-policy-links.js, 30-policy-compare.js), and only the room of the view that is showing is shown; All has none.
      const subBar = document.createElement('div');
      subBar.className = 'pol-subview-bar';
      const makeSlot = (id, label) => {
        const slot = document.createElement('div');
        slot.id = id;
        slot.className = 'controls pol-subview-slot';   // .controls brings the shared filter bar's menu, label and pill styles (filterbar.css); policy.css turns its bar look off
        slot.setAttribute('role', 'region');
        slot.setAttribute('aria-label', label);
        slot.hidden = true;
        return slot;
      };
      const linksSlot = makeSlot('polLinksSlot', 'Choose a policy to start from'), compareSlot = makeSlot('polCmpSlot', 'Choose two policies to compare');
      subBar.appendChild(subToggle);
      subBar.appendChild(linksSlot);
      subBar.appendChild(compareSlot);
      area.appendChild(subBar);
      // Compare's row is pinned under the top of the window (policy.css), so its live height is kept in --pol-bar-h for what is scrolled to the top to clear (the ring's scroll margin). offsetHeight is in the page's own
      // pixels, which the zoom on the body (tokens.css) scales together with the margin it feeds, so it needs no allowance, as a measured rect would.
      if (typeof ResizeObserver === 'function') new ResizeObserver(() => area.style.setProperty('--pol-bar-h', subBar.offsetHeight + 'px')).observe(subBar);

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

      // Draws the rows: every policy, under its area.
      const drawRows = () => {
        catRows.textContent = '';

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
            // A policy the team features says so above its title: the Sheet's policy map tab marks it in its `featured` column (data/policy-map.js, see polIsFeatured).
            // The label is text in the tile, ahead of the title, so it is read with it.
            const flag = polIsFeatured(p) ? '<span class="pol-cat-card-flag">Featured</span>' : '';
            card.innerHTML = `<div class="pol-cat-card-main">${flag}<div class="pol-cat-card-title">${p.title}</div></div><span class="ui-chevron sm right pol-cat-card-arrow" aria-hidden="true"></span>`;
            card.addEventListener('click', () => openPolModal(p));
            cards.appendChild(card);
          });

          row.appendChild(cards);
          catRows.appendChild(row);
        });
      };
      drawRows();

      area.appendChild(catRows);

      // Links sub-view — built lazily on first activation (see below).
      const linksArea = document.createElement('div');
      linksArea.className = 'pol-links-wrap';
      linksArea.id = 'polLinksArea';
      linksArea.style.display = 'none';
      area.appendChild(linksArea);

      // Compare view — built lazily on first activation too (renderPolicyCompare, 30-policy-compare.js).
      const compareArea = document.createElement('div');
      compareArea.className = 'pol-cmp';
      compareArea.id = 'polCompareArea';
      compareArea.style.display = 'none';
      area.appendChild(compareArea);

      // The view switch. polViewMode (10-policy-map.js) is the view showing: 'all', 'links' or 'compare'. The rows are drawn once and shown or hidden; Links
      // and Compare build their own content the first time they are opened.
      const viewButtons = {
        all: document.getElementById('polSubviewAll'),
        links: document.getElementById('polSubviewLinks'),
        compare: document.getElementById('polSubviewCompare'),
      };
      const showView = mode => {
        if (polViewMode === mode) return;
        polViewMode = mode;
        Object.entries(viewButtons).forEach(([m, btn]) => {
          btn.classList.toggle('active', m === mode);
          btn.setAttribute('aria-pressed', m === mode ? 'true' : 'false');
        });
        catRows.style.display = mode === 'all' ? '' : 'none';
        linksArea.style.display = mode === 'links' ? '' : 'none';
        compareArea.style.display = mode === 'compare' ? '' : 'none';
        linksSlot.hidden = mode !== 'links';
        compareSlot.hidden = mode !== 'compare';
        subBar.classList.toggle('is-pinned', mode === 'compare');   // Compare's row stays under the top of the window while its long rows are read (policy.css); the other two are short
        if (mode === 'links') {
          if (!linksArea.dataset.built) { linksArea.dataset.built = '1'; renderPolicyLinks(linksArea, linksSlot); }
          else { polLinksLayout(); polLinksSyncBack(); }   // the lines are measured from where the tiles are, and the area was hidden while it last changed size; the Back pill follows the step the page is on now
        }
        if (mode === 'compare') {
          if (!compareArea.dataset.built) { compareArea.dataset.built = '1'; renderPolicyCompare(compareArea, compareSlot); }
          else polCmpSyncBack();   // the step the page is on may have been made by the other view since (a move on Links), and then there is no earlier pair to go back to
        }
        // The address says what is on screen: Compare has one for the pair showing (#compare/<a>/<b>), All and Links are the tab's own (#policy). It is rewritten, not added to the history (setHash), and is left alone while the
        // router is applying an address (it is that address, and the router writes the final one itself).
        setHash(currentRoute());
      };
      polShowView = showView;
      Object.entries(viewButtons).forEach(([mode, btn]) => btn.addEventListener('click', () => showView(mode)));

    }
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
    // data, because pairsWith and competesWith fill the Links view's two columns.
    const landscapeHTML = p.landscape ? `
      <div class="pol-modal-section">
        <div class="pol-modal-label">Precedents & landscape</div>
        <div class="pol-modal-text">${injectPolicyLinks(p.landscape, paperMap)}</div>
      </div>` : '';
    // The date line is the day the card's Google Doc was last modified (docUpdated, written by the sync from the Doc's Drive
    // modifiedTime; docs/policy-doc-sync.md). A card with no Doc shows no date: the hand-kept lastReviewed is no longer read.
    // The variable and the class name are historical.
    const lastReviewedHTML = p.docUpdated ? `<div class="pol-modal-lastreviewed">Last updated: ${fmtDate(p.docUpdated)}</div>` : '';
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
    // References listed in the card's Google Doc (synced text only): a section of their own, as the author wrote them.
    if (Array.isArray(p.references) && p.references.length) {
      const body = document.getElementById('polModalBody');
      const refs = document.createElement('div');
      refs.className = 'pol-modal-section';
      refs.innerHTML = `<div class="pol-modal-label">References</div><ul class="pol-modal-list">${li(p.references)}</ul>`;
      body.insertBefore(refs, body.querySelector('.pol-modal-lastreviewed'));   // before Last reviewed, or at the end
    }
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

