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
test('Marketplace demo preserves local synthetic checkout state',()=>{
 const html=readFileSync(new URL('../marketplace-demo.html',import.meta.url),'utf8');
 assert.match(html,/marketplace-demo-order\.js/);
 assert.match(html,/marketplace-v2-bridge\.js/);
 assert.match(html,/EchoesMarketplaceDemoOrder\.create/);
 assert.doesNotMatch(source,/\.rpc\s*\(|\bfetch\s*\(/);
});
