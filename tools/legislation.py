#!/usr/bin/env python3
"""Build data/legislation-bills.js, the bills the Legislation tab lists.

    python3 tools/openstates_fetch.py     # fetch the state bills (needs the key in ~/.openstates_key)
    python3 tools/congress_fetch.py       # fetch and scan the federal bills (no key)
    python3 tools/legislation.py build    # build the page's data from both

Where each part comes from, and nothing else:

  federal bills    GovInfo's Bill Status XML (https://www.govinfo.gov/bulkdata/BILLSTATUS; U.S. Government work, public domain, no key). Our own list:
                   tools/congress_fetch.py scans every bill and joint resolution of the 119th Congress for AI (the rule is documented there) and saves
                   the matches, each with its official record: titles, introduction dates, committees, latest action, stage, the Congressional Research
                   Service's summary and subject terms where it has written them, and the bills GovInfo says are identical to it.
  state bills      Open States (https://openstates.org, public-domain data, attribution requested), which follows each legislature's own
                   record. Our own list: tools/openstates_fetch.py runs a full-text search of every session since 2025 for each of a few
                   phrases (TERMS there: "artificial intelligence", "deepfake", "digital replica", "synthetic media"), and a bill is on the
                   list because its text says one of them. NCSL's list is NOT used to build it. A phrase counts only once its search is
                   finished in every session (finished_terms below): a half-finished one would make states look different because of
                   when they were searched, so its pages are left out and the build says so.

What it keeps, and why:
- Official records, not anyone's prose. A state bill carries its official title, the legislature's own summary where it gives one (capped at
  450 characters, ending in an ellipsis when cut), its subject index terms as the legislature wrote them, its latest action, and a link to
  the bill on the legislature's own site (else on Open States). A federal bill carries its official title and record, the Congressional Research
  Service's summary where it has written one (else the bill's official title) and its subject terms where it has assigned them. Identical House and Senate
  bills, which GovInfo says are one bill introduced in both chambers, share one row.
- Nothing from NCSL. Its Terms of Use (https://www.ncsl.org/terms-of-use) forbid copying its material without permission, and the owner
  chose not to ask. Our list was compared with NCSL's once, to see how they differ (docs/legislation-sources.md), and nothing of NCSL's is kept.
- Bills about AI first: the title or the legislature's own summary names artificial intelligence, AI, machine learning, generative AI, deepfakes,
  synthetic media, digital replicas, artificially or digitally generated or altered content, chatbots, large language models, algorithmic or
  automated decisions, or automation displacement. The search also finds a bill that says the phrase once in a long text; those are written
  with `passing: true`, counted in LEGISLATION_FEEDS.openstates.passing, and hidden until the page's checkbox ("Include bills that only mention
  AI", under More filters) is turned on. A federal bill is about AI when one of its titles names it (or a close relative of it: tools/congress_fetch.py); one that
  only its CRS summary names is written the same way, `passing: true`, and counted in LEGISLATION_FEEDS.govinfo.passing.
- Only bills that are active (the page's definition: introduced and not failed, data/legislation-data.js). A state bill is active when it
  became law, or when its session has not ended and its latest action is not a failure, withdrawal or veto. A bill the search found that is
  not active is counted in LEGISLATION_FEEDS.openstates.omitted and not written out. Open States' session dates are the legislatures' formal
  ones, so a bill stays active until its session formally ends: in California that is November 30, though the last day to pass bills was in
  August.
- The stage of a state bill comes from the standard classification Open States gives each action: passed by a chamber ("passage"), signed
  or became law, referred to a committee, introduced. A federal bill's stage comes from its GovInfo actions the same way.

The build stops, writing nothing, if an input has a shape it does not expect: a jurisdiction it does not know, a date that does not parse,
a bad link, a federal scan that is missing.
"""
import argparse
import datetime
import json
import os
import re
import sys

GOVINFO_PAGE = 'https://www.govinfo.gov/bulkdata/BILLSTATUS'
OPENSTATES_PAGE = 'https://openstates.org/'
STAGE_RANK = {'introduced': 0, 'committee': 1, 'one-chamber': 2, 'both-chambers': 3, 'enacted': 4}

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
STATE_SUMMARIES = os.path.join(ROOT, 'content', 'legislation-state-summaries.json')   # written by tools/state_summaries.py
OUT = os.path.join(ROOT, 'data', 'legislation-bills.js')

STATES = ('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY').split()
TERRITORIES = ('PR GU VI AS MP').split()
MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']


def die(msg):
    sys.exit('ABORT: ' + msg)


def date_long(y, m, d):
    return f'{MONTHS[m - 1]} {d}, {y}'


# ───────────────────────────── federal bills: tools/congress_fetch.py's scan of GovInfo ─────────────────────────────


def cap_committees(text, keep=3):
    """'A; B; C; D; E' -> 'A; B; C and 2 more': a few bills are referred to a dozen committees, which makes the row very tall."""
    items = [x.strip() for x in text.split(';') if x.strip()]
    return '; '.join(items[:keep]) + (f' and {len(items) - keep} more' if len(items) > keep else '')




def iso_long(iso):
    m = re.fullmatch(r'(\d{4})-(\d{2})-(\d{2})', iso or '')
    return date_long(int(m.group(1)), int(m.group(2)), int(m.group(3))) if m else ''


def federal_rows(cache):
    """The federal bills about AI, from the scan tools/congress_fetch.py saved (candidates.json in the cache folder): a row for each bill, or for each set of identical
    bills, which GovInfo says are one bill introduced in both chambers (a House bill and its Senate companion share a row, as the page has always shown them).
    Returns (rows, the scan's own details)."""
    path = os.path.join(os.path.expanduser(cache), 'candidates.json')
    if not os.path.exists(path):
        die(f'no federal scan in {cache}: run tools/congress_fetch.py first')
    scan = json.load(open(path, encoding='utf-8'))
    bills = {f"{b['kind']}:{b['number']}": b for b in scan['bills']}
    parent = {k: k for k in bills}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    for k, b in bills.items():
        for other in b['identical']:
            if other in bills:
                parent[find(k)] = find(other)
    groups = {}
    for k in bills:
        groups.setdefault(find(k), []).append(bills[k])
    rows = []
    for members in groups.values():
        members.sort(key=lambda m: (m['kind'] in ('s', 'sjres'), int(m['number'])))      # the House bill first, then the Senate's
        first = members[0]
        stage = max((m['stage'] for m in members), key=lambda x: STAGE_RANK[x])
        lasts = [m['last'] for m in members if m['last']]
        when = [(m['chamber'], iso_long(m['introduced'])) for m in members if m['introduced']]
        intro = ''
        if len(when) == 1:
            intro = 'Introduced ' + when[0][1]
        elif when:
            intro = 'Introduced ' + ' and '.join(f'in the {c} {d}' for c, d in when)
        if len(members) == 1:
            names = '; '.join(n for _, n in first['committees'])
            comm = ('Committee: ' + cap_committees(names)) if names else ''
        else:
            parts = []
            for m in members:
                for ch in sorted({c for c, _ in m['committees']}):
                    part = f'{ch}: ' + cap_committees('; '.join(n for c, n in m['committees'] if c == ch))
                    if part not in parts:
                        parts.append(part)
            comm = ('Committees: ' + '. '.join(parts)) if parts else ''
        law = next((m['law'] for m in members if m['law']), '')
        status = '. '.join(x for x in (('Became law (' + law + ')') if law else '', intro, comm) if x)
        official = first['officialTitle'] if first['officialTitle'] and first['officialTitle'] != first['title'] else ''
        summary = cap_text(next((m['summary'] for m in members if m['summary']), '') or official)
        subjects = []
        for m in members:
            for x in m['subjects']:
                if x not in subjects:
                    subjects.append(x)
        row = {'id': 'fed-' + first['kind'] + first['number'], 'level': 'federal', 'bill': '; '.join(m['bill'] for m in members), 'title': first['title'],
               'session': f"{scan['congress']}th Congress", 'stage': stage, 'source': {'label': 'Congress.gov', 'url': first['url']}}
        if status:
            row['status'] = status
        if summary:
            row['summary'] = summary
        if lasts:
            row['lastAction'] = max(lasts, key=lambda x: x['date'])
        if subjects:
            row['subjects'] = subjects
        if all(m['tier'] == 'summary' for m in members):
            row['passing'] = True
        rows.append(row)
    order = {'hr': 0, 'hjres': 1, 's': 2, 'sjres': 3}
    rows.sort(key=lambda r: (order[re.match(r'fed-([a-z]+)', r['id']).group(1)], int(re.search(r'(\d+)$', r['id']).group(1))))
    ids = [r['id'] for r in rows]
    if len(ids) != len(set(ids)):
        die('a federal bill listed twice')
    return rows, scan


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


def read_day(cache, terms):
    """The day the OLDEST saved page of a session still in progress was fetched: what the page says the state bills were read on. The day the
    build ran would be wrong (it was, until 2026-11-17: the page said "read November 16" over pages fetched on November 12), because a build only
    reads what is already in the cache, and a bill's status is only as recent as the page it came from. A session that has ended is left out of
    this: nothing more happens to its bills, so its old pages are as current as new ones would be, and counting them would keep the date at the
    first fetch for ever. With no session in progress, the oldest page of all. `openstates_fetch.py --refresh-open` moves this day forward."""
    root = os.path.expanduser(cache)
    today = datetime.date.today().isoformat()
    in_progress = {(os_code(j['id']), s['identifier']) for j in json.load(open(os.path.join(root, 'jurisdictions.json')))
                   for s in j.get('legislative_sessions', []) if s.get('end_date') is None or s['end_date'] >= today}
    names = [re.compile(re.escape(slug(t)) + r'-p\d+\.json') for t in terms]
    base = os.path.join(root, 'bills')
    every, open_ones = [], []
    for c in os.listdir(base):
        for s in os.listdir(os.path.join(base, c)):
            d = os.path.join(base, c, s)
            if os.path.isdir(d):
                stamps = [os.path.getmtime(os.path.join(d, f)) for f in os.listdir(d) if any(n.fullmatch(f) for n in names)]
                every += stamps
                if (c.upper(), s) in in_progress:   # the cache's folders are lower case, os_code() is upper case
                    open_ones += stamps
    stamps = open_ones or every
    return datetime.date.fromtimestamp(min(stamps)).isoformat() if stamps else today


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


# ───────────────────────────── writing the file ─────────────────────────────
def js(v):
    return json.dumps(v, ensure_ascii=False, separators=(',', ':'))


def build(args):
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
    fed, scan = federal_rows(args.federal_cache)
    fed_passing = sum(1 for r in fed if r.get('passing'))
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
        'govinfo': {'org': 'U.S. Government Publishing Office', 'short': 'GovInfo', 'title': 'Bill Status XML Bulk Data', 'kind': 'bulk data', 'read': scan['read'],
                    'url': GOVINFO_PAGE, 'level': 'federal',
                    'scope': f"every bill and joint resolution of the {scan['congress']}th Congress whose title names AI or a close relative of it, such as deepfakes or chatbots",
                    'summaries': 'Summaries are the Congressional Research Service\'s where it has written one, else the bill\'s official title.',
                    'included': len(fed) - fed_passing, 'passing': fed_passing, 'leftOut': 0},
    }
    feeds['openstates'] = {'org': 'Open States', 'short': 'Open States', 'title': 'Bill search', 'kind': 'API v3', 'read': read_day(args.states_cache, terms),
                           'url': OPENSTATES_PAGE, 'level': 'state', 'scope': 'every bill since 2025 whose text mentions ' + terms_text, 'found': found, 'included': len(state_rows) - passing, 'passing': passing,
                           **({'summaries': summaries_note} if summaries_note else {}),
                           'omitted': [{'n': dead, 'why': 'failed, were withdrawn or vetoed, or whose session ended without passing them'}]}
    head = f"""/* data/legislation-bills.js: the bills the Legislation tab lists. GENERATED by tools/legislation.py, do not edit by hand.
   Sources, and nothing else: GovInfo's Bill Status XML (the federal bills: tools/congress_fetch.py scans every bill and joint resolution of the 119th Congress
   for AI in a title or in the Congressional Research Service's summary) and Open States (state bills: a full-text search of every session since 2025 for
   "artificial intelligence"). A federal bill's summary is the CRS's where it has written one, else its official title; a state bill's summary is the
   legislature's own: Open States' where it has one, else (Illinois, New Jersey) the one the legislature publishes on its own site, read by tools/state_summaries.py
   into content/legislation-state-summaries.json.
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
    print(f"federal: {len(fed)} rows ({len(fed) - fed_passing} with AI in a title, {fed_passing} only in the CRS summary and hidden behind the checkbox), from the scan of {sum(scan['scanned'].values()):,} GovInfo files read {scan['read']} (GovInfo last changed them {scan['updated'] or '?'})")
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
    b.add_argument('--federal-cache', default='~/.cache/ai-tracker/congress', help='the folder tools/congress_fetch.py saved its scan in')
    b.add_argument('--out', default=OUT)
    b.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()
    build(args)


if __name__ == '__main__':
    main()
