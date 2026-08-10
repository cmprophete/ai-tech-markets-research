#!/usr/bin/env python3
"""
research.py -- curate the research database from a spreadsheet.

    python3 tools/research.py export     data/tracker-data.js  -> content/research.csv (seed the sheet, once)
    python3 tools/research.py build      content/research.csv  -> data/tracker-data.js (regenerate after editing)
    python3 tools/research.py build --sheet <url>              pull a published Google Sheet (CSV),
                                                               snapshot it to research.csv, then regenerate
    python3 tools/research.py check      validate the sheet without writing anything
                                         (also accepts --sheet <url>)
    python3 tools/research.py selftest   prove the parser/serializer round-trips losslessly

GOOGLE SHEETS. Keep the master in Google Sheets if you like collaborative editing.
Publish it as CSV (File > Share > Publish to web > CSV), then feed that link to
`build --sheet <url>`. It downloads the sheet, saves a snapshot to
content/research.csv (your committed audit trail), and rebuilds. You never manage
ids in the sheet: a new row can leave `id` blank and `build` gives it a stable id
by matching its sourceUrl to the last snapshot, so re-pulling never reshuffles ids.
The published page never fetches the sheet -- only this build step does.

WHAT THIS OWNS. Only the RESEARCH_DATA array inside data/tracker-data.js. THEMES,
POLICY_DATA, AGENDA_DATA and CATEGORIES stay hand-edited in that file and are left
byte-for-byte untouched. This is NOT one of the analysis/ econometric payloads --
it is editorial content, and content/research.csv is its reproducible source.

WHY A SHEET. Adding research meant hand-editing ~264 entries in a 700 KB JS file.
Now you edit content/research.csv in Excel/Google Sheets (or any editor), run
`build`, and reload the page -- the data loads at runtime via <script src>, so no
build.py step is needed. Commit + push to publish. git history of the CSV is the
curation audit trail.

THE SHEET. One row per study. Columns:
    id          integer, stable, referenced by POLICY_DATA paperIds. LEAVE BLANK
                for a new row -- build assigns the next id and writes it back.
    date        publication date, YYYY-MM-DD
    added       intake date, YYYY-MM-DD. Blank on a new row -> today, written back.
    category    one of the CATEGORIES ids (see the list build/check prints)
    geography   us | intl
    evidence    analysis | commentary | industry | official | peer-reviewed | (blank)
    title       string
    source      "Authors -- Organization" (an em-dash separates the two)
    sourceUrl   http(s) URL
    keyFinding  one paragraph
    takeaways   one bullet PER LINE inside the cell (Alt+Enter in Excel)

No dependencies beyond the Python standard library.
"""

import csv
import datetime
import io
import json
import os
import re
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data", "tracker-data.js")
SHEET = os.path.join(ROOT, "content", "research.csv")

# Column order in the CSV. `id` and `added` may be blank on new rows. Any entry
# field that isn't one of the flat columns (e.g. a `highlight` object on a
# featured study) rides along in extra_json so nothing is ever dropped.
COLUMNS = ["id", "date", "added", "category", "geography", "evidence",
           "title", "source", "sourceUrl", "keyFinding", "takeaways", "extra_json"]

# The fields that get their own CSV column; everything else -> extra_json.
FLAT_FIELDS = {"id", "date", "added", "category", "geography", "evidence",
               "title", "source", "sourceUrl", "keyFinding", "takeaways"}

GEOGRAPHY = {"us", "intl"}
EVIDENCE = {"analysis", "commentary", "industry", "official", "peer-reviewed"}


# ── a tiny, strict parser for the JS value grammar we actually use ──────────
# Objects, arrays, double/single-quoted strings (with escapes), numbers,
# true/false/null, identifier keys, trailing commas, // and /* */ comments.
# It decodes string escapes to real characters; the serializer re-encodes them,
# so a decode->encode round-trip is stable (verified by `selftest`).

class JSParser:
    def __init__(self, text, pos=0):
        self.s = text
        self.i = pos

    def error(self, msg):
        # 1-based line number for a legible message.
        line = self.s.count("\n", 0, self.i) + 1
        raise ValueError(f"tracker-data.js: parse error at line {line}: {msg}")

    def ws(self):
        s, n = self.s, len(self.s)
        while self.i < n:
            c = s[self.i]
            if c in " \t\r\n":
                self.i += 1
            elif c == "/" and self.i + 1 < n and s[self.i + 1] == "/":
                self.i = s.find("\n", self.i)
                if self.i == -1:
                    self.i = n
            elif c == "/" and self.i + 1 < n and s[self.i + 1] == "*":
                end = s.find("*/", self.i + 2)
                self.i = n if end == -1 else end + 2
            else:
                break

    def value(self):
        self.ws()
        c = self.s[self.i]
        if c == "{":
            return self.obj()
        if c == "[":
            return self.arr()
        if c in "\"'":
            return self.string()
        if c == "-" or c.isdigit():
            return self.number()
        if self.s.startswith("true", self.i):
            self.i += 4; return True
        if self.s.startswith("false", self.i):
            self.i += 5; return False
        if self.s.startswith("null", self.i):
            self.i += 4; return None
        self.error(f"unexpected character {c!r}")

    def obj(self):
        self.i += 1  # {
        out = {}
        while True:
            self.ws()
            if self.s[self.i] == "}":
                self.i += 1
                return out
            key = self.key()
            self.ws()
            if self.s[self.i] != ":":
                self.error("expected ':' after key")
            self.i += 1
            out[key] = self.value()
            self.ws()
            if self.s[self.i] == ",":
                self.i += 1
            elif self.s[self.i] == "}":
                self.i += 1
                return out
            else:
                self.error("expected ',' or '}' in object")

    def arr(self):
        self.i += 1  # [
        out = []
        while True:
            self.ws()
            if self.s[self.i] == "]":
                self.i += 1
                return out
            out.append(self.value())
            self.ws()
            if self.s[self.i] == ",":
                self.i += 1
            elif self.s[self.i] == "]":
                self.i += 1
                return out
            else:
                self.error("expected ',' or ']' in array")

    def key(self):
        c = self.s[self.i]
        if c in "\"'":
            return self.string()
        j = self.i
        while self.s[j].isalnum() or self.s[j] in "_$":
            j += 1
        if j == self.i:
            self.error("expected object key")
        k = self.s[self.i:j]
        self.i = j
        return k

    def string(self):
        q = self.s[self.i]
        self.i += 1
        buf = []
        s = self.s
        while True:
            c = s[self.i]
            if c == "\\":
                nxt = s[self.i + 1]
                simple = {"n": "\n", "t": "\t", "r": "\r", "b": "\b", "f": "\f",
                          "\\": "\\", "/": "/", "\"": "\"", "'": "'", "`": "`",
                          "\n": ""}
                if nxt in simple:
                    buf.append(simple[nxt]); self.i += 2
                elif nxt == "u":
                    buf.append(chr(int(s[self.i + 2:self.i + 6], 16))); self.i += 6
                elif nxt == "x":
                    buf.append(chr(int(s[self.i + 2:self.i + 4], 16))); self.i += 4
                else:
                    buf.append(nxt); self.i += 2
            elif c == q:
                self.i += 1
                return "".join(buf)
            else:
                buf.append(c); self.i += 1

    def number(self):
        j = self.i
        while j < len(self.s) and self.s[j] in "-+.0123456789eExX":
            j += 1
        tok = self.s[self.i:j]
        self.i = j
        try:
            return int(tok)
        except ValueError:
            return float(tok)


def find_array_span(text, varname):
    """Return (start, end, entries): byte span of `const <varname> = [ ... ];`
    (start at 'const', end just past the ';') and the parsed list."""
    anchor = f"const {varname} = ["
    start = text.find(anchor)
    if start == -1:
        raise ValueError(f"tracker-data.js: `{anchor}` not found")
    p = JSParser(text, start + len(f"const {varname} = "))
    entries = p.arr()
    p.ws()
    if text[p.i] != ";":
        raise ValueError(f"tracker-data.js: expected ';' after {varname} array")
    return start, p.i + 1, entries


# ── serialize Python objects back to the file's JS style ────────────────────

def js_string(v):
    out = ['"']
    for ch in v:
        if ch == "\\":
            out.append("\\\\")
        elif ch == '"':
            out.append('\\"')
        elif ch == "\n":
            out.append("\\n")
        elif ch == "\t":
            out.append("\\t")
        elif ch == "\r":
            out.append("\\r")
        else:
            out.append(ch)  # keep unicode (em-dashes, accents) literal, as the file does
    out.append('"')
    return "".join(out)


_IDENT = re.compile(r"^[A-Za-z_$][A-Za-z0-9_$]*$")


def js_key(k):
    return k if _IDENT.match(k) else js_string(k)


def js_value(v):
    """Serialize an arbitrary parsed value back to JS (used for extra fields)."""
    if isinstance(v, str):
        return js_string(v)
    if isinstance(v, bool):
        return "true" if v else "false"
    if v is None:
        return "null"
    if isinstance(v, int):
        return str(v)
    if isinstance(v, float):
        return repr(v)
    if isinstance(v, list):
        return "[" + ", ".join(js_value(x) for x in v) + "]"
    if isinstance(v, dict):
        return "{ " + ", ".join(f"{js_key(k)}: {js_value(val)}" for k, val in v.items()) + " }"
    raise TypeError(f"cannot serialize {type(v).__name__}")


def serialize_entries(entries):
    blocks = []
    for e in entries:
        L = []
        L.append(f'  {{ id: {e["id"]}, date: {js_string(e["date"])}, added: {js_string(e["added"])},')
        L.append(f'    title: {js_string(e["title"])},')
        L.append(f'    source: {js_string(e["source"])},')
        L.append(f'    sourceUrl: {js_string(e["sourceUrl"])},')
        L.append(f'    category: {js_string(e["category"])}, geography: {js_string(e["geography"])},')
        if e.get("evidence"):
            L.append(f'    evidence: {js_string(e["evidence"])},')
        L.append(f'    keyFinding: {js_string(e["keyFinding"])},')
        tk = e.get("takeaways") or []
        if tk:
            L.append("    takeaways: [")
            for i, t in enumerate(tk):
                comma = "," if i < len(tk) - 1 else ""
                L.append(f"      {js_string(t)}{comma}")
            L.append("    ],")
        else:
            L.append("    takeaways: [],")
        # Preserve any field beyond the flat schema verbatim (e.g. `highlight`).
        for k, val in e.items():
            if k in FLAT_FIELDS:
                continue
            L.append(f"    {js_key(k)}: {js_value(val)},")
        L.append("  },")
        blocks.append("\n".join(L))
    return "const RESEARCH_DATA = [\n" + "\n".join(blocks) + "\n];"


# ── CSV <-> entry dicts ─────────────────────────────────────────────────────

def entry_to_row(e):
    row = {
        "id": e["id"],
        "date": e["date"],
        "added": e["added"],
        "category": e["category"],
        "geography": e["geography"],
        "evidence": e.get("evidence", ""),
        "title": e["title"],
        "source": e["source"],
        "sourceUrl": e["sourceUrl"],
        "keyFinding": e["keyFinding"],
        "takeaways": "\n".join(e["takeaways"]),
    }
    extra = {k: v for k, v in e.items() if k not in FLAT_FIELDS}
    row["extra_json"] = json.dumps(extra, ensure_ascii=False) if extra else ""
    return row


def row_to_entry(row):
    idv = (row.get("id") or "").strip()
    takeaways = [t.strip() for t in (row.get("takeaways") or "").splitlines() if t.strip()]
    e = {
        "id": int(idv) if idv else None,
        "date": (row.get("date") or "").strip(),
        "added": (row.get("added") or "").strip(),
        "category": (row.get("category") or "").strip(),
        "geography": (row.get("geography") or "").strip(),
        "evidence": (row.get("evidence") or "").strip(),
        "title": (row.get("title") or "").strip(),
        "source": (row.get("source") or "").strip(),
        "sourceUrl": (row.get("sourceUrl") or "").strip(),
        "keyFinding": (row.get("keyFinding") or "").strip(),
        "takeaways": takeaways,
    }
    extra = (row.get("extra_json") or "").strip()
    if extra:
        e.update(json.loads(extra))
    return e


def read_data():
    with open(DATA, encoding="utf-8") as fh:
        return fh.read()


def category_ids(text):
    _, _, cats = find_array_span(text, "CATEGORIES")
    return [c["id"] for c in cats]


def policy_paper_ids(text):
    """IDs referenced by POLICY_DATA paperIds, for orphan detection."""
    import re
    ids = set()
    for m in re.finditer(r"paperIds:\s*\[([0-9,\s]*)\]", text):
        for n in m.group(1).split(","):
            n = n.strip()
            if n:
                ids.add(int(n))
    return ids


# ── validation ──────────────────────────────────────────────────────────────

def validate(entries, cats, warn=print):
    errors = []
    seen_ids = {}
    date_re = __import__("re").compile(r"^\d{4}-\d{2}-\d{2}$")

    def check_date(v):
        if not date_re.match(v):
            return False
        try:
            datetime.date.fromisoformat(v)
            return True
        except ValueError:
            return False

    for n, e in enumerate(entries, 1):
        where = f"row {n} (id {e['id'] if e['id'] is not None else 'NEW'})"
        for f in ("date", "title", "source", "sourceUrl", "category", "geography", "keyFinding"):
            if not e[f]:
                errors.append(f"{where}: missing required field '{f}'")
        if not e["takeaways"]:
            errors.append(f"{where}: needs at least one takeaway")
        if e["date"] and not check_date(e["date"]):
            errors.append(f"{where}: date '{e['date']}' is not a valid YYYY-MM-DD")
        if e["added"] and not check_date(e["added"]):
            errors.append(f"{where}: added '{e['added']}' is not a valid YYYY-MM-DD")
        if e["category"] and e["category"] not in cats:
            errors.append(f"{where}: category '{e['category']}' is not one of: {', '.join(cats)}")
        if e["geography"] and e["geography"] not in GEOGRAPHY:
            warn(f"  note: {where}: geography '{e['geography']}' is new (known: {', '.join(sorted(GEOGRAPHY))})")
        if e["evidence"] and e["evidence"] not in EVIDENCE:
            warn(f"  note: {where}: evidence '{e['evidence']}' is new (known: {', '.join(sorted(EVIDENCE))})")
        if e["sourceUrl"] and not e["sourceUrl"].startswith("http"):
            errors.append(f"{where}: sourceUrl should start with http")
        if e["id"] is not None:
            if e["id"] in seen_ids:
                errors.append(f"{where}: duplicate id (also row {seen_ids[e['id']]})")
            seen_ids[e["id"]] = n
    return errors


def splice_research(text, entries):
    start, end, _ = find_array_span(text, "RESEARCH_DATA")
    return text[:start] + serialize_entries(entries) + text[end:]


# ── subcommands ──────────────────────────────────────────────────────────────

def cmd_export():
    text = read_data()
    _, _, entries = find_array_span(text, "RESEARCH_DATA")
    os.makedirs(os.path.dirname(SHEET), exist_ok=True)
    with open(SHEET, "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=COLUMNS)
        w.writeheader()
        for e in entries:
            w.writerow(entry_to_row(e))
    print(f"  wrote  {os.path.relpath(SHEET, ROOT)}  ({len(entries)} entries)")
    print("  Edit that file, then: python3 tools/research.py build")


def load_local_entries():
    """Entries from content/research.csv, or [] if it does not exist yet."""
    if not os.path.exists(SHEET):
        return []
    with open(SHEET, encoding="utf-8", newline="") as fh:
        return [row_to_entry(r) for r in csv.DictReader(fh)]


def write_sheet(entries):
    with open(SHEET, "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=COLUMNS)
        w.writeheader()
        for e in entries:
            w.writerow(entry_to_row(e))


def sheet_csv_url(url):
    """Normalize a Google Sheets link to its CSV-export form."""
    m = re.match(r"(https://docs\.google\.com/spreadsheets/d/[^/]+)", url)
    if m and "format=csv" not in url and "output=csv" not in url:
        gid = re.search(r"[#&?]gid=(\d+)", url)
        return m.group(1) + "/export?format=csv" + (f"&gid={gid.group(1)}" if gid else "")
    return url


def fetch_entries(url):
    """Fetch a published sheet as CSV and parse it, guarding against getting an
    HTML login/error page instead of the data."""
    with urllib.request.urlopen(sheet_csv_url(url), timeout=30) as resp:
        text = resp.read().decode("utf-8")
    header = text.split("\n", 1)[0].lower()
    if text.lstrip()[:1] == "<" or "sourceurl" not in header or "title" not in header:
        raise SystemExit(
            "research: that URL did not return the sheet as CSV.\n"
            "  In Google Sheets: File > Share > Publish to web > CSV, and use that link\n"
            "  (or a .../export?format=csv link).")
    return [row_to_entry(r) for r in csv.DictReader(io.StringIO(text))]


def reconcile_ids(entries, ledger):
    """Restore each row's stable id/added from the committed snapshot, matched by
    sourceUrl, so sheet rows may leave those blank without churning ids."""
    by_url = {e["sourceUrl"]: e for e in ledger if e.get("sourceUrl")}
    for e in entries:
        prev = by_url.get(e["sourceUrl"])
        if prev:
            if e["id"] is None:
                e["id"] = prev["id"]
            if not e["added"]:
                e["added"] = prev["added"]
    return entries


def load_source(url):
    """Entries to build from: a remote sheet (reconciled against the committed
    snapshot) or the local content/research.csv."""
    if url:
        entries = fetch_entries(url)
        reconcile_ids(entries, load_local_entries())
        return entries
    return load_local_entries()


def cmd_check(url=None):
    text = read_data()
    cats = category_ids(text)
    entries = load_source(url)
    errors = validate(entries, cats)
    if errors:
        print(f"check: {len(errors)} problem(s):", file=sys.stderr)
        for e in errors:
            print("  - " + e, file=sys.stderr)
        return 1
    # orphaned policy references (warn only)
    research_ids = {e["id"] for e in entries if e["id"] is not None}
    orphans = policy_paper_ids(text) - research_ids
    if orphans:
        print(f"  note: POLICY_DATA paperIds reference missing research ids: "
              f"{', '.join(map(str, sorted(orphans)))}")
    print(f"  ok  {len(entries)} entries valid")
    return 0


def cmd_build(url=None):
    text = read_data()
    cats = category_ids(text)
    entries = load_source(url)
    errors = validate(entries, cats)
    if errors:
        print(f"build: refusing to write, {len(errors)} problem(s):", file=sys.stderr)
        for e in errors:
            print("  - " + e, file=sys.stderr)
        return 1

    # Assign stable ids + intake dates to any still-blank rows (POLICY_DATA
    # paperIds depend on id stability; --sheet rows were already reconciled above).
    existing = [e["id"] for e in entries if e["id"] is not None]
    next_id = (max(existing) + 1) if existing else 1
    today = datetime.date.today().isoformat()
    assigned = 0
    for e in entries:
        if e["id"] is None:
            e["id"] = next_id; next_id += 1; assigned += 1
        if not e["added"]:
            e["added"] = today

    # Persist the sheet snapshot when pulling from a URL (the committed audit
    # trail + id ledger); locally, only when we filled in a blank row.
    if url or assigned:
        write_sheet(entries)
        if url:
            print(f"  wrote  content/research.csv  (snapshot of the sheet, {len(entries)} rows)")
        if assigned:
            print(f"  assigned id + intake date to {assigned} new row(s)")

    out = splice_research(text, entries)
    with open(DATA, "w", encoding="utf-8") as fh:
        fh.write(out)
    print(f"  wrote  data/tracker-data.js  ({len(entries)} entries)")
    print("  Reload the page to see it; commit + push to publish.")
    return 0


def cmd_selftest():
    """Prove the FULL pipeline is lossless on the live data, touching nothing:
    parse -> CSV -> parse -> serialize -> parse, then deep-compare to the original."""
    text = read_data()
    _, _, a = find_array_span(text, "RESEARCH_DATA")

    # round-trip through an in-memory CSV, exactly as export/build would
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=COLUMNS)
    w.writeheader()
    for e in a:
        w.writerow(entry_to_row(e))
    buf.seek(0)
    b = [row_to_entry(r) for r in csv.DictReader(buf)]
    c = JSParser(serialize_entries(b), len("const RESEARCH_DATA = ")).arr()

    if len(a) != len(c):
        print(f"selftest FAILED: {len(a)} entries in, {len(c)} out", file=sys.stderr)
        return 1
    diffs = 0
    for i, (x, y) in enumerate(zip(a, c)):
        if x != y:
            diffs += 1
            if diffs <= 10:
                print(f"selftest MISMATCH entry {i} (id {x.get('id')}):", file=sys.stderr)
                for k in sorted(set(x) | set(y)):
                    if x.get(k) != y.get(k):
                        print(f"    {k}: was {x.get(k)!r}  got {y.get(k)!r}", file=sys.stderr)
    if diffs:
        print(f"selftest FAILED: {diffs} entr(y/ies) changed by the round-trip", file=sys.stderr)
        return 1
    print(f"  selftest ok  full CSV round-trip is identical for all {len(a)} entries")
    return 0


def main(argv):
    cmds = {"export": cmd_export, "build": cmd_build, "check": cmd_check, "selftest": cmd_selftest}
    if not argv or argv[0] not in cmds:
        print(__doc__.strip())
        return 2
    cmd, rest = argv[0], list(argv[1:])
    url = None
    if "--sheet" in rest:
        i = rest.index("--sheet")
        if i + 1 >= len(rest):
            print("research: --sheet needs a URL", file=sys.stderr)
            return 2
        url = rest[i + 1]
        del rest[i:i + 2]
    if rest:
        print(f"research: unexpected argument(s): {' '.join(rest)}", file=sys.stderr)
        return 2
    if cmd in ("build", "check"):
        return cmds[cmd](url) or 0
    if url is not None:
        print(f"research: {cmd} does not take --sheet", file=sys.stderr)
        return 2
    return cmds[cmd]() or 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
