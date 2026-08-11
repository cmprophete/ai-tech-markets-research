#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   interactions.js — clicking and keyboard, which the route snapshot cannot see.

       node tests/interactions.js

   tests/routes.js loads each URL and pins the result, so it proves routing.
   It says nothing about what happens when a reader actually clicks something,
   and the router refactor replaced six per-button click listeners with one
   delegated listener plus data-view attributes. A typo in an attribute would
   leave every route green and every button dead. Hence this file.
   ═══════════════════════════════════════════════════════════════════════════ */
const { load, settle } = require('./dom.js');

let failed = 0;
const ok = (name, cond, detail) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (cond || !detail ? '' : '\n           ' + detail));
  if (!cond) failed++;
};

const click = (w, d, id) => {
  const el = d.getElementById(id);
  if (!el) throw new Error('no element #' + id);
  el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
};
const bodyView = d => (d.body.className.match(/([\w-]+)-view/) || [])[1] || null;

/* ── the view nav ─────────────────────────────────────────────────────── */
{
  const { w, d } = load('index.html', '#about');
  const cases = [
    ['viewCards', 'cards', '#research'],
    ['viewFactBank', 'fact-bank', '#fact-bank'],
    ['viewPolicy', 'policy', '#policy'],
    ['viewSolutions', 'solutions', '#solutions'],
  ];
  for (const [id, view, hash] of cases) {
    click(w, d, id);
    ok(`click #${id} -> ${view} view`, bodyView(d) === view, `body view was ${bodyView(d)}`);
    ok(`click #${id} -> hash ${hash}`, w.location.hash === hash, `hash was ${w.location.hash}`);
    const btn = d.getElementById(id);
    ok(`click #${id} -> button marked active`,
       btn.classList.contains('active') && btn.getAttribute('aria-selected') === 'true');
  }
}

/* Clicking Papers must reset the research sub-view, but routing to #changelog
   must not. Both go through setView('cards'), so this is the pair that keeps
   the reset on the click rather than in the view switch. */
{
  const { w, d } = load('index.html', '#changelog');
  ok('#changelog opens the changelog sub-view',
     d.body.classList.contains('changelog-subview'));
  click(w, d, 'viewCards');
  ok('clicking Papers leaves the changelog sub-view',
     !d.body.classList.contains('changelog-subview'));
  ok('clicking Papers writes #research', w.location.hash === '#research', w.location.hash);
}

/* ── lazy payload ───────────────────────────────────────────────────────────
   The Fact Bank data is fetched on first open rather than at page load. Assert
   both halves: absent at load, and present and rendered after the view is
   opened. Without the disk interceptor in dom.js this would silently no-op, so
   the "absent at load" half guards against a test that passes for the wrong
   reason. */
(async () => {
  const { w, d, errors } = load('index.html', '#about');

  ok('Fact Bank payload is NOT loaded at page load', typeof w.FACT_BANK_LOADED === 'undefined' &&
     d.getElementById('byPaperView').children.length === 0);
  ok('Fact Bank tab is present anyway (enabled optimistically)', !!d.getElementById('viewFactBank'));

  click(w, d, 'viewFactBank');
  await settle(10);
  ok('opening Fact Bank fetches its payload and builds the view',
     d.getElementById('byPaperView').children.length > 0,
     'byPaperView children: ' + d.getElementById('byPaperView').children.length);
  ok('Fact Bank tab survives the lazy load', !!d.getElementById('viewFactBank'));
  ok('no console errors across the lazy paths', errors.length === 0, errors[0]);

  console.log(failed ? `\ninteractions.js: ${failed} FAILING` : '\ninteractions.js: all interactions pass');
  process.exit(failed ? 1 : 0);
})();
