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
  if(action==='enrollment.create')return actor.role==='learner'&&resource.learnerId===actor.id&&resource.courseStatus==='published'&&resource.courseRevisionPublished===true;
  if(action==='catalog.read')return resource.status==='published'||resource.status==='planned';
  if(action==='enrollment.read')return actor.role==='learner'&&resource.learnerId===actor.id;
  if(action==='course.edit')return actor.role==='instructor'&&resource.assignedInstructorId===actor.id&&resource.status==='draft';
  if(action==='course.approve')return actor.role==='subject_reviewer'&&resource.authorId!==actor.id&&resource.status==='in_review';
  if(action==='course.publish')return actor.role==='publisher'&&resource.status==='approved'&&resource.subjectApproved&&resource.accessibilityApproved&&(!resource.requiresSafeguarding||resource.safeguardingApproved);
  if(action==='credential.issue')return actor.role==='credential_service'&&resource.verifiedCompletion===true&&resource.assessmentPassed===true&&resource.coursePublished===true;
  return false;
}

// Independent fixture validator for negative/mutation tests. Synthetic fixtures only.
function validateFixture(fixture){
  const errors=[];
  if(fixture.synthetic!==true)errors.push('not_synthetic');
  if(!Array.isArray(fixture.schools)||!Array.isArray(fixture.programs)){errors.push('missing_collections');return errors;}
  const schoolIds=fixture.schools.map(s=>s.id);
  const programIds=fixture.programs.map(p=>p.id);
  const slugs=fixture.programs.map(p=>p.slug);
  if(!unique(schoolIds)||!unique(programIds)||!unique(slugs))errors.push('duplicate_identity');
  const schools=new Set(schoolIds);
  const courses=new Map((fixture.courses||[]).map(c=>[c.revisionId,c]));
  for(const p of fixture.programs){
    if(!schools.has(p.schoolId))errors.push('missing_school');
    for(const code of expectedLanguages){
      const l=p.locales?.[code];
      if(!l||['title','audience','description'].some(k=>typeof l[k]!=='string'||!l[k].trim())||
         ['learning_outcomes','module_outline'].some(k=>!Array.isArray(l[k])||l[k].length!==3||l[k].some(v=>typeof v!=='string'||!v.trim())))
        errors.push('incomplete_locale:'+code);
    }
  }
  for(const e of fixture.enrollments||[]){
    const c=courses.get(e.courseRevisionId);
    if(!c||c.status!=='published')errors.push('unpublished_enrollment');
  }
  return errors;
}
function mutated(change){const copy=structuredClone(data);change(copy);return copy;}

test('synthetic-only data',()=>{assert.equal(data.synthetic,true);assert.ok(data.actors.every(x=>x.id.startsWith('synthetic-')));assert.equal(data.credentials.length,0);});
test('exactly eight stable schools and programs',()=>{assert.equal(data.schools.length,8);assert.equal(data.programs.length,8);assert.deepEqual(data.programs.map(x=>x.slug),expectedSlugs);assert.ok(unique(data.programs.map(x=>x.slug)));assert.ok(unique(data.programs.map(x=>x.id)));});
test('all program-school relationships resolve',()=>{const ids=new Set(data.schools.map(x=>x.id));for(const p of data.programs)assert.ok(ids.has(p.schoolId),p.slug);});
test('nine locale schemas have complete preview text',()=>{assert.deepEqual(data.localeCodes,expectedLanguages);for(const p of data.programs){assert.deepEqual(Object.keys(p.locales),expectedLanguages);for(const code of expectedLanguages){const l=p.locales[code];for(const k of ['title','audience','description'])assert.ok(typeof l[k]==='string'&&l[k].trim());for(const k of ['learning_outcomes','module_outline'])assert.ok(Array.isArray(l[k])&&l[k].length===3&&l[k].every(x=>typeof x==='string'&&x.trim()));}}});
test('planned programs are not enrollable or certifiable',()=>{assert.ok(data.programs.every(x=>x.status==='planned'));assert.ok(data.courses.every(x=>x.status!=='published'));assert.equal(authorize(data.actors[1],'credential.issue',{verifiedCompletion:false,assessmentPassed:false,coursePublished:false}),false);});
test('learner records cannot be read by another learner',()=>{const a=data.actors[1],b=data.actors[2],e={id:'synthetic-test-enrollment',learnerId:a.id};assert.equal(authorize(a,'enrollment.read',e),true);assert.equal(authorize(b,'enrollment.read',e),false);assert.equal(authorize(data.actors[0],'enrollment.read',e),false);});
test('draft courses cannot have active enrollments',()=>{assert.equal(data.enrollments.length,0);assert.equal(data.rejectedEnrollmentAttempts.length,1);const attempt=data.rejectedEnrollmentAttempts[0];assert.equal(attempt.expectedDecision,'deny');assert.equal(attempt.reason,'course_not_published');const actor=data.actors[1];assert.equal(authorize(actor,'enrollment.create',{learnerId:actor.id,courseStatus:'draft',courseRevisionPublished:false}),false);assert.equal(authorize(actor,'enrollment.create',{learnerId:actor.id,courseStatus:'published',courseRevisionPublished:true}),true);assert.equal(authorize(data.actors[2],'enrollment.create',{learnerId:actor.id,courseStatus:'published',courseRevisionPublished:true}),false);});
test('instructors cannot approve their own work',()=>{const instructor=data.actors[3],reviewer=data.actors[4],course={authorId:instructor.id,assignedInstructorId:instructor.id,status:'in_review'};assert.equal(authorize(instructor,'course.approve',course),false);assert.equal(authorize(reviewer,'course.approve',course),true);});
test('publication requires independent safeguards',()=>{const publisher=data.actors[5];const course={status:'approved',subjectApproved:true,accessibilityApproved:true,requiresSafeguarding:true,safeguardingApproved:false};assert.equal(authorize(publisher,'course.publish',course),false);course.safeguardingApproved=true;assert.equal(authorize(publisher,'course.publish',course),true);assert.equal(authorize(data.actors[3],'course.publish',course),false);});
test('credential issuance requires server role and verified success',()=>{const service=data.actors[6];const evidence={verifiedCompletion:true,assessmentPassed:true,coursePublished:true};assert.equal(authorize(service,'credential.issue',evidence),true);assert.equal(authorize(data.actors[5],'credential.issue',evidence),false);assert.equal(authorize(service,'credential.issue',{...evidence,assessmentPassed:false}),false);});
test('negative: duplicate program identity rejected',()=>{const f=mutated(x=>{x.programs[1].id=x.programs[0].id;});assert.ok(validateFixture(f).includes('duplicate_identity'));});
test('negative: orphan school reference rejected',()=>{const f=mutated(x=>{x.programs[0].schoolId='synthetic-school-missing';});assert.ok(validateFixture(f).includes('missing_school'));});
test('negative: missing Chinese translation rejected',()=>{const f=mutated(x=>{delete x.programs[0].locales.zh;});assert.ok(validateFixture(f).includes('incomplete_locale:zh'));});
test('negative: empty Arabic outcome rejected',()=>{const f=mutated(x=>{x.programs[0].locales.ar.learning_outcomes[1]='';});assert.ok(validateFixture(f).includes('incomplete_locale:ar'));});
test('negative: active enrollment into draft rejected',()=>{const f=mutated(x=>{x.enrollments.push({id:'synthetic-invalid',learnerId:'synthetic-learner-a',courseRevisionId:'synthetic-course-revision-1',status:'active'});});assert.ok(validateFixture(f).includes('unpublished_enrollment'));});
test('negative: credential without verified assessment rejected',()=>{const service=data.actors[6];assert.equal(authorize(service,'credential.issue',{verifiedCompletion:true,assessmentPassed:false,coursePublished:true}),false);});
test('positive: unchanged synthetic fixture validates',()=>{assert.deepEqual(validateFixture(data),[]);});
let failed=0;for(const [name,fn] of tests){try{fn();console.log('PASS',name);}catch(err){failed++;console.error('FAIL',name,err.message);}}
console.log(`${tests.length-failed}/${tests.length} synthetic contract checks passed`);if(failed)process.exitCode=1;

// Existing Learning Lab projection and wiring regression suite (offline only).
require('./check-room-state-compatibility.cjs');
require('./check-existing-lab-event-projection.cjs');
require('./check-existing-lab-projection-wiring.cjs');
