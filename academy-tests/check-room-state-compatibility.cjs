'use strict';
const assert = require('node:assert/strict');
const {toEngine,toLab,normalizeEvent} = require('../academy/classroom/room-state-compatibility.js');
const pairs = [['outside','outside'],['waiting','waiting'],['admitted','admitted'],['rejected','denied'],['removed','removed']];
for(const [lab,engine] of pairs){
  assert.equal(toEngine(lab),engine);
  assert.equal(toLab(engine),lab);
  assert.equal(toLab(toEngine(lab)),lab);
}
for(const invalid of ['denied','finished','speaking','queued','__proto__','constructor','',null,undefined,0,{}]){
  assert.throws(()=>toEngine(invalid),/Unknown classroom state/);
}
for(const invalid of ['rejected','finished','speaking','queued','__proto__','constructor','',null,undefined,0,{}]){
  assert.throws(()=>toLab(invalid),/Unknown classroom state/);
}
const source={type:'entry.denied',state:'denied',sequence:2};
const mapped=normalizeEvent(source);
assert.deepEqual(mapped,{type:'entry.denied',state:'rejected',sequence:2});
assert.equal(source.state,'denied');
assert.equal(Object.isFrozen(mapped),true);
assert.deepEqual(normalizeEvent({type:'hand.changed',sequence:3}),{type:'hand.changed',sequence:3});
for(const invalid of [null,[],{},'event',{type:2},{type:'x',state:'invalid'}]){
  assert.throws(()=>normalizeEvent(invalid));
}
const cycle=['outside','waiting','rejected','waiting','admitted','removed','waiting','admitted'];
assert.deepEqual(cycle.map(s=>toLab(toEngine(s))),cycle);
console.log('Academy Learning Lab state compatibility: PASS');
