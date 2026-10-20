/* Single canonical Marketplace/Merchandise demo boundary: offline static regression. */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname,"..");
const read = file => fs.readFileSync(path.join(root,file),"utf8");
const pages = ["marketplace.html","merchandise.html","storefront.html","sections/merchandise/products.html"];
const forbidden = /(?:marketplace-demo\.html|assets\/js\/marketplace-demo-(?:catalog|cart|selection|order)\.js)/i;
for (const page of pages) {
  assert.doesNotMatch(read(page),forbidden,"legacy demo reference in "+page);
}
assert.equal(fs.existsSync(path.join(root,"marketplace-demo.html")),false,"duplicate demo page must not return");
const html=read("merchandise.html");
const modules=["assets/js/merchandise-catalog.js","assets/js/marketplace-catalog.js","assets/js/marketplace-cart.js","assets/js/marketplace-selection.js","assets/js/marketplace-synthetic-order.js"];
for(const file of modules){
  assert.ok(fs.existsSync(path.join(root,file)),"missing module "+file);
  assert.ok(html.includes(file),"Merchandise not loading "+file);
}
assert.match(html,/orderPanel\s*=\s*document\.createElement\("dialog"\)/);
assert.match(html,/orderPanel\.showModal\(\)/);
assert.match(html,/id\s*=\s*"echoes-synthetic-checkout"/);
assert.match(html,/goToOrder\.addEventListener\("click"/);
assert.match(read("assets/js/marketplace-synthetic-order.js"),/reverse:\s*\(\)\s*=>\s*transition\("reversed"\)/);
assert.match(read("assets/js/marketplace-v2-bridge.js"),/checkout_enabled:\s*false/);
assert.match(read("assets/js/marketplace-v2-bridge.js"),/production_enabled:\s*false/);
console.log("PASS canonical single-demo page, module, modal and V2 isolation checks");
