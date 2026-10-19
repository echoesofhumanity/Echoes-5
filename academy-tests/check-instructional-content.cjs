#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/instructional-content-synthetic-v1.json'),'utf8'));
const locales=['en','tr','es','fr','de','pt','ru','ar','zh'];
const tests=[];
function test(label,fn){tests.push([label,fn]);}
function validate(x){
 const errors=[];
 if(x.synthetic!==true)errors.push('synthetic_required');
 if(x.course?.status!=='draft'||x.publicationState!=='draft')errors.push('not_draft');
 if(x.access?.enrollmentEnabled||x.access?.progressTrackingEnabled||x.access?.credentialIssuanceEnabled)errors.push('premature_activation');
 if(x.course?.accreditationClaim)errors.push('accreditation_claim');
 const ids=new Set(),keys=new Set();
 for(const m of x.modules||[]){
   if(ids.has(m.id)||keys.has('module:'+m.stableKey))errors.push('duplicate_module');
   ids.add(m.id);keys.add('module:'+m.stableKey);
   for(const l of locales)if(!m.locales?.[l]?.title?.trim()||!m.locales?.[l]?.summary?.trim())errors.push('module_locale:'+l);
 }
 const lessonKeys=new Set();
 for(const lesson of x.lessons||[]){
   if(!ids.has(lesson.moduleId))errors.push('orphan_lesson');
   if(lessonKeys.has(lesson.stableKey))errors.push('duplicate_lesson');
   lessonKeys.add(lesson.stableKey);
   if(lesson.bodyRef!==null||lesson.mediaAssetId!==null||lesson.assessmentId!==null)errors.push('real_content_reference');
   for(const l of locales)if(!lesson.locales?.[l]?.title?.trim()||!lesson.locales?.[l]?.summary?.trim())errors.push('lesson_locale:'+l);
 }
 return errors;
}
const change=fn=>{const x=structuredClone(data);fn(x);return x;};
test('draft fixture accepted',()=>assert.deepEqual(validate(data),[]));
test('all nine locales present',()=>assert.deepEqual(Object.keys(data.modules[0].locales),locales));
test('enrollment activation rejected',()=>assert.ok(validate(change(x=>x.access.enrollmentEnabled=true)).includes('premature_activation')));
test('credential activation rejected',()=>assert.ok(validate(change(x=>x.access.credentialIssuanceEnabled=true)).includes('premature_activation')));
test('missing Arabic lesson rejected',()=>assert.ok(validate(change(x=>delete x.lessons[0].locales.ar)).includes('lesson_locale:ar')));
test('orphan lesson rejected',()=>assert.ok(validate(change(x=>x.lessons[0].moduleId='missing')).includes('orphan_lesson')));
test('duplicate module key rejected',()=>assert.ok(validate(change(x=>x.modules.push(structuredClone(x.modules[0])))).includes('duplicate_module')));
test('unreviewed fixture cannot be published',()=>assert.ok(validate(change(x=>x.publicationState='published')).includes('not_draft')));
test('accreditation claim rejected',()=>assert.ok(validate(change(x=>x.course.accreditationClaim=true)).includes('accreditation_claim')));
test('real media reference rejected',()=>assert.ok(validate(change(x=>x.lessons[0].mediaAssetId='real-asset')).includes('real_content_reference')));
let failures=0;for(const [name,fn] of tests){try{fn();console.log('PASS',name)}catch(e){failures++;console.error('FAIL',name,e.message)}}
console.log(`${tests.length-failures}/${tests.length} instructional content checks passed`);if(failures)process.exitCode=1;
