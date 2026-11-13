  /* ═══════════════════════════════════════════════════════════
     FACT BANK MODULE
     Self-contained in its own closure so its helpers (esc, barHTML,
     formatAPACitation, paperMap, …) don't collide with the engine's.
     Exposes only factBankEnabled + initFactBank to the engine.
     The list is built lazily on the first tab open, and only a page of it (PAGE_SIZE cards) at a time.
     ═══════════════════════════════════════════════════════════ */
  /* The 880 KB payload is fetched on first open of the tab rather than at page
     load (see 05-lazy.js). So the tab is enabled optimistically here and this
     module is set up only once the data has arrived. If the fetch fails, or the
     file is absent from a partial checkout, the tab removes itself then instead
     of at load; the router's `guard` keeps #fact-bank from resolving after that.

     initFactBank is called by setView on every open and must stay idempotent:
     the promise cache in loadPayload plus the _built flag make repeat opens a
     no-op, and the real builder is assigned over this one once it exists. */
  factBankEnabled = true;
  var _fbLoadTries = 0;
  initFactBank = function () {
    loadPayload('data/fact-bank-data.js')
      .then(() => { setupFactBank(); initFactBank(); })
      .catch(() => {
        // A single failed fetch of the 880 KB payload used to remove the tab
        // for the whole session, so one network blip looked like the Fact Bank
        // "disappearing" until a reload happened to succeed. loadPayload now
        // drops its cache on error, so retry a few times with backoff before
        // giving up. Only a payload that is genuinely missing (a partial
        // checkout) exhausts the retries and hides the tab.
        if (++_fbLoadTries < 4) {
          setTimeout(initFactBank, 800 * _fbLoadTries);
          return;
        }
        console.warn('fact-bank: payload failed to load after 4 tries; hiding the Fact Bank tab.');
        document.getElementById('viewFactBank')?.remove();
        factBankEnabled = false;
      });
  };

  function setupFactBank() {
    if (typeof FACT_BANK === 'undefined' || !Array.isArray(FACT_BANK) || FACT_BANK.length === 0) {
      console.warn('fact-bank: FACT_BANK not loaded — hiding the Fact Bank tab.');
      document.getElementById('viewFactBank')?.remove();
      factBankEnabled = false;
      initFactBank = function () {};
      return;
    }
    factBankEnabled = true;

    const paperMap = Object.fromEntries(RESEARCH_DATA.map(p => [p.id, p]));
    // Only facts whose source paper is a live research entry can render: every
    // card/group dereferences paperMap[paperId] for its citation, so a fact whose
    // paper was archived would throw and blank the whole view. Drop them here.
    const liveFacts = FACT_BANK.filter(f => paperMap[f.paperId]);

    const EV_LABELS = {
      'rct': 'Randomized experiment', 'natural-experiment': 'Natural experiment',
      'administrative-data': 'Administrative data', 'audit-study': 'Audit study',
      'survey': 'Survey', 'model-projection': 'Projection / model', 'meta-analysis': 'Meta-analysis',
      'descriptive-statistics': 'Descriptive statistics', 'investigative': 'Investigative journalism',
      'legal-policy-analysis': 'Legal / policy analysis'
    };
    const KW_LABELS = {
      'inequality': 'Inequality', 'corporate-power': 'Corporate power', 'tech-democracy': 'Tech & democracy',
      'environment-energy': 'Environment & energy', 'displacement': 'Displacement', 'worker-power': 'Worker power',
      'wages': 'Wages', 'surveillance': 'Surveillance', 'discrimination': 'Discrimination', 'gender': 'Gender',
      'race': 'Race', 'gig-work': 'Gig work', 'healthcare': 'Healthcare', 'housing': 'Housing',
      'education': 'Education', 'safety-net': 'Safety net', 'global-south': 'Global South', 'solutions': 'Solutions'
    };

    function kfFormatAPACitation(p) {
      const year = p.date ? p.date.slice(0, 4) : 'n.d.';
      const src = (p.source || '').trim();
      let author = src, org = '';
      if (src.includes(' — ')) {
        const parts = src.split(' — ');
        author = parts[0].trim();
        org = parts.slice(1).join(' — ').trim();
      }
      const orgPart = org && org.toLowerCase() !== author.toLowerCase() ? ` ${org}.` : '';
      const authorDot = author.endsWith('.') ? '' : '.';
      const titleDot = /[.?!]$/.test(p.title) ? '' : '.';
      return `${author}${authorDot} (${year}). <em>${p.title}</em>${titleDot}${orgPart}`;
    }
    function apaPlain(p) { return kfFormatAPACitation(p).replace(/<\/?em>/g, ''); }

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    function pubDateOf(f) { return f.pubDate || (paperMap[f.paperId] || {}).date || ''; }
    function formatPubDate(d) {
      if (!d) return '';
      const parts = d.split('-');
      const y = parts[0];
      const mi = parts[1] ? parseInt(parts[1], 10) - 1 : null;
      return (mi != null && MONTHS[mi]) ? `${MONTHS[mi]} ${y}` : y;
    }
    function esc(s) {
      return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    /* Rating bar: five segments drawn by CSS from --n, so a bar is one element with no
       per-segment markup. A Truth rating of 2 or lower is the caution case and turns
       amber: the same threshold that adds the "Use with caution" chip and warms the
       take-note. A bar that sits beside its own number ("2/5") is decorative; the
       standalone ones carry the value for assistive tech. */
    function barHTML(n, low, decorative) {
      const v = Math.max(0, Math.min(5, Math.round(+n) || 0));
      const a11y = decorative ? ' aria-hidden="true"' : ` role="img" aria-label="${v} of 5"`;
      return `<span class="fc-bar${low ? ' is-low' : ''}" style="--n:${v}"${a11y}></span>`;
    }

    /* ── State ── */
    let q = '', evType = 'all', minPol = 1, minTruth = 1, sortBy = 'date', onlyFoundational = false;
    const activeKw = new Set();
    // The list is shown PAGE_SIZE cards at a time (see "Pages" below). A card, and a source's header, is
    // built the first time its page is shown and then kept, so an open card stays open when the reader pages
    // away and back. Only the current page is ever in the document.
    let page = 1;
    let ordered = null;                    // liveFacts in the current sort order; cleared when the sort changes
    const wrapById = {}, headerByPaper = {};
    const factsByPaper = {};
    liveFacts.forEach(f => { (factsByPaper[f.paperId] = factsByPaper[f.paperId] || []).push(f); });
    const factById = Object.fromEntries(liveFacts.map(f => [f.id, f]));

    const allFactsView = document.getElementById('allFactsView');
    const emptyState = document.getElementById('kfEmptyState');
    const pager = document.getElementById('kfPager');
    const resultLine = document.getElementById('kfResultLine');
    const moreCount = document.getElementById('kfMoreCount');
    const clearBtn = document.getElementById('kfClear');

    /* ── Shared card fragments ── */
    /* One rating explained: a rail (the scale's name, a small bar, the score) beside the
       sentence that justifies it. The sentence keeps its own column, so it starts at the
       same x on every row and wraps with a hanging edge instead of running on from the
       label. The bar is decorative here: the score beside it says the value. */
    function ratingRowHTML(label, n, low, why) {
      return `<div class="rd-row">
        <div class="rd-rail">
          <span class="lbl-grot">${label}</span>
          <span class="rd-meter">${barHTML(n, low, true)}<span class="rd-score">${esc(n)}/5</span></span>
        </div>
        <p class="rd-why">${esc(why)}</p>
      </div>`;
    }
    function ratingDescHTML(f) {
      return `<div class="rating-desc">
        ${ratingRowHTML('Political noteworthiness', f.political, false, f.politicalWhy)}
        ${ratingRowHTML('Truth', f.truth, f.truth <= 2, f.truthWhy)}
      </div>`;
    }
    function kwChipsHTML(f) {
      return (f.keywords || []).map(k => `<span class="chip chip-kw">${esc(KW_LABELS[k] || k)}</span>`).join('');
    }
    function statusChipsHTML(f) {
      const caution = f.truth <= 2 ? `<span class="chip chip-caution">Use with caution</span>` : '';
      const access = f.sourceAccess && f.sourceAccess !== 'full'
        ? `<span class="chip chip-access">Quote from ${esc(f.sourceAccess)}</span>` : '';
      const foundational = f.foundational
        ? `<span class="chip chip-foundational" title="${esc(f.foundationalWhy || 'This source contains many more citable facts than the ones extracted.')}">Foundational source</span>` : '';
      return caution + access + foundational;
    }
    function metaHTML(f, opts) {
      opts = opts || {};
      const rows = [];
      // The source's own citation (a link to the original), when the caller passes the paper.
      if (opts.paper) rows.push(`<strong>Source:</strong> ${citeHTML(opts.paper, f)}`);
      if (!opts.skipMethod) rows.push(`<strong>Method:</strong> ${esc(f.methodNote)}`);
      rows.push(`<strong>Where it comes from:</strong> ${esc(f.provenance)}`);
      if (f.suggestedUse && !opts.skipSuggestedUse) rows.push(`<strong>Suggested use:</strong> ${esc(f.suggestedUse)}`);
      if (f.foundational && f.foundationalWhy) rows.push(`<strong>Foundational source:</strong> ${esc(f.foundationalWhy)}`);
      rows.push(`<strong>Extracted and rated by:</strong> ${esc(f.model || 'unrecorded')}, ${esc(f.added || '')}`);
      return `<p class="fact-meta">${rows.join('<br>')}</p>`;
    }
    function caveatHTML(f) {
      return `<div class="fact-caveat${f.truth <= 2 ? ' warn' : ''}"><span class="lbl-grot">Take note</span>${esc(f.caveat)}</div>`;
    }
    function citeHTML(p, f) {
      const pd = formatPubDate(pubDateOf(f));
      return `<a class="cite-link" href="${esc(p.sourceUrl)}" target="_blank" rel="noopener noreferrer">${kfFormatAPACitation(p)}</a>
              ${pd ? `<span class="cite-date">Published ${esc(pd)}</span>` : ''}`;
    }

    /* Byline for the collapsed card: the author or writer first (bold), then the
       organization or outlet, then the year. p.source reads "Authors - Organization"
       with a spaced em dash. A list of people is cut to the first author plus "et al.".
       A source with no organization part is itself an organization, so it is shown
       whole: cutting "National Partnership for Women & Families" at the ampersand
       would print a name that does not exist. */
    function bylineHTML(p, f) {
      const src = (p.source || '').trim();
      const cut = src.indexOf(' \u2014 ');
      const people = (cut > -1 ? src.slice(0, cut) : src).trim();
      const org = cut > -1 ? src.slice(cut + 3).trim() : '';
      let name = people;
      if (cut > -1) {
        if (people.indexOf(',') > -1) name = people.split(',')[0].trim() + ' et al.';
        else if (people.indexOf(' & ') > -1) name = people.split(' & ')[0].trim() + ' et al.';
      }
      const yr = (pubDateOf(f) || '').slice(0, 4);
      return `<span class="fc-author">${esc(name)}</span>` + (org ? ' &middot; ' + esc(org) : '') + (yr ? ' &middot; ' + yr : '');
    }
    /* The source, as a band across the top of a card that has no source header of its own (a source with one
       matching fact): the paper's title and its byline, on the same tint as a header, so a lone fact is
       attributed as loudly as a group of them. A card under a source header hides it (the header says the
       same). The title is shown here for the first time: a lone fact used to carry only a small byline. */
    function sourceBandHTML(p, f) {
      return `<div class="fc-source"><div class="fc-source-text"><div class="fc-source-title">${esc(p.title)}</div><div class="fc-source-by">${bylineHTML(p, f)}</div></div><a class="act-btn" href="#entry/${esc(p.id)}">View Summary →</a></div>`;
    }
    /* Card header, under the verbatim quote. Left: the category pills. Right: the two rating bars, stacked
       so they share a left edge and sit at the same x on every card; a reader can scan
       down the column and compare the two ratings. Then the expand chevron. */
    function headHTML(f, p) {
      return `<div class="fc-head">
        <div class="fc-head-main">
          ${chipsRowHTML(f)}
        </div>
        <div class="fc-rate">
          <span class="fc-rate-lbl">Political noteworthiness</span>${barHTML(f.political, false)}
          <span class="fc-rate-lbl">Truth</span>${barHTML(f.truth, f.truth <= 2)}
        </div>
        <span class="expand-hint"><span class="ui-chevron chev" aria-hidden="true"></span></span>
      </div>`;
    }
    /* ── Composable detail pieces (assembled by factCardHTML) ── */
    /* The verbatim quote is the card's lead: it is the text a reader would cite. */
    function leadQuoteHTML(f) {
      return `<blockquote class="fact-quote fc-lead">${esc(f.fact)}</blockquote>`;
    }
    function usageHTML(f) {
      return f.suggestedUse
        ? `<div class="fc-usage"><span class="lbl-grot">Suggested use</span>${esc(f.suggestedUse)}</div>`
        : '';
    }
    function chipsRowHTML(f) {
      return `<div class="chips fc-chips">
          <span class="chip">${esc(EV_LABELS[f.evidenceType] || f.evidenceType)}</span>
          ${statusChipsHTML(f)}${kwChipsHTML(f)}
        </div>`;
    }
    function methodsPanelHTML(f, opts) {
      return `<div class="fact-methods">
          <span class="lbl-grot">Methods &amp; sourcing</span>
          ${metaHTML(f, opts)}
        </div>`;
    }
    /* The surrounding paragraph of each fact lives in its own file (data/fact-bank-context.js, FACT_CONTEXT, keyed
       by the record's id) and is loaded the first time a card is opened: it was a quarter of the Fact Bank's bytes,
       and a collapsed card never shows it. A card built before the file arrives shows a placeholder, and
       fillContexts() replaces it in every card built so far, on the page or kept for another page. A failed load
       says so in place of the paragraph. */
    let ctxState = typeof FACT_CONTEXT !== 'undefined' ? 'ready' : 'idle';   // idle | loading | ready | failed
    function ctxText(f) {
      if (ctxState === 'ready') return FACT_CONTEXT[f.id] || '';
      if (ctxState === 'failed') return 'The surrounding paragraph could not be loaded. Open the source to read it in place.';
      return 'Loading the surrounding paragraph\u2026';
    }
    function fillContexts() {
      Object.keys(wrapById).forEach(id => {
        const body = wrapById[id].querySelector('.fc-ctx-body');
        if (body) body.textContent = ctxText(factById[id]);
      });
    }
    function ensureContext() {
      if (ctxState !== 'idle') return;
      ctxState = 'loading';
      loadPayload('data/fact-bank-context.js')
        .then(() => { ctxState = 'ready'; }, () => { ctxState = 'failed'; })
        .then(fillContexts);
    }
    /* Starts open: the surrounding paragraph is the context to check before citing a
       number, so it should not cost a click. Its summary row collapses it. */
    function contextDiscHTML(f) {
      return `<details class="fact-context-d" open>
          <summary><span class="lbl-grot">Surrounding paragraph</span><span class="ui-chevron chev" aria-hidden="true"></span></summary>
          <div class="fc-ctx-body">${esc(ctxText(f))}</div>
        </details>`;
    }
    function actionsHTML(f, p) {
      return `<div class="fc-actions">
          <a class="act-btn" href="#entry/${esc(p.id)}">View Summary →</a>
          <button class="act-btn" data-copy="${esc(f.id)}">Copy fact + citation</button>
        </div>`;
    }

    /* ── The fact card ──
       The verbatim quote leads (under a source band when the card has no source header), then a header
       (category pills on the left, the two rating bars on the right), then usage guidance (take note + suggested
       use), all visible up front. The card expands for the rating rationale, the
       surrounding paragraph (a panel that starts expanded; its summary row collapses it),
       then methods and sourcing, including a link to the original source, and the
       actions. */
    function factCardHTML(f) {
      const p = paperMap[f.paperId];
      return `
      <div class="cwrap" data-fid="${esc(f.id)}"><div class="cinner">
        <article class="fact-card" id="kf-all-${esc(f.id)}" tabindex="0" role="button" aria-expanded="false">
          ${sourceBandHTML(p, f)}
          ${leadQuoteHTML(f)}
          ${headHTML(f, p)}
          <div class="fc-open">
            ${caveatHTML(f)}
            ${usageHTML(f)}
          </div>
          <div class="details"><div class="dinner">
            <div class="fc-detail">
              ${ratingDescHTML(f)}
              ${contextDiscHTML(f)}
              ${methodsPanelHTML(f, { skipSuggestedUse: true, paper: p })}
              ${actionsHTML(f, p)}
            </div>
          </div></div>
        </article>
      </div></div>`;
    }

    /* ── Sorting ── */
    function factSorter(a, b) {
      const da = pubDateOf(a), db = pubDateOf(b);
      if (sortBy === 'political') return b.political - a.political || b.truth - a.truth || db.localeCompare(da);
      if (sortBy === 'truth') return b.truth - a.truth || b.political - a.political || db.localeCompare(da);
      // Newest source first, then the source itself (so a source's facts stay together under its
      // header), then the strongest fact first within it.
      return db.localeCompare(da) || String(a.paperId).localeCompare(String(b.paperId), undefined, { numeric: true }) ||
        b.political - a.political || b.truth - a.truth;
    }

    /* ── Pages ──
       At most PAGE_SIZE cards a page. Under the default sort a source's matching facts form one block (its
       header and its cards), and a block is never split across two pages: a page fills with whole blocks, so
       it can hold a few fewer than fifty. No source has more than five facts, so a block always fits. The two
       ranking sorts stay flat, because a source's facts are scattered through a ranking (a median of 88 to 141
       cards apart) and grouping would drag weak siblings up beside the strong fact; every page of those but
       the last holds fifty. */
    function layoutPages(shown) {
      const grouped = sortBy === 'date';
      const blocks = [];
      shown.forEach(f => {
        const last = blocks[blocks.length - 1];
        if (grouped && last && last[0].paperId === f.paperId) last.push(f); else blocks.push([f]);
      });
      const pages = [[]];
      let n = 0;
      blocks.forEach(b => {
        if (n && n + b.length > PAGE_SIZE) { pages.push([]); n = 0; }
        pages[pages.length - 1].push(b);
        n += b.length;
      });
      return pages;
    }
    function wrapFor(f) {
      let w = wrapById[f.id];
      if (!w) {
        const tpl = document.createElement('template');
        tpl.innerHTML = factCardHTML(f).trim();
        w = wrapById[f.id] = tpl.content.firstElementChild;
      }
      return w;
    }
    /* One header per source that has two or more matching facts on the page. The facts keep their own cards;
       the header carries what they share (title, byline, count, View Summary), and the cards beneath it drop
       the repeated byline. The count reads "N facts", or "k of N facts" when a filter hides some of them. */
    function headerFor(pid, visible) {
      let h = headerByPaper[pid];
      if (!h) {
        const p = paperMap[pid];
        h = headerByPaper[pid] = document.createElement('div');
        h.className = 'g-head';
        h.innerHTML = `<div class="g-main"><h3 class="g-title">${esc(p.title)}</h3><div class="g-meta">${bylineHTML(p, factsByPaper[pid][0])}</div></div>
          <div class="g-right"><span class="g-count"></span><a class="act-btn" href="#entry/${esc(p.id)}">View Summary →</a></div>`;
      }
      const total = factsByPaper[pid].length;
      h.querySelector('.g-count').textContent = visible === total ? `${visible} facts` : `${visible} of ${total} facts`;
      return h;
    }

    /* ── Filtering ── */
    function matches(f) {
      if (f.political < minPol || f.truth < minTruth) return false;
      if (onlyFoundational && !f.foundational) return false;
      if (evType !== 'all' && f.evidenceType !== evType) return false;
      if (activeKw.size && ![...activeKw].every(k => (f.keywords || []).includes(k))) return false;
      if (q) {
        const p = paperMap[f.paperId] || {};
        const hay = [f.fact, f.caveat, f.provenance, f.suggestedUse, f.foundationalWhy, (f.keywords || []).join(' '), p.title, p.source].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }
    /* Every filter sits inside the "More filters" panel (Evidence, the two rating minimums,
       keywords, Foundational); only search and Sort stay in view, and neither is counted. The badge
       counts what is switched on, and "Clear filters" shows exactly when the badge does. */
    function refreshMore() {
      const inPanel = (evType !== 'all' ? 1 : 0) + (minPol > 1 ? 1 : 0) + (minTruth > 1 ? 1 : 0) + activeKw.size + (onlyFoundational ? 1 : 0);
      moreCount.hidden = inPanel === 0;
      moreCount.textContent = inPanel;
      clearBtn.hidden = inPanel === 0;
    }
    /* The filter bar's live height, for the pinned source headers (--kf-bar-h, read by .g-head in policy.css). A
       ResizeObserver follows the bar as it changes (More filters opens, a narrow screen wraps it); a render also
       re-reads it, because the result line it fills is part of the bar and an observer can lag a frame behind.
       The height is read exactly, not as offsetHeight: the page is zoomed (body zoom, tokens.css), so the bar is a
       fractional height (85.76px, not 86), and the whole number left the pinned header a quarter pixel below the bar,
       where the cards scrolling past could show through. A rect is in zoomed pixels and the sticky offset is in the
       header's own, hence the division by the zoom. */
    function syncBarHeight() {
      const bar = document.querySelector('#factBankArea .controls');
      if (!bar) return;
      const zoom = parseFloat(getComputedStyle(document.body).zoom) || 1;
      document.getElementById('factBankArea').style.setProperty('--kf-bar-h', (bar.getBoundingClientRect().height / zoom).toFixed(2) + 'px');
    }
    /* Draws the current page: the facts that match, in order, cut into pages of whole blocks, and the page the
       reader is on built into the list. */
    function renderPage() {
      const shownFacts = (ordered || (ordered = [...liveFacts].sort(factSorter))).filter(matches);
      const pages = layoutPages(shownFacts);
      page = Math.min(Math.max(page, 1), pages.length);
      const grouped = sortBy === 'date';
      allFactsView.classList.toggle('grouped', grouped);
      const frag = document.createDocumentFragment();
      let onPage = 0;
      pages[page - 1].forEach(block => {
        const together = grouped && block.length >= 2;
        // A source with two or more facts is a section holding its header and its cards, so the header can stay
        // pinned while its cards scroll and goes with them (see .g-head in policy.css); a lone fact sits in the list.
        let into = frag;
        if (together) {
          into = document.createElement('section');
          into.className = 'g-group';
          into.appendChild(headerFor(block[0].paperId, block.length));
          frag.appendChild(into);
        }
        block.forEach(f => {
          const w = wrapFor(f);
          w.classList.toggle('in-group', together);
          into.appendChild(w);
        });
        onPage += block.length;
      });
      allFactsView.textContent = '';
      allFactsView.appendChild(frag);
      const before = pages.slice(0, page - 1).reduce((n, pg) => n + pg.reduce((m, b) => m + b.length, 0), 0);
      const nSources = new Set(shownFacts.map(f => f.paperId)).size;
      resultLine.textContent = `${shownFacts.length} of ${liveFacts.length} facts, drawn from ${nSources} source${nSources === 1 ? '' : 's'}.` +
        (pages.length > 1 ? ` Showing ${before + 1} to ${before + onPage}.` : '');
      emptyState.hidden = shownFacts.length !== 0;
      renderPager(pager, { page, pages: pages.length, noun: 'facts', onPage: n => { page = n; renderPage(); showListTop(allFactsView); } });
      refreshMore();
      syncBarHeight();
    }
    // Any change to the filters, the search or the sort starts the list again at page 1.
    function applyFilters() { page = 1; renderPage(); }

    function toggleCard(card) {
      const open = card.classList.toggle('open');
      card.setAttribute('aria-expanded', String(open));
      if (open) ensureContext();
    }
    function handleCardEvents(root) {
      root.addEventListener('click', e => {
        const cp = e.target.closest('[data-copy]');
        if (cp) {
          const f = liveFacts.find(x => x.id === cp.dataset.copy);
          const p = paperMap[f.paperId];
          const text = `"${f.fact}"\n\nSource: ${apaPlain(p)} ${p.sourceUrl}`;
          navigator.clipboard.writeText(text).then(() => {
            cp.textContent = 'Copied';
            cp.classList.add('copied');
            setTimeout(() => { cp.textContent = 'Copy fact + citation'; cp.classList.remove('copied'); }, 1600);
          });
          return;
        }
        if (e.target.closest('a, select, input, summary')) return;
        const card = e.target.closest('.fact-card');
        if (card) toggleCard(card);
      });
      root.addEventListener('keydown', e => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.fact-card')) {
          e.preventDefault();
          toggleCard(e.target);
        }
      });
    }

    let kfBuilt = false;
    // A #fact-bank/<paper-id> link, applied once the view exists (see 40-router.js).
    applyFactBankQuery = function () {
      const box = document.getElementById('kfSearch');
      if (!box) return;
      box.value = factBankQuery;
      q = factBankQuery.toLowerCase();
      if (kfBuilt) applyFilters();
    };
    initFactBank = function () {
      if (kfBuilt) return;
      kfBuilt = true;

      // Populate the evidence-type select.
      const evSelect = document.getElementById('kfEvidence');
      [...new Set(liveFacts.map(f => f.evidenceType))].sort().forEach(t => {
        const o = document.createElement('option');
        o.value = t; o.textContent = EV_LABELS[t] || t;
        evSelect.appendChild(o);
      });

      // Keyword options: an "All" chip (pressed when nothing is selected) plus one chip per
      // keyword, most common first. A fact must carry every selected keyword.
      const kwCounts = {};
      liveFacts.forEach(f => (f.keywords || []).forEach(k => { kwCounts[k] = (kwCounts[k] || 0) + 1; }));
      const pillWrap = document.getElementById('kwPills');
      const kwChips = [];                                   // { k, btn }; k === null is "All"
      const refreshKw = () => {
        kwChips.forEach(({ k, btn }) => btn.setAttribute('aria-pressed', String(k === null ? activeKw.size === 0 : activeKw.has(k))));
      };
      const addKwChip = (k, html) => {
        const b = document.createElement('button');
        b.className = 'kw-pill';
        b.dataset.kw = k === null ? 'all' : k;
        b.innerHTML = html;
        b.addEventListener('click', () => {
          if (k === null) activeKw.clear();
          else if (activeKw.has(k)) activeKw.delete(k);
          else activeKw.add(k);
          refreshKw();
          applyFilters();
        });
        pillWrap.appendChild(b);
        kwChips.push({ k, btn: b });
      };
      addKwChip(null, 'All');
      Object.keys(kwCounts).sort((a, b) => kwCounts[b] - kwCounts[a]).forEach(k => {
        addKwChip(k, `${esc(KW_LABELS[k] || k)} <span class="kw-count">${kwCounts[k]}</span>`);
      });
      refreshKw();

      // The Foundational checkbox only appears when some fact is marked foundational; with none
      // it could only ever return an empty list.
      const foundationalBox = document.getElementById('kfFoundational');
      foundationalBox.closest('.ctl-check').hidden = !liveFacts.some(f => f.foundational);

      // "More filters" holds Evidence, the two rating minimums, the keyword chips and (when it applies) Foundational.
      wireMoreFilters('kfMoreToggle', 'kfMorePanel');

      // "Clear filters" resets every filter. It leaves the search text and the sort alone.
      clearBtn.addEventListener('click', () => {
        evType = 'all'; minPol = 1; minTruth = 1; onlyFoundational = false; activeKw.clear();
        evSelect.value = 'all';
        document.getElementById('kfMinPol').value = '1';
        document.getElementById('kfMinTruth').value = '1';
        foundationalBox.checked = false;
        refreshKw();
        applyFilters();
      });

      document.getElementById('kfSearch').addEventListener('input', e => { q = e.target.value.toLowerCase(); applyFilters(); });
      evSelect.addEventListener('change', e => { evType = e.target.value; applyFilters(); });
      document.getElementById('kfMinPol').addEventListener('change', e => { minPol = +e.target.value; applyFilters(); });
      document.getElementById('kfMinTruth').addEventListener('change', e => { minTruth = +e.target.value; applyFilters(); });
      document.getElementById('kfFoundational').addEventListener('change', e => { onlyFoundational = e.target.checked; applyFilters(); });
      document.getElementById('kfSort').addEventListener('change', e => { sortBy = e.target.value; ordered = null; applyFilters(); });

      handleCardEvents(allFactsView);

      // A pinned source header sticks just under the filter bar, whose height changes (More filters opens, the bar
      // wraps on a narrow screen), so the bar's height is read into --kf-bar-h rather than guessed.
      const bar = document.querySelector('#factBankArea .controls');
      if (typeof ResizeObserver !== 'undefined') new ResizeObserver(syncBarHeight).observe(bar);
      syncBarHeight();

      // A source's facts link may have arrived before this view was built. applyFilters() draws page 1.
      if (factBankQuery) { document.getElementById('kfSearch').value = factBankQuery; q = factBankQuery.toLowerCase(); }
      applyFilters();
    };
  }   // setupFactBank

  // ── init ─────────────────────────────────────────────────────
  // R2: honor a deep link if one is present; otherwise land on About (home).
  if (!applyHashRoute()) setView('about');
  window.addEventListener('hashchange', applyHashRoute);

