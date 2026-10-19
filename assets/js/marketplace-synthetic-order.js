/* Local synthetic order lifecycle. No network, payment, ledger or real order authority. */
(function(root){
 "use strict";
 let order=null;
 function copy(){return order?Object.freeze({id:order.id,status:order.status,total_ec:order.total_ec,lines:Object.freeze(order.lines.map(x=>Object.freeze({...x})))}):null;}
 function create(cart){
  if(order&&order.status!=="cancelled")throw Error("An active synthetic order already exists");
  if(!cart||cart.mode!=="synthetic_demo"||cart.checkout_enabled!==false||!Number.isSafeInteger(cart.total_ec)||cart.total_ec<=0||!Array.isArray(cart.lines)||!cart.lines.length)throw Error("Invalid synthetic order");
  const lines=cart.lines.map(x=>{if(!Number.isSafeInteger(x.quantity)||x.quantity<1||!Number.isSafeInteger(x.subtotal_ec)||x.subtotal_ec<=0)throw Error("Invalid synthetic line");return {product_id:x.product_id,quantity:x.quantity,subtotal_ec:x.subtotal_ec};});
  const total=lines.reduce((sum,x)=>sum+x.subtotal_ec,0);
  if(!Number.isSafeInteger(total)||total!==cart.total_ec)throw Error("Invalid synthetic total");
  const id="DEMO-"+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).slice(2,8).toUpperCase();
  order={id,status:"created",total_ec:total,lines};
  return copy();
 }
 function confirm(){if(!order||order.status!=="created")throw Error("No pending synthetic order");order.status="confirmed";return copy();}
 function cancel(){if(!order||!["created","confirmed"].includes(order.status))throw Error("No cancellable synthetic order");order.status="cancelled";return copy();}
 root.EchoesMarketplaceSyntheticOrder=Object.freeze({create,confirm,cancel,status:copy});
})(window);
