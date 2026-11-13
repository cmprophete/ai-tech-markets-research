
  // ── state ────────────────────────────────────────────────────
  let activeView    = 'about';
  // The Papers bar's filters (70-render.js). activeEvidence is the Methodology select.
  let activeCat      = 'all';
  let activeGeo      = 'all';
  let activeEvidence = 'all';
  let searchQuery   = '';
  let sortOrder     = 'desc';   // 'desc' = newest first, 'asc' = oldest first
  let papersPage    = 1;        // the Papers list shows PAGE_SIZE rows at a time (see "paging" below)
  let factBankEnabled = false;      // set true by the Fact Bank module if data is present
  let initFactBank = function () {}; // replaced with the real builder when data is present
  // A #fact-bank/<paper-id> link parks the source's title here, because the Fact
  // Bank builds lazily. Its builder reads this; applyFactBankQuery (replaced by the
  // module once it exists) applies a later one directly.
  let factBankQuery = '';
  let applyFactBankQuery = function () {};
  // Opening the Fact Bank any other way than a source's facts link should show
  // every fact again. The title that link put in the search box is cleared, but
  // only if it is still what is in the box, so a search the reader typed is kept.
  function clearFactBankLink() {
    if (!factBankQuery) return;
    const box = document.getElementById('kfSearch');
    const linked = box && box.value === factBankQuery;
    factBankQuery = '';
    if (linked) applyFactBankQuery();
  }
  // A fact's "View Summary" link (#entry/<paper-id>) does for Papers what a source's facts link does for the Fact Bank:
  // the paper's title goes into the search box, which narrows the list to that paper, and its row opens. Opening
  // Papers any other way shows every paper again: the title the link put there is cleared, but only if it is still
  // what the search holds, so a search the reader typed is kept.
  let papersLinkQuery = '';
  function clearPapersLink() {
    if (!papersLinkQuery) return;
    const linked = searchQuery === papersLinkQuery;
    papersLinkQuery = '';
    if (linked) { searchQuery = ''; syncPapersControls(); papersChanged(); }
  }
  // policyCardsHidden: true hides the Policy tab's map (the policy cards, built by buildPolicyView()) behind a short
  // notice, e.g. while their citations are being reworked (some cite non-AI sources that are not in the research
  // tracker). See buildPolicyView() + getTabDesc(). The tab once had an agenda half above the map, with a flag of its
  // own; it was removed on 2026-11-12.
  let policyCardsHidden = false;

  // ── lookups ──────────────────────────────────────────────────
  // Paper summaries (data/paper-summaries.js, a pilot; see docs/paper-summaries.md) are attached to
  // their entries here, so the rest of the app reads entry.summary and need not know where it came from.
  if (typeof PAPER_SUMMARIES !== 'undefined') {
    RESEARCH_DATA.forEach(e => { if (PAPER_SUMMARIES[e.id]) e.summary = PAPER_SUMMARIES[e.id]; });
  }

  // ── utils ────────────────────────────────────────────────────
  const escapeHTML = v => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // "More filters": the disclosure that holds a filter bar's secondary controls. The Papers bar and
  // the Fact Bank's bar share it, so the two open and close the same way.
  function wireMoreFilters(toggleId, panelId) {
    const toggle = document.getElementById(toggleId), panel = document.getElementById(panelId);
    toggle.addEventListener('click', () => {
      const open = panel.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }
  /* ── paging ───────────────────────────────────────────────────
     The two long lists, Papers and the Fact Bank, show at most PAGE_SIZE cards at a time, with a pager
     under the list. A page is built when it is opened, so a reader never loads the cards on the pages
     they do not visit. The Legislation tab's bills table uses the same pager with a page of its own
     (LEG_PAGE_SIZE, ten rows, in 60-legislation.js). */
  const PAGE_SIZE = 50;
  // The page numbers a pager shows: every page up to nine; beyond that, the first, the last and the
  // current page with its neighbours, with 0 marking a gap.
  function pagerItems(page, pages) {
    if (pages <= 9) return Array.from({ length: pages }, (_, i) => i + 1);
    const keep = [...new Set([1, pages, page - 1, page, page + 1])].filter(n => n >= 1 && n <= pages).sort((a, b) => a - b);
    const out = [];
    keep.forEach((n, i) => { if (i && n - keep[i - 1] > 1) out.push(0); out.push(n); });
    return out;
  }
  // Draws a list's pager into its <nav>, and hides it when the whole list fits on one page. onPage(n) is
  // called with the page the reader picked. The click listener is added once; the buttons are redrawn.
  function renderPager(nav, { page, pages, noun, onPage }) {
    if (!nav._wired) {
      nav._wired = true;
      nav.addEventListener('click', e => {
        const b = e.target.closest('button[data-page]');
        if (b && !b.disabled) nav._onPage(+b.dataset.page);
      });
    }
    nav._onPage = onPage;
    nav.hidden = pages <= 1;
    nav.textContent = '';
    if (pages <= 1) return;
    nav.setAttribute('aria-label', 'Pages of ' + noun);
    const make = (text, target, cls, label) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pager-btn' + (cls ? ' ' + cls : '');
      b.textContent = text;
      b.dataset.page = target;
      b.setAttribute('aria-label', label);
      return b;
    };
    const prev = make('Previous', page - 1, 'pager-step', 'Previous page');
    prev.disabled = page <= 1;
    const next = make('Next', page + 1, 'pager-step', 'Next page');
    next.disabled = page >= pages;
    const nums = document.createElement('span');
    nums.className = 'pager-nums';
    pagerItems(page, pages).forEach(n => {
      if (n === 0) {
        const gap = document.createElement('span');
        gap.className = 'pager-gap'; gap.textContent = '\u2026'; gap.setAttribute('aria-hidden', 'true');
        nums.appendChild(gap);
        return;
      }
      const b = make(String(n), n, n === page ? 'is-current' : '', 'Page ' + n);
      if (n === page) b.setAttribute('aria-current', 'page');
      nums.appendChild(b);
    });
    // On a phone the numbers give way to this (pager.css).
    const status = document.createElement('span');
    status.className = 'pager-status';
    status.textContent = `Page ${page} of ${pages}`;
    nav.appendChild(prev); nav.appendChild(nums); nav.appendChild(status); nav.appendChild(next);
  }
  // After a page change: back to the top of the list, just under the sticky filter bar, with focus on the
  // list so a keyboard or screen-reader reader starts at its first card, not at the pager they just used.
  function showListTop(list) {
    const bar = list.closest('#papersArea, #factBankArea').querySelector('.controls');
    window.scrollTo(0, Math.max(0, list.getBoundingClientRect().top + window.pageYOffset - bar.offsetHeight - 12));
    list.focus({ preventScroll: true });
  }
  // ── filter + sort ────────────────────────────────────────────
  function filteredBase({ excludeCat = false, excludeGeo = false, excludeEvidence = false } = {}) {
    // A copy: getVisible sorts in place, and with no filter on this would be RESEARCH_DATA itself.
    let data = RESEARCH_DATA.slice();
    if (!excludeCat      && activeCat      !== 'all') data = data.filter(r => r.category === activeCat);
    if (!excludeGeo      && activeGeo      !== 'all') data = data.filter(r => (r.geography || 'us') === activeGeo);
    if (!excludeEvidence && activeEvidence !== 'all') data = data.filter(r => getEvidenceType(r) === activeEvidence);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      // Search the text a row shows: a paper with a summary shows that, the others their key finding
      // and takeaways.
      const shown = r => r.summary ? [r.summary.lede, r.summary.body, r.summary.note] : [r.keyFinding, ...(r.takeaways || [])];
      data = data.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.source.toLowerCase().includes(q) ||
        shown(r).some(t => t && t.toLowerCase().includes(q))
      );
    }
    return data;
  }

  // Newest first unless the Sort select says oldest first.
  function getVisible() {
    return filteredBase().sort((a, b) => {
      const d = new Date(a.date) - new Date(b.date);
      return sortOrder === 'desc' ? -d : d;
    });
  }

  // ── papers list ────────────────────────────────────────────
  // One compact row per paper. A row is built collapsed; its body (key finding,
  // takeaways, actions) is built on first open, so 250 rows cost 250 heads, not
  // 250 heads and 250 bodies. Open/close and the copy buttons are handled by one
  // delegated listener on #cardsGrid (see 70-render.js).

  // "Eloundou et al., OpenAI / University of Pennsylvania": the first author, with "et al." when there are
  // several, then the institution. The author leads the line and is set in semibold (.src-author); a source
  // with no author part is an organization, and takes that place whole, as it does in the Fact Bank.
  function sourceByline(entry) {
    const parts = (entry.source || '').split(' — ');
    const institution = parts[parts.length - 1];
    if (parts.length < 2) return `<span class="src-author">${institution}</span>`;
    const authors = parts.slice(0, -1).join(' — ');
    const several = /,| & /.test(authors);
    const first = authors.split(/,| & /)[0].trim();
    return `<span class="src-author">${several ? first + ' et al.' : first}</span>, ${institution}`;
  }

  // Facts per source, for the "N facts" link on each row. The Fact Bank data is a
  // lazy payload (05-lazy.js), so rows paint first and the counts arrive once it
  // has loaded. A failed load just leaves the links off, and the next render tries
  // again.
  let factCounts = null, factCountsAsked = false;
  function paintFactsLink(row) {
    const a = row.querySelector('.src-facts');
    const n = factCounts && factCounts[+row.dataset.entryId];
    a.hidden = !n;
    if (n) a.textContent = n + (n === 1 ? ' Fact' : ' Facts') + ' →';
  }
  function loadFactCounts() {
    if (factCountsAsked || !factBankEnabled) return;
    factCountsAsked = true;
    loadPayload('data/fact-bank-data.js').then(() => {
      factCounts = {};
      FACT_BANK.forEach(f => { factCounts[f.paperId] = (factCounts[f.paperId] || 0) + 1; });
      document.querySelectorAll('#cardsGrid .src-row').forEach(paintFactsLink);
    }).catch(() => { factCountsAsked = false; });
  }

  function buildSourceRow(entry) {
    const when = new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    const row  = document.createElement('article');
    row.className = 'src-row';
    row.dataset.entryId = entry.id;
    if (entry.summary) row.dataset.summary = entry.summary.reviewed ? 'reviewed' : 'draft';
    // The facts link sits beside the toggle, not inside it: a link cannot live in a button.
    row.innerHTML = `
      <div class="src-head">
        <button class="src-toggle" type="button" aria-expanded="false" aria-controls="srcBody-${entry.id}">
          <span class="ui-chevron sm right" aria-hidden="true"></span>
          <span class="src-main">
            <span class="src-title">${entry.title}</span>
            <span class="src-meta">${sourceByline(entry)} · ${when}</span>
          </span>
        </button>
        <a class="src-facts" href="#fact-bank/${entry.id}" hidden></a>
      </div>
      <div class="src-body" id="srcBody-${entry.id}" hidden></div>`;
    paintFactsLink(row);
    return row;
  }

  /* A paper's summary, as the open row shows it: a one-sentence lede, a body paragraph, and (when the
     paper gives it) a "Take note" paragraph on how much weight the evidence bears, then where the text
     came from and whether anyone has reviewed it. Shape and rules: docs/paper-summaries.md. */
  function summaryBasis(s) {
    const when = d => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    return `Summary written from the ${s.basis}${s.basisNote ? ` (${s.basisNote})` : ''}. ${s.reviewed ? `Reviewed ${when(s.reviewed)}.` : 'Draft, not yet reviewed.'}`;
  }
  function summaryHTML(s, details) {
    return `
      <p class="src-finding src-lede">${escapeHTML(s.lede)}</p>${details || ''}
      <p class="src-para">${escapeHTML(s.body)}</p>
      ${s.note ? `<div class="src-take"><span class="src-take-label">Take note</span><p class="src-para">${escapeHTML(s.note)}</p></div>` : ''}
      <p class="src-basis">${escapeHTML(summaryBasis(s))}</p>`;
  }
  /* What "Copy summary + citation" puts on the clipboard, as the Fact Bank's "Copy fact + citation" does for a
     fact: the text the open row shows (a summary, or the key finding and its takeaways), then the source's
     citation and link. A draft summary says it is a draft, as its row does, so the label travels with the text. */
  function summaryWithCitation(entry) {
    const plain = html => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent.trim(); };
    const s = entry.summary;
    const text = s
      ? [s.lede, s.body, s.note ? 'Take note: ' + s.note : '', summaryBasis(s)].filter(Boolean).join('\n\n')
      : [plain(entry.keyFinding), (entry.takeaways || []).map(x => '- ' + plain(x)).join('\n')].filter(Boolean).join('\n\n');
    return `${text}\n\nSource: ${formatAPAPlain(entry)}`;
  }

  /* The source's own details as a row of pills, in the order the reader asked for: its category, its methodology (a
     paper type such as Peer-Reviewed or Commentary) and its region. The Papers cards carry the row directly under
     their key finding. The pills are the Fact Bank's (.src-chip in cards.css) and, like those, show no label, so each
     one says what it is in a tooltip and, through screen-reader-only text, to assistive technology; data-kind carries
     the same word for the tests. (The Fact Bank's cards had this information as a plain line for a day, and the reader
     asked for it off.) The date is not among them: the byline already gives it. */
  function sourceDetailsHTML(entry) {
    const em  = EVIDENCE_META[getEvidenceType(entry)] || {};
    const geo = GEOGRAPHY_META[entry.geography || 'us'] || GEOGRAPHY_META.us;
    const cat = (CATEGORIES.find(c => c.id === entry.category) || {}).label;
    const pill = (kind, label, cls) => label
      ? `<li class="src-chip${cls ? ' ' + cls : ''}" data-kind="${kind}" title="${kind}"><span class="sr-only">${kind}: </span>${escapeHTML(label)}</li>`
      : '';
    return `<ul class="src-chips" aria-label="Category, methodology and region">
        ${pill('Category', cat, 'src-chip-cat')}${pill('Methodology', em.label)}${pill('Region', geo.label)}
      </ul>`;
  }

  // The open row, top to bottom: the paper's text with its details pills directly under the key finding (or the
  // summary's lede), then its two buttons in one line: Open source, and Copy summary + citation.
  function buildSourceBody(entry) {
    const details = sourceDetailsHTML(entry);
    const takeaways = (entry.takeaways || []).map(t => `<li>${t}</li>`).join('');
    const text = entry.summary
      ? summaryHTML(entry.summary, details)
      : `<p class="src-finding">${entry.keyFinding}</p>${details}${takeaways ? `<ul class="src-takeaways">${takeaways}</ul>` : ''}`;
    return `
      <div class="src-text">${text}</div>
      <div class="src-actions">
        ${entry.sourceUrl ? `<a class="cite-act" href="${entry.sourceUrl}" target="_blank" rel="noopener noreferrer">Open source ↗</a>` : ''}
        <button class="cite-act" type="button" data-fmt="summary">Copy summary + citation</button>
      </div>`;
  }

  // ── render ───────────────────────────────────────────────────
