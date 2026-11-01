'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const inventory=require('../catalog/academy-curriculum-inventory.json');
const {audit}=require('../catalog/academy-content-readiness.js');
test('eight programs and 24 modules map to current actual lesson inventory',()=>{
 const result=audit(inventory);
 assert.equal(result.programCount,8);
 assert.equal(result.moduleCount,24);
 assert.equal(result.draftLessons,1);
 assert.equal(result.publishedLessons,0);
 assert.equal(result.publishedWithMedia,0);
 assert.equal(result.seminarCount,0);
 assert.equal(result.inventoryOnly,true);
 assert.equal(result.readyForLiveTeaching,false);
 assert.equal(result.programs.reduce((n,p)=>n+p.missingLessonModules,0),23);
});
test('orphaned lesson references fail catalog readiness validation',()=>{
 const copy=structuredClone(inventory);
 copy.pilot_programs[1].lessons[0].module_id='not-a-module';
 assert.throws(()=>audit(copy),/Unmapped or duplicate lesson/);
});
test('published lesson without media cannot pass readiness audit',()=>{
 const copy=structuredClone(inventory);
 copy.pilot_programs[1].lessons[0].status='published';
 assert.throws(()=>audit(copy),/Published lesson missing media/);
});
