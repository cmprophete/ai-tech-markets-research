// Case study content for the Case Studies tab.
//
// Hand-maintained, like THEMES / POLICY_DATA / FACT_BANK. Loads at runtime, so
// a content edit needs a reload, not a `python3 build.py`.
//
// Every dated claim below is sourced. `sources` carries the public links;
// where a line comes only from the internal All Staff Retreat 2026 deck it
// says so in `origin: "deck"` and carries no external link, so a reader can
// tell a published fact from an internal one. Do not add a number here that
// no source in its row supports.
//
// MAP. The California outline is the California polygon from us-atlas
// states-albers-10m (Natural Earth 1:10m, public domain), lifted from the
// retired data/us-albers-data.js, translated to its own origin with a 4px
// margin. It is decorative: aria-hidden, and nothing is encoded in it.

const CASE_STUDIES = {
  california: {
    id: 'california',
    label: 'California Campaigns',
    lede: 'How did a state become the venue for AI policy?',
    standfirst: 'Economic Security California and Economic Security Project spent six years building the coalition, the argument, and the Sacramento relationships that produced the first frontier AI law in the country. Click any point on the timeline for the bill, the fight, and what ESP did.',
    map: {
      viewBox: '0 0 152 255',
      d: 'M62.7,218.3L63.7,218.7L65.3,220.1L66.6,220.9L67.3,222.8L66.8,223.5L66,222.8L64.4,222.3L64.1,221.5L64.5,220.1L63.3,219.5ZM60.2,228.2L60.8,228.3L61.9,231.1L63.8,234L62.3,234.1L61.3,232.7ZM50.7,202.4L51.9,202.7L51.7,203.3L50.6,203.1ZM43.8,218.3L44.7,218.4L46.2,220.1L45.3,220.2L44.1,219.5ZM42.1,199L43.8,200.1L45,200.3L46,201.4L47.2,201.8L47.9,201.2L49.1,201.8L48.1,202.5L46.2,202.3L45,202.6L42.4,201.4L42.6,200.2ZM35.8,199.2L37.2,199.4L39.6,199.4L39.4,200.3L40.5,200.9L40.4,201.8L37.4,202.1L36.7,201.4ZM32.3,197.4L34.1,197.1L34.9,198.4L33.8,198.4ZM18.1,4L25.8,6.3L32,8.1L35.3,8.8L36.8,9.4L43.4,11.3L47.6,12.4L53.7,14.2L69.2,18.8L81.3,22L86,23.2L79.5,48L77.5,56.3L74.3,68.3L70,84.5L68.8,89.5L80.3,106.8L87,116.9L102.1,139.6L117.6,163L129.9,181.5L142.3,200.2L141.7,203.1L142.4,204.1L142.8,205.8L144,207.2L144.4,209.7L144.2,210.1L144.8,211.7L144.4,213.3L145.3,213.6L146.9,215.9L147.8,216.5L148.3,217.6L147.7,218.6L145.6,220.1L144.2,220.7L142.3,221L141.6,222.7L139.4,224.5L139.7,226.1L139.1,226.4L139,230L138.3,230.2L137.9,233.1L137.2,233.4L135.7,234.9L135.4,235.5L133.5,235.7L133.8,236.7L133,237.9L133.8,238.9L133.3,241.3L132.5,242.6L132.9,244.1L134.1,244.6L135.7,244.8L136.2,247.8L135.8,249.1L134.4,250.1L134.3,250.9L132.6,251.1L131.2,250.7L130.6,251L85,245.7L85.2,243.5L84.4,241.9L83.4,242.1L83.8,239.1L83.6,238.6L84.4,237.6L84.5,234.4L84.2,231.7L82,226.3L80.7,224.7L80,223.3L78.8,222.6L78,220.4L76.6,218.9L75.7,218.4L74.6,217L73.4,215L71.9,213.8L71.7,214.7L70.2,214.8L67.6,213.3L67.5,212.5L68.3,212L68.5,211.2L68.1,208.7L67.2,206.5L66.3,205.9L63.1,205.4L61.9,205.8L61.1,204.8L59.7,204.3L57.3,202.4L56.5,202.1L55.2,200.7L54.8,198.1L53.4,196.2L53,196.1L52.1,194.6L50.5,193.3L48.5,192.7L47.7,193L46.3,192.1L44.8,191.9L42.7,190.2L40.4,189.2L37.5,188.6L34.3,188.3L34,186.4L32,184.5L33.4,182.2L33.1,180.7L34.1,178.9L33.8,177.4L35.1,173.9L35.3,172.1L33.9,170.9L33.4,171.2L31.9,169.7L31.4,168.6L32.4,166.9L32.8,165.2L32.4,164.1L30.8,163.3L29.6,160.9L28.9,158.7L27.1,157.3L26.8,156.3L26.9,154.6L25.3,151.8L25.2,149L24.2,148.2L23.7,145.9L22.7,143.7L21.2,142.4L20.3,140.1L20.6,138.7L20.5,136.2L21.2,134.6L20.6,133.9L21.8,133L22.2,133.9L23.6,133L25.2,129.9L24.7,126.7L23.8,125.4L22.9,125.7L20.6,125L19.2,123.2L18.2,120.5L17.6,120.3L17.5,119L16.9,118.3L17.1,117L18,114.7L17.8,112.8L17.9,111.8L17.1,110.5L18.5,107L18.8,104.8L20.8,104.7L20.8,106.5L20.4,107L20,108.6L20.2,109.7L21.8,110.7L22.9,112.6L23.4,112.7L24,114.1L24.8,114.3L23.9,112.8L23.8,110.9L24.1,109L23,107.4L23.2,106.8L21.9,105.7L22.8,104.4L22.8,103L21.7,102.6L21.3,101.2L22.5,101.2L22.7,100.5L23.8,100.8L24.7,100.3L24.4,98.7L23.1,97.4L21.2,97.7L20.5,99.7L21.2,100.7L20.3,100.9L19.9,101.6L20.7,103L19.7,102.4L19.7,103.9L18.7,103.9L18.4,103L17.1,101.4L16.3,101.4L15.3,99.8L14.9,98.6L14,97.7L13.1,97.2L12.3,97.9L11.7,97.5L13.3,95.3L13.8,94.3L13.5,92.5L14,91.8L13.5,90.7L12.7,90.7L13,89.4L12.6,87.1L10.9,85.1L9.9,83.5L8.7,79.6L6.4,75.8L5.6,73.8L5.6,73L6.9,71.7L7.1,70.9L6.7,65.5L6.9,63.4L7.6,61.8L9.1,59.7L9.1,58.5L9.5,56.7L9.2,55.7L9.5,53.2L8.8,52.2L8.8,51.1L7.7,48.3L7.1,47.7L7.1,45.9L6,44.9L4,41.2L4.6,40.1L4.7,38.3L4.4,37.1L5.4,35.4L6.9,33.6L10.3,30.1L12.1,27.8L13.2,25.7L12.7,24.9L13.2,22.9L14.7,21.3L16.8,16.9L17.2,14.4L17.1,9.8L16.7,9.8L15.9,8.4L17.4,6.4Z'
    },
    phases: [
      { id: 'origins',  label: 'Phase 1 \u00b7 Antimonopoly origins',      span: '2019\u20132023' },
      { id: 'politecon', label: 'Phase 2 \u00b7 AI and political economy',  span: '2023\u20132024' },
      { id: 'everywhere', label: 'Phase 3 \u00b7 AI everything, everywhere', span: '2025\u2013now' }
    ],
    events: [
      {
        id: "breakup-facebook",
        phase: "origins",
        date: "2019-05-09",
        dateLabel: "May 2019",
        title: "&ldquo;It&rsquo;s Time to Break Up Facebook&rdquo;",
        kicker: "Chris Hughes, New York Times",
        what: "ESP board chair Chris Hughes argues in a New York Times op-ed that Facebook should be broken up. The piece moves antimonopoly from an academic argument into mainstream political debate and sets the frame ESP carries into AI a few years later: the question is not whether a technology is good or bad, it is who gets to decide.",
        role: "Hughes was ESP&rsquo;s board chair. The op-ed is the opening move of the antimonopoly program that becomes the California AI work.",
        origin: "public",
        sources: [
          {
            label: "Hughes, C. (2019). It&rsquo;s Time to Break Up Facebook. The New York Times.",
            url: "https://www.nytimes.com/2019/05/09/opinion/sunday/chris-hughes-facebook-zuckerberg.html"
          }
        ]
      },
      {
        id: "antimonopoly-fund",
        phase: "origins",
        date: "2019-01-01",
        dateLabel: "2019",
        title: "The Antimonopoly Fund is founded",
        kicker: "$11M moved into the field",
        what: "ESP founds the Antimonopoly Fund and moves $11M into the field to combat corporate concentration. The money builds the bench of organizations that later show up as coalition partners in Sacramento.",
        role: "ESP founded and capitalized the fund.",
        origin: "deck",
        sources: []
      },
      {
        id: "sacramento-bench",
        phase: "origins",
        date: "2022-01-01",
        dateLabel: "2022&ndash;2023",
        title: "Building a presence in Sacramento and DC",
        kicker: "Lobbyist, coalitions, convenings",
        what: "ESP Action hires a full-time lobbyist, builds coalitions, and holds convenings in Washington DC and California to build bridges and advance legislation. This is the unglamorous infrastructure step: without it there is no co-sponsorship two years later.",
        role: "ESP Action hired the lobbyist and convened the coalitions.",
        origin: "deck",
        sources: []
      },
      {
        id: "political-economy-ai",
        phase: "politecon",
        date: "2023-01-01",
        dateLabel: "2023",
        title: "Building a new political economy of AI",
        kicker: "Workshops, the White House, and a public option",
        what: "ESP partners with AI Now, VPA, and Mozilla on a series of workshops on Building a New Political Economy of AI and Designing Public AI. TJ and Chris meet with the White House on AI and competition policy. Natalie Foster and Ganesh Sitaraman explore in Politico how states can set up public options for cloud compute, which is the idea that becomes CalCompute.",
        role: "ESP convened the workshops with its partners, carried the competition argument into the White House, and put the state-level public compute option into print.",
        origin: "deck",
        sources: []
      },
      {
        id: "esca-founded",
        phase: "politecon",
        date: "2024-01-01",
        dateLabel: "2024",
        title: "Economic Security California is founded",
        kicker: "A statewide antimonopoly table",
        what: "Economic Security California (ESCA) is founded and creates a statewide Antimonopoly Table, giving the California work its own vehicle and its own coalition rather than running it out of the national organization.",
        role: "ESP founded ESCA and the table.",
        origin: "deck",
        sources: []
      },
      {
        id: "sb1047-introduced",
        phase: "politecon",
        date: "2024-02-07",
        dateLabel: "7 February 2024",
        title: "SB 1047 is introduced",
        kicker: "Safe and Secure Innovation for Frontier AI Models Act",
        bill: {
          number: "SB 1047",
          author: "Sen. Scott Wiener (D&ndash;San Francisco)",
          summary: "Would have required developers of the largest frontier models to adopt and publish safety protocols, and would have established CalCompute, a publicly funded cloud computing cluster giving researchers and startups low-cost access to compute."
        },
        what: "Wiener introduces SB 1047 on 7 February 2024. It becomes the highest-profile AI bill in the country and draws heavy opposition spending from the technology industry. The Senate passes its first version 32&ndash;1 on 21 May 2024.",
        role: "ESCA is one of three named co-sponsors, alongside the Center for AI Safety Action Fund and Encode. CalCompute, the public option for compute, is the piece ESP had been developing since 2023.",
        origin: "public",
        sources: [
          {
            label: "Wiener, S. (2024). Senator Wiener Introduces Legislation to Ensure Safe Development of Large-Scale Artificial Intelligence Systems. California State Senate, District 11.",
            url: "https://sd11.senate.ca.gov/news/senator-wiener-introduces-legislation-ensure-safe-development-large-scale-artificial"
          },
          {
            label: "Safe and Secure Innovation for Frontier Artificial Intelligence Models Act. Wikipedia.",
            url: "https://en.wikipedia.org/wiki/Safe_and_Secure_Innovation_for_Frontier_Artificial_Intelligence_Models_Act"
          },
          {
            label: "Economic Security Project Action (2024). Landmark CA legislation would create &lsquo;public cloud&rsquo; allowing equitable AI access and spurring innovation.",
            url: "https://economicsecurity.us/news/landmark-ca-legislation-would-create-public-cloud-allowing-equitable-ai-access-and-spurring-innovation/"
          }
        ]
      },
      {
        id: "sb1047-passes",
        phase: "politecon",
        date: "2024-08-29",
        dateLabel: "28&ndash;29 August 2024",
        title: "SB 1047 passes the legislature",
        kicker: "Assembly 48&ndash;16, Senate 30&ndash;9",
        what: "The Assembly passes the amended bill 48&ndash;16 on 28 August 2024. Because of the amendments the Senate has to vote again, and concurs 30&ndash;9 on 29 August. The bill goes to the governor.",
        role: "ESCA is a co-sponsor through passage and runs the outside campaign.",
        origin: "public",
        sources: [
          {
            label: "Safe and Secure Innovation for Frontier Artificial Intelligence Models Act. Wikipedia.",
            url: "https://en.wikipedia.org/wiki/Safe_and_Secure_Innovation_for_Frontier_Artificial_Intelligence_Models_Act"
          },
          {
            label: "Economic Security Project Action (2024). Assembly Advances SB 1047, Positioning California as the Leader in AI Safety.",
            url: "https://economicsecurity.us/news/assembly-advances-sb1047-positioning-california-as-the-leader-in-ai-safety/"
          }
        ]
      },
      {
        id: "sb1047-veto",
        phase: "politecon",
        date: "2024-09-29",
        dateLabel: "29 September 2024",
        title: "Newsom vetoes SB 1047",
        kicker: "The loss that set up the win",
        what: "Governor Newsom vetoes SB 1047, calling it &ldquo;a solution that is not informed by an empirical trajectory analysis of AI systems and capabilities.&rdquo; His stated objection is that a threshold keyed to model size could create a false sense of security while leaving smaller but still dangerous models untouched. The veto is not the end of the fight: it forces the governor to engage, and it produces a working group that writes the technical foundation for the next bill.",
        role: "ESCA&rsquo;s point of view lands in the coverage: <em>who decides?</em> The retreat deck records 76 high-impact media placements with 12.8M unique views. Battle positions are locked in, industry spends heavily, and ESCA comes out of the loss with credibility in Sacramento.",
        origin: "mixed",
        sources: [
          {
            label: "Newsom, G. (2024). SB 1047 veto message. Office of the Governor.",
            url: "https://www.gov.ca.gov/wp-content/uploads/2024/09/SB-1047-Veto-Message.pdf"
          },
          {
            label: "Gibson Dunn (2024). Regulating the Future: Eight Key Takeaways from California&rsquo;s SB 1047, Vetoed by Governor Newsom.",
            url: "https://www.gibsondunn.com/regulating-the-future-eight-key-takeaways-from-californias-sb-1047-vetoed-by-governor-newsom/"
          }
        ]
      },
      {
        id: "working-group",
        phase: "everywhere",
        date: "2025-03-01",
        dateLabel: "March 2025",
        title: "The governor&rsquo;s working group reports",
        kicker: "The technical foundation for SB 53",
        what: "The veto message committed Newsom to convening experts. The resulting Joint California Policy Working Group on AI Frontier Models publishes a first-of-its-kind report in March 2025, providing the scientific and policy basis for what becomes SB 53. The transparency-and-reporting design in the next bill comes out of this work.",
        role: "ESP and ESCA continue to press the public-option and transparency arguments through this period.",
        origin: "public",
        sources: [
          {
            label: "Center for Security and Emerging Technology. California&rsquo;s Approach to AI Governance.",
            url: "https://cset.georgetown.edu/article/californias-approach-to-ai-governance/"
          }
        ]
      },
      {
        id: "approps",
        phase: "everywhere",
        date: "2025-08-29",
        dateLabel: "29 August 2025",
        title: "SB 53 and AB 325 clear appropriations",
        kicker: "Two bills, one coalition",
        what: "SB 53 passes Assembly Appropriations with all Democrats in support and Republicans not voting, and heads for an Assembly floor vote. AB 325 passes Senate Appropriations on a 5&ndash;2 party-line vote and heads for a Senate floor vote.",
        role: "Economic Security California Action is a co-sponsor of both bills. Teri Olle, its director: &ldquo;Big Tech and corporate giants shouldn&rsquo;t have a stranglehold on AI or be allowed to rig prices with secret algorithms.&rdquo;",
        origin: "public",
        sources: [
          {
            label: "Economic Security Project Action (2025). California Legislature Advances Bills to Democratize AI Access and Fight Algorithm-Driven Price Fixing.",
            url: "https://economicsecurity.us/news/ca-legislature-advances-bills-ab-325-sb-53/"
          }
        ]
      },
      {
        id: "sb53-signed",
        phase: "everywhere",
        date: "2025-09-29",
        dateLabel: "29 September 2025",
        title: "Newsom signs SB 53",
        kicker: "First frontier AI law in the country",
        bill: {
          number: "SB 53",
          author: "Sen. Scott Wiener (D&ndash;San Francisco)",
          summary: "The Transparency in Frontier Artificial Intelligence Act. Requires developers of the largest models to publish safety frameworks and transparency reports, report critical safety incidents to Cal OES within 15 days (24 hours where there is imminent risk of death or injury), and protects whistleblowers. Penalties reach $1M per violation. It also establishes CalCompute."
        },
        what: "Exactly one year after the SB 1047 veto, Newsom signs SB 53. It is the first law of its kind in the United States aimed at frontier AI. Core obligations take effect 1 January 2026. Newsom&rsquo;s signing message notes that if matching federal standards are adopted, further action will be needed to avoid duplicative requirements.",
        role: "Co-sponsored by Economic Security California Action. Teri Olle: &ldquo;Until today, Big Tech execs have had full control of AI&rdquo; and &ldquo;California made it official: the future of AI development is a hopeful one.&rdquo; CalCompute, the public cloud cluster ESP had argued for since 2023 and lost with SB 1047, survives into law here.",
        origin: "public",
        sources: [
          {
            label: "Economic Security Project (2025). Governor Newsom Signs SB 53, Establishing California as Global Leader in AI Safety and Innovation.",
            url: "https://economicsecurityproject.org/news/governor-newsom-signs-sb-53/"
          },
          {
            label: "Transparency in Frontier Artificial Intelligence Act. Wikipedia.",
            url: "https://en.wikipedia.org/wiki/Transparency_in_Frontier_Artificial_Intelligence_Act"
          },
          {
            label: "Orrick (2025). California&rsquo;s Transparency in Frontier Artificial Intelligence Act: 5 Things You Should Know.",
            url: "https://www.orrick.com/en/Insights/2025/10/Californias-Transparency-in-Frontier-Artificial-Intelligence-Act-5-Things-You-Should-Know"
          }
        ]
      },
      {
        id: "ab325-signed",
        phase: "everywhere",
        date: "2025-10-06",
        dateLabel: "6 October 2025",
        title: "Newsom signs AB 325",
        kicker: "Algorithmic price fixing banned",
        bill: {
          number: "AB 325",
          author: "Asm. Cecilia Aguiar-Curry (D&ndash;Winters)",
          summary: "Adds Section 16729 to the Business and Professions Code. Bars using or distributing a common pricing algorithm as part of an anticompetitive agreement, with no exception for tools built only on public data, and separately bars coercing another firm into adopting an algorithm&rsquo;s recommended price. Also relaxes the antitrust pleading standard: a complaint need only make a conspiracy plausible."
        },
        what: "Newsom signs AB 325 on 6 October 2025, effective 1 January 2026. The companion bill SB 763 raises antitrust penalties. Supporters point to landlord pricing software such as RealPage as the motivating case.",
        role: "Economic Security California Action is a co-sponsor. Teri Olle: &ldquo;Californians are fed up with corporations using secret algorithms to jack up prices on everything from rent to groceries.&rdquo; And on the principle: &ldquo;if it&rsquo;s illegal in a back room, it&rsquo;s illegal on a laptop.&rdquo;",
        origin: "public",
        sources: [
          {
            label: "Economic Security Project Action (2025). Governor Signs Landmark Legislation to Ban Algorithmic Price Fixing.",
            url: "https://economicsecurity.us/news/governor-signs-landmark-legislation-to-ban-algorithmic-price-fixing/"
          },
          {
            label: "Alston &amp; Bird (2025). California&rsquo;s AB 325 Prohibits Shared Pricing Algorithms.",
            url: "https://www.alston.com/en/insights/publications/2025/11/california-ab-325-antitrust-standards"
          }
        ]
      },
      {
        id: "effective",
        phase: "everywhere",
        date: "2026-01-01",
        dateLabel: "1 January 2026",
        title: "Both laws take effect",
        kicker: "From statute to compliance",
        what: "SB 53&rsquo;s core transparency and incident-reporting obligations and AB 325&rsquo;s prohibition on common pricing algorithms both take effect.",
        role: "ESCA turns to implementation: whether CalCompute is funded, and how it is governed.",
        origin: "public",
        sources: [
          {
            label: "Troutman Pepper (2025). California Transparency in Frontier AI Act Signed Into Law.",
            url: "https://www.troutmanprivacy.com/2025/10/california-transparency-in-frontier-ai-act-signed-into-law/"
          }
        ]
      },
      {
        id: "agenda-2026",
        phase: "everywhere",
        date: "2026-04-22",
        dateLabel: "22 April 2026",
        title: "The 2026 California policy agenda",
        kicker: "Building a Tech Economy That Works for All Californians",
        what: "ESCA Action publishes its 2026 agenda in five priorities: break concentrated tech power (the COMPETE Act, AB 1776, and the BASED Act, SB 1074); build and fund public tech infrastructure; end surveillance pricing (the Surveillance Pricing Protection Act, AB 2564); stop data centers offloading their energy and water costs; and establish worker technology rights.",
        role: "On CalCompute the asks are specific: &ldquo;Fully fund CalCompute&rsquo;s implementation,&rdquo; keep it &ldquo;without locking into a single private vendor,&rdquo; and &ldquo;Design CalCompute to avoid corporate capture.&rdquo; Winning the statute was not the end of the campaign.",
        origin: "public",
        sources: [
          {
            label: "Economic Security Project Action (2026). Building a Tech Economy That Works for All Californians.",
            url: "https://economicsecurity.us/resource/building-a-tech-economy-that-works-for-all-californians/"
          }
        ]
      },
      {
        id: "calcompute-report",
        phase: "everywhere",
        date: "2027-01-01",
        dateLabel: "By 1 January 2027",
        upcoming: true,
        title: "CalCompute framework due to the Legislature",
        kicker: "The next decision point",
        what: "The CalCompute Consortium&rsquo;s report on the framework for creating CalCompute is due to the Legislature on or before 1 January 2027. CalCompute has not yet been built or opened to users.",
        role: "The implementation fight ESCA named in its April 2026 agenda lands here: funding level, governance, and whether it avoids being captured by a single vendor.",
        origin: "public",
        sources: [
          {
            label: "CalCompute. Governor Newsom&rsquo;s SB 53 Signing Message.",
            url: "https://californiacompute.org/documents/SB-53-Signing-Message/"
          }
        ]
      }
    ]
  },

  taxi: {
    id: 'taxi',
    label: 'Taxi Drivers',
    lede: 'What happens to a workforce when the platform arrives?',
    standfirst: 'TK',
    tk: true,
    tkNote: 'This case study has not been written yet. The New York taxi medallion collapse and the driver debt campaigns that followed are the obvious spine, but nothing is drafted and nothing here is sourced, so the page says so rather than showing a placeholder that reads like research.'
  }
};
