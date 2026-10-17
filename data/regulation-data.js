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

  /* ── THE PAGE ──────────────────────────────────────────────────────
     One argument in three acts, not three separate pages. The acts are
     ordered because each one hands off to the next: who owns the layer
     decides what gets built; what gets built decides what happens to
     work; and neither reaches the person whose job ends this month.
     The nav buttons scroll to an act rather than swapping views. */
  page: {
    lede: 'If we are going to regulate this, what exactly are we regulating?',
    standfirst: 'Three things, in order, and they are not interchangeable. Who owns the layer underneath. What the technology is built to do to human expertise. And what reaches people when it lands on them anyway. Click anything in the diagrams below to open it up.',
    order: ['tech', 'workers', 'cash'],
    transitions: {
      tech: 'Owning the layer decides what gets built on it. So the next question is what it is being built to <em>do</em>.',
      workers: 'Steering the technology changes what happens to work over years. It does nothing for the person whose job ends this month.'
    },
    close: 'The three are one agenda. Shape the market, steer what gets built, and catch people at the moment it lands. Leave out any one of them and the other two do not hold.'
  },


  /* ── 1. THE TECH ──────────────────────────────────────────────────── */
  tech: {
    id: 'tech',
    act: 'Act 1',
    question: 'Who owns the layer underneath?',
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
        chokepoint: true, chokeLabel: 'Everything above rents from here',
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

    /* Click-through for the stack. One entry per layer, plus one per firm
       track in the integration gutter. `chokepoint` is why the layer is
       worth regulating; `policy` is what applies there. Nothing here
       carries a market share. */
    details: {
      chips: {
        kicker: 'Layer 1',
        what: 'The silicon that models are trained on. Training a frontier model means securing a large allocation of accelerators for weeks or months, which is why this layer sets the floor on who can train at all.',
        who: 'Nvidia and AMD sell to the market. Google, Amazon and Microsoft each design their own accelerators in-house as well, which is the first place the stack starts folding in on itself.',
        chokepoint: 'Design and fabrication are capital-intensive and few firms do either. Supply here rations everything above it.',
        policy: 'The least amenable layer to state action: this is federal industrial, export and trade policy. ESP\u2019s brief does not make a chips claim, and neither does this page.'
      },
      compute: {
        kicker: 'Layer 2',
        what: 'The rented capacity where training and inference actually run. Almost nobody above this layer owns their own data centres.',
        who: 'Amazon, Google and Microsoft. This is the concentration ESP\u2019s brief names directly: the computing power needed for advanced AI development is dominated by just three companies.',
        chokepoint: 'The clearest one in the stack. Everything above rents from here, and the landlords also compete upstairs.',
        policy: 'Non-discrimination rules, so a provider cannot favour its own applications. And the public option: NAIRR federally, CalCompute in California.'
      },
      models: {
        kicker: 'Layer 3',
        what: 'The general-purpose layer. One trained model serves medicine, logistics and fraud detection without being rebuilt for each, which is what makes it general-purpose rather than a product.',
        who: 'OpenAI, Anthropic, Google DeepMind and Meta. Note what the gutter shows: one of these is a cloud provider, and the others depend on one.',
        chokepoint: 'Training runs cannot happen without the layer below, so a model developer\u2019s costs and timelines are set by its supplier.',
        policy: 'Transparency, which is what SB 53 does: published safety frameworks, incident reporting, whistleblower protection. Plus portability, so what is built on one model can move.'
      },
      apps: {
        kicker: 'Layer 4',
        what: 'Where the public actually meets any of this. Thousands of firms build here, on infrastructure they do not own.',
        who: 'Everyone, including the three firms that own the layers underneath. That is the whole problem in one line.',
        chokepoint: 'Your supplier is your competitor. A firm renting compute at layer 2 may be competing with its landlord at layer 4.',
        policy: 'Non-discrimination and interoperability. Lock-in is what turns a temporary technical lead into a permanent position, and portability is the standing remedy.'
      },
      google: {
        kicker: 'Integrated firm',
        what: 'Present at all four layers: its own accelerators, its own cloud, its own frontier lab, and its own applications.',
        who: 'The most fully integrated position in the stack.',
        chokepoint: 'Nothing upstream constrains it, and every rival at one layer is a customer at another.',
        policy: 'This is the pattern non-discrimination rules exist for.'
      },
      amazon: {
        kicker: 'Integrated firm',
        what: 'Chips, cloud and applications. No frontier lab of its own in this picture, which is the one hollow dot on its track.',
        who: 'The largest landlord at layer 2.',
        chokepoint: 'Model developers renting its capacity compete with its own application business.',
        policy: 'Non-discrimination at the infrastructure layer.'
      },
      microsoft: {
        kicker: 'Integrated firm',
        what: 'Chips, cloud and applications, with a hollow dot at models for the same reason as Amazon.',
        who: 'A landlord at layer 2 with a deep commercial relationship to a layer 3 developer.',
        chokepoint: 'The supplier relationship and the competitive one run through the same firms.',
        policy: 'Non-discrimination, plus portability so customers can leave.'
      }
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
    act: 'Act 2',
    question: 'Does the machine make your expertise worth more, or worth less?',
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
          { id: 'automating', name: 'Automating', note: 'Machines take over tasks workers do now.', flag: 'The clearest case against' },
          { id: 'capital-aug', name: 'Capital-augmenting', note: 'Returns accrue to equipment, not to people.' }
        ] },
      { id: 'proworker', label: 'Pro-worker', answer: 'Yes',
        tone: 'for',
        kinds: [
          { id: 'labor-aug', name: 'Labor-augmenting', note: 'The same tasks, done better by the same worker.' },
          { id: 'expertise-lev', name: 'Expertise-leveling', note: 'More workers can do what only experts could.' },
          { id: 'new-task', name: 'New task-creating', note: 'Generates demand for novel human expertise.', flag: 'Unambiguously pro-worker' }
        ] }
    ],
    gravity: {
      heading: 'Why the default runs left',
      text: 'Pro-worker tools can be good for firms too, but firms have weak incentives to build them: automating expertise promises the larger return. The paper adds that the field’s focus on artificial general intelligence makes pro-worker work less likely still. Left alone, the flow does not sit in the middle. It runs downhill.'
    },

    /* Click-through for the fork. One entry per category, each naming the
       lever from the paper that bears on it. */
    details: {
      automating: {
        kicker: 'The clearest case against',
        what: 'The machine takes over tasks a worker does now. The task does not become more valuable when a person does it; it stops being done by a person.',
        why: 'This is where the returns are concentrated, which is exactly the paper\u2019s problem: automating expertise promises the larger payoff, so this is the direction capital runs by default.',
        lever: 'Rebalance the tax code so hiring and training are not taxed more heavily than equipment and software, and give workers institutional standing over how systems are deployed.'
      },
      'capital-aug': {
        kicker: 'Labor-replacing',
        what: 'The technology raises the return on equipment rather than on people. Output per machine-hour rises; output per worker-hour does not follow.',
        why: 'Not aimed at workers, but the distributional effect runs the same way: the gains accrue to whoever owns the capital.',
        lever: 'The tax code again. The price signal is what decides between a worker and a machine at the margin.'
      },
      'labor-aug': {
        kicker: 'Pro-worker',
        what: 'The same worker does the same tasks, better. Expertise is not replaced; its output rises.',
        why: 'Good for workers and often good for firms, but it is not where the largest return sits, so it is underbuilt relative to its value.',
        lever: 'Direct the research. The paper names health care and education as the two fields where the opportunities are already plentiful.'
      },
      'expertise-lev': {
        kicker: 'Pro-worker',
        what: 'More workers can do what previously required a specialist. The floor rises rather than the ceiling.',
        why: 'The distributional case is strong: it widens who can hold a well-paid job rather than concentrating the work further.',
        lever: 'Loosen the licensure and scope-of-practice rules that shield incumbents, or the tool arrives and the law still forbids its use.'
      },
      'new-task': {
        kicker: 'Unambiguously pro-worker',
        what: 'The technology creates work that did not exist, generating demand for novel human expertise rather than redistributing the existing stock of it.',
        why: 'The paper\u2019s clearest case for pro-worker technology, and the hardest to get from a field oriented toward general intelligence.',
        lever: 'Grant-making aimed at pro-worker outcomes, and DARPA-style competitive prize models for R&amp;D and procurement.'
      }
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
    act: 'Act 3',
    question: 'When it lands on someone, what reaches them?',
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
      shared: { id: 'drop', label: 'Income drops' },
      paths: [
        { id: 'without', label: 'Without cash at the moment', tone: 'bad',
          beats: [ { id: 'savings', label: 'Savings gone' },
                   { id: 'spiral', label: 'Debt, eviction, lost job' },
                   { id: 'lasting', label: 'Lasting insecurity' } ] },
        { id: 'with', label: 'With cash at the moment', tone: 'good',
          beats: [ { id: 'bridge', label: 'Cash bridges the gap' },
                   { id: 'contained', label: 'Costs stay contained' },
                   { id: 'baseline', label: 'Back to baseline' } ] }
      ],
      note: 'Cash steadies people; it doesn’t try to move the entire arc of their lives.'
    },

    /* Click-through for the two paths. Each beat carries the evidence that
       bears on that stage, with its design limit, or says plainly that it
       is framing rather than a finding. */
    details: {
      drop: {
        kicker: 'The moment',
        what: 'A transition arrives: a birth, a diagnosis, a layoff, a release, a disaster. Income falls and costs rise at the same time.',
        evidence: 'This is not rare. About 21 million layoffs or firings in a year, 63 million unpaid family caregivers, and 90 major disaster declarations in 2024.',
        design: 'Context figures from the report, not a pilot result.'
      },
      savings: {
        kicker: 'Without cash',
        what: 'The buffer runs out. This is the point where a temporary shock starts converting into a permanent one.',
        evidence: 'Nearly two in three families cannot cover a simultaneous income drop and expense spike.',
        design: 'Context figure from the report.'
      },
      spiral: {
        kicker: 'Without cash',
        what: 'Costs compound. Debt accrues, housing becomes unstable, and the instability itself costs the job or the schooling that would have ended it.',
        evidence: 'In Philadelphia, PHLHousing+ recipients had about half the homelessness rate of control households at two years. In Newark, unstable housing fell from 29% to 9% among lump-sum recipients.',
        design: 'Philadelphia is randomised with a control group. Newark is pre/post within the pilot.'
      },
      lasting: {
        kicker: 'Without cash',
        what: 'The disruption is over and the damage is not. This is what the report means by temporary precarity becoming permanent.',
        evidence: 'Cash at reentry cut parole violations by more than 41% and violent violations by 64%, evaluated in LA and Alameda counties.',
        design: 'Evaluated against comparison groups.'
      },
      bridge: {
        kicker: 'With cash',
        what: 'Money arrives while the gap is still a gap, not after it has become debt. The report\u2019s central claim is about this timing, not about the amount.',
        evidence: 'In Flint, Rx Kids was associated with 18% fewer preterm births and 27% fewer low-birthweight births.',
        design: 'Population-level, citywide enrolment.'
      },
      contained: {
        kicker: 'With cash',
        what: 'Costs stay inside the episode instead of spreading into housing, health and work. People also get room to act on the transition rather than only absorb it.',
        evidence: 'Young parents in Baltimore were more than twice as likely to apply for education or training. Food insecurity among former foster youth in Alameda fell from 73% to 27%.',
        design: 'Baltimore has a control group. Alameda is N = 67, too small to carry weight alone.'
      },
      baseline: {
        kicker: 'With cash',
        what: 'Back to where things were. That is the claim, and it is deliberately modest: cash steadies people, it does not redirect a life.',
        evidence: 'The best-powered trial in the set, Baby\u2019s First Years, found no significant effect on preregistered child outcomes at four years, though spending on child-focused items and early learning rose in the early years.',
        design: 'Randomised controlled trial. Included because it is the honest limit on the claim above.'
      }
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
