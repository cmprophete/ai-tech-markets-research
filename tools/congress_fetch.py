#!/usr/bin/env python3
"""Find the federal bills about AI, from GovInfo's own data, and save them for tools/legislation.py.

    python3 tools/congress_fetch.py        # download the bill-status zips (kept in ~/.cache/ai-tracker/congress) and scan them
    python3 tools/legislation.py build     # then build the page's data; it reads the scan this writes (candidates.json)

Source, and nothing else: GovInfo's Bill Status XML (https://www.govinfo.gov/bulkdata/BILLSTATUS, documented at https://github.com/usgpo/bill-status), the
Government Publishing Office's and the Library of Congress's record of every bill. U.S. Government work, public domain, no key. It comes as one zip for
each kind of bill in each Congress, refreshed several times a day while Congress sits. The four kinds read here, bills ("hr", "s") and joint resolutions
("hjres", "sjres"), are about 46 MB together. Simple and concurrent resolutions (H.Res., S.Res., H.Con.Res., S.Con.Res.) are not read: they state opinions and
never become law. No third party's list is used or compared with.

What counts as a bill about AI (the owner's rule, 2026-11-16: the strict terms plus AI's close relatives, with the two noisiest relatives narrowed after a
first scan found them mostly matching something else: a bill about the Xinjiang Uyghur Autonomous Region is not about AI, and neither is a grocery price bill
that says "algorithm" in its summary):

  strict terms     artificial intelligence, AI or A.I. (in capitals), superintelligence, machine learning, large language model(s)
  close relatives  generative, chatbot(s), deepfake(s), digital replica(s), automated decision(s), frontier model(s) or frontier AI, autonomous weapon(s)
                   or lethal autonomous, and algorithm(s) or algorithmic when a TITLE says it (not when only a summary does)

A bill is "title" tier when any of its titles (the short title, the display title, the official title as introduced, reported or passed) has one of them: those
are the bills the page lists. It is "summary" tier when no title does but the Congressional Research Service's summary does: the page hides those until its
checkbox ("Include bills that only mention AI", under More filters) is on, as it does a state bill that only mentions AI in its text. A bill that says AI only
deep in its text, beyond its title and its summary, is not found; nor is one the CRS has not summarised yet (it writes summaries some weeks after a bill is
introduced, so most new bills are found by their titles alone). The subject terms the CRS assigns are not used to find bills: it indexes new bills late, and
none of them is "artificial intelligence".

What it saves, in candidates.json in the cache folder: for each match, its official record as GovInfo gives it (titles, introduction date, committees, latest
action, stage, whether it became law, the latest CRS summary, the CRS subject terms, its address on Congress.gov (GovInfo gives it for most bills; for the rest it is built from
the bill's kind and number, which is how Congress.gov names its pages), and the bills GovInfo calls identical to it),
and which words matched where. tools/legislation.py turns that into rows (merging identical House and Senate companions into one).
"""
import argparse
import datetime
import html
import json
import os
import re
import shutil
import sys
import time
import urllib.request
import xml.etree.ElementTree as ET
import zipfile

CONGRESS = 119
KINDS = ('hr', 's', 'hjres', 'sjres')
LABEL = {'hr': 'H.R.', 's': 'S.', 'hjres': 'H.J.Res.', 'sjres': 'S.J.Res.'}
TYPE_KIND = {'HR': 'hr', 'S': 's', 'HJRES': 'hjres', 'SJRES': 'sjres'}
CONGRESS_GOV = {'hr': 'house-bill', 's': 'senate-bill', 'hjres': 'house-joint-resolution', 'sjres': 'senate-joint-resolution'}   # the path of a bill's page on Congress.gov
URL = 'https://www.govinfo.gov/bulkdata/BILLSTATUS/{c}/{k}/BILLSTATUS-{c}-{k}.zip'
UA = {'User-Agent': 'Mozilla/5.0'}
CACHE = '~/.cache/ai-tracker/congress'

# The strict terms: AI named outright. "AI" counts only in capitals, so "ai" inside a name does not.
CORE = [
    ('artificial intelligence', re.compile(r'artificial[\s-]+intelligence', re.I)),
    ('AI', re.compile(r'\bA\.\s?I\.|\bAI\b')),
    ('superintelligence', re.compile(r'super[\s-]?intelligen', re.I)),
    ('machine learning', re.compile(r'machine[\s-]+learning', re.I)),
    ('large language model', re.compile(r'large[\s-]+language[\s-]+model', re.I)),
]
# AI's close relatives; `title_only` ones count only when a title says them.
RELATIVES = [
    ('generative', re.compile(r'\bgenerative\b', re.I), False),
    ('chatbot', re.compile(r'\bchat[\s-]?bots?\b', re.I), False),
    ('deepfake', re.compile(r'\bdeep[\s-]?fakes?\b', re.I), False),
    ('digital replica', re.compile(r'\bdigital[\s-]+replicas?\b', re.I), False),
    ('automated decision', re.compile(r'\bautomated[\s-]+decision', re.I), False),
    ('frontier model', re.compile(r'\bfrontier\s+(?:models?|AI|artificial)', re.I), False),
    ('autonomous weapons', re.compile(r'autonomous\s+weapon|lethal\s+autonomous', re.I), False),
    ('algorithm', re.compile(r'\balgorithm(?:s|ic)?\b', re.I), True),
]


def die(msg):
    sys.exit('ABORT: ' + msg)


def text_of(el, path):
    return (el.findtext(path) or '').strip()


def clean(s):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s or ''))).strip()


# ───────────────────────────── downloading ─────────────────────────────
def remote(url):
    """Size and last-modified date of a file on GovInfo, without downloading it."""
    req = urllib.request.Request(url, method='HEAD', headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return {'size': int(r.headers.get('Content-Length') or 0), 'lastModified': r.headers.get('Last-Modified') or ''}


def download(url, path):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=300) as r, open(path + '.part', 'wb') as out:
        shutil.copyfileobj(r, out)
    os.replace(path + '.part', path)


def fetch(cache, refresh):
    """Make sure the four zips in the cache are the ones GovInfo has now: a file is fetched again only when its size or date changed (or with --refresh)."""
    zdir = os.path.join(cache, 'zips')
    os.makedirs(zdir, exist_ok=True)
    meta_path = os.path.join(cache, 'zips.json')
    meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
    for k in KINDS:
        url, path = URL.format(c=CONGRESS, k=k), os.path.join(zdir, f'BILLSTATUS-{CONGRESS}-{k}.zip')
        now = remote(url)
        if refresh or not os.path.exists(path) or meta.get(k) != now:
            print(f'  downloading {k:5} {now["size"] / 1048576:5.1f} MB  (GovInfo last changed it {now["lastModified"]})')
            download(url, path)
            if os.path.getsize(path) != now['size']:
                die(f'{k}: the file is {os.path.getsize(path)} bytes, GovInfo says {now["size"]}')
            time.sleep(0.5)
        else:
            print(f'  {k:5} already up to date ({now["size"] / 1048576:.1f} MB, last changed {now["lastModified"]})')
        meta[k] = now
        json.dump(meta, open(meta_path, 'w'))
    return meta


# ───────────────────────────── reading a bill's record ─────────────────────────────
def stage_of(b):
    """introduced, committee, one-chamber, both-chambers or enacted, from the bill's actions."""
    actions = b.findall('actions/item')
    texts = [(a.findtext('text') or '').strip() for a in actions]
    house = any(re.match(r'(Passed/agreed to in House|Passed House)', t) for t in texts)
    senate = any(re.match(r'(Passed/agreed to in Senate|Passed Senate)', t) for t in texts)
    if b.find('laws/item') is not None or any(a.findtext('type') == 'BecameLaw' for a in actions):
        return 'enacted'
    if house and senate:
        return 'both-chambers'
    if house or senate:
        return 'one-chamber'
    if any((a.findtext('type') in ('IntroReferral', 'Committee')) or t.startswith('Referred to') for a, t in zip(actions, texts)):
        return 'committee'
    return 'introduced'


def titles_of(b):
    """(display title, official title as introduced, every title the bill has in any version)."""
    items = [(text_of(i, 'titleType'), text_of(i, 'title')) for i in b.findall('titles/item')]
    display = text_of(b, 'title')
    official = next((t for ty, t in items if ty.startswith('Official Title as Introduced') and t), '') or next((t for ty, t in items if ty.startswith('Official Title') and t), '')
    every = [t for _, t in items if t]
    if display and display not in every:
        every.append(display)
    return display, official, every


def summaries_of(b, titles):
    """(the latest CRS summary, cleaned, and every version's text for matching). A summary opens with the bill's title in bold, which is dropped."""
    versions = sorted(b.findall('summaries/summary'), key=lambda i: (text_of(i, 'actionDate'), text_of(i, 'updateDate')))
    texts = []
    for i in versions:
        raw = i.findtext('text') or ''
        m = re.match(r'\s*<p>\s*<strong>(.*?)</strong>\s*', raw, re.S)
        if m and clean(m.group(1)).lower() in {t.lower() for t in titles}:
            raw = raw[m.end():]
        texts.append(clean(raw))
    return (texts[-1] if texts else ''), ' || '.join(texts)


def match(titles, summary_all):
    """('title' | 'summary' | None, the words that matched). A title match wins; a summary match counts only when no title has one."""
    t = ' || '.join(titles)
    hits = [lab for lab, rx in CORE if rx.search(t)] + [lab for lab, rx, _ in RELATIVES if rx.search(t)]
    if hits:
        return 'title', hits
    hits = [lab for lab, rx in CORE if rx.search(summary_all)] + [lab for lab, rx, title_only in RELATIVES if not title_only and rx.search(summary_all)]
    return ('summary', hits) if hits else (None, [])


def record(b, kind, tier, hits, display, official, summary):
    law = b.find('laws/item')
    la = b.find('latestAction')
    last = None
    if la is not None and text_of(la, 'actionDate'):
        last = {'date': text_of(la, 'actionDate'), 'text': re.sub(r'\s+', ' ', text_of(la, 'text'))}
    ident = []
    for it in b.findall('relatedBills/item'):
        if any('Identical' in (d.findtext('type') or '') for d in it.findall('relationshipDetails/item')):
            k2 = TYPE_KIND.get(text_of(it, 'type').upper())
            if k2:
                ident.append(f'{k2}:{text_of(it, "number")}')
    return {'kind': kind, 'number': text_of(b, 'number'), 'bill': f'{LABEL[kind]} {text_of(b, "number")}', 'chamber': text_of(b, 'originChamber'), 'introduced': text_of(b, 'introducedDate'),
            'title': display, 'officialTitle': official, 'stage': stage_of(b), 'last': last,
            'law': ((text_of(law, 'type') or 'Public Law') + ' ' + text_of(law, 'number')).strip() if law is not None else '',
            'committees': [[text_of(c, 'chamber'), re.sub(r' Committee$', '', text_of(c, 'name'))] for c in b.findall('committees/item')],
            'tier': tier, 'terms': hits, 'summary': summary[:1200], 'subjects': [text_of(i, 'name') for i in b.findall('subjects/legislativeSubjects/item') if text_of(i, 'name')],
            'url': text_of(b, 'legislationUrl') or f'https://www.congress.gov/bill/{CONGRESS}th-congress/{CONGRESS_GOV[kind]}/{text_of(b, "number")}', 'identical': ident}


def scan(cache):
    scanned, found = {}, []
    for k in KINDS:
        z = zipfile.ZipFile(os.path.join(cache, 'zips', f'BILLSTATUS-{CONGRESS}-{k}.zip'))
        n = 0
        for name in z.namelist():
            if not name.endswith('.xml'):
                continue
            n += 1
            try:
                b = ET.fromstring(z.read(name)).find('bill')
            except ET.ParseError:
                die(f'{name} is not well-formed XML')
            if b is None:
                continue
            display, official, every = titles_of(b)
            summary, summary_all = summaries_of(b, every)
            tier, hits = match(every, summary_all)
            if tier:
                found.append(record(b, k, tier, hits, display, official, summary))
        scanned[k] = n
    return scanned, found


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--cache', default=CACHE, help='where the zips and candidates.json are kept')
    ap.add_argument('--refresh', action='store_true', help='download the zips again even if GovInfo has not changed them')
    ap.add_argument('--no-download', action='store_true', help='scan the zips already in the cache')
    args = ap.parse_args()
    cache = os.path.expanduser(args.cache)
    os.makedirs(cache, exist_ok=True)
    meta = json.load(open(os.path.join(cache, 'zips.json'))) if args.no_download and os.path.exists(os.path.join(cache, 'zips.json')) else fetch(cache, args.refresh)
    scanned, found = scan(cache)
    modified = max((datetime.datetime.strptime(m['lastModified'], '%a, %d %b %Y %H:%M:%S GMT') for m in meta.values() if m.get('lastModified')), default=None)
    out = {'congress': CONGRESS, 'read': datetime.date.today().isoformat(), 'updated': modified.date().isoformat() if modified else '', 'scanned': scanned, 'zips': meta,
           'rule': {'core': [c[0] for c in CORE], 'relatives': [r[0] for r in RELATIVES], 'titleOnly': [r[0] for r in RELATIVES if r[2]]}, 'bills': found}
    path = os.path.join(cache, 'candidates.json')
    with open(path, 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(',', ':'))
    tier = lambda t: sum(1 for b in found if b['tier'] == t)
    print(f'scanned {sum(scanned.values()):,} bill-status files {dict(scanned)}')
    print(f'{len(found)} bills about AI: {tier("title")} with a term in a title, {tier("summary")} only in the CRS summary')
    print('  by stage:', dict(sorted({s: sum(1 for b in found if b["stage"] == s) for s in {b["stage"] for b in found}}.items())))
    print(f'wrote {path}')


if __name__ == '__main__':
    main()
