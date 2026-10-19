#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const {createPrototype}=require('./lms-prototype.cjs');
const learnerA={id:'synthetic-learner-a',role:'learner'};
const learnerB={id:'synthetic-learner-b',role:'learner'};
const visitor={id:'synthetic-visitor',role:'visitor'};
const tests=[];
function test(name,fn){tests.push([name,fn]);}
test('catalog lists eight programs',()=>{const r=createPrototype().catalog('en');assert.equal(r.ok,true);assert.equal(r.programs.length,8);});
test('catalog supports nine languages',()=>{const p=createPrototype();for(const l of ['en','tr','es','fr','de','pt','ru','ar','zh'])assert.equal(p.catalog(l).programs.length,8);});
test('unknown locale is rejected',()=>assert.equal(createPrototype().catalog('xx').error,'unsupported_locale'));
test('unknown program is rejected',()=>assert.equal(createPrototype().course('not-a-program','en').error,'program_not_found'));
test('draft lesson preview shows one module and lesson',()=>{const r=createPrototype().course('art-of-being-human','tr');assert.equal(r.previewOnly,true);assert.equal(r.modules.length,1);assert.equal(r.lessons.length,1);});
test('other programs remain planned without invented lessons',()=>{const r=createPrototype().course('responsible-ai-digital-safety','en');assert.equal(r.modules.length,0);assert.equal(r.lessons.length,0);});
test('anonymous progress simulation rejected',()=>assert.equal(createPrototype().simulateProgress(null,'art-of-being-human','understanding-human-dignity').error,'forbidden'));
test('visitor progress simulation rejected',()=>assert.equal(createPrototype().simulateProgress(visitor,'art-of-being-human','understanding-human-dignity').error,'forbidden'));
test('forged learner identity rejected',()=>assert.equal(createPrototype().simulateProgress({id:'synthetic-fake',role:'learner'},'art-of-being-human','understanding-human-dignity').error,'forbidden'));
test('unknown lesson rejected',()=>assert.equal(createPrototype().simulateProgress(learnerA,'art-of-being-human','unknown').error,'lesson_not_found'));
test('learner can simulate their own progress',()=>{const p=createPrototype();assert.equal(p.simulateProgress(learnerA,'art-of-being-human','understanding-human-dignity').ok,true);assert.equal(p.getProgress(learnerA,learnerA.id).items.length,1);});
test('learner cannot read another learner progress',()=>{const p=createPrototype();p.simulateProgress(learnerA,'art-of-being-human','understanding-human-dignity');assert.equal(p.getProgress(learnerB,learnerA.id).error,'forbidden');});
test('simulated progress is not persisted between instances',()=>{const p=createPrototype();p.simulateProgress(learnerA,'art-of-being-human','understanding-human-dignity');assert.equal(createPrototype().getProgress(learnerA,learnerA.id).items.length,0);});
test('enrollment is disabled',()=>assert.equal(createPrototype().enroll().error,'enrollment_disabled'));
test('credential issuance is disabled',()=>assert.equal(createPrototype().issueCredential().error,'credentials_disabled'));
let failed=0;for(const [name,fn] of tests){try{fn();console.log('PASS',name);}catch(e){failed++;console.error('FAIL',name,e.message);}}
console.log(`${tests.length-failed}/${tests.length} isolated LMS prototype checks passed`);if(failed)process.exitCode=1;
