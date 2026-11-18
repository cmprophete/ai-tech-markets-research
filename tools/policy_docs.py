#!/usr/bin/env python3
"""
policy_docs.py -- put the policy-card text the team writes in Google Docs onto the site,
VERBATIM, and refuse (saying why) rather than fix anything.

    python3 tools/policy_docs.py check --doc ui.docx --card ui-reform
                                         dry run on one Doc's Word export: says, field by
                                         field, what would change on the site; writes nothing
    python3 tools/policy_docs.py check --gate <sheet csv or url> --exports <folder>
                                         the same for every card the Sheet marks approved
                                         (<folder>/<card id>.docx for each)
    python3 tools/policy_docs.py verify ...  only the round-trip proof (same inputs as check)
    python3 tools/policy_docs.py build ...   write data/policy-text.js (same inputs; run ONLY in a
                                         scratch copy of the repo or in the Action: see below)
    python3 tools/policy_docs.py selftest    prove the reader, the encoder and the verifier on
                                         nasty fixtures; touches nothing

THE FORMAT. One Google Doc per card, copied from the template Doc. Sections are found by
their EXACT label text (the team styles headings inconsistently, so style is not used):

    <title line>                              -> title
    Policy                                    -> summary
    Why This is Important in an AI-Driven Economy -> rationale
    ESP's Take                                (group heading, apostrophe curly or straight)
      Strengths  (bullets)                    -> strengths   (one string per bullet)
      Risks      (bullets)                    -> risks       (one string per bullet)
    Precedents & Examples                     (group heading)
      Where it stands                         -> landscape
      References                              -> references  (one string per item)

A typed "## " in front of a label is accepted. Nothing else is read from the Doc: every other
field of a card stays as it is in data/tracker-data.js, and the sync never touches it. How a Doc
joins its card: the card id written in its row of the Sheet's `policy map` tab (columns `card id`,
`doc link`, and the status column `general status`); the Doc's own title line is synced as `title`, and a title that differs from the
site's is reported.

THE DATE. A card shows "Last updated <date>": the day its Doc was last modified. That time is not
in a .docx export, so whoever fetches the Doc passes it: `--modified <time>` for each --doc (Drive's
modifiedTime, for example 2026-11-17T19:39:21.327Z), or `<card id>.json` next to each export holding
{"modifiedTime": "..."} (the Drive file's metadata will do). It is written as `docModified` (the UTC
instant) and `docUpdated` (the calendar day in America/New_York, DISPLAY_TZ: the owner's and the
readers' day, not UTC's). `check` works without it; `build` refuses without it, refuses a time older
than the one already on the site for that card, and refuses the same time with different text. The
date describes the text on the page: a card that is not approved keeps its old text AND its old date.

WHAT IS CARRIED, AND HOW. The only transformations (docs/policy-card-rules.md): JS-string
escaping; `&`, `<`, `>` escaped as `&amp;`, `&lt;`, `&gt;`; paragraphs joined with <br><br>; a
bullet list as <ul><li>..</li></ul>; bold as <strong>; a hyperlink as a real link
(<a href=".." target="_blank" rel="noopener noreferrer">). Curly quotes, dashes, accents and
every other character are kept as they are.

WHAT IT REFUSES (`check` and `build` stop and list every problem; nothing is repaired): an
unknown, duplicate, missing or out-of-order heading; any formatting but bold and links
(italic, underline, strike, colours, fonts, sizes, highlights, super/subscript); tables, images,
drawings, footnotes, equations, page breaks, fields and smart chips; pending suggestions; soft
line breaks, tabs and blank bullets inside a list; numbered or nested lists; links that are
not http(s); the double braces that are the page's own token syntax; text still starting
"[Replace this"; control characters. Bold on a heading line is heading styling and ignored.
Non-breaking spaces are reported, not refused.

THE ONE WRITER. `build` writes data/policy-text.js, which the page lays over the hand-kept
POLICY_DATA. It is generated: nobody edits it, and `build` is not run in the working tree you
commit from (it refuses there unless told not to), only in a scratch copy of the repo or in
the sync Action. See docs/policy-doc-sync.md.

The .docx files are untrusted data: tools/docx_reader.py reads them in memory, with caps,
and keep them in a folder of their own. No dependencies beyond the Python standard library.
"""

import argparse
import collections
import csv
import datetime
import difflib
import hashlib
import html
import io
import json
import os
import re
import subprocess
import sys
import tempfile
import unicodedata
import urllib.request
from urllib.parse import urlsplit

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)
import docx_reader as dr      # noqa: E402  (the untrusted-file reader)
import research               # noqa: E402  (the data-file parsers the research sync already trusts)

ROOT = research.ROOT
DATA = research.DATA
# Where the earlier sync lives. Only the tests move it (POLICY_DOCS_TEXT_FILE), so that a test of `check` does not depend on
# which cards happen to be synced in the repo the day it runs.
TEXT_FILE = os.environ.get("POLICY_DOCS_TEXT_FILE") or os.path.join(ROOT, "data", "policy-text.js")

# ── the template ────────────────────────────────────────────────────────────

# (key, the label as the template writes it, the POLICY_DATA field it fills; None = group heading)
TEMPLATE = [
    ("policy", "Policy", "summary"),
    ("why", "Why This is Important in an AI-Driven Economy", "rationale"),
    ("esp", u"ESP\u2019s Take", None),
    ("strengths", "Strengths", "strengths"),
    ("risks", "Risks", "risks"),
    ("precedents", "Precedents & Examples", None),
    ("stands", "Where it stands", "landscape"),
    ("references", "References", "references"),
]
ORDER = [k for k, _, _ in TEMPLATE]
FIELD_OF = dict((k, f) for k, _, f in TEMPLATE if f)
LABEL_TEXT = dict((k, t) for k, t, _ in TEMPLATE)
SHORT = {"policy": "Policy", "why": "Why This is Important", "esp": "ESP's Take", "strengths": "Strengths",
         "risks": "Risks", "precedents": "Precedents & Examples", "stands": "Where it stands",
         "references": "References"}
PROSE = ("policy", "why", "stands")        # paragraphs and bullets, joined with <br><br> and <ul>
BULLETS = ("strengths", "risks")           # bullets only, one string each
ITEMS = ("references",)                    # paragraphs or bullets, one string each
GROUPS = ("esp", "precedents")             # a heading with nothing of its own under it
# The order the generated file writes a card's fields in.
FIELD_ORDER = ["title", "summary", "rationale", "strengths", "risks", "landscape", "references",
               "docModified", "docUpdated"]
# The day a card shows as "Last updated" is the day its Doc was last modified, in THIS time zone: the
# owner's and the readers' (a Doc saved at 9 pm on the 17th in New York is the 17th, not the 18th UTC).
DISPLAY_TZ = "America/New_York"
# The report lists every other field the card still carries ("stays as it is"), whatever
# those are today: nothing here names them, so a field the owner retires or restructures
# never leaves this tool wrong.

_APOS = {u"\u2019": "'", u"\u2018": "'", u"\u02bc": "'", u"\u00b4": "'", "`": "'"}


def label_key(text):
    """A line's text as the template's labels are compared: apostrophes matched loosely,
    spaces squeezed, a typed leading `##` dropped. Capitals and everything else are exact."""
    s = "".join(_APOS.get(c, c) for c in text)
    s = re.sub(r"\s+", " ", s).strip()
    return re.sub(r"^#{1,6}\s*", "", s)


LABELS = dict((label_key(t), k) for k, t, _ in TEMPLATE)


def _near(text):
    """For a hint only: a line's text reduced to letters and digits, lower case."""
    return re.sub(r"[^a-z0-9]+", "", label_key(text).lower())


NEAR_LABELS = dict((_near(t), k) for k, t, _ in TEMPLATE)

# ── what a refusal says, and how to fix it in the Doc ───────────────────────

HINTS = {
    "table": "Replace the table with paragraphs or bullets.",
    "image": "Remove the image, drawing or text box; the card carries text only.",
    "footnote": "Move the footnote into the text, or link the source instead.",
    "equation": "Write the equation out in words.",
    "page-break": "Remove the page or section break.",
    "suggestion": "Accept or reject every pending suggestion in the Doc first.",
    "smart-chip": "Replace the chip, field or content control with plain text or a link.",
    "soft-break": "Use a new paragraph (Enter) instead of Shift+Enter.",
    "tab": "Remove the tab; use a space.",
    "empty-bullet": "Delete the blank bullet, or write the text it should hold.",
    "numbered-list": "Use a bulleted list (or plain paragraphs); numbered lists are not carried.",
    "nested-list": "Flatten the list to one level.",
    "list-unknown": "Use an ordinary bulleted list.",
    "italic": "Remove the italics; the sync carries bold and links only.",
    "underline": "Remove the underline (only a hyperlink's own underline is allowed).",
    "strike": "Remove the strike-through.",
    "color": "Clear the text colour (Format > Clear formatting).",
    "font": "Clear the formatting (Format > Clear formatting), or paste without formatting.",
    "size": "Clear the formatting (Format > Clear formatting), or paste without formatting.",
    "highlight": "Remove the highlight or shading.",
    "script": "Write the superscript or subscript as ordinary text.",
    "hidden": "Show or delete the hidden text.",
    "format": "Clear the formatting (Format > Clear formatting).",
    "char-style": "Clear the formatting (Format > Clear formatting).",
    "para-style": "Set the paragraph to 'Normal text'.",
    "link-scheme": "Use a normal web address (https://...) or take the link off.",
    "link-internal": "Link to a web address, or take the link off.",
    "link-empty": "Remove the empty link.",
    "link-broken": "Re-insert the link.",
    "placeholder": "Replace the template's [Replace this: ...] text with the card's own text.",
    "control-char": "Delete the control character (retype the text if needed).",
    "bidi-char": "Delete the text-direction control character.",
    "xml-space": "Retype the text so its spaces are explicit.",
    "braces": "Remove the double braces: the page reads {{...}} as its own citation tokens.",
    "no-title": "Put the card's title on the first line of the Doc.",
    "title-link": "Take the link off the title.",
    "title-chars": "Use plain characters in the title (an & followed by a space is fine).",
    "unknown-heading": "Use one of the template's headings exactly, or make the line ordinary text.",
    "duplicate-heading": "Keep one heading of that name.",
    "missing-heading": "Add the heading exactly as the template writes it.",
    "heading-order": "Put the headings back in the template's order.",
    "text-outside-section": "Move the text under one of the template's headings.",
    "not-a-bullet": "Make each item a bullet.",
    "label-is-bullet": "Make the heading an ordinary heading line, not a bullet.",
    "empty-section": "Add the section's text (it cannot be empty).",
    "modified": "Pass the Doc's Drive modifiedTime (for example 2026-11-17T19:39:21.327Z).",
    "modified-older": "Download the Doc again (and its modified time) and rerun.",
    "modified-same": "Download the Doc again (and its modified time) and rerun.",
    "empty-doc": "The Doc has no text.",
    "unsupported": "Remove it, or ask for it to be supported.",
}


class Result(object):
    """What one Doc came to: what it holds, what it refuses, what it would change."""

    def __init__(self, card_id, label, data):
        self.card_id = card_id
        self.label = label                 # file name or Doc link shown in reports
        self.size = len(data) if data is not None else 0
        self.sha = hashlib.sha256(data).hexdigest()[:12] if data is not None else ""
        self.fatal = None                  # the file could not be read at all
        self.issues = []                   # dr.Problem: what is refused
        self.loc = {}                      # paragraph index -> where it sits, for messages
        self.notes = []                    # (code, para index or None, text)
        self.modified_in = None            # the Doc's last-modified time as given, if it was
        self.title = None                  # the title line, whenever one was found
        self.card = None                   # the parsed Card, when the Doc is clean
        self.fields = None                 # POLICY_TEXT fields, when it is clean
        self.diffs = None                  # round-trip differences (list), None if not run
        self.compare = []                  # (field, status, detail)
        self.links = []                    # (url, where it is known)
        self.stats = {}

    @property
    def ok(self):
        return self.fatal is None and not self.issues and self.fields is not None and not self.diffs


# ── reading the card out of a Doc ───────────────────────────────────────────

class Card(object):
    def __init__(self):
        self.title = None
        self.title_para = None
        self.labels = []                   # (key, Para) in document order
        self.blocks = {}                   # key -> [(kind, Para)] non-empty content, in order


def merge_runs(runs):
    """Adjacent runs that look the same become one; empty ones go. Encoding-neutral: it is
    what lets a Doc that splits one bold phrase into three runs come out as one <strong>."""
    out = []
    for r in runs:
        if not r.text:
            continue
        link = r.link or None
        if out and out[-1][1] == bool(r.bold) and out[-1][2] == link:
            out[-1] = (out[-1][0] + r.text, out[-1][1], out[-1][2])
        else:
            out.append((r.text, bool(r.bold), link))
    return out


def excerpt(text, n=44):
    s = re.sub(r"\s+", " ", text).strip()
    return u"\u201c%s%s\u201d" % (s[:n].rstrip(), u"\u2026" if len(s) > n else "")


def parse_card(doc):
    """Find the template's sections in a read Doc. Returns (card, issues, notes, loc). The
    card is only complete when `issues` is empty. Formatting findings on body text become
    issues here; on a heading line they are ignored (that is heading styling)."""
    issues, notes, loc = [], [], {}
    card = Card()

    def bad(code, text, para=None):
        issues.append(dr.Problem(code, text, para.index if para is not None else None))

    paras = doc.paragraphs
    nonempty = [i for i, p in enumerate(paras) if not p.empty]
    if not nonempty:
        bad("empty-doc", "the Doc has no text")
        return card, issues, notes, loc
    first, last = nonempty[0], nonempty[-1]
    if first:
        notes.append(("edge-empty", None, "%d empty paragraph(s) before the title are ignored" % first))
    if len(paras) - 1 - last:
        notes.append(("edge-empty", None, "%d empty paragraph(s) at the end are ignored" % (len(paras) - 1 - last)))
    items = paras[first:last + 1]

    # the title: the first line, whatever its style
    tp = items[0]
    card.title, card.title_para = tp.text, tp
    loc[tp.index] = "the title line " + excerpt(tp.text)
    if tp.kind == "li" or label_key(tp.text) in LABELS:
        bad("no-title", "the Doc starts with a heading or a bullet instead of a title line", tp)
    if any(r.link for r in tp.runs):
        bad("title-link", "the title line has a link in it", tp)
    if re.search(r"[<>]|&[A-Za-z#]", tp.text):
        bad("title-chars", "the title has <, > or an & that starts an entity", tp)

    # walk the rest: labels open sections, anything else is that section's content
    current, content = None, collections.OrderedDict()
    for p in items[1:]:
        if p.empty:
            if current is not None:
                content[current].append(p)
            continue
        key = LABELS.get(label_key(p.text)) if p.kind == "p" else None
        if p.kind == "li" and label_key(p.text) in LABELS:
            loc[p.index] = "a bullet " + excerpt(p.text)
            bad("label-is-bullet", "this heading is a bullet", p)
            continue
        if key is not None:
            card.labels.append((key, p))
            loc[p.index] = "the heading " + excerpt(p.text)
            current = key
            content.setdefault(key, [])
            continue
        if p.kind == "p" and (p.heading or re.match(r"^\s*#{1,6}\s", p.text)):
            near = NEAR_LABELS.get(_near(p.text))
            loc[p.index] = "the heading " + excerpt(p.text)
            bad("unknown-heading", "not one of the template's headings%s" % (
                (" (did you mean %r?)" % LABEL_TEXT[near]) if near else ""), p)
            continue
        if current is None:
            loc[p.index] = "text before the first heading " + excerpt(p.text)
            bad("text-outside-section", "text that is not under any of the template's headings", p)
            continue
        content[current].append(p)

    # headings: each exactly once, in the template's order
    counts = collections.Counter(k for k, _ in card.labels)
    for k in ORDER:
        if counts[k] == 0:
            hint = ""
            for p in items[1:]:
                if p.kind == "p" and not p.empty and _near(p.text) == _near(LABEL_TEXT[k]) \
                        and label_key(p.text) != label_key(LABEL_TEXT[k]):
                    hint = " (found %s: headings must match exactly)" % excerpt(p.text)
            bad("missing-heading", "the heading %r is missing%s" % (LABEL_TEXT[k], hint))
        elif counts[k] > 1:
            at = [p for kk, p in card.labels if kk == k]
            bad("duplicate-heading", "the heading %r appears %d times" % (LABEL_TEXT[k], counts[k]), at[1])
    if all(counts[k] == 1 for k in ORDER):
        got = [k for k, _ in card.labels]
        if got != ORDER:
            bad("heading-order", "the headings are in this order: %s; the template's order is: %s" % (
                " / ".join(SHORT[k] for k in got), " / ".join(SHORT[k] for k in ORDER)))

    # each section's content
    for key, plist in content.items():
        ne = [i for i, p in enumerate(plist) if not p.empty]
        name = SHORT[key]
        if key in GROUPS:
            for p in plist:
                if not p.empty:
                    loc[p.index] = "text under %s " % name + excerpt(p.text)
                    bad("text-outside-section", "%r only groups its subheadings; the text belongs under one of them"
                        % LABEL_TEXT[key], p)
            continue
        if not ne:
            if key != "references":
                bad("empty-section", "the section %r has no text" % LABEL_TEXT[key])
            card.blocks[key] = []
            continue
        lo, hi = ne[0], ne[-1]
        edge = lo + (len(plist) - 1 - hi)
        if edge:
            notes.append(("edge-empty", None, "%d empty paragraph(s) around the text under %s are ignored" % (edge, name)))
        body = plist[lo:hi + 1]
        n_p = n_li = blank = 0
        blocks = []
        for p in body:
            if p.empty:
                if p.kind == "li":
                    loc[p.index] = "%s, an empty bullet" % name
                    bad("empty-bullet", "a blank bullet inside a list", p)
                else:
                    # A blank line between paragraphs is the paragraph break it already is (the owner decided this on 2026-11-18, when the
                    # team's own Docs turned out to be typed that way): nothing is added for it, and nothing of the author's text is lost.
                    blank += 1
                continue
            if p.kind == "li":
                n_li += 1
                loc[p.index] = "%s, bullet %d %s" % (name, n_li, excerpt(p.text))
            else:
                n_p += 1
                loc[p.index] = "%s, paragraph %d %s" % (name, n_p, excerpt(p.text))
            if key in BULLETS and p.kind != "li":
                bad("not-a-bullet", "%s holds bullets only; this is a paragraph" % name, p)
                continue
            blocks.append((p.kind, p))
        if blank:
            notes.append(("blank-between", None, "%d blank line(s) between text under %s are read as the paragraph breaks they are; nothing is added for them" % (blank, name)))
        card.blocks[key] = blocks

    # per-paragraph checks on what is synced: formatting, placeholders, braces
    synced = [card.title_para] + [p for blocks in card.blocks.values() for _, p in blocks]
    for p in synced:
        if p is None:
            continue
        for code, detail in p.format:
            bad(code, detail, p)
        t = p.text
        if "[replace this" in t.lower():
            bad("placeholder", "the template's placeholder text is still here", p)
        if "{{" in t or "}}" in t:
            bad("braces", "double braces (the page reads {{...}} as its own tokens)", p)
        if t != t.strip() and not p.empty:
            notes.append(("edge-space", p.index, "a space at the start or end of the text"))
        if "  " in t:
            notes.append(("double-space", p.index, "two spaces in a row (a browser shows one)"))
        if p.runs and all(r.bold for r in p.runs if r.text.strip()) and p.kind == "p" and p is not card.title_para \
                and 0 < len(t.strip()) <= 70 and not any(r.link for r in p.runs):
            notes.append(("bold-line", p.index, "a short paragraph that is all bold: kept as a bold paragraph, not taken for a heading"))
        stray = [m for m in re.findall(r"https?://[^\s<>\"')\]]+", "".join(r.text for r in p.runs if not r.link))]
        if stray:
            notes.append(("bare-url", p.index, "%d web address(es) typed as text, not as links, are kept as text" % len(stray)))
    return card, issues, notes, loc


# ── encoding: Doc text -> the strings that go in data/policy-text.js ────────

def esc_text(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def esc_attr(s):
    return esc_text(s).replace('"', "&quot;")


def inline_html(runs):
    """Runs -> HTML. Links first, bold inside them, so the markup is <a><strong>..</strong></a>
    and a bold phrase that crosses a link boundary becomes two <strong>."""
    runs = merge_runs(runs)
    out, i = [], 0
    while i < len(runs):
        j = i
        while j < len(runs) and runs[j][2] == runs[i][2]:
            j += 1
        inner = "".join(("<strong>%s</strong>" if b else "%s") % esc_text(t) for t, b, _ in runs[i:j])
        if runs[i][2]:
            out.append('<a href="%s" target="_blank" rel="noopener noreferrer">%s</a>' % (esc_attr(runs[i][2]), inner))
        else:
            out.append(inner)
        i = j
    return "".join(out)


def blocks_html(blocks):
    """Paragraphs joined with <br><br>; a run of bullets as one <ul>. A list sits directly
    against its neighbours (it is a block, so it brings its own spacing)."""
    out, prev, i = [], None, 0
    while i < len(blocks):
        kind = blocks[i][0]
        if kind == "li":
            j = i
            while j < len(blocks) and blocks[j][0] == "li":
                j += 1
            out.append("<ul>%s</ul>" % "".join("<li>%s</li>" % inline_html(b[1].runs) for b in blocks[i:j]))
            prev, i = "li", j
        else:
            if prev == "p":
                out.append("<br><br>")
            out.append(inline_html(blocks[i][1].runs))
            prev, i = "p", i + 1
    return "".join(out)


def encode_card(card):
    """The fields of one card, as the strings the generated file holds."""
    f = collections.OrderedDict()
    f["title"] = card.title
    f["summary"] = blocks_html(card.blocks["policy"])
    f["rationale"] = blocks_html(card.blocks["why"])
    f["strengths"] = [inline_html(p.runs) for _, p in card.blocks["strengths"]]
    f["risks"] = [inline_html(p.runs) for _, p in card.blocks["risks"]]
    f["landscape"] = blocks_html(card.blocks["stands"])
    f["references"] = [inline_html(p.runs) for _, p in card.blocks["references"]]
    return f


# ── decoding (the verifier's half): strings -> text, bold, links, again ─────

class HtmlError(Exception):
    pass


_TOKEN = re.compile(
    r'<(?P<close>/?)(?P<name>strong|a|ul|li|br)(?P<attrs>(?:\s+[a-z]+="[^"<>]*")*)>'
    r'|&(?P<ent>amp|lt|gt|quot);'
    r'|(?P<bad>[<>&])'
    r'|(?P<text>[^<>&]+)')
_ENT = {"amp": "&", "lt": "<", "gt": ">", "quot": '"'}
_ATTR = re.compile(r'\s+([a-z]+)="([^"]*)"')


def _unent(s):
    return re.sub(r"&(amp|lt|gt|quot);", lambda m: _ENT[m.group(1)], s)


def _tokens(s):
    pos, out = 0, []
    while pos < len(s):
        m = _TOKEN.match(s, pos)
        if not m:
            raise HtmlError("cannot read the text at character %d" % pos)
        if m.group("bad"):
            raise HtmlError("a bare %r at character %d (it should be an entity)" % (m.group("bad"), pos))
        if m.group("name"):
            out.append(("tag", m.group("name"), bool(m.group("close")), m.group("attrs")))
        elif m.group("ent"):
            out.append(("text", _ENT[m.group("ent")]))
        else:
            out.append(("text", m.group("text")))
        pos = m.end()
    return out


def decode_html(s, allow_blocks=True):
    """Read a generated string back. STRICT: only the markup the encoder writes is accepted
    (text, <strong>, <a href target rel>, <br><br> between two paragraphs, <ul><li>), and
    only the four entities it writes. Returns [(kind, runs)] with kind 'p' or 'li'; runs
    are (text, bold, link) with neighbours merged."""
    toks = _tokens(s)
    blocks, cur, stack, pos = [], [], [], 0

    def add_text(t):
        bold = "strong" in [n for n, _ in stack]
        link = next((a for n, a in reversed(stack) if n == "a"), None)
        cur.append((t, bold, link))

    def flush_paragraph():
        if cur:
            blocks.append(("p", merge_runs([_R(*x) for x in cur])))
            del cur[:]

    in_ul = False
    while pos < len(toks):
        t = toks[pos]
        if t[0] == "text":
            if in_ul and not stack:
                raise HtmlError("text directly inside <ul>")
            add_text(t[1])
            pos += 1
            continue
        _, name, closing, attrs = t
        if name == "br":
            if (not allow_blocks) or stack or in_ul or closing or attrs:
                raise HtmlError("a <br> where the encoder never writes one")
            if pos + 1 >= len(toks) or toks[pos + 1][:3] != ("tag", "br", False) or not cur:
                raise HtmlError("a single <br> or a <br> after nothing (paragraphs are joined by <br><br>)")
            pos += 2
            if pos >= len(toks) or toks[pos][0] == "tag" and toks[pos][1] in ("br", "ul"):
                raise HtmlError("<br><br> must be followed by a paragraph")
            flush_paragraph()
            continue
        if name == "ul":
            if not allow_blocks or closing and not in_ul or (not closing and (in_ul or stack)):
                raise HtmlError("a <ul> where the encoder never writes one")
            if closing:
                if stack:
                    raise HtmlError("</ul> with an element still open")
                in_ul = False
            else:
                flush_paragraph()
                in_ul = True
                if pos + 1 >= len(toks) or toks[pos + 1][:3] != ("tag", "li", False):
                    raise HtmlError("an empty <ul>")
            pos += 1
            continue
        if name == "li":
            if not in_ul or (stack and not closing) or (closing and not stack_is(stack, "li")):
                raise HtmlError("an <li> outside a <ul>")
            if closing:
                if not cur:
                    raise HtmlError("an empty <li>")
                blocks.append(("li", merge_runs([_R(*x) for x in cur])))
                del cur[:]
                stack.pop()
            else:
                stack.append(("li", None))
            pos += 1
            continue
        if name == "strong":
            if attrs:
                raise HtmlError("<strong> with attributes")
            if closing:
                if not stack or stack[-1][0] != "strong":
                    raise HtmlError("</strong> that closes nothing")
                stack.pop()
            else:
                if any(n == "strong" for n, _ in stack) or (stack and stack[-1][0] not in ("li", "a")):
                    raise HtmlError("<strong> nested where the encoder never nests it")
                stack.append(("strong", None))
            pos += 1
            continue
        if name == "a":
            if closing:
                if not stack or stack[-1][0] != "a":
                    raise HtmlError("</a> that closes nothing")
                stack.pop()
            else:
                got = _ATTR.findall(attrs)
                if [k for k, _ in got] != ["href", "target", "rel"] or got[1][1] != "_blank" \
                        or got[2][1] != "noopener noreferrer":
                    raise HtmlError('a link that is not <a href=".." target="_blank" rel="noopener noreferrer">')
                if any(n in ("a", "strong") for n, _ in stack):
                    raise HtmlError("a link nested where the encoder never nests one")
                stack.append(("a", _unent(got[0][1])))
            pos += 1
            continue
    if stack or in_ul:
        raise HtmlError("an element is never closed")
    flush_paragraph()
    if not allow_blocks and len(blocks) > 1:
        raise HtmlError("more than one paragraph in a one-paragraph string")
    return blocks


def stack_is(stack, name):
    return bool(stack) and stack[-1][0] == name


class _R(object):
    """The tuple form of a run, for merge_runs() on decoded text."""
    def __init__(self, text, bold, link):
        self.text, self.bold, self.link = text, bold, link


# ── the generated file ──────────────────────────────────────────────────────

def js_string(s):
    """A JS string literal. Only what the JS-string rule allows: \\ and " are escaped, and
    characters that cannot be seen or that a file should not hold raw (controls, spaces
    other than the plain one, invisible format characters, line separators) are written
    as \\uXXXX so a reviewer can see them. Everything visible stays literal."""
    out = ['"']
    for ch in s:
        o = ord(ch)
        cat = unicodedata.category(ch)
        if ch == "\\":
            out.append("\\\\")
        elif ch == '"':
            out.append('\\"')
        elif o <= 0xFFFF and (cat in ("Cc", "Cf", "Co", "Cn", "Cs", "Zl", "Zp") or (cat == "Zs" and ch != " ")):
            out.append("\\u%04x" % o)
        else:
            out.append(ch)
    out.append('"')
    return "".join(out)


HEADER = """/* GENERATED by tools/policy_docs.py from the policy-card Google Docs. NEVER EDIT BY HAND.
   The text of a policy card is written in its Google Doc and carried here verbatim; the page lays
   it over the hand-kept POLICY_DATA in data/tracker-data.js, which keeps every other field of
   the card. Fields: title, summary, rationale, strengths[], risks[], landscape, references[], and
   docModified (when the Doc was last modified, UTC) with docUpdated (that day in @TZ@: the date a
   card shows as "Last updated"). Prose fields are HTML: <br><br> between paragraphs, <ul><li> for
   bullets, <strong>, and real links. See docs/policy-doc-sync.md. */
"""


def render_js(entries, order):
    """The file text for {card id: fields}, cards in `order` first, then any others sorted."""
    ids = [i for i in order if i in entries] + sorted(i for i in entries if i not in order)
    parts = []
    for cid in ids:
        f = entries[cid]
        lines = []
        for k in FIELD_ORDER:
            if k not in f:
                continue
            v = f[k]
            if isinstance(v, list):
                if v:
                    lines.append("    %s: [\n%s\n    ]" % (k, ",\n".join("      " + js_string(x) for x in v)))
                else:
                    lines.append("    %s: []" % k)
            else:
                lines.append("    %s: %s" % (k, js_string(v)))
        parts.append("  %s: {\n%s\n  }" % (js_string(cid), ",\n".join(lines)))
    return HEADER.replace("@TZ@", DISPLAY_TZ) + "const POLICY_TEXT = {%s};\n" % (("\n" + ",\n".join(parts) + "\n") if parts else "")


class JsError(Exception):
    pass


def parse_policy_text(text):
    """Read data/policy-text.js back, STRICTLY: only the shape render_js writes. Its own
    decoder (including surrogate pairs), so it is an independent check on js_string()."""
    s, i, n = text, 0, len(text)

    def ws():
        nonlocal i
        while i < n:
            if s[i] in " \t\r\n":
                i += 1
            elif s.startswith("/*", i):
                j = s.find("*/", i + 2)
                if j < 0:
                    raise JsError("an unterminated comment")
                i = j + 2
            elif s.startswith("//", i):
                j = s.find("\n", i)
                i = n if j < 0 else j + 1
            else:
                break

    def expect(tok):
        nonlocal i
        ws()
        if not s.startswith(tok, i):
            raise JsError("expected %r at character %d, found %r" % (tok, i, s[i:i + 20]))
        i += len(tok)

    def string():
        nonlocal i
        ws()
        if i >= n or s[i] != '"':
            raise JsError("expected a string at character %d" % i)
        i += 1
        buf = []
        while True:
            if i >= n:
                raise JsError("an unterminated string")
            c = s[i]
            if c == '"':
                i += 1
                break
            if c == "\n":
                raise JsError("a raw newline inside a string at character %d" % i)
            if c == "\\":
                e = s[i + 1:i + 2]
                if e == "u":
                    hx = s[i + 2:i + 6]
                    if not re.match(r"^[0-9a-fA-F]{4}$", hx):
                        raise JsError("a bad \\u escape at character %d" % i)
                    buf.append(chr(int(hx, 16)))
                    i += 6
                elif e in ('"', "\\", "/"):
                    buf.append(e)
                    i += 2
                elif e in ("n", "t", "r"):
                    buf.append({"n": "\n", "t": "\t", "r": "\r"}[e])
                    i += 2
                else:
                    raise JsError("an escape the generator never writes (\\%s) at character %d" % (e, i))
            else:
                buf.append(c)
                i += 1
        joined = "".join(buf)
        # a surrogate pair written as two escapes is one astral character
        return re.sub(u"[\ud800-\udbff][\udc00-\udfff]",
                      lambda m: chr(0x10000 + ((ord(m.group(0)[0]) - 0xD800) << 10) + (ord(m.group(0)[1]) - 0xDC00)),
                      joined)

    ws()
    expect("const")
    expect("POLICY_TEXT")
    expect("=")
    expect("{")
    out = collections.OrderedDict()
    ws()
    if s.startswith("}", i):
        i += 1
    else:
        while True:
            cid = string()
            expect(":")
            expect("{")
            fields = collections.OrderedDict()
            while True:
                ws()
                m = re.compile(r"[A-Za-z]+").match(s, i)
                if not m:
                    raise JsError("expected a field name at character %d" % i)
                key = m.group(0)
                i = m.end()
                expect(":")
                ws()
                if s.startswith("[", i):
                    i += 1
                    arr = []
                    ws()
                    if s.startswith("]", i):
                        i += 1
                    else:
                        while True:
                            arr.append(string())
                            ws()
                            if s.startswith(",", i):
                                i += 1
                                continue
                            expect("]")
                            break
                    fields[key] = arr
                else:
                    fields[key] = string()
                ws()
                if s.startswith(",", i):
                    i += 1
                    continue
                expect("}")
                break
            out[cid] = fields
            ws()
            if s.startswith(",", i):
                i += 1
                continue
            expect("}")
            break
    expect(";")
    ws()
    if i != n:
        raise JsError("something follows the object at character %d" % i)
    return out


def node_decode(text):
    """The generated file evaluated by real JavaScript (node), as JSON-decoded Python, or
    None when node is not installed. The strongest check on the escaping: a different
    engine reads our string literals."""
    node = None
    for d in os.environ.get("PATH", "").split(os.pathsep):
        c = os.path.join(d, "node")
        if os.path.isfile(c) and os.access(c, os.X_OK):
            node = c
            break
    if node is None:
        return None
    import json
    with tempfile.TemporaryDirectory() as tmp:
        p = os.path.join(tmp, "policy-text.js")
        with open(p, "w", encoding="utf-8") as fh:
            fh.write(text)
        prog = ("const fs=require('fs'),vm=require('vm');"
                "const c=vm.createContext({});"
                "process.stdout.write(vm.runInContext(fs.readFileSync(process.argv[1],'utf8')+'\\n;JSON.stringify(POLICY_TEXT)',c));")
        res = subprocess.run([node, "-e", prog, p], stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)
    if res.returncode != 0:
        raise JsError("node could not evaluate the file: " + res.stderr.decode("utf-8", "replace")[:300])
    return json.loads(res.stdout.decode("utf-8"), object_pairs_hook=collections.OrderedDict)


# ── the date: when the Doc was last modified ────────────────────────────────

_TIME = re.compile(r"^(\d{4})-(\d{2})-(\d{2})[Tt ](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|z|[+-]\d{2}:?\d{2})$")
_STAMP = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")


def parse_modified(text, now=None):
    """A Drive modifiedTime (RFC 3339: 2026-11-17T19:39:21.327Z, or with an offset) as the UTC instant
    `YYYY-MM-DDTHH:MM:SSZ` (fractions of a second dropped). Raises ValueError, saying why, for anything
    else, a time before 2010, or one more than a day ahead of `now` (a clock or a format mistake)."""
    m = _TIME.match((text or "").strip())
    if not m:
        raise ValueError("%r is not a time like 2026-11-17T19:39:21Z (Drive's modifiedTime)" % (text,))
    y, mo, d, h, mi, sec = (int(x) for x in m.groups()[:6])
    zone = m.group(7)
    try:
        local = datetime.datetime(y, mo, d, h, mi, sec)
        if zone in ("Z", "z"):
            off = datetime.timedelta(0)
        else:
            digits = zone[1:].replace(":", "")
            if int(digits[:2]) > 23 or int(digits[2:]) > 59:
                raise ValueError("the offset %s is not a real one" % zone)
            off = (1 if zone[0] == "+" else -1) * datetime.timedelta(hours=int(digits[:2]), minutes=int(digits[2:]))
    except ValueError as e:
        raise ValueError("%r is not a real time (%s)" % (text, e))
    utc = local - off
    now = now or datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    if utc < datetime.datetime(2010, 1, 1):
        raise ValueError("%r is before 2010, so it is not a Drive modified time" % (text,))
    if utc > now + datetime.timedelta(days=1):
        raise ValueError("%r is in the future" % (text,))
    return utc.strftime("%Y-%m-%dT%H:%M:%SZ")


def display_day(stamp):
    """The calendar day, in DISPLAY_TZ, of a UTC instant written as YYYY-MM-DDTHH:MM:SSZ."""
    try:
        from zoneinfo import ZoneInfo
        tz = ZoneInfo(DISPLAY_TZ)
    except Exception as e:                 # no zoneinfo (Python before 3.9) or no time-zone database
        raise ValueError("cannot read the time zone %s (%s): install the system tzdata" % (DISPLAY_TZ, e))
    utc = datetime.datetime.strptime(stamp, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc)
    return utc.astimezone(tz).date().isoformat()


# ── the round-trip verifier ─────────────────────────────────────────────────

def _first_diff(a, b):
    k = next((i for i in range(min(len(a), len(b))) if a[i] != b[i]), min(len(a), len(b)))
    return k, a[max(0, k - 15):k + 25], b[max(0, k - 15):k + 25]


def _blocks_of(card, key):
    return [(kind, merge_runs(p.runs)) for kind, p in card.blocks[key]]


def _runs_text(runs):
    return "".join(t for t, _, _ in runs)


def _same_runs(a, b):
    return [(t, bool(bo), l or None) for t, bo, l in a] == [(t, bool(bo), l or None) for t, bo, l in b]


def verify_card(card, fields, doc=None, data=None, card_id="card"):
    """Prove that the rebuilt text equals the Doc's text. Takes the card read from the Doc
    and the fields the encoder wrote, and checks, independently of the encoder: (1) the JS
    file text reads back (own strict decoder) to exactly the strings the encoder made;
    (2) each string decodes (strict) to the same paragraphs, bullets, bold, links and
    characters as the Doc, one by one; (3) every non-empty paragraph of the Doc is
    accounted for (title, headings, content), none dropped; (4) when the .docx is given, a
    second, simple read of its XML agrees with the structured reader paragraph by
    paragraph. Returns the list of differences ([] = verbatim)."""
    diffs = []
    js = render_js({card_id: fields}, [card_id])
    try:
        back = parse_policy_text(js)[card_id]
    except (JsError, KeyError) as e:
        return ["the generated file does not read back: %s" % e]
    for k in fields:
        if back.get(k) != fields[k]:
            diffs.append("%s: the JavaScript string does not read back as the encoder wrote it" % k)
    if not diffs:
        try:
            via_node = node_decode(js)
        except JsError as e:
            via_node = None
            diffs.append(str(e))
        if via_node is not None and dict(via_node.get(card_id) or {}) != dict(back):
            diffs.append("node reads the generated file differently from the strict decoder")
    if card.title != back.get("title"):
        diffs.append("title: %r became %r" % (card.title, back.get("title")))
    counted = 1 + len(card.labels)
    for key in PROSE + BULLETS + ITEMS:
        want = _blocks_of(card, key)
        counted += len(want)
        field = FIELD_OF[key]
        try:
            if key in PROSE:
                got = decode_html(back[field])
            else:
                got = []
                for item in back[field]:
                    for kind, runs in decode_html(item, allow_blocks=False):
                        got.append(("li", runs))
                want = [("li", r) for _, r in want]
        except HtmlError as e:
            diffs.append("%s: the generated markup is not what the encoder writes (%s)" % (field, e))
            continue
        if len(got) != len(want):
            diffs.append("%s: the Doc has %d paragraph(s)/bullet(s), the rebuilt text has %d" % (field, len(want), len(got)))
            continue
        for n, ((wk, wr), (gk, gr)) in enumerate(zip(want, got), 1):
            if wk != gk:
                diffs.append("%s, item %d: a %s in the Doc became a %s" % (field, n, wk, gk))
            elif _runs_text(wr) != _runs_text(gr):
                k, a, b = _first_diff(_runs_text(wr), _runs_text(gr))
                diffs.append("%s, item %d: the text differs at character %d (Doc %r, rebuilt %r)" % (field, n, k, a, b))
            elif not _same_runs(wr, gr):
                diffs.append("%s, item %d: the same words but the bold or the links differ" % (field, n))
    if "docModified" in fields or "docUpdated" in fields:
        stamp, day = fields.get("docModified"), fields.get("docUpdated")
        if not (isinstance(stamp, str) and _STAMP.match(stamp) and isinstance(day, str)
                and re.match(r"^\d{4}-\d{2}-\d{2}$", day)):
            diffs.append("the date fields are not YYYY-MM-DDTHH:MM:SSZ and YYYY-MM-DD: %r and %r" % (stamp, day))
        else:
            try:
                if display_day(stamp) != day:
                    diffs.append("docUpdated %s is not the %s day of docModified %s" % (day, DISPLAY_TZ, stamp))
            except ValueError as e:
                diffs.append(str(e))
    if doc is not None:
        nonempty = sum(1 for p in doc.paragraphs if not p.empty)
        if nonempty != counted:
            diffs.append("%d non-empty paragraphs in the Doc but %d accounted for (a paragraph was dropped or "
                         "counted twice)" % (nonempty, counted))
    if data is not None and doc is not None:
        try:
            raw = dr.raw_paragraph_texts(data)
        except dr.DocxError as e:
            raw = None
            diffs.append("the second read of the file failed: %s" % e)
        if raw is not None:
            read = [p.text for p in doc.paragraphs]
            if len(raw) != len(read):
                diffs.append("a second read of the file finds %d paragraphs, the reader %d" % (len(raw), len(read)))
            else:
                for n, (a, b) in enumerate(zip(raw, read), 1):
                    if a != b:
                        k, x, y = _first_diff(a, b)
                        diffs.append("paragraph %d: a second read of the file differs from the reader at "
                                     "character %d (%r vs %r)" % (n, k, x, y))
                        break
    return diffs


# ── the site: the cards, the papers, what the page shows now ────────────────

def norm_url(u):
    s = urlsplit((u or "").strip())
    return (s.netloc.lower().replace("www.", "", 1) + s.path.rstrip("/")).lower()


class Site(object):
    """What the page holds now: the cards from POLICY_DATA (with what an earlier sync wrote
    over them), and the papers a link can match."""

    def __init__(self, cards, order, sources, research_rows, prev_text, text_path=None):
        self.cards = cards                 # id -> POLICY_DATA entry
        self.order = order
        self.prev = prev_text              # id -> fields an earlier sync wrote
        self.text_path = text_path
        self.urls = collections.defaultdict(list)
        for kind, rows in sources:
            for r in rows:
                if r.get("url"):
                    self.urls[norm_url(r["url"])].append((kind, r["id"], r.get("title", ""), r.get("status", "")))
        self.research_rows = research_rows

    def effective(self, card_id):
        """The card as the page shows it: hand-kept fields, overlaid with the synced ones."""
        c = dict(self.cards.get(card_id) or {})
        c.update(self.prev.get(card_id, {}))
        return c


def load_site(data_path=None, text_path="default", research_csv=True):
    """text_path: "default" = the repo's data/policy-text.js; None = no earlier sync (a build
    into a place that holds none yet)."""
    data_path = data_path or DATA
    text_path = TEXT_FILE if text_path == "default" else text_path
    with open(data_path, encoding="utf-8") as fh:
        text = fh.read()
    _, _, cards = research.find_array_span(text, "POLICY_DATA")
    _, _, papers = research.find_array_span(text, "RESEARCH_DATA")
    try:
        _, _, sources = research.find_array_span(text, "POLICY_SOURCES")
    except ValueError:                 # the array is gone (it is only read to say which links are known)
        sources = []
    rows = [("research list", [{"id": str(p["id"]), "url": p.get("sourceUrl"), "title": p.get("title", "")} for p in papers]),
            ("POLICY_SOURCES", [{"id": str(p["id"]), "url": p.get("sourceUrl"), "title": p.get("title", "")} for p in sources])]
    other = []
    if research_csv and data_path == DATA:
        try:
            for e in research.load_local_entries():
                if e.get("status") != research.APPROVED and e.get("sourceUrl"):
                    other.append({"id": str(e["id"]), "url": e["sourceUrl"], "title": e.get("title", ""),
                                  "status": e.get("status", "")})
        except (OSError, ValueError, KeyError):
            pass
    rows.append(("research Sheet, not published", other))
    prev = {}
    if text_path and os.path.exists(text_path):
        with open(text_path, encoding="utf-8") as fh:
            try:
                prev = parse_policy_text(fh.read())
            except JsError as e:
                raise SystemExit("policy_docs: %s is not in the shape this tool writes (%s). Restore it from "
                                 "main; it is generated and never hand-edited." % (os.path.relpath(text_path, ROOT), e))
    return Site(collections.OrderedDict((c["id"], c) for c in cards), [c["id"] for c in cards], rows, None, prev, text_path)


# ── comparing with the card on the site ─────────────────────────────────────

def _plain_site(s):
    s = re.sub(r"\{\{[^}]*\}\}", "", s or "")
    s = re.sub(r"<[^>]+>", " ", s)
    s = html.unescape(s)
    return re.sub(r"\s+", " ", s).strip()


def _typo(s):
    return s.replace(u"\u2019", "'").replace(u"\u2018", "'").replace(u"\u201c", '"').replace(u"\u201d", '"')


def _ws(s):
    return re.sub(r"\s+", " ", s).strip()


def sim(a, b):
    return difflib.SequenceMatcher(None, a, b, autojunk=False).ratio()


def _doc_text(blocks):
    return _ws(" ".join(_runs_text(r) for _, r in blocks))


def _count(blocks):
    p = sum(1 for k, _ in blocks if k == "p")
    li = sum(1 for k, _ in blocks if k == "li")
    bits = []
    if p:
        bits.append("%d paragraph%s" % (p, "" if p == 1 else "s"))
    if li:
        bits.append("%d bullet%s" % (li, "" if li == 1 else "s"))
    return " + ".join(bits) or "nothing"


def _quote_note(new_plain, old_plain):
    def mix(t):
        return len(re.findall(u"[\u2018\u2019\u201c\u201d]", t)), len(re.findall("['\"]", t))
    (nc, ns), (oc, os_) = mix(new_plain), mix(old_plain)
    if (nc, ns) == (oc, os_):
        return ""
    return "; quote marks: the Doc has %d curly and %d straight, the site %d curly and %d straight" % (nc, ns, oc, os_)


def compare_card(card, fields, site_card):
    """Field by field, what the sync would change. Returns [(field, status, detail)]."""
    rows = []
    for key in PROSE:
        field = FIELD_OF[key]
        new_html = fields[field]
        blocks = _blocks_of(card, key)
        new_plain = _doc_text(blocks)
        old = (site_card or {}).get(field)
        words = len(new_plain.split())
        if old is None:
            rows.append((field, "NEW", "%s, %d words; the site has nothing here" % (_count(blocks), words)))
        elif old == new_html:
            rows.append((field, "unchanged", ""))
        else:
            old_plain = _ws(_plain_site(old.replace("<br><br>", " ")))
            old_words = len(old_plain.split())
            if new_plain == old_plain:
                rows.append((field, "same words", "only the markup differs"))
            elif _typo(new_plain) == _typo(old_plain):
                rows.append((field, "same words", "only straight and curly quotes differ" + _quote_note(new_plain, old_plain)))
            else:
                rows.append((field, "CHANGED", "%.0f%% the same text. Doc: %s, %d words; site: %d words%s" % (
                    sim(_typo(new_plain), _typo(old_plain)) * 100, _count(blocks), words, old_words,
                    _quote_note(new_plain, old_plain))))
    old_title = (site_card or {}).get("title")
    if old_title is None:
        rows.insert(0, ("title", "NEW", repr(card.title)))
    elif old_title == card.title:
        rows.insert(0, ("title", "unchanged", ""))
    elif _typo(old_title) == _typo(card.title):
        rows.insert(0, ("title", "same words", "only straight and curly quotes differ"))
    else:
        rows.insert(0, ("title", "CHANGED", "the site has %r, the Doc has %r (a wrong Doc for this card?)" % (old_title, card.title)))
    for key in BULLETS + ITEMS:
        field = FIELD_OF[key]
        new_items = [_ws(_runs_text(merge_runs(p.runs))) for _, p in card.blocks[key]]
        old_list = (site_card or {}).get(field)
        if old_list is None:
            rows.append((field, "NEW", "%d item%s; the site has none" % (len(new_items), "" if len(new_items) == 1 else "s")))
            continue
        if old_list == fields[field]:
            rows.append((field, "unchanged", ""))
            continue
        old_plain = [_ws(_plain_site(x)) for x in old_list]
        exact = sum(1 for n in new_items if n in old_plain)
        typo_only = sum(1 for n in new_items if n not in old_plain and _typo(n) in [_typo(o) for o in old_plain])
        left = [n for n in new_items if _typo(n) not in [_typo(o) for o in old_plain]]
        gone = [o for o in old_plain if _typo(o) not in [_typo(n) for n in new_items]]
        close = sum(1 for n in left if max([sim(_typo(n), _typo(o)) for o in gone] or [0]) >= 0.6)
        bits = ["Doc %d item%s, site %d" % (len(new_items), "" if len(new_items) == 1 else "s", len(old_plain))]
        if exact:
            bits.append("%d the same" % exact)
        if typo_only:
            bits.append("%d the same except quote marks" % typo_only)
        if close:
            bits.append("%d reworded" % close)
        if len(left) - close:
            bits.append("%d new" % (len(left) - close))
        if len(gone) - close:
            bits.append("%d on the site not in the Doc" % (len(gone) - close))
        status = "same words" if not left and not gone else "CHANGED"
        rows.append((field, status, "; ".join(bits)))
    if "docUpdated" in fields:
        was, reviewed = (site_card or {}).get("docUpdated"), (site_card or {}).get("lastReviewed")
        if was == fields["docUpdated"]:
            rows.append(("docUpdated", "unchanged", ""))
        elif was:
            rows.append(("docUpdated", "CHANGED", 'the card says "Last updated %s", it would say "Last updated %s"' % (was, fields["docUpdated"])))
        else:
            rows.append(("docUpdated", "NEW", 'the card would say "Last updated %s"%s' % (
                fields["docUpdated"], (' (it says "Last reviewed %s" now)' % reviewed) if reviewed else "")))
    order = ["title", "summary", "rationale", "strengths", "risks", "landscape", "references", "docUpdated"]
    rows.sort(key=lambda r: order.index(r[0]))
    return rows


def word_diff(old, new, limit=10):
    """A short word-level diff of two plain texts: [-gone-] {+added+}, with a little context."""
    a, b = old.split(), new.split()
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    out, shown = [], 0
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            continue
        shown += 1
        if shown > limit:
            out.append("... and more")
            break
        ctx = " ".join(a[max(0, i1 - 4):i1])
        parts = []
        if i2 > i1:
            parts.append("[-%s-]" % " ".join(a[i1:i2]))
        if j2 > j1:
            parts.append("{+%s+}" % " ".join(b[j1:j2]))
        out.append("...%s %s" % (ctx, " ".join(parts)))
    return out


def link_report(card, site):
    """Every distinct link in the synced text and where the site already knows it."""
    seen, out = collections.OrderedDict(), []
    for key in PROSE + BULLETS + ITEMS:
        for _, p in card.blocks[key]:
            for r in p.runs:
                if r.link and r.link not in seen:
                    seen[r.link] = None
    for url in seen:
        hits = site.urls.get(norm_url(url), [])
        out.append((url, hits))
    return out


def site_tokens(site_card):
    """Citation markers and cross-links in the site's current text that a sync would drop."""
    blob = " ".join([str(site_card.get(k, "")) for k in ("summary", "rationale", "landscape")]
                    + [x for k in ("strengths", "risks") for x in (site_card.get(k) or [])])
    return collections.Counter(re.findall(r"\{\{(cite|citep|pol):", blob))


# ── the gate: the Sheet tab ─────────────────────────────────────────────────

GATE_COLUMNS = {"card id": ("card id", "id", "policy card id"),
                "doc": ("doc link", "doc", "google doc", "doc url", "doc id"),
                "status": ("general status", "site status", "status", "doc status", "sync status")}
# `archived` is a policy the team has retired: recognised, skipped, never synced (the policy map tab has the word).
UNDER_REVIEW, APPROVED, ARCHIVED = "under review", "approved", "archived"


def _hdr(s):
    return re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()


def doc_id_of(ref):
    m = re.search(r"/document/d/([A-Za-z0-9_-]+)", ref or "")
    if m:
        return m.group(1)
    ref = (ref or "").strip()
    return ref if re.match(r"^[A-Za-z0-9_-]{20,}$", ref) else None


def read_gate(text, cards):
    """The tab as CSV -> ([(row number, card id, doc id, doc ref, status)], [problems]).
    The header row is found by its column names (the tab has a roles block above it). A row
    reaches the sync only when its status is `approved`; blank means under review, and `archived` is skipped."""
    rows = list(csv.reader(io.StringIO(text)))
    head, idx = None, {}
    for n, row in enumerate(rows):
        cols = [_hdr(c) for c in row]
        found, ambiguous = {}, []
        for field, names in GATE_COLUMNS.items():
            hit = [i for i, c in enumerate(cols) if c in names]
            if len(hit) > 1:
                ambiguous.append(field)
            if hit:
                found[field] = hit[0]
        if all(f in found for f in GATE_COLUMNS):
            if ambiguous:
                return [], ["row %d has more than one column that could be the %s" % (n + 1, " or ".join(ambiguous))]
            head, idx = n, found
            break
    if head is None:
        return [], ["the tab has no header row with the columns `card id`, `doc link` and `general status` "
                    "(accepted names: %s)" % "; ".join("%s: %s" % (k, ", ".join(v)) for k, v in GATE_COLUMNS.items())]
    out, problems, seen_cards, seen_docs = [], [], {}, {}
    for n in range(head + 1, len(rows)):
        row = rows[n] + [""] * 20
        cid, ref, st = row[idx["card id"]].strip(), row[idx["doc"]].strip(), row[idx["status"]]
        if not cid and not ref:
            continue
        where = "row %d" % (n + 1)
        status = _hdr(st) if _hdr(st) else UNDER_REVIEW
        if status not in (UNDER_REVIEW, APPROVED, ARCHIVED):
            problems.append("%s (%s): status %r is not one of: approved, under review, archived (leave it blank for under review)"
                            % (where, cid or "no card id", st.strip()))
            continue
        if not cid:
            problems.append("%s: has a Doc link but no card id" % where)
            continue
        if cid in seen_cards:
            problems.append("%s: the card id %r is already in row %d" % (where, cid, seen_cards[cid]))
            continue
        seen_cards[cid] = n + 1
        if status != APPROVED:
            out.append((n + 1, cid, doc_id_of(ref), ref, status))
            continue
        if cid not in cards:
            problems.append("%s: %r is not a card on the site. A new card needs its other fields in POLICY_DATA "
                            "first; this sync updates existing cards" % (where, cid))
            continue
        did = doc_id_of(ref)
        if not did:
            problems.append("%s (%s): approved, but the Doc link %r is not a Google Docs link" % (where, cid, ref))
            continue
        if did in seen_docs:
            problems.append("%s (%s): the same Doc as row %d (%s)" % (where, cid, seen_docs[did][0], seen_docs[did][1]))
            continue
        seen_docs[did] = (n + 1, cid)
        out.append((n + 1, cid, did, ref, status))
    return out, problems


def fetch_text(location):
    if re.match(r"^(https?|file)://", location):
        url = research.sheet_csv_url(location)
        with urllib.request.urlopen(url, timeout=30) as resp:
            text = resp.read().decode("utf-8")
        if text.lstrip()[:1] == "<":
            raise SystemExit("policy_docs: that address did not return the tab as CSV (File > Share > Publish to web, "
                             "pick the tab, Comma-separated values).")
        return text
    with open(location, encoding="utf-8", newline="") as fh:
        return fh.read()


# ── one Doc, end to end ─────────────────────────────────────────────────────

def analyze(card_id, data, site, label, modified=None):
    r = Result(card_id, label, data)
    r.modified_in = modified
    try:
        doc = dr.read_docx(data)
    except dr.DocxError as e:
        r.fatal = str(e)
        return r
    card, issues, notes, loc = parse_card(doc)
    r.issues = sorted(list(doc.problems) + issues, key=lambda p: (p.para is None, p.para or 0))
    r.title = card.title
    r.loc = loc
    r.notes = list(doc.notes) + notes
    r.stats = {"paragraphs": len(doc.paragraphs),
               "links": sum(1 for p in doc.paragraphs for run in p.runs if run.link),
               "bullets": sum(1 for p in doc.paragraphs if p.kind == "li"),
               "bold": sum(1 for blocks in card.blocks.values() for _, p in blocks
                           for run in p.runs if run.bold and run.text.strip())}
    if card_id not in site.cards:
        r.issues.append(dr.Problem("unknown-card", "%r is not a card on the site (this sync updates existing cards; "
                                   "a new card needs its other fields in POLICY_DATA first)" % card_id))
    stamp = day = None
    if modified:
        try:
            stamp = parse_modified(modified)
            day = display_day(stamp)
        except ValueError as e:
            r.issues.append(dr.Problem("modified", "the Doc's last-modified time: %s" % e))
    if r.issues:
        return r
    r.card = card
    r.fields = encode_card(card)
    if stamp:
        r.fields["docModified"], r.fields["docUpdated"] = stamp, day
        # the date describes the text on the page: time never runs backwards, and one time means one text
        was = site.prev.get(card_id) or {}
        if was.get("docModified"):
            if stamp < was["docModified"]:
                r.issues.append(dr.Problem("modified-older", "the Doc was modified %s, but the card on the site is from %s: "
                                           "this looks like an old export" % (stamp, was["docModified"])))
            elif stamp == was["docModified"] and any(was.get(k) != r.fields.get(k) for k in FIELD_ORDER[:7]):
                r.issues.append(dr.Problem("modified-same", "the Doc's modified time %s is the one already on the site, "
                                           "yet its text differs" % stamp))
        if r.issues:
            return r
    r.diffs = verify_card(card, r.fields, doc, data, card_id)
    r.compare = compare_card(card, r.fields, site.effective(card_id))
    r.links = link_report(card, site)
    for url, _ in r.links:
        host = urlsplit(url).netloc.lower()
        if host in ("docs.google.com", "drive.google.com") or host.endswith(".docs.google.com"):
            r.notes.append(("link-google", None, "a link into Google Docs or Drive (readers of the site may not be able to "
                            "open it): %s" % url[:90]))
        if re.search(r"[?&](utm_[a-z]+|fbclid|gclid|mc_eid|igshid)=", url):
            r.notes.append(("link-tracking", None, "a link with tracking parameters, kept as written: %s" % url[:90]))
    return r


# ── reports ─────────────────────────────────────────────────────────────────

def where(r, idx):
    if idx is None:
        return ""
    return r.loc.get(idx) or ("paragraph %d" % idx)


def render_issues(r, indent="  "):
    """Every problem, in document order; the fix once per kind; at most 5 of a kind shown."""
    shown, extra, lines = collections.Counter(), collections.Counter(), []
    for p in r.issues:
        shown[p.code] += 1
        if shown[p.code] > 5:
            extra[p.code] += 1
            continue
        w = where(r, p.para)
        lines.append("%s- %s%s" % (indent, (w + ": ") if w else "", p.text))
        if shown[p.code] == 1 and p.code in HINTS:
            lines.append("%s    fix: %s" % (indent, HINTS[p.code]))
    for code, n in extra.items():
        lines.append("%s- ... and %d more %s problem(s) of the same kind" % (indent, n, code))
    return lines


def render_notes(r, indent="  "):
    groups = collections.OrderedDict()
    for code, idx, text in r.notes:
        groups.setdefault((code, text if idx is None else None), []).append((idx, text))
    lines = []
    for (code, _), items in groups.items():
        for idx, text in items[:4]:
            w = where(r, idx)
            lines.append("%s- %s%s" % (indent, (w + ": ") if w else "", text))
        if len(items) > 4:
            lines.append("%s  ... and %d more of the same kind" % (indent, len(items) - 4))
    return lines


def report(r, site, show_diff=False, out=print):
    out("== %s  %s" % (r.card_id, r.title or ""))
    out("   file: %s  (%d bytes, sha256 %s)" % (r.label, r.size, r.sha))
    if r.fatal:
        out("   REFUSED: %s" % r.fatal)
        return
    st = r.stats
    out("   read: %d paragraphs; %d bullets; %d links; %d bold stretch(es) in the text" % (
        st["paragraphs"], st["bullets"], st["links"], st["bold"]))
    if r.issues:
        out("   REFUSED: %d problem(s); nothing from this Doc would be synced:" % len(r.issues))
        for line in render_issues(r, "     "):
            out(line)
        if r.notes:
            out("   notes:")
            for line in render_notes(r, "     "):
                out(line)
        return
    out("   sections found, in order: %s" % " / ".join(SHORT[k] for k, _ in r.card.labels))
    out("   the Doc follows the template; nothing was refused")
    if r.fields and r.fields.get("docModified"):
        out("   Doc last modified %s; the card would say 'Last updated %s' (that day in %s)"
            % (r.fields["docModified"], r.fields["docUpdated"], DISPLAY_TZ))
    else:
        out("   Doc last modified: not given (--modified <Drive modifiedTime>, or <card id>.json next to the export); "
            "build needs it, because the card shows it")
    out("   what the sync would change on the card (a field not listed stays as it is):")
    for field, status, detail in r.compare:
        out("     %-11s %-10s %s" % (field, status, detail))
    card = site.effective(r.card_id)
    kept = []
    for k, v in card.items():
        if k == "id" or k in FIELD_ORDER or v in (None, "", []):
            continue
        kept.append("%s (%d)" % (k, len(v)) if isinstance(v, list) else k)
    out("   stays as it is on the site, not in the Doc: %s" % (", ".join(kept) or "nothing"))
    tokens = site_tokens(card)
    if tokens:
        out("   citation markers on the site's card that the Doc's own links replace: %d (%s)" % (
            sum(tokens.values()), ", ".join("{{%s}} %d" % (k, v) for k, v in sorted(tokens.items()))))
        if tokens.get("pol"):
            out("   WARNING: %d {{pol:}} cross-link(s) to other cards would disappear" % tokens["pol"])
    if r.links:
        known = [(u, h) for u, h in r.links if h]
        unknown = [u for u, h in r.links if not h]
        out("   links: %d distinct; %d already in the site's papers, %d not" % (len(r.links), len(known), len(unknown)))
        for u, hits in known:
            h = hits[0]
            out("     %s -> %s %s%s" % (u[:70], h[0], h[1], (" (" + h[3] + ")") if h[3] else ""))
        for u in unknown:
            out("     NOT IN THE LIST: %s  (add it to the research Sheet if it should be a paper)" % u)
    if r.notes:
        out("   notes:")
        for line in render_notes(r, "     "):
            out(line)
    if show_diff:
        for field, status, _ in r.compare:
            if status != "CHANGED" or field in ("title", "strengths", "risks", "references"):
                continue
            new = _doc_text(_blocks_of(r.card, [k for k in PROSE if FIELD_OF[k] == field][0]))
            old = _ws(_plain_site(((site.effective(r.card_id).get(field)) or "").replace("<br><br>", " ")))
            out("   %s, word by word ([-site only-] {+Doc only+}):" % field)
            for line in word_diff(_typo(old), _typo(new)):
                out("     " + line)
    if r.diffs:
        out("   VERIFICATION FAILED: the rebuilt text does not equal the Doc's text:")
        for d in r.diffs:
            out("     - %s" % d)
    else:
        n = st["paragraphs"]
        out("   verified: the rebuilt text equals the Doc's text (%d paragraphs, %d links, 0 differences)" % (n, st["links"]))


# ── commands ────────────────────────────────────────────────────────────────

def collect(args, site):
    """The Docs to work on: [(card id, label, bytes)] and a list of problems (two Docs for one
    card is one). From explicit --doc/--card pairs, or from the gate and the exports folder."""
    docs, problems = _collect(args, site)
    ids = [d[0] for d in docs]
    dup = sorted(set(i for i in ids if ids.count(i) > 1))
    if dup:
        problems.append("more than one Doc for card %s" % ", ".join(dup))
    return docs, problems


def _read_modified(docx_path):
    """The Doc's last-modified time from <card id>.json next to <card id>.docx: the Drive file's
    metadata, or just {"modifiedTime": "..."}. Returns (time or None, problem or None)."""
    side = os.path.splitext(docx_path)[0] + ".json"
    if not os.path.isfile(side):
        return None, None
    try:
        with open(side, encoding="utf-8") as fh:
            obj = json.load(fh)
    except (OSError, ValueError) as e:
        return None, "cannot read %s: %s" % (side, e)
    t = obj.get("modifiedTime") if isinstance(obj, dict) else None
    if not isinstance(t, str):
        return None, ('%s has no modifiedTime (put the Drive file\'s metadata there, or just '
                      '{"modifiedTime": "2026-11-17T19:39:21Z"})' % side)
    return t, None


def _collect(args, site):
    """[(card id, label, bytes, modified time or None)] and a list of problems."""
    problems, docs = [], []

    def add(cid, path):
        try:
            with open(path, "rb") as fh:
                data = fh.read()
        except OSError as e:
            problems.append("cannot read %s: %s" % (path, e))
            return
        mod, why = _read_modified(path)
        if why:
            problems.append(why)
        else:
            docs.append((cid, path, data, mod))

    if args.doc or args.card:
        if len(args.doc) != len(args.card) or not args.doc:
            return [], ["give each --doc FILE a matching --card ID (the card it belongs to)"]
        mods = list(args.modified or [])
        if mods and len(mods) != len(args.doc):
            return [], ["give a --modified for every --doc, or none (each Doc's last-modified time, in the same order)"]
        for n, (path, cid) in enumerate(zip(args.doc, args.card)):
            if mods:
                try:
                    with open(path, "rb") as fh:
                        docs.append((cid, path, fh.read(), mods[n]))
                except OSError as e:
                    problems.append("cannot read %s: %s" % (path, e))
            else:
                add(cid, path)
        return docs, problems
    if args.gate:
        rows, problems = read_gate(fetch_text(args.gate), site.cards)
        if problems:
            return [], problems
        for r in [r for r in rows if r[4] != APPROVED]:
            print("   skipped (not approved): row %d %s" % (r[0], r[1]))
        for row, cid, did, ref, status in rows:
            if status != APPROVED:
                continue
            path = os.path.join(args.exports or ".", cid + ".docx")
            if not args.exports or not os.path.isfile(path):
                problems.append("row %d (%s) is approved but %s is missing: download the Doc as Word (.docx) into %s "
                                "(Doc link: %s)" % (row, cid, path, args.exports or "--exports <folder>", ref))
                continue
            add(cid, path)
        return docs, problems
    if args.exports:
        names = sorted(n for n in os.listdir(args.exports) if n.lower().endswith(".docx"))
        for n in names:
            cid = n[:-5]
            if cid not in site.cards:
                problems.append("%s: %r is not a card on the site (name each export <card id>.docx)" % (n, cid))
                continue
            add(cid, os.path.join(args.exports, n))
        if not names:
            problems.append("no .docx files in %s" % args.exports)
        return docs, problems
    return [], ["give --doc FILE --card ID, or --gate <csv or url> with --exports <folder>, or --exports <folder>"]


def run_all(args):
    site = load_site()
    docs, problems = collect(args, site)
    results = []
    if problems:
        print("policy_docs: cannot start:", file=sys.stderr)
        for p in problems:
            print("  - " + p, file=sys.stderr)
        return site, results, 1
    for cid, label, data, modified in docs:
        results.append(analyze(cid, data, site, label, modified))
    return site, results, 0


def cmd_check(args):
    site, results, bad = run_all(args)
    if bad:
        return 1
    for r in results:
        report(r, site, show_diff=args.diff)
        print()
    refused = [r for r in results if r.fatal or r.issues]
    failed = [r for r in results if not (r.fatal or r.issues) and r.diffs]
    changed = [r for r in results if r.ok and any(s != "unchanged" for _, s, _ in r.compare)]
    print("check: %d Doc(s): %d readable and verified, %d refused, %d failed verification; %d card(s) would change"
          % (len(results), sum(1 for r in results if r.ok), len(refused), len(failed), len(changed)))
    return 1 if refused or failed else 0


def cmd_verify(args):
    site, results, bad = run_all(args)
    if bad:
        return 1
    status = 0
    for r in results:
        if r.fatal or r.issues:
            print("%s: not verified, the Doc is refused (run check for the list)" % r.card_id)
            status = 1
        elif r.diffs:
            print("%s: NOT VERBATIM, %d difference(s):" % (r.card_id, len(r.diffs)))
            for d in r.diffs:
                print("  - " + d)
            status = 1
        else:
            print("%s: verbatim: all fields match (%d paragraphs, %d links)" % (r.card_id, r.stats["paragraphs"], r.stats["links"]))
    return status


def one_writer_guard(out_path, allow):
    """build is a second writer if it runs in the tree you commit from. Refuse there."""
    inside = os.path.abspath(out_path).startswith(ROOT + os.sep)
    git_tree = os.path.exists(os.path.join(ROOT, ".git"))
    in_actions = os.environ.get("GITHUB_ACTIONS") == "true"
    if inside and git_tree and not in_actions and not allow:
        return ("policy_docs: build writes %s, which has one writer (the sync). Run it in a scratch copy of the repo "
                "(for example: rsync -a --exclude .git ./ /tmp/policy-scratch/), or pass --out <path> outside the "
                "repo, or --allow-local-write if you really mean to write it here."
                % os.path.relpath(out_path, ROOT))
    return None


def do_build(site, docs, out_path, out=print, err=None, keep_going=False):
    """Analyze every Doc and, only if ALL of them are clean and verified, write the file:
    the cards already in it, updated by these Docs. Nothing is written otherwise (the site
    stays as it was). With keep_going, a refused Doc is left out (its card keeps the text it
    has) and the clean Docs are written; the exit code is still 1 then, so a run can end red.
    Returns the exit code."""
    err = err or (lambda s: print(s, file=sys.stderr))
    results = [analyze(cid, data, site, label, modified) for cid, label, data, modified in docs]
    refused = [r for r in results if not r.ok]
    if refused and not keep_going:
        err("build: refusing to write; %d Doc(s) cannot be synced (nothing was written, the site is as it was):" % len(refused))
        for r in refused:
            report(r, site, out=err)
        return 1
    if refused:
        err("build: %d Doc(s) cannot be synced and are left out; their cards keep the text they have (the clean Docs are written):" % len(refused))
        for r in refused:
            report(r, site, out=err)
        results = [r for r in results if r.ok]
        if not results:
            err("build: nothing to write: every Doc was refused")
            return 1
    rc = 1 if refused else 0
    missing = [r.card_id for r in results if "docUpdated" not in r.fields]
    if missing:
        err("build: refusing to write: no last-modified time for %s. The card shows it as 'Last updated', and a .docx export "
            "does not carry it: pass --modified <Drive modifiedTime> for each --doc, or put <card id>.json (the Drive file's "
            "metadata) next to each export." % ", ".join(missing))
        return 1
    entries = collections.OrderedDict(site.prev)
    for k in list(entries):                 # a change of DISPLAY_TZ moves a day, never the instant it came from
        if entries[k].get("docModified"):
            entries[k] = collections.OrderedDict(entries[k])
            entries[k]["docUpdated"] = display_day(entries[k]["docModified"])
    for r in results:
        entries[r.card_id] = r.fields
    text = render_js(entries, site.order)
    # the whole file must read back, in our own decoder, as exactly the entries it was made from
    again = parse_policy_text(text)
    if set(again) != set(entries) or any(dict(again[k]) != dict(entries[k]) for k in again):
        err("build: refusing to write: the file does not read back as the entries it was made from")
        return 1
    old = None
    if os.path.exists(out_path):
        with open(out_path, encoding="utf-8") as fh:
            old = fh.read()
    for r in results:
        report(r, site, out=out)
        out("")
    shown = os.path.relpath(out_path, ROOT) if out_path.startswith(ROOT + os.sep) else out_path
    if old == text:
        out("build: no change; %s is already up to date (%d card(s))" % (shown, len(entries)))
        return rc
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)
    first = [r.card_id for r in results if r.card_id not in site.prev]
    updated = [r.card_id for r in results if r.card_id in site.prev]
    kept = [i for i in entries if i not in first and i not in updated]
    out("build: wrote %s (%d card(s)%s%s%s)" % (
        shown, len(entries),
        ("; first sync of: " + ", ".join(first)) if first else "",
        ("; updated: " + ", ".join(updated)) if updated else "",
        ("; kept from before: " + ", ".join(kept)) if kept else ""))
    return rc


def cmd_build(args):
    out_path = os.path.abspath(args.out or TEXT_FILE)
    msg = one_writer_guard(out_path, args.allow_local_write)
    if msg:
        print(msg, file=sys.stderr)
        return 2
    if not args.gate and not (args.doc and args.card):
        print("policy_docs: build needs the gate (--gate <csv or url> --exports <folder>) or an explicit "
              "--doc FILE --card ID pair", file=sys.stderr)
        return 2
    site = load_site(text_path=out_path if os.path.exists(out_path) else None)
    docs, problems = collect(args, site)
    if problems:
        print("build: refusing to write, cannot start:", file=sys.stderr)
        for p in problems:
            print("  - " + p, file=sys.stderr)
        return 1
    return do_build(site, docs, out_path, keep_going=args.keep_going)


# ── self-test and test fixtures ─────────────────────────────────────────────
# Every refusal has a fixture; every transformation has a nasty one. The fixtures are real
# .docx files built in memory by docx_reader.DocxBuilder, so the whole path runs: reader,
# sections, encoder, strict decoders, verifier, build.

_SAMPLE = dict(title="Test Card", policy=["Policy text."], why=["Why text."], esp=[],
               strengths=[("li", "A strength.")], risks=[("li", "A risk.")], precedents=[],
               stands=["Where it stands text."], references=[("li", "A reference.")],
               lead=0, trail=0, tail=[])
_HEAD_STYLE = {"policy": "Heading2", "why": "Heading2", "esp": "Heading2", "strengths": "Heading3",
               "risks": "Heading3", "precedents": "Heading2", "stands": "Heading3", "references": "Heading3"}


def _put(b, items):
    for it in items:
        if isinstance(it, (str, list)):
            b.p(it)
        elif it[0] == "li":
            b.li(it[1], *it[2:])
        elif it[0] == "raw":
            b.raw(it[1])
        else:
            raise ValueError(it)


def sample_card(heads=None, order=None, **kw):
    """A DocxBuilder holding a clean card Doc, with any part replaced (policy=[...], why=,
    strengths=, risks=, stands=, references=, esp=, precedents=, title=, tail=, lead=, trail=).
    Items: a string (paragraph), a list (a paragraph of runs), ("li", content[, kind, level]),
    ("raw", xml). `heads` maps a section key to False (leave the heading out) or
    (text, style[, run props]); `order` reorders the sections. Used by the self-test and tests."""
    spec = dict(_SAMPLE)
    spec.update(kw)
    heads = heads or {}
    b = dr.DocxBuilder()
    for _ in range(spec["lead"]):
        b.p("")
    if spec["title"] is not None:
        b.p(spec["title"], style="Heading1")
    for key in (order or ORDER):
        h = heads.get(key, True)
        if h is not False:
            if h is True:
                b.p(LABEL_TEXT[key], style=_HEAD_STYLE[key])
            else:
                b.p([(h[0], h[2])] if len(h) > 2 else h[0], style=h[1])
        _put(b, spec[key])
    _put(b, spec["tail"])
    for _ in range(spec["trail"]):
        b.p("")
    return b


def test_site(card=None):
    """A one-card Site for tests (no repo files read)."""
    c = card or {"id": "test-card", "title": "Test Card", "summary": "Policy text.", "rationale": "Why text.",
                 "strengths": ["A strength."], "risks": ["A risk."], "landscape": "Where it stands text.",
                 "feasibility": "kept", "category": "x", "pairsWith": [],
                 "competesWith": [{"id": "other", "why": "kept"}]}
    return Site(collections.OrderedDict([("test-card", c)]), ["test-card"],
                [("research list", [{"id": "7", "url": "https://example.org/known", "title": "Known"}])], None, {})


_TABLE = '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>cell</w:t></w:r></w:p></w:tc></w:tr></w:tbl>'
NASTY = (u'He said "stop" \u2014 it\u2019s 50% off & more; 1 < 2 > 0; C:\\temp\\new; \\n two chars; '
         u'&amp; &lt;b&gt; typed; {one brace}; caf\u00e9 \u2603 \U0001F642; $5; a\u00a0b; z\u200bw')
NASTY_HTML = (u'He said "stop" \u2014 it\u2019s 50% off &amp; more; 1 &lt; 2 &gt; 0; C:\\temp\\new; \\n two chars; '
              u'&amp;amp; &amp;lt;b&amp;gt; typed; {one brace}; caf\u00e9 \u2603 \U0001F642; $5; a\u00a0b; z\u200bw')


def _slurp(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def _run_selftest():
    """Returns (number of checks, list of what went wrong). Writes nothing outside a
    temporary folder."""
    problems, done = [], [0]

    def expect(ok, what):
        done[0] += 1
        if not ok:
            problems.append(what)

    site = test_site()

    def run(b, cid="test-card"):
        data = b if isinstance(b, bytes) else b.build()
        return analyze(cid, data, site, "fixture")

    def codes(r):
        return sorted(set(p.code for p in r.issues)) + (["fatal"] if r.fatal else [])

    # ── a clean card, and the encoding of every character that needs care
    r = run(sample_card())
    expect(r.ok and not r.issues and not r.diffs, "a clean card was refused or failed verification: %s" % codes(r))
    expect(r.ok and r.fields == collections.OrderedDict([
        ("title", "Test Card"), ("summary", "Policy text."), ("rationale", "Why text."),
        ("strengths", ["A strength."]), ("risks", ["A risk."]), ("landscape", "Where it stands text."),
        ("references", ["A reference."])]), "a clean card's fields are not exactly its text")

    r = run(sample_card(policy=[NASTY], strengths=[("li", NASTY)], title=u"Women\u2019s Work & Pay"))
    expect(r.ok, "nasty text was refused: %s %s" % (codes(r), [p.text for p in r.issues]))
    expect(r.ok and r.fields["summary"] == NASTY_HTML,
           "quotes, dashes, & < >, backslashes, an escaped-looking entity, one brace, accents, an emoji, "
           "a non-breaking space or a zero-width space did not encode exactly")
    expect(r.ok and r.fields["strengths"] == [NASTY_HTML], "a bullet with nasty text did not encode exactly")
    expect(r.ok and r.fields["title"] == u"Women\u2019s Work & Pay", "a title is stored as typed (no HTML escaping)")
    expect(r.ok and [n[0] for n in r.notes].count("nbsp") == 2 and "invisible-char" in [n[0] for n in r.notes],
           "a non-breaking space must be reported (and an invisible character noted)")
    if r.ok:
        js = render_js({"test-card": r.fields}, ["test-card"])
        expect("C:\\\\temp\\\\new" in js and "\\\\n two" in js, "backslashes must be doubled in the JS string")
        expect("\\u00a0" in js and "\\u200b" in js and u"\u00a0" not in js and u"\u200b" not in js,
               "non-breaking and zero-width spaces must be written as \\u escapes, not raw")
        expect("\\&" not in js and '\\"stop\\"' in js, 'a double quote must be escaped as \\" in the JS string')
        expect(parse_policy_text(js)["test-card"]["summary"] == NASTY_HTML, "the generated file must read back exactly")

    link = [u"Plain ", (u"bold", {"b": True}), u" then ", ("link", u"a link", "https://example.org/a?x=1&y=2"),
            u" and ", ("link", u"bold link", "https://example.org/b", {"b": True}), u"."]
    r = run(sample_card(policy=[link]))
    expect(r.ok and r.fields["summary"] ==
           'Plain <strong>bold</strong> then <a href="https://example.org/a?x=1&amp;y=2" target="_blank" '
           'rel="noopener noreferrer">a link</a> and <a href="https://example.org/b" target="_blank" '
           'rel="noopener noreferrer"><strong>bold link</strong></a>.', "bold and links must become <strong> and real links")

    r = run(sample_card(policy=["Intro:", ("li", "one"), ("li", "two"), "After one.", "After two."]))
    expect(r.ok and r.fields["summary"] == "Intro:<ul><li>one</li><li>two</li></ul>After one.<br><br>After two.",
           "paragraphs join with <br><br> and bullets make one <ul> that sits against its neighbours: %s" % (r.fields or {}).get("summary"))
    r = run(sample_card(policy=[("li", "x"), ("li", "y")], why=["A", "B", "C"]))
    expect(r.ok and r.fields["summary"] == "<ul><li>x</li><li>y</li></ul>" and r.fields["rationale"] == "A<br><br>B<br><br>C",
           "a list can open a section; three paragraphs are joined by two <br><br>")
    r = run(sample_card(policy=[[("Split ", {"b": True}), ("bold", {"b": True}), (" run", {"b": True}), u" and plain"]]))
    expect(r.ok and r.fields["summary"] == "<strong>Split bold run</strong> and plain",
           "adjacent runs that look the same must become one <strong>")

    # headings: found by text, styled any way, formatting on them ignored
    r = run(sample_card(heads={"policy": (u"Policy", None, {"b": True, "i": True, "color": "FF0000"}),
                               "why": (u"## Why This is Important in an AI-Driven Economy", "Heading1"),
                               "esp": (u"ESP's Take", "Heading2"),
                               "stands": (u"##Where it stands", None),
                               "references": (u"References ", "Heading3", {"u": True})}))
    expect(r.ok, "headings styled bold, plain, typed with ## or with a straight apostrophe, or italic or red, "
                 "must still be found by their text: %s %s" % (codes(r), [p.text for p in r.issues]))
    r = run(sample_card(lead=2, trail=3))
    expect(r.ok and any(n[0] == "edge-empty" for n in r.notes), "empty paragraphs before the title and after the end are ignored and noted")
    # a blank line between paragraphs is the paragraph break it already is (owner, 2026-11-18): the card reads as if it were not there, and a note says so
    r = run(sample_card(policy=["one", "", "two", "", "", "three"], stands=["a", "", ("li", "b"), "", ("li", "c")], strengths=[("li", "x"), "", ("li", "y")]))
    expect(r.ok and any(n[0] == "blank-between" for n in r.notes) and r.fields["summary"] == "one<br><br>two<br><br>three"
           and r.fields["strengths"] == ["x", "y"] and r.fields["landscape"] == "a<ul><li>b</li><li>c</li></ul>",
           "blank lines between paragraphs (and between bullets) are the breaks they are: nothing is added for them, and a note says so: %s %s" % (codes(r), r.fields))
    r2 = run(sample_card(policy=["one", "two", "three"], stands=["a", ("li", "b"), ("li", "c")], strengths=[("li", "x"), ("li", "y")]))
    expect(r2.ok and r2.fields["summary"] == r.fields["summary"] and r2.fields["landscape"] == r.fields["landscape"],
           "a Doc with blank lines between its paragraphs gives exactly the text of the same Doc without them")
    r = run(sample_card(policy=[[(u"Body", {"font": "Arial", "sz": 22, "color": "000000"})]]))
    expect(r.ok, "explicit formatting equal to the document's own defaults must not be refused: %s" % codes(r))
    r = run(sample_card(references=["A paragraph reference", "https://example.org/known"]))
    expect(r.ok and len(r.fields["references"]) == 2, "References may be paragraphs as well as bullets")
    r = run(sample_card(references=[]))
    expect(r.ok and r.fields["references"] == [], "References may be empty")
    r = run(sample_card(stands=["Intro", ("li", "a state law"), ("li", "another")]))
    expect(r.ok and r.fields["landscape"] == "Intro<ul><li>a state law</li><li>another</li></ul>", "bullets are allowed in Where it stands")
    r = run(sample_card(policy=[[("link", u"known", "https://example.org/known"), u" and ", ("link", u"new", "https://example.org/new")]]))
    expect(r.ok and [(u, bool(h)) for u, h in r.links] == [("https://example.org/known", True), ("https://example.org/new", False)],
           "links are reported as known or not in the site's papers")
    r = run(sample_card(policy=[[(u"Short bold line", {"b": True})], u"Then text"]))
    expect(r.ok and any(n[0] == "bold-line" for n in r.notes) and r.fields["summary"].startswith("<strong>Short bold line</strong><br><br>"),
           "a short all-bold paragraph is kept as a bold paragraph and noted, not taken for a heading")
    r = run(sample_card(policy=[[("link", u"a Doc", "https://docs.google.com/document/d/abc/edit"), u" and ",
                                 ("link", u"a page", "https://example.org/p?utm_source=x&id=2")]]))
    expect(r.ok and set(["link-google", "link-tracking"]) <= set(n[0] for n in r.notes),
           "a link into Google Docs, and a link with tracking parameters, are noted (not refused): %s" % [n[0] for n in r.notes])
    r = run(sample_card(policy=[u"See https://example.org/typed for more"]))
    expect(r.ok and any(n[0] == "bare-url" for n in r.notes) and "<a " not in r.fields["summary"],
           "a typed web address stays text (nothing is added) and is noted")

    # ── refusals: each one, by name
    refusals = [
        ("table", sample_card(policy=["x", ("raw", _TABLE)]), ["table"]),
        ("image", sample_card(policy=[[("raw", '<w:r><w:drawing><wp:inline><a:graphic/></wp:inline></w:drawing></w:r>')]]), ["image"]),
        ("footnote", sample_card(policy=[[("raw", '<w:r><w:footnoteReference w:id="2"/></w:r>')]]), ["footnote"]),
        ("equation", sample_card(policy=[[("raw", '<m:oMath><m:r><m:t>x</m:t></m:r></m:oMath>')]]), ["equation"]),
        ("page break", sample_card(policy=[[("raw", '<w:r><w:br w:type="page"/></w:r>')]]), ["page-break"]),
        ("section break", sample_card(tail=[("raw", '<w:p><w:pPr><w:sectPr/></w:pPr></w:p>')]), ["page-break"]),
        ("suggested insertion", sample_card(policy=[[u"kept ", ("raw", '<w:ins w:id="1" w:author="a"><w:r><w:t>added</w:t></w:r></w:ins>')]]), ["suggestion"]),
        ("suggested deletion", sample_card(policy=[[("raw", '<w:del w:id="2" w:author="a"><w:r><w:delText>gone</w:delText></w:r></w:del>')]]), ["suggestion"]),
        ("suggested format change", sample_card(policy=[[("raw", '<w:r><w:rPr><w:b/><w:rPrChange w:id="3" w:author="a"><w:rPr/></w:rPrChange></w:rPr><w:t>x</w:t></w:r>')]]), ["suggestion"]),
        ("content control", sample_card(policy=[[("raw", '<w:sdt><w:sdtContent><w:r><w:t>chip</w:t></w:r></w:sdtContent></w:sdt>')]]), ["smart-chip"]),
        ("field", sample_card(policy=[[("raw", '<w:fldSimple w:instr="PAGE"><w:r><w:t>1</w:t></w:r></w:fldSimple>')]]), ["smart-chip"]),
        ("soft line break", sample_card(policy=[[("raw", '<w:r><w:t>a</w:t><w:br/><w:t>b</w:t></w:r>')]]), ["soft-break"]),
        ("line separator", sample_card(policy=[u"a\u2028b"]), ["soft-break"]),
        ("tab", sample_card(policy=[[("raw", '<w:r><w:tab/><w:t>x</w:t></w:r>')]]), ["tab"]),
        ("tab character", sample_card(policy=[u"a\tb"]), ["control-char"]),
        ("empty bullet inside a list", sample_card(strengths=[("li", "a"), ("li", ""), ("li", "b")]), ["empty-bullet"]),
        ("numbered list", sample_card(policy=[("li", "one", "number")]), ["numbered-list"]),
        ("nested list", sample_card(strengths=[("li", "one"), ("li", "sub", "bullet", 1)]), ["nested-list"]),
        ("checkbox list", sample_card(strengths=[("li", "one", "checkbox")]), ["list-unknown"]),
        ("italic", sample_card(policy=[[(u"slanted", {"i": True})]]), ["italic"]),
        ("underline", sample_card(policy=[[(u"underlined", {"u": True})]]), ["underline"]),
        ("strike-through", sample_card(policy=[[(u"struck", {"strike": True})]]), ["strike"]),
        ("colour", sample_card(policy=[[(u"red", {"color": "FF0000"})]]), ["color"]),
        ("font", sample_card(policy=[[(u"mono", {"font": "Courier New"})]]), ["font"]),
        ("size", sample_card(policy=[[(u"big", {"sz": 28})]]), ["size"]),
        ("highlight", sample_card(policy=[[(u"marked", {"highlight": "yellow"})]]), ["highlight"]),
        ("superscript", sample_card(policy=[[(u"2", {"vert": "superscript"})]]), ["script"]),
        ("hidden text", sample_card(policy=[[(u"secret", {"vanish": True})]]), ["hidden"]),
        ("small caps", sample_card(policy=[[(u"caps", {"caps": True})]]), ["format"]),
        ("unknown run formatting", sample_card(policy=[[(u"x", {"rpr": "<w:emboss/><w:fitText w:val=\"10\"/>"})]]), ["format"]),
        ("character style", sample_card(policy=[[(u"emph", {"rstyle": "Emphasis"})]]), ["char-style"]),
        ("paragraph style", sample_card(policy=[("raw", '<w:p><w:pPr><w:pStyle w:val="Quote"/></w:pPr><w:r><w:t>quoted</w:t></w:r></w:p>')]), ["para-style"]),
        ("mailto link", sample_card(policy=[[("link", u"mail me", "mailto:a@example.org")]]), ["link-scheme"]),
        ("javascript link", sample_card(policy=[[("link", u"click", "javascript:alert(1)")]]), ["link-scheme"]),
        ("data link", sample_card(policy=[[("link", u"click", "data:text/html,x")]]), ["link-scheme"]),
        ("link with a space", sample_card(policy=[[("link", u"x", "https://example.org/a b")]]), ["link-scheme"]),
        ("link inside the Doc", sample_card(policy=[[("anchor", u"see below", "h.abc123")]]), ["link-internal"]),
        ("empty link", sample_card(policy=[[("link", u"", "https://example.org/x")]]), ["link-empty"]),
        ("link in the title", sample_card(title=[("link", u"Titled", "https://example.org/x")]), ["title-link"]),
        ("placeholder in text", sample_card(policy=[u"[Replace this: what the policy is]"]), ["placeholder"]),
        ("placeholder in a bullet", sample_card(strengths=[("li", u"[replace this: a strength]")]), ["placeholder"]),
        ("placeholder in references", sample_card(references=[("li", u"[Replace this: sources]")]), ["placeholder"]),
        ("control character", sample_card(policy=[u"a\x90b"]), ["control-char"]),
        ("bidi control", sample_card(policy=[u"a\u202eb"]), ["bidi-char"]),
        ("token braces", sample_card(policy=[u"as shown in {{cite:12}}"]), ["braces"]),
        ("closing braces", sample_card(why=[u"x }} y"]), ["braces"]),
        ("space not preserved", sample_card(policy=[[("raw", '<w:r><w:t> lead</w:t></w:r>')]]), ["xml-space"]),
        ("unknown element", sample_card(policy=[[("raw", '<w:smartTag w:element="x"><w:r><w:t>t</w:t></w:r></w:smartTag>')]]), ["unsupported"]),
        ("unknown heading", sample_card(policy=["x", ("raw", '<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Background</w:t></w:r></w:p>')]), ["unknown-heading"]),
        ("unknown typed heading", sample_card(policy=["x", u"## Extras"]), ["unknown-heading"]),
        ("heading with a trailing colon", sample_card(heads={"risks": (u"Risks:", "Heading3")}), ["unknown-heading", "missing-heading"]),
        ("duplicate heading", sample_card(tail=[("raw", '<w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:t>Risks</w:t></w:r></w:p>')]), ["duplicate-heading"]),
        ("missing heading", sample_card(heads={"references": False, "stands": False}), ["missing-heading"]),
        ("headings out of order", sample_card(order=["policy", "why", "esp", "risks", "strengths", "precedents", "stands", "references"]), ["heading-order"]),
        ("text under a group heading", sample_card(esp=["stray text"]), ["text-outside-section"]),
        ("paragraph under Strengths", sample_card(strengths=["not a bullet", ("li", "a bullet")]), ["not-a-bullet"]),
        ("a heading typed as a bullet", sample_card(policy=[("li", u"Risks")]), ["label-is-bullet"]),
        ("empty section", sample_card(policy=[]), ["empty-section"]),
        ("no title", sample_card(title=None), ["no-title"]),
        ("angle bracket in the title", sample_card(title=u"A <b>title</b>"), ["title-chars"]),
        ("entity in the title", sample_card(title=u"Tom &amp; Jerry"), ["title-chars"]),
    ]
    for name, b, want in refusals:
        got = codes(run(b))
        expect(set(want) <= set(got), "refusal %r: expected %s, got %s" % (name, want, got))
    r = run(sample_card(policy=[u"x"]), "no-such-card")
    expect("unknown-card" in codes(r), "a card id that is not on the site must be refused")
    # text between the title and the first heading
    b = dr.DocxBuilder()
    b.p("A Title", style="Heading1")
    b.p("loose text")
    b.p("Policy", style="Heading2")
    expect("text-outside-section" in codes(run(b)), "text between the title and the first heading must be refused")
    # a refusal says where
    r = run(sample_card(risks=[("li", u"fine"), ("li", [(u"States wield broad authority", {"i": True})])]))
    lines = render_issues(r)
    expect(any("Risks, bullet 2" in l and "States wield" in l and "italic" in l for l in lines)
           and any("fix:" in l for l in lines), "a refusal must say which section, which item and how to fix it: %s" % lines)
    # every problem is listed, not just the first
    r = run(sample_card(policy=[[(u"a", {"i": True})], [(u"b", {"u": True})]], risks=[("li", u"[Replace this: x]")]))
    expect(set(["italic", "underline", "placeholder"]) <= set(codes(r)), "all problems must be listed together: %s" % codes(r))

    # ── the file itself
    for name, data in (("not a zip", b"hello, not a docx"), ("empty", b""), ("truncated", sample_card().build()[:200])):
        expect(codes(run(data)) == ["fatal"], "%s must be refused as unreadable: %s" % (name, codes(run(data))))
    big = dr.DocxBuilder().p("x").build(extra_parts={"word/media/big.bin": b"\0" * (9 * 1024 * 1024)})
    expect("fatal" not in codes(run(big)), "a big part we never read is not a reason to refuse the file")
    bomb = sample_card().build(document_xml=('<?xml version="1.0"?><w:document xmlns:w="%s"><w:body><w:p><w:r><w:t>%s</w:t></w:r></w:p></w:body></w:document>' % (dr.W_NS, "A" * (9 * 1024 * 1024))))
    expect(codes(run(bomb)) == ["fatal"], "a document part that unpacks to 9 MB must be refused, not read")
    dtd = sample_card().build(document_xml='<?xml version="1.0"?><!DOCTYPE w [<!ENTITY a "aaaa">]><w:document xmlns:w="%s"><w:body/></w:document>' % dr.W_NS)
    expect(codes(run(dtd)) == ["fatal"], "XML that declares a DTD or an entity must be refused")
    u16 = sample_card().build(document_xml=('<?xml version="1.0"?><w:document xmlns:w="%s"><w:body/></w:document>' % dr.W_NS).encode("utf-16"))
    expect(codes(run(u16)) == ["fatal"], "XML that is not UTF-8 must be refused")
    nodoc = dr.DocxBuilder().build(document_xml="<x/>")
    expect(codes(run(nodoc)) == ["fatal"], "a package whose document.xml is not a Word document must be refused")

    # ── the verifier catches deliberate breakage
    good = run(sample_card(policy=[link, ("li", u"one & two"), ("li", [(u"bold", {"b": True}), u" rest"])], strengths=[("li", u"s1"), ("li", u"s2")]))
    expect(good.ok, "the verifier's own fixture must be clean")
    if good.ok:
        def broken(mutate):
            f = collections.OrderedDict((k, list(v) if isinstance(v, list) else v) for k, v in good.fields.items())
            mutate(f)
            return verify_card(good.card, f, None, None, "test-card")
        mutations = [
            ("a dropped character", lambda f: f.__setitem__("summary", f["summary"].replace("Plain", "Plan", 1))),
            ("an unescaped ampersand", lambda f: f.__setitem__("summary", f["summary"].replace("one &amp; two", "one & two"))),
            ("a lost <strong>", lambda f: f.__setitem__("summary", f["summary"].replace("<strong>bold</strong>", "bold", 1))),
            ("a changed link", lambda f: f.__setitem__("summary", f["summary"].replace("x=1", "x=2"))),
            ("a link with the wrong attributes", lambda f: f.__setitem__("summary", f["summary"].replace(' rel="noopener noreferrer"', "", 1))),
            ("a lost list", lambda f: f.__setitem__("summary", f["summary"].replace("<ul>", "").replace("</ul>", ""))),
            ("a lost list item", lambda f: f.__setitem__("summary", f["summary"].replace("<li>one &amp; two</li>", ""))),
            ("two paragraphs run together", lambda f: f.__setitem__("summary", f["summary"].replace("<ul>", "<br><ul>", 1))),
            ("a swapped pair", lambda f: f["strengths"].reverse()),
            ("a lost item", lambda f: f["strengths"].pop()),
            ("a changed title", lambda f: f.__setitem__("title", "Other")),
            ("a double escape", lambda f: f.__setitem__("summary", f["summary"].replace("&amp;", "&amp;amp;"))),
            ("a tag that is not in the vocabulary", lambda f: f.__setitem__("rationale", "<em>Why text.</em>")),
            ("a stray angle bracket", lambda f: f.__setitem__("rationale", "Why < text.")),
            ("an empty field", lambda f: f.__setitem__("landscape", "")),
        ]
        for name, m in mutations:
            expect(broken(m), "the verifier did not catch: %s" % name)
        expect(not verify_card(good.card, good.fields, None, None, "test-card"), "the verifier must pass the untouched fields")
        # a broken js_string must be caught too
        real = globals()["js_string"]
        try:
            globals()["js_string"] = lambda s: '"' + s.replace('"', '\\"') + '"'      # forgets to double backslashes
            tricky = run(sample_card(policy=[u"C:\\temp\\new"]))
            expect(not tricky.ok and any("read back" in d or "JavaScript" in d for d in (tricky.diffs or [])),
                   "a js_string that forgets to escape backslashes must be caught by the round trip")
        finally:
            globals()["js_string"] = real

    # ── the generated file: strict reader, and real JavaScript when node is there
    entries = collections.OrderedDict([
        ("b", collections.OrderedDict([("title", u"T \\ \" \u2028 \u00a0 \u200b \U0001F642"), ("summary", NASTY_HTML),
                                       ("strengths", [u"one", u"two \"q\""]), ("risks", []), ("references", [])])),
        ("a", collections.OrderedDict([("title", u"A")]))])
    js = render_js(entries, ["a", "b"])
    expect(list(parse_policy_text(js)) == ["a", "b"] and parse_policy_text(js)["b"] == entries["b"],
           "render_js and parse_policy_text must round-trip, in the site's card order")
    last = js.rindex("};")
    for bad in (js.replace("\\\\", "\\q", 1), js.replace('"A"', '"A', 1), js[:last] + "}" + js[last + 2:], js + "x"):
        try:
            parse_policy_text(bad)
            expect(False, "parse_policy_text accepted a damaged file")
        except JsError:
            expect(True, "")
    try:
        viaN = node_decode(js)
    except JsError as e:
        viaN, nm = None, str(e)
        expect(False, "node could not evaluate the generated file: %s" % nm)
    if viaN is not None:
        expect(dict((k, dict(v)) for k, v in viaN.items()) == dict((k, dict(v)) for k, v in entries.items()),
               "real JavaScript (node) reads the generated file differently from the strict decoder")

    # ── the gate
    gate = ("roles (see workplan here),,,,,\nBecky leads first draft,,,,,\npolicy card status,ESP agenda?,category,priority,Card id,Doc link,Site status\n"
            "Unemployment Insurance Reform,yes,x,high,test-card,https://docs.google.com/document/d/1eNh6KC0wSLWMndmTUBbSDocDk2lfr_hBHeBRhgvDYcs/edit,approved\n"
            "Federal Job Guarantee,no,x,high,,,\n[AI bubble],,,,,,\n")
    rows, probs = read_gate(gate, site.cards)
    expect(not probs and rows == [(4, "test-card", "1eNh6KC0wSLWMndmTUBbSDocDk2lfr_hBHeBRhgvDYcs",
                                   "https://docs.google.com/document/d/1eNh6KC0wSLWMndmTUBbSDocDk2lfr_hBHeBRhgvDYcs/edit", "approved")],
           "the gate is found under the roles block, planning rows without a card id are ignored: %s %s" % (rows, probs))
    head = "card id,doc link,site status\n"
    link_ok = "https://docs.google.com/document/d/1eNh6KC0wSLWMndmTUBbSDocDk2lfr_hBHeBRhgvDYcs/edit"
    expect(read_gate(head + "test-card,%s,\n" % link_ok, site.cards)[0][0][4] == UNDER_REVIEW, "a blank status means under review")
    expect(read_gate(head + "test-card,%s, Approved \n" % link_ok, site.cards)[0][0][4] == APPROVED, "status matching ignores capitals and spaces")
    # the policy map tab as it is: `general status` is the status column, `archived` is a status, a row with no card id is a planning row
    pm = "policy map status,included in ESP's agenda?,category,priority,what it is,examples,general status,card id,doc link,notes\n"
    rows_pm, probs_pm = read_gate(pm + "Unemployment Insurance Reform,yes,x,high,draft complete,draft complete,approved,test-card,%s,\n" % link_ok
                                  + "Global Minimum Tax on AI Profits,,x,,,,archived,not-on-site,,\nAI Safety,,x,,,,,,,\n", site.cards)
    expect(not probs_pm and [(r[1], r[4]) for r in rows_pm] == [("test-card", APPROVED), ("not-on-site", ARCHIVED)],
           "the policy map tab: general status is read, archived is recognised and skipped, a row without a card id is ignored: %s %s" % (rows_pm, probs_pm))
    for what, text, word in (("an unknown status", head + "test-card,%s,aproved\n" % link_ok, "aproved"),
                             ("a card that is not on the site", head + "nope,%s,approved\n" % link_ok, "not a card"),
                             ("a duplicate card id", head + "test-card,%s,\ntest-card,%s,approved\n" % (link_ok, link_ok), "already in row"),
                             ("an approved row with no Doc link", head + "test-card,,approved\n", "not a Google Docs link"),
                             ("a Doc link with no card id", head + ",%s,approved\n" % link_ok, "no card id"),
                             ("no header", "a,b,c\n1,2,3\n", "no header row")):
        expect(any(word in p for p in read_gate(text, site.cards)[1]), "the gate must stop on %s and say so" % what)

    # ── build: only clean Docs, updates keep what an earlier sync wrote, nothing written on a refusal
    with tempfile.TemporaryDirectory() as tmp:
        out_path = os.path.join(tmp, "policy-text.js")
        two = Site(collections.OrderedDict([("test-card", site.cards["test-card"]), ("other", {"id": "other", "title": "Other"})]),
                   ["test-card", "other"], [], None, {})
        quiet = lambda s: None
        d1 = [("test-card", "f1", sample_card(policy=[u"First text."]).build(), "2026-11-17T19:39:21.327Z")]
        expect(do_build(two, d1, out_path, quiet, quiet) == 0 and parse_policy_text(_slurp(out_path))["test-card"]["summary"] == "First text.",
               "build must write a clean card")
        two.prev = parse_policy_text(_slurp(out_path))
        before = _slurp(out_path)
        expect(do_build(two, d1, out_path, quiet, quiet) == 0 and _slurp(out_path) == before, "building the same Doc again must change nothing")
        d2 = [("other", "f2", sample_card(title="Other", policy=[u"Second."]).build(), "2026-11-17T20:00:00Z")]
        expect(do_build(two, d2, out_path, quiet, quiet) == 0, "build must add a second card")
        now = parse_policy_text(_slurp(out_path))
        expect(list(now) == ["test-card", "other"] and now["test-card"]["summary"] == "First text.",
               "a second build must keep the first card's text and write cards in the site's order")
        two.prev = now
        held = _slurp(out_path)
        d3 = [("test-card", "f3", sample_card(policy=[[(u"slanted", {"i": True})]]).build(), "2026-11-17T21:00:00Z"),
              ("other", "f4", sample_card(title="Other", policy=[u"Third."]).build(), "2026-11-17T21:00:00Z")]
        expect(do_build(two, d3, out_path, quiet, quiet) == 1 and _slurp(out_path) == held,
               "one refused Doc must stop the whole build and leave the file exactly as it was")
        out_kg = os.path.join(tmp, "policy-text-keep-going.js")
        expect(do_build(two, d3, out_kg, quiet, quiet, keep_going=True) == 1 and parse_policy_text(_slurp(out_kg))["other"]["summary"] == "Third."
               and parse_policy_text(_slurp(out_kg))["test-card"]["summary"] == "First text." and _slurp(out_path) == held,
               "with keep_going a refused Doc leaves its card as it was, the clean Doc is written, and the run still ends non-zero")
        out_none = os.path.join(tmp, "policy-text-none.js")
        expect(do_build(two, d3[:1], out_none, quiet, quiet, keep_going=True) == 1 and not os.path.exists(out_none),
               "with keep_going and every Doc refused nothing is written")
        # a Doc with no modified time cannot be built: the card shows it
        before = _slurp(out_path)
        said = []
        expect(do_build(two, [("test-card", "f9", sample_card(policy=[u"Nope."]).build(), None)], out_path, quiet, said.append) == 1
               and _slurp(out_path) == before and any("last-modified" in m for m in said),
               "build must refuse a Doc with no last-modified time, say so, and write nothing")
        # the date stays with the text: card A keeps its own day when card B is synced
        a_was = parse_policy_text(_slurp(out_path))["test-card"]
        expect(a_was["docModified"] == "2026-11-17T19:39:21Z" and a_was["docUpdated"] == "2026-11-17", "the built card carries its Doc's date")
        # a change of time zone moves the day of a card that is only carried along, never its instant
        real_tz = globals()["DISPLAY_TZ"]
        try:
            globals()["DISPLAY_TZ"] = "Pacific/Auckland"
            two.prev = parse_policy_text(_slurp(out_path))
            d5 = [("other", "f5", sample_card(title="Other", policy=[u"Fifth."]).build(), "2026-11-17T22:00:00Z")]
            expect(do_build(two, d5, out_path, quiet, quiet) == 0, "build with another time zone")
            moved = parse_policy_text(_slurp(out_path))
            expect(moved["test-card"]["docModified"] == "2026-11-17T19:39:21Z" and moved["test-card"]["docUpdated"] == "2026-11-18"
                   and moved["other"]["docUpdated"] == "2026-11-18" and "Pacific/Auckland" in _slurp(out_path),
                   "a new DISPLAY_TZ must move the day of every card, and keep each instant: %s" % moved["test-card"])
        finally:
            globals()["DISPLAY_TZ"] = real_tz
    expect(one_writer_guard(TEXT_FILE, False) is None or os.path.exists(os.path.join(ROOT, ".git")), "the one-writer guard only fires in a git tree")
    if os.path.exists(os.path.join(ROOT, ".git")) and os.environ.get("GITHUB_ACTIONS") != "true":
        expect(one_writer_guard(TEXT_FILE, False) is not None, "build must refuse to write data/policy-text.js in the tree you commit from")
        expect(one_writer_guard(TEXT_FILE, True) is None and one_writer_guard(os.path.join(tempfile.gettempdir(), "x.js"), False) is None,
               "the guard can be passed on purpose, and does not apply outside the repo")

    # ── the date: when the Doc was last modified
    now = datetime.datetime(2026, 11, 18, 12, 0, 0)
    for text, stamp in (("2026-11-17T19:39:21.327Z", "2026-11-17T19:39:21Z"), ("2026-11-17T14:39:21-05:00", "2026-11-17T19:39:21Z"),
                        ("2026-11-17T14:39:21-0500", "2026-11-17T19:39:21Z"), ("2026-11-17t19:39:21z", "2026-11-17T19:39:21Z"),
                        ("2026-11-17 19:39:21Z", "2026-11-17T19:39:21Z")):
        expect(parse_modified(text, now) == stamp, "parse_modified(%r) must give %s" % (text, stamp))
    for bad in ("yesterday", "", "2026-11-17", "2026-13-01T00:00:00Z", "2026-02-30T00:00:00Z", "2026-11-17T25:00:00Z",
                "2009-12-31T23:59:59Z", "2026-11-19T12:00:01Z", "2026-11-17T19:39:21", "2026-11-17T19:39:21+25:00"):
        try:
            parse_modified(bad, now)
            expect(False, "parse_modified accepted %r" % bad)
        except ValueError:
            expect(True, "")
    # the day is the New York day: both daylight-saving edges, midnight either side, a year end
    for stamp, day in (("2026-11-17T19:39:21Z", "2026-11-17"), ("2026-11-18T04:59:59Z", "2026-11-17"), ("2026-11-18T05:00:00Z", "2026-11-18"),
                       ("2026-07-01T03:59:59Z", "2026-06-30"), ("2026-07-01T04:00:00Z", "2026-07-01"),
                       ("2026-03-08T06:59:59Z", "2026-03-08"), ("2026-03-08T07:00:00Z", "2026-03-08"),
                       ("2026-11-01T03:59:59Z", "2026-10-31"), ("2026-11-01T04:00:00Z", "2026-11-01"),
                       ("2026-11-01T05:30:00Z", "2026-11-01"), ("2026-11-01T06:30:00Z", "2026-11-01"),
                       ("2026-01-01T04:59:59Z", "2025-12-31"), ("2026-01-01T05:00:00Z", "2026-01-01")):
        expect(display_day(stamp) == day, "the New York day of %s must be %s, got %s" % (stamp, day, display_day(stamp)))
    r = analyze("test-card", sample_card().build(), site, "fixture", "2026-11-17T19:39:21.327Z")
    expect(r.ok and r.fields["docModified"] == "2026-11-17T19:39:21Z" and r.fields["docUpdated"] == "2026-11-17"
           and list(r.fields)[-2:] == ["docModified", "docUpdated"], "a Doc with a modified time gets docModified and docUpdated, last")
    expect("modified" in codes(analyze("test-card", sample_card().build(), site, "fixture", "garbage")),
           "a modified time that is not a time must be refused")
    r0 = analyze("test-card", sample_card().build(), site, "fixture")
    expect(r0.ok and "docUpdated" not in r0.fields, "check works without a modified time (build does not: see below)")
    if r.ok:
        back = parse_policy_text(render_js({"test-card": r.fields}, ["test-card"]))["test-card"]
        expect(back["docModified"] == "2026-11-17T19:39:21Z" and back["docUpdated"] == "2026-11-17", "the two date fields must survive the generated file")
        bent = collections.OrderedDict(r.fields)
        bent["docUpdated"] = "2026-11-18"
        expect(verify_card(r.card, bent, None, None, "test-card"), "the verifier must catch a day that is not the New York day of the instant")
        bent = collections.OrderedDict(r.fields)
        bent["docModified"] = "2026-11-17 19:39"
        expect(verify_card(r.card, bent, None, None, "test-card"), "the verifier must catch a malformed instant")
        rows = dict((f, (st, d)) for f, st, d in compare_card(r.card, r.fields, dict(site.cards["test-card"], lastReviewed="2026-06-23")))
        expect(rows["docUpdated"][0] == "NEW" and "Last reviewed 2026-06-23" in rows["docUpdated"][1] and "Last updated 2026-11-17" in rows["docUpdated"][1],
               "compare says the date line would change from Last reviewed to Last updated: %s" % (rows["docUpdated"],))
        rows = dict((f, st) for f, st, _ in compare_card(r.card, r.fields, dict(site.cards["test-card"], docUpdated="2026-11-17")))
        expect(rows["docUpdated"] == "unchanged", "the same day is unchanged")
        rows = dict((f, st) for f, st, _ in compare_card(r.card, r.fields, dict(site.cards["test-card"], docUpdated="2026-10-01")))
        expect(rows["docUpdated"] == "CHANGED", "another day is a change")
    # a stale export, or a doctored one: time never runs backwards, and one time means one text
    base_text = collections.OrderedDict([("title", "Test Card"), ("summary", "Policy text."), ("rationale", "Why text."),
                                         ("strengths", ["A strength."]), ("risks", ["A risk."]), ("landscape", "Where it stands text."),
                                         ("references", ["A reference."]), ("docModified", "2026-11-17T19:39:21Z"), ("docUpdated", "2026-11-17")])
    synced = test_site()
    synced.prev = collections.OrderedDict([("test-card", base_text)])
    expect("modified-older" in codes(analyze("test-card", sample_card().build(), synced, "f", "2026-11-17T19:00:00Z")),
           "a Doc older than the text already on the site must be refused")
    expect(analyze("test-card", sample_card().build(), synced, "f", "2026-11-17T19:39:21Z").ok, "the same time with the same text is fine")
    expect("modified-same" in codes(analyze("test-card", sample_card(policy=[u"Changed."]).build(), synced, "f", "2026-11-17T19:39:21Z")),
           "the same time with different text must be refused")
    expect(analyze("test-card", sample_card(policy=[u"Changed."]).build(), synced, "f", "2026-11-17T19:39:22Z").ok,
           "a later time with different text is an edit, and fine")
    # the sidecar next to an export
    with tempfile.TemporaryDirectory() as tmp:
        def sidecar(text):
            with open(os.path.join(tmp, "a.json"), "w", encoding="utf-8") as fh:
                fh.write(text)
            return _read_modified(os.path.join(tmp, "a.docx"))
        expect(_read_modified(os.path.join(tmp, "a.docx")) == (None, None), "no sidecar is no time and no problem")
        expect(sidecar('{"id": "x", "modifiedTime": "2026-11-17T19:39:21.327Z"}') == ("2026-11-17T19:39:21.327Z", None),
               "the Drive file's metadata is a sidecar")
        expect(sidecar("{}")[1] is not None and sidecar("not json")[1] is not None and sidecar('{"modifiedTime": 5}')[1] is not None,
               "a sidecar with no modifiedTime, or that is not JSON, is a problem")

    # ── comparing with the card on the site
    c = {"title": "Test Card", "summary": "Policy text.", "rationale": "Old reason.", "strengths": ["A strength.", "Old one."],
         "risks": ["A risk."], "landscape": "Where it stands text.<br><br>Second."}
    rr = run(sample_card())
    rows = dict((f, s) for f, s, _ in compare_card(rr.card, rr.fields, c))
    expect(rows == {"title": "unchanged", "summary": "unchanged", "rationale": "CHANGED", "strengths": "CHANGED",
                    "risks": "unchanged", "landscape": "CHANGED", "references": "NEW"}, "compare_card statuses wrong: %s" % rows)
    c2 = {"title": u"Test Card", "summary": u"Policy&nbsp;text.", "strengths": [u"A strength."], "risks": ["A risk."], "rationale": "Why text.", "landscape": "x"}
    rows = dict((f, s) for f, s, _ in compare_card(rr.card, rr.fields, c2))
    expect(rows["summary"] == "same words", "entities that decode to the Doc's characters must count as the same words: %s" % rows)
    rows = dict((f, s) for f, s, _ in compare_card(rr.card, rr.fields, None))
    expect(set(rows.values()) == {"NEW"}, "a card with nothing on the site is all new")

    # ── the pilot Doc, when its fixture is in the repo
    fx = os.path.join(ROOT, "tests", "fixtures", "policy-docs")
    if os.path.isfile(os.path.join(fx, "ui-reform.docx")) and os.path.isfile(os.path.join(fx, "ui-reform-site-card.json")):
        import json
        with open(os.path.join(fx, "ui-reform.docx"), "rb") as fh:
            data = fh.read()
        with open(os.path.join(fx, "ui-reform-site-card.json"), encoding="utf-8") as fh:
            frozen = json.load(fh)
        psite = test_site(frozen)
        psite.cards = collections.OrderedDict([("ui-reform", frozen)])
        r = analyze("ui-reform", data, psite, "ui-reform.docx", "2026-11-17T19:39:21.327Z")
        expect(r.ok and r.stats["links"] == 13 and r.stats["bullets"] == 15 and r.stats["paragraphs"] == 31,
               "the pilot Doc must read clean: 31 paragraphs, 15 bullets, 13 links (%s)" % codes(r))
        if r.ok:
            by = dict((f, (s, d)) for f, s, d in r.compare)
            expect(r.fields["docUpdated"] == "2026-11-17" and by["docUpdated"][0] == "NEW" and "Last reviewed" in by["docUpdated"][1],
                   "pilot: the card would show Last updated 2026-11-17 where it shows a Last reviewed date now: %s" % (by.get("docUpdated"),))
            pct = lambda f: int(re.search(r"(\d+)%", by[f][1]).group(1))
            expect(by["title"][0] == "unchanged" and by["strengths"][0] == "same words" and by["risks"][0] == "CHANGED"
                   and "Doc 3 items, site 2" in by["risks"][1] and by["references"][0] == "NEW",
                   "pilot: title unchanged, strengths the same words, risks 3 versus 2, references new: %s" % by)
            expect((pct("summary"), pct("rationale"), pct("landscape")) == (96, 83, 83),
                   "pilot: Policy 96%%, Why This is Important 83%%, Where it stands 83%% (got %s)" % ((pct("summary"), pct("rationale"), pct("landscape")),))
    return done[0], problems


def cmd_selftest():
    checks, problems = _run_selftest()
    if problems:
        print("selftest FAILED: %d of %d checks failed:" % (len(problems), checks), file=sys.stderr)
        for p in problems:
            print("  - " + p, file=sys.stderr)
        return 1
    try:
        node = " and real JavaScript (node)" if node_decode("const POLICY_TEXT = {};") is not None else " (node not found: the real-JavaScript check was skipped)"
    except JsError:
        node = ""
    print("  selftest ok  all %d checks pass: the reader, the encoder, the verifier%s, the gate and build" % (checks, node))
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(prog="policy_docs.py", description=__doc__.split("THE FORMAT.")[0].strip(),
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd")

    def common(p):
        p.add_argument("--doc", action="append", default=[], metavar="FILE.docx", help="a Doc exported as Word")
        p.add_argument("--card", action="append", default=[], metavar="ID", help="the card id that Doc is for")
        p.add_argument("--gate", metavar="CSV_OR_URL", help="the Sheet tab as CSV (a file, or a published link)")
        p.add_argument("--exports", metavar="FOLDER", help="a folder holding <card id>.docx for each Doc "
                       "(and <card id>.json with its Drive metadata)")
        p.add_argument("--modified", action="append", default=[], metavar="TIME",
                       help="a Doc's last-modified time (Drive's modifiedTime), one per --doc, in the same order")

    c = sub.add_parser("check", help="dry run: what would change, field by field; writes nothing")
    common(c)
    c.add_argument("--diff", action="store_true", help="also show a word-level diff of each changed field")
    v = sub.add_parser("verify", help="only the round-trip proof")
    common(v)
    b = sub.add_parser("build", help="write data/policy-text.js (scratch copies and the Action only)")
    common(b)
    b.add_argument("--out", metavar="PATH", help="write here instead of data/policy-text.js")
    b.add_argument("--allow-local-write", action="store_true", help="write inside the git tree you commit from")
    b.add_argument("--keep-going", action="store_true",
                   help="a refused Doc leaves its own card alone and the clean Docs are still written (the run still ends non-zero)")
    sub.add_parser("selftest", help="prove the reader, encoder and verifier on nasty fixtures")
    args = ap.parse_args(argv)
    if not args.cmd:
        ap.print_help()
        return 2
    if args.cmd == "selftest":
        return cmd_selftest()
    return {"check": cmd_check, "verify": cmd_verify, "build": cmd_build}[args.cmd](args)


if __name__ == "__main__":
    sys.exit(main())
