#!/usr/bin/env node
/* Academy synthetic contract test — no network, credentials, database, or real users. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/lms-synthetic-v1.json'),'utf8'));
const expectedLanguages=['en','tr','es','fr','de','pt','ru','ar','zh'];
const expectedSlugs=['art-of-being-human','conscious-parenting-child-safeguarding','creativity-economic-opportunity','young-creators-future-media','financial-literacy-everyday-life','responsible-ai-digital-safety','peaceful-dialogue-community-action','communication-across-cultures'];
const tests=[];
function test(name,fn){tests.push([name,fn]);}
function unique(items){return new Set(items).size===items.length;}
function authorize(actor,action,resource){
  if(action==='catalog.read')return resource.status==='published'||resource.status==='planned';
  if(action==='enrollment.read')return actor.role==='learner'&&resource.learnerId===actor.id;
  if(action==='course.edit')return actor.role==='instructor'&&resource.assignedInstructorId===actor.id&&resource.status==='draft';
  if(action==='course.approve')return actor.role==='subject_reviewer'&&resource.authorId!==actor.id&&resource.status==='in_review';
  if(action==='course.publish')return actor.role==='publisher'&&resource.status==='approved'&&resource.subjectApproved&&resource.accessibilityApproved&&(!resource.requiresSafeguarding||resource.safeguardingApproved);
  if(action==='credential.issue')return actor.role==='credential_service'&&resource.verifiedCompletion===true&&resource.assessmentPassed===true&&resource.coursePublished===true;
  return false;
}
test('synthetic-only data',()=>{assert.equal(data.synthetic,true);assert.ok(data.actors.every(x=>x.id.startsWith('synthetic-')));assert.equal(data.credentials.length,0);});
test('exactly eight stable schools and programs',()=>{assert.equal(data.schools.length,8);assert.equal(data.programs.length,8);assert.deepEqual(data.programs.map(x=>x.slug),expectedSlugs);assert.ok(unique(data.programs.map(x=>x.slug)));assert.ok(unique(data.programs.map(x=>x.id)));});
test('all program-school relationships resolve',()=>{const ids=new Set(data.schools.map(x=>x.id));for(const p of data.programs)assert.ok(ids.has(p.schoolId),p.slug);});
test('nine locale schemas have complete preview text',()=>{assert.deepEqual(data.localeCodes,expectedLanguages);for(const p of data.programs){assert.deepEqual(Object.keys(p.locales),expectedLanguages);for(const code of expectedLanguages){const l=p.locales[code];for(const k of ['title','audience','description'])assert.ok(typeof l[k]==='string'&&l[k].trim());for(const k of ['learning_outcomes','module_outline'])assert.ok(Array.isArray(l[k])&&l[k].length===3&&l[k].every(x=>typeof x==='string'&&x.trim()));}}});
test('planned programs are not enrollable or certifiable',()=>{assert.ok(data.programs.every(x=>x.status==='planned'));assert.ok(data.courses.every(x=>x.status!=='published'));assert.equal(authorize(data.actors[1],'credential.issue',{verifiedCompletion:false,assessmentPassed:false,coursePublished:false}),false);});
test('learner records cannot be read by another learner',()=>{const a=data.actors[1],b=data.actors[2],e=data.enrollments[0];assert.equal(authorize(a,'enrollment.read',e),true);assert.equal(authorize(b,'enrollment.read',e),false);assert.equal(authorize(data.actors[0],'enrollment.read',e),false);});
test('instructors cannot approve their own work',()=>{const instructor=data.actors[3],reviewer=data.actors[4],course={authorId:instructor.id,assignedInstructorId:instructor.id,status:'in_review'};assert.equal(authorize(instructor,'course.approve',course),false);assert.equal(authorize(reviewer,'course.approve',course),true);});
test('publication requires independent safeguards',()=>{const publisher=data.actors[5];const course={status:'approved',subjectApproved:true,accessibilityApproved:true,requiresSafeguarding:true,safeguardingApproved:false};assert.equal(authorize(publisher,'course.publish',course),false);course.safeguardingApproved=true;assert.equal(authorize(publisher,'course.publish',course),true);assert.equal(authorize(data.actors[3],'course.publish',course),false);});
test('credential issuance requires server role and verified success',()=>{const service=data.actors[6];const evidence={verifiedCompletion:true,assessmentPassed:true,coursePublished:true};assert.equal(authorize(service,'credential.issue',evidence),true);assert.equal(authorize(data.actors[5],'credential.issue',evidence),false);assert.equal(authorize(service,'credential.issue',{...evidence,assessmentPassed:false}),false);});
let failed=0;for(const [name,fn] of tests){try{fn();console.log('PASS',name);}catch(err){failed++;console.error('FAIL',name,err.message);}}
console.log(`${tests.length-failed}/${tests.length} synthetic contract checks passed`);if(failed)process.exitCode=1;
