  /* ── Landscape: Copy Draft and Print ──────────────────────────────────────────────────────────────────────────────────────────
     Two buttons on the row of the Links view and of the Compare view (the owner, 2026-11-24: 'Add "Add", "Copy Draft", and "Print" buttons', on Links and Compare). They act on what is on screen: on Links the policy in the
     middle, on Compare the two being compared, Policy A and then Policy B (once, when both menus say the same policy).

     * Copy Draft copies them as one Markdown document: each policy as the dialog's own "Copy as draft" writes it (policyToMarkdown, 20-cite-export.js), a horizontal rule between two. On Links, with one policy, it
       is exactly what that button copies.
     * Print prints them, or saves them as a PDF: each policy from a page of its own, in the dialog's own words and type (the dialog's Print prints the one policy that is open; this prints the one or two on screen).

     An Add button, which put the policy on screen into a draft kept in the page, shared by the two views and counted beside the buttons, was built first, and the owner took it out again the same day ("remove the add button"). What is
     left has nothing to keep: no list, no count, nothing that can be empty, so both buttons are always on.

     Nothing here is made up: every word is the card's own, through the same two functions the dialog uses (policyToMarkdown for the copy, injectPolicyLinks for the print), so no card is reworded, shortened or reordered. The
     print sheet is hidden on the screen and shown only for printing (policy.css), when everything else on the page is hidden, as the dialog's Print does for the dialog. */
  const polDraftLive = id => typeof id === 'string' && POLICY_DATA.some(p => p.id === id);

  // The two buttons, for a view to put in its own alphabetical place among its pills (Back, Copy Draft, Copy link, Print, Randomize, Refresh); `view` is the view's id prefix (polLinksCopyDraft, polCmpPrint) and
  // `title` says what the button does there.
  function polDraftPill(kind, view, title) {
    return kind === 'copy'
      ? `<button class="kw-pill" type="button" id="pol${view}CopyDraft" title="${escapeHTML(title)}">Copy Draft</button>`
      : `<button class="kw-pill" type="button" id="pol${view}Print" title="${escapeHTML(title)}">Print</button>`;
  }

  // The policies on screen, each once, in the order they are read; `ids` is the view's own answer (the one in the middle, or the two compared) and an id that is no policy is left out.
  const polDraftOnScreen = ids => ids().filter((id, i, all) => polDraftLive(id) && all.indexOf(id) === i);

  // Copy Draft: each policy as the dialog's "Copy as draft" writes it (it ends with a newline), a blank line, a rule and a blank line between two.
  function polDraftText(ids) { return ids.map(id => policyToMarkdown(polCmpPolicy(id))).join('\n---\n\n'); }

  // One policy on the print sheet: its name and area, then its sections in the dialog's order, in the dialog's classes (so the type is the dialog's), each only if the card has it, and a line at the foot saying when the Google Doc
  // behind it was last updated (when it has one) and where it is on the site. Strengths and Risks follow one another, where the dialog sets them side by side.
  function polDraftDocHTML(p) {
    const paperMap = Object.fromEntries([...RESEARCH_DATA, ...POLICY_SOURCES].map(r => [r.id, r]));
    const area = policyAreaOf(p);
    const section = (label, body) => body ? `<div class="pol-modal-section"><div class="pol-modal-label">${label}</div>${body}</div>` : '';
    const text = (label, s) => section(label, s ? `<div class="pol-modal-text">${injectPolicyLinks(s, paperMap)}</div>` : '');
    const list = (label, arr) => section(label, (Array.isArray(arr) && arr.length) ? `<ul class="pol-modal-list">${arr.map(item => `<li>${injectPolicyLinks(item, paperMap)}</li>`).join('')}</ul>` : '');
    const updated = p.docUpdated ? 'Last updated ' + new Date(p.docUpdated + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) + '. ' : '';
    return `<section class="pol-draft-doc"><h1 class="pol-draft-title">${escapeHTML(p.title)}</h1>${area ? `<div class="pol-draft-area">${escapeHTML(area.label)}</div>` : ''}`
      + text('What it is', p.summary) + text('The challenge', p.rationale) + list('Strengths', p.strengths) + list('Risks', p.risks) + text('Precedents &amp; landscape', p.landscape) + list('References', p.references)
      + `<div class="pol-draft-foot">${updated}${escapeHTML(appURL('policy/' + p.id))}</div></section>`;
  }

  // Print: the sheet is filled and shown for printing (the class, which only the print styles in policy.css read), then the browser's print dialog opens; the afterprint handler below puts everything back.
  function polDraftPrint(ids) {
    if (!ids.length) return;
    let sheet = document.getElementById('polDraftSheet');
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.id = 'polDraftSheet';
      sheet.className = 'pol-draft-sheet';
      document.body.appendChild(sheet);
    }
    sheet.innerHTML = ids.map(id => polDraftDocHTML(polCmpPolicy(id))).join('');
    document.body.classList.add('pol-draft-printing');
    window.print();
  }
  // Registered once, at load: a browser fires it when the print dialog closes, whether the page was printed or not, and for the dialog's own Print too (where it changes nothing).
  window.addEventListener('afterprint', () => {
    document.body.classList.remove('pol-draft-printing');
    const sheet = document.getElementById('polDraftSheet');
    if (sheet) sheet.innerHTML = '';
  });

  // A view calls this once its row is built: `ids` says which policies are on screen (the one in the middle, or the two compared), asked at the moment of the press.
  function polDraftWire(view, ids) {
    document.getElementById(`pol${view}CopyDraft`).addEventListener('click', e => { const on = polDraftOnScreen(ids); if (on.length) copyText(polDraftText(on), e.currentTarget); });
    document.getElementById(`pol${view}Print`).addEventListener('click', () => polDraftPrint(polDraftOnScreen(ids)));
  }
