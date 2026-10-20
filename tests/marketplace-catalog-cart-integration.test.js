/* Canonical four-product synthetic catalogue -> selection -> cart regression.
 * Offline only; no checkout, real EC balance, or network.
 */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname,"..");
const file = p => fs.readFileSync(path.join(root,p),"utf8");
const catalogJSON = JSON.parse(file("assets/data/marketplace-catalog.json"));
const merchandiseJSON = JSON.parse(file("assets/data/merchandise-catalog.json"));
const store = new Map();
const sessionStorage = {
 getItem:k=>store.has(k)?store.get(k):null,
 setItem:(k,v)=>store.set(k,v),
 removeItem:k=>store.delete(k)
};
const window={sessionStorage};
const context=vm.createContext({window,console});
for(const name of ["marketplace-catalog","merchandise-catalog","marketplace-selection","marketplace-cart"])
 vm.runInContext(file("assets/js/"+name+".js"),context,{filename:name+".js"});
const catalog=window.EchoesMarketplaceCatalog.validate(catalogJSON);
const merchandise=window.EchoesMerchandiseCatalog.validate(merchandiseJSON);
const selection=window.EchoesMarketplaceSelection;
const calculate=window.EchoesMarketplaceCart.calculate;
const expected=new Map([
 ["one-humanity-tee",1990],["echoes-hoodie",2490],
 ["one-world-bottle",1490],["humanity-notebook",990]
]);
assert.equal(catalog.length,4,"four synthetic products must be available");
assert.equal(merchandise.length,4,"four merchandise concepts must be available");
assert.equal(new Set(catalog.map(p=>p.concept_id)).size,4);
assert.equal(new Set(catalog.map(p=>p.product_id)).size,4);
for(const product of catalog){
 assert.equal(product.price_ec,expected.get(product.concept_id),"canonical EC price");
 assert.equal(product.status,"concept");
 assert.equal(product.published,false);
 assert.equal(product.checkout_enabled,false);
 const mapped=merchandise.find(m=>m.concept_id===product.concept_id);
 assert.ok(mapped,"missing merchandise identity: "+product.concept_id);
 assert.equal(mapped.database_product_id.toLowerCase(),product.product_id);
 assert.equal(mapped.checkout_enabled,false);
}
const cartFromSelection=()=>{
 const requested=JSON.parse(JSON.stringify(selection.read())).map(line=>{
  const product=catalog.find(p=>p.concept_id===line.concept_id);
  assert.ok(product,"unknown selection concept");
  return {product_id:product.product_id,quantity:line.quantity};
 });
 return requested.length?calculate(catalog,requested):null;
};
function verify(expectedQuantities){
 const cart=cartFromSelection();
 if(!expectedQuantities.size){assert.equal(cart,null);return;}
 assert.equal(cart.lines.length,expectedQuantities.size);
 let sum=0;
 for(const [conceptId,quantity] of expectedQuantities){
  const product=catalog.find(p=>p.concept_id===conceptId);
  const line=cart.lines.find(l=>l.product_id===product.product_id);
  assert.ok(line,"missing cart line "+conceptId);
  assert.equal(line.quantity,quantity);
  assert.equal(line.unit_price_ec,product.price_ec);
  assert.equal(line.subtotal_ec,product.price_ec*quantity);
  sum+=line.subtotal_ec;
 }
 assert.equal(cart.total_ec,sum);
 assert.equal(cart.mode,"synthetic_demo");
 assert.equal(cart.currency,"EC");
 assert.equal(cart.checkout_enabled,false);
}
const state=new Map();
for(const [concept] of expected){
 selection.setQuantity(concept,1);state.set(concept,1);
 verify(state);
}
assert.equal(cartFromSelection().total_ec,6960,"all four items at quantity 1");
for(const [concept] of expected){
 selection.setQuantity(concept,99);state.set(concept,99);
 verify(state);
 assert.throws(()=>selection.add(concept,1),/limit/i,"reject quantity 100");
 verify(state);
 selection.setQuantity(concept,1);state.set(concept,1);
 verify(state);
}
assert.equal(cartFromSelection().total_ec,6960);
for(const [concept] of expected){
 selection.add(concept,2);state.set(concept,3);verify(state);
 selection.setQuantity(concept,2);state.set(concept,2);verify(state);
}
assert.equal(cartFromSelection().total_ec,13920);
for(const [concept] of expected){
 selection.setQuantity(concept,0);state.delete(concept);verify(state);
}
assert.equal(selection.read().length,0);
assert.throws(()=>selection.setQuantity("one-humanity-tee",100));
assert.throws(()=>selection.setQuantity("one-humanity-tee",-1));
assert.throws(()=>selection.setQuantity("one-humanity-tee",1.5));
assert.throws(()=>calculate(catalog,[{product_id:catalog[0].product_id,quantity:100}]));
assert.throws(()=>calculate(catalog,[{product_id:catalog[0].product_id,quantity:0}]));
assert.throws(()=>calculate(catalog,[{product_id:catalog[0].product_id,quantity:1.5}]));
assert.throws(()=>calculate(catalog,[{product_id:catalog[0].product_id,quantity:1},{product_id:catalog[0].product_id,quantity:1}]));
assert.throws(()=>calculate(catalog,[{product_id:"11111111-1111-4111-8111-111111111111",quantity:1}]));
const max=calculate(catalog,catalog.map(p=>({product_id:p.product_id,quantity:99})));
assert.equal(max.total_ec,689040,"99 units of each of four products");
assert.equal(max.checkout_enabled,false);
selection.clear();
assert.equal(selection.read().length,0);
console.log("PASS: four catalogue identities, EC prices, 1-99 limits, increments, decrements, removal, totals and demo isolation");
