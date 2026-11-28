/* Echoes Marketplace digital prelaunch adapter — SYNTHETIC ONLY.
 * Delegates to existing portal catalogue, selection, cart and order modules.
 * Does not implement checkout, issue EC, publish products or grant downloads.
 */
(function(root){
 "use strict";
 const deps=["EchoesMarketplaceCatalog","EchoesMarketplaceSelection","EchoesMarketplaceCart","EchoesMarketplaceSyntheticOrder"];
 function required(){
  for(const name of deps)if(!root[name])throw new Error("Missing portal module: "+name);
 }
 let catalog=null;
 function ready(){required();return Array.isArray(catalog);}
 async function load(){
  required();
  catalog=await root.EchoesMarketplaceCatalog.load("assets/data/marketplace-catalog.json");
  return Object.freeze(catalog.slice());
 }
 function selection(){required();return root.EchoesMarketplaceSelection.read();}
 function calculate(){
  required();
  if(!catalog)throw new Error("Catalogue not loaded");
  const lines=selection().map(function(line){
   const product=catalog.find(function(p){return p.concept_id===line.concept_id;});
   if(!product)throw new Error("Unknown selected concept");
   return {product_id:product.product_id,quantity:line.quantity};
  });
  if(!lines.length)return Object.freeze({mode:"synthetic_demo",currency:"EC",checkout_enabled:false,lines:Object.freeze([]),total_ec:0});
  return root.EchoesMarketplaceCart.calculate(catalog,lines);
 }
 function add(conceptId,quantity){required();if(!catalog||!catalog.some(p=>p.concept_id===conceptId))throw new Error("Unknown concept");root.EchoesMarketplaceSelection.add(conceptId,quantity);return calculate();}
 function setQuantity(conceptId,quantity){required();if(!catalog||!catalog.some(p=>p.concept_id===conceptId))throw new Error("Unknown concept");root.EchoesMarketplaceSelection.setQuantity(conceptId,quantity);return calculate();}
 function clear(){required();root.EchoesMarketplaceSelection.clear();return calculate();}
 function createSyntheticOrder(){
  required();
  const cart=calculate();
  if(!cart.lines.length)throw new Error("Empty synthetic cart");
  return root.EchoesMarketplaceSyntheticOrder.create(cart);
 }
 root.EchoesMarketplaceDigitalPrelaunch=Object.freeze({
  mode:"synthetic_demo",checkout_enabled:false,ready,load,selection,calculate,add,setQuantity,clear,
  createSyntheticOrder,
  orderStatus:function(){required();return root.EchoesMarketplaceSyntheticOrder.status();},
  confirmSyntheticOrder:function(){required();return root.EchoesMarketplaceSyntheticOrder.confirm();},
  fulfillSyntheticOrder:function(){required();return root.EchoesMarketplaceSyntheticOrder.fulfill();},
  cancelSyntheticOrder:function(){required();return root.EchoesMarketplaceSyntheticOrder.cancel();},
  reverseSyntheticOrder:function(){required();return root.EchoesMarketplaceSyntheticOrder.reverse();}
 });
})(window);
