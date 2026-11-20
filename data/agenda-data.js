// The Brief tab (called Agenda until 2026-11-19; its internal names still say agenda): an excerpt of "Ideas for Shared Economic Prosperity in the AI Transition", a brief by Becky Chao, Economic Security Project, April 2026.
// Hand-maintained, and NOT touched by any sync. Drawn by src/js/35-agenda.js into the Brief tab. How it is built and updated: docs/agenda.md.
//
// THE BRIEF'S WORDS ARE THEIRS. Every paragraph, heading, list item and footnote below is the brief as published, character for
// character (read from the PDF by script, then checked against a second extraction of it, both ways: nothing missing, nothing
// extra). Do not reword, shorten, copyedit or "fix" any of it; when the author revises the brief, replace the text from the new
// version and run tests/interactions.js. One thing in it reads like a typo and is kept as published: "families.The" in the first
// idea (the PDF has no space there). Tell the author, do not fix it here.
//
// LEFT OUT AT THE OWNER'S REQUEST (2026-11-19): the conclusion (one paragraph, no notes) and the whole introduction, so the page is the
// ideas alone. The introduction went in steps the same day: first its first three paragraphs ("Artificial Intelligence (AI) is
// transforming our economy...", "At the same time, the rush to build AI tools...", "People are rightfully nervous about AI...") and,
// with them, notes 1 to 11, which only those paragraphs cite; then everything but three pieces the owner chose (the first sentence of
// the paragraph the author opens in bold, "Ultimately, how society builds AI..."; the paragraph that begins "Given the universal
// uncertainty..."; and the second and third sentences of the paragraph that begins "This brief lays out...", "These ideas require
// additional analysis..."), with notes 12 and 13, which only the text cut then had cited; then those three too. The brief's own footnote
// numbers are kept, nothing is renumbered, so the notes below run from 14. The file used to hold the whole brief; that version is in the
// shared notes folder
// (~/Library/Application Support/Claude/side-session-notes/agenda-brief-extraction-2026-11-19/agenda-data.FULL-before-the-cut-2026-11-19.js).
//
// WHAT IS OURS, not the brief's: `url`, the paper's own page on the Economic Security Project's website (given by the owner on 2026-11-19; the blurb
// under the header links the brief's title to it), the short pathway `label`s, the Landscape `area` each pathway is shown under (the four areas of the
// Landscape are the four pathways, in the brief's order), the ids, each idea's `lede` (the opening sentence it shows while closed: a
// verbatim prefix of its first paragraph, which the tests check), and every `related` list, which points at the policy cards on the
// Landscape that cover the same ground. Those pointers are our reading, labelled "On the Landscape" on the page and not part of the
// brief: a card that is archived or renamed simply drops out of its row, and a typo in an id fails the tests.
//
// Text markup inside a string: **bold**, *italic*, and [^12] for footnote mark 12 (the brief numbers its notes 1 to 57, in order,
// each cited once; the notes below run from 14, see above). A note is plain text with *italics*; the page links every URL in it, as the PDF does.

const AGENDA_DATA = {
  title: "Ideas for Shared Economic Prosperity in the AI Transition",
  date: "APRIL 2026",
  author: "Becky Chao",
  url: "https://economicsecurityproject.org/resource/ai-transition/",
  pathways: [
    {
      id: "social-contract",
      area: "economic-security",
      label: "Social contract",
      title: "Modernize the Social Contract for an AI-Driven Economy",
      ideas: [
        {
          id: "resiliency",
          title: "Prioritize Resiliency and System Readiness for AI Disruptions",
          lede: "AI has the potential to disrupt work and introduce more economic precarity for workers and families.",
          blocks: [
            {
              p: "AI has the potential to disrupt work and introduce more economic precarity for workers and families.The scale of this disruption remains to be seen: some argue AI has the potential to make work obsolete entirely, while others predict that its widespread adoption may facilitate the creation of new jobs. The Brookings Institution estimates that 6.1 million U.S. workers working in clerical and administration roles with high exposure to AI will struggle to adapt and find new jobs.[^14] Regardless of the scale of AI’s impact on workers, policymakers must prepare economic policies that provide people with the dignity and care they deserve. As Jacob Leibenluft writes in learning from the failure of past trade adjustments to help displaced workers, deploying policy solutions that match the scale of disruption, prioritizing speed in delivering the assistance, and supporting workers’ agency and autonomy will be key in addressing AI-related job loss.[^15]"
            },
            {
              p: "Policymakers can ensure a smooth transition by evaluating whether existing economic policies sufficiently support people when they need it, and exploring new interventions to fill any gaps. Emerging ideas that build on existing social insurance programs include:"
            },
            {
              list: [
                {
                  lead: "Improve uptake and offerings of unemployment insurance:",
                  text: "Unemployment insurance will provide workers with critical bridge support until they find new work if they are displaced by AI. To ensure unemployment insurance is effective, however, policymakers must address the gap in uptake, as the majority of unemployed workers may not even apply for benefits,[^16] and explore complementary policies to support employment gains like reskilling and upskilling.[^17]",
                  related: ["ui-reform", "reskilling-accounts"]
                },
                {
                  lead: "Build towards a more robust public healthcare system:",
                  text: "Decoupling health insurance from private employers can ease disruptions arising from AI-related job loss while ensuring continued access to health care services. For U.S. residents under 65, employer-sponsored health insurance is the largest source of health coverage.[^18] If AI leads to job loss, policymakers must contend with the fact that many workers will also lose their health coverage.",
                  related: ["delink-healthcare", "portable-benefits"]
                },
                {
                  lead: "Establish an income floor for displaced workers:",
                  text: "To mitigate the uncertainty workers face in the age of AI, direct cash transfers could also provide an economic floor allowing people to weather the shock of labor market changes. Direct cash interventions, however, shouldn’t be used as a justification for labor displacement from automation or substitution for including impacted workers in conversations around AI adoption and regulation.",
                  related: ["guaranteed-income-ubi"]
                },
                {
                  lead: "Reevaluate the traditional models of work:",
                  text: "AI boosts in productivity could help employers shift to a four-day work-week, which could also help reduce unemployment from job displacement by sharing the remaining work more widely. There are important questions about whether a four-day work-week would also lead to a reduction in workers’ salaries to reflect four days’ worth of pay.[^19] As conversations about AI’s potential evolve, it’s critical to wrestle with how workers can ensure that they also benefit from AI’s productivity gains on measures such as free time.",
                  related: ["shorter-workweek"]
                }
              ]
            }
          ],
          related: []
        },
        {
          id: "tax-code",
          title: "Reform the Tax Code to Ensure Shared Wealth",
          lede: "Tax policy can be an important tool to generate tax revenue and address growing inequality in the age of AI.",
          blocks: [
            {
              p: "Tax policy can be an important tool to generate tax revenue and address growing inequality in the age of AI. Economists have studied how tax policy can actively shape labor markets. Daron Acemoglu, Andrea Manera, and Pascual Restrepo found the U.S. tax code incentivizes companies to invest in robots and software over people and labor, potentially leading to too much automation that displaces workers.[^20] There’s a risk that as AI leads to wealth gains for a select few, it’ll leave workers behind, collapsing the labor-share of income and compounding existing inequalities in our society."
            },
            {
              p: "Researchers, scholars, and advocates have started to explore different tax vehicles, like corporate taxes or a wealth tax, to address this problem.[^21] Tax policy can also raise revenue to incentivize and potentially support high-quality, in-demand jobs in sectors like healthcare, childcare, and the trades like construction and maintenance. Preliminary proposals for various forms of an “AI dividend” have already been introduced to potentially compensate people for the use of their data to train AI models.[^22] An “AI dividend” is modeled after the Alaska Permanent Fund, which compensates Alaskan citizens using investment returns on a sovereign wealth fund funded by oil and gas royalties.[^23] These ideas surface important debates about how policymakers can ensure AI benefits people whose data it’s derived from while giving people more agency over their lives."
            }
          ],
          related: ["wealth-tax", "automation-levy", "ai-dividend", "sovereign-wealth-fund", "care-economy-investment"]
        }
      ]
    },
    {
      id: "workers",
      area: "labor-worker-rights",
      label: "Workers",
      title: "Protect & Empower Workers",
      ideas: [
        {
          id: "worker-rights",
          title: "Secure Robust Worker Rights and Protections",
          lede: "Incorporating workers’ perspectives into the policymaking process can help ensure more equitable and safe AI development and implementation.",
          blocks: [
            {
              p: "Incorporating workers’ perspectives into the policymaking process can help ensure more equitable and safe AI development and implementation. AFL-CIO and TechEquity have developed principles to protect and empower workers in the AI transition that policymakers should consider.[^24] People should not have to submit to intrusive, invasive surveillance when they go to work. Policymakers should consider requiring employers to provide full transparency about how AI is used to monitor and surveil workers in the workplace, both in real life and in virtual workplaces. Policymakers should also prioritize prohibiting common, harmful uses of AI surveillance tools, including: facial recognition, biometric surveillance, predictive behavior modeling, and monitoring and quotas that violate health and labor laws. High-quality AI workforce and digital literacy training and education programs will also be key to ensuring a smooth transition for workers impacted by AI-related shifts in in-demand job skills.[^25]"
            }
          ],
          related: ["worker-data-rights", "algorithmic-transparency", "reskilling-accounts"]
        },
        {
          id: "wage-setting",
          title: "Regulate AI-Driven Wage-Setting and Scheduling",
          lede: "Employers can use AI algorithms on gig platforms like Uber to determine rideshare drivers’ pay and work schedules, ultimately encouraging workers to work for lower pay and less predictable work schedules than if they were full-time salaried workers.",
          blocks: [
            {
              p: "Employers can use AI algorithms on gig platforms like Uber to determine rideshare drivers’ pay and work schedules, ultimately encouraging workers to work for lower pay and less predictable work schedules than if they were full-time salaried workers.[^26] These gig-work labor models and the algorithmic management technologies that these apps use to pair workers with gigs are also being exported to other labor sectors, like health care. For instance, many nurses use on-demand nursing apps to indicate interest in picking up shifts in various medical facilities.[^27] These gig platforms advertise this algorithmic scheduling software as cutting edge AI that matches understaffed facilities with nurses looking for work.[^28] But there’s usually little transparency into how these algorithms set nurses’ pay: these apps show workers different shifts on different phones, often for different amounts of pay, and sometimes encourage workers to bid against each other by indicating the lowest hourly rate they are willing to work for.[^29] Policymakers should regulate these AI-driven wage-setting and scheduling practices to protect workers."
            }
          ],
          related: ["algorithmic-transparency", "sectoral-bargaining", "worker-data-rights"]
        }
      ]
    },
    {
      id: "markets",
      area: "ai-governance",
      label: "Markets",
      title: "Shape Fair and Competitive AI Markets",
      ideas: [
        {
          id: "public-ai",
          title: "Strengthen Public Investment for Public AI",
          lede: "Public investment can steer AI innovation in the public interest.",
          blocks: [
            {
              p: "Public investment can steer AI innovation in the public interest. Ideas like a national investment fund or similar initiatives like the National Artificial Intelligence Research Resource (NAIRR) can leverage private-public partnerships to offer researchers, educators, entrepreneurs, and small businesses critical access to resources like computing power, datasets, and training to build public AI. Through an application process, NAIRR decides which U.S.-based researchers and educators get access to these resources. States can also explore interventions like CalCompute, a public option for cloud computing established by California state legislation SB 53 in 2025[^30]. These forms of government support can help lead to new AI solutions that address pressing public problems, like critical medical research and benefits administration."
            }
          ],
          related: ["public-ai-compute"]
        },
        {
          id: "antimonopoly",
          title: "Deploy Antimonopoly Tools to Foster Innovation & Check Bad Actors",
          lede: "Consumers may think the AI sector is competitive based on the plethora of affordable AI models and applications available on the market today.",
          blocks: [
            {
              p: "Consumers may think the AI sector is competitive based on the plethora of affordable AI models and applications available on the market today.[^31] But competition can be fragile as AI markets evolve, and the AI products most consumers interact with are only one part of a multi-layered, interconnected AI stack. One of the most essential keys to competition lies elsewhere in this stack, specifically in the infrastructure layer, where a handful of gatekeepers provide cloud services, computing power, and chips.[^32] Without access to this critical infrastructure, models and application developers would not be able to even build their products and deliver their services to end users. Crucially, these third-party models and applications may also be competing with the infrastructure providers’ own offerings at the models and applications level. Model developers and infrastructure providers are also leveraging investment partnerships to secure access to these important inputs, raising important antitrust questions about whether these deals may create competitive bottlenecks.[^33]"
            },
            {
              p: "Antimonopoly solutions can ensure a level playing field for nascent and early stage start-ups and entrepreneurs in a dynamic marketplace and should be considered in specific contexts. For example, there may be a risk that infrastructure providers can cut off or restrict critical access for applications reliant on their services, so that they give their own applications preferential treatment, known as self-preferencing. In this scenario, enacting non-discrimination rules for infrastructure providers would require them to provide equal service and equal terms to all similarly-situated customers without favoritism.[^34] In another scenario, the Federal Trade Commission is investigating whether Microsoft’s business practices make it harder for customers to use Windows or Office on rival cloud services because it hasn’t made its own software products interoperable with them.[^35] These dynamics underscore the importance of data portability and interoperability rules in enabling users across different platforms to plug and play across the different systems.[^36] Ultimately, antitrust and competition policy can help ensure a thriving, competitive AI marketplace."
            }
          ],
          related: ["ai-structural-separation", "ai-interoperability-mandate", "ai-merger-enforcement"]
        }
      ]
    },
    {
      id: "affordability",
      area: "mitigating-harms",
      label: "Affordability",
      title: "Mitigate AI’s Role in Exacerbating the Affordability Crisis",
      ideas: [
        {
          id: "pricing",
          title: "Prohibit Companies from Using AI to Charge Consumers Higher Prices",
          lede: "AI supercharges certain pricing strategies and increases their speed, scale, and scope.",
          blocks: [
            {
              p: "AI supercharges certain pricing strategies and increases their speed, scale, and scope. AI has made it possible for companies to leverage personal data from multiple sources on an unprecedented scale to set personalized prices based on real-time signals like consumers’ locations, demographics, credit history, and browsing history.[^37] As a result, companies can charge consumers higher prices for products based on their search history[^38] or rideshares based on smartphone battery level, as Uber has been accused of doing.[^39] Separately, companies have used pricing algorithms for decades now. They’ve historically needed to program parameters and rules for pricing algorithms. But machine learning, a type of AI, has made it possible for algorithms to learn from data without explicit programming.[^40] Using these AI tools, companies can set prices based on changing market dynamics like supply and demand in real time.[^41]"
            },
            {
              p: "These AI-enabled algorithms can also learn to maximize revenue over time, sometimes facilitating collusion to hamper competition and set higher prices for consumers. It used to be that companies could only collude by agreeing to manipulate the market through direct communication. Price-fixing is one type of collusion where companies agree to set prices together. With the rise of AI-enabled algorithms, companies are now able to fix prices even without competitive data directly exchanging hands or being instructed to cooperate instead of compete.[^42] Corporate landlords, for example, were able to coordinate using RealPage’s AI-enabled algorithm and charge renters 4% higher prices, an average of $70 a month, in housing markets across the country.[^43] Policymakers can save consumers money by exploring interventions that prohibit these AI-enabled pricing strategies."
            }
          ],
          related: ["promoting-affordability", "consumer-data-privacy"]
        },
        {
          id: "energy-costs",
          title: "Ensure Households Don’t Pay for AI Data Centers’ Energy Costs",
          lede: "Electricity prices have increased across the board, but households are experiencing bigger increases than commercial users like data centers, even when data centers’ electricity demand is growing at a faster rate.",
          blocks: [
            {
              p: "Electricity prices have increased across the board, but households are experiencing bigger increases than commercial users like data centers, even when data centers’ electricity demand is growing at a faster rate.[^44] The typical U.S. household was already paying $142 per month for electricity in 2024.[^45] Yale Climate Connections calculates that between 2022 to 2024, residential electricity prices increased 10% while commercial users like data centers experienced a 3% increase in comparison.[^46] U.S. data centers’ electricity use tripled from 2020 to 2024,[^47] whereas residential users’ electricity demand increased only 1% between 2021 and 2024.[^48] Goldman Sachs projects that relative to 2023 levels, global data center power demand will grow by 220% in 2030, with about 60% of this demand coming from the U.S.[^49]"
            },
            {
              p: "These substantial loads will require significant investments in U.S. utility grid expansions, like new power plants and transmission lines, to meet demand. Forecasted capital investments to support AI-related data center demand have varied from over $600 billion between 2026 and 2030[^50] to about $3 to $8 trillion by 2030.[^51] In certain markets, these capital investment costs are likely to be subsidized by consumers who are already seeing electricity price increases of 6.9% in 2025 year-over-year, even as data centers are driving 40% of this electricity growth demand.[^52] Households are on track to see an additional 6% increase in electricity prices through 2027.[^53] The Natural Resources Defense Council estimates that the average family serviced by grid operator PJM will pay approximately $70 more per month on their electricity bills because of forecasted data center growth.[^54]"
            },
            {
              p: "While energy is a state-by-state issue, policymakers should explore potential policies that could shift the burden away from households and back onto data centers. For example, states and localities could mandate transparency into energy usage and pricing, to inform decisions about data center development, including how to manage forecasted load growths stemming from data centers.[^55] Policymakers could also introduce fair cost allocation, including possibly creating new classes of users on electrical grids to distinguish between data centers and households. Localities could then choose to charge higher rates for clients with greater usage.[^56] States and localities could also impose a large load utility tax on clients that use disproportionately more energy to fund heat pumps and rooftop solar in nearby areas.[^57]"
            }
          ],
          related: []
        }
      ]
    }
  ],
  notes: {
    14: "Sam Manning, Tomás Aguirre, Mark Muro, and Shriya Methkupally, “Measuring US workers’ capacity to adapt to AI-driven job displacement,” Brookings Institution, January 21, 2026, https://www.brookings.edu/articles/measuring-us-workers-capacity-to-adapt-to-ai-driven-job-displacement/.",
    15: "Jacob Leibenluft, “Lessons from past trade adjustment policies to support displaced workers in the era of artificial intelligence,” Washington Center for Equitable Growth, March 11, 2026, https://equitablegrowth.org/research-paper/lessons-from-past-trade-adjustment-policies-to-support-displaced-workers-in-the-era-of-artificial-intelligence/.",
    16: "The Bureau of Labor Statistics reported that in 2022, only 26% of unemployed workers applied for unemployment insurance benefits since separating from their last job. “Most unemployed people in 2022 did not apply for unemployment insurance benefits,” U.S. Bureau of Labor Statistics, April 14, 2023, https://www.bls.gov/opub/ted/2023/most-unemployed-people-in-2022-did-not-apply-for-unemployment-insurance-benefits.htm.",
    17: "Florence Jaumotte et al., “Bridging Skill Gaps for the Future: New Jobs Creative in the AI Age,” International Monetary Fund, January 2026, https://www.imf.org/-/media/files/publications/sdn/2026/english/sdnea2026001.pdf.",
    18: "Gary Claxton, Matthew Rae, and Aubrey Winger, “Employer-Sponsored Health Insurance 101,” KFF, October 2025, https://www.kff.org/health-costs/health-policy-101-employer-sponsored-health-insurance.",
    19: "See, e.g., Robert Reich, “The bogus four-day workweek that AI supposedly ‘frees up,’” The Guardian, February 18, 2026, https://www.theguardian.com/technology/ng-interactive/2026/feb/18/ai-four-day-workweek.",
    20: "Daron Acemoglu, Andrea Manera, and Pascual Restrepo, “Does the US tax code favor automation?” Brookings Institution, March 18, 2020, https://www.brookings.edu/articles/does-the-u-s-tax-code-favor-automation/.",
    21: "See, e.g., Anton Korinek and Lee M. Lockwood, “The future of tax policy: A public finance framework for the age of AI,” Brookings Institution, January 8, 2026, https://www.brookings.edu/articles/future-tax-policy-a-public-finance-framework-for-the-age-of-ai/; and “The Equity & Prosperity Agenda: A Tax Plan to Promote a Fair, Inclusive, and Competitive Economy,” Economic Security Project, October 30, 2024, https://economicsecurityproject.org/resource/the-equity-prosperity-agenda/.",
    22: "See, e.g., Barath Raghavan and Bruce Schneier, \"Artificial Intelligence Can’t Work Without Our Data,” *Politico*, June 29, 2023, https://www.politico.com/news/magazine/2023/06/29/ai-pay-americans-data-00103648.",
    23: "Mary Bogle, \"How and Why AI Could Pay a Dividend to the American People,\" *Urban Wire* (blog), Urban Institute, March 23, 2026, https://www.urban.org/urban-wire/how-and-why-ai-could-pay-dividend-american-people.",
    24: "See, e.g., “Artificial Intelligence: Principles to Protect Workers,” AFL-CIO, October 15, 2025, https://aflcio.org/reports/workers-first-ai; “TechEquity AI Policy Principles,” TechEquity, March 2024, https://techequity.us/ai-policy-principles/; and “AI & Workforce Development - November 2025 Report,” TechEquity, November 19, 2025, https://techequity.us/2025/11/19/ai-workforce-development-november-2025-report/.",
    25: "See, e.g., “Artificial Intelligence: Principles to Protect Workers,” AFL-CIO, October 15, 2025, https://aflcio.org/reports/workers-first-ai.",
    26: "Veena Dubal, “On Algorithmic Wage Discrimination,” Columbia Law Review 1243, no. 7 (2023), https://columbialawreview.org/content/on-algorithmic-wage-discrimination/.",
    27: "Molly Glick, “Why You Might Soon Be Paid Like an Uber Driver–Even if You’re Not One,” Slate, October 13, 2024, https://slate.com/technology/2024/10/uber-lyft-gig-workers-artificial-intelligence-wage-discrimination-jobs.html; Katie J. Wells and Funda Ustek Spilda, “Uber for Nursing: How an AI-Powered Gig Model is Threatening Health Care,” Roosevelt Institute, December 17, 2024, https://rooseveltinstitute.org/publications/uber-for-nursing/.",
    28: "Ibid.",
    29: "Ibid.",
    30: "Economic Security Project. \"Governor Newsom Signs SB 53, Establishing California as Global Leader in AI Safety and Innovation.\" Press release, September 29, 2025. https://economicsecurityproject.org/news/governor-newsom-signs-sb-53/",
    31: "See, e.g., Jason Furman, “I Thought I Understood A.I. Companies. I Couldn’t Have Been More Wrong.” The New York Times, February 25, 2026, https://www.nytimes.com/2026/02/25/opinion/ai-industry-competition-innovation.html.",
    32: "See, e.g., Amba Kak and Sarah Myers West, “2023 Landscape: Confronting Tech Power,” AI Now Institute, April 11, 2023, https://ainowinstitute.org/2023-landscape and Barry Lynn, Max von Thun, Karina Montoya, “AI in the Public Interest: Confronting the Monopoly Threat,” Open Markets Institute, November 2023, https://www.openmarketsinstitute.org/publications/report-ai-in-the-public-interest-confronting-the-monopoly-threat.",
    33: "See, e.g., “2026 Antitrust Year in Preview: AI,” Wilson Sonsini, January 22, 2026, https://www.wsgr.com/en/insights/2026-antitrust-year-in-preview-ai.html, and “FTC Issues Staff Report on AI Partnerships & Investments Study,” Federal Trade Commission, January 17, 2025, https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-issues-staff-report-ai-partnerships-investments-study.",
    34: "Non-discrimination rules could prohibit companies that operate in multiple layers of the AI infrastructure from preferencing their own products and services and discriminating against competitors by charging them higher prices or refusing to deal with them entirely. See, Tejas N. Narechania & Ganesh Sitaraman, An Antimonopoly Approach to Governing Artificial Intelligence, 43 Yale L. & Pol'y Rev. 95 (2024), https://yalelawandpolicy.org/sites/default/files/YLPR/narechania_sitaraman_anantimonopolyapproach_ylpr_2024.pdf.",
    35: "Josh Sisco, Dina Bass, and Matt Day, “FTC Ratchets Up Microsoft Probe, Queries Rivals on Cloud, AI,” Bloomberg Law, February 13, 2026, https://news.bloomberglaw.com/artificial-intelligence/ftc-ratchets-up-microsoft-probe-queries-rivals-on-cloud-ai.",
    36: "Tejas N. Narechania & Ganesh Sitaraman, An Antimonopoly Approach to Governing Artificial Intelligence, 43 Yale L. & Pol'y Rev. 95 (2024), https://yalelawandpolicy.org/sites/default/files/YLPR/narechania_sitaraman_anantimonopolyapproach_ylpr_2024.pdf.",
    37: "AI Now Institute et al., “Prohibiting Surveillance Prices and Wages,” February 2025, https://ainowinstitute.org/publications/ai-now-coauthors-report-on-surveillance-prices-and-wages.",
    38: "Qiu, Liying and Huang, Yan and Singh, Param Vir and Srinivasan, Kannan, Personalization, Consumer Search and Algorithmic Pricing (September 28, 2023). Available at SSRN: https://ssrn.com/abstract=4132555.",
    39: "VICE Staff, “Uber Accused of Charging People More If Their Phone Battery is Low,” VICE, April 11, 2023, https://www.vice.com/en/article/uber-surge-pricing-phone-battery/.",
    40: "Sara Brown, “Machine learning and generative AI: What are they good for in 2025?” MIT Management Sloan School, June 2, 2025, https://mitsloan.mit.edu/ideas-made-to-matter/machine-learning-and-generative-ai-what-are-they-good-for, and Alikhani, Matene, Information Exchanges Involving AI Pricing Algorithms (May 01, 2025). Available at SSRN: https://ssrn.com/abstract=5606010.",
    41: "Ibid.",
    42: "Emilio Calvano, Giacomo Calzolari, Vincenzo Denicolò, and Sergio Pastorello, Artificial Intelligence, Algorithmic Pricing and Collusion, April 2019, https://www.ftc.gov/system/files/documents/public_events/1494697/calzolaricalvanodenicolopastorello.pdf.",
    43: "Sophie Calder-Wang and Gi Heung Kim, “Algorithmic Pricing in Multifamily Rentals: Efficiency Gains or Price Coordination?” August, 16, 2024, https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4403058 and “The Cost of Anticompetitive Pricing Algorithms in Rental Housing,” White House, December 17, 2024, https://bidenwhitehouse.archives.gov/cea/written-materials/2024/12/17/the-cost-of-anticompetitive-pricing-algorithms-in-rental-housing/.",
    44: "Karin Kirk, “Home electricity bills are skyrocketing. For data centers, not so much.” Yale Climate Connections, January 5, 2026, https://yaleclimateconnections.org/2026/01/home-electricity-bills-are-skyrocketing-for-data-centers-not-so-much/.",
    45: "Rebecca Leppert, “What we know about energy use at U.S. data centers amid the AI boom,” Pew Research Center, October 24, 2025, https://www.pewresearch.org/short-reads/2025/10/24/what-we-know-about-energy-use-at-us-data-centers-amid-the-ai-boom/#how-could-data-centers-affect-americans-electricity-bills.",
    46: "Karin Kirk, “Home electricity bills are skyrocketing. For data centers, not so much.” Yale Climate Connections, January 5, 2026, https://yaleclimateconnections.org/2026/01/home-electricity-bills-are-skyrocketing-for-data-centers-not-so-much/.",
    47: "Arman Shehabi et al., 2024 United States Data Center Energy Usage Report (Berkeley Lab Energy Analysis & Environmental Impacts Division, December 2024), https://escholarship.org/uc/item/32d6m0d1.",
    48: "Karin Kirk, “Home electricity bills are skyrocketing. For data centers, not so much.” Yale Climate Connections, January 5, 2026, https://yaleclimateconnections.org/2026/01/home-electricity-bills-are-skyrocketing-for-data-centers-not-so-much/.",
    49: "“How rising hyperscaler reinvestment impacts the 6 Ps driving power growth/constraints,” Goldman Sachs, February 23, 2026, https://www.goldmansachs.com/pdfs/insights/goldman-sachs-research/how-rising-hyperscaler-reinvestment-impacts-power-growth-constraints/report.pdf.",
    50: "Ibid.",
    51: "“The cost of compute: A $7 trillion race to scale data centers,” McKinsey & Company, April 28, 2025, https://www.mckinsey.com/industries/technology-media-and-telecommunications/our-insights/the-cost-of-compute-a-7-trillion-dollar-race-to-scale-data-centers.",
    52: "Spencer Kimball, “Electricity prices rising by double the rate of inflation. Data center demand means no relief ahead, analysts say,” CNBC, February 12, 2026, https://www.cnbc.com/2026/02/12/electricity-price-data-center-ai-inflation-goldman.html; Ari Peskoe and Eliza Martin, Extracting Profits from the Public: How Utility Ratepayers Are Paying for Big Tech’s Power (Harvard Law School Environmental & Energy Law Program, March 2025), https://eelp.law.harvard.edu/extracting-profits-from-the-public-how-utility-ratepayers-are-paying-for-big-techs-power/. The impact of data centers on household electricity prices can vary across specific markets. For example, data centers can lead to lower electricity prices for households if they are built in markets with spare capacity or operate outside of peak usage areas. See, e.g., Ryan H. Wiser et al, “Factors Influencing Recent Trends in Retail Electricity Prices in the United States,” Berkeley Lab Energy Markets & Planning, October 2025, https://emp.lbl.gov/publications/factors-influencing-recent-trends.",
    53: "Spencer Kimball, “Electricity prices rising by double the rate of inflation. Data center demand means no relief ahead, analysts say,” CNBC, February 12, 2026, https://www.cnbc.com/2026/02/12/electricity-price-data-center-ai-inflation-goldman.html",
    54: "Tom Rutigliano, “Building Data Centers Without Breaking PJM,” September 30, 2025, https://www.nrdc.org/bio/tom-rutigliano/building-data-centers-without-breaking-pjm. See also Josh Saul, Leonardo Nicoletti, Demetrios Pogkas, Dina Bass, and Naureen Malik, “AI Data Centers Are Sending Power Bills Soaring,” Bloomberg Technology, September 29, 2025, https://www.bloomberg.com/graphics/2025-ai-data-centers-electricity-prices/.",
    55: "See e.g., Arman Shehabi et al., 2024 United States Data Center Energy Usage Report (Berkeley Lab Energy Analysis & Environmental Impacts Division, December 2024), https://escholarship.org/uc/item/32d6m0d1.",
    56: "Ian Goldsmith and Zach Byrum, “Powering the US Data Center Boom: Why Forecasting Can Be So Tricky,” World Resources Institute, September 17, 2025, https://www.wri.org/insights/us-data-centers-electricity-demand.",
    57: "See, e.g., Cora Wyent, Miki Verma, and Wael Kanj, “Homegrown energy: How household upgrades can meet 100 percent of data center demand growth,” Rewiring America, December 2025, https://a-us.storyblok.com/f/1021068/x/7ea6f4dba0/homegrown-energy-report-rewiring-america-dec2025.pdf."
  }
};
