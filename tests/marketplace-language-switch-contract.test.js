/* Merchandise dynamic language-change contract: all nine portal languages. */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const merch=read("merchandise.html");
const i18n=read("assets/js/i18n.js");
const languages=["en","tr","de","fr","es","pt","ru","ar","zh"];
assert.match(i18n,/dispatchEvent\(new CustomEvent\("echoes:language-change"/);
assert.doesNotMatch(merch,/echoes:languagechange/,"obsolete event must not be used");
assert.ok((merch.match(/document\.addEventListener\("echoes:language-change"/g)||[]).length>=4);
for(const lang of languages){
 assert.match(merch,new RegExp('\\b'+lang+':\\s*\\['),"demo label dictionary missing "+lang);
 assert.match(merch,new RegExp('\\b'+lang+':\\s*\\['),"language missing "+lang);
 assert.match(merch,new RegExp('\\b'+lang+':\\s*"[^"]+"'),"cart navigation caption missing "+lang);
}
assert.match(merch,/document\.addEventListener\("echoes:language-change",\s*updateGoToOrder\)|document\.addEventListener\("echoes:language-change",\s*function\s*\(\)\s*\{\s*updateGoToOrder\(\)/);
const guidanceBlock=merch.split("const guidance={")[1]?.split("const help=guidance")[0];
assert.ok(guidanceBlock,"order guidance dictionary missing");
for(const lang of languages){
 const match=guidanceBlock.match(new RegExp("\\b"+lang+":\\s*(\\[[^\\]]+\\])"));
 assert.ok(match,"missing order status guidance for "+lang);
 const values=JSON.parse(match[1]);
 assert.equal(values.length,5,"five lifecycle guidance states for "+lang);
 assert.ok(values.every(value=>typeof value==="string"&&value.trim()),"empty order guidance "+lang);
}
assert.match(merch,/document\.addEventListener\("echoes:language-change",\s*refreshOrderPanel\)/);
assert.match(merch,/document\.addEventListener\("echoes:language-change",\s*refreshInlineTotal\)/);
console.log("PASS nine-language dynamic Merchandise refresh uses the canonical portal event");
