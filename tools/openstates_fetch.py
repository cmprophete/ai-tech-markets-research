#!/usr/bin/env python3
"""Fetch AI bills for every state, DC and Puerto Rico from the Open States API into a cache folder, for tools/legislation.py to read.

    python3 tools/openstates_fetch.py                         # every session since 2025-01-01, every phrase in TERMS below
    python3 tools/openstates_fetch.py --only NY,CA --max-requests 20
    python3 tools/openstates_fetch.py --wait-for-allowance 3     # a scheduled run: wait up to 3 hours if today's allowance is not back yet
    python3 tools/openstates_fetch.py --term "artificial intelligence" --term "generative" --since 2025-01-01

Why Open States: it follows each legislature's own record (official title, official summary where the legislature gives one, every action
with a standard classification, the session's dates), and publishes its data under a public-domain dedication with attribution
requested (https://open.pluralpolicy.com/data/). Its API needs a free key: save it, one line and nothing else, in ~/.openstates_key
(mode 600), or set OPENSTATES_API_KEY. The key is read here and never printed.

How the list is made: for every session of every jurisdiction that overlaps the window, a full-text search (the API's q parameter) for
each term, paged 20 at a time. A bill is on our list because the search found a term in its text, not because anyone else's list names
it. That is narrower than a human curator's idea of AI legislation (a bill about a chatbot that never says any of the phrases is missed)
and broader in places (a bill that mentions one in passing is found; the page keeps those behind a checkbox), and the build says which.
TERMS is the standing definition of what the list is a list of; --term overrides it for one run. "artificial intelligence" is searched
first in every session, and the build counts another term only once its search is finished everywhere (tools/legislation.py,
finished_terms), so a run that is cut short never leaves the page half-widened.

Limits and etiquette: the free key allows 10 requests a minute and 250 a day. Requests are spaced 7 seconds apart; on a per-minute 429 the
tool waits a minute and tries again; on the daily one it stops and says so, and the allowance comes back later (the next day). Every page is
saved as it arrives, so an interrupted or stopped run carries on where it stopped and a finished run costs nothing to repeat. The whole
list is about 500 requests, so a first run takes two or three days of the free allowance, and the same again if the cache is deleted to
re-fetch. Nothing here touches the repository: the cache defaults to ~/.cache/ai-tracker/openstates.
"""
import argparse
import datetime
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = 'https://v3.openstates.org'
SPACING = 7.0          # seconds between requests: 8.5 a minute, under the key's 10
INCLUDE = ['abstracts', 'actions', 'sources']
# What the state list is a list of: bills whose text says one of these. "artificial intelligence" comes first and is the base the build measures
# the others against (BASE_TERM in tools/legislation.py); deepfake bills often never say it, hence the other three.
TERMS = ['artificial intelligence', 'deepfake', 'digital replica', 'synthetic media']


def read_key():
    k = os.environ.get('OPENSTATES_API_KEY', '').strip()
    if not k:
        p = os.path.expanduser('~/.openstates_key')
        if os.path.exists(p):
            k = open(p).read().strip()
    if not k:
        sys.exit('ABORT: no Open States key. Save it in ~/.openstates_key (one line) or set OPENSTATES_API_KEY.')
    return k


class Client:
    def __init__(self, wait_hours=0.0):
        self.key, self.last, self.count, self.ok = read_key(), 0.0, 0, 0
        # With --wait-for-allowance, a day's limit that is already spent when the run starts is waited out (checking every ten minutes) up to this long
        # instead of stopping the run at once: a scheduled run cannot know to the minute when the allowance comes back.
        self.deadline = time.time() + wait_hours * 3600 if wait_hours else 0.0

    def get(self, path, params):
        q = urllib.parse.urlencode(params, doseq=True)
        attempt = 0
        while attempt < 6:
            wait = SPACING - (time.time() - self.last)
            if wait > 0:
                time.sleep(wait)
            self.last = time.time()
            self.count += 1
            req = urllib.request.Request(f'{BASE}{path}?{q}', headers={'X-API-KEY': self.key, 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json'})
            try:
                with urllib.request.urlopen(req, timeout=90) as r:
                    d = json.loads(r.read().decode('utf-8'))
                self.ok += 1
                return d
            except urllib.error.HTTPError as e:
                body = e.read().decode('utf-8', 'replace')[:300]
                if e.code == 429:
                    if re.search(r'/(day|hour)', body):
                        if not self.ok and time.time() < self.deadline:
                            print(f'  the daily allowance is spent ({body}) and nothing has been fetched yet this run; waiting 10 minutes for it to come back', flush=True)
                            time.sleep(600)
                            continue
                        sys.exit(f'STOP: a daily or hourly limit was reached ({body}). Run again later; everything fetched so far is saved.')
                    print(f'  rate limited ({body}); waiting 65 s', flush=True)
                    time.sleep(65)
                    attempt += 1
                    continue
                if e.code >= 500:
                    time.sleep(5 * (attempt + 1))
                    attempt += 1
                    continue
                sys.exit(f'ABORT: HTTP {e.code} for {path}?{q.split("&apikey")[0]}: {body}')
            except (urllib.error.URLError, TimeoutError) as e:
                print(f'  network trouble ({e}); retrying', flush=True)
                time.sleep(5 * (attempt + 1))
                attempt += 1
        sys.exit(f'ABORT: gave up on {path}')


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def code_of(jid):
    m = re.search(r'/(?:state|district|territory):([a-z]{2})\b', jid)
    return m.group(1) if m else slug(jid)[-8:]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--cache', default='~/.cache/ai-tracker/openstates', help='where to keep what is fetched (outside the repository)')
    ap.add_argument('--term', action='append', help='a full-text search term; repeat for several (default: every phrase in TERMS)')
    ap.add_argument('--since', default='2025-01-01', help='include sessions that end on or after this date (default 2025-01-01)')
    ap.add_argument('--only', default='', help='comma-separated jurisdiction codes, for example NY,CA')
    ap.add_argument('--max-requests', type=int, default=0, help='stop after this many requests (0 = no limit)')
    ap.add_argument('--wait-for-allowance', type=float, default=0.0, metavar='HOURS',
                    help="if the day's allowance is already spent when the run starts, wait up to this many hours for it to come back (checking every 10 minutes) instead of stopping at once; for a scheduled run")
    a = ap.parse_args()
    cache = os.path.expanduser(a.cache)
    os.makedirs(cache, exist_ok=True)
    terms = a.term or TERMS
    # which terms this cache holds searches for, so the build can say what the list is a list of
    tpath = os.path.join(cache, 'terms.json')
    held = json.load(open(tpath)) if os.path.exists(tpath) else (['artificial intelligence'] if os.path.isdir(os.path.join(cache, 'bills')) else [])
    json.dump(sorted(set(held) | set(terms), key=lambda t: (t != 'artificial intelligence', t)), open(tpath, 'w'))
    only = {x.strip().lower() for x in a.only.split(',') if x.strip()}
    today = datetime.date.today().isoformat()
    cl = Client(a.wait_for_allowance)

    jpath = os.path.join(cache, 'jurisdictions.json')
    if os.path.exists(jpath):
        jurs = json.load(open(jpath))
    else:
        jurs = []
        for page in (1, 2):
            d = cl.get('/jurisdictions', [('classification', 'state'), ('include', 'legislative_sessions'), ('per_page', 52), ('page', page)])
            jurs += d['results']
        json.dump(jurs, open(jpath, 'w'))
    todo = []
    for j in jurs:
        c = code_of(j['id'])
        if only and c not in only:
            continue
        for s in j.get('legislative_sessions', []):
            end, start = s.get('end_date'), s.get('start_date') or ''
            if (end is None or end >= a.since) and start <= today:
                todo.append((j, c, s))
    print(f'{len(todo)} sessions in {len({c for _, c, _ in todo})} jurisdictions, terms {terms}, spacing {SPACING:.0f} s', flush=True)

    fetched = hits = 0
    for j, c, s in todo:
        for term in terms:
            page, max_page = 1, 1
            while page <= max_page:
                fn = os.path.join(cache, 'bills', c, s['identifier'], f'{slug(term)}-p{page}.json')
                if os.path.exists(fn):
                    d = json.load(open(fn))
                else:
                    if a.max_requests and cl.count >= a.max_requests:
                        print(f'stopped at the request limit ({a.max_requests}); run again to continue', flush=True)
                        return
                    d = cl.get('/bills', [('jurisdiction', j['id']), ('session', s['identifier']), ('q', term), ('per_page', 20), ('page', page)] + [('include', i) for i in INCLUDE])
                    os.makedirs(os.path.dirname(fn), exist_ok=True)
                    json.dump(d, open(fn, 'w'))
                    fetched += 1
                max_page = d['pagination'].get('max_page') or 1
                if page == 1:
                    n = d['pagination'].get('total_items', 0)
                    hits += n
                    if n:
                        print(f'{c.upper():3} {s["identifier"]:10} {term!r}: {n} bills ({max_page} page{"s" if max_page > 1 else ""})', flush=True)
                page += 1
    print(f'done: {fetched} requests this run, {hits} matches across all sessions', flush=True)


if __name__ == '__main__':
    main()
