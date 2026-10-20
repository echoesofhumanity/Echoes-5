/* In-memory synthetic order lifecycle. Restores the original validated state
 * transitions and history; no network, payment, ledger or real order authority.
 */
(function(root){
 "use strict";
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const TRANSITIONS=Object.freeze({
  created:["confirmed","cancelled"],confirmed:["fulfilled","cancelled"],
  fulfilled:["reversed"],cancelled:[],reversed:[]
 });
 let order=null;
 function validCart(cart){
  if(!cart||cart.mode!=="synthetic_demo"||cart.currency!=="EC"||
    cart.checkout_enabled!==false||!Number.isSafeInteger(cart.total_ec)||
    cart.total_ec<=0||!Array.isArray(cart.lines)||!cart.lines.length||
    cart.lines.length>50)return false;
  let total=0;const seen=new Set();
  for(const x of cart.lines){
   if(!x||typeof x.product_id!=="string"||!UUID.test(x.product_id)||
    seen.has(x.product_id.toLowerCase())||!Number.isSafeInteger(x.quantity)||
    x.quantity<1||x.quantity>99||!Number.isSafeInteger(x.unit_price_ec)||
    x.unit_price_ec<=0||!Number.isSafeInteger(x.subtotal_ec)||
    x.unit_price_ec*x.quantity!==x.subtotal_ec||
    !Number.isSafeInteger(total+x.subtotal_ec))return false;
   seen.add(x.product_id.toLowerCase());total+=x.subtotal_ec;
  }
  return total===cart.total_ec;
 }
 function copy(){
  if(!order)return null;
  return Object.freeze({
   id:order.id,status:order.status,total_ec:order.total_ec,
   currency:"EC",mode:"synthetic_demo",checkout_enabled:false,
   payment_status:"not_applicable",
   lines:Object.freeze(order.lines.map(x=>Object.freeze({...x}))),
   history:Object.freeze(order.history.map(x=>Object.freeze({...x})))
  });
 }
 function create(cart){
  if(order&&!["cancelled","fulfilled","reversed"].includes(order.status))
   throw Error("An active synthetic order already exists");
  if(!validCart(cart))throw Error("Invalid synthetic order");
  const id="DEMO-"+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,10).toUpperCase();
  order={id,status:"created",total_ec:cart.total_ec,
   lines:cart.lines.map(x=>({product_id:x.product_id.toLowerCase(),
    quantity:x.quantity,unit_price_ec:x.unit_price_ec,subtotal_ec:x.subtotal_ec})),
   history:[{from:null,to:"created"}]};
  return copy();
 }
 function transition(next){
  if(!order||!TRANSITIONS[order.status].includes(next))
   throw Error("Forbidden synthetic order transition");
  const previous=order.status;
  order.status=next;
  order.history.push({from:previous,to:next});
  return copy();
 }
 root.EchoesMarketplaceSyntheticOrder=Object.freeze({
  create,confirm:()=>transition("confirmed"),
  fulfill:()=>transition("fulfilled"),
  cancel:()=>transition("cancelled"),
  reverse:()=>transition("reversed"),status:copy
 });
})(window);
