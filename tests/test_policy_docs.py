#!/usr/bin/env python3
"""
Tests for tools/policy_docs.py (the policy-card Google Doc sync) and tools/docx_reader.py.

    python3 -m unittest discover -s tests -p "test_*.py" -v      # from the repo root

Standard library only. The Docs under test are real .docx files: the pilot card's Word
export (tests/fixtures/policy-docs/ui-reform.docx) and ones built in memory by
docx_reader.DocxBuilder. The pilot card as it stood on the site on 2026-11-17 is frozen in
tests/fixtures/policy-docs/ui-reform-site-card.json, so the comparison numbers do not move
when the card is later synced.

Nothing here writes inside the repo: every file goes to a temporary folder. The CLI tests
run the tool as `python3 -I tools/policy_docs.py ...`, as a person or the Action would.
"""
import collections
import datetime
import json
import os
import random
import re
import subprocess
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS = os.path.join(ROOT, "tools")
FIX = os.path.join(ROOT, "tests", "fixtures", "policy-docs")
sys.path.insert(0, TOOLS)

import docx_reader as dr          # noqa: E402
import policy_docs as P           # noqa: E402

TOOL = os.path.join(TOOLS, "policy_docs.py")
PILOT = os.path.join(FIX, "ui-reform.docx")
LINK_OK = "https://docs.google.com/document/d/1eNh6KC0wSLWMndmTUBbSDocDk2lfr_hBHeBRhgvDYcs/edit"
# the pilot Doc's Drive modifiedTime when its export was taken (2026-11-17, read through the Drive connector)
PILOT_MODIFIED = "2026-11-17T19:39:21.327Z"


def eastern_day(stamp):
    """The New York calendar day of a UTC instant (YYYY-MM-DDTHH:MM:SSZ), by the US daylight-saving rule in force since
    2007: UTC-4 from 02:00 local on the second Sunday of March until 02:00 local on the first Sunday of November, else UTC-5.
    Written out by hand so it does not share a line with the zoneinfo call it checks."""
    t = datetime.datetime.strptime(stamp, "%Y-%m-%dT%H:%M:%SZ")

    def sunday(year, month, n):
        d = datetime.datetime(year, month, 1)
        return d + datetime.timedelta(days=(6 - d.weekday()) % 7, weeks=n - 1)
    start = sunday(t.year, 3, 2) + datetime.timedelta(hours=7)        # 02:00 EST is 07:00 UTC
    end = sunday(t.year, 11, 1) + datetime.timedelta(hours=6)         # 02:00 EDT is 06:00 UTC
    return (t + datetime.timedelta(hours=-4 if start <= t < end else -5)).date().isoformat()


def cli(*args, cwd=None, env=None):
    e = dict(os.environ)
    e.pop("GITHUB_ACTIONS", None)
    e.update(env or {})
    return subprocess.run([sys.executable, "-I", TOOL] + list(args), cwd=cwd or tempfile.gettempdir(), env=e,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True, timeout=300)


def codes(result):
    return set(p.code for p in result.issues)


class SelfTest(unittest.TestCase):
    def test_the_built_in_selftest_passes(self):
        checks, problems = P._run_selftest()
        self.assertEqual(problems, [])
        self.assertGreater(checks, 100)


class Pilot(unittest.TestCase):
    """The pilot card's Word export, against the card as it stood on the site."""

    @classmethod
    def setUpClass(cls):
        with open(PILOT, "rb") as fh:
            cls.data = fh.read()
        with open(os.path.join(FIX, "ui-reform-site-card.json"), encoding="utf-8") as fh:
            cls.frozen = json.load(fh)
        cls.site = P.test_site(cls.frozen)
        cls.site.cards = collections.OrderedDict([("ui-reform", cls.frozen)])
        cls.r = P.analyze("ui-reform", cls.data, cls.site, "ui-reform.docx", PILOT_MODIFIED)

    def test_it_reads_clean(self):
        r = self.r
        self.assertEqual(r.issues, [])
        self.assertTrue(r.ok, r.diffs)
        self.assertEqual((r.stats["paragraphs"], r.stats["bullets"], r.stats["links"]), (31, 15, 13))
        self.assertEqual([k for k, _ in r.card.labels], P.ORDER)

    def test_what_it_would_change(self):
        by = dict((f, (s, d)) for f, s, d in self.r.compare)
        pct = lambda f: int(re.search(r"(\d+)%", by[f][1]).group(1))
        self.assertEqual(by["title"][0], "unchanged")
        self.assertEqual((pct("summary"), pct("rationale"), pct("landscape")), (96, 83, 83))
        self.assertEqual(by["strengths"][0], "same words")          # identical once quote marks are matched
        self.assertIn("3 items", by["strengths"][1])
        self.assertEqual(by["risks"][0], "CHANGED")
        self.assertIn("Doc 3 items, site 2", by["risks"][1])
        self.assertIn("1 new", by["risks"][1])
        self.assertEqual(by["references"][0], "NEW")

    def test_links_and_markers(self):
        self.assertEqual(len(self.r.links), 13)
        tokens = P.site_tokens(self.frozen)
        self.assertEqual(sum(tokens.values()), 13)

    def test_the_fields_are_the_doc(self):
        f = self.r.fields
        self.assertEqual(f["title"], "Unemployment Insurance Reform")
        self.assertTrue(f["summary"].startswith("Reform unemployment insurance (UI) to stabilize workers\u2019 economic security"))
        self.assertIn("<ul><li>Expanding eligibility", f["summary"])
        self.assertEqual(len(f["strengths"]), 3)
        self.assertEqual(len(f["risks"]), 3)
        self.assertEqual(len(f["references"]), 3)
        self.assertEqual(f["rationale"].count('target="_blank" rel="noopener noreferrer"'), 1 + 4 + 2 + 1)
        self.assertNotIn("{{", json.dumps(f))

    def test_the_date_line(self):
        f = self.r.fields
        self.assertEqual((f["docModified"], f["docUpdated"]), ("2026-11-17T19:39:21Z", "2026-11-17"))
        self.assertEqual(list(f)[-2:], ["docModified", "docUpdated"])
        by = dict((k, (s, d)) for k, s, d in self.r.compare)
        self.assertEqual(by["docUpdated"][0], "NEW")
        self.assertIn('Last updated 2026-11-17', by["docUpdated"][1])
        self.assertIn('Last reviewed 2026-08-14', by["docUpdated"][1])        # what the frozen card said

    def test_the_fixture_is_what_the_verifier_proves(self):
        doc = dr.read_docx(self.data)
        self.assertEqual(P.verify_card(self.r.card, self.r.fields, doc, self.data, "ui-reform"), [])


class Cli(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = self.tmp.name

    def tearDown(self):
        self.tmp.cleanup()

    def path(self, *p):
        return os.path.join(self.dir, *p)

    def write(self, name, content, binary=False):
        with open(self.path(name), "wb" if binary else "w", **({} if binary else {"encoding": "utf-8"})) as fh:
            fh.write(content)
        return self.path(name)

    def test_check_the_pilot(self):
        # against a site with no earlier sync, whatever cards data/policy-text.js holds the day the test runs
        none = {"POLICY_DOCS_TEXT_FILE": os.path.join(tempfile.gettempdir(), "policy-docs-tests-no-earlier-sync", "policy-text.js")}
        res = cli("check", "--doc", PILOT, "--card", "ui-reform", "--modified", PILOT_MODIFIED, env=none)
        self.assertEqual(res.returncode, 0, res.stdout + res.stderr)
        self.assertIn("Doc last modified 2026-11-17T19:39:21Z; the card would say 'Last updated 2026-11-17' (that day in America/New_York)", res.stdout)
        self.assertIn("docUpdated  NEW", res.stdout)
        self.assertIn("== ui-reform  Unemployment Insurance Reform", res.stdout)
        self.assertIn("the Doc follows the template; nothing was refused", res.stdout)
        self.assertIn("verified: the rebuilt text equals the Doc's text (31 paragraphs, 13 links, 0 differences)", res.stdout)
        self.assertIn("stays as it is on the site, not in the Doc:", res.stdout)
        self.assertIn("references  NEW", res.stdout)

    def test_check_works_without_a_modified_time_and_says_build_needs_it(self):
        res = cli("check", "--doc", PILOT, "--card", "ui-reform")
        self.assertEqual(res.returncode, 0)
        self.assertIn("Doc last modified: not given", res.stdout)
        self.assertNotIn("docUpdated", res.stdout.split("what the sync would change")[1].split("stays as it is")[0])

    def test_check_diff_shows_words(self):
        res = cli("check", "--doc", PILOT, "--card", "ui-reform", "--diff")
        self.assertEqual(res.returncode, 0)
        self.assertIn("word by word", res.stdout)

    def test_verify_the_pilot(self):
        res = cli("verify", "--doc", PILOT, "--card", "ui-reform")
        self.assertEqual(res.returncode, 0)
        self.assertIn("ui-reform: verbatim: all fields match (31 paragraphs, 13 links)", res.stdout)

    def test_a_refused_doc_exits_1_and_says_why(self):
        bad = P.sample_card(risks=[("li", [(u"States wield broad authority", {"i": True})])],
                            policy=[u"[Replace this: the summary]"]).build()
        f = self.write("ui-reform.docx", bad, binary=True)
        for cmd in ("check", "verify"):
            res = cli(cmd, "--doc", f, "--card", "ui-reform")
            self.assertEqual(res.returncode, 1, cmd)
        res = cli("check", "--doc", f, "--card", "ui-reform")
        self.assertIn("REFUSED: 2 problem(s)", res.stdout)
        self.assertIn("Risks, bullet 1", res.stdout)
        self.assertIn("italic text", res.stdout)
        self.assertIn("placeholder", res.stdout)
        self.assertIn("fix:", res.stdout)

    def test_a_card_that_is_not_on_the_site_is_refused(self):
        res = cli("check", "--doc", PILOT, "--card", "no-such-card")
        self.assertEqual(res.returncode, 1)
        self.assertIn("not a card on the site", res.stdout)

    def test_usage_errors(self):
        self.assertEqual(cli("check").returncode, 1)
        self.assertEqual(cli("check", "--doc", PILOT).returncode, 1)
        self.assertEqual(cli().returncode, 2)

    def test_the_gate_and_the_exports_folder(self):
        os.mkdir(self.path("exports"))
        with open(PILOT, "rb") as fh:
            self.write(os.path.join("exports", "ui-reform.docx"), fh.read(), binary=True)
        gate = self.write("gate.csv", "roles,,\npolicy card status,card id,Doc link,Site status\n"
                          "Unemployment Insurance Reform,ui-reform,%s,approved\n"
                          "Algorithmic Transparency Mandates,algorithmic-transparency,%s,\n"
                          "[AI bubble],,,\n" % (LINK_OK, LINK_OK.replace("1eNh6K", "2eNh6K")))
        res = cli("check", "--gate", gate, "--exports", self.path("exports"))
        self.assertEqual(res.returncode, 0, res.stdout + res.stderr)
        self.assertIn("skipped (not approved): row 4 algorithmic-transparency", res.stdout)
        self.assertIn("== ui-reform", res.stdout)
        self.assertIn("1 Doc(s)", res.stdout)
        # approved but no export: stops and says which Doc to download
        os.remove(self.path("exports", "ui-reform.docx"))
        res = cli("check", "--gate", gate, "--exports", self.path("exports"))
        self.assertEqual(res.returncode, 1)
        self.assertIn("is approved but", res.stderr)
        self.assertIn(LINK_OK, res.stderr)
        # a status word that is not allowed stops it
        gate2 = self.write("gate2.csv", "card id,doc link,site status\nui-reform,%s,aproved\n" % LINK_OK)
        res = cli("check", "--gate", gate2, "--exports", self.path("exports"))
        self.assertEqual(res.returncode, 1)
        self.assertIn("'aproved'", res.stderr)

    def test_build_writes_the_generated_file_and_is_idempotent(self):
        out = self.path("policy-text.js")
        res = cli("build", "--doc", PILOT, "--card", "ui-reform", "--modified", PILOT_MODIFIED, "--out", out)
        self.assertEqual(res.returncode, 0, res.stdout + res.stderr)
        self.assertIn("first sync of: ui-reform", res.stdout)
        with open(out, encoding="utf-8") as fh:
            text = fh.read()
        self.assertTrue(text.startswith("/* GENERATED by tools/policy_docs.py"))
        parsed = P.parse_policy_text(text)
        self.assertEqual(list(parsed), ["ui-reform"])
        self.assertEqual(parsed["ui-reform"]["title"], "Unemployment Insurance Reform")
        self.assertEqual((parsed["ui-reform"]["docModified"], parsed["ui-reform"]["docUpdated"]), ("2026-11-17T19:39:21Z", "2026-11-17"))
        res = cli("build", "--doc", PILOT, "--card", "ui-reform", "--modified", PILOT_MODIFIED, "--out", out)
        self.assertEqual(res.returncode, 0)
        self.assertIn("no change", res.stdout)
        with open(out, encoding="utf-8") as fh:
            self.assertEqual(fh.read(), text)

    def test_build_refuses_everything_when_one_doc_is_refused(self):
        out = self.path("policy-text.js")
        bad = self.write("bad.docx", P.sample_card(policy=[[(u"slanted", {"i": True})]]).build(), binary=True)
        res = cli("build", "--doc", PILOT, "--card", "ui-reform", "--doc", bad, "--card", "algorithmic-transparency",
                  "--modified", PILOT_MODIFIED, "--modified", PILOT_MODIFIED, "--out", out)
        self.assertEqual(res.returncode, 1)
        self.assertFalse(os.path.exists(out), "a refused build must write nothing")
        self.assertIn("refusing to write", res.stderr)

    def test_build_refuses_a_doc_with_no_modified_time(self):
        out = self.path("policy-text.js")
        res = cli("build", "--doc", PILOT, "--card", "ui-reform", "--out", out)
        self.assertEqual(res.returncode, 1)
        self.assertFalse(os.path.exists(out))
        self.assertIn("no last-modified time for ui-reform", res.stderr)
        self.assertIn("--modified", res.stderr)

    def test_a_modified_time_for_every_doc_or_none(self):
        res = cli("check", "--doc", PILOT, "--card", "ui-reform", "--doc", PILOT, "--card", "algorithmic-transparency",
                  "--modified", PILOT_MODIFIED)
        self.assertEqual(res.returncode, 1)
        self.assertIn("a --modified for every --doc", res.stderr)

    def test_a_bad_or_future_modified_time_is_refused(self):
        for bad in ("yesterday", "2999-01-01T00:00:00Z", "2009-01-01T00:00:00Z"):
            res = cli("check", "--doc", PILOT, "--card", "ui-reform", "--modified", bad)
            self.assertEqual(res.returncode, 1, bad)
            self.assertIn("the Doc's last-modified time", res.stdout, bad)

    def test_a_sidecar_next_to_the_export_gives_the_time(self):
        os.mkdir(self.path("exports"))
        with open(PILOT, "rb") as fh:
            self.write(os.path.join("exports", "ui-reform.docx"), fh.read(), binary=True)
        # what the Drive connector's get_file_metadata returns will do: the tool reads only modifiedTime
        self.write(os.path.join("exports", "ui-reform.json"), json.dumps({"id": "x", "name": "Unemployment Insurance Reform", "modifiedTime": PILOT_MODIFIED}))
        gate = self.write("gate.csv", "card id,doc link,site status\nui-reform,%s,approved\n" % LINK_OK)
        out = self.path("policy-text.js")
        res = cli("build", "--gate", gate, "--exports", self.path("exports"), "--out", out)
        self.assertEqual(res.returncode, 0, res.stdout + res.stderr)
        with open(out, encoding="utf-8") as fh:
            self.assertEqual(P.parse_policy_text(fh.read())["ui-reform"]["docUpdated"], "2026-11-17")
        # an unreadable or empty sidecar stops the run and says which file
        self.write(os.path.join("exports", "ui-reform.json"), "{}")
        res = cli("check", "--gate", gate, "--exports", self.path("exports"))
        self.assertEqual(res.returncode, 1)
        self.assertIn("ui-reform.json has no modifiedTime", res.stderr)

    @unittest.skipUnless(os.path.exists(os.path.join(ROOT, ".git")), "the one-writer guard only applies inside a git tree")
    @unittest.skipIf(os.environ.get("GITHUB_ACTIONS") == "true", "in the Action the guard is passed on purpose")
    def test_build_refuses_to_write_the_repo_file_in_the_tree_you_commit_from(self):
        before = os.path.exists(P.TEXT_FILE)
        res = cli("build", "--doc", PILOT, "--card", "ui-reform")
        self.assertEqual(res.returncode, 2)
        self.assertIn("one writer", res.stderr)
        self.assertEqual(os.path.exists(P.TEXT_FILE), before, "the guard must not have written the file")

    def test_build_needs_the_gate_or_an_explicit_pair(self):
        res = cli("build", "--exports", self.dir, "--out", self.path("x.js"))
        self.assertEqual(res.returncode, 2)


class Property(unittest.TestCase):
    """Random text and random runs: whatever the characters, the encoder and the strict
    decoders must agree, and the verifier must pass."""
    ALPHABET = list(u"abcdefgh ABCXYZ 0123456789 &<>\"'\\{}[]%$#*_/:;.,!?-") + [
        u"\u2019", u"\u2018", u"\u201c", u"\u201d", u"\u2014", u"\u2013", u"\u2026", u"\u00e9", u"\u00fc", u"\u2603",
        u"\U0001F642", u"\u00a0", u"\u200b", u"\u00ad", u"&amp;", u"&lt;", u"<br>", u"\\n", u"\\u00a0", u"</strong>"]

    def text(self, rng, lo=1, hi=60):
        s = "".join(rng.choice(self.ALPHABET) for _ in range(rng.randint(lo, hi)))
        s = "a" + s + "z"
        return s.replace("{{", "{ {").replace("}}", "} }").replace("[Replace", "[Replac")

    def test_random_text_round_trips(self):
        rng = random.Random(20261117)
        site = P.test_site()
        for n in range(150):
            a, b, c = self.text(rng), self.text(rng), self.text(rng)
            r = P.analyze("test-card", P.sample_card(policy=[a, ("li", b)], strengths=[("li", c)]).build(), site, "fuzz")
            self.assertTrue(r.ok, "case %d: %r %r" % (n, [p.text for p in r.issues], r.diffs))
            got = P.decode_html(r.fields["summary"])
            self.assertEqual([(k, "".join(t for t, _, _ in runs)) for k, runs in got], [("p", a), ("li", b)], "case %d" % n)
            self.assertEqual(P.decode_html(r.fields["strengths"][0], allow_blocks=False)[0][1], [(c, False, None)])
            js = P.render_js({"test-card": r.fields}, ["test-card"])
            self.assertEqual(P.parse_policy_text(js)["test-card"], r.fields, "case %d" % n)

    def test_random_runs_round_trip(self):
        rng = random.Random(7)
        urls = ["https://example.org/a", "https://example.org/b?x=1&y=2", "http://example.org/c#frag", "https://example.org/d%20e"]
        site = P.test_site()
        for n in range(150):
            items, spec = [], []
            for _ in range(rng.randint(1, 6)):
                t = self.text(rng, 1, 12).strip() or "x"
                bold = rng.random() < 0.4
                link = rng.choice(urls) if rng.random() < 0.4 else None
                spec.append((t, bold, link))
                if link:
                    items.append(("link", t, link, {"b": True} if bold else {}))
                else:
                    items.append((t, {"b": True} if bold else {}))
            r = P.analyze("test-card", P.sample_card(policy=[items]).build(), site, "fuzz")
            self.assertTrue(r.ok, "case %d: %r %r" % (n, [p.text for p in r.issues], r.diffs))
            got = P.decode_html(r.fields["summary"])[0][1]
            self.assertEqual("".join(t for t, _, _ in got), "".join(t for t, _, _ in spec))
            self.assertEqual(P.merge_runs([P._R(*x) for x in got]), P.merge_runs([P._R(*x) for x in spec]), "case %d" % n)

    def test_the_new_york_day_agrees_with_a_hand_written_daylight_saving_rule(self):
        rng = random.Random(1117)
        lo, hi = datetime.datetime(2010, 1, 1), datetime.datetime(2035, 12, 31)
        span = int((hi - lo).total_seconds())
        stamps = [(lo + datetime.timedelta(seconds=rng.randrange(span))).strftime("%Y-%m-%dT%H:%M:%SZ") for _ in range(3000)]
        for year in range(2010, 2036):          # and a second either side of every change of clock, and of every midnight
            for edge in (datetime.datetime(year, 3, 8), datetime.datetime(year, 11, 1)):
                for step in range(0, 8 * 24 * 3600, 3600):
                    for off in (-1, 0, 1):
                        stamps.append((edge + datetime.timedelta(seconds=step + off)).strftime("%Y-%m-%dT%H:%M:%SZ"))
        for st in stamps:
            self.assertEqual(P.display_day(st), eastern_day(st), st)

    def test_the_decoder_refuses_what_the_encoder_never_writes(self):
        for bad in ("<em>x</em>", "a<br>b", "a<br><br>", "<br><br>a", "<ul></ul>", "<ul>x</ul>", "<ul><li></li></ul>",
                    "a < b", "a & b", "&nbsp;", "<a href=\"x\">y</a>", "<strong><strong>x</strong></strong>",
                    "<a href=\"x\" target=\"_blank\" rel=\"noopener noreferrer\"><a href=\"y\" target=\"_blank\" "
                    "rel=\"noopener noreferrer\">z</a></a>", "<strong>x", "<li>x</li>", "x<br><br><ul><li>y</li></ul>"):
            with self.assertRaises(P.HtmlError, msg=bad):
                P.decode_html(bad)

    def test_the_js_reader_refuses_a_damaged_file(self):
        js = P.render_js({"a": collections.OrderedDict([("title", "A \"quoted\" title")])}, ["a"])
        self.assertEqual(P.parse_policy_text(js)["a"]["title"], "A \"quoted\" title")
        for bad in (js.replace('\\"quoted\\"', '"quoted"'), js.replace("const", "var"), js.replace("title:", "title ="), js + ";"):
            with self.assertRaises(P.JsError, msg=bad):
                P.parse_policy_text(bad)


class Reader(unittest.TestCase):
    def read(self, builder, **kw):
        return dr.read_docx(builder.build(**kw))

    def test_paragraph_kinds_lists_links_and_bold(self):
        b = dr.DocxBuilder()
        b.p("Heading", style="Heading2")
        b.p(["plain ", ("bold", {"b": True}), ("link", "a link", "https://example.org/")])
        b.li("a bullet")
        doc = self.read(b)
        self.assertEqual(doc.problems, [])
        self.assertEqual([(p.kind, p.heading) for p in doc.paragraphs], [("p", True), ("p", False), ("li", False)])
        runs = doc.paragraphs[1].runs
        self.assertEqual([(r.text, r.bold, r.link) for r in runs],
                         [("plain ", False, None), ("bold", True, None), ("a link", False, "https://example.org/")])
        self.assertEqual(doc.paragraphs[2].list_kind, "bullet")

    def test_the_second_read_agrees_with_the_first(self):
        data = dr.DocxBuilder().p(["a ", ("b", {"b": True}), ("link", "c", "https://example.org/")]).li("d").build()
        self.assertEqual(dr.raw_paragraph_texts(data), [p.text for p in dr.read_docx(data).paragraphs])

    def test_every_problem_in_the_pilot_style_doc_is_found_not_just_the_first(self):
        b = dr.DocxBuilder()
        b.p([(u"i", {"i": True})]).p([(u"u", {"u": True})]).raw("<w:tbl/>")
        doc = self.read(b)
        found = [p.code for p in doc.problems] + [c for p in doc.paragraphs for c, _ in p.format]
        self.assertEqual(sorted(found), ["italic", "table", "underline"])

    def test_the_heading_style_itself_is_not_formatting_on_the_text(self):
        # in the test styles Heading3 is italic; a heading line is ignored, and body text never inherits it
        r = P.analyze("test-card", P.sample_card().build(), P.test_site(), "x")
        self.assertTrue(r.ok, [p.text for p in r.issues])


def fixture_files():
    """The two files tests/interactions.js reads to prove the PAGE shows a synced card verbatim:
    the tool's output for the pilot Doc, and what the Doc says section by section (read from
    the Doc, not from the output). Regenerate with:  python3 tests/test_policy_docs.py --write-fixtures"""
    with open(PILOT, "rb") as fh:
        data = fh.read()
    with open(os.path.join(FIX, "ui-reform-site-card.json"), encoding="utf-8") as fh:
        frozen = json.load(fh)
    site = P.test_site(frozen)
    site.cards = collections.OrderedDict([("ui-reform", frozen)])
    r = P.analyze("ui-reform", data, site, "ui-reform.docx", PILOT_MODIFIED)
    assert r.ok, (r.fatal, [p.text for p in r.issues], r.diffs)
    card = r.card
    sections = collections.OrderedDict()
    sections["title"] = card.title
    sections["docUpdated"] = r.fields["docUpdated"]
    for key in P.PROSE:
        sections[P.FIELD_OF[key]] = [[kind, p.text] for kind, p in card.blocks[key]]
    for key in P.BULLETS + P.ITEMS:
        sections[P.FIELD_OF[key]] = [p.text for _, p in card.blocks[key]]
    links = []
    for key in P.PROSE + P.BULLETS + P.ITEMS:
        for _, p in card.blocks[key]:
            runs = P.merge_runs(p.runs)
            i = 0
            while i < len(runs):
                j = i
                while j < len(runs) and runs[j][2] == runs[i][2]:
                    j += 1
                if runs[i][2]:
                    links.append(["".join(t for t, _, _ in runs[i:j]), runs[i][2]])
                i = j
    sections["links"] = links
    return collections.OrderedDict([
        ("ui-reform-policy-text.js", P.render_js({"ui-reform": r.fields}, ["ui-reform"])),
        ("ui-reform-doc-sections.json", json.dumps(sections, ensure_ascii=False, indent=1) + "\n")])


class PageFixtures(unittest.TestCase):
    def test_the_page_fixtures_are_current(self):
        for name, content in fixture_files().items():
            path = os.path.join(FIX, name)
            self.assertTrue(os.path.exists(path), "%s is missing: python3 tests/test_policy_docs.py --write-fixtures" % name)
            with open(path, encoding="utf-8", newline="") as fh:
                self.assertEqual(fh.read(), content, "%s is stale: python3 tests/test_policy_docs.py --write-fixtures" % name)

    def test_the_sections_file_is_what_a_second_read_of_the_doc_says(self):
        with open(PILOT, "rb") as fh:
            raw = dr.raw_paragraph_texts(fh.read())
        with open(os.path.join(FIX, "ui-reform-doc-sections.json"), encoding="utf-8") as fh:
            sec = json.load(fh)
        said = [sec["title"]] + [t for _, t in sec["summary"]] + [t for _, t in sec["rationale"]] + sec["strengths"] + sec["risks"] \
            + [t for _, t in sec["landscape"]] + sec["references"]
        body = [t for t in raw if t not in ("Policy", "Why This is Important in an AI-Driven Economy", u"ESP\u2019s Take", "Strengths",
                                           "Risks", "Precedents & Examples", "Where it stands", "References")]
        self.assertEqual(said, body)


if __name__ == "__main__":
    if "--write-fixtures" in sys.argv:
        for name, content in fixture_files().items():
            with open(os.path.join(FIX, name), "w", encoding="utf-8", newline="") as fh:
                fh.write(content)
            print("wrote", os.path.relpath(os.path.join(FIX, name), ROOT))
    else:
        unittest.main()
