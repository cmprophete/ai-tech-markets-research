// Content for the Regulation tab (The Tech / Workers / Cash).
//
// Hand-maintained, like THEMES / POLICY_DATA / FACT_BANK / CASE_STUDIES.
// Loads at runtime, so a content edit needs a reload, not a `python3 build.py`.
//
// SOURCING. The three pages are each built on one named source, given in
// `source` below, and the framing quotes are verbatim from it. Structural
// claims (which firms sit at which layer of the stack) are descriptive and
// carry no market-share figures, because this repo does not publish a number
// it cannot source. Where a cited study's own authors flag a design limit,
// that limit rides along with the finding in `caveat` -- do not drop it to
// make a row read more cleanly.

const REGULATION = {

  /* ── 1. THE TECH ──────────────────────────────────────────────────── */
  tech: {
    id: 'tech',
    label: 'The Tech',
    lede: 'Who owns the layer underneath?',
    standfirst: 'Artificial intelligence is a general-purpose technology built on public research and public data. The industry that delivers it is a short stack of layers, and the same few companies sit on nearly all of them, competing with the customers who depend on them.',
    source: {
      label: 'Economic Security Project (2026). Ideas for Shared Economic Prosperity in the AI Transition.',
      url: 'https://economicsecurityproject.org/resource/ai-transition/'
    },
    frame: {
      quote: 'How society builds and manages AI is a public choice.',
      attrib: 'Ideas for Shared Economic Prosperity in the AI Transition'
    },

    /* The stack, bottom to top. `firms` are the parent companies with a
       position at that layer; `integrated` marks the ones that recur up the
       stack, which is the whole point of the drawing. No shares are given,
       only presence. */
    stack: [
      { id: 'chips', name: 'Chips', note: 'The silicon models train on',
        firms: [
          { name: 'Nvidia', key: 'nvidia' },
          { name: 'AMD', key: 'amd' },
          { name: 'Google (TPU)', key: 'google', integrated: true },
          { name: 'Amazon (Trainium)', key: 'amazon', integrated: true },
          { name: 'Microsoft (Maia)', key: 'microsoft', integrated: true }
        ] },
      { id: 'compute', name: 'Cloud compute', note: 'Where training actually runs',
        firms: [
          { name: 'Amazon', key: 'amazon', integrated: true },
          { name: 'Google', key: 'google', integrated: true },
          { name: 'Microsoft', key: 'microsoft', integrated: true }
        ] },
      { id: 'models', name: 'Foundation models', note: 'The general-purpose layer',
        firms: [
          { name: 'OpenAI', key: 'openai' },
          { name: 'Anthropic', key: 'anthropic' },
          { name: 'Google DeepMind', key: 'google', integrated: true },
          { name: 'Meta', key: 'meta' }
        ] },
      { id: 'apps', name: 'Applications', note: 'Where the public meets it',
        firms: [
          { name: 'Thousands of firms', key: 'many', wide: true },
          { name: 'and the same giants', key: 'giants', integrated: true }
        ] }
    ],
    stackTakeaway: 'ESP’s brief puts the concentration plainly: the computing power needed for advanced AI development is dominated by just three companies, Amazon, Google and Microsoft. A firm renting compute at one layer may be competing with its landlord at another.',

    /* The second half of the brief: the technology and the companies are not
       the same object, and conflating them is how "regulating AI" becomes
       "regulating whatever these firms already do". */
    contrast: {
      heading: 'The technology is not the companies',
      tech: {
        label: 'The technology',
        points: [
          'General-purpose: one model serves medicine, logistics and fraud detection alike.',
          'Non-rival: the same weights can serve everyone at once without being used up.',
          'Built on public research, public data and publicly funded science.'
        ]
      },
      firms: {
        label: 'The companies',
        points: [
          'Few, and vertically integrated across chips, compute and models.',
          'Suppliers to their own competitors at the application layer.',
          'Setting the terms on which everyone else gets to build.'
        ]
      },
      close: 'Regulating the companies is not the same as regulating the technology. The first is antitrust and utility policy. The second is a choice about what gets built.'
    },

    actionsLabel: 'Three big things to do next',
    actions: [
      { n: '01', title: 'Stop self-preferencing at the infrastructure layer',
        text: 'Apply non-discrimination rules to infrastructure providers so they cannot favor their own applications over the firms renting from them. This is the oldest tool in the box, borrowed from railroads and telecoms, and it does not require anyone to predict what AI will do next.' },
      { n: '02', title: 'Make data portable and systems interoperable',
        text: 'Require data portability and interoperability across platforms, so a user or a business can leave. Lock-in is what converts a temporary technical lead into a permanent position, and interoperability is the standing remedy for it.' },
      { n: '03', title: 'Build a public option for compute',
        text: 'Fund public AI directly: the National AI Research Resource federally, and state options such as CalCompute, the public cloud cluster established by SB 53 in California. A public option changes the terms available to everyone else, including those who never use it.' }
    ]
  },

  /* ── 2. WORKERS ───────────────────────────────────────────────────── */
  workers: {
    id: 'workers',
    label: 'Workers',
    lede: 'Does the machine make your expertise worth more, or worth less?',
    standfirst: 'Acemoglu, Autor and Johnson argue that AI is not one thing with one effect on work. It is a set of choices about what to build, and the money currently points the wrong way. Policy is what redirects it.',
    source: {
      label: 'Acemoglu, D., Autor, D., &amp; Johnson, S. (2026). Building Pro-Worker AI. The Hamilton Project, Brookings Institution.',
      url: 'https://www.hamiltonproject.org/publication/paper/building-pro-worker-ai/'
    },
    frame: {
      quote: 'It is not the responsibility of individual firms to make our AI-intensive future work well for workers',
      attrib: 'Acemoglu, Autor and Johnson'
    },

    /* The paper's test, as the hinge of the flow diagram. */
    test: 'Does it make human skills and expertise more valuable?',

    /* The paper's five categories, sorted onto the two branches. `rank` is
       the paper's own emphasis: new task-creating is called "unambiguously
       pro-worker", automating is the clearest case against. */
    branches: [
      { id: 'replacing', label: 'Labor-replacing', answer: 'No',
        tone: 'against',
        kinds: [
          { name: 'Automating', note: 'Machines take over tasks workers do now.', flag: 'The clearest case against' },
          { name: 'Capital-augmenting', note: 'Returns accrue to equipment, not to people.' }
        ] },
      { id: 'proworker', label: 'Pro-worker', answer: 'Yes',
        tone: 'for',
        kinds: [
          { name: 'Labor-augmenting', note: 'The same tasks, done better by the same worker.' },
          { name: 'Expertise-leveling', note: 'More workers can do what only experts could.' },
          { name: 'New task-creating', note: 'Generates demand for novel human expertise.', flag: 'Unambiguously pro-worker' }
        ] }
    ],
    gravity: {
      heading: 'Why the default runs left',
      text: 'Pro-worker tools can be good for firms too, but firms have weak incentives to build them: automating expertise promises the larger return. The paper adds that the field’s focus on artificial general intelligence makes pro-worker work less likely still. Left alone, the flow does not sit in the middle. It runs downhill.'
    },

    leversLabel: 'What redirects it',
    leverNote: 'The paper’s levers, in its own order, grouped by what each one actually moves.',
    leverGroups: [
      { id: 'direct', name: 'Direct the research',
        items: [
          'Focus pro-worker AI on health care and education, where the opportunities are already plentiful.',
          'Use grant-making to steer some AI development toward pro-worker outcomes.',
          'Run R&amp;D and procurement through DARPA-style competitive prize models.'
        ] },
      { id: 'price', name: 'Fix the price signal',
        items: [
          'Rebalance the tax code so hiring and training workers is taxed on a par with buying equipment and software.'
        ] },
      { id: 'capacity', name: 'Build capacity and competition',
        items: [
          'Build AI expertise inside federal and state government so it can set and pursue deployment goals.',
          'Use antitrust enforcement to encourage competition and new business models.',
          'Loosen licensure and scope-of-practice rules that shield incumbents from new entrants.'
        ] },
      { id: 'standing', name: 'Give workers standing',
        items: [
          'Create institutional channels for worker input.',
          'Build legal frameworks giving workers ownership of their skills and creative output, discouraging &ldquo;expertise theft&rdquo;.'
        ] }
    ]
  },

  /* ── 3. CASH ──────────────────────────────────────────────────────── */
  cash: {
    id: 'cash',
    label: 'Cash',
    lede: 'Not whether. When.',
    standfirst: 'The argument in Right on Time is that unconditional cash does its strongest work at moments of transition, when income is unstable and a single setback can harden into lasting insecurity. That reframing changes both the policy design and the politics.',
    source: {
      label: 'Hashash, S., Tellman, M., &amp; Semery-Palumbo, R. (2026). Right on Time. Economic Security Project.',
      url: 'https://economicsecurityproject.org/resource/right-on-time/'
    },
    frame: {
      quote: 'Cash that arrives at these moments prevents temporary precarity from becoming permanent',
      attrib: 'Right on Time'
    },

    /* The diagram: one shock, two paths. Labels only -- the shape carries
       the argument, and no quantity is implied by the curve. */
    diagram: {
      baseline: 'Stable enough',
      shock: 'The transition',
      // Both paths begin with the same event, so it is one labelled beat that
      // the two lines run through, not the same words printed twice.
      shared: 'Income drops',
      paths: [
        { id: 'without', label: 'Without cash at the moment', tone: 'bad',
          beats: ['Savings gone', 'Debt, eviction, lost job', 'Lasting insecurity'] },
        { id: 'with', label: 'With cash at the moment', tone: 'good',
          beats: ['Cash bridges the gap', 'Costs stay contained', 'Back to baseline'] }
      ],
      note: 'Cash steadies people; it doesn’t try to move the entire arc of their lives.'
    },

    momentsLabel: 'The moments',
    moments: [
      'A new child', 'Caregiving for family', 'Serious illness or disability',
      'Job loss or layoff', 'Going back to school', 'Leaving incarceration',
      'Aging out of foster care', 'Leaving an unsafe relationship',
      'Eviction or a forced move', 'A natural disaster', 'Ages 50 to 64, pre-Medicare'
    ],

    scaleLabel: 'How often this happens',
    scale: [
      { stat: 'About 21M', text: 'layoffs or firings in a year' },
      { stat: '63 million', text: 'unpaid family caregivers' },
      { stat: '90', text: 'major disaster declarations in 2024' },
      { stat: 'Nearly 2 in 3', text: 'families cannot cover a simultaneous income drop and expense spike' }
    ],

    evidenceLabel: 'What the pilots found',
    evidenceNote: 'More than 250 guaranteed income pilots have run across 40 states and D.C. These are among the strongest results, each shown with the design limit its own authors record. Read the caveat before you use the number.',
    evidence: [
      { stat: 'Half', text: 'the homelessness rate of control households at two years',
        where: 'Philadelphia, PHLHousing+', design: 'Randomized, with a control group' },
      { stat: '41% / 64%', text: 'fewer parole violations, and fewer violent violations',
        where: 'Reentry program, LA and Alameda counties', design: 'Evaluated against comparison groups' },
      { stat: '18% / 27%', text: 'fewer preterm births and fewer low-birthweight births',
        where: 'Flint, Michigan, Rx Kids', design: 'Population-level, citywide enrolment' },
      { stat: '2x', text: 'more likely to apply for education or training',
        where: 'Baltimore, young parents', design: 'Compared against a control group' },
      { stat: '13% to 1%', text: 'self-reported homelessness among foster youth',
        where: 'New York City pilot', design: 'Pre/post within the pilot',
        caveat: 'No control group: the change is measured against the same group before the program, not against similar people without it.' },
      { stat: '73% to 27%', text: 'food insecurity among former foster youth',
        where: 'Alameda County', design: 'Small sample',
        caveat: 'N = 67. Directionally strong, but too small to carry weight on its own.' },
      { stat: 'No effect', text: 'on preregistered child outcomes at four years',
        where: 'Baby’s First Years', design: 'Randomized controlled trial', nullResult: true,
        caveat: 'The best-powered trial in the set returned a null on its primary outcomes, though spending on child-focused items and early learning did rise in the early years. The honest read is that cash reliably steadies households; it is not a lever on every long-run outcome.' }
    ],

    politicsLabel: 'Why the framing changes the politics',
    politics: 'Transition-based cash, the report argues, inherits the public’s existing support for help during disruption rather than reopening the broader argument about cash. It is also buildable one moment at a time, often by redirecting money that is already being spent.'
  }
};
