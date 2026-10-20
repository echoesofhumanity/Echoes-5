/* Synthetic order state machine regression. Offline; no payments or remote EC writes. */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const source=p=>fs.readFileSync(path.join(root,p),"utf8");
const data=JSON.parse(source("assets/data/marketplace-catalog.json"));
function setup(){
 const context=vm.createContext({window:{},console});
 for(const name of ["marketplace-catalog","marketplace-cart","marketplace-synthetic-order"])
  vm.runInContext(source("assets/js/"+name+".js"),context,{filename:name+".js"});
 const api=context.window;
 const products=api.EchoesMarketplaceCatalog.validate(data);
 const cart=api.EchoesMarketplaceCart.calculate(products,products.map((p,i)=>({product_id:p.product_id,quantity:i+1})));
 return {engine:api.EchoesMarketplaceSyntheticOrder,cart};
}
let passed=0;
function test(name,fn){fn();passed++;console.log("PASS",name);}
const statuses=o=>Array.from(o.history,x=>x.to);
test("four-line EC cart and no real checkout",()=>{
 const {engine,cart}=setup();
 assert.equal(cart.lines.length,4);
 assert.equal(cart.total_ec,15400);
 assert.equal(cart.checkout_enabled,false);
 assert.equal(engine.status(),null);
});
test("create, confirm, fulfill, reverse; immutable history and snapshots",()=>{
 const {engine,cart}=setup();
 const created=engine.create(cart);
 assert.match(created.id,/^DEMO-/);
 assert.equal(created.status,"created");
 assert.equal(created.total_ec,15400);
 assert.equal(created.checkout_enabled,false);
 assert.equal(created.payment_status,"not_applicable");
 assert.deepEqual(statuses(created),["created"]);
 assert.throws(()=>engine.fulfill());
 assert.throws(()=>engine.reverse());
 const confirmed=engine.confirm();
 assert.deepEqual(statuses(confirmed),["created","confirmed"]);
 assert.equal(created.status,"created","prior snapshots must not mutate");
 assert.throws(()=>engine.confirm());
 const fulfilled=engine.fulfill();
 assert.deepEqual(statuses(fulfilled),["created","confirmed","fulfilled"]);
 assert.throws(()=>engine.cancel(),"fulfilled must be reversed, not cancelled");
 const reversed=engine.reverse();
 assert.equal(reversed.status,"reversed");
 assert.deepEqual(statuses(reversed),["created","confirmed","fulfilled","reversed"]);
 assert.equal(reversed.history[3].from,"fulfilled");
 assert.equal(reversed.total_ec,cart.total_ec);
 assert.throws(()=>engine.reverse(),"cannot reverse twice");
 assert.throws(()=>engine.cancel(),"cannot cancel reversed order");
 assert.throws(()=>engine.confirm(),"cannot confirm reversed order");
 assert.equal(engine.status().id,created.id);
});
test("cancel created order and prevent replay",()=>{
 const {engine,cart}=setup();
 engine.create(cart);
 const cancelled=engine.cancel();
 assert.deepEqual(statuses(cancelled),["created","cancelled"]);
 assert.throws(()=>engine.cancel());
 assert.throws(()=>engine.confirm());
 assert.throws(()=>engine.fulfill());
 assert.throws(()=>engine.reverse());
});
test("cancel confirmed order and preserve history",()=>{
 const {engine,cart}=setup();
 engine.create(cart);engine.confirm();
 const cancelled=engine.cancel();
 assert.deepEqual(statuses(cancelled),["created","confirmed","cancelled"]);
 assert.throws(()=>engine.cancel());
 assert.throws(()=>engine.fulfill());
});
test("cannot transition or cancel without an order",()=>{
 const {engine}=setup();
 for(const fn of [engine.confirm,engine.fulfill,engine.cancel,engine.reverse])
  assert.throws(fn);
});
test("cannot overwrite active order; can create after terminal states",()=>{
 const {engine,cart}=setup();
 const first=engine.create(cart);
 assert.throws(()=>engine.create(cart));
 engine.confirm();
 assert.throws(()=>engine.create(cart));
 engine.fulfill();
 const second=engine.create(cart);
 assert.notEqual(second.id,first.id);
 engine.cancel();
 const third=engine.create(cart);
 assert.notEqual(third.id,second.id);
 engine.confirm();engine.fulfill();engine.reverse();
 const fourth=engine.create(cart);
 assert.notEqual(fourth.id,third.id);
});
test("reject malformed, duplicated, forged and overflowing cart",()=>{
 const {engine,cart}=setup();
 const clone=()=>JSON.parse(JSON.stringify(cart));
 for(const mutate of [
  c=>{c.mode="live";},c=>{c.currency="USD";},
  c=>{c.checkout_enabled=true;},c=>{c.total_ec+=1;},
  c=>{c.lines=[];},c=>{c.lines[0].product_id="not-a-uuid";},
  c=>{c.lines[0].quantity=0;},c=>{c.lines[0].quantity=100;},
  c=>{c.lines[0].quantity=1.5;},c=>{c.lines[0].unit_price_ec=-1;},
  c=>{c.lines[0].subtotal_ec+=1;},
  c=>{c.lines[1].product_id=c.lines[0].product_id;},
  c=>{c.lines[0].unit_price_ec=Number.MAX_SAFE_INTEGER;c.lines[0].subtotal_ec=Number.MAX_SAFE_INTEGER;}
 ]){
  const forged=clone();mutate(forged);
  assert.throws(()=>engine.create(forged));
  assert.equal(engine.status(),null);
 }
});
test("created order does not inherit later cart mutations",()=>{
 const {engine,cart}=setup();
 const order=engine.create(cart);
 const before=order.total_ec;
 assert.equal(order.lines.length,4);
 assert.equal(order.lines[0].quantity,1);
 assert.equal(engine.status().total_ec,before);
 assert.equal(engine.status().lines[0].quantity,1);
});
console.log("All "+passed+" synthetic order lifecycle scenarios passed.");
