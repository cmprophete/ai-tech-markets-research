  /* ── PROTOTYPES ──────────────────────────────────────────────────────────
     The workbench tab. Lists every sketch in PROTOTYPES and opens one at a
     time in an iframe.

     WHY AN IFRAME, not inlined markup: each prototype is a whole document
     with its own <style>, and several predate the current token set. Eleven
     of them inlined into index.html would collide on class names and on
     cascade order, and the cascade order here is load-bearing (see the note
     in CONTRIBUTING.md). An iframe gives each one the document it already
     assumes it has.

     The frames are created on demand rather than up front: the eleven
     prototypes pull several megabytes of payload between them, and the app
     should not pay that to render a list of links. That is also why the
     iframe carries no loading="lazy" -- it only exists once the reader has
     asked for it, so there is nothing left to defer, and the attribute on a
     freshly inserted below-the-fold frame left it parked on about:blank. */

  let _protoBuilt = false;

  function protoCardHTML(p, i) {
    const stale = p.status === 'stale';
    return `<article class="proto-card${stale ? ' proto-card--stale' : ''}">
        <div class="proto-card-head">
          <span class="proto-eyebrow">${p.eyebrow}</span>
          <span class="proto-status proto-status--${p.status}">${stale ? 'Stale' : 'Runs'}</span>
        </div>
        <h3 class="proto-title">${p.title}</h3>
        <p class="proto-desc">${p.desc}</p>
        ${p.why ? `<p class="proto-why">${p.why}</p>` : ''}
        <div class="proto-actions">
          <button type="button" class="proto-open" data-proto="${i}">Open here</button>
          <a class="proto-new" href="${p.file}" target="_blank" rel="noopener noreferrer">New tab</a>
        </div>
      </article>`;
  }

  function buildPrototypes() {
    const area = document.getElementById('prototypesArea');
    if (!area || _protoBuilt) return;
    const ok = PROTOTYPES.filter(p => p.status !== 'stale').length;
    document.getElementById('protoBody').innerHTML = `
      <p class="proto-count">${PROTOTYPES.length} prototypes &middot; ${ok} run against today&rsquo;s data &middot; ${PROTOTYPES.length - ok} are stale and say why</p>
      <div class="proto-grid">${PROTOTYPES.map(protoCardHTML).join('')}</div>
      <div class="proto-stage" id="protoStage" hidden></div>`;
    _protoBuilt = true;
  }

  function protoOpen(i) {
    const p = PROTOTYPES[+i];
    const stage = document.getElementById('protoStage');
    if (!p || !stage) return;
    stage.hidden = false;
    stage.innerHTML = `
      <div class="proto-stage-bar">
        <span class="proto-stage-title">${p.title}</span>
        <span class="proto-stage-file">${p.file}</span>
        <button type="button" class="proto-stage-close" data-proto-close>Close</button>
      </div>
      <iframe class="proto-frame" src="${p.file}" title="${p.title}"></iframe>`;
    document.querySelectorAll('.proto-open').forEach(b =>
      b.classList.toggle('active', b.dataset.proto === String(i)));
    stage.scrollIntoView({ block: 'nearest' });
  }

  document.addEventListener('click', e => {
    const open = e.target.closest('.proto-open');
    if (open) { protoOpen(open.dataset.proto); return; }
    if (e.target.closest('[data-proto-close]')) {
      const stage = document.getElementById('protoStage');
      if (stage) { stage.hidden = true; stage.innerHTML = ''; }
      document.querySelectorAll('.proto-open').forEach(b => b.classList.remove('active'));
    }
  });
