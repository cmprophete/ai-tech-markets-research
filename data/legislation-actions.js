/* data/legislation-actions.js: enforcement actions and key cases, for the Enforcement and Cases sections of the Government action tab (src/js/55-enforcement.js), each under the topics it bears on.
   Hand-maintained, like data/legislation-data.js. It loads at runtime, so a change needs only a reload, not a build. It started empty (a section with no row of its kind is a placeholder, "Coming
   soon"); the first row of a kind turns its list on, and the masthead, the lists, their counts and the block in the map's card on the Legislation section are all said from the rows, never typed.

   They are NEVER counted with the bills. The bills' numbers come from the bills alone; actions and cases are listed apart, in two sections, each list with its own count ("All jurisdictions · 13
   enforcement actions", "All jurisdictions · 1 key case"), because an agency settlement or a court ruling is not a bill and a total that mixed them would mean nothing. WHERE a row is listed:
   `level` and `state` decide it. A federal row is listed under Federal (agencies and courts), a state attorney general's action or a state court's case under its state, and every row under All
   jurisdictions. The place chosen in the Show menu is shared by the three sections (Federal on Legislation means Congress; here it means the agencies and the federal courts). A row:

     id        a short unique key, for example "ftc-rite-aid-2023"
     kind      "enforcement" (an agency or attorney general acted: it is listed in Enforcement) or "case" (a court decided, or is deciding: it is listed in Cases)
     level     "federal" or "state"
     state     the USPS code of a state attorney general's action, or of a state court's case; leave it out for a federal one
     body      who acted: "Federal Trade Commission", "Texas Attorney General", or the court, "U.S. District Court, N.D. Cal."
     date      the date of the action or ruling, "2023-12-19"
     title     what to call it: "FTC and Rite Aid", "Mobley v. Workday"
     uses      the topics it bears on, as ids of LEGISLATION_TOPICS in data/legislation-data.js, for example ["pricing", "privacy"]
     what      one or two sentences in our own words: what was alleged or decided, and what was required. Allegations are "alleged", never "found": most
               enforcement actions are settlements without an admission, and a ruling is only what that court held
     outcome   how it ended or stands: "Consent order", "Settlement", "Fine", "Ruling"                                                   (optional)
     status    where it stands now: "Final", "Pending", "Appealed"                                                                      (optional)
     asOf      the date the status was last checked, "2026-11-12"; shown beside the status, because a case moves                         (optional)
     url       the agency's or the court's own page for it, never a news story or a tracker's write-up

   Rules. Only the agency's or court's own documents are a source: a tracker's or a law firm's description of a case is theirs, not ours to copy (the same
   rule as NCSL's summaries). Every entry is checked against that page before it goes in, and read by someone with legal training. Nothing here is legal advice
   and the page says nothing like it. */

/* FIRST BATCH, 2026-11-17: 14 rows, newest first within each kind. Each was checked against the page its url points to (the agency's or the court's own release, case page or order,
   opened that day); every date is the one on that page. NONE has yet been read by someone with legal training, which the rule above requires before an entry is live: this batch is
   not to be merged to the live site until someone has. A status is where the page leaves it on the day in asOf, not a docket check: the FTC's own case page still says "Pending" for
   Evolv and Rite Aid, and for Evolv the signed order (December 5, 2024) says otherwise, so a reader with docket access should settle those two first. */
const LEGISLATION_ACTIONS = [
  /* ── Enforcement actions ── */
  { id: 'fl-openai-2026', kind: 'enforcement', level: 'state', state: 'FL', body: 'Florida Attorney General', date: '2026-06-01', title: 'Florida v. OpenAI and Sam Altman',
    uses: ['chatbots', 'kids', 'consumer'],
    what: "The state alleges that OpenAI and its chief executive released and marketed ChatGPT, including to children, while hiding risks and ignoring internal safety warnings. It also alleges that ChatGPT collects minors' data without meaningful parental oversight, causes behavioral addiction and cognitive harm, and is prone to dangerous errors the company downplayed; the state seeks damages and an end to those practices, and on September 28, 2026 it asked the court for a temporary injunction.",
    outcome: 'Lawsuit filed', status: 'Pending', asOf: '2026-11-17',
    url: 'https://www.myfloridalegal.com/newsrelease/attorney-general-james-uthmeier-files-first-nation-state-led-lawsuit-against-openai-ceo' },
  { id: 'ftc-air-ai-2026', kind: 'enforcement', level: 'federal', body: 'Federal Trade Commission', date: '2026-03-24', title: 'FTC and Air AI',
    uses: ['consumer'],
    what: "The FTC alleged that Air AI, five related companies and their owners misled customers about the earnings and refunds they could expect, in violation of the FTC's telemarketing and business opportunity rules. Under the proposed settlement Air AI and its owners would be banned from marketing business opportunities, with an $18 million judgment that is largely suspended and $50,000 to be paid to the FTC.",
    outcome: 'Proposed settlement', status: 'Pending', asOf: '2026-11-17',
    url: 'https://www.ftc.gov/news-events/news/press-releases/2026/03/air-ai-its-owners-will-be-banned-marketing-business-opportunities-settle-ftc-charges-company-misled' },
  { id: 'ftc-rytr-2025', kind: 'enforcement', level: 'federal', body: 'Federal Trade Commission', date: '2025-12-22', title: 'FTC and Rytr (order set aside)',
    uses: ['consumer'],
    what: "The FTC's 2024 order against Rytr barred it from offering AI tools that generate consumer reviews and testimonials. In December 2025, in response to the administration's AI Action Plan, the FTC reopened the case and set the order aside, saying the complaint had not supported its claims under the FTC Act and that the order unduly burdens AI innovation; Rytr agreed.",
    outcome: 'Order set aside', status: 'Final', asOf: '2026-11-17',
    url: 'https://www.ftc.gov/news-events/news/press-releases/2025/12/ftc-reopens-sets-aside-rytr-final-order-response-trump-administrations-ai-action-plan' },
  { id: 'doj-realpage-2025', kind: 'enforcement', level: 'federal', body: 'Department of Justice, Antitrust Division', date: '2025-11-24', title: 'DOJ and RealPage',
    uses: ['pricing'],
    what: "The Justice Department and several states alleged that RealPage's rent-setting software used landlords' nonpublic, competitively sensitive data to set rents and had features meant to limit price cuts and align prices among competitors. A proposed consent judgment would bar the software from using competitors' nonpublic data to set rents, limit model training to nonpublic data at least 12 months old, require those features to be removed or redesigned, and add a court-appointed monitor. The case page also lists proposed judgments with five landlords; Greystar's is listed as final, dated March 2, 2026.",
    outcome: 'Proposed consent judgment', status: 'Pending', asOf: '2026-11-17',
    url: 'https://www.justice.gov/atr/case/us-and-plaintiff-states-v-realpage-inc' },
  { id: 'ftc-workado-2025', kind: 'enforcement', level: 'federal', body: 'Federal Trade Commission', date: '2025-08-28', title: 'FTC and Workado',
    uses: ['consumer'],
    what: "The FTC alleged that Workado misrepresented the accuracy of its AI content detector, which had been trained and fine-tuned only to classify academic content. The final order bars effectiveness claims it cannot back with competent and reliable evidence, and requires Workado to keep that evidence, file compliance reports and email eligible consumers.",
    outcome: 'Consent order', status: 'Final', asOf: '2026-11-17',
    url: 'https://www.ftc.gov/news-events/news/press-releases/2025/08/ftc-approves-final-order-against-workado-llc-which-misrepresented-accuracy-its-artificial' },
  { id: 'ftc-donotpay-2025', kind: 'enforcement', level: 'federal', body: 'Federal Trade Commission', date: '2025-02-11', title: 'FTC and DoNotPay',
    uses: ['consumer', 'justice'],
    what: "The FTC alleged that DoNotPay's 'robot lawyer' service did not perform like a human lawyer as advertised, and that the company did not test it or hire attorneys. The final order requires $193,000 in monetary relief and notice to subscribers from 2021 to 2023, and bars it from advertising that the service performs like a real lawyer without enough evidence.",
    outcome: 'Consent order', status: 'Final', asOf: '2026-11-17',
    url: 'https://www.ftc.gov/news-events/news/press-releases/2025/02/ftc-finalizes-order-donotpay-prohibits-deceptive-ai-lawyer-claims-imposes-monetary-relief-requires' },
  { id: 'ftc-evolv-2024', kind: 'enforcement', level: 'federal', body: 'Federal Trade Commission', date: '2024-11-26', title: 'FTC and Evolv Technologies',
    uses: ['consumer', 'education', 'safety'],
    what: "The FTC alleged that Evolv made false claims that its AI-powered Express weapons scanners could detect all weapons while ignoring harmless personal items, and that they were more accurate and cheaper than metal detectors. The court signed a stipulated order on December 5, 2024 that bars unsupported claims about the scanners and lets certain K-12 school customers cancel their contracts; Evolv neither admitted nor denied the allegations.",
    outcome: 'Stipulated order', status: 'Final', asOf: '2026-11-17',
    url: 'https://www.ftc.gov/news-events/news/press-releases/2024/11/ftc-takes-action-against-evolv-technologies-deceiving-users-about-its-ai-powered-security-screening' },
  { id: 'tx-pieces-2024', kind: 'enforcement', level: 'state', state: 'TX', body: 'Texas Attorney General', date: '2024-09-18', title: 'Texas and Pieces Technologies',
    uses: ['health', 'consumer'],
    what: "The Texas Attorney General alleged that Pieces Technologies, a Dallas company whose generative AI summarizes patients' conditions and treatment for hospital staff, made false and misleading claims about the accuracy and safety of its products, including a severe hallucination rate below 1 per 100,000. Under the settlement Pieces agreed to disclose accurately how accurate its products are and to make sure hospital staff understand how far to rely on them.",
    outcome: 'Settlement', status: 'Final', asOf: '2026-11-17',
    url: 'https://www.texasattorneygeneral.gov/news/releases/attorney-general-ken-paxton-reaches-settlement-first-its-kind-healthcare-generative-ai-investigation' },
  { id: 'sec-delphia-2024', kind: 'enforcement', level: 'federal', body: 'Securities and Exchange Commission', date: '2024-03-18', title: 'SEC and Delphia',
    uses: ['consumer'],
    what: "The SEC's order says that from 2019 to 2023 Delphia claimed in its filings, a press release and on its website that it used AI and machine learning with client data in its investment process, but did not have those capabilities. Delphia consented to the order without admitting or denying its findings, was censured, and agreed to a $225,000 civil penalty.",
    outcome: 'Settlement', status: 'Final', asOf: '2026-11-17',
    url: 'https://www.sec.gov/newsroom/press-releases/2024-36' },
  { id: 'sec-global-predictions-2024', kind: 'enforcement', level: 'federal', body: 'Securities and Exchange Commission', date: '2024-03-18', title: 'SEC and Global Predictions',
    uses: ['consumer'],
    what: "The SEC's order says that in 2023 Global Predictions claimed on its website and social media to be the first regulated AI financial advisor and to offer expert AI-driven forecasts, and falsely claimed to offer tax-loss harvesting. Global Predictions consented to the order without admitting or denying its findings, was censured, and agreed to a $175,000 civil penalty.",
    outcome: 'Settlement', status: 'Final', asOf: '2026-11-17',
    url: 'https://www.sec.gov/newsroom/press-releases/2024-36' },
  { id: 'ftc-rite-aid-2023', kind: 'enforcement', level: 'federal', body: 'Federal Trade Commission', date: '2023-12-19', title: 'FTC and Rite Aid',
    uses: ['privacy', 'bias', 'consumer'],
    what: "The FTC alleged that Rite Aid used AI facial recognition in its stores from 2012 to 2020 to spot suspected shoplifters, that it produced many false matches, and that the errors fell hardest on people of color. The proposed order would bar facial recognition surveillance for five years and require deleting the images and any algorithms built from them; the FTC's case page, last updated March 8, 2024, still lists it as pending.",
    outcome: 'Proposed order', status: 'Pending', asOf: '2026-11-17',
    url: 'https://www.ftc.gov/news-events/news/press-releases/2023/12/rite-aid-banned-using-ai-facial-recognition-after-ftc-says-retailer-deployed-technology-without' },
  { id: 'eeoc-itutorgroup-2023', kind: 'enforcement', level: 'federal', body: 'Equal Employment Opportunity Commission', date: '2023-09-11', title: 'EEOC and iTutorGroup',
    uses: ['work', 'bias'],
    what: "The EEOC alleged that three integrated iTutorGroup companies programmed their tutor application software to automatically reject women aged 55 or older and men aged 60 or older, turning away more than 200 qualified U.S. applicants because of their age. The consent decree provides $365,000 for those applicants, training, a new anti-discrimination policy and injunctions against age and sex discrimination in hiring, and the EEOC will monitor compliance for at least five years.",
    outcome: 'Consent decree', status: 'Final', asOf: '2026-11-17',
    url: 'https://www.eeoc.gov/newsroom/itutorgroup-pay-365000-settle-eeoc-discriminatory-hiring-suit' },
  { id: 'ftc-everalbum-2021', kind: 'enforcement', level: 'federal', body: 'Federal Trade Commission', date: '2021-05-07', title: 'FTC and Everalbum',
    uses: ['privacy', 'consumer'],
    what: "The FTC alleged that Everalbum, a photo app developer, misled users about its use of facial recognition and kept the photos and videos of people who had deactivated their accounts. The final order requires express consent before it uses facial recognition and requires it to delete those photos and videos along with the models and algorithms developed from users' photos.",
    outcome: 'Consent order', status: 'Final', asOf: '2026-11-17',
    url: 'https://www.ftc.gov/news-events/news/press-releases/2021/05/ftc-finalizes-settlement-photo-app-developer-related-misuse-facial-recognition-technology' },

  /* ── Key cases ── */
  { id: 'mobley-workday-2025', kind: 'case', level: 'federal', body: 'U.S. District Court, N.D. Cal.', date: '2025-05-16', title: 'Mobley v. Workday',
    uses: ['work', 'bias'],
    what: "Derek Mobley alleges that Workday's AI-based applicant recommendation system discriminated against job applicants on the basis of race, age and disability, and four other plaintiffs over 40 allege age discrimination. On May 16, 2025 the court granted preliminary certification of a collective on the age claim, finding that the plaintiffs had substantially alleged a unified policy, the use of the system to score, sort, rank or screen applicants; Workday can later ask the court to undo that.",
    outcome: 'Preliminary certification granted', status: 'Pending', asOf: '2026-11-17',
    url: 'https://www.govinfo.gov/content/pkg/USCOURTS-cand-3_23-cv-00770/pdf/USCOURTS-cand-3_23-cv-00770-1.pdf' },
];
