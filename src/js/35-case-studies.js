  /* ── CASE STUDIES ────────────────────────────────────────────────────────
     Two case studies (California Campaigns, Taxi Drivers) behind one view.
     The nav tabs route to #california and #taxi-drivers; both land on
     setView('case-studies') and differ only by activeCaseStudy, exactly the
     way #research and #changelog share the cards view.

     Content is CASE_STUDIES in data/case-studies-data.js and is authored
     prose, so it is written with innerHTML the way THEMES and POLICY_DATA
     are. Nothing here comes from a URL or a user, so there is nothing to
     escape; if that ever changes, escape at the boundary, not here.

     The California page is a decorative state outline behind a vertical
     timeline. Clicking a timeline point fills the detail panel beside it.
     The map is aria-hidden: it carries no information the timeline does not,
     and announcing a 3 KB path to a screen reader helps nobody. */

  let _csBuilt = {};   // case id -> true once its DOM exists

  // The detail panel renders one event. Sections are omitted rather than left
  // empty, because an empty "Bill" heading reads as missing data.
  function csDetailHTML(ev) {
    const bill = ev.bill ? `
        <div class="cs-detail-section">
          <div class="cs-detail-label">The bill</div>
          <div class="cs-bill">
            <span class="cs-bill-number">${ev.bill.number}</span>
            <span class="cs-bill-author">${ev.bill.author}</span>
          </div>
          <p class="cs-detail-text">${ev.bill.summary}</p>
        </div>` : '';
    const sources = (ev.sources && ev.sources.length) ? `
        <div class="cs-detail-section">
          <div class="cs-detail-label">Sources</div>
          <ul class="cs-sources">
            ${ev.sources.map(s => `<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.label}</a></li>`).join('')}
          </ul>
        </div>` : '';
    // An event with no public source is from the internal retreat deck. Say so
    // on the card rather than letting it sit next to sourced rows looking the
    // same; see the header comment in data/case-studies-data.js.
    const provenance = ev.origin === 'deck' ? `
        <p class="cs-provenance">Internal: All Staff Retreat 2026 deck. Not published, not externally verified.</p>` :
      ev.origin === 'mixed' ? `
        <p class="cs-provenance">Media figures from the internal All Staff Retreat 2026 deck; the veto and its reasoning are public.</p>` : '';
    return `
      <div class="cs-detail-head">
        <div class="cs-detail-date">${ev.dateLabel}${ev.upcoming ? ' <span class="cs-upcoming">upcoming</span>' : ''}</div>
        <h3 class="cs-detail-title">${ev.title}</h3>
        ${ev.kicker ? `<div class="cs-detail-kicker">${ev.kicker}</div>` : ''}
      </div>
      ${bill}
      <div class="cs-detail-section">
        <div class="cs-detail-label">What happened</div>
        <p class="cs-detail-text">${ev.what}</p>
      </div>
      <div class="cs-detail-section">
        <div class="cs-detail-label">ESP&rsquo;s role</div>
        <p class="cs-detail-text">${ev.role}</p>
      </div>
      ${sources}
      ${provenance}`;
  }

  function csSelect(area, id) {
    const study = CASE_STUDIES.california;
    const ev = study.events.find(e => e.id === id);
    if (!ev) return;
    area.querySelectorAll('.cs-event').forEach(b => {
      const on = b.dataset.eventId === id;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    const panel = area.querySelector('#csDetail');
    if (panel) panel.innerHTML = csDetailHTML(ev);
  }

  function buildCalifornia(study) {
    const phases = {};
    study.phases.forEach(p => { phases[p.id] = p; });
    // Group events under their phase heading, in data order. The data file is
    // already chronological, so this neither sorts nor reorders: it only
    // inserts a heading when the phase changes.
    let seen = null;
    const rows = study.events.map(ev => {
      let head = '';
      if (ev.phase !== seen) {
        seen = ev.phase;
        const p = phases[ev.phase];
        head = p ? `<li class="cs-phase"><span class="cs-phase-label">${p.label}</span><span class="cs-phase-span">${p.span}</span></li>` : '';
      }
      return head + `
        <li class="cs-row">
          <button type="button" class="cs-event${ev.upcoming ? ' cs-event--upcoming' : ''}"
                  data-event-id="${ev.id}" aria-pressed="false">
            <span class="cs-event-date">${ev.dateLabel}</span>
            <span class="cs-event-title">${ev.title}</span>
          </button>
        </li>`;
    }).join('');

    return `
      <div class="cs-stage">
        <svg class="cs-map" viewBox="${study.map.viewBox}" aria-hidden="true" focusable="false"
             preserveAspectRatio="xMidYMid meet">
          <path d="${study.map.d}"/>
        </svg>
        <div class="cs-timeline-col">
          <ol class="cs-timeline">${rows}</ol>
        </div>
        <div class="cs-detail-col">
          <div class="cs-detail" id="csDetail" aria-live="polite"></div>
        </div>
      </div>`;
  }

  function buildTaxi(study) {
    return `
      <div class="cs-tk">
        <div class="cs-tk-mark">TK</div>
        <p class="cs-tk-note">${study.tkNote}</p>
      </div>`;
  }

  /* Build on first open and cache. The California page is ~15 KB of DOM and
     neither case depends on filters or lens, so there is nothing to
     invalidate: unlike the cards view this never needs a re-render. */
  function buildCaseStudies() {
    const study = CASE_STUDIES[activeCaseStudy] || CASE_STUDIES.california;
    const area  = document.getElementById('caseStudiesArea');
    if (!area) return;
    document.getElementById('csLede').innerHTML = study.lede;
    document.getElementById('csStandfirst').innerHTML = study.standfirst;
    const body = document.getElementById('csBody');
    if (!body) return;
    if (_csBuilt.id !== study.id) {
      body.innerHTML = study.tk ? buildTaxi(study) : buildCalifornia(study);
      _csBuilt.id = study.id;
      // Open on the first event so the detail panel is never an empty box.
      if (!study.tk && study.events.length) csSelect(area, study.events[0].id);
    }
  }

  /* Sets the sub-case and nothing else. It does NOT toggle the two nav
     buttons: activeTabIdFor() in 70-render.js owns that, and setView() always
     runs after this (both the router's `enter` and the nav click handler call
     them in that order). Two writers for one piece of DOM is the bug the
     applyMastheadCopy note in 70-render.js records; don't reintroduce it. */
  function setCaseStudy(which) {
    activeCaseStudy = (which === 'taxi') ? 'taxi' : 'california';
    if (activeView === 'case-studies') buildCaseStudies();
  }

  // One delegated listener, like the view nav. Timeline points are buttons, so
  // Enter and Space already work; this only has to find which one was hit.
  document.addEventListener('click', e => {
    const btn = e.target.closest('.cs-event');
    if (!btn) return;
    const area = document.getElementById('caseStudiesArea');
    if (area) csSelect(area, btn.dataset.eventId);
  });
