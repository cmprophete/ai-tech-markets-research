# Paper summaries

What a Papers row shows when it is opened. A paper listed in `data/paper-summaries.js` shows a
summary: a one-sentence lede, a paragraph, and optionally a "Take note" paragraph. Every other paper
still shows its key finding and bullets. The format was piloted on twelve papers; on 2026-11-11 it was
decided to draft the rest (see "Rollout" below). Every summary is an unreviewed draft.

## Where it lives, and why

`data/paper-summaries.js` is hand-maintained, like `data/fact-bank-data.js`. It is deliberately **not**
in the Google Sheet or `content/research.csv`: the daily sync rebuilds `RESEARCH_DATA` from the Sheet,
so anything kept only in the repo's copy would be wiped, and the Sheet's `extra_json` column is
machine-managed. To adopt the format permanently, add a `summary` column to the Sheet and map it in
`tools/research.py`; until then, `00-state.js` attaches each entry of `PAPER_SUMMARIES` to its paper
as `entry.summary`. Only papers that are not archived in the Sheet get an entry: an archived paper is
not in `RESEARCH_DATA`, and the console validator flags a summary whose paper is missing.

```js
const PAPER_SUMMARIES = {
  100: {
    lede:     "One sentence: the central claim or finding.",
    body:     "What the authors did and found.",
    note:     "Optional. How much weight the evidence can bear.",
    basis:    "full text",          // or "abstract only"
    basisNote: "the arXiv version", // optional: what exactly was read
    written:  "2026-11-11",
    reviewed: null,                 // a date once a person has checked it against the source
    model:    "claude-sonnet-5-5",
  },
};
```

## The rules

1. **Read the source.** Write from the full text. If only an abstract is reachable, set `basis` to
   `"abstract only"`, write the lede and a short body, and leave `note` out (the console validator
   flags an abstract-only summary that has one). Never write from memory or from coverage of the paper.
2. **Three jobs, no overlap.** The lede is the claim. The body is what the authors did and found, and
   does not repeat the lede. The note is how much weight it can bear: the authors' own limits, and what
   kind of evidence it is. A short news piece can have no note.
3. **Budget.** Lede 35 words, body 75, note 60. About 150 words in all, which is today's median row.
4. **No result figures** (percentages, dollar amounts, effect sizes, growth rates, rankings): they are
   quoted and rated in the Fact Bank, and a paraphrase here would be a second, unrated copy. Design
   descriptors are fine when the paper states them: sample size, number of cases, years covered.
5. **Voice.** Neutral third person. Paraphrase. Attribute judgments to their owner ("the authors
   argue"). No em-dashes.
6. **Provenance is shown.** Every summary ends "Summary written from the full text. Draft, not yet
   reviewed." (with `basisNote` in brackets after the basis when what was read needs saying). Set `reviewed` only when a person has checked each claim against the source; the line
   then reads "Reviewed" with the date.

## Review checklist

- Does every claim trace to the source? Check it against the full text, not the abstract; `basisNote` says what the writer actually read.
- Does the lede say something the body does not just repeat?
- Is there a figure, a ranking or a causal word the source does not support?
- Does the note describe limits the authors state (or the kind of evidence), not our own opinion?
- Search finds the paper by words in the summary, and no longer by words in its old bullets.

## Rollout (decided 2026-11-11)

The owner decided to draft summaries for every paper that is not archived. How it was done, so it can be
continued or repeated:

1. **Fetch the source once, centrally.** Each paper's link was fetched with curl and a browser
   User-Agent and its text saved to disk (HTML through bs4, PDFs through pypdf). A short landing page
   that links to the paper's own PDF got that PDF as a second file; a wrong guess (a cited contract, bill
   or court filing) was removed. Pages that refused automated requests were read by a separate writer
   in a browser through the browser tools, which never clicks past a bot check, login or paywall.
2. **One writer per three or four papers**, reading the saved text from disk and following the rules
   below, with a brief of its own. Every summary comes with 3 to 15 word anchor phrases copied from the
   text it read; a script checks each phrase really is in the saved text, so a summary cannot rest on
   memory. A validator checks the budgets, em-dashes and result figures (percentages, dollar amounts,
   figures in words) before anything is merged.
3. **Independent audit of a random sample.** A second reader checks every sentence of each sampled
   summary against the source text and labels it supported, overstated, unsupported or misattributed.
   The first sample, 8 summaries: 6 passed outright, 2 had one slightly overstated sentence (both
   fixed), none had an unsupported or misattributed claim, a figure, or a wrong basis.
4. **Merge only live papers.** An entry is written only if the paper is in `RESEARCH_DATA` and is not
   archived in the Sheet when the merge runs. A draft for a paper that was archived in the meantime is
   parked, not merged.

Where it stands (2026-11-11): 54 summaries, the 12 pilot entries and 42 from the rollout. The rest of the
non-archived papers still show their key finding and bullets. Writers also flag any place where a
document disagrees with its tracker row (author, title, date, or a link that opens a different piece);
those are listed for the Sheet and are not fixed in this file.

## What is not part of the rollout

A match snippet for searches that hit a closed row, lazy-loading the summaries, and the Sheet column.
The summaries are loaded with the rest of the data on every view: 54 entries are 66 KB, and a summary
for every paper would be roughly 240 KB, so lazy-loading (like the Fact Bank context) becomes worth doing
before the last batch lands. It would affect search, which reads the summary text, so it waits for a
decision.
