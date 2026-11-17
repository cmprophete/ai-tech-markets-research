#!/usr/bin/env python3
"""
research.py -- curate the research database from a spreadsheet.

    python3 tools/research.py export     data/tracker-data.js  -> content/research.csv (seed the sheet, once)
    python3 tools/research.py build      content/research.csv  -> data/tracker-data.js (regenerate after editing)
    python3 tools/research.py build --sheet <url>              pull a published Google Sheet (CSV),
                                                               snapshot it to research.csv, then regenerate
    python3 tools/research.py check      validate the sheet without writing anything;
                                         also checks the policy cards, {{cite}} tokens and
                                         Fact Bank facts that point at a paper: one that is
                                         under review or archived is a note, an id that is
                                         in no row of the sheet (a typo, or a deleted row)
                                         makes check exit 1.
                                         (also accepts --sheet <url>)
    python3 tools/research.py selftest   prove the parser/serializer round-trips losslessly
                                         and that the status and reference rules behave

GOOGLE SHEETS. Keep the master in Google Sheets if you like collaborative editing.
Publish it as CSV (File > Share > Publish to web > CSV), then feed that link to
`build --sheet <url>`. It downloads the sheet, saves a snapshot to
content/research.csv (your committed audit trail), and rebuilds. You never manage
ids in the sheet: a new row can leave `id` blank and `build` gives it a stable id
by matching its sourceUrl to the last snapshot, so re-pulling never reshuffles ids.
The published page never fetches the sheet -- only this build step does.

WHAT THIS OWNS. Only the RESEARCH_DATA array inside data/tracker-data.js.
POLICY_DATA, AGENDA_DATA and CATEGORIES stay hand-edited in that file and are left
byte-for-byte untouched. This is NOT one of the analysis/ econometric payloads --
it is editorial content, and content/research.csv is its reproducible source.

WHY A SHEET. Adding research meant hand-editing ~264 entries in a 700 KB JS file.
Now you edit content/research.csv in Excel/Google Sheets (or any editor), run
`build`, and reload the page -- the data loads at runtime via <script src>, so no
build.py step is needed. Commit + push to publish. git history of the CSV is the
curation audit trail.

THE SHEET. One row per study. Columns (rows are read by header name; the Sheet's
own column order differs from the snapshot's):
    id          integer, stable, referenced by POLICY_DATA paperIds. LEAVE BLANK
                for a new row -- build assigns the next id and writes it back.
    date        publication date, YYYY-MM-DD
    added       intake date, YYYY-MM-DD. Blank on a new row -> today, written back.
    status      under review | approved | archived. Blank = under review. Only
                `approved` rows are published, and only they must be complete (an
                under-review row may be a bare link). Any other word stops the sync
                and names the row. Archived rows keep their id and are not checked.
                A link on an under-review row that repeats another row's link is a
                named warning, never a stop (delete the repeat); two APPROVED rows
                with one id and one link still stop the sync.
    foundational
                blank or the word `foundational` (classic background reading). An
                approved row that has it is published with `foundational: true`.
                NOT the Fact Bank's `foundational` flag, which sits on the facts.
    note        free text, e.g. why a row is archived. Never published.
    category    one of the CATEGORIES ids (see the list build/check prints)
    geography   us | intl
    evidence    analysis | commentary | industry | official | peer-reviewed | (blank)
    title       string
    source      "Authors -- Organization" (an em-dash separates the two)
    sourceUrl   http(s) URL
    keyFinding  one paragraph
    takeaways   one bullet PER LINE inside the cell (Alt+Enter in Excel)

OLD SHEETS. A sheet (or snapshot) with no `status` column is read the old way: any
text in `archived` means archived, blank means approved (so the row must be
complete), and `foundational` is ignored. That lets this code merge BEFORE the Sheet
gets the new columns. Once `status` exists, `archived` is ignored.

REMOVING A STUDY. Either delete its row, or -- better -- set its status to
`archived` (and say why in `note`) to keep it on record. The site is regenerated
from the sheet, so a deletion is permanent once you rebuild; archiving is
reversible and preserves the id.

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
# Read-only for `check`: a second file that references research by id, so a paper
# that is not approved (archived, say) can leave a fact here dangling. Never written
# by this tool.
FACT_BANK_DATA = os.path.join(ROOT, "data", "fact-bank-data.js")

# Column order in the CSV snapshot. `id` and `added` may be blank on new rows. Any
# entry field that isn't one of the flat columns (e.g. a `highlight` object on a
# featured study) rides along in extra_json so nothing is ever dropped.
COLUMNS = ["id", "date", "added", "status", "foundational", "note", "category", "geography",
           "evidence", "title", "source", "sourceUrl", "keyFinding", "takeaways", "extra_json"]

# The fields that get their own CSV column and are published in RESEARCH_DATA;
# everything else on an entry -> extra_json.
FLAT_FIELDS = {"id", "date", "added", "category", "geography", "evidence",
               "title", "source", "sourceUrl", "keyFinding", "takeaways"}

# What a row's `status` can be: exactly these words (matching ignores capitals and
# extra spaces). A BLANK cell means under review, so a row pasted into the Sheet is
# never published until someone approves it, and a bare link cannot stop the sync.
UNDER_REVIEW, APPROVED, ARCHIVED = "under review", "approved", "archived"
STATUSES = (UNDER_REVIEW, APPROVED, ARCHIVED)
FOUNDATIONAL = "foundational"
# What an APPROVED row must have (it also needs at least one takeaway).
REQUIRED = ("date", "title", "source", "sourceUrl", "category", "geography", "keyFinding")

# Control columns: they live in the sheet/CSV and decide what is published, but they
# are never copied into RESEARCH_DATA as they are.
#   status        only `approved` rows are published (and only they must be complete).
#                 Whatever the status, the row keeps its id, so ids are never reused
#                 and references never silently re-point.
#   foundational  blank or the word `foundational` (classic background reading). On an
#                 approved row it is published as `foundational: true`. NOT the Fact
#                 Bank's `foundational` flag, which sits on the facts.
#   note          free text (why a row is archived, say); never published.
#   archived      the OLD column, read only when the sheet has no `status` column
#                 (any text = archived); never written any more.
CONTROL_FIELDS = {"status", "note", "foundational", "archived"}

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
        if e.get("foundational"):
            L.append("    foundational: true,")
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
        # Preserve any field beyond the flat schema verbatim (e.g. `highlight`),
        # but never the control columns (status, note, archived; `foundational` is
        # written above).
        for k, val in e.items():
            if k in FLAT_FIELDS or k in CONTROL_FIELDS:
                continue
            L.append(f"    {js_key(k)}: {js_value(val)},")
        L.append("  },")
        blocks.append("\n".join(L))
    return "const RESEARCH_DATA = [\n" + "\n".join(blocks) + "\n];"


# ── CSV <-> entry dicts ─────────────────────────────────────────────────────

def entry_to_row(e):
    foundational = e.get("foundational")
    row = {
        "id": e["id"],
        "date": e["date"],
        "added": e["added"],
        # An entry read from RESEARCH_DATA (export, selftest) carries no status: it was
        # published, so it is approved. Its `foundational: true` is the word in the cell.
        "status": e.get("status", APPROVED),
        "foundational": FOUNDATIONAL if foundational is True else (foundational or ""),
        "note": e.get("note", ""),
        "category": e["category"],
        "geography": e["geography"],
        "evidence": e.get("evidence", ""),
        "title": e["title"],
        "source": e["source"],
        "sourceUrl": e["sourceUrl"],
        "keyFinding": e["keyFinding"],
        "takeaways": "\n".join(e["takeaways"]),
    }
    extra = {k: v for k, v in e.items() if k not in FLAT_FIELDS and k not in CONTROL_FIELDS}
    row["extra_json"] = json.dumps(extra, ensure_ascii=False) if extra else ""
    return row


def _norm(s):
    """Trim, lowercase and squeeze spaces: ' Under  Review' reads as 'under review'."""
    return " ".join((s or "").split()).lower()


def row_to_entry(row):
    idv = (row.get("id") or "").strip()
    takeaways = [t.strip() for t in (row.get("takeaways") or "").splitlines() if t.strip()]
    if "status" in row:
        # The sheet has a `status` column, so it speaks for itself: blank = under review,
        # and a word that is not one of STATUSES is kept as typed so validate() can name
        # it. `foundational` is blank or the word; anything else is kept as typed too.
        raw = (row.get("status") or "").strip()
        status = _norm(raw) if _norm(raw) in STATUSES else (raw or UNDER_REVIEW)
        note = (row.get("note") or "").strip()
        raw = (row.get("foundational") or "").strip()
        foundational = FOUNDATIONAL if _norm(raw) == FOUNDATIONAL else raw
    else:
        # No `status` column (the Sheet before the cutover, or a snapshot written before
        # it): read it exactly as the old code did. Any text in `archived` = archived
        # (the text is the note, unless it is just the word); blank = live, i.e. approved
        # (so it must be complete); the `foundational` column was never read.
        text = (row.get("archived") or "").strip()
        status = ARCHIVED if text else APPROVED
        note = "" if text.lower() == "archived" else text
        foundational = ""
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
        "status": status,
        "foundational": foundational,
        "note": note,
    }
    extra = (row.get("extra_json") or "").strip()
    if extra:
        for k, v in json.loads(extra).items():
            e.setdefault(k, v)  # a key in extra_json can never override a column
    return e


def read_data():
    with open(DATA, encoding="utf-8") as fh:
        return fh.read()


def category_ids(text):
    _, _, cats = find_array_span(text, "CATEGORIES")
    return [c["id"] for c in cats]


def _line_of(text, pos):
    """1-based line number of character offset `pos`."""
    return text.count("\n", 0, pos) + 1


def _id_list(text, key):
    """String ids inside every `<key>: [ ... ]` array in `text`, as {id: [line, ...]}:
    the lines each id is written on. Handles both quoted string ids ("nelp-uws-2025")
    and bare integers, mixed in one array."""
    ids = {}
    for m in re.finditer(key + r":\s*\[([^\]]*)\]", text):
        line = _line_of(text, m.start())
        for tok in re.finditer(r'"([\w-]+)"|(\d+)', m.group(1)):
            ids.setdefault(tok.group(1) if tok.group(1) is not None else tok.group(2), []).append(line)
    return ids


def policy_paper_ids(text):
    """IDs referenced by POLICY_DATA `paperIds:` arrays, for orphan detection."""
    return _id_list(text, "paperIds")


def cite_token_ids(text):
    """IDs referenced by {{cite:ID}} / {{citep:ID}} prose tokens (numeric research
    ids or string POLICY_SOURCES ids), for orphan detection."""
    ids = {}
    for m in re.finditer(r"\{\{cite[a-z]*:\s*([\w-]+)\s*\}\}", text):
        ids.setdefault(m.group(1), []).append(_line_of(text, m.start()))
    return ids


def policy_source_ids(text):
    """Ids declared in the hand-maintained POLICY_SOURCES array -- valid citation
    targets that are NOT research-tracker entries (non-AI policy sources)."""
    m = re.search(r"const POLICY_SOURCES\s*=\s*\[(.*?)\n\];", text, re.S)
    return set(re.findall(r'\bid:\s*"([\w-]+)"', m.group(1))) if m else set()


def read_fact_bank():
    """The text of data/fact-bank-data.js, or "" if that file is absent or unreadable, so
    `check` still runs on a partial checkout instead of crashing."""
    try:
        with open(FACT_BANK_DATA, encoding="utf-8") as fh:
            return fh.read()
    except OSError:
        return ""


def fact_bank_paper_ids(fb):
    """IDs referenced by Fact Bank facts (`fb` is the text of data/fact-bank-data.js),
    as {id: [line, ...]}."""
    ids = {}
    for m in re.finditer(r"paperId:\s*(\d+)", fb):
        ids.setdefault(m.group(1), []).append(_line_of(fb, m.start()))
    return ids


# ── validation ──────────────────────────────────────────────────────────────

def row_label(n, e):
    """'row 12 (id 40) "Title"': enough to find the row in the Sheet. The title (or the
    link, for a bare-link row) goes AFTER the parenthesis."""
    who = f"row {n} (id {e['id'] if e['id'] is not None else 'NEW'})"
    name = e["title"] or e["sourceUrl"]
    return f'{who} "{name[:60].rstrip()}"' if name else who


def unfinished(entries):
    """Under-review rows that could not be approved yet (a required field is blank)."""
    return [e for e in entries if e["status"] == UNDER_REVIEW
            and (any(not e[f] for f in REQUIRED) or not e["takeaways"])]


def _same_link(a, b):
    """Two rows that carry the same, non-blank link."""
    return bool(a["sourceUrl"]) and a["sourceUrl"] == b["sourceUrl"]


def _harmless_repeat(a, b):
    """Two rows with the same id AND the same link, at least one of them not approved: a
    pasted repeat (reconcile_ids hands it the old row's id). It cannot publish one id twice,
    so it must not stop the sync. Two approved rows can, so that stays an error."""
    return _same_link(a, b) and not (a["status"] == APPROVED and b["status"] == APPROVED)


def _row_ref(n, e):
    """'row 12 (id 40, approved)': which row and where it stands, without its title."""
    return f"row {n} (id {e['id'] if e['id'] is not None else 'NEW'}, {e['status']})"


def validate(entries, cats, warn=print):
    errors = []
    rows_by_id = {}
    for n, e in enumerate(entries, 1):
        if e["id"] is not None:
            rows_by_id.setdefault(e["id"], []).append(n)
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
        where = row_label(n, e)
        if e["id"] is not None:
            # An earlier row with this id is a clash, unless the two are a harmless repeat
            # (the same link, one of them not approved): that is only warned about, below.
            clashes = [m for m in rows_by_id[e["id"]]
                       if m < n and not _harmless_repeat(e, entries[m - 1])]
            if clashes:
                m = clashes[-1]
                if _same_link(e, entries[m - 1]):
                    # Both approved, one link: the pasted link is already in the tracker and
                    # took the old row's id (reconcile_ids matches by link), so say so.
                    errors.append(f"{where}: duplicate id (also row {m}): rows {m} and {n} have the "
                                  "same link, so it is already in the tracker. Delete the repeat")
                else:
                    errors.append(f"{where}: duplicate id (also row {m})")
        status = e["status"]
        if status not in STATUSES:
            errors.append(f"{where}: status '{status}' is not one of: {', '.join(STATUSES)} "
                          "(leave it blank for under review)")
            continue
        if e["foundational"] not in ("", FOUNDATIONAL):
            errors.append(f"{where}: foundational '{e['foundational']}' must be blank "
                          f"or the word '{FOUNDATIONAL}'")
        if status != APPROVED:
            # Under review: may be a bare link, only counted (see unfinished()). Archived:
            # kept in the sheet for the record. Neither is published -> no content checks.
            continue
        for f in REQUIRED:
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
    # A link on several rows is never what stops the sync unless two APPROVED rows share its
    # id (above). When one of the rows is under review, though, it is a repeat nobody should
    # approve, so name it. One warning per link, listing every row that carries it.
    rows_by_link = {}
    for n, e in enumerate(entries, 1):
        if e["sourceUrl"]:
            rows_by_link.setdefault(e["sourceUrl"], []).append(n)
    for link, ns in rows_by_link.items():
        if len(ns) > 1 and any(entries[n - 1]["status"] == UNDER_REVIEW for n in ns):
            warn(f"  warning: the link {link[:70]} is on "
                 f"{', '.join(_row_ref(n, entries[n - 1]) for n in ns)}. A repeat on an under review row "
                 "is never published and does not stop the sync, but delete it from the Sheet before "
                 "approving it")
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
    HTML login/error page instead of the data. Returns (entries, columns): the parsed
    rows and the set of header names the sheet has."""
    with urllib.request.urlopen(sheet_csv_url(url), timeout=30) as resp:
        text = resp.read().decode("utf-8")
    header = text.split("\n", 1)[0].lower()
    if text.lstrip()[:1] == "<" or "sourceurl" not in header or "title" not in header:
        raise SystemExit(
            "research: that URL did not return the sheet as CSV.\n"
            "  In Google Sheets: File > Share > Publish to web > CSV, and use that link\n"
            "  (or a .../export?format=csv link).")
    reader = csv.DictReader(io.StringIO(text))
    columns = set(reader.fieldnames or [])
    return [row_to_entry(r) for r in reader], columns


def reconcile_ids(entries, ledger):
    """Restore each row's stable id/added from the committed snapshot, matched by
    sourceUrl, so sheet rows may leave those blank without churning ids."""
    # The snapshot can hold several rows with one link (a pasted repeat shares the old
    # row's id). The last one wins, EXCEPT that a row which is not approved never
    # displaces an approved one: a repeat must not be able to move a published id.
    by_url = {}
    for e in ledger:
        link = e.get("sourceUrl")
        if link and (link not in by_url or by_url[link]["status"] != APPROVED or e["status"] == APPROVED):
            by_url[link] = e
    for e in entries:
        prev = by_url.get(e["sourceUrl"])
        if prev:
            if e["id"] is None:
                e["id"] = prev["id"]
            if not e["added"]:
                e["added"] = prev["added"]
    return entries


def keep_recorded_state(entries, ledger):
    """Copy status, note and foundational from the committed snapshot onto the rows it
    knows: by id (two rows can share a link), else by sourceUrl."""
    by_id = {e["id"]: e for e in ledger if e["id"] is not None}
    by_url = {e["sourceUrl"]: e for e in ledger if e.get("sourceUrl")}
    for e in entries:
        prev = by_id.get(e["id"]) or by_url.get(e["sourceUrl"])
        if prev:
            e["status"], e["note"], e["foundational"] = prev["status"], prev["note"], prev["foundational"]
    return entries


def load_source(url):
    """Entries to build from: a remote sheet (reconciled against the committed
    snapshot) or the local content/research.csv."""
    if not url:
        return load_local_entries()
    entries, columns = fetch_entries(url)
    ledger = load_local_entries()
    reconcile_ids(entries, ledger)
    if "status" in columns and "archived" in columns:
        print("  note: the sheet has both a `status` and an `archived` column; "
              "`status` decides and `archived` is ignored")
    # A sheet with NEITHER `status` nor `archived` cannot express where a row stands, so
    # keep what the committed snapshot recorded for it rather than quietly publishing or
    # un-archiving rows on every sync. A sheet that DOES carry one of the columns stays
    # authoritative -- including blanks.
    if "status" not in columns and "archived" not in columns:
        keep_recorded_state(entries, ledger)
    return entries


def published(entries):
    """The rows that reach the site: approved ones only."""
    return [e for e in entries if e["status"] == APPROVED]


def counts_note(entries):
    """'7 under review, 105 archived': the rows that are not approved ('' if none)."""
    n = {s: sum(1 for e in entries if e["status"] == s) for s in (UNDER_REVIEW, ARCHIVED)}
    return ", ".join(f"{n[s]} {s}" for s in (UNDER_REVIEW, ARCHIVED) if n[s])


def note_unfinished(entries):
    """One line about under-review rows that are still incomplete: fine until approved."""
    rows = unfinished(entries)
    if rows:
        ids = [str(e["id"]) for e in rows if e["id"] is not None]
        new = sum(1 for e in rows if e["id"] is None)
        who = ", ".join(x for x in (("ids " + ", ".join(ids)) if ids else "",
                                    f"{new} new row(s)" if new else "") if x)
        print(f"  note: {len(rows)} under review row(s) are still incomplete "
              f"(fine until approved): {who}")


def _at(path, lines):
    """'data/tracker-data.js lines 12, 40': where an id is written (the first five lines)."""
    shown = ", ".join(str(n) for n in lines[:5]) + (" ..." if len(lines) > 5 else "")
    return f"{path} line{'s' if len(lines) > 1 else ''} {shown}"


def dangling_references(entries, text, fb):
    """Where every id that a POLICY_DATA card, a {{cite}} token or a Fact Bank fact points
    at stands in the sheet. `text` is data/tracker-data.js, `fb` data/fact-bank-data.js.
    Returns (notes, problems), both lists of lines.

      notes     ids whose row is under review or archived. The page leaves them out on
                purpose (a card may cite a paper the Sheet has archived, and an archived
                paper's facts go with it), so they never fail `check`.
      problems  ids that are in NO row of the sheet: a typo, or a row someone deleted.
                The browser cannot tell that from an archived paper (it only has the
                published ones), so this is where it is caught.

    An id is fine when its row is approved or it is a POLICY_SOURCES id."""
    # Where each id stands, so a dangling reference can say why.
    standing = {str(e["id"]): e["status"] for e in entries if e["id"] is not None}
    # Valid citation targets, as strings: approved research ids (numeric, from the
    # Sheet) plus the hand-maintained POLICY_SOURCES string ids. Comparing in
    # string space lets numeric research ids and string policy-source ids coexist.
    valid = {str(e["id"]) for e in published(entries) if e["id"] is not None} | policy_source_ids(text)
    notes, problems = [], []
    for label, path, referenced in (
            ("POLICY_DATA paperIds", "data/tracker-data.js", policy_paper_ids(text)),
            ("{{cite:ID}} tokens", "data/tracker-data.js", cite_token_ids(text)),
            ("Fact Bank paperIds", "data/fact-bank-data.js", fact_bank_paper_ids(fb))):
        dangling = sorted(set(referenced) - valid)
        unpublished = [i for i in dangling if i in standing]
        missing = [i for i in dangling if i not in standing]
        if unpublished:
            what = ", ".join(f"{i} ({standing[i]})" for i in unpublished)
            notes.append(f"  note: {label} point at papers that are not published "
                         f"(not approved, and not in POLICY_SOURCES): {what}")
        if missing:
            what = ", ".join(f"{i} ({_at(path, referenced[i])})" for i in missing)
            problems.append(f"{label} point at ids that are in no row of the sheet "
                            f"(a typo, or a row that was deleted): {what}")
    return notes, problems


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
    # Three hand-maintained regions reference research by id: POLICY_DATA id
    # arrays, {{cite:N}} tokens in prose, and Fact Bank facts.
    # A study that is under review or archived leaves any of these dangling on purpose
    # -- the policy silently drops it, a {{cite}} renders raw, and a fact whose paper is
    # not published is hidden by the runtime guard in 80-fact-bank.js -- so those are
    # notes, the checklist of hand-edits an archive leaves behind. (This is why the Fact
    # Bank went blank once: an archive with no such warning left every fact pointing at
    # a study that no longer rendered.) An id that is in no row at all is a typo or a
    # deleted row, which nothing can ever resolve: that is a problem, and check fails.
    approved = published(entries)
    notes, problems = dangling_references(entries, text, read_fact_bank())
    for line in notes:
        print(line)
    note_unfinished(entries)
    if problems:
        print(f"check: {len(problems)} problem(s):", file=sys.stderr)
        for p in problems:
            print("  - " + p, file=sys.stderr)
        return 1
    others = counts_note(entries)
    print(f"  ok  {len(approved)} approved entries valid"
          + (f"  ({others}, not published)" if others else ""))
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

    # Publish only approved rows; the rest stay in the sheet/CSV for the record.
    approved = published(entries)
    others = counts_note(entries)
    out = splice_research(text, approved)
    with open(DATA, "w", encoding="utf-8") as fh:
        fh.write(out)
    note_unfinished(entries)
    print(f"  wrote  data/tracker-data.js  ({len(approved)} entries published"
          + (f"; {others}, kept in the sheet)" if others else ")"))
    print("  Reload the page to see it; commit + push to publish.")
    return 0


def _rules_selftest():
    """The status rules, on tiny in-memory sheets (nothing is read or written).
    Returns (number of checks, list of what went wrong)."""
    problems, done = [], [0]

    def expect(ok, what):
        done[0] += 1
        if not ok:
            problems.append(what)

    base = {"id": "", "date": "2026-01-02", "added": "2026-01-03", "category": "cat-a",
            "geography": "us", "evidence": "", "title": "A title", "source": "Ann -- Org",
            "sourceUrl": "https://example.org/", "keyFinding": "A finding.",
            "takeaways": "One point", "extra_json": "", "foundational": "", "note": ""}
    old_cols = ["id", "date", "added", "archived", "category", "geography", "evidence", "title",
                "source", "sourceUrl", "keyFinding", "takeaways", "extra_json", "foundational"]
    new_cols = COLUMNS

    def sheet(header, rows):
        buf = io.StringIO()
        w = csv.DictWriter(buf, fieldnames=header, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow(dict(base, **r))
        buf.seek(0)
        return [row_to_entry(r) for r in csv.DictReader(buf)]

    def errors_of(header, rows):
        return validate(sheet(header, rows), ["cat-a"], warn=lambda m: None)

    def names(errors, *words):
        return any(all(w in m for w in words) for m in errors)

    def link(n):
        return {"sourceUrl": f"https://example.org/{n}"}

    # A sheet with no `status` column is read exactly the old way.
    old = sheet(old_cols, [
        dict(id="1", **link(1)),                                                  # live
        dict(id="2", archived="superseded 2026-08", title="", **link(2)),         # archived, a reason
        dict(id="3", archived="ARCHIVED", **link(3)),                             # archived, the bare word
        dict(id="4", archived="pending", **link(4)),                              # any text hides it
        dict(id="5", foundational="foundational", **link(5)),                     # column ignored
    ])
    expect(not validate(old, ["cat-a"], warn=lambda m: None), "old sheet: a clean sheet gave errors")
    expect([e["status"] for e in old] == [APPROVED, ARCHIVED, ARCHIVED, ARCHIVED, APPROVED],
           "old sheet: any text in `archived` (even 'pending') must mean archived, blank approved")
    expect([e["note"] for e in old] == ["", "superseded 2026-08", "", "pending", ""],
           "old sheet: the archived text must become the note (nothing for the bare word)")
    expect(all(not e["foundational"] for e in old), "old sheet: `foundational` must still be ignored")
    expect(names(errors_of(old_cols, [dict(id="1", date="", **link(1))]), "row 1", "'date'"),
           "old sheet: a live row without a date must still stop the sync and name the row")
    expect(names(errors_of(old_cols, [dict(id="1", archived="", title="", **link(1))]), "row 1", "'title'"),
           "old sheet: a blank-archived bare link must still stop the sync (as it always did)")

    # A sheet with a `status` column.
    new = sheet(new_cols, [
        dict(id="1", status="approved", **link(1)),
        dict(id="2", status="", **link(2)),                                       # blank = under review
        dict(id="3", status=" Approved ", foundational="Foundational", **link(3)),
        dict(id="4", status="under review", date="", title="", source="", category="",
             geography="", keyFinding="", takeaways="", **link(4)),               # a bare link
        dict(id="5", status="archived", note="superseded", title="", **link(5)),
        dict(id="6", status="approved", **link(6)),
        dict(id="7", status="under review", foundational="foundational", **link(7)),
    ])
    expect(not validate(new, ["cat-a"], warn=lambda m: None), "new sheet: a clean sheet gave errors")
    expect([e["status"] for e in new] == [APPROVED, UNDER_REVIEW, APPROVED, UNDER_REVIEW, ARCHIVED,
                                          APPROVED, UNDER_REVIEW], "new sheet: statuses misread")
    expect([e["id"] for e in unfinished(new)] == [4], "new sheet: only the bare link is unfinished")
    out = serialize_entries(published(new))
    back = JSParser(out, len("const RESEARCH_DATA = ")).arr()
    expect([b["id"] for b in back] == [1, 3, 6], "new sheet: only approved rows may be published")
    expect([b.get("foundational") for b in back] == [None, True, None],
           "new sheet: `foundational: true` belongs on the approved foundational row only")
    expect("status" not in out and "note:" not in out, "new sheet: status and note must never be published")
    # ... and the snapshot columns carry all of it through a write and a read.
    for label, entries in (("new", new), ("old", old)):
        buf = io.StringIO()
        w = csv.DictWriter(buf, fieldnames=COLUMNS)
        w.writeheader()
        for e in entries:
            w.writerow(entry_to_row(e))
        buf.seek(0)
        expect([row_to_entry(r) for r in csv.DictReader(buf)] == entries,
               f"snapshot: status, foundational and note must round-trip ({label} sheet)")
    # An extra_json key can never override a column.
    sneaky = sheet(new_cols, [dict(id="1", status="under review",
                                   extra_json='{"status": "approved", "highlight": {"a": 1}}', **link(1))])
    expect(sneaky[0]["status"] == UNDER_REVIEW and sneaky[0].get("highlight") == {"a": 1},
           "extra_json must not be able to approve a row, but must still carry its own keys")

    # A sheet with neither column keeps what the snapshot recorded, row by row, even when
    # two rows share a link.
    ledger = sheet(new_cols, [dict(id="1", status="approved", **link(1)),
                              dict(id="2", status="archived", note="old", **link(1)),
                              dict(id="3", status="under review", **link(3))])
    bare = sheet(["id", "sourceUrl", "title"], [dict(id="1", **link(1)), dict(id="2", **link(1)),
                                                dict(id="3", **link(3)), dict(id="", **link(9))])
    keep_recorded_state(bare, ledger)
    expect([e["status"] for e in bare] == [APPROVED, ARCHIVED, UNDER_REVIEW, APPROVED]
           and bare[1]["note"] == "old",
           "a sheet with neither column must keep the snapshot's status for each row (matched by id first)")

    # Mistakes stop the sync and name the row.
    expect(names(errors_of(new_cols, [dict(id="1", status="approved", **link(1)),
                                      dict(id="2", status="aproved", **link(2))]), "row 2", "'aproved'"),
           "an unknown status must stop the sync and name the row")
    expect(names(errors_of(new_cols, [dict(id="1", status="approved", keyFinding="", **link(1))]),
                 "row 1", "'keyFinding'"), "an approved row must be complete")
    expect(names(errors_of(new_cols, [dict(id="1", status="approved", takeaways="", **link(1))]),
                 "row 1", "takeaway"), "an approved row needs a takeaway")
    expect(names(errors_of(new_cols, [dict(id="1", status="under review", foundational="classic", **link(1))]),
                 "row 1", "'classic'"), "an unknown `foundational` word must stop the sync")
    expect(names(errors_of(new_cols, [dict(id="1", status="approved", **link(1)),
                                      dict(id="1", status="approved", **link(2))]), "duplicate id"),
           "a duplicate id must still stop the sync")
    expect(names(errors_of(new_cols, [dict(id="1", status="approved", **link(1)),
                                      dict(id="1", status="approved", **link(1))]), "same link"),
           "a repeated link must say so")

    # A pasted link that repeats another row's link. reconcile_ids hands the repeat the old
    # row's id, and that used to stop the sync for a row that is never published. Now only
    # two APPROVED rows with one id stop it; an under review (or blank) repeat is a named
    # warning. `checked` replays the whole chain: reconcile against the snapshot, then validate.
    def checked(header, rows, ledger=None):
        entries = sheet(header, rows)
        if ledger is not None:
            reconcile_ids(entries, ledger)
        said = []
        return validate(entries, ["cat-a"], warn=said.append), said

    def bare(n, **kw):                       # a link-only row, as pasted into the Sheet
        row = dict(id="", status="", date="", title="", source="", category="", geography="",
                   keyFinding="", takeaways="", **link(n))
        row.update(kw)
        return row

    approved5 = dict(id="5", status="approved", **link(5))
    ledger5 = sheet(new_cols, [approved5])
    errs, said = checked(new_cols, [approved5, bare(5)], ledger5)
    expect(not errs, "a pasted link that repeats an approved row's link (blank status) must not stop the sync")
    expect(names(said, "warning", "row 1 (id 5, approved)", "row 2 (id 5, under review)", "example.org/5"),
           "a pasted repeat must be named in a warning, with both rows and the link")
    errs, said = checked(new_cols, [approved5, bare(5, status="under review")], ledger5)
    expect(not errs and names(said, "row 2 (id 5, under review)"),
           "a repeat whose status is 'under review' must not stop the sync either")
    errs, said = checked(new_cols, [bare(5), approved5], ledger5)
    expect(not errs and names(said, "row 1 (id 5, under review)", "row 2 (id 5, approved)"),
           "a pasted repeat ABOVE the approved original must not stop the sync, and the warning names the repeat")
    errs, said = checked(new_cols, [approved5, bare(5, status="archived")], ledger5)
    expect(not errs and not said, "an archived row is on record: no stop and no warning for a shared id and link")
    errs, said = checked(new_cols, [approved5, bare(5, id="6")])
    expect(not errs and names(said, "row 2 (id 6, under review)"),
           "a link repeated under another id is a warning only")
    errs, said = checked(new_cols, [approved5, dict(id="6", status="approved", **link(5))])
    expect(not errs and not said, "two approved rows with different ids and one link are left as they were")
    errs, said = checked(new_cols, [bare(8), bare(8)])
    expect(not errs and names(said, "row 1 (id NEW, under review)", "row 2 (id NEW, under review)"),
           "two new pasted rows with one link (no ids yet) are a warning, not a stop")
    ledger8 = sheet(new_cols, [dict(id="324", status="under review", **link(8)),
                               dict(id="325", status="under review", **link(8))])
    errs, said = checked(new_cols, [bare(8), bare(8)], ledger8)
    expect(not errs and names(said, "(id 325, under review)"),
           "the day after, when both twins resolve to one id, it is still a warning, not a stop")
    errs, said = checked(new_cols, [bare(8), bare(8), bare(8)])
    expect(sum("warning" in m for m in said) == 1 and names(said, "row 3"),
           "a link on three rows is one warning, naming every row")

    # A repeat must not be able to move a published id. Two rows that share a link and sit in
    # the snapshot under different ids (twins pasted in one batch get one id each the first
    # day) both resolve to the SAME id the next day, and it has to be the published row's.
    twins = sheet(new_cols, [dict(id="324", status="approved", **link(9)),
                             dict(id="325", status="under review", **link(9))])

    def resolved(ledger_rows):
        got = sheet(["id", "sourceUrl", "title"], [dict(id="", **link(9)), dict(id="", **link(9))])
        reconcile_ids(got, ledger_rows)
        return [e["id"] for e in got]

    expect(resolved(twins) == [324, 324], "a repeat must not move a published id: blank rows take the approved row's id")
    expect(resolved(twins[::-1]) == [324, 324], "... whichever order the snapshot lists the two rows in")
    expect(resolved(sheet(new_cols, [dict(id="324", status="under review", **link(9)),
                                     dict(id="325", status="archived", **link(9))])) == [325, 325],
           "with no approved row the last row with the link still wins, as before")
    expect(resolved(sheet(new_cols, [dict(id="10", status="approved", **link(9)),
                                     dict(id="11", status="approved", **link(9))])) == [11, 11],
           "with two approved rows the last still wins, as before (the sheet has such a pair today)")

    # ... and what must still stop the sync.
    errs, _ = checked(new_cols, [approved5, dict(approved5)])
    expect(names(errs, "row 2", "duplicate id (also row 1)", "same link"),
           "two approved rows with one id and one link must still stop the sync")
    errs, _ = checked(new_cols, [approved5, bare(5, id="5"), dict(approved5)])
    expect(names(errs, "row 3", "also row 1", "same link"),
           "an under review repeat in between must not hide a second approved row")
    errs, _ = checked(new_cols, [approved5, dict(id="5", status="under review", **link(6))])
    expect(names(errs, "row 2", "duplicate id") and not names(errs, "same link"),
           "an id shared by rows with DIFFERENT links must still stop the sync, whatever their status")
    errs, said = checked(new_cols, [approved5, bare(5, id="5", foundational="classic")])
    expect(names(errs, "row 2", "'classic'") and names(said, "warning"),
           "a repeat must not hide another mistake in its own row")
    errs, _ = checked(old_cols, [dict(id="5", **link(5)), dict(id="5", **link(5))])
    expect(names(errs, "duplicate id", "same link"),
           "an old-format sheet stays strict: a blank `archived` means approved")
    return done[0], problems


def _reference_selftest():
    """The reference rules (`check` on ids that cards, tokens and facts point at), on tiny
    in-memory data files (nothing is read or written). Returns (number of checks, list of
    what went wrong)."""
    problems, done = [], [0]

    def expect(ok, what):
        done[0] += 1
        if not ok:
            problems.append(what)

    def names(lines, *words):
        return any(all(w in m for w in words) for m in lines)

    def row(i, status):
        return {"id": i, "status": status}

    # Line numbers below are for these texts: paperIds on line 5, the cite tokens on line 6;
    # the facts' paperIds on lines 2 to 4.
    cards = ('const POLICY_SOURCES = [\n  { id: "src-ok" },\n];\n'
             'const POLICY_DATA = [\n'
             '  { id: "a", paperIds: [1, 2, "src-ok", 9001, "src-typo"],\n'
             '    rationale: "x {{cite:1}} {{citep:src-ok}} {{cite:3}} {{cite:9002}}" },\n'
             '];\n')
    facts = "const FACTS = [\n  { paperId: 1 },\n  { paperId: 2 },\n  { paperId: 9003 },\n];\n"
    sheet_rows = [row(1, APPROVED), row(2, ARCHIVED), row(3, UNDER_REVIEW)]

    notes, bad = dangling_references(sheet_rows, cards, facts)
    # Unpublished is only a note: the owner decided on 2026-11-16 that cards may cite archived
    # papers and that an archived paper's facts go with it.
    expect(names(notes, "POLICY_DATA paperIds", "2 (archived)")
           and names(notes, "{{cite:ID}} tokens", "3 (under review)")
           and names(notes, "Fact Bank paperIds", "2 (archived)"),
           "a reference to an archived or under review paper must stay a note, saying which")
    expect(not names(bad, "(archived)") and not names(bad, "(under review)"),
           "a reference to an archived or under review paper must never be a problem")
    expect(names(bad, "POLICY_DATA paperIds", "9001"), "a card paperId that is in no row must be a problem")
    expect(names(bad, "POLICY_DATA paperIds", "src-typo"),
           "a card paperId that is neither a POLICY_SOURCES id nor in the sheet must be a problem")
    expect(names(bad, "{{cite:ID}} tokens", "9002"), "a {{cite}} token whose id is in no row must be a problem")
    expect(names(bad, "Fact Bank paperIds", "9003"), "a Fact Bank paperId that is in no row must be a problem")
    expect(names(bad, "9001 (data/tracker-data.js line 5)") and names(bad, "9002 (data/tracker-data.js line 6)"),
           "a problem must say which line of tracker-data.js the id is on")
    expect(names(bad, "9003 (data/fact-bank-data.js line 4)"),
           "a problem must say which line of fact-bank-data.js the id is on")
    expect(not names(notes + bad, "src-ok") and len(notes) == 3 and len(bad) == 3,
           "an approved id or a POLICY_SOURCES id must never be reported")

    # Only unpublished references: notes, and `check` passes.
    only_unpublished = cards.replace(', 9001, "src-typo"', "").replace(" {{cite:9002}}", "")
    notes, bad = dangling_references(sheet_rows, only_unpublished, "")
    expect(notes and not bad, "references to archived and under review papers alone must not fail check")
    # The same references once the rows are deleted from the sheet: now they are problems.
    notes, bad = dangling_references([row(1, APPROVED)], only_unpublished, "")
    expect(not notes and names(bad, "POLICY_DATA paperIds", "2 (data/tracker-data.js line 5)")
           and names(bad, "{{cite:ID}} tokens", "3 (data/tracker-data.js line 6)"),
           "an id whose row was deleted must stop being a note and become a problem")
    # A reference to a row that is only archived is not the same as a reference to a typo.
    expect(dangling_references([row(1, APPROVED), row(2, ARCHIVED), row(3, ARCHIVED)],
                               only_unpublished, "")[1] == [],
           "archiving a row must never turn its references into problems")
    # Nothing dangling: silence. And a missing Fact Bank file is not an error.
    clean = 'const POLICY_DATA = [\n  { id: "a", paperIds: [1], rationale: "{{cite:1}}" },\n];\n'
    expect(dangling_references(sheet_rows, clean, "") == ([], []), "a card citing only approved papers must be silent")
    # Numeric research ids in the sheet and string ids in the files meet in string space.
    expect(dangling_references([row(7, APPROVED)], 'x paperIds: ["7"] y', "") == ([], []),
           "a numeric sheet id must match the same id written as a string")

    # The wiring: `check` itself must exit 1 for an id that is in no row, and 0 when the ids
    # are only archived or under review. This points the module at a throwaway folder for a
    # moment (the Fact Bank file is left out of it, as on a partial checkout).
    import contextlib, tempfile

    def check_exit(cited, rows):
        global DATA, SHEET, FACT_BANK_DATA
        kept = (DATA, SHEET, FACT_BANK_DATA)
        with tempfile.TemporaryDirectory() as tmp:
            DATA, SHEET, FACT_BANK_DATA = (os.path.join(tmp, n) for n in
                                           ("tracker-data.js", "research.csv", "fact-bank-data.js"))
            try:
                with open(DATA, "w", encoding="utf-8") as fh:
                    fh.write('const CATEGORIES = [ { id: "cat-a" } ];\n'
                             'const POLICY_DATA = [ { id: "a", paperIds: [' + cited + '] } ];\n')
                with open(SHEET, "w", encoding="utf-8", newline="") as fh:
                    w = csv.DictWriter(fh, fieldnames=COLUMNS)
                    w.writeheader()
                    for i, status in rows:
                        w.writerow(entry_to_row({
                            "id": i, "date": "2026-01-02", "added": "2026-01-03", "category": "cat-a",
                            "geography": "us", "title": "T", "source": "A -- B", "status": status,
                            "sourceUrl": f"https://example.org/{i}", "keyFinding": "F", "takeaways": ["x"]}))
                out, err = io.StringIO(), io.StringIO()
                with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
                    code = cmd_check()
                return code, err.getvalue()
            finally:
                DATA, SHEET, FACT_BANK_DATA = kept

    rows = [(1, APPROVED), (2, ARCHIVED), (3, UNDER_REVIEW)]
    code, _ = check_exit("1, 2, 3", rows)
    expect(code == 0, "check must exit 0 when the only unpublished references are archived or under review")
    code, err = check_exit("1, 2, 9001", rows)
    expect(code == 1 and "9001" in err, "check must exit 1, naming the id, when a card cites an id that is in no row")
    return done[0], problems


def cmd_selftest():
    """Prove the FULL pipeline is lossless on the live data, touching nothing:
    parse -> CSV -> parse -> serialize -> parse, then deep-compare to the original.
    Then check the status rules on small in-memory sheets."""
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
    for kind, group in (("status-rule", _rules_selftest), ("reference", _reference_selftest)):
        checks, problems = group()
        if problems:
            print(f"selftest FAILED: {len(problems)} of {checks} {kind} checks failed:", file=sys.stderr)
            for p in problems:
                print("  - " + p, file=sys.stderr)
            return 1
        print(f"  selftest ok  all {checks} {kind} checks pass")
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
