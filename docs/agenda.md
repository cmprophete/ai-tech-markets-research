# The Brief tab

The Brief tab is an excerpt of Becky Chao's April 2026 brief, **Ideas for Shared Economic Prosperity in the AI Transition**,
made readable and interactive. It was called **Agenda** until 2026-11-19 and was a "Coming soon" placeholder until that day,
when the owner asked for the brief (a PDF) to be added to the page, "engaging and interactive". She had it renamed the same
day (the name Agenda had promised a list of the team's commitments, which this page is not). The view key and every internal
name still say `agenda` (`#agendaArea`, `35-agenda.js`, `agenda.css`, `data/agenda-data.js`, `AGENDA_DATA`, this file's name),
as the Landscape's still say `policy`; only what a reader sees and the address changed.

| File | What it holds |
|---|---|
| `data/agenda-data.js` | The brief: its paragraphs, headings, list items and notes (less the cuts, see "Left out" below), plus the few things that are ours. Hand-maintained, loaded with the page (about 38 KB), not touched by any sync. |
| `src/js/35-agenda.js` | Draws the page once, on first open (`buildAgenda`, called from `setView`), and does everything the reader can do. `agendaGo` is the router's `#brief/<section>` route. `agendaMasthead` and `agendaMastheadHTML` are the masthead's standfirst. |
| `src/styles/agenda.css` | The page's styles, scoped to `#agendaArea`. |
| `src/views/40-agenda.html` | An empty `#agendaRoot`, with the note shown only if the data did not load. |
| `tests/interactions.js` | The block "Brief (view key agenda): Becky Chao's brief": about 65 checks. |

## What the reader can do

- **Know where it is pulled from, and find the whole paper.** The standfirst under the question is the owner's own sentence:
  "Pulled from Becky Chao's April 2026 brief, *Ideas for Shared Economic Prosperity in the AI Transition*, below are four
  pathways, from modernizing the social contract to mitigating AI's role in exacerbating the affordability crisis. Open an idea
  to read it, and any footnote number to see its source." The brief's title is the link to the full paper on the Economic
  Security Project's website (`url` in the data file, given by the owner on 2026-11-19; with no `url` the title is plain text).
  It is the one standfirst with a link in it: a tab can give `html` as well as `text` in `TAB_DESCS`, and `applyMastheadCopy`
  writes the `html` as markup; every other tab's stays plain text.
- **Open an idea.** Each of the brief's eight ideas is an accordion row. Closed, it shows its title and the brief's own
  first sentence; open, the text. There is no expand-all button (taken out at the owner's request), so, as in any accordion,
  the browser's find-in-page does not see closed text until it is opened.
- **See a source without leaving the sentence.** A footnote number is a button that opens that note in a drawer under its
  paragraph, with every web address linked. One drawer is open at a time; Escape or Close shuts it, and focus goes back to
  the number. It is a drawer and not a tooltip because a tooltip cannot be reached by keyboard or pressed reliably on a phone.
  The Sources list at the end holds every note the page cites, numbered as the brief numbers them, each with "See in the
  text", which opens the idea, opens the source and marks the paragraph for a moment.
- **Open a policy card.** Under each idea (and under each of the first idea's four emerging ideas) a row "On the Landscape"
  holds buttons that open the policy dialog over the page. See "What is ours" below.

**Every section has an address** (`#brief/<id>`: a pathway such as `workers`, an idea such as `wage-setting`, or
`sources`), so one can be linked to or opened in a new tab: the router opens the idea if it is one and scrolls there, and a
bad id opens the Brief and goes back to `#brief`. The old addresses still work: `#agenda` and `#agenda/<section>` land on the
Brief and the address bar is rewritten to `#brief` and `#brief/<section>`. A source drawer's "All sources" link is the one
in-page link: it scrolls (smoothly, unless the device asks for less motion) and rewrites the address in place instead of adding
history.

**The page is the ideas alone.** Under the masthead it opens on the four pathways with their idea rows, then the Sources
that back their footnotes. There is no nav and no expand-all button. On 2026-11-19 the owner had these taken out, so please
do not put them back unasked: the row of four pathway cards; the "How this page is built" note; the bar of jump pills (one
per pathway and one for the Sources, with scroll tracking), after she asked whether a nav was needed at all (with the ideas
closed the page is short, and the other reading page, About, has none; a copy of the bar version is in the shared notes folder,
`agenda-brief-extraction-2026-11-19/with-the-jump-bar/`); the note box that said the page was an excerpt (its words became the
standfirst's); the word "Introduction"; the whole introduction, in steps (see "Left out"); the conclusion; and the "Expand all
ideas" button (a copy of the script with it is in the same folder, `35-agenda.with-expand-all.js`).

## The brief's words are the author's

Every paragraph, heading, list item and note in `data/agenda-data.js` is the brief as published, character for character.
**Do not reword, shorten, copyedit, fix spelling, grammar or spacing, re-curl a quote, or add a link, a number or an
emphasis she did not write.** If something looks wrong, tell the author and report it; do not resolve it here. The same
rule as the policy cards' prose ([`policy-card-rules.md`](policy-card-rules.md)).

A test pins the words: `BRIEF_FINGERPRINT` in `tests/interactions.js` is a SHA-256 of the brief's own words only (title,
date, author, every idea's heading, paragraph and list item, and every note, in order), and nothing of ours. Every other
check compares the page with the data file, so a changed word in the file would pass them all; this one would not. If it
fails, someone changed her words.

Things in the brief that look odd and are kept as published:

- `families.The` in the first idea: the PDF has no space there. The only one of its kind.
- Notes 23 and 30 use straight quotation marks; the others use curly ones.
- In the public-AI idea the footnote mark comes before the full stop (`SB 53 in 2025[^30].`).
- Notes 24 and 25: the PDF's link target says `http://aflcio.org/...` and its visible text says `https://`. The page links
  the visible text.

### Left out, at the owner's request

On 2026-11-19 the owner had the **conclusion** (one paragraph, "AI is rapidly developing and becoming increasingly integrated
into our society...", which cites no note) and the **whole introduction** taken out, so the page is the ideas alone. The
introduction went in steps: first its **first three paragraphs** ("Artificial Intelligence (AI) is transforming our
economy...", "At the same time, the rush to build AI tools and systems comes with real costs...", "People are rightfully
nervous about AI...") and, with them, **notes 1 to 11**, which only those paragraphs cite; then everything but three pieces she
chose (the first sentence of the paragraph the author opens in bold, "Ultimately, how society builds AI...", the paragraph that
begins "Given the universal uncertainty...", and the second and third sentences of the paragraph that begins "This brief lays
out...", "These ideas require additional analysis..."), with **notes 12 and 13**, which only the text cut then had cited; then
those three pieces too. Nothing was renumbered: the brief's own footnote numbers are kept, so the page's notes run from 14 to
57 (44 of them) and the first footnote a reader sees is 14. A test pins the cuts, so a merge or a "restore it from the PDF"
cannot quietly bring any of it back.

The complete version, as read from the PDF, is in the shared notes folder
(`agenda-brief-extraction-2026-11-19/agenda-data.FULL-before-the-cut-2026-11-19.js`). The same folder has the file at each step:
`agenda-data.before-the-conclusion-cut-2026-11-19.js` (conclusion still in), `agenda-data.before-the-intro-change-2026-11-19.js`
(the four-paragraph introduction) and `agenda-data.with-the-three-paragraph-intro-2026-11-19.js` (the three pieces she chose).
To put any of it back, take it from there, then update the fingerprint and the "left out" test.

### How the words were read

By script, never retyped. The scripts are in the shared notes folder, `~/Library/Application Support/Claude/side-session-notes/agenda-brief-extraction-2026-11-19/`
(with a README on the order to run them); they need `pdfplumber` and macOS PDFKit and are not in the repo.

1. `pdfplumber` gave every character with its font, size, colour and position, and the PDF's link boxes. Bold, italic, the
   raised footnote numbers and the green link text come from the document, not from a guess.
2. The result was compared with a second extraction (PDFKit) in both directions. Every block and note is found in it, and
   what is left of each reference page is only its page number (and the bullet glyphs): nothing missing, nothing extra.
   Spacing was compared too; the only differences are line breaks inside a URL (no space, by design) and one place where
   PDFKit adds a space inside `U.S.-based` that the PDF's characters do not have.
3. Every web address in a note is a link in the PDF, and the other way round (96 link boxes, 61 addresses); the page links any
   address it finds in a note, and the check that this equals the PDF's own links passed for all 57 notes (before the cut).
4. Two things the PDF does across a page were joined: the paragraph that stops at "grid operator" and carries on "PJM will
   pay...", and notes 6 and 24, which continue at the top of the next page's note block.
5. The data file, loaded as the page loads it, equalled the checked extraction text for text (42 blocks, 57 notes, 57 marks in
   order, each cited once) before the cuts above.

## What is ours

Marked in the data file's header: `url` (the paper's own page on the Economic Security Project's website), the short pathway
labels (Social contract, Workers, Markets, Affordability), the Landscape `area` each pathway is shown under, the ids, each
idea's `lede` (its opening sentence, which the tests check is a word-for-word prefix of its first paragraph), and every
`related` list.

## The masthead

The question is **"How do we make sure AI benefits everyone?"** and the standfirst is built in `agendaMasthead()` (plain
text) and `agendaMastheadHTML()` (the same with the link): *Pulled from Becky Chao's April 2026 brief, Ideas for Shared Economic
Prosperity in the AI Transition, below are four pathways, from modernizing the social contract to mitigating AI's role in
exacerbating the affordability crisis. Open an idea to read it, and any footnote number to see its source.* The standfirst is
the owner's own sentence (her message of 2026-11-19, with the title as the link); the question was written the same day at her
request ("a better question and blurb considering the content"; the question was "What is our policy agenda?"). The question
is the brief's own aim (AI "built to benefit all Americans, not just a select few"), and the two ends of the range are the
brief's words for its first and last pathway. The author, the month, the title and the number of pathways are computed from the
data; there is no count of ideas or sources in it, because the owner has kept counts out of mastheads before and the Sources
row shows that one. The page has no title block of its own, so the standfirst is where the brief's title is named.

The four pathways are the Landscape's four areas in the Landscape's order: the comment above `.pol-cat-rows` in
`src/styles/policy.css` says so, and a test pins it. Each pathway therefore wears its area's colour.

The `related` lists ("On the Landscape") were drafted on 2026-11-19 from the policy cards' titles and summaries, and have
**not been reviewed by the owner**. They are our reading of which cards cover the same ground; they are not the brief's, and
the row's label is the only thing on the page that says so (a note at the foot that said it was taken out at the owner's
request). The data-centre energy idea has no card on the Landscape, so it has no row. A card that is archived or renamed
drops out of its row, and a typo in an id fails the tests.

## Updating when the author revises the brief

1. Read the new version into a new data file exactly as above (the scripts are in the notes folder). If the structure
   changed (a new pathway or idea), the labels, areas, ids, opening lines and pointers at the top of `agenda_build_data.py`
   need revisiting; the brief's words are never edited by hand. Then apply the owner's cuts again (the list above).
2. Replace `data/agenda-data.js`, then recompute the fingerprint and put it in `tests/interactions.js` (`BRIEF_FINGERPRINT`):

   ```sh
   node -e "const fs=require('fs'),vm=require('vm'),c=require('crypto');const x={};vm.createContext(x);vm.runInContext(fs.readFileSync('data/agenda-data.js','utf8')+'\nthis.A=AGENDA_DATA;',x);const A=x.A;const b={title:A.title,date:A.date,author:A.author,pathways:A.pathways.map(p=>({title:p.title,ideas:p.ideas.map(i=>({title:i.title,blocks:i.blocks.map(b=>b.p?{p:b.p}:{list:b.list.map(it=>({lead:it.lead,text:it.text}))})}))})),notes:A.notes};console.log(c.createHash('sha256').update(JSON.stringify(b)).digest('hex'))"
   ```

3. Run `node tests/interactions.js`. No `python3 build.py` is needed for a data change.

## Decisions worth knowing

- The data loads with the page (a script tag in `src/views/00-data-scripts.html`), not lazily: about 38 KB, and it keeps the
  page and its tests synchronous. The text is drawn only when the tab first opens.
- Text goes through `escapeHTML` and three marks (`**bold**`, `*italic*`, `[^n]`) and nothing else; the data's tests check
  the text holds no asterisk or `[^` of its own.
- About's Policy section said "Our own policy agenda is coming soon." until the rename. That sentence was replaced, then the
  replacement was taken out at the owner's request (2026-11-19), so About's text does not mention the Brief. The section's
  links still end with a "Brief" link before "Landscape" (the owner's page: change or remove it freely).
