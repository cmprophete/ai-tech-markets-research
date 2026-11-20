  /* ── AGENDA: Becky Chao's brief ───────────────────────────────────────────────────────────────────────────────────
     The Brief tab (its view key and every internal name still say agenda; it was called Agenda until 2026-11-19) is an excerpt of "Ideas for Shared Economic Prosperity in the AI Transition" (Becky Chao, April 2026), drawn from
     data/agenda-data.js. That file's header says what in it is the brief's (the text and the sources, character for character,
     less the cut it names) and what is ours (the short pathway names, the opening line an idea shows while closed, the "On the Landscape"
     pointers). This script changes no word of it: text goes through escapeHTML and the three marks of the data's tiny markup
     (**bold**, *italic*, [^n] for footnote mark n) and nothing else, and the tests compare what the page shows with the data.

     What a reader can do here, and why each is on the page:
       - Open an idea. The brief is long, so each idea is an accordion row that shows its title and its own first sentence
         while closed. There is no expand-all control (the owner had it taken out, 2026-11-19), so, as in any accordion, closed
         text is out of reach of the browser's find-in-page until it is opened.
       - Be sent to a part of it: every section has an address (#brief/<id>: a pathway, an idea or
         sources), so one can be linked to or opened in a new tab; the router opens the idea if it is one and scrolls there, and a
         plain click on an in-page link (a source drawer's "All sources") scrolls and rewrites the address bar in place
         (replaceState), as the rest of the app does, instead of piling up history. There is no nav of them: with the ideas
         closed the page is short, and the other reading page (About) has none. A bar of jump pills was built here on 2026-11-19
         and taken out the same day, when the owner asked whether a nav was needed at all.
       - See a source without leaving the sentence: a footnote number is a button that opens that note in a drawer right under
         its paragraph (not a floating tooltip, which cannot be reached by keyboard or tapped reliably on a phone). One drawer is
         open at a time; Escape closes it. The Sources list at the end holds all of them, each with a link back to its passage.
       - Open a policy card from the Landscape that covers the same ground (the dialog opens over this page).

     Drawn once, on first open (setView calls buildAgenda); every name here starts ag or agenda because the whole app shares one
     scope. The router's #brief/<id> route calls agendaGo; the masthead's standfirst is agendaMasthead (TAB_DESCS.agenda). */
  let agBuilt = false;
  let agFlashTimer = 0;

  function agData() {
    return (typeof AGENDA_DATA !== 'undefined' && AGENDA_DATA && Array.isArray(AGENDA_DATA.pathways) && AGENDA_DATA.notes) ? AGENDA_DATA : null;
  }
  function agCounts(a) {
    return { pathways: a.pathways.length, ideas: a.pathways.reduce((n, p) => n + p.ideas.length, 0), sources: Object.keys(a.notes).length };
  }
  // The masthead's standfirst, under the question (TAB_DESCS.agenda.lede in 70-render.js). It is the owner's own sentence (2026-11-19: "Pulled from Becky Chao's April 2026 brief, <title> (link: <url>), below are four
  // pathways, from modernizing the social contract to mitigating AI's role in exacerbating the affordability crisis. Open an idea to read it, and any footnote number to see its source."): the brief's title is the link to
  // the whole paper (the data's `url`; without one it is plain text). The count of pathways is computed from the data, never typed (the rule every masthead here follows). There is no count of ideas or sources: the owner has
  // kept counts out of mastheads before (the Landscape's, 2026-11-18), and the page shows them where they are used (the Sources row). The two ends of the range are the brief's own words for its first and last pathway.
  // It comes in two forms that say the same thing: the text, and the html that holds the link (applyMastheadCopy writes the html).
  const agWhen = a => a.date ? a.date.charAt(0) + a.date.slice(1).toLowerCase() : '';   // "APRIL 2026" in the data, "April 2026" in a sentence
  function agendaMasthead() {
    const a = agData();
    if (!a) return 'Coming soon.';
    const when = agWhen(a);
    return `Pulled from ${a.author}\u2019s${when ? ' ' + when : ''} brief, ${a.title}, below are ${spellNumber(a.pathways.length)} pathways, from modernizing the social contract to mitigating AI\u2019s role in exacerbating the affordability crisis. `
      + 'Open an idea to read it, and any footnote number to see its source.';
  }
  function agendaMastheadHTML() {
    const a = agData();
    if (!a) return 'Coming soon.';
    const when = agWhen(a);
    const title = a.url ? `<a href="${escapeHTML(a.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(a.title)}</a>` : escapeHTML(a.title);
    return `Pulled from ${escapeHTML(a.author)}&rsquo;s${when ? ' ' + escapeHTML(when) : ''} brief, ${title}, below are ${spellNumber(a.pathways.length)} pathways, from modernizing the social contract to mitigating AI&rsquo;s role in exacerbating the affordability crisis. `
      + 'Open an idea to read it, and any footnote number to see its source.';
  }

  // ── the data's markup → HTML ───────────────────────────────────────────────
  // Escape first, then turn the marks into tags: the text holds "&" and quotes but never an asterisk or a "[^" of its own (the data file's tests check that).
  function agInline(text) {
    return escapeHTML(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\[\^(\d+)\]/g, (m, n) => `<button type="button" class="ag-ref" data-note="${n}" aria-expanded="false" aria-label="Source ${n}">${n}</button>`);
  }
  // A note: plain text with *italics*, and every URL in it a link, as in the PDF. A URL ends before the full stop, comma or semicolon that follows it.
  function agNote(text) {
    return escapeHTML(text)
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/https?:\/\/[^\s<]+/g, u => {
        const m = /^(.*?)([.,;]*)$/.exec(u);
        return `<a href="${m[1]}" target="_blank" rel="noopener noreferrer">${m[1]}</a>${m[2]}`;
      });
  }
  // Each pathway wears the colour of the Landscape area it is: the Landscape's four rows are these four pathways, in this order (see the note on .pol-cat-rows).
  const agColor = areaId => (typeof CAT_COLOR_VARS !== 'undefined' && CAT_COLOR_VARS[areaId]) || 'var(--muted)';

  // "On the Landscape": the policy cards that cover the same ground, as buttons that open the card. A card that is gone (archived, renamed) is left out, and a row with none is not drawn.
  function agRelatedHTML(ids) {
    const cards = (ids || []).map(id => POLICY_DATA.find(p => p.id === id)).filter(Boolean);
    if (!cards.length) return '';
    return '<div class="ag-related"><span class="ag-kicker">On the Landscape</span><span class="ag-pols">'
      + cards.map(p => {
        const area = policyAreaOf(p);
        return `<button type="button" class="ag-pol" data-pol="${escapeHTML(p.id)}" style="--cat-color:${area ? agColor(area.id) : 'var(--muted)'}"><span class="ag-dot" aria-hidden="true"></span>${escapeHTML(p.title)}</button>`;
      }).join('')
      + '</span></div>';
  }
  function agBlocksHTML(blocks) {
    return blocks.map(b => {
      if (b.p) return `<p class="ag-p">${agInline(b.p)}</p>`;
      if (b.list) {
        return '<ul class="ag-list">' + b.list.map(it =>
          `<li class="ag-li"><p class="ag-li-text"><strong class="ag-lead">${escapeHTML(it.lead)}</strong> ${agInline(it.text)}</p>${agRelatedHTML(it.related)}</li>`).join('') + '</ul>';
      }
      return '';
    }).join('');
  }
  function agIdeaHTML(idea) {
    const id = escapeHTML(idea.id);
    return `<article class="ag-idea" id="ag-${id}" data-ag="${id}" data-ag-kind="idea">`
      + `<h3 class="ag-idea-h"><button type="button" class="ag-idea-btn" aria-expanded="false" aria-controls="ag-${id}-body">`
      + `<span class="ag-idea-text"><span class="ag-idea-title">${escapeHTML(idea.title)}</span><span class="ag-idea-lede">${escapeHTML(idea.lede)}</span></span>`
      + '<span class="ui-chevron ag-chev" aria-hidden="true"></span></button></h3>'
      + `<div class="ag-idea-body" id="ag-${id}-body" hidden>${agBlocksHTML(idea.blocks)}${agRelatedHTML(idea.related)}</div></article>`;
  }
  function agPathwayHTML(p, k) {
    const id = escapeHTML(p.id);
    return `<section class="ag-section ag-pathway" id="ag-${id}" data-ag="${id}" style="--cat-color:${agColor(p.area)}" aria-labelledby="ag-${id}-h">`
      + `<h2 class="ag-h" id="ag-${id}-h"><span class="ag-num" aria-hidden="true">${k + 1}</span><span>${escapeHTML(p.title)}</span></h2>`
      + `<div class="ag-ideas">${p.ideas.map(agIdeaHTML).join('')}</div></section>`;
  }
  // The Sources list is one more accordion row, so the end of a long page does not open on 57 paragraphs of citations.
  function agSourcesHTML(a) {
    const nums = Object.keys(a.notes).map(Number).sort((x, y) => x - y);
    const items = nums.map(n => `<li class="ag-note" id="ag-note-${n}"><span class="ag-note-n" aria-hidden="true">${n}</span><div class="ag-note-main">`
      + `<div class="ag-note-text">${agNote(a.notes[n])}</div><button type="button" class="ag-back" data-note="${n}" aria-label="See source ${n} in the text">See in the text</button></div></li>`).join('');
    return '<section class="ag-section" id="ag-sources" data-ag="sources" aria-labelledby="ag-sources-h"><h2 class="ag-h" id="ag-sources-h">Sources</h2>'
      + '<article class="ag-idea ag-sources-card" id="ag-sources-card" data-ag-kind="sources">'
      + '<h3 class="ag-idea-h"><button type="button" class="ag-idea-btn" aria-expanded="false" aria-controls="ag-sources-body">'
      + `<span class="ag-idea-text"><span class="ag-idea-title">All ${nums.length} sources</span><span class="ag-idea-lede">Every footnote in the brief, in order. Each one links back to the passage that cites it.</span></span>`
      + '<span class="ui-chevron ag-chev" aria-hidden="true"></span></button></h3>'
      + `<div class="ag-idea-body" id="ag-sources-body" hidden><ol class="ag-notes" role="list">${items}</ol></div></article></section>`;
  }
  function buildAgenda() {
    const root = document.getElementById('agendaRoot');
    if (!root) return;
    if (agBuilt) return;
    const a = agData();
    if (!a) return;                       // the note in the markup stays
    agBuilt = true;
    root.innerHTML = '<div class="ag-body">' + a.pathways.map(agPathwayHTML).join('') + agSourcesHTML(a) + '</div>';
    root.addEventListener('click', agClick);
    root.addEventListener('keydown', agKey);
  }

  // ── doing things ───────────────────────────────────────────────────────────
  function agScrollTo(el, block) {
    if (!el || typeof el.scrollIntoView !== 'function') return;
    const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: block || 'start' });
  }
  function agFlash(el) {
    const root = document.getElementById('agendaRoot');
    if (!root || !el) return;
    clearTimeout(agFlashTimer);
    root.querySelectorAll('.ag-flash').forEach(x => x.classList.remove('ag-flash'));
    el.classList.add('ag-flash');
    agFlashTimer = setTimeout(() => el.classList.remove('ag-flash'), 1800);
  }
  function agSetOpen(art, open) {
    if (!art) return;
    const btn = art.querySelector('.ag-idea-btn'), body = art.querySelector('.ag-idea-body');
    if (!btn || !body) return;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    body.hidden = !open;
    art.classList.toggle('is-open', open);
    if (!open) agCloseSources(art);       // a source cannot stay open under a paragraph that is no longer there
  }

  // Sources: one drawer open at a time, created the first time its number is pressed, under the paragraph (or list item) that cites it.
  function agCloseSources(within) {
    const root = document.getElementById('agendaRoot');
    if (!root) return;
    (within || root).querySelectorAll('.ag-source').forEach(box => { box.hidden = true; });
    (within || root).querySelectorAll('.ag-ref[aria-expanded="true"]').forEach(r => r.setAttribute('aria-expanded', 'false'));
  }
  function agToggleSource(ref) {
    const a = agData();
    if (!a) return;
    const n = ref.dataset.note, wasOpen = ref.getAttribute('aria-expanded') === 'true';
    agCloseSources();
    if (wasOpen || !a.notes[n]) return;
    let box = document.getElementById('ag-src-' + n);
    if (!box) {
      box = document.createElement('div');
      box.className = 'ag-source';
      box.id = 'ag-src-' + n;
      box.setAttribute('role', 'note');
      box.innerHTML = `<div class="ag-source-head"><span class="ag-kicker">Source ${n}</span><button type="button" class="about-link ag-source-close">Close</button></div>`
        + `<div class="ag-source-text">${agNote(a.notes[n])}</div><a class="ag-source-all ag-go" href="#brief/sources" data-go="sources">All sources</a>`;
      (ref.closest('.ag-p, .ag-li-text') || ref).insertAdjacentElement('afterend', box);
    }
    box.hidden = false;
    ref.setAttribute('aria-expanded', 'true');
    ref.setAttribute('aria-controls', box.id);
  }
  // From the Sources list back to the passage: open its idea, open the source, bring the paragraph into view and mark it for a moment.
  function agShowRef(n) {
    const ref = document.querySelector('#agendaRoot .ag-ref[data-note="' + n + '"]');
    if (!ref) return;
    const art = ref.closest('.ag-idea');
    if (art) agSetOpen(art, true);
    agCloseSources();
    agToggleSource(ref);
    const block = ref.closest('.ag-p, .ag-li-text') || ref;
    agScrollTo(block, 'center');
    agFlash(block);
    ref.focus({ preventScroll: true });
  }

  // The router's #brief/<id>, and the one in-page link (a source drawer's "All sources"). An id is a pathway, an idea or "sources"; anything else returns '' (a stale link),
  // and the caller decides what the address bar says. { quiet: true } leaves the address bar to the router, which is already rewriting it.
  function agendaGo(id, opts) {
    if (!/^[a-z0-9-]+$/.test(id || '')) return '';
    buildAgenda();
    const root = document.getElementById('agendaRoot');
    const el = agBuilt && root.querySelector('[data-ag="' + id + '"]');
    if (!el) return '';
    if (el.dataset.agKind === 'idea') agSetOpen(el, true);
    if (id === 'sources') agSetOpen(root.querySelector('#ag-sources-card'), true);
    agScrollTo(el, 'start');
    if (!(opts && opts.quiet)) history.replaceState(null, '', '#brief/' + id);
    return id;
  }

  function agClick(e) {
    const t = e.target;
    const go = t.closest('.ag-go');
    if (go) {
      // A modified click (a new tab, a new window) keeps the anchor's own address.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
      e.preventDefault();
      agendaGo(go.dataset.go);
      return;
    }
    const ref = t.closest('.ag-ref');
    if (ref) { agToggleSource(ref); return; }
    const shut = t.closest('.ag-source-close');
    if (shut) {
      const box = shut.closest('.ag-source'), ref2 = box && document.querySelector('#agendaRoot .ag-ref[aria-controls="' + box.id + '"]');
      agCloseSources();
      if (ref2) ref2.focus();
      return;
    }
    const head = t.closest('.ag-idea-btn');
    if (head) { const art = head.closest('.ag-idea'); agSetOpen(art, !art.classList.contains('is-open')); return; }
    const pol = t.closest('.ag-pol');
    if (pol) { openPolModalById(pol.dataset.pol); return; }
    const back = t.closest('.ag-back');
    if (back) agShowRef(+back.dataset.note);
  }
  function agKey(e) {
    if (e.key !== 'Escape') return;
    const box = document.querySelector('#agendaRoot .ag-source:not([hidden])');
    if (!box) return;
    const ref = document.querySelector('#agendaRoot .ag-ref[aria-controls="' + box.id + '"]');
    agCloseSources();
    if (ref) ref.focus();
  }
