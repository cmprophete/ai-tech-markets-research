/* data/legislation-data.js: what the Legislation tab shows besides the state outlines. Hand-maintained, like data/fact-bank-data.js. It
   loads at runtime, so a change needs only a reload, not a build.

   LEGISLATION_DATA is one row per bill. It starts empty. The bills themselves are in data/legislation-bills.js, which tools/legislation.py
   generates from the Brennan Center's Artificial Intelligence Legislation Tracker (the federal list), each federal bill's official record at
   GovInfo, and Open States (state bills, found by full-text searches: tools/openstates_fetch.py says for which phrases), and which the tab
   fetches the first time it opens, adding its rows to this list. Nothing else is
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
     passing     true when the bill only mentions AI in its text, not its title or summary: hidden until the checkbox "Include bills that only mention AI" (under More filters) is on  (optional)
     summary     what it would do: the legislature's own summary where it gives one, else our own words        (optional)
     lastAction  { date: "2026-03-01", text: "Referred to committee" }                      (optional)
     source      { label: "Legislature", url: "https://..." }                                (optional)

   A field the source does not give is left out, and the page shows an en dash for it, never a guess; a column that is empty for every
   bill in view (the federal bills have no last action, the state bills no summary) is left out of the table. The bill count in the
   masthead, the map's shading and the tables are all computed from this list.

   ACTIVE: a bill is active when it has been introduced and has not failed (the owner's definition, 2026-11-12). Which
   stages count is the `active` flag on each entry of LEGISLATION_STAGES, so changing the rule is a one-word edit there:
   for example, set it to false on "enacted" to leave enacted bills out of the active list. Only active bills are listed;
   a bill whose stage is failed, or missing, is kept in this file but not listed, and a note under the table says how
   many were left out and why. Federal bills (Congress) and state bills share one list and one definition.

   MIDTERM_RESULTS, MIDTERM_SOURCES, MIDTERM_PAGES, MIDTERM_NOTE and MIDTERM_NATIONAL are the 2026 midterm results shown
   beside the legislation, labelled as election results, not legislation. They come from the Associated Press's midterm results
   (Senate, House and governor, state by state), cited in MIDTERM_SOURCES, and from nothing else. Each state can carry three
   offices, and the link in its Source column is built from the state's name and MIDTERM_PAGES:
     senate     { result, detail? }   the state's 2026 Senate race, if it has one
     governor   { result, detail? }   the state's 2026 governor race, if it has one
       result   "d-gain"    Democrats won a Republican-held seat       "r-gain"   Republicans won a Democratic-held seat
                "d-hold"    Democrats held a Democratic-held seat      "r-hold"   Republicans held a Republican-held seat
                "uncalled"  the race has not been called
       detail   a plain statement of the result, in our own words
     house      { d, r, dLead, rLead, runoff }   the state's House districts: d and r are won by that party, dLead and rLead are
                leading and not yet called, runoff are going to a runoff; a count of zero is left out */
const LEGISLATION_DATA = [];

// The places other than the 50 states and DC that can have bills. They have no shape on the map, so the Show menu and the tables are
// their only way in. Open States covers Puerto Rico and none of the other territories; add one here when a source covers it.
const LEGISLATION_TERRITORIES = { PR: 'Puerto Rico' };

const LEGISLATION_STAGES = {
  'introduced':    { label: 'Introduced',           active: true },
  'committee':     { label: 'In committee',         active: true },
  'one-chamber':   { label: 'Passed one chamber',   active: true },
  'both-chambers': { label: 'Passed both chambers', active: true },
  'enacted':       { label: 'Enacted',              active: true },   // it has not failed, so it counts as active
  'failed':        { label: 'Failed',               active: false },  // died in committee, vetoed, withdrawn, or the session ended
};

/* TOPICS. The topic chips under "More filters" and the "Topics:" line in the bills table come from this list and from nothing else. A bill's
   topics are worked out in the page, each time it loads, by matching these words against the bill's own text: they are our reading, not
   any legislature's, the Brennan Center's or anyone else's list. A topic is assigned to a bill when one of its words is in the bill's
   title, or when two different words of it are in the bill's summary, the legislature's subject terms or the Brennan Center's labels
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

const MIDTERM_SOURCES = {
  ap: {
    org: 'The Associated Press', short: 'AP', title: '2026 Midterm Election Results: Senate, House and Governor Races', kind: 'results page', updated: 'November 12, 2026, 10:29 AM',
    url: 'https://apnews.com/projects/elections-2026/',
  },
};

// Where AP shows one state's results for each office: the link in a row's Source column. {slug} is the state's name in lower case, with hyphens.
const MIDTERM_PAGES = {
  senate:   'https://apnews.com/projects/elections-2026/{slug}-us-senate-results/',
  house:    'https://apnews.com/projects/elections-2026/{slug}-us-house-results/',
  governor: 'https://apnews.com/projects/elections-2026/{slug}-governor-results/',
};

const MIDTERM_NOTE = 'Each row links to AP’s page for each of that state’s races.';

// The totals AP's overview showed when it was read. The Senate and governor totals include the seats not up in 2026.
const MIDTERM_NATIONAL = {
  src: 'ap', updated: 'November 12, 2026, 10:29 AM',
  senate: { democrats: 55, republicans: 44, toBeCalled: 1 },
  house: { democrats: 255, republicans: 168, toBeCalled: 12 },
  governor: { democrats: 28, republicans: 20, toBeCalled: 2 },
};

// The 50 states. A state has a senate entry only if it had a Senate race in 2026 (35 seats, two of them special elections, in Ohio and
// Florida), and a governor entry only if it had a governor race (36); every state has House districts. DC is not in AP's results.
const MIDTERM_RESULTS = {
  AL: { senate: { result: 'r-hold' }, house: { d: 2, r: 5 }, governor: { result: 'r-hold' } },
  AK: { senate: { result: 'uncalled', detail: 'Not yet called: Democrat Mary Peltola leads, with an estimated 86% of votes counted at AP’s November 11, 10:34 PM update. Ranked-choice counting follows if no candidate has a majority of first-choice votes.' }, house: { rLead: 1 }, governor: { result: 'uncalled', detail: 'Not yet called: AP shows a Democrat leading.' } },
  AZ: { house: { d: 5, r: 4 }, governor: { result: 'd-hold' } },
  AR: { senate: { result: 'r-hold' }, house: { r: 4 }, governor: { result: 'r-hold' } },
  CA: { house: { d: 47, r: 3, dLead: 1, rLead: 1 }, governor: { result: 'd-hold' } },
  CO: { senate: { result: 'd-hold' }, house: { d: 6, r: 1, dLead: 1 }, governor: { result: 'd-hold' } },
  CT: { house: { d: 5 }, governor: { result: 'd-hold' } },
  DE: { senate: { result: 'd-hold' }, house: { d: 1 } },
  FL: { senate: { result: 'r-hold' }, house: { d: 8, r: 20 }, governor: { result: 'r-hold' } },
  GA: { senate: { result: 'd-hold' }, house: { d: 5, r: 9 }, governor: { result: 'd-gain' } },
  HI: { house: { d: 2 }, governor: { result: 'd-hold' } },
  ID: { senate: { result: 'r-hold' }, house: { r: 2 }, governor: { result: 'r-hold' } },
  IL: { senate: { result: 'd-hold' }, house: { d: 14, r: 3 }, governor: { result: 'd-hold' } },
  IN: { house: { d: 3, r: 6 } },
  IA: { senate: { result: 'd-gain' }, house: { d: 3, r: 1 }, governor: { result: 'd-gain' } },
  KS: { senate: { result: 'd-gain' }, house: { d: 1, r: 3 }, governor: { result: 'uncalled', detail: 'Not yet called: AP shows a Democrat leading.' } },
  KY: { senate: { result: 'r-hold' }, house: { d: 2, r: 4 } },
  LA: { senate: { result: 'r-hold' }, house: { d: 1, r: 3, runoff: 2 } },
  ME: { senate: { result: 'd-gain' }, house: { d: 1, rLead: 1 }, governor: { result: 'd-hold' } },
  MD: { house: { d: 7, r: 1 }, governor: { result: 'd-hold' } },
  MA: { senate: { result: 'd-hold' }, house: { d: 9 }, governor: { result: 'd-hold' } },
  MI: { senate: { result: 'd-hold' }, house: { d: 9, r: 4 }, governor: { result: 'd-hold' } },
  MN: { senate: { result: 'd-hold' }, house: { d: 4, r: 3, dLead: 1 }, governor: { result: 'd-hold' } },
  MS: { senate: { result: 'd-gain', detail: 'Democrat Scott Colom was elected, flipping this Republican-held seat.' }, house: { d: 1, r: 3 } },
  MO: { house: { d: 3, r: 5 } },
  MT: { senate: { result: 'r-hold' }, house: { d: 1, r: 1 } },
  NE: { senate: { result: 'r-hold' }, house: { d: 1, r: 2 }, governor: { result: 'r-hold' } },
  NV: { house: { d: 4 }, governor: { result: 'd-gain' } },
  NH: { senate: { result: 'd-hold' }, house: { d: 2 }, governor: { result: 'r-hold' } },
  NJ: { senate: { result: 'd-hold' }, house: { d: 11, r: 1 } },
  NM: { senate: { result: 'd-hold' }, house: { d: 3 }, governor: { result: 'd-hold' } },
  NY: { house: { d: 20, r: 6 }, governor: { result: 'd-hold' } },
  NC: { senate: { result: 'd-gain' }, house: { d: 9, r: 1, dLead: 2, rLead: 2 } },
  ND: { house: { r: 1 } },
  OH: { senate: { result: 'd-gain' }, house: { d: 8, r: 7 }, governor: { result: 'd-gain' } },
  OK: { senate: { result: 'r-hold' }, house: { r: 5 }, governor: { result: 'r-hold' } },
  OR: { senate: { result: 'd-hold' }, house: { d: 5, r: 1 }, governor: { result: 'd-hold' } },
  PA: { house: { d: 11, r: 6 }, governor: { result: 'd-hold' } },
  RI: { senate: { result: 'd-hold' }, house: { d: 2 }, governor: { result: 'd-hold' } },
  SC: { senate: { result: 'd-gain' }, house: { d: 2, r: 5 }, governor: { result: 'r-hold' } },
  SD: { senate: { result: 'r-hold' }, house: { r: 1 }, governor: { result: 'r-hold' } },
  TN: { senate: { result: 'r-hold' }, house: { r: 8, dLead: 1 }, governor: { result: 'r-hold' } },
  TX: { senate: { result: 'd-gain' }, house: { d: 14, r: 24 }, governor: { result: 'd-gain' } },
  UT: { house: { d: 1, r: 3 } },
  VT: { house: { d: 1 }, governor: { result: 'r-hold' } },
  VA: { senate: { result: 'd-hold' }, house: { d: 8, r: 3 } },
  WA: { house: { d: 8, r: 2 } },
  WV: { senate: { result: 'r-hold' }, house: { r: 2 } },
  WI: { house: { d: 4, r: 4 }, governor: { result: 'd-hold' } },
  WY: { senate: { result: 'r-hold' }, house: { r: 1 }, governor: { result: 'r-hold' } },
};
