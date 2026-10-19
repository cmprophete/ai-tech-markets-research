/* Narrative prototypes. Corporate product presence is sourced; arrows into
   sectors are conceptual routes, not customer contracts or market shares.
   Workers and cash reuse the first set's stated hypothetical assumptions. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
const stories = {
 tech: {
  label:'The Tech / From the corporation to everyday life',
  beats:[
   {label:'Inside the firm',title:'Long before you open a chatbot, someone controls the ground beneath it.',copy:'AI begins with physical infrastructure: specialized chips and the computing capacity that runs them. Start here, inside three corporate groups.',caption:'Custom chip design and cloud capacity are different activities. These companies also use outside suppliers. The diagram shows presence at a layer, not fabrication, exclusivity, or market share.'},
   {label:'Up and down the stack',title:'Some of the same companies occupy several layers.',copy:'Follow each column down. A cloud provider can also develop models and sell the tools built on them. Coordination may improve the product. It can also put a supplier in competition with the businesses that depend on it.',caption:'Solid vertical connections show layers within a corporate group. Microsoft’s model access includes partnerships; access to a model is not ownership of its developer. This is a selected map, not the whole AI industry.'},
   {label:'Out into the economy',title:'Then the stack spreads sideways.',copy:'Employers, public agencies, and households encounter AI through applications and services. Each setting introduces another decision-maker. A model does not choose a staffing plan, a benefits rule, or a family’s terms of use by itself.',caption:'Horizontal branches show possible deployment settings, not specific vendor contracts. Sector positions and line lengths carry no quantitative meaning. Third-party developers can sit between the cloud and these settings.'},
   {label:'Two places to govern',title:'Rules have to travel in both directions.',copy:'Upstream, independent evaluations and enforceable limits can address dangerous capabilities before release. Downstream, workers and residents need rights over how systems are used, including surveillance limits and a way to challenge consequential decisions.',caption:'Proposed safeguards, not a safety certificate. Severe frontier risks and everyday harms require different assessments, enforcement powers, and remedies. Neither is resolved by a generic “human in the loop.”'},
   {label:'A second route',title:'The public should be able to shape what gets built.',copy:'Rules constrain private power. Public capacity can also widen the set of people able to build: researchers, public agencies, smaller firms, and communities with needs that a dominant platform may not prioritize.',caption:'A proposed public-compute route can coexist with private suppliers. Public funding is not enough on its own: access rules, independent oversight, privacy, and accountable governance still matter.'}
  ]
 },
 workers: {
  label:'Workers / Following a saved hour',
  beats:[
   {label:'Meet the work',title:'A job is a bundle of tasks. It is also a place to learn.',copy:'Imagine an eight-hour day in a community clinic. Paperwork, coordination, care, and mentoring all belong to the same job. A tool changes that bundle before it changes the employment statistics.',caption:'Fictional task allocation: documentation 90 minutes, coordination 60, patient-related work 300, learning and mentoring 30. The 300-minute care block combines record review, assessment, and listening from the first set.'},
   {label:'The tool arrives',title:'Suppose the paperwork takes less time.',copy:'For this example, assistance halves documentation and coordination time. That releases 75 minutes. We have not yet decided what happens to those minutes, or assumed that care improves.',caption:'This is the first set’s illustrative 50% time reduction for two tasks, not a research estimate. Verification costs, changes in demand, and quality effects are not modeled.'},
   {label:'The bargain',title:'The saving does not come with a distribution rule.',copy:'The same 75 minutes could support more patient care, a shorter paid working day, or a reduction in staffing hours. Choose one use. The technology alone does not settle the choice.',caption:'Each option reallocates the same assumed gain. These are accounting scenarios, not wage or employment forecasts. A real shorter day requires negotiated pay and service coverage.'},
   {label:'Before the next tool',title:'Worker voice belongs in the design process.',copy:'Advance notice, bargaining rights, paid learning, and limits on surveillance can give workers a say before a new workflow hardens into a management default. Preserving a route to expertise matters as much as speeding up today’s task.',caption:'Policy proposals require organization and enforcement. Training can help people use a tool, but training alone does not determine who receives the gain.'}
  ]
 },
 cash: {
  label:'Cash / A transition told in weeks',
  beats:[
   {label:'The interruption',title:'The job ends. The bills keep coming.',copy:'A fictional household starts with $1,200. Essential bills are $600 a week; other income is $200. A new job restores income in week 8. Until then, each week opens a $400 gap.',caption:'Hypothetical household, identical to the first set. Other income rises to $650 a week in week 8. Negative balances are unmet cash needs or borrowing requirements, not an assumed bank overdraft.'},
   {label:'Help is approved',title:'The check is coming. The gap is already here.',copy:'A $2,400 payment arrives in week 6. That still leaves two week-end balances below zero before the money arrives. The largest cash gap is $800. An approval is not yet purchasing power.',caption:'An accounting example, not a claim about any existing program’s delivery time. No fees, interest, housing loss, or behavioral effects are simulated.'},
   {label:'Change the delivery date',title:'Same dollars. A different passage through the transition.',copy:'Now pay the same $2,400 when the job ends. Under these assumptions, no week ends below zero. The household has exactly the same $1,050 at week 12 as with the later payment.',caption:'Solid line: immediate payment. Dashed line: week-6 payment. The common endpoint conceals different liquidity paths. This does not identify a causal effect on employment or establish an optimal transfer.'},
   {label:'Design around the moment',title:'A reliable floor needs a reliable arrival.',copy:'Rapid bridge payments address the first gap. Recurring support addresses continuity. Shared public wealth can help distribute returns over time. Each needs an eligibility and delivery system that people can actually use.',caption:'Cash does not replace worker bargaining, healthcare, or protections against harmful AI deployment. Funding, benefit interactions, appeals, and the treatment of people without clear job-loss documentation remain policy design questions.'}
  ]
 }
};
let active='tech';
const steps={tech:0,workers:0,cash:0};
const choices={safeguards:false,publicRoute:false,allocation:'care',cashCompare:'early'};
function svgOpen(h,title,desc,cls){return `<svg class="${cls}" viewBox="0 0 1000 ${h}" role="img" aria-labelledby="visual-title visual-desc"><title id="visual-title">${title}</title><desc id="visual-desc">${desc}</desc><defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="#2c3254"/></marker></defs>`;}
function techVisual(step){
 const full=step>=1,deployed=step>=2,publicRoute=step===4&&choices.publicRoute,guarded=step>=3&&choices.safeguards;
 const h=step===0?250:step===1?365:step===4?650:555;
 const firms=[{name:'Google',x:100,cells:['TPUs','Google Cloud','Gemini','Workspace / Gemini']},{name:'Microsoft',x:380,cells:['Maia','Azure','Own + partner models','Copilot']},{name:'Amazon',x:660,cells:['Trainium','AWS','Nova','Amazon Q']}];
 let s=svgOpen(h,'Corporate development vertically; deployment horizontally',`${full?'Three corporate groups each connect chip designs, cloud, models, and applications.':'Three corporate groups each connect chip design and cloud capacity.'} ${deployed?'Applications branch horizontally into workplaces, public services, and households.':''} ${guarded?'Proposed evaluation and deployment-rights gates are visible.':''} ${publicRoute?'A proposed public compute route supports independent builders reaching the same deployment settings.':''}`,'tech-svg');
 s+=`<text x="20" y="15" class="axis-label">DEVELOPMENT WITHIN CORPORATE GROUPS ↓</text>`;
 const labels=['Chips','Cloud','Models','Tools'];
 labels.slice(0,full?4:2).forEach((r,i)=>s+=`<text class="row-label" x="18" y="${108+i*64}">${r}</text>`);
 firms.forEach(f=>{
  s+=`<rect class="corporate" x="${f.x}" y="30" width="220" height="${full?305:177}" rx="8"/><text class="company" x="${f.x+110}" y="62" text-anchor="middle">${f.name}</text>`;
  f.cells.slice(0,full?4:2).forEach((c,i)=>{
   if(i)s+=`<path class="wire" d="M${f.x+110} ${60+i*64}v18" marker-end="url(#arrow)"/>`;
   s+=`<rect class="${i===3?'cell-strong':'cell'}" x="${f.x+18}" y="${82+i*64}" width="184" height="40" rx="3"/><text class="product-label" x="${f.x+110}" y="${107+i*64}" text-anchor="middle">${c}</text>`;
  });
 });
 if(deployed){
  if(guarded)s+=`<g class="pulse"><rect class="public-rule" x="105" y="347" width="770" height="34" rx="4"/><text x="490" y="369" text-anchor="middle" class="small">Before release: independent evaluation + enforceable safety limits</text></g>`;
  if(!guarded)s+=`<rect class="corporate" x="105" y="347" width="770" height="34" rx="4"/><text x="490" y="369" text-anchor="middle" class="small">Direct deployment or delivery through other developers</text>`;
  firms.forEach(f=>s+=`<path class="wire" d="M${f.x+110} 314V342" marker-end="url(#arrow)"/>`);
  s+=`<path class="wire" d="M490 381v22"/>`;
  s+=`<path class="wire" d="M180 403H820" marker-start="url(#arrow)" marker-end="url(#arrow)"/><text class="axis-label" x="500" y="430" text-anchor="middle">DEPLOYMENT ACROSS THE ECONOMY ↔</text>`;
  ['Workplaces','Public services','Households'].forEach((name,i)=>{
   const x=100+i*280,cx=x+110;
   s+=`<path class="wire" d="M${cx} 403v40" marker-end="url(#arrow)"/><rect class="${guarded?'public-rule':'sector'}" x="${x}" y="449" width="220" height="67" rx="5"/><text class="product-label" x="${cx}" y="474" text-anchor="middle">${name}</text><text class="small" x="${cx}" y="498" text-anchor="middle">${guarded?['Worker voice + use limits','Appeal + public oversight','Privacy + meaningful choice'][i]:['Employers choose workflows','Agencies choose service rules','People encounter products'][i]}</text>`;
  });
  if(publicRoute)s+=`<g class="pulse"><rect class="public-option" x="100" y="559" width="780" height="57" rx="5"/><text class="product-label" x="490" y="583" text-anchor="middle">Public compute → independent builders → public-interest tools</text><text class="small" x="490" y="603" text-anchor="middle">An additional source of capacity, not a publicly owned copy of every layer</text><path class="public-wire" d="M880 587H950V403H825" marker-end="url(#arrow)"/></g>`;
 }
 return s+'</svg>';
}
function workersVisual(step){
 const saved=step>0, allocation=choices.allocation;
 const tasks=[{name:'Paperwork',min:saved?45:90,color:'#2c3254'},{name:'Coordination',min:saved?30:60,color:'#472b51'},{name:'Patient work',min:300+(step>=2&&allocation==='care'?75:0),color:'#70ad8f'},{name:'Learning',min:30,color:'#ebc382'}];
 if(saved&&!(step>=2&&allocation==='care'))tasks.push({name:step>=2?(allocation==='time'?'Time back':'Staffing cut'):'Unallocated',min:75,color:'#ffbfa7'});
 let x=60;
 let s=svgOpen(330,'A clinic day and the allocation of 75 released minutes',`Original day: documentation 90 minutes, coordination 60, patient work 300, learning 30. ${saved?'Assistance releases 75 minutes.':''} ${step>=2?`Selected allocation: ${allocation}.`:''}`,'workers-svg');
 s+=`<text x="60" y="43" class="time-title">${!saved?'One working day':step===1?'The same tasks, with assistance':allocation==='care'?'Reinvest the time in care':allocation==='time'?'Return the time to workers':'Remove the time from payroll'}</text><text x="60" y="80" class="small">Eight hours / 480 minutes · hypothetical time budget</text>`;
 tasks.forEach(t=>{const width=t.min/480*880;s+=`<rect x="${x}" y="112" width="${width}" height="72" fill="${t.color}" stroke="#fffdf2" stroke-width="2"/>`;x+=width;});
 tasks.forEach((t,i)=>{const tx=60+(i%3)*310,ty=228+Math.floor(i/3)*55;s+=`<rect x="${tx}" y="${ty-11}" width="10" height="10" fill="${t.color}"/><text class="time-label" x="${tx+18}" y="${ty}">${t.name}</text><text class="small" x="${tx+18}" y="${ty+20}">${t.min} minutes</text>`;});
 return s+'</svg>';
}
function cashSeries(arrival,amount){let b=1200+(arrival===0?amount:0);const a=[b];for(let w=1;w<=12;w++){b+=(w<8?200:650)-600+(w===arrival?amount:0);a.push(b);}return a;}
function cashVisual(step){
 const early=step>=2&&(step!==3||choices.cashCompare==='early'),arrival=early?0:6,amount=step===0?0:2400,series=cashSeries(arrival,amount),late=cashSeries(6,2400),gap=Math.max(0,-Math.min(...series));
 const x=w=>90+w*68,y=v=>50+(4000-v)/6000*260,path=a=>a.map((v,i)=>`${i?'L':'M'}${x(i)} ${y(v)}`).join(' ');
 let s=svgOpen(420,'A household transition, week by week',`${step===0?'No transition payment.':`A $2,400 payment arrives at week ${arrival}.`} ${series.slice(1).filter(v=>v<0).length} weeks end below zero. Largest cash gap ${money(gap)}. Week-12 balance ${money(series[12])}.`,'cash-svg');
 s+=`<text class="small" x="90" y="22">Cumulative cash balance · hypothetical dollars</text><rect x="90" y="${y(0)}" width="816" height="${y(-2000)-y(0)}" fill="#ffbfa780"/>`;
 [-2000,0,2000,4000].forEach(v=>s+=`<line x1="90" x2="906" y1="${y(v)}" y2="${y(v)}" stroke="${v===0?'#2c3254':'#caccd4'}"/><text x="76" y="${y(v)+5}" text-anchor="end" class="cash-chart-label">${money(v)}</text>`);
 if(step>=2)s+=`<path d="${path(late)}" fill="none" stroke="#472b51" stroke-width="2.5" stroke-dasharray="7 6"/>`;
 s+=`<path d="${path(series)}" fill="none" stroke="#2c3254" stroke-width="4"/>`;
 if(amount)s+=`<circle cx="${x(arrival)}" cy="${y(series[arrival])}" r="6" fill="#70ad8f" stroke="#2c3254" stroke-width="2"/><text class="small" x="${x(arrival)+12}" y="${y(series[arrival])-12}">Payment arrives</text>`;
 [0,3,6,9,12].forEach(w=>s+=`<text class="cash-chart-label" x="${x(w)}" y="338" text-anchor="middle">${w===0?'Job ends':`Week ${w}`}</text>`);
 s+=`<text x="90" y="390" class="cash-milestone">${series.slice(1).filter(v=>v<0).length} weeks below zero</text><text x="906" y="390" text-anchor="end" class="cash-milestone">Largest gap: ${money(gap)}</text>`;
 return s+'</svg>';
}
function controls(){
 const step=steps[active];
 if(active==='tech'&&step===3)return `<p class="choice-label">Reveal one layer of public authority.</p><div class="choice-buttons"><button type="button" data-choice="safeguards" aria-pressed="${choices.safeguards}">${choices.safeguards?'Hide the proposed safeguards':'Show the proposed safeguards'}</button></div>`;
 if(active==='tech'&&step===4)return `<div class="choice-buttons"><button type="button" data-choice="publicRoute" aria-pressed="${choices.publicRoute}">${choices.publicRoute?'Hide the public route':'Open a public route'}</button></div>`;
 if(active==='workers'&&step===2)return `<p class="choice-label">What should happen to the same 75 minutes?</p><div class="choice-buttons">${[['care','More patient care'],['time','Shorter day, same pay'],['cuts','Less paid staffing']].map(([v,label])=>`<button type="button" data-allocation="${v}" aria-pressed="${choices.allocation===v}">${label}</button>`).join('')}</div><p class="choice-result" role="status">${{care:'Patient-related work grows from 300 to 375 minutes. Staffing and daily pay stay the same in the example. Better health outcomes are not assumed.',time:'Working time falls from 8 to 6.75 hours, at unchanged daily pay. The division of costs and the provision of care require agreement.',cuts:'Paid staffing time falls by 75 minutes per original worker-day while the original service task bundle is held fixed. No headcount forecast is implied.'}[choices.allocation]}</p>`;
 if(active==='cash'&&step===3)return `<p class="choice-label">Revisit the same payment, with different timing.</p><div class="choice-buttons">${[['early','At job loss'],['late','In week 6']].map(([v,label])=>`<button type="button" data-cash="${v}" aria-pressed="${choices.cashCompare===v}">${label}</button>`).join('')}</div>`;
 return '';
}
const reflections={
 tech:'<h2>Democracy needs leverage at both ends.</h2><p>At the infrastructure layer: fair access, interoperability, independent safety oversight, and public alternatives. At deployment: enforceable rights for the people affected. A more competitive supplier market does not itself establish worker voice or privacy.</p>',
 workers:'<h2>Make the productivity bargain explicit.</h2><p>Technology policy can ask which capabilities get built. Labor policy can ask who has authority over the redesign of work. Cash can provide a floor when a transition happens anyway. The three choices reinforce each other.</p>',
 cash:'<h2>Judge the bridge by whether it spans the gap.</h2><p>Measure delivery time, take-up, unmet needs, and the household’s path through a shock, alongside longer-run outcomes. The simple accounting here motivates those questions; it cannot answer them empirically.</p>'
};
const policySource='<a href="https://economicsecurityproject.org/resource/ai-transition/" target="_blank" rel="noopener noreferrer">ESP: Ideas for Shared Economic Prosperity in the AI Transition</a>';
const sourceCopy={
 tech:`<h3>What the map means</h3><p>Columns are selected corporate groups, rows are activities. Product presence does not establish that every product uses every pictured component. Vertical links simplify a mixture of ownership and internal access; model partnerships are labeled. Horizontal links are conceptual deployment routes, not evidence of customer relationships or market shares. Other important firms and cross-company supply chains are omitted, including external chip suppliers and independent model developers.</p><p>The public route and governance gates are proposals, not current legal guarantees or measured effects. They draw on ${policySource} and <a href="https://www.nist.gov/itl/ai-risk-management-framework" target="_blank" rel="noopener noreferrer">NIST’s voluntary risk-management framework</a>; NIST does not certify a system as safe.</p><ul><li><a href="https://cloud.google.com/tpu" target="_blank" rel="noopener noreferrer">Google Cloud: TPUs</a> and <a href="https://cloud.google.com/blog/products/ai-machine-learning/bringing-gemini-to-organizations-everywhere" target="_blank" rel="noopener noreferrer">Gemini and Workspace</a>.</li><li><a href="https://blogs.microsoft.com/blog/2026/10/12/microsoft-to-expand-azure-maia-system-to-multi-gigawatt-deployments/" target="_blank" rel="noopener noreferrer">Microsoft: Maia and Azure</a>; <a href="https://learn.microsoft.com/en-us/microsoft-365/copilot/ai-models-overview" target="_blank" rel="noopener noreferrer">own and partner models in Copilot services</a>.</li><li>Amazon: <a href="https://aws.amazon.com/ai/machine-learning/trainium/" target="_blank" rel="noopener noreferrer">Trainium</a>, <a href="https://aws.amazon.com/nova/" target="_blank" rel="noopener noreferrer">Nova</a>, and <a href="https://aws.amazon.com/q/" target="_blank" rel="noopener noreferrer">Amazon Q</a>.</li></ul>`,
 workers:`<h3>Text version and assumptions</h3><p>The original eight-hour day contains 90 minutes of documentation, 60 of coordination, 300 of patient-related work, and 30 of learning. Assistance halves the first two, releasing 75 minutes. Reinvestment adds those minutes to patient work; a shorter day leaves 405 working minutes; staffing reductions remove 75 paid minutes from the original worker-day. These are hypothetical allocations carried forward from set one, not empirical estimates. No clinical feasibility, verification overhead, demand response, wage response, or change in care quality is estimated.</p><p>Background: <a href="https://www.hamiltonproject.org/publication/paper/building-pro-worker-ai/" target="_blank" rel="noopener noreferrer">Building pro-worker AI</a>; <a href="https://www.nber.org/papers/w33941" target="_blank" rel="noopener noreferrer">Autor and Thompson, Expertise</a>; ${policySource}.</p>`,
 cash:`<h3>Text version and assumptions</h3><p>Starting cash is $1,200. Weekly spending is $600. Other income is $200 in weeks 1–7 and $650 in weeks 8–12. A $2,400 transfer arrives either immediately at job loss or before week 6’s net spending. Late delivery leaves two week ends below zero and a maximum gap of $800; immediate delivery leaves none. Both finish week 12 at $1,050. Without a transfer, the minimum balance is −$1,600. Negative values indicate unmet needs or financing requirements. No inflation, borrowing costs, causal effects, or benefit rules are modeled. Chart axes stay fixed.</p><p>Policy framing: <a href="https://economicsecurityproject.org/resource/right-on-time/" target="_blank" rel="noopener noreferrer">ESP, Right on Time</a>; ${policySource}. The illustration motivates a timing question, not an optimal policy amount.</p>`
};
function render({focus=false}={}){
 const step=steps[active],story=stories[active],beat=story.beats[step];
 $('story-label').textContent=story.label;$('beat-label').textContent=beat.label;$('story-title').textContent=beat.title;$('story-copy').textContent=beat.copy;
 $('progress').innerHTML=story.beats.map((_,i)=>`<i class="${i<=step?'current':''}" aria-hidden="true"></i>`).join('');$('progress').setAttribute('aria-label',`Part ${step+1} of ${story.beats.length}`);
 $('scene').innerHTML=(active==='tech'?techVisual(step):active==='workers'?workersVisual(step):cashVisual(step));
 $('scene').setAttribute('tabindex','0');$('scene').setAttribute('role','region');$('scene').setAttribute('aria-label','Story illustration. Use left and right arrow keys to scroll if the diagram is wider than the screen.');
 $('caption').innerHTML=beat.caption+'<p class="mobile-note">The diagram extends sideways. Swipe, or focus it and use arrow keys. A text version is below.</p>';
 $('choice-area').innerHTML=controls();$('position').textContent=`${step+1} / ${story.beats.length}`;
 $('previous').disabled=step===0;
 const last=step===story.beats.length-1;
 $('next').textContent=last?(active==='tech'?'Continue to Workers →':active==='workers'?'Continue to Cash →':'Read The Tech again →'):'Continue →';
 $('reflection').hidden=!last;$('reflection').innerHTML=last?reflections[active]:'';$('sources').innerHTML=sourceCopy[active];
 document.querySelectorAll('[data-story]').forEach(a=>{if(a.dataset.story===active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 document.title=`${{tech:'The stack and the spread',workers:'Following a saved hour',cash:'A transition told in weeks'}[active]} | Economic Security Project`;
 if(focus){$('story-title').focus({preventScroll:true});$('story').scrollIntoView({block:'start'});}
}
function navigate(key){if(!stories[key])key='tech';active=key;render({focus:true});}
$('next').addEventListener('click',()=>{if(steps[active]<stories[active].beats.length-1){steps[active]++;render({focus:true});}else{const key=active==='tech'?'workers':active==='workers'?'cash':'tech';steps[key]=0;location.hash=key;if(active===key)navigate(key);}});
$('previous').addEventListener('click',()=>{if(steps[active]>0){steps[active]--;render({focus:true});}});
$('choice-area').addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 // Keep focus on the same choice when its markup is refreshed.
 const attribute=b.hasAttribute('data-choice')?'data-choice':b.hasAttribute('data-allocation')?'data-allocation':'data-cash',value=b.getAttribute(attribute);
 if(attribute==='data-choice')choices[value]=!choices[value];else if(attribute==='data-allocation')choices.allocation=value;else choices.cashCompare=value;
 render();document.querySelector(`[${attribute}="${value}"]`).focus({preventScroll:true});
});
window.addEventListener('hashchange',()=>{const key=location.hash.slice(1);if(key!=='story')navigate(key);});
active=stories[location.hash.slice(1)]?location.hash.slice(1):'tech';render();
})();
