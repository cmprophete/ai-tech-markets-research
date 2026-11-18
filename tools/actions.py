#!/usr/bin/env python3
"""
actions.py -- the key cases and the enforcement actions, curated in the Google Sheet.

    python3 tools/actions.py check                 validate the committed snapshots, and confirm that
                                                   data/legislation-actions.js is what they build
    python3 tools/actions.py check --cases URL --enforcement URL
                                                   validate the two tabs as the Sheet has them now
    python3 tools/actions.py build                 content/cases.csv + content/enforcement.csv
                                                   -> data/legislation-actions.js
    python3 tools/actions.py build --cases URL --enforcement URL
                                                   pull the two published tabs (CSV), snapshot them
                                                   to content/, then regenerate (what the daily sync runs)
    python3 tools/actions.py selftest              prove the rules and the round trip on in-memory sheets

WHAT THIS OWNS. All of data/legislation-actions.js (the LEGISLATION_ACTIONS array the Enforcement and
Cases sections of the Government action tab list) and the two snapshots content/enforcement.csv and
content/cases.csv. The Sheet is the master: the daily sync is the only writer of these three files, so
never edit them by hand and never commit a local `build` (the same one-writer rule as the research list,
tools/research.py). Add, change, approve and archive rows in the Sheet.

THE SHEET. The tabs `enforcement` (an agency or an attorney general acted) and `cases` (a court decided,
or is deciding) have the same columns, read by header name, so their order in the Sheet does not matter:
    status        under review | approved | archived. BLANK = under review. Only `approved` rows are
                  published, and only they must be complete, so a row can be typed over several days
                  and nothing half-finished reaches the site. Any other word stops the sync and names
                  the row. Archived rows are kept in the Sheet and not published.
    date          the date of the action or the ruling.
    who acted     "Federal Trade Commission", "Texas Attorney General", or the court,
                  "U.S. District Court, N.D. Cal."
    jurisdiction  "Federal", or the state (its name or its USPS code; also DC and Puerto Rico) whose
                  attorney general acted or whose court decided. It decides where the row is listed.
    matter        what to call it, on one line: "FTC and Rite Aid", "Mobley v. Workday".
    description   one or two sentences in our own words: what was alleged or decided, and what was
                  required. An allegation is "alleged", never "found": most enforcement actions are
                  settlements without an admission, and a ruling is only what that court held.
    outcome       how it ended or stands: "Consent order", "Lawsuit filed (pending)".   (optional)
    checked       the date the outcome was last checked against the source: a case moves, so an
                  outcome always says when it was looked at. Needed whenever there is an outcome.
    source        the agency's or the court's own page for it, never a news story or a tracker's
                  write-up (http or https).
    topics        the topics it bears on, as the labels of LEGISLATION_TOPICS in
                  data/legislation-data.js (or their ids), separated by semicolons or line breaks
                  (some labels have commas):  "Consumer protection and disclosure; Privacy and data".
                                                                                      (optional)
    notes         free text; never published.
Dates may be typed as 2026-06-01, 6/1/2026 or June 1, 2026 (cells formatted yyyy-mm-dd are best).

A row's id is made here, from its matter and its year (and a number when two would be alike), and the
page only needs it to be unique. Rows are listed newest first within each kind.

GOOGLE SHEETS. Publish each tab as CSV (File > Share > Publish to web > pick the tab > CSV) and give the
two links to `build --cases URL --enforcement URL`; the daily sync reads them from the repository
variables CASES_SHEET_URL and ENFORCEMENT_SHEET_URL (see .github/workflows/research-sync.yml). The page
never reads the Sheet, only this build step does. A published tab is readable by anyone who has its link,
rows under review and `notes` included, as the research tab is.

No dependencies beyond the Python standard library.
"""

import csv
import datetime
import io
import os
import re
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import research  # noqa: E402  (the JS reader and writer and the Sheet link normaliser are shared)

ROOT = research.ROOT
DATA = os.path.join(ROOT, "data", "legislation-actions.js")
TOPICS_DATA = os.path.join(ROOT, "data", "legislation-data.js")
MAP_DATA = os.path.join(ROOT, "data", "us-map.js")

# One entry per tab, in the order the file lists them: the enforcement actions, then the key cases.
TABS = (
    {"kind": "enforcement", "tab": "enforcement", "heading": "Enforcement actions",
     "snapshot": os.path.join(ROOT, "content", "enforcement.csv")},
    {"kind": "case", "tab": "cases", "heading": "Key cases",
     "snapshot": os.path.join(ROOT, "content", "cases.csv")},
)

# The snapshot's columns, in this order. Rows are read from the Sheet by header name.
COLUMNS = ["status", "date", "who acted", "jurisdiction", "matter", "description", "outcome",
           "checked", "source", "topics", "notes"]
# A tab without one of these has not been set up yet; `topics` and `notes` may be missing.
NEEDED = ("status", "date", "who acted", "jurisdiction", "matter", "description", "outcome",
          "checked", "source")

UNDER_REVIEW, APPROVED, ARCHIVED = "under review", "approved", "archived"
STATUSES = (UNDER_REVIEW, APPROVED, ARCHIVED)

# The places a row can be listed under: the same ones the page's Show menu has (the 50 states, DC,
# Puerto Rico). `selftest` compares this list with data/us-map.js.
STATES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California",
    "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "DC": "District of Columbia",
    "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois",
    "IN": "Indiana", "IA": "Iowa", "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana",
    "ME": "Maine", "MD": "Maryland", "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota",
    "MS": "Mississippi", "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
    "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
    "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma", "OR": "Oregon",
    "PA": "Pennsylvania", "PR": "Puerto Rico", "RI": "Rhode Island", "SC": "South Carolina",
    "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont",
    "VA": "Virginia", "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
}
PLACES = {"federal": ("federal", None)}
for _code, _name in STATES.items():
    PLACES[_name.lower()] = ("state", _code)
    PLACES[_code.lower()] = ("state", _code)

MONTHS = {name: i for i, name in enumerate(
    ("january", "february", "march", "april", "may", "june", "july", "august", "september",
     "october", "november", "december"), 1)}

URL = re.compile(r"^https?://\S+$", re.I)


# ── reading a tab ───────────────────────────────────────────────────────────

def norm(s):
    """A header or a status word: lower case, one space between words (an underscore counts as a space)."""
    return re.sub(r"\s+", " ", (s or "").replace("_", " ")).strip().lower()


def clean(s):
    """A text cell on one line: runs of white space (line breaks too) become one space."""
    return re.sub(r"\s+", " ", s or "").strip()


def parse_date(text):
    """2026-06-01, 6/1/2026 or June 1, 2026 -> a date; anything else (or a day that does not exist) -> None."""
    s = (text or "").strip()
    m = re.fullmatch(r"(\d{4})-(\d{1,2})-(\d{1,2})", s)
    if m:
        y, mo, d = (int(g) for g in m.groups())
    else:
        m = re.fullmatch(r"(\d{1,2})/(\d{1,2})/(\d{4})", s)
        if m:
            mo, d, y = (int(g) for g in m.groups())
        else:
            m = re.fullmatch(r"([A-Za-z]{3,9})\.? (\d{1,2}), (\d{4})", s)
            if not m:
                return None
            word = m.group(1).lower()
            mo = next((i for name, i in MONTHS.items() if name.startswith(word)), None)
            if mo is None:
                return None
            d, y = int(m.group(2)), int(m.group(3))
    try:
        return datetime.date(y, mo, d)
    except ValueError:
        return None


def read_tab(text, tab):
    """Parse a tab's CSV. Returns (rows, error): rows are dicts keyed by COLUMNS plus `_n`, the row's
    number in the Sheet (the header is row 1); error is a sentence when the tab is not set up."""
    reader = csv.reader(io.StringIO(text))
    header = next(reader, None)
    if not header:
        return [], f"the `{tab}` tab came back with no header row"
    names = [norm(h) for h in header]
    missing = [c for c in NEEDED if c not in names]
    if missing:
        return [], (f"the `{tab}` tab has no column named " + ", ".join(f"`{c}`" for c in missing)
                    + " (headers found: " + ", ".join(h.strip() for h in header if h.strip()) + ")")
    rows = []
    for n, cells in enumerate(reader, start=2):
        row = {c: "" for c in COLUMNS}
        seen = set()
        for name, value in zip(names, cells):
            if name in row and name not in seen:
                row[name] = value
                seen.add(name)
        if not any(v.strip() for v in row.values()):
            continue
        row["_n"] = n
        rows.append(row)
    return rows, None


def topic_lookup():
    """({label or id, lower case: id}, [ids]) from LEGISLATION_TOPICS in data/legislation-data.js."""
    with open(TOPICS_DATA, encoding="utf-8") as fh:
        text = fh.read()
    _, _, topics = research.find_array_span(text, "LEGISLATION_TOPICS")
    lookup, ids = {}, []
    for t in topics:
        if t.get("id"):
            ids.append(t["id"])
            lookup[t["id"].lower()] = t["id"]
            lookup[clean(t.get("label") or t["id"]).lower()] = t["id"]
    return lookup, ids


# ── the rules ───────────────────────────────────────────────────────────────

def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")


def check_row(row, tab, kind, lookup, today):
    """Validate an APPROVED row. Returns (entry, errors): the entry as the page reads it, or None."""
    errs = []
    label = f'{tab} row {row["_n"]} ("{clean(row["matter"]) or clean(row["who acted"]) or "no matter yet"}")'

    def need(what, ok):
        if not ok:
            errs.append(f"{label}: {what}")

    body = clean(row["who acted"])
    need("`who acted` is empty", body)
    when = parse_date(row["date"])
    need(f'`date` "{row["date"].strip()}" is not a date (write it as 2026-06-01)' if row["date"].strip()
         else "`date` is empty", when)
    if when and when > today + datetime.timedelta(days=1):
        errs.append(f"{label}: `date` {when.isoformat()} is in the future")
        when = None
    matter = row["matter"].strip()
    need("`matter` is empty", matter)
    if matter and re.search(r"[\r\n]", matter):
        errs.append(f"{label}: `matter` must be one line: the sentences about it go in `description`")
    what = clean(row["description"])
    need("`description` is empty", what)
    url = row["source"].strip()
    need("`source` is empty" if not url else f'`source` "{url}" is not an http(s) link', URL.match(url))
    where = norm(row["jurisdiction"])
    place = PLACES.get(where)
    if not where:
        errs.append(f"{label}: `jurisdiction` is empty (Federal, or the state)")
    elif not place:
        errs.append(f'{label}: `jurisdiction` "{row["jurisdiction"].strip()}" is not Federal, a state, '
                    "DC or Puerto Rico")
    outcome = clean(row["outcome"])
    checked = None
    if row["checked"].strip():
        checked = parse_date(row["checked"])
        if not checked:
            errs.append(f'{label}: `checked` "{row["checked"].strip()}" is not a date (write it as 2026-11-17)')
        elif checked > today + datetime.timedelta(days=1):
            errs.append(f"{label}: `checked` {checked.isoformat()} is in the future")
            checked = None
        elif when and checked < when:
            errs.append(f"{label}: `checked` {checked.isoformat()} is before the `date` {when.isoformat()}")
    elif outcome:
        errs.append(f"{label}: there is an `outcome` but no `checked` date: say when it was last checked")
    uses = []
    for token in re.split(r"[;\n]", row["topics"]):
        token = clean(token)
        if not token:
            continue
        found = lookup.get(token.lower())
        if not found:
            errs.append(f'{label}: topic "{token}" is not one of the page\'s topics (see LEGISLATION_TOPICS in '
                        "data/legislation-data.js); separate topics with semicolons")
        elif found not in uses:
            uses.append(found)
    if errs:
        return None, errs
    entry = {"kind": kind, "level": place[0]}
    if place[1]:
        entry["state"] = place[1]
    entry.update({"body": body, "date": when.isoformat(), "title": clean(matter)})
    if uses:
        entry["uses"] = uses
    entry["what"] = what
    if outcome:
        entry["outcome"] = outcome
    if checked:
        entry["asOf"] = checked.isoformat()
    entry["url"] = url
    return entry, []


def compile_tabs(texts, lookup, today=None):
    """texts: {tab name: CSV text}. Returns (entries, errors, rows): the approved rows as the page reads
    them (newest first within each kind, with ids), what is wrong, and every parsed row by tab."""
    today = today or datetime.date.today()
    errors, entries, parsed = [], [], {}
    for spec in TABS:
        tab = spec["tab"]
        rows, problem = read_tab(texts[tab], tab)
        parsed[tab] = rows
        if problem:
            errors.append(problem)
            continue
        for row in rows:
            status = norm(row["status"]) or UNDER_REVIEW
            if status not in STATUSES:
                errors.append(f'{tab} row {row["_n"]} ("{clean(row["matter"]) or clean(row["who acted"]) or "no matter yet"}"): '
                              f'`status` "{row["status"].strip()}" is not one of: under review, approved, archived '
                              "(blank means under review)")
            elif status == APPROVED:
                entry, errs = check_row(row, tab, spec["kind"], lookup, today)
                errors.extend(errs)
                if entry:
                    entries.append(entry)
    if errors:
        return [], errors, parsed
    order = {spec["kind"]: i for i, spec in enumerate(TABS)}
    entries.sort(key=lambda e: (order[e["kind"]], [-int(p) for p in e["date"].split("-")], e["title"].lower()))
    taken = set()
    for e in entries:
        base = f'{slug(e["title"]) or "row"}-{e["date"][:4]}'
        name, n = base, 1
        while name in taken:
            n += 1
            name = f"{base}-{n}"
        taken.add(name)
        e["id"] = name
    return entries, [], parsed


def counts(parsed):
    """{status: rows} across the tabs, for the one-line summary."""
    n = {s: 0 for s in STATUSES}
    for rows in parsed.values():
        for row in rows:
            s = norm(row["status"]) or UNDER_REVIEW
            if s in n:
                n[s] += 1
    return n


# ── the generated file ──────────────────────────────────────────────────────

HEADER = """\
/* data/legislation-actions.js: the enforcement actions and the key cases listed by the Enforcement and Cases sections of the Government action tab (src/js/55-enforcement.js).

   GENERATED by tools/actions.py from the `enforcement` and `cases` tabs of the Google Sheet (their snapshots are content/enforcement.csv and content/cases.csv). The daily sync is the
   only writer of this file: DO NOT EDIT IT, and do not commit a local build. Add, change, approve and archive rows in the Sheet; a row reaches this file only when its `status` is
   approved. How to fill in a row, and the rules for it, are in content/README.md. The file loads at runtime, so a reload shows a change; no build.

   Actions and cases are NEVER counted with the bills: each list has its own count, because an agency settlement or a court ruling is not a bill. WHERE a row is listed: `level` and
   `state` decide it. A federal row is listed under Federal (agencies and courts), a state attorney general's action or a state court's case under its state, and every row under All
   jurisdictions. A row, as the page reads it:

     id        a short unique key, made from the title and the year
     kind      "enforcement" (an agency or attorney general acted: listed in Enforcement) or "case" (a court decided, or is deciding: listed in Cases)
     level     "federal" or "state"
     state     the USPS code, for a state attorney general's action or a state court's case; left out for a federal one
     body      who acted
     date      the date of the action or the ruling
     title     what to call it
     uses      the topics it bears on, as ids of LEGISLATION_TOPICS in data/legislation-data.js (left out when there are none)
     what      one or two sentences in our own words
     outcome   how it ended or stands (left out when there is none)
     asOf      the date the outcome was last checked, shown beside it
     url       the agency's or the court's own page for it

   Rules. Only the agency's or the court's own documents are a source: a tracker's or a law firm's description of a case is theirs, not ours to copy. Every entry is checked against that
   page before it goes in, and read by someone with legal training. Nothing here is legal advice, and the page says nothing like it. */
"""


def entry_js(e):
    q = research.js_string
    head = [f'id: {q(e["id"])}', f'kind: {q(e["kind"])}', f'level: {q(e["level"])}']
    if e.get("state"):
        head.append(f'state: {q(e["state"])}')
    head += [f'body: {q(e["body"])}', f'date: {q(e["date"])}', f'title: {q(e["title"])}']
    lines = ["  { " + ", ".join(head) + ","]
    if e.get("uses"):
        lines.append("    uses: [" + ", ".join(q(u) for u in e["uses"]) + "],")
    lines.append(f'    what: {q(e["what"])},')
    tail = []
    if e.get("outcome"):
        tail.append(f'outcome: {q(e["outcome"])}')
    if e.get("asOf"):
        tail.append(f'asOf: {q(e["asOf"])}')
    if tail:
        lines.append("    " + ", ".join(tail) + ",")
    lines.append(f'    url: {q(e["url"])} }},')
    return "\n".join(lines)


def serialize(entries):
    out = [HEADER, "const LEGISLATION_ACTIONS = ["]
    for spec in TABS:
        mine = [e for e in entries if e["kind"] == spec["kind"]]
        if mine:
            out.append(f'  /* ── {spec["heading"]} ── */')
            out.extend(entry_js(e) for e in mine)
    out.append("];\n")
    return "\n".join(out)


# ── snapshots and the Sheet ─────────────────────────────────────────────────

def snapshot_text(rows):
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(COLUMNS)
    for row in rows:
        w.writerow([row[c] for c in COLUMNS])
    return buf.getvalue()


def read_snapshot(spec):
    if not os.path.exists(spec["snapshot"]):
        return None
    with open(spec["snapshot"], encoding="utf-8", newline="") as fh:
        return fh.read()


def fetch_tab(url, tab):
    """A published tab as CSV text, guarding against getting an HTML login or error page instead."""
    with urllib.request.urlopen(research.sheet_csv_url(url), timeout=30) as resp:
        text = resp.read().decode("utf-8")
    first = text.split("\n", 1)[0].lower()
    if text.lstrip()[:1] == "<" or "matter" not in first or "who acted" not in first:
        raise SystemExit(
            f"actions: that URL did not return the `{tab}` tab as CSV.\n"
            "  In Google Sheets: File > Share > Publish to web > pick the tab > CSV, and use that link\n"
            "  (or a .../export?format=csv&gid=... link).")
    return text


def load_texts(urls):
    """(texts, from_sheet): the CSV of each tab, from the links when given, else from the snapshots."""
    texts = {}
    for spec in TABS:
        tab = spec["tab"]
        if urls:
            texts[tab] = fetch_tab(urls[tab], tab)
        else:
            text = read_snapshot(spec)
            if text is None:
                raise SystemExit(f"actions: {os.path.relpath(spec['snapshot'], ROOT)} does not exist. "
                                 "Run `python3 tools/actions.py build --cases URL --enforcement URL` once "
                                 "(in a scratch copy of the repo) to make the snapshots.")
            texts[tab] = text
    return texts


def emptied(parsed, urls):
    """The tabs the Sheet returned with no data row while the committed snapshot has some: almost certainly a
    bad export, not a decision to take every row off the site."""
    out = []
    if not urls:
        return out
    for spec in TABS:
        old = read_snapshot(spec)
        if old is None:
            continue
        old_rows, _ = read_tab(old, spec["tab"])
        if old_rows and not parsed[spec["tab"]]:
            out.append(spec["tab"])
    return out


def current_file():
    try:
        with open(DATA, encoding="utf-8") as fh:
            return fh.read()
    except FileNotFoundError:
        return ""


def summary(entries, parsed):
    n = counts(parsed)
    others = ", ".join(f"{n[s]} {s}" for s in (UNDER_REVIEW, ARCHIVED) if n[s])
    nouns = {"enforcement": ("enforcement action", "enforcement actions"), "case": ("key case", "key cases")}
    by_kind = ", ".join(
        f'{k} {nouns[s["kind"]][0 if k == 1 else 1]}'
        for s in TABS for k in [sum(1 for e in entries if e["kind"] == s["kind"])])
    return f"{len(entries)} approved rows ({by_kind})" + (f"; {others}, not published" if others else "")


def report(errors, verb):
    print(f"{verb}: {len(errors)} problem(s):", file=sys.stderr)
    for e in errors:
        print("  - " + e, file=sys.stderr)


def cmd_check(urls, allow_empty=False):
    lookup, _ = topic_lookup()
    texts = load_texts(urls)
    entries, errors, parsed = compile_tabs(texts, lookup)
    if errors:
        report(errors, "check")
        return 1
    bad = [] if allow_empty else emptied(parsed, urls)
    if bad:
        print("check: the " + " and ".join(f"`{t}`" for t in bad) + " tab came back with no rows, while the committed "
              "snapshot has some. If that is meant, pass --allow-empty.", file=sys.stderr)
        return 1
    fresh = serialize(entries)
    if urls:
        if fresh != current_file():
            print("  note: the Sheet differs from data/legislation-actions.js; the next sync will change it")
    elif fresh != current_file():
        print("check: data/legislation-actions.js is not what content/enforcement.csv and content/cases.csv build.\n"
              "  It was edited by hand, or a snapshot changed without a rebuild. The file has one writer, the\n"
              "  daily sync from the Sheet: take main's copy of all three, or run\n"
              "  `python3 tools/actions.py build` in a scratch copy and compare.", file=sys.stderr)
        return 1
    print("  ok  " + summary(entries, parsed))
    return 0


def cmd_build(urls, allow_empty=False):
    lookup, _ = topic_lookup()
    texts = load_texts(urls)
    entries, errors, parsed = compile_tabs(texts, lookup)
    if errors:
        report(errors, "build: refusing to write")
        return 1
    bad = [] if allow_empty else emptied(parsed, urls)
    if bad:
        print("build: refusing to write: the " + " and ".join(f"`{t}`" for t in bad) + " tab came back with no rows, "
              "while the committed snapshot has some. If that is meant, pass --allow-empty.", file=sys.stderr)
        return 1
    if urls:
        for spec in TABS:
            with open(spec["snapshot"], "w", encoding="utf-8", newline="") as fh:
                fh.write(snapshot_text(parsed[spec["tab"]]))
            print(f"  wrote  {os.path.relpath(spec['snapshot'], ROOT)}  (snapshot of the Sheet, {len(parsed[spec['tab']])} rows)")
    with open(DATA, "w", encoding="utf-8") as fh:
        fh.write(serialize(entries))
    print(f"  wrote  data/legislation-actions.js  ({summary(entries, parsed)})")
    print("  Reload the page to see it; commit + push to publish.")
    return 0


# ── self-test ───────────────────────────────────────────────────────────────

def _csv(rows, header=None):
    """A tab's CSV text from dicts keyed by column (any column left out is blank)."""
    cols = header or COLUMNS
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(cols)
    for r in rows:
        w.writerow([r.get(c, "") for c in cols])
    return buf.getvalue()


def _selftest():
    problems, done = [], [0]

    def expect(ok, what):
        done[0] += 1
        if not ok:
            problems.append(what)

    lookup, ids = topic_lookup()
    today = datetime.date(2026, 11, 18)
    good = {"status": "approved", "date": "2026-06-01", "who acted": "Texas Attorney General", "jurisdiction": "Texas",
            "matter": "Texas and Example Co", "description": "The state alleged a thing.", "outcome": "Settlement",
            "checked": "2026-11-17", "source": "https://example.org/a", "topics": "Consumer protection and disclosure"}

    def run(enf=(), cases=(), header=None):
        texts = {"enforcement": _csv(list(enf), header), "cases": _csv(list(cases), header)}
        return compile_tabs(texts, lookup, today)

    def errs_of(**over):
        row = dict(good)
        row.update(over)
        return run(enf=[row])[1]

    # the page's own lists: topics, and the places
    expect(len(ids) >= 10 and "consumer" in ids and "privacy" in ids, "the topics are read from data/legislation-data.js")
    with open(MAP_DATA, encoding="utf-8") as fh:
        in_map = dict(re.findall(r'([A-Z]{2}): \{ name: "([^"]+)"', fh.read()))
    expect(all(STATES.get(c) == n for c, n in in_map.items()) and set(STATES) == set(in_map) | {"PR"},
           "STATES is the page's list (data/us-map.js) plus Puerto Rico")

    # a good row, and what it becomes
    entries, errs, parsed = run(enf=[good])
    e = entries[0] if entries else {}
    expect(not errs and len(entries) == 1 and e.get("kind") == "enforcement" and e.get("level") == "state" and e.get("state") == "TX"
           and e.get("body") == "Texas Attorney General" and e.get("date") == "2026-06-01" and e.get("title") == "Texas and Example Co"
           and e.get("uses") == ["consumer"] and e.get("what") == "The state alleged a thing." and e.get("outcome") == "Settlement"
           and e.get("asOf") == "2026-11-17" and e.get("url") == "https://example.org/a" and e.get("id") == "texas-and-example-co-2026",
           "an approved row becomes the page's row: place, topics (by label), outcome, checked date, id")
    entries, errs, _ = run(cases=[dict(good, jurisdiction="Federal", **{"who acted": "U.S. District Court, N.D. Cal."})])
    expect(not errs and entries[0]["kind"] == "case" and entries[0]["level"] == "federal" and "state" not in entries[0],
           "a row on the cases tab is a case, and a federal one has no state")

    # the status: blank means under review, and only approved rows are published or checked
    entries, errs, parsed = run(enf=[{"matter": "just a start"}, dict(good, status=""), dict(good, status="archived", source="")])
    expect(not errs and not entries and counts(parsed) == {UNDER_REVIEW: 2, APPROVED: 0, ARCHIVED: 1},
           "blank status is under review, and neither an under-review nor an archived row is published or checked")
    expect(any("status" in x and "Done" in x for x in errs_of(status="Done")), "an unknown status word stops the build and names the row")
    expect(not errs_of(status="  Approved "), "status matching ignores capitals and extra spaces")

    # what an approved row must have
    for col, label in (("who acted", "who acted"), ("date", "date"), ("matter", "matter"), ("description", "description"),
                       ("source", "source"), ("jurisdiction", "jurisdiction")):
        expect(any(f"`{label}`" in x for x in errs_of(**{col: ""})), f"an approved row without `{col}` is refused")
    expect(not errs_of(outcome="", checked=""), "outcome and checked may both be left out")
    expect(not errs_of(outcome="", checked="2026-11-17"), "a checked date without an outcome is fine")
    expect(any("`checked`" in x for x in errs_of(checked="")), "an outcome without a checked date is refused")
    expect(any("is not a date" in x for x in errs_of(date="soon")), "a date that is not one is refused")
    expect(any("is not a date" in x for x in errs_of(date="2026-02-30")), "a day that does not exist is refused")
    expect(any("future" in x for x in errs_of(date="2026-12-31")), "a date in the future is refused")
    expect(any("before the `date`" in x for x in errs_of(checked="2026-05-01")), "a checked date before the date is refused")
    expect(any("one line" in x for x in errs_of(matter="two\nlines")), "a matter on two lines is refused")
    for bad in ("example.org/a", "ftp://example.org/a", "javascript:alert(1)", "https://a b"):
        expect(any("`source`" in x for x in errs_of(source=bad)), f"a source that is not an http(s) link is refused: {bad}")
    for ok_date in ("2026-06-01", "6/1/2026", "June 1, 2026", "Jun 1, 2026", "2026-6-1"):
        entries, errs, _ = run(enf=[dict(good, date=ok_date)])
        expect(not errs and entries[0]["date"] == "2026-06-01", f"the date {ok_date} is read as 2026-06-01")

    # places
    for text, level, state in (("Federal", "federal", None), (" federal ", "federal", None), ("Texas", "state", "TX"), ("tx", "state", "TX"),
                               ("District of Columbia", "state", "DC"), ("dc", "state", "DC"), ("Puerto Rico", "state", "PR"),
                               ("new  york", "state", "NY")):
        entries, errs, _ = run(enf=[dict(good, jurisdiction=text)])
        expect(not errs and entries[0]["level"] == level and entries[0].get("state") == state, f"the jurisdiction {text!r} is read")
    expect(any("jurisdiction" in x and "Narnia" in x for x in errs_of(jurisdiction="Narnia")), "an unknown jurisdiction is refused")

    # topics: labels with commas, ids, line breaks, duplicates, unknown ones, none
    entries, errs, _ = run(enf=[dict(good, topics="Journalism, copyright and creative work; Privacy and data")])
    expect(not errs and entries[0]["uses"] == ["media", "privacy"], "topics are separated by semicolons, so a label with a comma stays whole")
    entries, errs, _ = run(enf=[dict(good, topics="privacy\nKids;  privacy ")])
    expect(not errs and entries[0]["uses"] == ["privacy", "kids"], "topics may be ids, in any case, on separate lines, and repeats collapse")
    expect(any("topic" in x and "Nonsense" in x for x in errs_of(topics="Consumer protection and disclosure; Nonsense")), "an unknown topic is refused")
    entries, errs, _ = run(enf=[dict(good, topics="")])
    expect(not errs and "uses" not in entries[0], "no topics leaves `uses` out")

    # a tab that is not set up
    entries, errs, _ = run(enf=[good], header=[c for c in COLUMNS if c != "status"])
    expect(entries == [] and any("no column named `status`" in x for x in errs), "a tab without a `status` column is refused, by name")
    entries, errs, _ = run(enf=[good], header=[c for c in COLUMNS if c not in ("topics", "notes")])
    expect(not errs and len(entries) == 1, "`topics` and `notes` may be missing from a tab")
    shuffled = ["Notes", "SOURCE", "who_acted", "Jurisdiction", "matter", " Description ", "outcome", "Checked", "date", "topics", "Status"]
    entries, errs, _ = run(enf=[dict(good, **{"notes": "n"})], header=[norm(c) for c in shuffled])
    expect(not errs and len(entries) == 1, "columns are found by name, in any order, whatever their capitals")
    entries, errs, _ = compile_tabs({"enforcement": "", "cases": _csv([])}, lookup, today)
    expect(any("no header" in x for x in errs), "an empty export is refused")

    # empty rows, ids and order
    entries, errs, parsed = run(enf=[good, {}, {"notes": ""}, dict(good, matter="Texas and Example Co", date="2026-07-01"),
                                      dict(good, matter="Texas and Example Co", date="2026-07-02")])
    expect(not errs and len(entries) == 3 and len(parsed["enforcement"]) == 3, "blank rows are skipped")
    expect([x["id"] for x in entries] == ["texas-and-example-co-2026", "texas-and-example-co-2026-2", "texas-and-example-co-2026-3"] and
           [x["date"] for x in entries] == ["2026-07-02", "2026-07-01", "2026-06-01"],
           "rows are listed newest first and two alike get different ids")
    entries, _, _ = run(enf=[dict(good, matter="B", date="2026-01-01"), dict(good, matter="A", date="2026-01-01")],
                        cases=[dict(good, matter="C", date="2026-01-01")])
    expect([x["title"] for x in entries] == ["A", "B", "C"] and entries[2]["kind"] == "case",
           "enforcement actions come before key cases, a tie on the date goes by title")

    # the generated file reads back as what was put in, and keeps what the tests and the page look for
    rows = [dict(good, matter='He said "no" \\ and left', description="A line\nbreak and an ’ apostrophe, – a dash.", topics=""),
            dict(good, matter="Second", outcome="", checked="")]
    entries, errs, _ = run(enf=rows, cases=[dict(good, matter="A case", jurisdiction="Federal")])
    text = serialize(entries)
    _, _, back = research.find_array_span(text, "LEGISLATION_ACTIONS")
    expect(back == entries and len(back) == 3, "the generated file parses back, as the same rows (quotes, backslashes and unicode survive)")
    expect(text.count("const LEGISLATION_ACTIONS = [") == 1 and text.startswith("/* data/legislation-actions.js"),
           "the file declares the array once, after its header (the tests set the real rows aside by that line)")
    expect("DO NOT EDIT" in text.split("const LEGISLATION_ACTIONS")[0], "the header says the file is generated")
    expect(text.index("Enforcement actions") < text.index("Key cases"), "the enforcement actions are listed before the key cases")
    empty = serialize([])
    _, _, none = research.find_array_span(empty, "LEGISLATION_ACTIONS")
    expect(none == [], "a file with no row still declares an empty array")

    # snapshots
    snap = snapshot_text([dict({c: "" for c in COLUMNS}, **r) for r in rows])
    again, problem = read_tab(snap, "enforcement")
    expect(problem is None and [r["matter"] for r in again] == [r["matter"] for r in rows] and again[0]["description"] == rows[0]["description"],
           "a snapshot reads back, line breaks and quotes in a cell included")

    # the guard against an empty export
    expect(emptied({"enforcement": [], "cases": []}, {}) == [], "with no links nothing is compared with a snapshot")

    return done[0], problems


def cmd_selftest():
    n, problems = _selftest()
    if problems:
        print(f"selftest: {len(problems)} of {n} checks failed:", file=sys.stderr)
        for p in problems:
            print("  - " + p, file=sys.stderr)
        return 1
    print(f"  ok  {n} checks")
    return 0


def main(argv):
    if not argv or argv[0] in ("-h", "--help", "help"):
        print(__doc__)
        return 0
    cmd, rest = argv[0], argv[1:]
    urls, allow_empty, i = {}, False, 0
    while i < len(rest):
        a = rest[i]
        if a in ("--cases", "--enforcement") and i + 1 < len(rest):
            urls[a[2:]] = rest[i + 1]
            i += 2
        elif a == "--allow-empty":
            allow_empty = True
            i += 1
        else:
            print(f"actions: unexpected argument {a!r}\n", file=sys.stderr)
            print(__doc__)
            return 2
    if urls and set(urls) != {"cases", "enforcement"}:
        print("actions: give both --cases and --enforcement, or neither", file=sys.stderr)
        return 2
    if cmd == "check":
        return cmd_check(urls, allow_empty)
    if cmd == "build":
        return cmd_build(urls, allow_empty)
    if cmd == "selftest":
        return cmd_selftest()
    print(f"actions: unknown command {cmd!r}\n", file=sys.stderr)
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
