#!/usr/bin/env python3
"""
docx_reader.py -- read a Word (.docx) file as UNTRUSTED data, in memory, and say exactly
what is in it.

Used by tools/policy_docs.py, which reads each policy-card Google Doc as a Word export
(File > Download > Microsoft Word, or the Drive connector's `download_file_content` with
exportMimeType application/vnd.openxmlformats-officedocument.wordprocessingml.document).

WHAT THIS IS AND IS NOT. A reader, not a converter. It walks the body of the document
once and returns the paragraphs (kind, list level, runs of text with bold and link), plus
a list of PROBLEMS: everything the file holds that the sync cannot carry over exactly
(tables, images, footnotes, pending suggestions, soft line breaks, tabs, italics,
colours, fonts ...). It never repairs, drops or rewrites anything to make a file pass:
what it does not recognise it reports by name. The caller (policy_docs.py) decides what
a problem means; this module only refuses to be quiet about it.

HOW IT KEEPS THE FILE AT ARM'S LENGTH. A .docx is a zip of XML parts, and it came from
outside the repo, so:
  * the bytes are opened with `zipfile` in memory: nothing is extracted to disk, nothing is
    executed, no external relationship (link, template, image) is ever fetched;
  * only the parts that carry the text are read (document.xml, styles.xml, numbering.xml and
    the relationships file), each with a size cap, so a zip bomb is refused, not expanded;
  * XML that declares a DTD or an entity is refused (that is how "billion laughs" and
    external-entity attacks work), as is anything that is not UTF-8;
  * a hyperlink is returned as text; the caller refuses every scheme but http and https.
Callers should still keep downloaded files in a folder of their own and run Python with -I.

No dependencies beyond the Python standard library.
"""

import io
import re
import unicodedata
import zipfile
import xml.etree.ElementTree as ET

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
W = "{%s}" % W_NS
R = "{%s}" % R_NS
XML_SPACE = "{http://www.w3.org/XML/1998/namespace}space"

# Caps. A card is a few KB of text; a real export is about 11 KB packed, 30 KB of XML.
MAX_PARTS = 400
MAX_PART_BYTES = 8 * 1024 * 1024        # any one part we read, unpacked
MAX_PACKED_RATIO = 500                  # unpacked / packed, per part we read
MAX_PARAGRAPHS = 5000
MAX_LINK_CHARS = 2000

# Paragraph styles. Heading-class styles mark lines the template calls headings; the
# caller finds the template's labels by their TEXT (the team styles them inconsistently),
# but a heading-styled line that is not a label is an unknown heading. Body text may only
# be plain (no style, Normal, or the list style Docs puts on bullets): any other named
# style could carry formatting we would drop without saying.
HEADING_STYLES = frozenset(["Title", "Subtitle"] + ["Heading%d" % n for n in range(1, 10)])
BODY_STYLES = frozenset([None, "Normal", "ListParagraph"])

# What a hyperlink's own look is allowed to be (the link is carried as a real link, so its
# blue underline is not "formatting" the author added). 0000EE is what an HTML import
# writes, 1155CC what Google Docs writes for a typed link, 0563C1 is Word's.
LINK_COLOURS = frozenset(["0000ee", "0000ff", "1155cc", "0563c1", "0645ad"])
BLACK = frozenset(["auto", "000000", "none"])

# Elements that mark a pending suggestion (Google Docs exports suggestions as tracked
# changes) wherever they appear.
REVISION = frozenset([
    "ins", "del", "moveFrom", "moveTo", "moveFromRangeStart", "moveFromRangeEnd",
    "moveToRangeStart", "moveToRangeEnd", "rPrChange", "pPrChange", "sectPrChange",
    "tblPrChange", "tblGridChange", "tcPrChange", "trPrChange", "numberingChange",
    "cellIns", "cellDel", "cellMerge", "delText", "delInstrText",
    "customXmlInsRangeStart", "customXmlDelRangeStart"])
# Things that are not text and cannot be carried: refused by name.
IMAGE_TAGS = frozenset(["drawing", "pict", "object", "AlternateContent", "Fallback", "Choice",
                        "txbxContent", "movie", "control", "background"])
FIELD_TAGS = frozenset(["fldChar", "instrText", "fldSimple", "sdt", "sdtContent", "sdtPr"])
EQUATION_TAGS = frozenset(["oMath", "oMathPara"])
# Harmless markers with no text and no meaning for the card.
IGNORABLE = frozenset([
    "bookmarkStart", "bookmarkEnd", "proofErr", "commentRangeStart", "commentRangeEnd",
    "permStart", "permEnd", "lastRenderedPageBreak", "commentReference", "annotationRef",
    "noProof", "smartTagPr"])

# Characters. Control characters and bidi controls are refused; invisible format
# characters and the non-breaking spaces are only reported (and written as \uXXXX escapes
# in the generated JS so a reviewer can see them).
BIDI = frozenset(u"\u061c\u200e\u200f\u202a\u202b\u202c\u202d\u202e\u2066\u2067\u2068\u2069")
NBSP_LIKE = frozenset(u"\u00a0\u202f\u2007\u2060")
LINE_SEPARATORS = frozenset(u"\u2028\u2029\u0085")


class DocxError(Exception):
    """The file is not a readable .docx at all (not a zip, no document.xml, bad XML ...)."""


class Problem(object):
    """Something in the file that the sync refuses. `code` is a short stable name (tests
    and messages use it), `text` says what it is, `para` is the body paragraph number
    (1-based) it was found in, or None."""
    __slots__ = ("code", "text", "para")

    def __init__(self, code, text, para=None):
        self.code, self.text, self.para = code, text, para

    def __repr__(self):
        return "Problem(%r, %r, %r)" % (self.code, self.text, self.para)


class Run(object):
    """A stretch of text with one look: bold or not, inside one hyperlink or none."""
    __slots__ = ("text", "bold", "link")

    def __init__(self, text, bold=False, link=None):
        self.text, self.bold, self.link = text, bold, link

    def __repr__(self):
        return "Run(%r, bold=%r, link=%r)" % (self.text, self.bold, self.link)


class Para(object):
    """One body paragraph. kind: 'p' (plain), 'li' (list item). `format` holds the
    character formatting findings (code, detail), kept apart from the file-level problems
    because a heading line may carry any styling (the caller ignores it there) while body
    text may not."""
    __slots__ = ("index", "style", "heading", "kind", "list_kind", "list_level", "runs",
                 "format", "align")

    def __init__(self, index):
        self.index = index
        self.style = None
        self.heading = False
        self.kind = "p"
        self.list_kind = None      # 'bullet' | 'number' | 'unknown' for list items
        self.list_level = 0
        self.runs = []
        self.format = []
        self.align = None

    @property
    def text(self):
        return "".join(r.text for r in self.runs)

    @property
    def empty(self):
        """No visible text: nothing, spaces, non-breaking spaces or invisible characters."""
        return all(c.isspace() or unicodedata.category(c) == "Cf" for c in self.text)


class Doc(object):
    def __init__(self):
        self.paragraphs = []       # Para, in body order
        self.problems = []         # Problem
        self.notes = []            # (code, para index or None, text): worth knowing, not refused
        self.parts = []            # names of the parts in the package
        self.base = {}             # the body text's own look (document defaults + Normal)

    def problem(self, code, text, para=None):
        self.problems.append(Problem(code, text, para))

    def note(self, code, text, para=None):
        self.notes.append((code, para, text))


# ── the package ─────────────────────────────────────────────────────────────

def local(tag):
    return tag.rsplit("}", 1)[-1]


def _open_zip(data):
    if not isinstance(data, (bytes, bytearray)):
        raise DocxError("expected the bytes of a .docx file")
    try:
        z = zipfile.ZipFile(io.BytesIO(bytes(data)))
    except zipfile.BadZipFile:
        raise DocxError("this is not a Word (.docx) file: it is not a zip package")
    infos = z.infolist()
    if len(infos) > MAX_PARTS:
        raise DocxError("this .docx has %d parts; refusing a package that large" % len(infos))
    for i in infos:
        if i.flag_bits & 0x1:
            raise DocxError("this .docx is encrypted; export the Doc again without protection")
    return z


def _read_part(z, name):
    """The bytes of one part, or None if the package has no such part. Capped."""
    try:
        info = z.getinfo(name)
    except KeyError:
        return None
    if info.file_size > MAX_PART_BYTES:
        raise DocxError("%s is %d bytes unpacked; refusing" % (name, info.file_size))
    if info.compress_size and info.file_size / float(info.compress_size) > MAX_PACKED_RATIO:
        raise DocxError("%s unpacks to far more than it packs to (a zip bomb?); refusing" % name)
    with z.open(info) as fh:
        raw = fh.read(MAX_PART_BYTES + 1)
    if len(raw) > MAX_PART_BYTES:
        raise DocxError("%s is larger than %d bytes unpacked; refusing" % (name, MAX_PART_BYTES))
    return raw


def _xml(raw, name):
    low = raw[:4096].lower()
    if raw[:2] in (b"\xff\xfe", b"\xfe\xff") or b"\x00" in raw[:64]:
        raise DocxError("%s is not UTF-8 XML" % name)
    if b"<!doctype" in raw.lower() or b"<!entity" in raw.lower():
        raise DocxError("%s declares a DTD or an entity, which a Word file never does; refusing" % name)
    m = re.search(br'<\?xml[^>]*encoding=["\']([^"\']+)', low)
    if m and m.group(1).decode("ascii", "replace").lower() not in ("utf-8", "utf8"):
        raise DocxError("%s is not UTF-8 XML" % name)
    try:
        return ET.fromstring(raw)
    except ET.ParseError as e:
        raise DocxError("%s is not well-formed XML (%s)" % (name, e))


def _read_rels(z):
    """relationship id -> (target, mode, type) from word/_rels/document.xml.rels."""
    raw = _read_part(z, "word/_rels/document.xml.rels")
    out = {}
    if raw is None:
        return out
    for rel in _xml(raw, "document.xml.rels"):
        if local(rel.tag) == "Relationship":
            out[rel.get("Id")] = (rel.get("Target"), rel.get("TargetMode"), rel.get("Type") or "")
    return out


def _lvl(l):
    f, t = l.find(W + "numFmt"), l.find(W + "lvlText")
    return (f.get(W + "val") if f is not None else None, t.get(W + "val") if t is not None else None)


def _read_numbering(z):
    """numId -> {level: (numFmt, lvlText)}: what each list paragraph's marker is."""
    raw = _read_part(z, "word/numbering.xml")
    if raw is None:
        return {}
    root = _xml(raw, "numbering.xml")
    abstract = {}
    for a in root.findall(W + "abstractNum"):
        levels = {}
        for l in a.findall(W + "lvl"):
            try:
                levels[int(l.get(W + "ilvl", "0"))] = _lvl(l)
            except ValueError:
                raise DocxError("numbering.xml has a malformed list level")
        abstract[a.get(W + "abstractNumId")] = levels
    nums = {}
    for n in root.findall(W + "num"):
        aid = n.find(W + "abstractNumId")
        levels = dict(abstract.get(aid.get(W + "val"), {})) if aid is not None else {}
        for o in n.findall(W + "lvlOverride"):
            l = o.find(W + "lvl")
            if l is not None:
                try:
                    levels[int(o.get(W + "ilvl", "0"))] = _lvl(l)
                except ValueError:
                    raise DocxError("numbering.xml has a malformed list override")
        nums[n.get(W + "numId")] = levels
    return nums


def _on(val):
    """A Word on/off property: present with no value, or true/1/on, means ON."""
    return val is None or val.lower() in ("1", "true", "on")


# ── character formatting ────────────────────────────────────────────────────

# Properties with no visible effect on Latin text, or none the card could lose (complex-
# script twins of bold, italic and size; the language tag; kerning).
_QUIET = frozenset(["bCs", "iCs", "szCs", "lang", "noProof", "snapToGrid", "kern", "eastAsianLayout"])
# On/off properties. `b` is carried (bold); the rest are refused when on.
_FLAGS = ("b", "i", "strike", "dstrike", "caps", "smallCaps", "vanish", "webHidden", "specVanish",
          "emboss", "imprint", "outline", "shadow", "rtl", "cs")


def rpr_props(rpr):
    """The properties of a w:rPr as a plain dict, with the names of ones we do not know in
    `unknown`. Values are normalised (lower case, None for 'none'/'auto' where that is the
    default), so two runs that look the same compare equal."""
    out = {"unknown": []}
    if rpr is None:
        return out
    for c in rpr:
        n = local(c.tag)
        val = c.get(W + "val")
        if n in _FLAGS:
            out[n] = _on(val)
        elif n in _QUIET:
            pass
        elif n == "u":
            out["u"] = None if (val or "single") == "none" else (val or "single")
        elif n == "color":
            out["color"] = (val or "auto").lower()
            if c.get(W + "themeColor"):
                out["color_theme"] = c.get(W + "themeColor").lower()
        elif n == "highlight":
            out["highlight"] = (val or "none").lower()
        elif n == "shd":
            out["shd"] = (c.get(W + "fill") or "auto").lower()
        elif n == "vertAlign":
            out["vertAlign"] = (val or "baseline").lower()
        elif n == "sz":
            try:
                out["sz"] = int(val)
            except (TypeError, ValueError):
                out["unknown"].append("sz")
        elif n == "rFonts":
            theme = c.get(W + "asciiTheme") or c.get(W + "hAnsiTheme")
            out["font"] = c.get(W + "ascii") or c.get(W + "hAnsi") or (("theme:" + theme) if theme else None)
        elif n == "rStyle":
            out["rStyle"] = val
        elif n in ("spacing", "position", "w", "effect", "bdr", "em", "fitText"):
            out[n] = (val or "")
        elif n in REVISION:
            out["revision"] = True
        else:
            out["unknown"].append(n)
    return out


def _read_styles(z):
    """(base, styles): `base` is the body text's own look (document defaults, then the
    Normal style); `styles` maps style id -> its rPr properties and parent."""
    raw = _read_part(z, "word/styles.xml")
    base, styles = {"unknown": []}, {}
    if raw is None:
        return base, styles
    root = _xml(raw, "styles.xml")
    dd = root.find(W + "docDefaults")
    if dd is not None:
        d = dd.find(W + "rPrDefault")
        if d is not None:
            base.update({k: v for k, v in rpr_props(d.find(W + "rPr")).items() if k != "unknown"})
    default_pstyle = None
    for s in root.findall(W + "style"):
        sid = s.get(W + "styleId")
        based = s.find(W + "basedOn")
        styles[sid] = {"type": s.get(W + "type"), "based": based.get(W + "val") if based is not None else None,
                       "rpr": rpr_props(s.find(W + "rPr")), "default": s.get(W + "default")}
        if s.get(W + "type") == "paragraph" and s.get(W + "default") in ("1", "true"):
            default_pstyle = sid

    def resolved(sid, seen=()):
        st = styles.get(sid)
        if st is None or sid in seen:
            return {}
        out = resolved(st["based"], seen + (sid,)) if st["based"] else {}
        out = dict(out)
        out.update({k: v for k, v in st["rpr"].items() if k != "unknown"})
        return out

    base.update(resolved("Normal" if "Normal" in styles else default_pstyle))
    return base, styles


# ── the body ────────────────────────────────────────────────────────────────

def _format_issues(props, base, is_link):
    """What in a run's look the sync cannot carry (bold and links it can). `props` are the
    run's own properties; `base` the body text's. Returns (bold, [(code, detail)])."""
    eff = dict(base)
    eff.update({k: v for k, v in props.items() if k != "unknown"})
    issues = []
    if eff.get("i"):
        issues.append(("italic", "italic text"))
    u = eff.get("u")
    if u and not (is_link and u == "single"):
        issues.append(("underline", "underlined text"))
    if eff.get("strike") or eff.get("dstrike"):
        issues.append(("strike", "struck-through text"))
    color = eff.get("color", "auto")
    allowed = BLACK | (LINK_COLOURS if is_link else frozenset())
    if color not in allowed and not (is_link and eff.get("color_theme") == "hyperlink"):
        issues.append(("color", "coloured text (#%s)" % color.upper()))
    hl = eff.get("highlight")
    if hl and hl != "none":
        issues.append(("highlight", "highlighted text (%s)" % hl))
    shd = eff.get("shd")
    if shd and shd not in ("auto", "none", "ffffff"):
        issues.append(("highlight", "shaded text (#%s)" % shd.upper()))
    va = eff.get("vertAlign")
    if va and va != "baseline":
        issues.append(("script", "%s text" % va))
    hidden = [k for k in ("vanish", "webHidden", "specVanish") if eff.get(k)]
    if hidden:
        issues.append(("hidden", "hidden text"))
    other = [k for k in ("caps", "smallCaps", "emboss", "imprint", "outline", "shadow", "rtl")
             if eff.get(k)]
    for k, nondefault in (("spacing", "0"), ("position", "0"), ("w", "100"), ("effect", "none"),
                          ("em", "none")):
        if k in eff and eff[k] not in ("", nondefault):
            other.append("character " + k)
    if "bdr" in eff and eff["bdr"] not in ("", "nil", "none"):
        other.append("a border")
    if "fitText" in eff:
        other.append("fit text")
    if other:
        issues.append(("format", "text formatting (%s)" % ", ".join(other)))
    if props.get("unknown"):
        issues.append(("format", "text formatting this reader does not know (%s)"
                       % ", ".join(sorted(set(props["unknown"])))))
    font = props.get("font")
    if font is not None and font != base.get("font"):
        issues.append(("font", "a different font (%s; the body text is %s)"
                       % (font, base.get("font") or "the default")))
    sz = props.get("sz")
    if sz is not None and sz != base.get("sz"):
        issues.append(("size", "a different font size (%s pt; the body text is %s)"
                       % (_half(sz), _half(base.get("sz")) + " pt" if base.get("sz") else "the default")))
    rs = props.get("rStyle")
    if rs not in (None, "Hyperlink", "DefaultParagraphFont"):
        issues.append(("char-style", "a character style (%s)" % rs))
    return bool(eff.get("b")), issues


def _half(n):
    if n is None:
        return "?"
    return ("%g" % (n / 2.0))


def _check_chars(text, doc, pidx):
    """Control characters and bidi controls are refused; non-breaking spaces and invisible
    format characters are reported."""
    controls, bidi, seps, nbsp, invisible = [], [], 0, 0, []
    for c in text:
        cat = unicodedata.category(c)
        if c in BIDI:
            bidi.append(c)
        elif c in LINE_SEPARATORS:
            seps += 1
        elif cat == "Cc":
            controls.append(c)
        elif c in NBSP_LIKE and c != u"\u2060":
            nbsp += 1
        elif cat == "Cf" or c == u"\u2060":
            invisible.append(c)
    if controls:
        doc.problem("control-char", "control character(s) %s" % ", ".join(
            sorted(set("U+%04X" % ord(c) for c in controls))), pidx)
    if bidi:
        doc.problem("bidi-char", "text-direction control character(s) %s" % ", ".join(
            sorted(set("U+%04X" % ord(c) for c in bidi))), pidx)
    if seps:
        doc.problem("soft-break", "a line or paragraph separator character (U+2028/2029) inside a paragraph", pidx)
    if nbsp:
        doc.note("nbsp", "%d non-breaking space(s)" % nbsp, pidx)
    if invisible:
        doc.note("invisible-char", "invisible character(s) %s" % ", ".join(
            sorted(set("U+%04X" % ord(c) for c in invisible))), pidx)


def _http(url):
    return bool(re.match(r"^https?://[^\s/?#]+", url or "", re.I))


def _walk_run(r, link, para, doc, base):
    """Read one w:r into para.runs; report what cannot be carried."""
    pidx = para.index
    rpr = r.find(W + "rPr")
    text = []
    for ch in r:
        n = local(ch.tag)
        if n == "rPr":
            continue
        if n == "t":
            t = ch.text or ""
            if t and ch.get(XML_SPACE) != "preserve" and (t[:1].isspace() or t[-1:].isspace()):
                doc.problem("xml-space", "text %r starts or ends with a space but the file does not say "
                            "whether to keep it" % t[:30], pidx)
            _check_chars(t, doc, pidx)
            text.append(t)
        elif n in ("tab", "ptab"):
            doc.problem("tab", "a tab character", pidx)
            text.append("\t")
        elif n == "br":
            typ = ch.get(W + "type")
            if typ in ("page", "column"):
                doc.problem("page-break", "a %s break" % typ, pidx)
            else:
                doc.problem("soft-break", "a soft line break inside a paragraph (Shift+Enter)", pidx)
            text.append("\n")
        elif n == "cr":
            doc.problem("soft-break", "a soft line break inside a paragraph", pidx)
            text.append("\n")
        elif n in ("footnoteReference", "endnoteReference"):
            doc.problem("footnote", "a footnote or endnote", pidx)
        elif n in IMAGE_TAGS:
            doc.problem("image", "an image, drawing or text box", pidx)
        elif n in FIELD_TAGS:
            doc.problem("smart-chip", "a field, content control or smart chip (%s)" % n, pidx)
        elif n in REVISION:
            doc.problem("suggestion", "a pending suggestion (tracked change)", pidx)
        elif n in EQUATION_TAGS:
            doc.problem("equation", "an equation", pidx)
        elif n in IGNORABLE:
            continue
        else:
            doc.problem("unsupported", "an element this reader does not know (%s)" % n, pidx)
    s = "".join(text)
    if not s:
        return
    props = rpr_props(rpr)
    if props.get("revision"):
        doc.problem("suggestion", "a pending suggestion (a tracked formatting change)", pidx)
    bold, issues = _format_issues(props, base, link is not None)
    para.format.extend(issues)
    para.runs.append(Run(s, bold, link))


def _walk_paragraph(p, index, doc, base, rels, numbering):
    para = Para(index)
    doc.paragraphs.append(para)
    ppr = p.find(W + "pPr")
    numid, ilvl = None, 0
    if ppr is not None:
        unknown = []
        for c in ppr:
            n = local(c.tag)
            if n == "pStyle":
                para.style = c.get(W + "val")
            elif n == "numPr":
                nid, lv = c.find(W + "numId"), c.find(W + "ilvl")
                numid = nid.get(W + "val") if nid is not None else None
                try:
                    ilvl = int(lv.get(W + "val", "0")) if lv is not None else 0
                except ValueError:
                    ilvl = 0
            elif n == "jc":
                para.align = (c.get(W + "val") or "left").lower()
            elif n == "sectPr":
                doc.problem("page-break", "a section break", index)
            elif n == "pageBreakBefore":
                if _on(c.get(W + "val")):
                    doc.problem("page-break", "a page break before the paragraph", index)
            elif n in REVISION:
                doc.problem("suggestion", "a pending suggestion (a tracked paragraph change)", index)
            elif n == "rPr":
                for g in c:
                    if local(g.tag) in REVISION:
                        doc.problem("suggestion", "a pending suggestion (an inserted or deleted paragraph mark)", index)
            elif n in ("pBdr", "shd", "spacing", "ind", "keepNext", "keepLines", "widowControl",
                       "contextualSpacing", "outlineLvl", "tabs", "snapToGrid", "suppressAutoHyphens",
                       "textAlignment", "autoSpaceDE", "autoSpaceDN", "wordWrap", "overflowPunct",
                       "kinsoku", "topLinePunct", "bidi", "mirrorIndents", "adjustRightInd", "cnfStyle"):
                continue
            else:
                unknown.append(n)
        if unknown:
            doc.note("para-format", "paragraph layout settings this reader ignores (%s)"
                     % ", ".join(sorted(set(unknown))), index)
    para.heading = para.style in HEADING_STYLES
    if numid not in (None, "0"):
        para.kind = "li"
        para.list_level = ilvl
        fmt = numbering.get(numid, {}).get(ilvl)
        if fmt is None:
            para.list_kind = "unknown"
        elif fmt[0] == "bullet":
            para.list_kind = "bullet"
        elif fmt[0] in (None, "none"):
            para.list_kind = "unknown"
        else:
            para.list_kind = "number"
        if para.list_kind == "bullet" and fmt[1] and fmt[1].strip() in (u"\u2610", u"\u2611", u"\u2612"):
            para.list_kind = "unknown"
    if para.style not in BODY_STYLES and not para.heading:
        para.format.append(("para-style", "a paragraph style this sync does not use (%s)" % para.style))

    for ch in p:
        n = local(ch.tag)
        if n == "pPr":
            continue
        if n == "r":
            _walk_run(ch, None, para, doc, base)
        elif n == "hyperlink":
            target = None
            rid = ch.get(R + "id")
            if ch.get(W + "anchor") and not rid:
                doc.problem("link-internal", "a link to a place inside the Doc (#%s)" % ch.get(W + "anchor"), index)
            elif rid in rels:
                target = rels[rid][0]
            else:
                doc.problem("link-broken", "a link with no address", index)
            before = len(para.runs)
            for g in ch:
                gn = local(g.tag)
                if gn == "r":
                    _walk_run(g, target if target is not None else "", para, doc, base)
                elif gn in IGNORABLE:
                    continue
                elif gn in REVISION:
                    doc.problem("suggestion", "a pending suggestion (tracked change inside a link)", index)
                else:
                    doc.problem("unsupported", "an element this reader does not know inside a link (%s)" % gn, index)
            linked = para.runs[before:]
            if target is not None:
                if not linked or not "".join(r.text for r in linked).strip():
                    doc.problem("link-empty", "a link with no text (%s)" % target[:60], index)
                if not _http(target):
                    doc.problem("link-scheme", "a link that is not a web address (%s): only http and https links "
                                "are carried" % target[:80], index)
                elif len(target) > MAX_LINK_CHARS:
                    doc.problem("link-scheme", "a link address longer than %d characters" % MAX_LINK_CHARS, index)
                elif re.search(r"[\s\x00-\x1f\x7f<>\"]", target):
                    doc.problem("link-scheme", "a link with spaces, quotes or angle brackets in its address (%s)"
                                % target[:80], index)
        elif n in IGNORABLE:
            continue
        elif n in REVISION:
            doc.problem("suggestion", "a pending suggestion (tracked change)", index)
        elif n in EQUATION_TAGS:
            doc.problem("equation", "an equation", index)
        elif n in IMAGE_TAGS:
            doc.problem("image", "an image, drawing or text box", index)
        elif n in FIELD_TAGS:
            doc.problem("smart-chip", "a field, content control or smart chip (%s)" % n, index)
        else:
            doc.problem("unsupported", "an element this reader does not know (%s)" % n, index)
    if para.kind == "li":
        if para.list_kind == "number":
            doc.problem("numbered-list", "a numbered list item (only bullets are carried)", index)
        elif para.list_kind == "unknown":
            doc.problem("list-unknown", "a list item whose marker could not be read as a bullet", index)
        if para.list_level > 0:
            doc.problem("nested-list", "a nested (indented) list item", index)
    if para.align and para.align not in ("left", "start", "both") and not para.empty:
        doc.note("alignment", "text aligned %s (the sync drops alignment)" % para.align, index)
    return para


def read_docx(data):
    """Read the bytes of a .docx. Returns a Doc; `Doc.problems` lists everything the sync
    refuses, `Doc.paragraphs` the body in order. Raises DocxError when the file cannot be
    read at all."""
    z = _open_zip(data)
    names = z.namelist()
    raw = _read_part(z, "word/document.xml")
    if raw is None:
        raise DocxError("this .docx has no word/document.xml: it is not a Word document")
    root = _xml(raw, "document.xml")
    body = root.find(W + "body")
    if body is None:
        raise DocxError("document.xml has no body")
    doc = Doc()
    doc.parts = names
    rels = _read_rels(z)
    numbering = _read_numbering(z)
    base, _styles = _read_styles(z)
    doc.base = base

    children = list(body)
    if len(children) > MAX_PARAGRAPHS:
        raise DocxError("this document has %d body elements; refusing" % len(children))
    last = len(children) - 1
    for pos, ch in enumerate(children):
        n = local(ch.tag)
        here = len(doc.paragraphs)
        if n == "p":
            _walk_paragraph(ch, here + 1, doc, base, rels, numbering)
        elif n == "tbl":
            doc.problem("table", "a table (after paragraph %d)" % here)
        elif n == "sectPr":
            if pos != last:
                doc.problem("page-break", "a section break (after paragraph %d)" % here)
        elif n in IGNORABLE:
            continue
        elif n in REVISION:
            doc.problem("suggestion", "a pending suggestion (after paragraph %d)" % here)
        elif n in FIELD_TAGS:
            doc.problem("smart-chip", "a content control or smart chip (after paragraph %d)" % here)
        elif n in EQUATION_TAGS:
            doc.problem("equation", "an equation (after paragraph %d)" % here)
        elif n in IMAGE_TAGS:
            doc.problem("image", "an image or drawing (after paragraph %d)" % here)
        else:
            doc.problem("unsupported", "an element this reader does not know (%s, after paragraph %d)" % (n, here))

    # Parts that the walk above never looks at. Footnote text only matters when the body
    # points at it (that is refused above); comments are ignored by design but counted.
    cm = _read_part(z, "word/comments.xml") if "word/comments.xml" in names else None
    if cm:
        try:
            n = len(_xml(cm, "comments.xml").findall(W + "comment"))
        except DocxError:
            n = 0
        if n:
            doc.note("comments", "%d comment(s) in the Doc (ignored)" % n)
    for name in names:
        if re.match(r"word/(header|footer)\d*\.xml$", name):
            part = _read_part(z, name)
            if part and re.search(br"<w:t[ >][^<]*[^<\s]", part):
                doc.note("header-footer", "text in a page header or footer (%s) is not synced" % name.split("/")[-1])
    return doc


def raw_paragraph_texts(data):
    """The text of every w:p in the body, read a second, deliberately simple way (every
    w:t, tab and break in document order) so the verifier can prove the structured reader
    lost nothing. Returns a list of strings."""
    z = _open_zip(data)
    raw = _read_part(z, "word/document.xml")
    if raw is None:
        raise DocxError("this .docx has no word/document.xml")
    root = _xml(raw, "document.xml")
    out = []
    for p in root.iter(W + "p"):
        parts = []
        for el in p.iter():
            n = local(el.tag)
            if n == "t":
                parts.append(el.text or "")
            elif n in ("tab", "ptab"):
                parts.append("\t")
            elif n in ("br", "cr"):
                parts.append("\n")
        out.append("".join(parts))
    return out


# ── a tiny .docx WRITER, for the self-test and the tests only ───────────────
# The sync never writes a .docx. This builds just enough of one (the parts a Google Docs
# export has) to give the reader nasty, controlled input: every refusal has a fixture.

_NS_DECL = ('xmlns:w="%s" xmlns:r="%s" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" '
            'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" '
            'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
            'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"' % (W_NS, R_NS))

_STYLES = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles %s>'
           '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/>'
           '<w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en"/></w:rPr></w:rPrDefault></w:docDefaults>'
           '<w:style w:styleId="Normal" w:type="paragraph" w:default="1"><w:name w:val="Normal"/></w:style>'
           '<w:style w:styleId="Title" w:type="paragraph"><w:name w:val="Title"/><w:basedOn w:val="Normal"/>'
           '<w:rPr><w:b/><w:sz w:val="52"/></w:rPr></w:style>'
           '<w:style w:styleId="Heading1" w:type="paragraph"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/>'
           '<w:rPr><w:sz w:val="40"/></w:rPr></w:style>'
           '<w:style w:styleId="Heading2" w:type="paragraph"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/>'
           '<w:rPr><w:sz w:val="32"/></w:rPr></w:style>'
           '<w:style w:styleId="Heading3" w:type="paragraph"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/>'
           '<w:rPr><w:i/><w:sz w:val="28"/></w:rPr></w:style>'
           '</w:styles>') % _NS_DECL

_NUMBERING = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering %s>'
              '<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="\u25cf"/></w:lvl>'
              '<w:lvl w:ilvl="1"><w:numFmt w:val="bullet"/><w:lvlText w:val="\u25cb"/></w:lvl></w:abstractNum>'
              '<w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/><w:lvlText w:val="%%1."/></w:lvl></w:abstractNum>'
              '<w:abstractNum w:abstractNumId="2"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="\u2610"/></w:lvl></w:abstractNum>'
              '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>'
              '<w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>'
              '<w:num w:numId="3"><w:abstractNumId w:val="2"/></w:num>'
              '</w:numbering>') % _NS_DECL


def xml_text(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


class DocxBuilder(object):
    """Build a .docx in memory.  b = DocxBuilder(); b.p("text", style="Heading2");
    b.li([...]); data = b.build().  A paragraph's content is a string or a list of items:
    a plain string, ("text", {"b": True, "i": True, "color": "FF0000", ...}), or
    ("link", "text", "https://...", {props}).  `raw=` puts XML straight into a paragraph or
    the body, for the nasty cases."""

    def __init__(self):
        self.body = []
        self.links = []

    def _run(self, text, props=None, extra=""):
        props = props or {}
        rpr = ""
        if props.get("b"):
            rpr += "<w:b/>"
        if props.get("i"):
            rpr += "<w:i/>"
        if props.get("u"):
            rpr += '<w:u w:val="%s"/>' % (props["u"] if isinstance(props["u"], str) else "single")
        if props.get("strike"):
            rpr += "<w:strike/>"
        if props.get("color"):
            rpr += '<w:color w:val="%s"/>' % props["color"]
        if props.get("font"):
            rpr += '<w:rFonts w:ascii="%s" w:hAnsi="%s"/>' % (props["font"], props["font"])
        if props.get("sz"):
            rpr += '<w:sz w:val="%d"/>' % props["sz"]
        if props.get("highlight"):
            rpr += '<w:highlight w:val="%s"/>' % props["highlight"]
        if props.get("vert"):
            rpr += '<w:vertAlign w:val="%s"/>' % props["vert"]
        if props.get("vanish"):
            rpr += "<w:vanish/>"
        if props.get("caps"):
            rpr += "<w:caps/>"
        if props.get("rstyle"):
            rpr = '<w:rStyle w:val="%s"/>' % props["rstyle"] + rpr
        if props.get("rpr"):
            rpr += props["rpr"]
        t = ('<w:t xml:space="preserve">%s</w:t>' % xml_text(text)) if text != "" else ""
        return "<w:r>%s%s%s</w:r>" % ("<w:rPr>%s</w:rPr>" % rpr if rpr else "", t, extra)

    def _content(self, items):
        if isinstance(items, str):
            items = [items]
        out = []
        for it in items:
            if isinstance(it, str):
                out.append(self._run(it))
            elif it[0] == "link":
                text, url = it[1], it[2]
                props = dict({"color": "1155cc", "u": True}, **(it[3] if len(it) > 3 else {}))
                self.links.append(url)
                out.append('<w:hyperlink r:id="rIdL%d">%s</w:hyperlink>' % (len(self.links), self._run(text, props)))
            elif it[0] == "anchor":
                out.append('<w:hyperlink w:anchor="%s">%s</w:hyperlink>' % (it[2], self._run(it[1])))
            elif it[0] == "raw":
                out.append(it[1])
            else:
                out.append(self._run(it[0], it[1] if len(it) > 1 else None, it[2] if len(it) > 2 else ""))
        return "".join(out)

    def p(self, items="", style=None, ppr="", numid=None, ilvl=0):
        pp = ""
        if style:
            pp += '<w:pStyle w:val="%s"/>' % style
        if numid is not None:
            pp += '<w:numPr><w:ilvl w:val="%d"/><w:numId w:val="%d"/></w:numPr>' % (ilvl, numid)
        pp += ppr
        self.body.append("<w:p>%s%s</w:p>" % ("<w:pPr>%s</w:pPr>" % pp if pp else "", self._content(items)))
        return self

    def li(self, items="", kind="bullet", level=0):
        numid = {"bullet": 1, "number": 2, "checkbox": 3}[kind]
        return self.p(items, numid=numid, ilvl=level)

    def raw(self, xml):
        self.body.append(xml)
        return self

    def build(self, styles=_STYLES, numbering=_NUMBERING, extra_parts=None, document_xml=None):
        rels = "".join('<Relationship Id="rIdL%d" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" '
                       'Target="%s" TargetMode="External"/>' % (i + 1, xml_text(u).replace('"', "&quot;"))
                       for i, u in enumerate(self.links))
        doc = document_xml or ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document %s><w:body>%s'
                               '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/></w:sectPr></w:body></w:document>'
                               % (_NS_DECL, "".join(self.body)))
        parts = {
            "[Content_Types].xml": '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                                   '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                                   '<Default Extension="xml" ContentType="application/xml"/></Types>',
            "_rels/.rels": '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="%s"><Relationship Id="rId1" '
                           'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
                           'Target="word/document.xml"/></Relationships>' % PKG_NS,
            "word/document.xml": doc,
            "word/_rels/document.xml.rels": '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="%s">%s</Relationships>' % (PKG_NS, rels),
        }
        if styles is not None:
            parts["word/styles.xml"] = styles
        if numbering is not None:
            parts["word/numbering.xml"] = numbering
        parts.update(extra_parts or {})
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for name, content in parts.items():
                zf.writestr(name, content if isinstance(content, bytes) else content.encode("utf-8"))
        return buf.getvalue()
