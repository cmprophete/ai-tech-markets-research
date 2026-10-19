/* These are transparent teaching mechanisms, not estimates of policy effects.
   No network, persistence, user data, random draws, or hidden calibration. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
const hours = n => Number(n.toFixed(2)).toLocaleString('en-US', {maximumFractionDigits:2});
const decisions = [
 {title:'Who defines success?',off:'Vendor optimizes processing volume.',on:'Residents and staff define access and service goals.',policy:'A public mandate',boundary:'An open mandate needs representative participation, not just a public comment box.'},
 {title:'What data is off limits?',off:'The contract leaves reuse open.',on:'No sale or model training on applicant records. No biometric or emotion surveillance.',policy:'Binding data limits',boundary:'Data limits require audits, deletion rules, and an enforceable remedy.'},
 {title:'Who can contest a decision?',off:'Applicants receive an automated answer.',on:'A named public official owns decisions, with notice, human review, and appeal.',policy:'A right to challenge',boundary:'A nominal human review is insufficient if reviewers lack time or authority.'},
 {title:'Who can halt a risky rollout?',off:'The vendor sets its own launch threshold.',on:'Independent evaluation and a public stop authority precede deployment.',policy:'Independent safety review',boundary:'Passing an evaluation does not prove safety; monitoring and incident response must continue.'},
 {title:'Can the public change providers?',off:'The agency depends on a proprietary workflow.',on:'Exportable records, open interfaces, and a funded exit plan.',policy:'A credible exit',boundary:'An exit clause needs technical capacity, an alternative provider, and money to switch.'}
];
let rights = decisions.map(() => false);
$('switches').innerHTML = decisions.map((d,i) => `<div class="switch-row"><div><h3>${d.title}</h3><p id="decision-${i}"></p></div><button type="button" class="switch" data-switch="${i}" aria-pressed="false" aria-label="${d.title} Apply public safeguard" aria-describedby="decision-${i}">Add rule</button></div>`).join('');
function renderTech(changed){
 const active = rights.reduce((a,v)=>a+Number(v),0);
 decisions.forEach((d,i) => {const b=document.querySelector(`[data-switch="${i}"]`);b.setAttribute('aria-pressed',String(rights[i]));b.textContent=rights[i]?'Rule added':'Add rule';b.setAttribute('aria-label',`${d.title} ${rights[i]?'Remove':'Apply'} public safeguard`);$('decision-'+i).textContent=rights[i]?d.on:d.off;});
 document.querySelector('.power-map').dataset.public=String(active>0);
 $('rights-paths').innerHTML=decisions.map((d,i)=>`<div class="right-path ${rights[i]?'public-right':''}"><span>${d.policy}</span><div class="right-track"><i></i></div><small>${rights[i]?'Public rule':'Vendor terms'}</small></div>`).join('');
 $('map-state').textContent=active===0?'Vendor terms':`${active} public safeguards`;
 const missing = decisions.filter((_,i)=>!rights[i]).map(d=>d.policy.toLowerCase());
 $('tech-verdict').innerHTML=`<strong>${active===0?'The contract is the constitution.':active===5?'Public rules, with work still to do.':'Power moves one decision at a time.'}</strong>${active===0?'If public rights are absent from the rules, the vendor’s defaults fill the space. Add a safeguard to redraw the relationship.':active===5?'All five proposed safeguards are in the design. They still need funding, legal authority, independent oversight, and a public remedy when rules are broken.':`Still unresolved: ${missing.join('; ')}.`}${Number.isInteger(changed)&&rights[changed]?`<p class="implementation-note">${decisions[changed].boundary}</p>`:''}`;
}
$('switches').addEventListener('click',e=>{const b=e.target.closest('[data-switch]');if(!b)return;const i=Number(b.dataset.switch);rights[i]=!rights[i];renderTech(i);});
$('tech-reset').addEventListener('click',()=>{rights=rights.map(()=>false);renderTech();});
// Minutes sum to 480. Assisted mode halves a task's time; automation removes it.
// These arbitrary pedagogical assumptions are disclosed in the UI and notes.
const tasks=[{name:'Document visits',minutes:90,risk:'Documentation still needs accuracy checks.'},{name:'Schedule & coordinate',minutes:60,risk:'Patients need a way to reach a person.'},{name:'Review records',minutes:90,risk:'A summary can omit clinically important context.'},{name:'Assess & decide',minutes:90,risk:'Clinical accountability cannot be assumed away.'},{name:'Listen & explain',minutes:120,risk:'A shorter interaction is not automatically better care.'},{name:'Learn & mentor',minutes:30,risk:'Removing learning tasks can weaken future expertise.'}];
let modes=[1,1,0,0,0,0];
const modeNames=['Human-led','AI-assisted','Automated'];
$('tasks').innerHTML=tasks.map((t,i)=>`<div class="task"><div class="task-heading">${t.name}<span>${t.minutes} min originally</span></div><div class="task-controls" role="group" aria-label="${t.name}">${modeNames.map((m,j)=>`<button type="button" data-task="${i}" data-mode="${j}" aria-pressed="false">${m}</button>`).join('')}</div><p class="task-note">${t.risk}</p></div>`).join('');
function renderWorkers(){
 const retained=tasks.map((t,i)=>t.minutes*[1,.5,0][modes[i]]),saved=480-retained.reduce((a,b)=>a+b,0),h=saved/60;
 document.querySelectorAll('[data-task]').forEach(b=>b.setAttribute('aria-pressed',String(modes[Number(b.dataset.task)]===Number(b.dataset.mode))));
 document.querySelectorAll('[data-preset]').forEach(b=>{const preset=b.dataset.preset,expected=preset==='all'?[2,2,2,2,2,2]:preset==='none'?[0,0,0,0,0,0]:[1,1,0,0,0,0];b.setAttribute('aria-pressed',String(modes.every((m,i)=>m===expected[i])));});
 $('saved-hours').textContent=hours(h);
 $('time-bar').innerHTML=retained.map((m,i)=>`<div class="time-segment ${modes[i]===1?'assist':''}" style="width:${m/480*100}%"></div>`).join('');
 $('time-summary').textContent=`${hours((480-saved)/60)} hours remain in the original task bundle; ${hours(h)} hours are released under the exercise’s assumptions. The blank part of the bar is the time available to allocate.`;
 const allocation=document.querySelector('[name=allocation]:checked').value;
 const choices={care:['Reinvest in care.',`${hours(h)} hours could be allocated to patient contact or other work. This is potential capacity, not a prediction of patient outcomes.`],time:['Share the gain as time.',`The illustrative day falls to ${hours(8-h)} working hours at unchanged daily pay. Someone must negotiate pay, coverage, and who absorbs the cost.`],cuts:['The saving becomes a staffing cut.',`${hours(h)} paid hours per worker-day are removed in this accounting example. That is a management allocation, not a technologically inevitable outcome.`]};
 const all=modes.every(m=>m===2),none=saved===0;
 $('workers-verdict').innerHTML=`<strong>${none?'No released time to distribute.':choices[allocation][0]}</strong>${none?'Choose an assisted or automated task to explore how a gain could be allocated.':choices[allocation][1]}${all?' Automating everything eliminates the entire job in the arithmetic. It does not demonstrate that an autonomous clinic is feasible or desirable.':''}`;
}
$('tasks').addEventListener('click',e=>{const b=e.target.closest('[data-task]');if(!b)return;modes[Number(b.dataset.task)]=Number(b.dataset.mode);renderWorkers();});
document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{modes=b.dataset.preset==='all'?[2,2,2,2,2,2]:b.dataset.preset==='none'?[0,0,0,0,0,0]:[1,1,0,0,0,0];renderWorkers();}));
document.querySelectorAll('[name=allocation]').forEach(r=>r.addEventListener('change',renderWorkers));
// Week zero is the initial balance plus an immediate transfer, if selected.
// Weeks 1..12 add other income minus spending, and one transfer at arrival.
function cashSeries(arrival,amount){let balance=1200+(arrival===0?amount:0);const series=[balance];for(let week=1;week<=12;week++){balance+=(week<8?200:650)-600+(week===arrival?amount:0);series.push(balance);}return series;}
function renderCash(){
 const arrival=Number($('arrival').value),amount=Number($('amount').value),current=cashSeries(arrival,amount),early=cashSeries(0,amount),floor=Math.min(...current),negative=current.slice(1).filter(v=>v<0).length,earlyNegative=early.slice(1).filter(v=>v<0).length;
 $('arrival-label').value=arrival===0?'At job loss':`Week ${arrival}`;$('amount-label').value=money(amount);
 // Keep axis limits fixed across every allowed slider value for honest comparison.
 const min=-2000,max=8000,x=w=>66+w*53,y=v=>24+(max-v)/(max-min)*264;
 const path=s=>s.map((v,i)=>`${i?'L':'M'}${x(i)},${y(v)}`).join(' ');
 const grid=[-2000,0,2000,4000,6000,8000].map(v=>`<line x1="66" x2="702" y1="${y(v)}" y2="${y(v)}" stroke="${v===0?'#2c3254':'#2c325440'}" stroke-dasharray="${v===0?'':'3 5'}"/><text x="55" y="${y(v)+4}" text-anchor="end">${v===0?'$0':(v<0?'−':'')+'$'+Math.abs(v)/1000+'k'}</text>`).join('');
 const ticks=[0,2,4,6,8,10,12].map(w=>`<text x="${x(w)}" y="312" text-anchor="middle">${w}</text>`).join('');
 const transferY=y(current[arrival]);
 $('cash-svg').innerHTML=`<title id="chart-title">Cash balance: payment in week ${arrival}</title><desc id="chart-desc">${negative} ${negative===1?'week ends':'weeks end'} below zero with your timing, compared with ${earlyNegative} if paid at job loss. Largest cash gap is ${money(Math.max(0,-floor))}. Week 12 balance is ${money(current[12])} under either timing.</desc><rect x="66" y="${y(0)}" width="636" height="${y(min)-y(0)}" fill="#ffbfa780"/>${grid}<path d="${path(early)}" fill="none" stroke="#472b51" stroke-width="2.5" stroke-dasharray="7 6"/><path d="${path(current)}" fill="none" stroke="#2c3254" stroke-width="3.5"/><line x1="${x(arrival)}" x2="${x(arrival)}" y1="24" y2="288" stroke="#2c3254" stroke-dasharray="2 5"/><circle cx="${x(arrival)}" cy="${transferY}" r="5" fill="#fffdf2" stroke="#2c3254" stroke-width="3"/>${ticks}<text x="384" y="342" text-anchor="middle">Weeks since job loss</text>`;
 $('gap-weeks').textContent=String(negative);$('cash-gap').textContent=money(Math.max(0,-floor));
 $('cash-verdict').textContent=amount===0?'With no payment, changing its arrival date changes nothing. Increase the amount to explore a bridge.':`The same ${money(amount)} produces the same week-12 balance of ${money(current[12])}, but ${arrival===0?'paying at job loss makes the two paths coincide.':`your timing leaves ${negative} ${negative===1?'week':'weeks'} below zero versus ${earlyNegative} with payment at job loss.`} Timing affects the path even when the endpoint is unchanged.`;
}
$('arrival').addEventListener('input',renderCash);$('amount').addEventListener('input',renderCash);
$('cash-early').addEventListener('click',()=>{$('arrival').value=0;renderCash();});
$('cash-reset').addEventListener('click',()=>{$('arrival').value=6;$('amount').value=2400;renderCash();});
function route(){const key=location.hash.slice(1);if(key==='reading'||key==='experience')return;const active=['tech','workers','cash'].includes(key)?key:'tech';document.querySelectorAll('.experiment').forEach(p=>p.hidden=p.id!==active);document.querySelectorAll('[data-route]').forEach(a=>{if(a.dataset.route===active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});if(['tech','workers','cash'].includes(key))$(active).scrollIntoView({block:'start'});document.title=`${{tech:'Who holds the switches?',workers:'What happens to the saved hour?',cash:'The check arrives. But when?'}[active]} | Economic Security Project`;}
// Hash routes allow sharing an experiment and preserve local choices when switching.
window.addEventListener('hashchange',route);
renderTech();renderWorkers();renderCash();route();
})();
