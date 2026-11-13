/* data/legislation-actions.js: enforcement actions and key cases, for the Enforcement tab (a placeholder today), each under the topics it bears on. Hand-maintained, like
   data/legislation-data.js. It loads at runtime, so a change needs only a reload, not a build. It starts empty: nothing is listed until a row is added.

   They are NEVER counted with the bills. The bills' numbers come from the bills alone; actions and cases are listed apart,
   with their own count ("Enforcement actions (2)", "Key cases (1)"), because an agency settlement or a court ruling is not a bill and a total that mixed them
   would mean nothing. A row:

     id        a short unique key, for example "ftc-rite-aid-2023"
     kind      "enforcement" (an agency or attorney general acted) or "case" (a court decided, or is deciding)
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
const LEGISLATION_ACTIONS = [];
