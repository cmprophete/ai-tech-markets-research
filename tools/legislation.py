#!/usr/bin/env python3
"""Build data/legislation-bills.js, the bills the Legislation tab lists.

    python3 tools/openstates_fetch.py                                   # once: fetch the state bills (needs the key in ~/.openstates_key)
    python3 tools/legislation.py build --states-cache ~/.cache/ai-tracker/openstates --federal-cache ~/.cache/ai-tracker/govinfo

Where each part comes from, and nothing else:

  federal list     The Brennan Center for Justice's Artificial Intelligence Legislation Tracker
                   (https://www.brennancenter.org/our-work/research-reports/artificial-intelligence-legislation-tracker): which bills, and its
                   category labels as topics. Its rows come from the Google Sheet that page embeds, published to the web as CSV.
  federal records  GovInfo's Bill Status XML (https://www.govinfo.gov/bulkdata/BILLSTATUS; U.S. Government work, public domain, no key): for
                   each bill with a number, its official title, committees, introduction dates, latest action and stage.
  state bills      Open States (https://openstates.org, public-domain data, attribution requested), which follows each legislature's own
                   record. Our own list: tools/openstates_fetch.py runs a full-text search of every session since 2025 for each of a few
                   phrases (TERMS there: "artificial intelligence", "deepfake", "digital replica", "synthetic media"), and a bill is on the
                   list because its text says one of them. NCSL's list is NOT used to build it. A phrase counts only once its search is
                   finished in every session (finished_terms below): a half-finished one would make states look different because of
                   when they were searched, so its pages are left out and the build says so.

What it keeps, and why:
- Official records, not anyone's prose. A state bill carries its official title, the legislature's own summary where it gives one (capped at
  450 characters, ending in an ellipsis when cut), its subject index terms as the legislature wrote them, its latest action, and a link to
  the bill on the legislature's own site (else on Open States). A federal bill carries its official title and record, the tracker's category
  labels, and a summary from content/legislation-federal-summaries.json, written by hand in our own words.
- Nothing from NCSL. Its Terms of Use (https://www.ncsl.org/terms-of-use) forbid copying its material without permission, and the owner
  chose not to ask. Our list was compared with NCSL's once, to see how they differ (docs/legislation-sources.md), and nothing of NCSL's is kept.
- Bills about AI first: the title or the legislature's own summary names artificial intelligence, AI, machine learning, generative AI, deepfakes,
  synthetic media, digital replicas, artificially or digitally generated or altered content, chatbots, large language models, algorithmic or
  automated decisions, or automation displacement. The search also finds a bill that says the phrase once in a long text; those are written
  with `passing: true`, counted in LEGISLATION_FEEDS.openstates.passing, and hidden until the page's checkbox ("Include bills that only mention
  AI", under More filters) is turned on.
- Only bills that are active (the page's definition: introduced and not failed, data/legislation-data.js). A state bill is active when it
  became law, or when its session has not ended and its latest action is not a failure, withdrawal or veto. A bill the search found that is
  not active is counted in LEGISLATION_FEEDS.openstates.omitted and not written out. Open States' session dates are the legislatures' formal
  ones, so a bill stays active until its session formally ends: in California that is November 30, though the last day to pass bills was in
  August.
- The stage of a state bill comes from the standard classification Open States gives each action: passed by a chamber ("passage"), signed
  or became law, referred to a committee, introduced. A federal bill's stage comes from its GovInfo actions the same way.
- The Brennan sheet's one known typo, a link that begins "tps://", is repaired and announced; any other bad link stops the build.

The build stops, writing nothing, if an input has a shape it does not expect: a jurisdiction it does not know, a date that does not parse,
a bad link.
"""
import argparse
import csv
import datetime
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET

BRENNAN_PAGE = 'https://www.brennancenter.org/our-work/research-reports/artificial-intelligence-legislation-tracker'
BRENNAN_CSV = ('https://docs.google.com/spreadsheets/d/e/2PACX-1vRJoQFsoMo_qBx62RyvHGDRO9TjDcneKLAmK1SBpiIjNm1Mz36WGUuuXUtZiEy9KzKljqh7-UC8pbX_/'
               'pub?gid=0&single=true&output=csv')
GOVINFO_PAGE = 'https://www.govinfo.gov/bulkdata/BILLSTATUS'
OPENSTATES_PAGE = 'https://openstates.org/'
GOVINFO_URL = 'https://www.govinfo.gov/bulkdata/BILLSTATUS/119/{k}/BILLSTATUS-119{k}{n}.xml'
FED_KIND = {'H.R.': 'hr', 'S.': 's', 'H.J.Res.': 'hjres', 'S.J.Res.': 'sjres', 'H.Res.': 'hres', 'S.Res.': 'sres', 'H.Con.Res.': 'hconres', 'S.Con.Res.': 'sconres'}
STAGE_RANK = {'introduced': 0, 'committee': 1, 'one-chamber': 2, 'both-chambers': 3, 'enacted': 4}

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
SUMMARIES = os.path.join(ROOT, 'content', 'legislation-federal-summaries.json')
STATE_SUMMARIES = os.path.join(ROOT, 'content', 'legislation-state-summaries.json')   # written by tools/state_summaries.py
OUT = os.path.join(ROOT, 'data', 'legislation-bills.js')

STATES = ('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY').split()
TERRITORIES = ('PR GU VI AS MP').split()
MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

# The Brennan Center's own labels for its category codes (they are in the tracker page's script).
BRENNAN_RISK = {'R1': 'Catastrophic risk', 'R2': 'Socioeconomic harms', 'R3': 'Government AI risks'}   # R4 is "No risk specified": not a topic
BRENNAN_REG = {'RG1': 'Voluntary standards', 'RG2': 'Mandatory testing', 'RG3': 'Third-party audits', 'RG4': 'Shutdown or kill switch',
               'RG5': 'Restricting AI development', 'RG6': 'Restricting AI deployment', 'RG7': 'Transparency', 'RG8': 'Liability',
               'RG9a': 'Preemption', 'RG9b': 'Anti-preemption', 'RG9c': 'Deregulation'}


def die(msg):
    sys.exit('ABORT: ' + msg)


def date_long(y, m, d):
    return f'{MONTHS[m - 1]} {d}, {y}'


def parse_us_date(s):
    m = re.fullmatch(r'\s*(\d{1,2})/(\d{1,2})/(\d{2}|\d{4})\s*', s or '')
    if not m:
        return None
    mo, d, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
    y = y + 2000 if y < 100 else y
    if not (1 <= mo <= 12 and 1 <= d <= 31):
        return None
    return y, mo, d


# ───────────────────────────── Brennan (federal) ─────────────────────────────
def read_text(src):
    if re.match(r'https?://', src):
        req = urllib.request.Request(src, headers={'User-Agent': 'Mozilla/5.0'})
        return urllib.request.urlopen(req, timeout=60).read().decode('utf-8-sig')
    return open(os.path.expanduser(src), encoding='utf-8-sig', newline='').read()


def fed_number(n):
    return re.sub(r'^(H\.R\.|S\.|H\.J\.Res\.|S\.J\.Res\.)\s*', lambda m: m.group(1) + ' ', n.strip())


def fed_dates(cell):
    """'3/26/2025' or 'Senate - 9/16/2026\\nHouse - 9/24/2026' or 'NOT ON CONGRESS.GOV YET' -> words, and the ISO dates."""
    parts = []
    for line in (cell or '').splitlines():
        m = re.fullmatch(r'\s*(?:(\w+)\s*[-–:]\s*)?(\d{1,2}/\d{1,2}/\d{4})\s*', line)
        if m:
            y, mo, d = parse_us_date(m.group(2))
            parts.append((m.group(1) or '', date_long(y, mo, d)))
    if not parts:
        return ''
    if len(parts) == 1 and not parts[0][0]:
        return 'Introduced ' + parts[0][1]
    return 'Introduced ' + ' and '.join((f'in the {c} ' if c else '') + t for c, t in parts)


def cap_committees(text, keep=3):
    """'A; B; C; D; E' -> 'A; B; C and 2 more': a few bills are referred to a dozen committees, which makes the row very tall."""
    items = [x.strip() for x in text.split(';') if x.strip()]
    return '; '.join(items[:keep]) + (f' and {len(items) - keep} more' if len(items) > keep else '')


def fed_committees(cell):
    lines = [l.strip() for l in (cell or '').splitlines() if l.strip()]
    if not lines:
        return ''
    if len(lines) == 1 and ' - ' not in lines[0]:
        return 'Committee: ' + cap_committees(lines[0])
    return 'Committees: ' + '. '.join(cap_committees(l.replace(' - ', ': ', 1)) for l in lines)


# ───────────────────────────── the official record of a federal bill (GovInfo) ─────────────────────────────
def govinfo_get(number, cache):
    """The bill-status file GovInfo publishes for a federal bill (U.S. Government work, public domain, no key), or None if it has none yet."""
    m = re.fullmatch(r'(H\.R\.|S\.|H\.J\.Res\.|S\.J\.Res\.|H\.Res\.|S\.Res\.|H\.Con\.Res\.|S\.Con\.Res\.)\s*(\d+)', number.strip())
    if not m:
        return None
    k, n = FED_KIND[m.group(1)], m.group(2)
    fn = os.path.join(os.path.expanduser(cache), f'BILLSTATUS-119{k}{n}.xml') if cache else None
    if fn and os.path.exists(fn):
        return open(fn, encoding='utf-8').read()
    try:
        req = urllib.request.Request(GOVINFO_URL.format(k=k, n=n), headers={'User-Agent': 'Mozilla/5.0'})
        xml = urllib.request.urlopen(req, timeout=60).read().decode('utf-8')
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise
    time.sleep(0.25)
    if fn:
        os.makedirs(os.path.dirname(fn), exist_ok=True)
        open(fn, 'w', encoding='utf-8').write(xml)
    return xml


def govinfo_parse(xml):
    """What the page needs from one bill-status file: official title, chamber and date of introduction, committees, latest action, stage."""
    b = ET.fromstring(xml).find('bill')
    g = lambda p: (b.findtext(p) or '').strip()
    actions = b.findall('actions/item')
    texts = [(a.findtext('text') or '').strip() for a in actions]
    house = any(re.match(r'(Passed/agreed to in House|Passed House)', t) for t in texts)
    senate = any(re.match(r'(Passed/agreed to in Senate|Passed Senate)', t) for t in texts)
    law = b.find('laws/item')
    if law is not None or any(a.findtext('type') == 'BecameLaw' for a in actions):
        stage = 'enacted'
    elif house and senate:
        stage = 'both-chambers'
    elif house or senate:
        stage = 'one-chamber'
    elif any((a.findtext('type') in ('IntroReferral', 'Committee')) or t.startswith('Referred to') for a, t in zip(actions, texts)):
        stage = 'committee'
    else:
        stage = 'introduced'
    la = b.find('latestAction')
    last = None
    if la is not None and (la.findtext('actionDate') or '').strip():
        last = {'date': la.findtext('actionDate').strip(), 'text': re.sub(r'\s+', ' ', (la.findtext('text') or '').strip())}
    committees = [((c.findtext('chamber') or '').strip(), re.sub(r' Committee$', '', (c.findtext('name') or '').strip())) for c in b.findall('committees/item')]
    return {'title': g('title'), 'chamber': g('originChamber'), 'introduced': g('introducedDate'), 'committees': committees, 'last': last, 'stage': stage,
            'law': ((law.findtext('type') or 'Public Law').strip() + ' ' + (law.findtext('number') or '').strip()) if law is not None else ''}


def iso_long(iso):
    m = re.fullmatch(r'(\d{4})-(\d{2})-(\d{2})', iso or '')
    return date_long(int(m.group(1)), int(m.group(2)), int(m.group(3))) if m else ''


def enrich_federal(bills, cache):
    """Brennan's list says which federal bills; each bill's own official record says where it stands. For every bill with a number, read its
    GovInfo file (more than one for companion bills in both chambers) and set the official title, the stage, the last action and the status
    words (dates of introduction and committees). A bill GovInfo does not have yet keeps what the tracker gave."""
    done, missing = 0, []
    for b in bills:
        nums = [n.strip() for n in b.get('bill', '').split(';') if n.strip()]
        recs = []
        for n in nums:
            xml = govinfo_get(n, cache)
            if xml:
                recs.append(govinfo_parse(xml))
        if not recs:
            if nums:
                missing.append(b['bill'])
            continue
        done += 1
        b['title'] = recs[0]['title'] or b['title']
        b['stage'] = max((r['stage'] for r in recs), key=lambda x: STAGE_RANK[x])
        lasts = [r['last'] for r in recs if r['last']]
        if lasts:
            b['lastAction'] = max(lasts, key=lambda x: x['date'])
        when = [(r['chamber'], iso_long(r['introduced'])) for r in recs if r['introduced']]
        intro = ''
        if len(when) == 1:
            intro = 'Introduced ' + when[0][1]
        elif when:
            intro = 'Introduced ' + ' and '.join(f'in the {c} {d}' for c, d in when)
        if len(recs) == 1:
            names = '; '.join(n for _, n in recs[0]['committees'])
            comm = ('Committee: ' + cap_committees(names)) if names else ''
        else:
            parts = []
            for r in recs:
                for ch in sorted({c for c, _ in r['committees']}):
                    parts.append(f'{ch}: ' + cap_committees('; '.join(n for c, n in r['committees'] if c == ch)))
            comm = ('Committees: ' + '. '.join(parts)) if parts else ''
        law = next((r['law'] for r in recs if r['law']), '')
        b['status'] = '. '.join(x for x in (('Became law (' + law + ')') if law else '', intro, comm) if x)
        if not b['status']:
            del b['status']
    return done, missing


# ───────────────────────────── state bills from Open States ─────────────────────────────
OS_DEAD = ('failure', 'withdrawal', 'executive-veto', 'committee-failure', 'veto-override-failure')
# A bill is "about AI" when its title or the legislature's own summary names it. The full-text search finds every bill that mentions the phrase
# anywhere, including a school code or a resolution about Taiwan that says it once; those are counted and left out, not listed.
AI_NAMED = re.compile(r'artificial intelligence|machine learning|generative|deep ?fakes?|synthetic media|digital replica|artificially generated|digitally (?:altered|generated)|chatbot|large language model|algorithmic|automated decision|automation displacement', re.I)
AI_WORD = re.compile(r'\bAI\b')


def names_ai(title, summary):
    t = f'{title} {summary}'
    return bool(AI_NAMED.search(t) or AI_WORD.search(t))


def os_code(jid):
    m = re.search(r'/(?:state|district|territory):([a-z]{2})\b', jid)
    if not m:
        die(f'an Open States jurisdiction id this tool does not know: {jid}')
    return m.group(1).upper()


def cap_text(text, limit=450):
    """Whitespace collapsed; cut at a word and ended with an ellipsis when longer than the limit."""
    t = re.sub(r'\s+', ' ', text or '').strip()
    if len(t) <= limit:
        return t
    return t[:limit].rsplit(' ', 1)[0].rstrip(' ,;:.') + '\u2026'


def subject_terms(b):
    """The legislature's subject index terms for a bill, minus any that only repeat part of its title (California's arrive as the title cut into
    words with the spaces removed, "Healthcareservices", which is noise, not an index term)."""
    flat = lambda x: re.sub(r'[^a-z0-9]', '', (x or '').lower())
    title = flat(b.get('title'))
    return [x.strip() for x in (b.get('subject') or []) if x.strip() and flat(x) not in title]


def os_stage(actions, ended):
    """(stage, alive): from the standard classification of each action. alive is False for a bill that failed, was withdrawn or vetoed, or
    whose session has ended without it becoming law."""
    acts = sorted(actions or [], key=lambda a: (a.get('date') or '', a.get('order') or 0))
    cls = [set(a.get('classification') or []) for a in acts]
    chambers = {((a.get('organization') or {}).get('classification') or '') for a, c in zip(acts, cls) if 'passage' in c}
    if any(c & {'became-law', 'executive-signature', 'veto-override-passage'} for c in cls):
        return 'enacted', True
    if cls and cls[-1] & set(OS_DEAD):
        return 'failed', False
    if ended:
        return 'failed', False
    if 'legislature' in chambers or {'upper', 'lower'} <= chambers:
        stage = 'both-chambers'
    elif chambers & {'upper', 'lower'}:
        stage = 'one-chamber'
    elif any(c & {'referral-committee', 'committee-passage', 'committee-passage-favorable', 'committee-passage-unfavorable', 'committee-failure'} for c in cls):
        stage = 'committee'
    else:
        stage = 'introduced'
    return stage, True


BASE_TERM = 'artificial intelligence'   # tools/openstates_fetch.py always searches it, and searches it first, in every session


def finished_terms(cache, terms):
    """(the terms whose search is finished, {each unfinished term: (sessions it is finished in, sessions in all)}).
    A term is finished when, in every session the base search covered, every page of its results is saved. The build reads only finished
    terms: a half-finished search finds bills in the states it reached and none in the rest, and a map shaded by how many bills a state has
    would show that unevenness as if the legislatures had caused it."""
    base = os.path.join(os.path.expanduser(cache), 'bills')
    if not os.path.isdir(base):
        die(f'no saved Open States searches in {cache}: run tools/openstates_fetch.py first')
    sessions = [(c, s) for c in sorted(os.listdir(base)) for s in sorted(os.listdir(os.path.join(base, c)))
                if os.path.exists(os.path.join(base, c, s, slug(BASE_TERM) + '-p1.json'))]
    def finished_in(c, s, t):
        p1 = os.path.join(base, c, s, slug(t) + '-p1.json')
        if not os.path.exists(p1):
            return False
        last = json.load(open(p1))['pagination'].get('max_page') or 1
        return all(os.path.exists(os.path.join(base, c, s, f'{slug(t)}-p{k}.json')) for k in range(2, last + 1))
    done, short = [], {}
    for t in terms:
        n = sum(1 for c, s in sessions if finished_in(c, s, t))
        if n == len(sessions):
            done.append(t)
        else:
            short[t] = (n, len(sessions))
    return done, short


def latest_taken(b, today):
    """(date, text) of a state bill's last action: Open States' own latest action, unless that one is in the future. Georgia, for one, lists a bill's
    effective date (in 2027) as an action, and that is not an action taken: shown as "last action" it would be later than today and, sorted by recency,
    would put the bill at the top. In that case the latest action dated no later than today is used instead (the last of the day by Open States'
    order when there are several), and with none, no last action."""
    la = (b.get('latest_action_date') or '')[:10]
    text = lambda t: re.sub(r'\s+', ' ', t or '').strip()
    if re.fullmatch(r'\d{4}-\d{2}-\d{2}', la) and la <= today:
        return la, text(b.get('latest_action_description'))
    acts = [a for a in (b.get('actions') or []) if re.fullmatch(r'\d{4}-\d{2}-\d{2}', (a.get('date') or '')[:10]) and a['date'][:10] <= today]
    if acts:
        a = max(acts, key=lambda x: (x['date'][:10], x.get('order') or 0))
        return a['date'][:10], text(a.get('description'))
    return '', text(b.get('latest_action_description'))


def os_rows(cache, today, terms, site=None):
    """Every bill the saved Open States searches for `terms` found, as (the active bills, each flagged `passing` if only its text mentions AI, how many were not active, how many in all).
    `site` is the content of content/legislation-state-summaries.json (tools/state_summaries.py): for a bill Open States has no abstract for, the legislature's own summary
    read from its site, if there is one (a row so filled carries `site: True`)."""
    site = (site or {}).get('summaries', {})
    root = os.path.expanduser(cache)
    want = {slug(t) for t in terms}
    jurs = json.load(open(os.path.join(root, 'jurisdictions.json')))
    sess = {}
    for j in jurs:
        for s in j.get('legislative_sessions', []):
            sess[(os_code(j['id']), s['identifier'])] = s
    seen, out, dead = {}, [], 0
    base = os.path.join(root, 'bills')
    if not os.path.isdir(base):
        die(f'no saved Open States searches in {root}: run tools/openstates_fetch.py first')
    for code in sorted(os.listdir(base)):
        for sid in sorted(os.listdir(os.path.join(base, code))):
            for fn in sorted(os.listdir(os.path.join(base, code, sid))):
                m = re.fullmatch(r'(.+)-p\d+\.json', fn)
                if not m or m.group(1) not in want:
                    continue
                for b in json.load(open(os.path.join(base, code, sid, fn)))['results']:
                    seen[b['id']] = (code.upper(), sid, b)
    # The legislature's own page for a bill: the first web address among its sources that is not an API, FTP or data-file link, unless the
    # same address is given for more than one bill (a generic search page), in which case the bill's Open States page stands in.
    def page_of(b):
        for x in b.get('sources') or []:
            u = x.get('url', '')
            if re.match(r'https?://', u) and '/api' not in u and 'ftp' not in u.lower():
                return u
        return ''
    use = {}
    for _, _, b in seen.values():
        use[page_of(b)] = use.get(page_of(b), 0) + 1
    for _, (code, sid, b) in sorted(seen.items(), key=lambda kv: (kv[1][0], kv[1][1], kv[1][2]['identifier'])):
        if code not in STATES and code not in TERRITORIES:
            die(f'an Open States bill for a jurisdiction the page does not know: {code}')
        s = sess.get((code, sid))
        if s is None:
            die(f'a session Open States does not list: {code} {sid}')
        end = s.get('end_date')
        stage, alive = os_stage(b.get('actions'), bool(end and end < today))
        if not alive:
            dead += 1
            continue
        official = page_of(b) if use.get(page_of(b), 0) == 1 else ''
        la, la_text = latest_taken(b, today)
        abstract_full = ((b.get('abstracts') or [{}])[0] or {}).get('abstract', '')
        site_full = '' if abstract_full.strip() else (site.get(f"{code}|{sid}|{b['identifier']}") or {}).get('summary', '')
        abstract, from_site = cap_text(abstract_full), cap_text(site_full)
        out.append({'state': code, 'bill': b['identifier'], 'session': re.sub(r',? Regular Session$', '', s.get('name') or sid), 'sid': sid, 'stage': stage, 'date': la,
                    'text': la_text if la else re.sub(r'\s+', ' ', b.get('latest_action_description') or '').strip(), 'title': re.sub(r'\s+', ' ', b.get('title') or '').strip(),
                    'summary': abstract or from_site, 'site': bool(from_site), 'subjects': subject_terms(b),
                    'url': official or b.get('openstates_url') or '', 'official': bool(official),
                    'passing': not names_ai(b.get('title') or '', abstract_full or site_full)})   # "about AI" goes by the title and the legislature's own summary, wherever it was read
    return out, dead, len(seen)


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def brennan_rows(src, summaries):
    reader = csv.DictReader(io.StringIO(read_text(src)))
    rows = list(reader)
    need = {'Date introduced', 'Title', 'Link 1', 'Committee', 'Risk(s)', 'Regulation Type(s)', 'Passed?', 'Tracker Last Updated'}
    if not rows or not need <= set(rows[0].keys()):
        die(f'the Brennan Center sheet has other columns than expected: {list(rows[0].keys()) if rows else "no rows"}')
    out, updated, seen = [], None, set()
    for r in rows:
        title_full = re.sub(r'\s+', ' ', r['Title']).strip()
        m = re.search(r'\s*\(([^()]*\d[^()]*)\)\s*$', title_full)
        numbers = [fed_number(n) for n in m.group(1).split(';')] if m else []
        title = title_full[:m.start()].strip() if m else title_full
        key = (m.group(1).split(';')[0].strip() if m else title_full)
        key = re.sub(r'\s+', '', key) if m else key
        summary = summaries.get(key)
        if summary is None:
            print(f'  note: no hand-written summary for {key!r}', file=sys.stderr)
        words = [x for x in (fed_dates(r['Date introduced']) or (r['Date introduced'].strip().capitalize() if r['Date introduced'].strip() else ''),) if x]
        passed = r['Passed?'].strip().lower() in ('yes', 'y', 'true')
        status = '. '.join(x for x in ('Became law' if passed else '', words[0] if words else '', fed_committees(r['Committee'])) if x)
        codes = [re.sub(r'[()\s]', '', c) for c in re.split(r'[,;]', r['Risk(s)'] + ';' + r['Regulation Type(s)']) if c.strip()]
        topics = [BRENNAN_RISK[c] for c in codes if c in BRENNAN_RISK] + [BRENNAN_REG[c] for c in codes if c in BRENNAN_REG]
        unknown = [c for c in codes if c not in BRENNAN_RISK and c not in BRENNAN_REG and c not in ('R4',)]
        if unknown:
            die(f'a Brennan category code this tool does not know: {unknown} ({title})')
        link = r['Link 1'].strip()
        if link.startswith('tps://'):    # the sheet has this typo (the first two letters cut off); the address is otherwise whole
            print(f'  note: repaired a link that begins "tps://" in the Brennan sheet ({title})', file=sys.stderr)
            link = 'ht' + link
        if not re.match(r'https?://', link):
            die(f'a bill link that is not a web address: {link!r} ({title})')
        fid = 'fed-' + slug((numbers[0] if numbers else title).replace('.', ''))[:60]
        if fid in seen:
            die(f'a federal bill listed twice: {fid}')
        seen.add(fid)
        b = {'id': fid, 'level': 'federal', 'bill': '; '.join(numbers), 'title': title, 'session': '119th Congress',
             'stage': 'enacted' if passed else 'introduced',
             'source': {'label': 'Congress.gov' if 'congress.gov' in link else 'Bill text', 'url': link}}
        if status:
            b['status'] = status
        if summary:
            b['summary'] = summary
        if topics:
            b['topics'] = topics
        if not numbers:
            del b['bill']
        out.append(b)
        t = r['Tracker Last Updated'].strip()
        if t and parse_us_date(t):
            y, mo, d = parse_us_date(t)
            updated = max(updated or (0, 0, 0), (y, mo, d))
    return out, (date_long(*updated) if updated else '')


# ───────────────────────────── writing the file ─────────────────────────────
def js(v):
    return json.dumps(v, ensure_ascii=False, separators=(',', ':'))


def build(args):
    summaries = json.load(open(SUMMARIES, encoding='utf-8'))
    today = datetime.date.today().isoformat()
    tfile = os.path.join(os.path.expanduser(args.states_cache), 'terms.json')
    asked = json.load(open(tfile)) if os.path.exists(tfile) else []
    asked = [BASE_TERM] + [t for t in asked if t != BASE_TERM]
    terms, unfinished = finished_terms(args.states_cache, asked)
    if BASE_TERM not in terms:
        die(f'the search for "{BASE_TERM}" is not finished in every session ({unfinished[BASE_TERM][0]} of {unfinished[BASE_TERM][1]}): run tools/openstates_fetch.py to finish it')
    for t, (n, of) in unfinished.items():
        print(f'  note: the search for "{t}" is finished in {n} of {of} sessions, so its results are left out until it is: run tools/openstates_fetch.py again (the free key allows 250 requests a day)', file=sys.stderr)
    site = json.load(open(STATE_SUMMARIES, encoding='utf-8')) if os.path.exists(STATE_SUMMARIES) else {}
    state_rows, dead, found = os_rows(args.states_cache, today, terms, site)
    passing = sum(1 for r in state_rows if r['passing'])
    # which legislatures' own summaries were read from their own sites (the states Open States has none for), for the page's note
    used = sorted({r['state'] for r in state_rows if r.get('site')})
    readers = site.get('readers', {})
    places = [readers[s]['place'] for s in used if s in readers]
    whats = sorted({readers[s]['what'] for s in used if s in readers})
    summaries_note = ('Summaries are the legislatures\' own: Open States\' where it has one; for ' + (places[0] if len(places) == 1 else ', '.join(places[:-1]) + ' and ' + places[-1]) +
                      ', which it has none for, the ' + ' or '.join(whats) + (' each legislature publishes' if len(places) > 1 else ' the legislature publishes') + ' on its own site.') if places else ''
    quoted =['\u201c' + t + '\u201d' for t in terms]
    terms_text = quoted[0] if len(quoted) == 1 else ', '.join(quoted[:-1]) + ' or ' + quoted[-1]
    fed, fed_updated = brennan_rows(args.brennan, summaries)
    fed_official, fed_missing = (0, []) if args.no_official else enrich_federal(fed, args.federal_cache)
    if fed_missing:
        print('  note: no official record yet for ' + ', '.join(fed_missing) + '; the tracker\'s own details are kept', file=sys.stderr)
    # the tables the compact state rows index into
    sess_list, sess_idx, subj_list, subj_idx = [], {}, [], {}
    for r in state_rows:
        k = (r['state'], r['sid'])
        if k not in sess_idx:
            sess_idx[k] = len(sess_list)
            sess_list.append(r['session'])
        for x in r['subjects']:
            if x not in subj_idx:
                subj_idx[x] = len(subj_list)
                subj_list.append(x)
    by_stage = {}
    for r in state_rows:
        by_stage[r['stage']] = by_stage.get(r['stage'], 0) + 1
    feeds = {
        'brennan': {'org': 'Brennan Center for Justice', 'short': 'the Brennan Center', 'title': 'Artificial Intelligence Legislation Tracker', 'kind': 'tracker', 'updated': fed_updated,
                    'read': today, 'url': BRENNAN_PAGE, 'level': 'federal', 'included': len(fed), 'leftOut': 0},
    }
    if fed_official:
        feeds['govinfo'] = {'org': 'U.S. Government Publishing Office', 'short': 'GovInfo', 'title': 'Bill Status XML Bulk Data', 'kind': 'bulk data', 'read': today,
                            'url': GOVINFO_PAGE, 'level': 'federal', 'included': fed_official, 'leftOut': 0}
    feeds['openstates'] = {'org': 'Open States', 'short': 'Open States', 'title': 'Bill search', 'kind': 'API v3', 'read': today,
                           'url': OPENSTATES_PAGE, 'level': 'state', 'scope': 'every bill since 2025 whose text mentions ' + terms_text, 'found': found, 'included': len(state_rows) - passing, 'passing': passing,
                           **({'summaries': summaries_note} if summaries_note else {}),
                           'omitted': [{'n': dead, 'why': 'failed, were withdrawn or vetoed, or whose session ended without passing them'}]}
    head = f"""/* data/legislation-bills.js: the bills the Legislation tab lists. GENERATED by tools/legislation.py, do not edit by hand.
   Sources, and nothing else: the Brennan Center for Justice's Artificial Intelligence Legislation Tracker (the federal list), each federal bill's
   official record at GovInfo, and Open States (state bills: a full-text search of every session since 2025 for "artificial intelligence"). Federal
   summaries are written by hand in content/legislation-federal-summaries.json; a state bill's summary is the legislature's own: Open States' where it
   has one, else (Illinois, New Jersey) the one the legislature publishes on its own site, read by tools/state_summaries.py into content/legislation-state-summaries.json.
   Only active bills are written out: LEGISLATION_FEEDS says how many the search found beyond them. How it is made and refreshed:
   docs/legislation-sources.md. Loaded the first time the Legislation tab opens (loadPayload in src/js/05-lazy.js); it adds its rows to
   LEGISLATION_DATA (data/legislation-data.js) and then the tab redraws. A state bill is S(state, bill, session number, stage, last action date,
   last action text, title, summary, subject numbers, link, 1 if the link is the legislature's own, 1 if the bill only mentions AI in its text
   and is hidden until the page's checkbox for them is on); the numbers index SESSIONS and SUBJECTS. */
const LEGISLATION_FEEDS = {js(feeds)};
"""
    body = ['(function () {',
            '  const OS = ' + js({'label': 'Open States', 'url': OPENSTATES_PAGE}) + ';',
            '  const SESSIONS = ' + js(sess_list) + ';',
            '  const SUBJECTS = ' + js(subj_list) + ';',
            '  const add = b => LEGISLATION_DATA.push(b);']
    for b in fed:
        body.append('  add(' + js(b) + ');')
    body.append("  const S = (state, bill, session, stage, date, text, title, summary, subjects, url, official, passing) => {")
    body.append("    const b = { id: 'os-' + state.toLowerCase() + '-' + session + '-' + bill.toLowerCase().replace(/[^a-z0-9]+/g, '-'), level: 'state', state, bill, session: SESSIONS[session], stage,")
    body.append("      source: url ? { label: official ? 'Legislature' : 'Open States', url } : OS };")
    body.append("    if (title) b.title = title; if (summary) b.summary = summary; if (date) b.lastAction = text ? { date, text } : { date };")
    body.append("    if (subjects.length) b.subjects = subjects.map(i => SUBJECTS[i]);")
    body.append("    if (passing) b.passing = true;")
    body.append("    add(b);")
    body.append("  };")
    for r in state_rows:
        body.append('  S(' + ','.join(js(x) for x in (r['state'], r['bill'], sess_idx[(r['state'], r['sid'])], r['stage'], r['date'], r['text'], r['title'], r['summary'],
                                                      [subj_idx[x] for x in r['subjects']], r['url'], 1 if r['official'] else 0, 1 if r['passing'] else 0)) + ');')
    body.append('})();')
    text = head + '\n'.join(body) + '\n'
    print(f'federal: {len(fed)} bills (tracker updated {fed_updated or "?"}); {fed_official} read from their official GovInfo records')
    print('         by stage:', dict(sorted({st: sum(1 for b in fed if b['stage'] == st) for st in {b['stage'] for b in fed}}.items())))
    print(f'state:   {len(state_rows)} active bills written ({len(state_rows) - passing} about AI, {passing} only mentioning it in their text and hidden behind the checkbox), of {found} the Open States searches found ({dead} failed, withdrawn, vetoed or in a session that ended)')
    print(f'         search terms: {terms}' + (f' (unfinished, left out: {sorted(unfinished)})' if unfinished else ''))
    print('         by stage:', dict(sorted(by_stage.items())))
    print(f'         {sum(1 for r in state_rows if r["summary"])} with the legislature\'s own summary ({sum(1 for r in state_rows if r["summary"] and not r.get("site"))} from Open States, {sum(1 for r in state_rows if r.get("site"))} read from the legislature\'s site), {sum(1 for r in state_rows if r["subjects"])} with subject terms, {sum(1 for r in state_rows if r["official"])} linked to the legislature\'s own page')
    print(f'         {len({r["state"] for r in state_rows})} jurisdictions')
    print(f'file:    {len(text):,} bytes')
    if args.dry_run:
        print('(dry run: nothing written)')
        return
    with open(args.out, 'w', encoding='utf-8') as fh:
        fh.write(text)
    print('wrote', os.path.normpath(args.out))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    b = sub.add_parser('build', help='write data/legislation-bills.js')
    b.add_argument('--states-cache', default='~/.cache/ai-tracker/openstates', help='the folder tools/openstates_fetch.py saved the state searches in')
    b.add_argument('--brennan', default=BRENNAN_CSV, help='the Brennan Center sheet as CSV: a file or an address (default: the published sheet)')
    b.add_argument('--federal-cache', default=None, help='a folder to keep the GovInfo files in, so a rerun does not fetch them again')
    b.add_argument('--no-official', action='store_true', help='skip the GovInfo lookup and keep the tracker\'s own details')
    b.add_argument('--out', default=OUT)
    b.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()
    build(args)


if __name__ == '__main__':
    main()
