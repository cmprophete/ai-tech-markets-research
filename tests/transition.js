#!/usr/bin/env node
// Behavioral and accounting checks for the isolated transition prototypes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM, VirtualConsole} = require('jsdom');
const root = path.resolve(__dirname, '..');
const errors=[];
const vc = new VirtualConsole();
vc.on('jsdomError',e=>errors.push(e.message));
const html=fs.readFileSync(path.join(root,'prototypes/transition/index.html'),'utf8').replace('<script src="transition.js" defer></script>','');
const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.org/prototypes/transition/index.html',virtualConsole:vc});
const w=dom.window,d=w.document,$=id=>d.getElementById(id);
w.Element.prototype.scrollIntoView=()=>{};
w.eval(fs.readFileSync(path.join(root,'prototypes/transition/transition.js'),'utf8'));
function click(sel){d.querySelector(sel).click();}
function slider(id,value){$(id).value=value;$(id).dispatchEvent(new w.Event('input',{bubbles:true}));}
assert.equal($('tech').hidden,false);
assert.equal($('workers').hidden,true);
click('[data-switch="0"]');
assert.equal(d.querySelector('[data-switch="0"]').getAttribute('aria-pressed'),'true');
assert.match($('decision-0').textContent,/Residents/);
for(let i=1;i<5;i++)click(`[data-switch="${i}"]`);
assert.match($('tech-verdict').textContent,/funding, legal authority/);
click('#tech-reset');
assert.equal(d.querySelectorAll('[data-switch][aria-pressed=true]').length,0);
assert.equal($('saved-hours').textContent,'1.25');
click('[data-preset=all]');
assert.equal($('saved-hours').textContent,'8');
assert.match($('workers-verdict').textContent,/does not demonstrate/);
click('[data-preset=none]');
assert.equal($('saved-hours').textContent,'0');
assert.match($('workers-verdict').textContent,/No released time/);
click('[data-preset=admin]');
click('[name=allocation][value=time]');
assert.match($('workers-verdict').textContent,/6.75 working hours/);
assert.equal($('gap-weeks').textContent,'2');
assert.equal($('cash-gap').textContent,'$800');
assert.match($('chart-desc').textContent,/Week 12 balance is \$1,050/);
click('#cash-early');
assert.equal($('gap-weeks').textContent,'0');
assert.equal($('cash-gap').textContent,'$0');
assert.match($('chart-desc').textContent,/Week 12 balance is \$1,050/);
slider('amount',0);
assert.equal($('gap-weeks').textContent,'9');
assert.equal($('cash-gap').textContent,'$1,600');
assert.match($('cash-verdict').textContent,/changes nothing/);
slider('arrival',10);slider('amount',6000);
assert.equal($('gap-weeks').textContent,'6');
assert.match($('chart-desc').textContent,/Week 12 balance is \$4,650/);
click('#cash-reset');
assert.equal($('arrival').value,'6');
assert.equal($('amount').value,'2400');
// Every visible control must have a name, and each range a real label.
for(const b of d.querySelectorAll('button'))assert.ok(b.textContent.trim()||b.getAttribute('aria-label'));
for(const i of d.querySelectorAll('input[type=range]'))assert.ok(d.querySelector(`label[for="${i.id}"]`));
for(const href of ['workers','cash','tech']){
 w.location.hash=href;w.dispatchEvent(new w.HashChangeEvent('hashchange'));
 assert.equal($(href).hidden,false);
 assert.equal(d.querySelectorAll('.experiment:not([hidden])').length,1);
 assert.equal(d.querySelector('[aria-current=page]').dataset.route,href);
}
assert.equal(d.querySelector('[name=allocation][value=time]').checked,true);
assert.deepEqual(errors,[]);
dom.window.close();
console.log('PASS transition: decision rights, task allocation, cash accounting, routes, reset, named controls; no runtime errors');
