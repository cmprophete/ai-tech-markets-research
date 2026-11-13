#!/usr/bin/env python3
"""Read a legislature's own summary of a state bill from its own website, for the bills Open States gives no summary for, into
content/legislation-state-summaries.json, which tools/legislation.py merges into the bills.

    python3 tools/state_summaries.py                       # every state with a reader below, every bill that still has no summary
    python3 tools/state_summaries.py --only IL --limit 5   # a trial
    python3 tools/state_summaries.py --refresh             # read again what was read before
    python3 tools/state_summaries.py --dry-run             # say what would be read, fetch nothing

Why. Open States carries a legislature's own abstract for most states, but for Illinois and New Jersey it carries none, so their bills showed a dash for a
summary, and their titles alone say little ("AI-MEANINGFUL HUMAN REVIEW"). Both legislatures publish a summary of each bill on their own sites (as does Maryland,
whose bills Open States gives only a short title). This reads exactly that, as the legislature wrote it (the first 1,200 characters of it here, and tools/legislation.py shows the first 450, as it does for every state's summary):
  Illinois    the "Synopsis As Introduced" on the bill's status page on ilga.gov (the page the table's Source column already links to)
  New Jersey  the STATEMENT at the end of the introduced text, at pub.njleg.state.nj.us (the legislature's own explanation of its bill)
  Maryland    the "Synopsis" line on the bill's page on mgaleg.maryland.gov
Nothing here is written by us. A state without a reader keeps its dash, because a summary made up from a title or two would be a guess. To add a state, write
a reader (a function from a bill row to (text, what it is, where it was read), or None when the page has none) and list it in READERS.

Etiquette: pages are fetched one at a time, about a second and a half apart, with the browser-style User-Agent the other tools use, and each page is kept in
~/.cache/ai-tracker/statesummaries, so a re-run costs nothing. The folder is outside the repository.
"""
import argparse
import datetime
import hashlib
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
OUT = os.path.join(ROOT, 'content', 'legislation-state-summaries.json')
sys.path.insert(0, HERE)
import legislation as L   # noqa: E402  (the bill rows, and which Open States searches are finished)

SPACING = 1.5
KEEP = 1200   # characters kept of a legislature's text (cut at a word, ending in an ellipsis); the page shows fewer (CAP in tools/legislation.py)
CACHE = os.path.expanduser('~/.cache/ai-tracker/statesummaries')


class NotFound(Exception):
    pass


_last = [0.0]


def fetch(url, encoding='utf-8'):
    """The page at `url`, from the cache if it was fetched before. A 404 raises NotFound; anything else is tried three times."""
    path = os.path.join(CACHE, hashlib.sha1(url.encode()).hexdigest() + '.html')
    if os.path.exists(path):
        return open(path, 'rb').read().decode(encoding, 'replace')
    for attempt in range(3):
        wait = SPACING - (time.time() - _last[0])
        if wait > 0:
            time.sleep(wait)
        _last[0] = time.time()
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html,*/*'})
            with urllib.request.urlopen(req, timeout=60) as r:
                body = r.read()
            os.makedirs(CACHE, exist_ok=True)
            open(path, 'wb').write(body)
            return body.decode(encoding, 'replace')
        except urllib.error.HTTPError as e:
            if e.code == 404:
                raise NotFound(url)
            time.sleep(4 * (attempt + 1))
        except (urllib.error.URLError, TimeoutError):
            time.sleep(4 * (attempt + 1))
    raise RuntimeError(f'gave up on {url}')


def clean(fragment):
    """Text of an HTML fragment, whitespace collapsed."""
    t = html.unescape(re.sub(r'<[^>]+>', ' ', fragment)).replace('\xa0', ' ')
    return re.sub(r'\s+', ' ', t).strip()


def read_il(row):
    """Illinois: "Synopsis As Introduced", the paragraph under that heading on the bill's status page."""
    url = row['url']
    if 'ilga.gov' not in url:
        return None
    m = re.search(r'<h2[^>]*>\s*Synopsis As ([A-Za-z]+)\s*</h2>\s*<div[^>]*>(.*?)</div>', fetch(url), re.S)
    return (clean(m.group(2)), f'Synopsis As {m.group(1)}', url) if m else None


def nj_year(sid):
    """The folder year for a New Jersey session: the 221st Legislature (Open States' session 221) began in 2024, each later one two years on."""
    return 2024 + 2 * (int(sid) - 221)


def read_nj(row):
    """New Jersey: the STATEMENT at the end of the introduced text of a bill or resolution. A Senate or Assembly bill's file sits in a folder named for the next
    500 up (S3500 holds 3000 to 3499, A6000 holds 5500 to 5999); a resolution's (AJR, SJR, AR, SR) in a folder named for its kind. A bill that is pre-filed but
    not yet introduced has no text yet, and gets none here."""
    m = re.fullmatch(r'(S|A|AJR|SJR|AR|SR|ACR|SCR) (\d+)', row['bill'])
    if not m:
        return None
    kind, n = m.group(1), int(m.group(2))
    year = nj_year(row['sid'])
    if kind in ('S', 'A'):
        top = -(-n // 500) * 500   # a bill numbered exactly 3500 may be in S4000
        folders = [f'{kind}{top}', f'{kind}{top + 500}']
    else:
        folders = [kind]
    for folder in folders:
        url = f'https://pub.njleg.state.nj.us/Bills/{year}/{folder}/{n}_I1.HTM'
        try:
            page = fetch(url, 'windows-1252')
        except NotFound:
            continue
        # the heading is a centred paragraph, sometimes with a <span> or <b> inside it
        found = list(re.finditer(r'<p[^>]*>(?:\s|<[^>]+>)*STATEMENT(?:\s|<[^>]+>)*</p>(.*)', page, re.S))
        return (clean(found[-1].group(1)), 'Statement', url) if found else None
    return None


def read_md(row):
    """Maryland: the "Synopsis" line of the bill's page on mgaleg.maryland.gov."""
    url = row['url']
    if 'mgaleg.maryland.gov' not in url:
        return None
    m = re.search(r'details-section-name">\s*Synopsis\s*</div>\s*<div[^>]*>(.*?)</div>', fetch(url), re.S)
    return (clean(m.group(1)), 'Synopsis', url) if m else None


READERS = {'IL': read_il, 'NJ': read_nj, 'MD': read_md}
READER_INFO = {
    'IL': {'place': 'Illinois', 'what': 'synopsis'},
    'NJ': {'place': 'New Jersey', 'what': 'statement'},
    'MD': {'place': 'Maryland', 'what': 'synopsis'},
}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--only', default='', help='comma-separated state codes, for example IL,NJ')
    ap.add_argument('--limit', type=int, default=0, help='read at most this many bills (0 = all)')
    ap.add_argument('--refresh', action='store_true', help='read again the bills already in the file')
    ap.add_argument('--dry-run', action='store_true', help='list what would be read and fetch nothing')
    a = ap.parse_args()
    only = {x.strip().upper() for x in a.only.split(',') if x.strip()}
    cache = os.path.expanduser('~/.cache/ai-tracker/openstates')
    asked = [L.BASE_TERM] + [t for t in (json.load(open(os.path.join(cache, 'terms.json'))) if os.path.exists(os.path.join(cache, 'terms.json')) else []) if t != L.BASE_TERM]
    terms, _ = L.finished_terms(cache, asked)
    today = datetime.date.today().isoformat()
    rows, _, _ = L.os_rows(cache, today, terms)
    have = json.load(open(OUT, encoding='utf-8')) if os.path.exists(OUT) else {'readers': {}, 'summaries': {}}
    summaries = have.get('summaries', {})
    todo = [r for r in rows if not r['summary'] and r['state'] in READERS and (not only or r['state'] in only)
            and (a.refresh or f"{r['state']}|{r['sid']}|{r['bill']}" not in summaries)]
    if a.limit:
        todo = todo[:a.limit]
    print(f'{len(todo)} bills without a summary to read: ' + ', '.join(f'{s} {sum(1 for r in todo if r["state"] == s)}' for s in sorted({r["state"] for r in todo})), flush=True)
    if a.dry_run:
        return
    tally = {}
    for i, r in enumerate(todo, 1):
        key = f"{r['state']}|{r['sid']}|{r['bill']}"
        try:
            got = READERS[r['state']](r)
        except (NotFound, RuntimeError) as e:
            print(f'  {key}: could not read ({e})', flush=True)
            got = None
        ok = bool(got and len(got[0]) >= 20)
        tally.setdefault(r['state'], [0, 0])[0 if ok else 1] += 1
        if ok:
            summaries[key] = {'summary': L.cap_text(got[0], KEEP), 'from': got[1], 'url': got[2], 'read': today}
        elif got is None:
            print(f'  {key}: the page has no summary', flush=True)
        if i % 25 == 0:
            print(f'  {i} of {len(todo)} done', flush=True)
    readers = {s: READER_INFO[s] for s in READERS}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as fh:
        json.dump({'readers': readers, 'summaries': summaries}, fh, indent=1, ensure_ascii=False, sort_keys=True)
        fh.write('\n')
    print('read / not read: ' + ', '.join(f'{s} {v[0]} / {v[1]}' for s, v in sorted(tally.items())) + f' -> {len(summaries)} summaries in {os.path.relpath(OUT, ROOT)}')


if __name__ == '__main__':
    main()
