/* Node-only synthetic contract checks; never loads real learner data. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=process.cwd();
const data=JSON.parse(fs.readFileSync(root+'/academy/catalog/academy-curriculum-inventory.json','utf8'));
const window={location:{href:'https://echoesofhumanity.github.io/Echoes-5/academy-learning-lab.html',origin:'https://echoesofhumanity.github.io'}};
vm.runInNewContext(fs.readFileSync(root+'/academy/catalog/academy-catalog-reader.js','utf8'),{window,URL});
const api=window.EchoesAcademyCatalog;
assert.equal(api.validate(data).pilot_programs.length,8);
assert.equal(data.pilot_programs.reduce((n,p)=>n+p.indicative_modules_en.length,0),24);
assert.equal(data.pilot_programs.reduce((n,p)=>n+p.learning_outcomes_en.length,0),24);
const id=data.pilot_programs[0].id;
assert.equal(api.resolveLesson(data,id,'sample-lesson','tr'),null,'Unpublished content must remain inaccessible');
const fixture=JSON.parse(JSON.stringify(data));
fixture.pilot_programs[0].lessons=[
{id:'sample-lesson',status:'draft',media:{url:'https://example.org/lesson.mp4',subtitles:{tr:'https://example.org/tr.vtt'}}},
{id:'published-sample',status:'published',media:{url:'https://example.org/lesson.mp4',subtitles:{tr:'https://example.org/tr.vtt'}}}
];
assert.equal(api.resolveLesson(fixture,id,'sample-lesson','tr'),null,'Draft cannot be selected');
const lesson=api.resolveLesson(fixture,id,'published-sample','tr');
assert.equal(lesson.language,'tr');
assert.equal(lesson.videoUrl,'https://example.org/lesson.mp4');
assert.equal(lesson.subtitleUrl,'https://example.org/tr.vtt');
fixture.pilot_programs[0].lessons[1].media.url='javascript:alert(1)';
assert.equal(api.resolveLesson(fixture,id,'published-sample','tr'),null,'Unsafe media URL rejected');
assert.equal(api.resolveLesson(data,'unknown','sample-lesson','en'),null);
const html=fs.readFileSync(root+'/academy-learning-lab.html','utf8');
assert.match(html,/src="Echoes_Academy_Introduction_35s\.mp4"/);
assert.equal((html.match(/<track kind="subtitles"/g)||[]).length,9);
assert.match(html,/academy\/catalog\/academy-catalog-reader\.js/);
assert.match(html,/academy\/catalog\/academy-media-bridge\.js/);
console.log('Academy catalog: 8 programs, 24 modules, 24 outcomes, publication gate, synthetic media and nine-caption intro checks PASS');
