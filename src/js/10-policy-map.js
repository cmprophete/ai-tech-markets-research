  /* ── Policy Map ─────────────────────────────────────────────── */
  let polLevelFilter = 'all';
  let polViewMode    = 'grid';

  // APA-style citation: Author. (Year). Title. Organization.
  // The `source` field stores "Author — Organization"; a bare organization stands alone.
  function formatAPACitation(p) {
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

  // Inline citations: {{cite:ID}} renders a hyperlinked (Year) after an author
  // named in the prose; {{citep:ID}} renders a parenthetical (Author, Year).
  function injectCitations(html, paperMap) {
    if (!html) return html;
    return html.replace(/ ?\{\{(citep?):([\w-]+)\}\}/g, (m, kind, id) => {
      const p = paperMap[id];
      if (!p || !p.sourceUrl) return '';
      const year = p.date ? p.date.slice(0, 4) : 'n.d.';
      let label = year;
      if (kind === 'citep') {
        const authorPart = (p.source || '').split(' — ')[0].trim();
        const author = authorPart.includes(',')
          ? authorPart.split(',')[0].trim() + ' et al.'
          : authorPart;
        label = `${author}, ${year}`;
      }
      const aria = `${(p.source || '').replace(/\s*—\s*/g, ', ')}, ${year}. Opens in new tab.`.replace(/"/g, '&quot;');
      return ` (<a class="syn-cite" href="${p.sourceUrl}" target="_blank" rel="noopener noreferrer" aria-label="${aria}">${label}</a>)`;
    });
  }

  // Policy prose links. Runs inline paper citations ({{cite}}/{{citep}}), then
  // resolves cross-reference tokens {{pol:id|text}} into inline links that open
  // the named policy's modal. Tokens with no matching policy degrade to plain text.
  function injectPolicyLinks(html, paperMap) {
    if (!html) return html;
    return injectCitations(html, paperMap)
      .replace(/\{\{pol:([a-z0-9-]+)\|([^}]+)\}\}/g, (m, id, text) => {
        const target = POLICY_DATA.find(p => p.id === id);
        if (!target) return text;
        return `<a class="pol-xref" data-pol-id="${id}" role="link" tabindex="0" title="See policy: ${target.title.replace(/"/g, '&quot;')}">${text}</a>`;
      });
  }

  // Open a policy modal given only its id (used by cross-reference links).
  function openPolModalById(id) {
    const p = POLICY_DATA.find(x => x.id === id);
    if (!p) return;
    openPolModal(p);
  }

