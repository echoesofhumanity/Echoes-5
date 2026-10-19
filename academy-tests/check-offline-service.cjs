#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {makeService,languages}=require('./prototype/offline-lms-service.cjs');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/instructional-content-synthetic-v1.json'),'utf8'));
const learnerA={id:'synthetic-learner-a',role:'learner'};
const learnerB={id:'synthetic-learner-b',role:'learner'};
const instructor={id:'synthetic-instructor',role:'instructor'};
const tests=[];
const test=(name,fn)=>tests.push([name,fn]);
test('reject non-synthetic source',()=>assert.throws(()=>makeService({...fixture,synthetic:false}),/SYNTHETIC_DRAFT_ONLY/));
test('reject published source',()=>assert.throws(()=>makeService({...fixture,publicationState:'published'}),/SYNTHETIC_DRAFT_ONLY/));
test('nine languages available',()=>assert.equal(languages.length,9));
test('all nine catalog views render',()=>{const service=makeService(fixture);for(const lang of languages){const result=service.catalog(lang);assert.equal(result.modules.length,1);assert.equal(result.modules[0].lessons.length,1);assert.ok(result.modules[0].title.includes(lang));}});
test('unsupported language denied',()=>assert.throws(()=>makeService(fixture).catalog('xx'),/UNSUPPORTED_LANGUAGE/));
test('catalog returns detached data',()=>{const service=makeService(fixture);const a=service.catalog('en');a.modules[0].title='tampered';assert.notEqual(service.catalog('en').modules[0].title,'tampered');});
test('learner starts with empty progress',()=>assert.deepEqual(makeService(fixture).getProgress(learnerA).completedLessonKeys,[]));
test('lesson completion is idempotent',()=>{const service=makeService(fixture);service.completeLesson(learnerA,'understanding-human-dignity');service.completeLesson(learnerA,'understanding-human-dignity');assert.equal(service.getProgress(learnerA).completedLessonKeys.length,1);});
test('learner progress isolated',()=>{const service=makeService(fixture);service.completeLesson(learnerA,'understanding-human-dignity');assert.equal(service.getProgress(learnerB).completedLessonKeys.length,0);});
test('cross learner read denied',()=>assert.throws(()=>makeService(fixture).readLearnerProgress(learnerB,learnerA.id),/ACCESS_DENIED/));
test('instructor progress read denied',()=>assert.throws(()=>makeService(fixture).getProgress(instructor),/ACCESS_DENIED/));
test('unknown lesson rejected',()=>assert.throws(()=>makeService(fixture).completeLesson(learnerA,'unknown'),/UNKNOWN_LESSON/));
test('unsynthetic identity rejected',()=>assert.throws(()=>makeService(fixture).getProgress({id:'real-person',role:'learner'}),/ACCESS_DENIED/));
test('enrollment permanently disabled',()=>assert.throws(()=>makeService(fixture).enroll(),/ENROLLMENT_DISABLED/));
test('credential issuance permanently disabled',()=>assert.throws(()=>makeService(fixture).issueCredential(),/CREDENTIAL_ISSUANCE_DISABLED/));
let failed=0;for(const [name,fn] of tests){try{fn();console.log('PASS',name)}catch(e){failed++;console.error('FAIL',name,e.message)}}
console.log(`${tests.length-failed}/${tests.length} offline service prototype checks passed`);if(failed)process.exitCode=1;
