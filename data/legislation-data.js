/* data/legislation-data.js: what the Legislation tab shows besides the state outlines. Hand-maintained, like data/fact-bank-data.js. It
   loads at runtime, so a change needs only a reload, not a build.

   LEGISLATION_DATA is one row per bill. It starts empty. The bills themselves are in data/legislation-bills.js, which tools/legislation.py
   generates from GovInfo's bill-status data (the federal bills: tools/congress_fetch.py scans it for AI) and Open States (state bills, found
   by full-text searches: tools/openstates_fetch.py says for which phrases), and which the tab fetches the first time it opens, adding its
   rows to this list. Nothing else is
   listed rather than guessed: a bill from any other source goes in by hand, as a row pushed onto this list from a file loaded after this
   one. A row:

     id          a short unique key, for example "tx-hb-123"
     level       "state" or "federal" (a bill with no state is federal)
     state       the USPS code of a state bill, for example "TX", or of a territory (LEGISLATION_TERRITORIES below); leave it out for a federal bill
     bill        the bill number as the legislature writes it, for example "HB 123" or "H.R. 1234"
     title       the bill's official title
     stage       where it is in the process: a key of LEGISLATION_STAGES below. The page decides what is active from this
     status      the source's own words for where it stands, for example "Referred to Senate Commerce"     (optional)
     session     the session it belongs to: a year (2025, shown as "2025 session") or a name ("119th Congress")     (optional)
     topics      the source's own category labels, as a list, for example ["Transparency", "Liability"]            (optional)
                 (the page's own Topic filter is separate: LEGISLATION_TOPICS below, worked out from each bill's text)
     subjects    the legislature's own subject index terms, as a list, as it wrote them                          (optional)
     passing     true when the bill only mentions AI in its text, not its title or summary: hidden until the checkbox "Include bills that only lightly mention AI" (beside the Status menu) is on  (optional)
     summary     what it would do: the legislature's own summary where it gives one, else our own words        (optional)
     lastAction  { date: "2026-03-01", text: "Referred to committee" }                      (optional)
     passed      [{ chamber: "House", date: "2026-03-01" }]                                   (optional; only for a bill at the one-chamber or both-chambers stage: each chamber that passed it, as the
                 source names it ("House", "Senate", or a state's "Assembly"), and the day, in the order they passed it. The Status column shows it: "Passed House, March 1, 2026", or for a bill that
                 passed both "Passed Senate, May 19, 2026; Assembly, August 30, 2026". A bill at either stage with less than the stage means (no chamber, or one of two) is shown with a line saying
                 what is not in the data, never with a guess)
     source      { label: "Legislature", url: "https://..." }                                (optional)

   A field the source does not give is left out, and the page shows an en dash for it, never a guess; a column that is empty for every
   bill in view (the federal bills have no last action, the state bills no summary) is left out of the table. The bill count in the
   masthead, the map's shading and the tables are all computed from this list.

   ACTIVE: a bill is active when it has been introduced and has not failed (the owner's definition, 2026-11-12). Which
   stages count is the `active` flag on each entry of LEGISLATION_STAGES, so changing the rule is a one-word edit there:
   for example, set it to false on "enacted" to leave enacted bills out of the active list. Only active bills are listed;
   a bill whose stage is failed, or missing, is kept in this file but not listed, and a note under the table says how
   many were left out and why. Federal bills (Congress) and state bills share one list and one definition.

   The 2026 midterm results (the Associated Press's Senate, House and governor results by state, which MIDTERM_RESULTS, MIDTERM_SOURCES, MIDTERM_PAGES, MIDTERM_NOTE and MIDTERM_NATIONAL held here) were removed on
   2026-11-23, at the owner's request, and the page no longer shows them anywhere. A copy of that data is in the shared notes folder (midterm-results-removed-2026-11-23). */
const LEGISLATION_DATA = [];

// The places other than the 50 states and DC that can have bills. They have no shape on the map, so the Show menu and the tables are
// their only way in. Open States covers Puerto Rico and none of the other territories; add one here when a source covers it.
const LEGISLATION_TERRITORIES = { PR: 'Puerto Rico' };

/* STAGES, and the ORDER OF PROGRESS. `rank` is the one place that says how far along a stage is, and it is what the page sorts by: the Status column's sort (click its header, or choose it in the Sort
   menu: least progress first, or furthest along first), the Status menu's order and the stats bar's order all read it, so a bill is never put in an order by the spelling of its stage. Alphabetical would be
   wrong: it puts "Enacted" before "In committee" and before "Passed one chamber", the opposite of what the stages mean (the owner's feedback, 2026-11-23: Committee, then Passed, then Enacted).
   1 Introduced, 2 In committee, 3 Passed one chamber, 4 Passed both chambers, 5 Enacted. A bill that failed (it died in committee, was vetoed or withdrawn, or its session ended) has rank 0, below every
   stage that is alive: it made no further progress, and it is not shown in any case (only active bills are listed), so the rank is only what keeps the rule whole should a failed stage ever be shown. A
   stage with no rank sorts after all the others in either direction, so a stage added here and forgotten does not take the top of the list. A test (tests/interactions.js) pins these ranks and fails if the
   page sorts the Status column any other way. Keep the entries below in the same order as the ranks, for the reader of this file. */
const LEGISLATION_STAGES = {
  'introduced':    { label: 'Introduced',           active: true,  rank: 1 },
  'committee':     { label: 'In committee',         active: true,  rank: 2 },
  'one-chamber':   { label: 'Passed one chamber',   active: true,  rank: 3 },
  'both-chambers': { label: 'Passed both chambers', active: true,  rank: 4 },
  'enacted':       { label: 'Enacted',              active: true,  rank: 5 },   // it has not failed, so it counts as active
  'failed':        { label: 'Failed',               active: false, rank: 0 },   // died in committee, vetoed, withdrawn, or the session ended
};

/* TOPICS. The topic chips (always showing, above the search) and the "Topics:" line in the bills table come from this list and from nothing else. A bill's
   topics are worked out in the page, each time it loads, by matching these words against the bill's own text: they are our reading, not
   any legislature's or anyone else's list. A topic is assigned to a bill when one of its words is in the bill's
   title, or when two different words of it are in the bill's summary or in the subject terms the legislature (or, for a federal bill, the Congressional Research Service) assigned
   (so a stray word in a long summary does not count; two words that overlap, such as 'health' and 'mental health' in the phrase "mental
   health", count once). A bill can have several topics; one that matches none is found under "No topic".
   Matching ignores capitals and starts at the beginning of a word, so 'employ' finds employer and employment; end a word with $ to
   match the whole word only ('rent$' finds rent, not rental). The order here is the order of the chips: the places AI is used first,
   then how it is governed. To rename a topic change its label, to widen or narrow it edit its words, to drop one delete its entry:
   nothing else needs to change, and a reload shows it. The wording was checked against the bills in the data on 2026-11-12, and it
   will miss some: a bill whose title says only "Artificial intelligence: defenses" has no topic until its summary or a word here does. */
const LEGISLATION_TOPICS = [
  { id: 'work', label: 'Hiring and work',
    words: [
      'employer', 'employee', 'employment', 'worker', 'workplace', 'workforce', 'hiring', 'job$', 'jobs',
      'job applicant', 'job seeker', 'layoff', 'laid off', 'wage$', 'wages', 'collective bargaining', 'labor$',
      'unemployment', 'automation displacement', 'staffing', 'human resources', 'recruit', 'dolwd',
      'work transition'
    ] },
  { id: 'health', label: 'Health care and insurance',
    words: [
      'health', 'medical', 'medication', 'prescrib', 'patient', 'physician', 'clinician', 'clinical', 'hospital',
      'nurse', 'nursing', 'pharmac', 'prescription', 'prior authorization', 'utilization review',
      'utilization management', 'insurer', 'insurance', 'mental health', 'therapy', 'therapist', 'psycholog',
      'medicaid', 'medicare', 'diagnos'
    ] },
  { id: 'education', label: 'Education',
    words: [
      'school', 'student', 'teacher', 'educat', 'classroom', 'university', 'universities', 'college', 'curriculum',
      'k-12', 'tutor', 'literacy', 'learning', 'lesc'
    ] },
  { id: 'pricing', label: 'Pricing, housing and credit',
    words: [
      'rent$', 'rental', 'tenant', 'landlord', 'housing', 'price fixing', 'price-fixing', 'pricing', 'real estate',
      'mortgage', 'credit scor', 'credit report', 'credit decision', 'creditworth', 'lending', 'lender', 'loan$',
      'loans', 'bank$', 'banks', 'banking', 'financial institution', 'financial service', 'financial product',
      'consumer reporting', 'underwriting', 'fintech'
    ] },
  { id: 'government', label: 'Government services',
    words: [
      'state agenc', 'government agenc', 'public agenc', 'governmental entit', 'government entit', 'public entit',
      'public benefit', 'benefits eligibility', 'procure', 'inventory', 'chief artificial intelligence officer',
      'chief ai officer', 'chief information officer', 'department of technology', 'state government',
      'public sector', 'municipal', 'local government', 'state employee', 'public employee', 'government use',
      'use by government'
    ] },
  { id: 'justice', label: 'Policing and courts',
    words: [
      'police', 'law enforcement', 'criminal', 'crime', 'prosecut', 'court$', 'courts', 'judge', 'judicial',
      'sentenc', 'bail$', 'parole', 'probation', 'rules of evidence', 'admissib', 'facial recognition', 'felony',
      'misdemeanor', 'offense', 'incarcerat', 'jail', 'prison', 'arrest', 'child sexual abuse material', 'csam',
      'lawyer', 'legal practice', 'practice of law', 'law firm', 'state bar'
    ] },
  { id: 'elections', label: 'Elections and political ads',
    words: [
      'election', 'political advertis', 'political ad$', 'political communication',
      'political artificial intelligence', 'political ai', 'electoral', 'ballot', 'voter', 'voting',
      'political committee', 'political party', 'political content', 'political campaign', 'campaign finance',
      'candidate for public office', 'candidates for public office', 'candidate for office', 'candidates for office',
      'political candidate'
    ] },
  { id: 'deepfakes', label: 'Deepfakes and likeness',
    words: [
      'deepfake', 'deep fake', 'synthetic media', 'digital replica', 'likeness', 'voice clon', 'name, image',
      'intimate image', 'nonconsensual', 'non-consensual', 'sexually explicit', 'revenge porn', 'obscene',
      'pornograph', 'digitally altered', 'digitally created', 'digitally generated', 'artificially generated',
      'manipulated media', 'impersonat', 'synthetic content', 'synthetic image', 'synthetic sexual'
    ] },
  { id: 'chatbots', label: 'Chatbots and companions',
    words: [
      'chatbot', 'chat bot', 'companion', 'conversational', 'bot$', 'bots$', 'virtual assistant', 'virtual agent',
      'ai agent', 'agentic', 'self-harm', 'self harm', 'suicid', 'harming self'
    ] },
  { id: 'kids', label: 'Children and teens',
    words: [
      'child', 'minor$', 'minors', 'juvenile', 'youth', 'teen', 'adolescent', 'social media', 'parental',
      'age verification', 'age-appropriate', 'under 18', 'under the age of'
    ] },
  { id: 'media', label: 'Journalism, copyright and creative work',
    words: [
      'journalis', 'news$', 'newsroom', 'publisher', 'media outlet', 'copyright', 'intellectual property', 'artist',
      'musician', 'music$', 'authorship', 'creative work', 'right of publicity', 'publications'
    ] },
  { id: 'bias', label: 'Bias and automated decisions',
    words: [
      'discriminat', 'bias', 'civil rights', 'disparate', 'protected class', 'high-risk', 'high risk',
      'consequential decision', 'automated decision', 'impact assessment', 'fairness', 'algorithmic discrimination',
      'algorithmic decision', 'algorithmic impact', 'algorithmic accountability', 'human review', 'human oversight',
      'meaningful human'
    ] },
  { id: 'privacy', label: 'Privacy and data',
    words: [
      'privacy', 'personal data', 'personal information', 'biometric', 'data broker', 'data protection',
      'surveillance', 'training data', 'data collection', 'genetic', 'location data', 'personally identifiable'
    ] },
  { id: 'consumer', label: 'Consumer protection and disclosure',
    words: [
      'consumer', 'deceptive', 'false advertis', 'scam', 'fraud', 'misleading', 'advertis', 'provenance',
      'watermark', 'disclos', 'disclaimer', 'unfair trade', 'misrepresent', 'warning label', 'transparency',
      'informing', 'notify', 'notices', 'warnings'
    ] },
  { id: 'liability', label: 'Liability and accountability',
    words: [
      'liability', 'liable', 'tort', 'negligen', 'damages', 'civil action', 'private right of action',
      'products liability', 'defenses', 'accountab'
    ] },
  { id: 'safety', label: 'Safety, security and standards',
    words: [
      'ai safety', 'intelligence safety', 'model safety', 'safety measures', 'safety requirement', 'frontier',
      'catastrophic', 'foundation model', 'large developer', 'safety protocol', 'safety framework',
      'critical safety', 'critical risk', 'kill switch', 'shutdown', 'red-team', 'red team', 'model weights',
      'advanced artificial intelligence', 'artificial general', 'superintellig', 'safety incident',
      'safety and security', 'whistleblower', 'existential', 'rogue', 'cybersecurity', 'cyber$', 'national security',
      'adversar', 'insider threat', 'threats', 'security risk', 'standards', 'nist', 'testbed',
      'third-party verification', 'third party verification', 'independent verification', 'audit', 'testing',
      'incident report'
    ] },
  { id: 'preemption', label: 'Federal preemption',
    words: [
      'preempt', 'moratorium on state', 'moratorium on the enforcement',
      'moratorium on artificial intelligence regulation', 'state ai laws', 'state laws regulating',
      'right to regulate', 'uniformity', 'patchwork', 'deregulat', 'anti-preemption'
    ] },
  { id: 'infrastructure', label: 'Data centers and energy',
    words: [
      'data center', 'datacenter', 'energy', 'electric', 'utility', 'utilities', 'power grid', 'water use',
      'ratepayer', 'semiconductor', 'computing facilit'
    ] },
  { id: 'studies', label: 'Studies, task forces and funding',
    words: [
      'task force', 'working group', 'work group', 'study', 'studies', 'advisory council', 'advisory committee',
      'advisory board', 'ethics board', 'appropriation', 'budget', 'pilot program', 'commission on', 'commission to',
      'council on', 'council to', 'grant program', 'funding', 'fund$'
    ] },
];
