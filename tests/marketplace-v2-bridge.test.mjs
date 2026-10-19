import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../assets/js/marketplace-v2-bridge.js',import.meta.url),'utf8');
test('V2 bridge fails closed and never initiates a network request',async()=>{
 let calls=0;
 const window={fetch(){calls++;throw Error('unexpected network')},supabase:{createClient(){calls++;throw Error('unexpected Supabase')}},ECHOES_SUPABASE_URL:'https://production.invalid'};
 vm.runInNewContext(source,{window});
 const b=window.EchoesMarketplaceV2Bridge;
 assert.equal(b.status().checkout_enabled,false);
 assert.equal(b.status().connection,'disabled');
 assert.equal(b.status().production_enabled,false);
 assert.equal(Object.isFrozen(b),true);
 assert.equal(Object.isFrozen(b.status()),true);
 await assert.rejects(b.checkout({}),/disabled/);
 await assert.rejects(b.cancel({}),/disabled/);
 assert.equal(calls,0);
});
test('Original Merchandise remains read-only and uses canonical Marketplace modules',()=>{
 const html=readFileSync(new URL('../merchandise.html',import.meta.url),'utf8');
 assert.match(html,/assets\/js\/marketplace-catalog\.js/);
 assert.match(html,/assets\/js\/marketplace-cart\.js/);
 assert.match(html,/assets\/js\/marketplace-selection\.js/);
 assert.match(html,/Checkout and payment are unavailable/);
 assert.doesNotMatch(html,/marketplace-demo-(?:catalog|cart|selection|order)\.js/);
 assert.doesNotMatch(source,/\.rpc\s*\(|\bfetch\s*\(/);
});
