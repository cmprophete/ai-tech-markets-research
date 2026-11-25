#!/usr/bin/env python3
"""Tests for how tools/congress_fetch.py and tools/legislation.py say which chamber passed a bill, and when, and for the rule that a bill the governor vetoed is over (VetoesThatStand, at the end).

    python3 -m unittest discover -s tests -p "test_*.py" -v       # what CI runs (the "Policy Doc tool tests" step runs every tests/test_*.py)
    python3 tests/test_legislation.py                              # this file alone

The Status column of the bills table shows "Passed House, March 1, 2026" for a bill that passed one chamber, and "Passed Senate, May 19, 2026; Assembly, August 30, 2026" for one that passed both (the
owner's reviewers' feedback and her request to specify the chambers, 2026-11-23). The page can only say what the data says, and the data is made here, so these are the rules the page relies on:

  - the chamber is the source's own word: a federal bill's House or Senate; a state bill's chamber as the legislature names it, which is the Assembly, not the House, in California, New York, New Jersey,
    Nevada and Wisconsin, so a state chamber is never normalised to House or Senate;
  - the date is the LATEST passage by that chamber (a chamber that re-passes a bill gives the vote that stands);
  - the chambers come in the order they passed the bill (the earlier date first, the lower chamber first on the same day): that order is decided here, once, and the page and the CSV show it as it is;
  - nothing is guessed: a passage with no chamber name, a date that does not parse, a committee action, or a unicameral legislature's joint action gives nothing, and the page then says the chamber and
    date are not in the data;
  - only a bill at the one-chamber or both-chambers stage carries it, and a federal bill and its identical companion (one row on the page) share it.

A bill the governor vetoed is failed, and not listed, unless something after the veto shows the legislature acting on it again (os_veto_stands, 2026-11-24: California's SB 7 and SB 11, "Veto sustained.", were
listed at Passed both chambers). The rule reads Open States' classification wherever the veto sits in the history, a pending veto counts, a line-item or conditional veto does not, an override or a signature after
the veto makes the bill law, and the words of an action never decide a stage.

Standard library only, like the tools, and no network: the fixtures are written here.
"""
import json
import os
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'tools'))
import congress_fetch as C   # noqa: E402
import legislation as L      # noqa: E402


def bill_xml(*actions):
    """A GovInfo <bill> element with the given (date, text) actions."""
    items = ''.join(f'<item><actionDate>{d}</actionDate><text>{t}</text><type>Floor</type></item>' for d, t in actions)
    return ET.fromstring(f'<bill><number>1</number><actions>{items}</actions></bill>')


def action(day, cls, side, name, text='x'):
    """An Open States action: its date, its standard classification, and the organization (chamber) that took it."""
    return {'date': day, 'description': text, 'classification': cls, 'order': 0, 'organization': {'classification': side, 'name': name}}


class FederalPassages(unittest.TestCase):
    def test_house_passage_is_found_the_way_the_stage_is(self):
        b = bill_xml(('2025-03-01', 'Introduced in House'), ('2025-03-10', 'Passed/agreed to in House: On motion to suspend the rules and pass the bill Agreed to by voice vote.'))
        self.assertEqual(C.passages_of(b), [{'chamber': 'House', 'date': '2025-03-10'}])
        self.assertEqual(C.stage_of(b), 'one-chamber')

    def test_senate_passage_in_either_wording_counts_once(self):
        # GovInfo records a Senate passage twice: the Senate's own line and the Library of Congress's, the same day
        b = bill_xml(('2026-01-13', 'Passed Senate without amendment by Unanimous Consent.'), ('2026-01-13', 'Passed/agreed to in Senate: Passed Senate without amendment by Unanimous Consent.'))
        self.assertEqual(C.passages_of(b), [{'chamber': 'Senate', 'date': '2026-01-13'}])
        self.assertEqual(C.stage_of(b), 'one-chamber')

    def test_the_latest_date_of_a_chamber_wins(self):
        b = bill_xml(('2025-03-10', 'Passed/agreed to in House: On passage Passed.'), ('2025-09-01', 'Passed/agreed to in House: On agreeing to the Senate amendment.'))
        self.assertEqual(C.passages_of(b), [{'chamber': 'House', 'date': '2025-09-01'}])

    def test_both_chambers_give_both_entries_house_first(self):
        b = bill_xml(('2025-05-01', 'Passed/agreed to in Senate: Passed.'), ('2025-06-01', 'Passed/agreed to in House: Passed.'))
        self.assertEqual(C.passages_of(b), [{'chamber': 'House', 'date': '2025-06-01'}, {'chamber': 'Senate', 'date': '2025-05-01'}])

    def test_no_passage_gives_nothing_and_a_bad_date_is_left_out_not_guessed(self):
        self.assertEqual(C.passages_of(bill_xml(('2025-03-01', 'Referred to the Committee on Energy and Commerce.'))), [])
        self.assertEqual(C.passages_of(bill_xml(('', 'Passed/agreed to in House: Passed.'), ('03/10/2025', 'Passed House'))), [])

    def test_a_vote_that_only_mentions_passage_is_not_one(self):
        # "Motion to reconsider ... the vote by which the bill passed" and a committee's report do not pass a chamber
        b = bill_xml(('2025-03-12', 'Motion to reconsider laid on the table. The vote by which the bill passed the House.'), ('2025-03-13', 'Reported by the Committee on Rules; passed over.'))
        self.assertEqual(C.passages_of(b), [])


class StatePassages(unittest.TestCase):
    def test_the_chamber_keeps_the_legislatures_own_name(self):
        acts = [action('2025-03-20', ['passage'], 'lower', 'Assembly', 'Read third time. Passed. Ordered to the Senate.')]
        self.assertEqual(L.os_passages(acts), [('Assembly', '2025-03-20')])    # never "House": California's lower chamber is the Assembly
        self.assertEqual(L.os_passages([action('2025-03-20', ['passage'], 'lower', 'House')]), [('House', '2025-03-20')])
        self.assertEqual(L.os_passages([action('2025-03-20', ['passage'], 'upper', 'Senate')]), [('Senate', '2025-03-20')])

    def test_the_latest_passage_by_a_chamber_stands(self):
        acts = [action('2025-03-25', ['passage'], 'upper', 'Senate'), action('2025-06-10', ['passage'], 'upper', 'Senate', 'REPASSED SENATE'), action('2026-03-19', ['passage'], 'upper', 'Senate')]
        self.assertEqual(L.os_passages(acts), [('Senate', '2026-03-19')])
        self.assertEqual(L.os_passages(list(reversed(acts))), [('Senate', '2026-03-19')])   # not the order they arrive in

    def test_only_the_passage_classification_counts(self):
        acts = [action('2025-03-01', ['referral-committee'], 'upper', 'Senate'), action('2025-03-02', ['committee-passage'], 'upper', 'Senate'), action('2025-03-03', ['reading-3'], 'upper', 'Senate')]
        self.assertEqual(L.os_passages(acts), [])

    def test_nothing_is_guessed_when_the_chamber_or_the_date_is_missing(self):
        self.assertEqual(L.os_passages([action('2025-03-20', ['passage'], 'lower', '')]), [])                  # no name: the page says it is not in the data
        self.assertEqual(L.os_passages([action('March 20', ['passage'], 'lower', 'House')]), [])               # a date that does not parse
        self.assertEqual(L.os_passages([action('', ['passage'], 'lower', 'House')]), [])
        self.assertEqual(L.os_passages([{'date': '2025-03-20', 'classification': ['passage']}]), [])           # no organization at all
        self.assertEqual(L.os_passages(None), [])

    def test_a_unicameral_or_joint_action_has_no_chamber_to_name(self):
        self.assertEqual(L.os_passages([action('2025-03-20', ['passage'], 'legislature', 'Nebraska Legislature')]), [])

    def test_the_chambers_come_in_the_order_they_passed_it(self):
        senate_first = [action('2025-05-01', ['passage'], 'lower', 'Assembly'), action('2025-03-01', ['passage'], 'upper', 'Senate')]
        self.assertEqual(L.os_passages(senate_first), [('Senate', '2025-03-01'), ('Assembly', '2025-05-01')])
        self.assertEqual(L.os_passages(list(reversed(senate_first))), [('Senate', '2025-03-01'), ('Assembly', '2025-05-01')])   # not the order they arrive in
        same_day = [action('2025-05-01', ['passage'], 'upper', 'Senate'), action('2025-05-01', ['passage'], 'lower', 'House')]
        self.assertEqual(L.os_passages(same_day), [('House', '2025-05-01'), ('Senate', '2025-05-01')])                          # a tie: the lower chamber first

    def test_a_committees_vote_is_not_a_chambers_passage(self):
        # California's SCR 82: Open States classes the Assembly's "From committee: Be adopted and re-refer to Com. on APPR." as a passage too, and that is a committee's vote
        acts = [action('2025-07-10', ['amendment-passage', 'passage', 'reading-1'], 'upper', 'Senate', 'Read. Adopted. Ordered to the Assembly.'),
                action('2026-06-10', ['amendment-passage', 'committee-passage', 'committee-passage-favorable', 'passage', 'referral-committee'], 'lower', 'Assembly', 'From committee: Be adopted and re-refer to Com. on P. & C.P.'),
                action('2026-06-17', ['amendment-passage', 'committee-passage', 'committee-passage-favorable', 'passage', 'referral-committee'], 'lower', 'Assembly', 'From committee: Be adopted and re-refer to Com. on APPR.')]
        self.assertEqual(L.os_passages(acts), [('Senate', '2025-07-10')])        # the Assembly is not named: the page says the other chamber and its date are not in the data
        self.assertEqual(L.os_stage(acts, False)[0], 'both-chambers')            # the stage rule still counts it (left alone: a separate question), which is why the page can say both with one named
        # a floor passage after a committee's vote is the one that is named, and the floor passage before it is not displaced by it
        floor = acts + [action('2026-06-20', ['passage', 'reading-3'], 'lower', 'Assembly', 'Read third time. Adopted.')]
        self.assertEqual(L.os_passages(floor), [('Senate', '2025-07-10'), ('Assembly', '2026-06-20')])
        self.assertEqual(L.os_passages([action('2026-06-30', ['passage', 'reading-3'], 'lower', 'Assembly')] + acts[1:]), [('Assembly', '2026-06-30')])

    def test_a_joint_action_can_make_a_bill_both_chambers_with_only_one_chamber_to_name(self):
        # the stage rule counts a passage by the whole legislature as both chambers; it names no chamber, so the data has one entry and the page says the other is not in the data
        acts = [action('2025-03-01', ['passage'], 'lower', 'House'), action('2025-04-01', ['passage'], 'legislature', 'Legislature')]
        self.assertEqual(L.os_stage(acts, False)[0], 'both-chambers')
        self.assertEqual(L.os_passages(acts), [('House', '2025-03-01')])

    def test_it_agrees_with_the_stage_rule(self):
        # a bill is at the one-chamber stage exactly when one chamber has a passage, so every one-chamber bill has an entry
        one = [action('2025-03-20', ['passage'], 'lower', 'Assembly')]
        both = one + [action('2025-05-20', ['passage'], 'upper', 'Senate')]
        self.assertEqual(L.os_stage(one, False)[0], 'one-chamber')
        self.assertEqual(len(L.os_passages(one)), 1)
        self.assertEqual(L.os_stage(both, False)[0], 'both-chambers')
        self.assertEqual(L.os_passages(both), [('Assembly', '2025-03-20'), ('Senate', '2025-05-20')])


class FederalRows(unittest.TestCase):
    """federal_rows: a one-chamber or both-chambers row carries `passed`, merged across a bill and its identical companion, in the order the chambers passed it; other stages carry none."""

    def scan(self, *bills):
        d = tempfile.mkdtemp()
        base = {'chamber': 'House', 'introduced': '2025-01-03', 'title': 'T', 'officialTitle': '', 'last': {'date': '2025-04-01', 'text': 'x'}, 'law': '', 'committees': [], 'tier': 'title', 'terms': ['AI'],
                'summary': '', 'subjects': [], 'url': 'https://www.congress.gov/bill/119th-congress/house-bill/1', 'identical': []}
        out = [dict(base, **b) for b in bills]
        with open(os.path.join(d, 'candidates.json'), 'w') as fh:
            json.dump({'congress': 119, 'read': '2026-11-23', 'updated': '2026-11-23', 'scanned': {'hr': 1}, 'bills': out}, fh)
        return L.federal_rows(d)[0]

    def test_a_house_bill_that_passed_the_house_says_so(self):
        rows = self.scan({'kind': 'hr', 'number': '915', 'bill': 'H.R. 915', 'stage': 'one-chamber', 'passed': [{'chamber': 'House', 'date': '2026-06-24'}]})
        self.assertEqual(rows[0]['stage'], 'one-chamber')
        self.assertEqual(rows[0]['passed'], [{'chamber': 'House', 'date': '2026-06-24'}])

    def test_identical_companions_share_it_and_the_chamber_that_passed_counts(self):
        rows = self.scan(
            {'kind': 'hr', 'number': '3562', 'bill': 'H.R. 3562', 'stage': 'committee', 'passed': [], 'identical': ['s:1837']},
            {'kind': 's', 'number': '1837', 'bill': 'S. 1837', 'chamber': 'Senate', 'stage': 'one-chamber', 'passed': [{'chamber': 'Senate', 'date': '2026-01-13'}], 'identical': ['hr:3562']})
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['bill'], 'H.R. 3562; S. 1837')
        self.assertEqual(rows[0]['stage'], 'one-chamber')
        self.assertEqual(rows[0]['passed'], [{'chamber': 'Senate', 'date': '2026-01-13'}])

    def test_a_scan_from_before_the_field_existed_gives_no_chamber_rather_than_a_guess(self):
        rows = self.scan({'kind': 'hr', 'number': '993', 'bill': 'H.R. 993', 'stage': 'one-chamber'})   # no `passed` key at all, as an old copy of tools/congress_fetch.py writes it
        self.assertEqual(rows[0]['stage'], 'one-chamber')
        self.assertNotIn('passed', rows[0])

    def test_only_a_bill_at_one_of_the_two_stages_carries_it(self):
        # an enacted bill passed both chambers too, and the scan has its dates, but the page names the chambers for the two stages that are about them and for no other
        rows = self.scan({'kind': 'hr', 'number': '1', 'bill': 'H.R. 1', 'stage': 'enacted', 'law': 'Public Law 119-21', 'passed': [{'chamber': 'House', 'date': '2025-07-03'}, {'chamber': 'Senate', 'date': '2025-07-01'}]},
                         {'kind': 'hr', 'number': '2', 'bill': 'H.R. 2', 'stage': 'committee', 'passed': []},
                         {'kind': 'hr', 'number': '3', 'bill': 'H.R. 3', 'stage': 'introduced', 'passed': []})
        self.assertTrue(all('passed' not in r for r in rows))

    def test_a_bill_that_passed_both_chambers_carries_both_in_the_order_it_passed_them(self):
        # the scan saves House first, as congress_fetch.passages_of returns them; the row says which came first in time
        rows = self.scan({'kind': 'hr', 'number': '7', 'bill': 'H.R. 7', 'stage': 'both-chambers', 'passed': [{'chamber': 'House', 'date': '2026-09-01'}, {'chamber': 'Senate', 'date': '2026-06-01'}]},
                         {'kind': 'hr', 'number': '8', 'bill': 'H.R. 8', 'stage': 'both-chambers', 'passed': [{'chamber': 'House', 'date': '2026-02-01'}, {'chamber': 'Senate', 'date': '2026-05-01'}]})
        by = {r['bill']: r for r in rows}
        self.assertEqual(by['H.R. 7']['passed'], [{'chamber': 'Senate', 'date': '2026-06-01'}, {'chamber': 'House', 'date': '2026-09-01'}])
        self.assertEqual(by['H.R. 8']['passed'], [{'chamber': 'House', 'date': '2026-02-01'}, {'chamber': 'Senate', 'date': '2026-05-01'}])

    def test_a_both_chambers_bill_with_one_chamber_in_the_scan_carries_that_one_and_no_guess(self):
        rows = self.scan({'kind': 'hr', 'number': '9', 'bill': 'H.R. 9', 'stage': 'both-chambers', 'passed': [{'chamber': 'House', 'date': '2026-02-01'}]})
        self.assertEqual(rows[0]['passed'], [{'chamber': 'House', 'date': '2026-02-01'}])

    def test_merge_keeps_the_latest_date_for_a_chamber_and_ignores_bad_entries(self):
        merged = L.merge_passages([[{'chamber': 'House', 'date': '2025-03-10'}], [{'chamber': 'House', 'date': '2025-04-01'}, {'chamber': 'Senate', 'date': 'soon'}, {'chamber': 'Congress', 'date': '2025-05-01'}], None])
        self.assertEqual(merged, [{'chamber': 'House', 'date': '2025-04-01'}])

    def test_merge_puts_the_chamber_that_passed_it_first_and_the_house_first_on_a_tie(self):
        self.assertEqual(L.merge_passages([[{'chamber': 'House', 'date': '2025-04-01'}], [{'chamber': 'Senate', 'date': '2025-03-01'}]]),
                         [{'chamber': 'Senate', 'date': '2025-03-01'}, {'chamber': 'House', 'date': '2025-04-01'}])
        self.assertEqual(L.merge_passages([[{'chamber': 'Senate', 'date': '2025-04-01'}, {'chamber': 'House', 'date': '2025-04-01'}]]),
                         [{'chamber': 'House', 'date': '2025-04-01'}, {'chamber': 'Senate', 'date': '2025-04-01'}])


def act(day, cls, text, order=0, side='upper', name='Senate'):
    """An Open States action with its text and its order within the bill, for the rules that read what came AFTER an action."""
    return {'date': day, 'description': text, 'classification': cls, 'order': order, 'organization': {'classification': side, 'name': name}}


def passed_both(first='upper', second='lower'):
    """The first part of a bill's history, the same for the bills below: it passed one chamber, then the other."""
    return [act('2025-06-02', ['passage', 'reading-1', 'reading-3'], 'Read third time. Passed. Ordered to the Assembly.', 15, first, 'Senate' if first == 'upper' else 'Assembly'),
            act('2025-09-11', ['passage', 'reading-1', 'reading-3'], 'Read third time. Passed. Ordered to the Senate.', 30, second, 'Assembly' if second == 'lower' else 'Senate')]


def california_sb7():
    """California SB 7 as Open States has it, trimmed to what the stage rule reads: it passed both chambers, the Governor vetoed it on 2025-10-13, and the veto was sustained on 2026-03-02.
    Open States classes the veto, and gives the three lines after it no class at all. Listed at Passed both chambers until 2026-11-24 (found by a scan of the page's data on 2026-11-23)."""
    return passed_both() + [
        act('2025-09-12', ['amendment-passage', 'committee-passage', 'committee-passage-favorable'], 'Assembly amendments concurred in. Ordered to engrossing and enrolling.', 32),
        act('2025-09-23', ['executive-receipt'], 'Enrolled and presented to the Governor at 2 p.m.', 33, 'legislature', 'California State Legislature'),
        act('2025-10-13', ['executive-veto'], 'Vetoed by the Governor.', 34),
        act('2025-10-13', [], "In Senate. Consideration of Governor's veto pending.", 35),
        act('2026-03-02', [], 'Stricken from file.', 36),
        act('2026-03-02', [], 'Veto sustained.', 37)]


class VetoesThatStand(unittest.TestCase):
    """A bill the governor vetoed outright is failed (not listed) unless something after the veto shows the legislature acting on it again. The rule reads Open States' classification of each
    action, wherever it sits in the history: it used to look only at the bill's LAST action, so a veto hid behind any later line Open States gives no class (os_veto_stands, os_stage)."""

    def test_a_sustained_veto_ends_the_bill_even_with_unclassified_lines_after_it(self):
        acts = california_sb7()
        self.assertTrue(L.os_veto_stands(acts))
        self.assertEqual(L.os_stage(acts, False), ('failed', False))
        # what the veto is responsible for: the same bill without it passed both chambers and is live
        before = [a for a in acts if a['date'] < '2025-10-13']
        self.assertEqual(L.os_stage(before, False), ('both-chambers', True))

    def test_a_pending_veto_ends_the_bill_too(self):
        # California SB 903: "In Senate. Consideration of Governor's veto pending." is the last line. The veto is not final, but a bill the Governor vetoed the same day with no such line (AB 2575) is
        # already failed by the same classification, and the page's definition lists "vetoed" among the ways a bill fails; an override later (class veto-override-passage) makes it law again.
        acts = california_sb7()[:-2]
        self.assertEqual(acts[-1]['description'], "In Senate. Consideration of Governor's veto pending.")
        self.assertTrue(L.os_veto_stands(acts))
        self.assertEqual(L.os_stage(acts, False), ('failed', False))
        self.assertEqual(L.os_stage(acts + [act('2026-11-25', ['veto-override-passage'], 'Veto overridden.', 40)], False), ('enacted', True))

    def test_a_veto_followed_by_tabled_ends_the_bill(self):
        # New York A 3411: "VETOED MEMO.10", then "TABLED", which Open States classes "amendment-deferral". Its last action says nothing about a veto.
        acts = [act('2026-01-28', ['passage'], 'PASSED ASSEMBLY', 11, 'lower', 'Assembly'), act('2026-03-09', ['passage'], 'PASSED SENATE', 16, 'upper', 'Senate'),
                act('2026-11-13', ['executive-receipt'], 'DELIVERED TO GOVERNOR', 18, 'lower', 'Assembly'),
                act('2026-11-20', ['executive-veto'], 'VETOED MEMO.10', 19, 'lower', 'Assembly'), act('2026-11-20', ['amendment-deferral'], 'TABLED', 20, 'lower', 'Assembly')]
        self.assertEqual(L.os_stage(acts, False), ('failed', False))
        self.assertEqual(L.os_stage(acts[:3], False), ('both-chambers', True))

    def test_a_veto_that_is_the_last_action_still_ends_it_as_before(self):
        acts = passed_both() + [act('2026-09-30', ['executive-veto'], 'Vetoed by Governor.', 28)]     # California AB 2575: nothing after the veto
        self.assertEqual(L.os_stage(acts, False), ('failed', False))
        sustained = passed_both() + [act('2025-10-06', ['executive-veto'], 'Vetoed by Governor.', 26), act('2025-10-06', [], "Consideration of Governor's veto pending.", 27),
                                     act('2026-01-22', ['veto-override-failure'], "Consideration of Governor's veto stricken from file.", 28)]     # AB 1064
        self.assertEqual(L.os_stage(sustained, False), ('failed', False))

    def test_a_failed_override_is_enough_on_its_own_and_survives_a_line_after_it(self):
        # the veto itself is not classified in this feed, but the failed vote to override it is: the source says the veto stands
        acts = passed_both() + [act('2026-04-02', ['veto-override-failure'], "House sustained Governor's veto", 45, 'lower', 'House'), act('2026-04-03', [], 'Passed by for the day', 46)]
        self.assertTrue(L.os_veto_stands(acts))
        self.assertEqual(L.os_stage(acts, False), ('failed', False))

    def test_an_override_or_a_signature_after_the_veto_makes_it_law(self):
        veto = passed_both() + [act('2026-03-06', ['executive-veto'], 'Vetoed', 21)]
        self.assertEqual(L.os_stage(veto + [act('2026-03-09', ['veto-override-passage'], 'veto overridden', 26, 'lower', 'House')], False), ('enacted', True))
        self.assertEqual(L.os_stage(veto + [act('2026-03-20', ['executive-signature'], 'Signed by the Governor', 27, 'executive', 'Governor')], False), ('enacted', True))
        self.assertEqual(L.os_stage(veto + [act('2026-03-20', ['became-law'], 'Became law without signature', 27, 'executive', 'Governor')], False), ('enacted', True))
        for tail in ([act('2026-03-09', ['veto-override-passage'], 'veto overridden', 26)], [act('2026-03-20', ['executive-signature'], 'Signed', 27)]):
            self.assertFalse(L.os_veto_stands(veto + tail))

    def test_a_chamber_passing_the_bill_again_after_the_veto_means_it_is_not_over(self):
        # the legislature acted on it after the veto (an override recorded as a passage, or agreeing to changes): the rule cannot say the veto stands, so the bill keeps the stage its actions give it
        acts = california_sb7()[:6] + [act('2026-03-02', ['passage'], 'Passed notwithstanding the objections of the Governor.', 36)]
        self.assertFalse(L.os_veto_stands(acts))
        self.assertEqual(L.os_stage(acts, False), ('both-chambers', True))

    def test_a_passage_before_the_veto_does_not_revive_it(self):
        acts = california_sb7()
        self.assertTrue(any('passage' in a['classification'] and a['date'] < '2025-10-13' for a in acts))
        self.assertTrue(L.os_veto_stands(acts))

    def test_a_conditional_veto_does_not_end_the_bill(self):
        # New Jersey: "Conditional Veto, Received in the Assembly" is the governor asking for changes, which the legislature may agree to. Open States classes it "executive-veto" all the same.
        acts = [act('2024-06-28', ['passage'], 'Passed Assembly (60-14-1)', 6, 'lower', 'Assembly'), act('2025-01-30', ['passage'], 'Passed Senate (Passed Both Houses) (37-0)', 9, 'upper', 'Senate'),
                act('2025-03-17', ['executive-veto'], 'Conditional Veto, Received in the Assembly', 10, 'lower', 'Assembly'), act('2025-03-17', [], 'First Reading/Governor Recommendations Only', 11, 'lower', 'Assembly')]
        self.assertFalse(L.os_veto_stands(acts))
        self.assertEqual(L.os_stage(acts, False), ('both-chambers', True))          # kept at the stage it has, never guessed
        agreed = acts + [act('2025-03-24', ['passage'], 'Passed Assembly (64-13-0)', 13, 'lower', 'Assembly'), act('2025-03-24', ['passage'], 'Passed Senate (Passed Both Houses) (39-0)', 15, 'upper', 'Senate')]
        self.assertEqual(L.os_stage(agreed, False), ('both-chambers', True))
        self.assertEqual(L.os_stage(agreed + [act('2025-04-02', ['executive-signature'], 'Approved P.L.2025, c.40.', 16, 'executive', 'Governor')], False), ('enacted', True))
        self.assertFalse(L.os_veto_stands([act('2025-03-17', ['executive-veto'], 'Amendatory Veto', 10)]))

    def test_a_line_item_or_partial_veto_does_not_end_the_bill(self):
        # Ohio's "line item veto receipt" is classed "executive-veto" by Open States, and the bill is law without the vetoed items; Open States' own class for these is "executive-veto-line-item"
        for cls, text in ((['executive-veto'], 'line item veto receipt'), (['executive-veto'], 'Line item veto receipt'), (['executive-veto-line-item'], 'Vetoed in Part by Governor (G)'),
                          (['executive-veto'], 'Governor partially vetoed.'), (['executive-veto-line-item'], 'Governor Line Item Veto')):
            acts = passed_both() + [act('2025-12-23', cls, text, 18)]
            self.assertFalse(L.os_veto_stands(acts), text)
            self.assertEqual(L.os_stage(acts, False), ('both-chambers', True), text)

    def test_words_alone_never_decide_a_stage(self):
        # a veto Open States did not classify is not found: the text "Veto sustained." with no classified veto before it leaves the bill at the stage its actions give it
        acts = passed_both() + [act('2026-03-02', [], 'Veto sustained.', 37), act('2026-03-03', [], 'Vetoed by Governor', 38)]
        self.assertFalse(L.os_veto_stands(acts))
        self.assertEqual(L.os_stage(acts, False), ('both-chambers', True))

    def test_the_order_the_feed_lists_the_actions_in_does_not_matter(self):
        acts = california_sb7()
        for variant in (list(reversed(acts)), acts[3:] + acts[:3], sorted(acts, key=lambda a: a['description'])):
            self.assertTrue(L.os_veto_stands(variant))
            self.assertEqual(L.os_stage(variant, False), ('failed', False))
        # within one day Open States' own order decides what came after the veto
        veto_then_pass = passed_both() + [act('2025-10-13', ['passage'], 'Passed notwithstanding the objections of the Governor.', 36), act('2025-10-13', ['executive-veto'], 'Vetoed by the Governor.', 35)]
        self.assertFalse(L.os_veto_stands(veto_then_pass))
        pass_then_veto = passed_both() + [act('2025-10-13', ['passage'], 'Re-enrolled.', 34), act('2025-10-13', ['executive-veto'], 'Vetoed by the Governor.', 35)]
        self.assertTrue(L.os_veto_stands(pass_then_veto))

    def test_a_bill_with_no_veto_is_placed_as_before(self):
        self.assertEqual(L.os_stage(passed_both(), False), ('both-chambers', True))
        self.assertEqual(L.os_stage(passed_both()[:1], False), ('one-chamber', True))
        self.assertEqual(L.os_stage([act('2025-02-01', ['referral-committee'], 'Referred to committee.')], False), ('committee', True))
        self.assertEqual(L.os_stage([act('2025-01-01', ['introduction'], 'Introduced.')], False), ('introduced', True))
        self.assertEqual(L.os_stage(None, False), ('introduced', True))
        self.assertFalse(L.os_veto_stands(None))
        self.assertFalse(L.os_veto_stands(passed_both()))

    def test_the_other_endings_that_read_the_last_action_still_end_a_bill(self):
        for cls in (['failure'], ['withdrawal'], ['committee-failure']):
            self.assertEqual(L.os_stage(passed_both() + [act('2026-02-01', cls, 'x', 40)], False), ('failed', False), cls)
        # an ended session fails a bill that did not become law, and a bill that did is law whatever the session did
        self.assertEqual(L.os_stage(passed_both(), True), ('failed', False))
        self.assertEqual(L.os_stage(passed_both() + [act('2026-02-01', ['became-law'], 'Chaptered', 40)], True), ('enacted', True))

    def test_a_failure_in_the_middle_of_a_history_is_not_an_ending(self):
        # Open States classes California's "Withdrawn from committee." as "withdrawal", and a floor vote's "Refused passage" as "failure", and a bill carries on after either (a motion to
        # reconsider, a re-referral): only the LAST action decides these, so only a veto is read wherever it sits
        acts = passed_both() + [act('2025-09-13', ['failure'], 'Read third time. Refused passage.', 31), act('2025-09-13', [], 'Motion to reconsider made by Assembly Member.', 32)]
        self.assertEqual(L.os_stage(acts, False), ('both-chambers', True))

    def test_a_vetoed_bill_is_counted_and_not_written(self):
        # the whole path through the build's reader of the cache: a bill whose veto stands is left out of the rows and counted with the failed ones; the bill beside it is written
        root = tempfile.mkdtemp()
        os.makedirs(os.path.join(root, 'bills', 'ca', '20252026'))

        def bill(ident, actions):
            return {'id': 'ocd-bill/' + ident, 'identifier': ident, 'title': 'Artificial intelligence', 'actions': actions, 'abstracts': [], 'subject': [], 'sources': [], 'openstates_url': f'https://openstates.org/ca/bills/20252026/{ident}/',
                    'latest_action_date': actions[-1]['date'], 'latest_action_description': actions[-1]['description']}
        with open(os.path.join(root, 'jurisdictions.json'), 'w') as fh:
            json.dump([{'id': 'ocd-jurisdiction/country:us/state:ca/government', 'legislative_sessions': [{'identifier': '20252026', 'name': '2025-2026 Regular Session', 'end_date': '2026-11-30'}]}], fh)
        with open(os.path.join(root, 'bills', 'ca', '20252026', 'artificial-intelligence-p1.json'), 'w') as fh:
            json.dump({'pagination': {'max_page': 1}, 'results': [bill('SB 7', california_sb7()), bill('SB 9', passed_both())]}, fh)
        rows, dead, found = L.os_rows(root, '2026-11-24', ['artificial intelligence'])
        self.assertEqual([(r['bill'], r['stage']) for r in rows], [('SB 9', 'both-chambers')])
        self.assertEqual((dead, found), (1, 2))


class ListedWithAVeto(unittest.TestCase):
    """The net under the rule: the build says so when a bill that is listed, and not law, mentions a veto in its latest action."""

    def test_it_names_the_bills_that_are_listed_and_not_law(self):
        rows = [{'state': 'CA', 'bill': 'SB 903', 'stage': 'both-chambers', 'text': "In Senate. Consideration of Governor's veto pending."},
                {'state': 'NJ', 'bill': 'A 1', 'stage': 'both-chambers', 'text': 'Conditional Veto, Received in the Assembly'},
                {'level': 'federal', 'bill': 'H.R. 5', 'stage': 'both-chambers', 'lastAction': {'date': '2026-01-05', 'text': 'Vetoed by President.'}}]
        self.assertEqual(L.listed_with_a_veto(rows), ['CA SB 903', 'NJ A 1', 'H.R. 5'])

    def test_a_bill_that_is_law_or_says_nothing_of_a_veto_is_not_named(self):
        rows = [{'state': 'KS', 'bill': 'HB 2513', 'stage': 'enacted', 'text': 'Motion to override line item veto prevailed'},
                {'state': 'CA', 'bill': 'SB 1', 'stage': 'committee', 'text': 'From committee: Do pass.'},
                {'state': 'NY', 'bill': 'A 3411', 'stage': 'committee', 'text': ''},
                {'level': 'federal', 'bill': 'H.R. 6', 'stage': 'committee'}]
        self.assertEqual(L.listed_with_a_veto(rows), [])


if __name__ == '__main__':
    unittest.main(verbosity=2)
