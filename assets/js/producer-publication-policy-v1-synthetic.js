/* Echoes of Humanity — isolated synthetic role and publication policy V1.
 * Policy prototype only. Browser-supplied actors and decisions are NOT trusted
 * authentication or authorization. No network, persistence, checkout or live publishing.
 */
(function(root){
"use strict";
const roles=Object.freeze(["producer","seller_reviewer","product_reviewer","merchandise_curator","publisher","administrator","oversight"]);
const actions=Object.freeze(["submit_seller","approve_seller","reject_seller","submit_product","approve_product","reject_product","approve_collection","place","remove","revise_product"]);
function fail(message){throw new Error(message)}
function text(v,max){return typeof v==="string"&&v.trim().length>0&&v.length<=max}
function actor(a){if(!a||!text(a.id,100)||!Array.isArray(a.roles)||!a.roles.every(r=>roles.includes(r)))fail("Invalid actor");return a}
function role(a,r){return a.roles.includes(r)}
function init(ownerId){if(!text(ownerId,100))fail("Invalid owner");return Object.freeze({ownerId,seller:"none",product:"none",collection:false,placed:false,target:null,productData:null,version:0,events:Object.freeze([])})}
function transition(current,a,action,input){
 if(!current||!text(current.ownerId,100)||!actions.includes(action))fail("Invalid request");
 actor(a);const data=input||{};const isOwner=a.id===current.ownerId;
 const reviewer=(r)=>role(a,r)&&!isOwner;
 const requireReason=()=>{if(!text(data.reason,500))fail("Reviewer reason required")};
 let next={...current,events:current.events.slice()},event=null;
 switch(action){
 case "submit_seller":
   if(!isOwner||!role(a,"producer")||current.seller!=="none")fail("Seller submission denied");
   next.seller="pending";event="seller_submitted";break;
 case "approve_seller":case "reject_seller":
   if(!reviewer("seller_reviewer")||current.seller!=="pending")fail("Seller review denied");
   requireReason();next.seller=action==="approve_seller"?"approved":"rejected";event=action;break;
 case "submit_product":
   if(!isOwner||!role(a,"producer")||current.seller!=="approved"||current.product!=="none")fail("Product submission denied");
   if(!text(data.title,100)||!text(data.description,1000)||!["physical","digital"].includes(data.kind)||!["marketplace","merchandise"].includes(data.target))fail("Invalid product");
   next.productData=Object.freeze({title:data.title.trim(),description:data.description.trim(),kind:data.kind,target:data.target});
   next.target=data.target;next.product="pending";next.collection=false;event="product_submitted";break;
 case "approve_product":case "reject_product":
   if(!reviewer("product_reviewer")||current.seller!=="approved"||current.product!=="pending")fail("Product review denied");
   requireReason();next.product=action==="approve_product"?"approved":"rejected";event=action;break;
 case "approve_collection":
   if(!reviewer("merchandise_curator")||current.target!=="merchandise"||current.product!=="approved"||current.collection)fail("Collection approval denied");
   requireReason();next.collection=true;event=action;break;
 case "place":
   if(!role(a,"publisher")||isOwner||current.placed||current.seller!=="approved"||current.product!=="approved"||(current.target==="merchandise"&&!current.collection))fail("Publication denied");
   next.placed=true;event="synthetic_placement";break;
 case "remove":
   if(!current.placed||!(role(a,"publisher")||role(a,"administrator")))fail("Removal denied");
   requireReason();next.placed=false;event="synthetic_removal";break;
 case "revise_product":
   if(!isOwner||!role(a,"producer")||current.product==="none"||!current.productData)fail("Revision denied");
   if(!text(data.title,100)||!text(data.description,1000)||!["physical","digital"].includes(data.kind)||!["marketplace","merchandise"].includes(data.target))fail("Invalid revision");
   const updated={title:data.title.trim(),description:data.description.trim(),kind:data.kind,target:data.target};
   if(Object.keys(updated).every(k=>updated[k]===current.productData[k]))fail("No change");
   next.productData=Object.freeze(updated);next.target=updated.target;next.product="pending";next.collection=false;next.placed=false;event="revision_requires_review";break;
 }
 next.version=current.version+1;
 next.events.push(Object.freeze({sequence:next.version,action:event,actorId:a.id,role:a.roles.slice(),reason:typeof data.reason==="string"?data.reason.trim():null}));
 next.events=Object.freeze(next.events);return Object.freeze(next);
}
function eligible(s){return !!(s&&s.seller==="approved"&&s.product==="approved"&&(s.target!=="merchandise"||s.collection))}
function selfTest(){
 const owner={id:"producer-A",roles:["producer","seller_reviewer","product_reviewer","publisher"]},sr={id:"reviewer-B",roles:["seller_reviewer"]},pr={id:"reviewer-C",roles:["product_reviewer"]},cur={id:"curator-D",roles:["merchandise_curator"]},pub={id:"publisher-E",roles:["publisher"]};
 const checks=[];const check=(name,fn)=>{fn();checks.push(name)};const denied=(fn)=>{let threw=false;try{fn()}catch(e){threw=true}if(!threw)fail("Expected denial")};
 let s=init(owner.id);
 check("self-approval prohibited",()=>{s=transition(s,owner,"submit_seller");denied(()=>transition(s,owner,"approve_seller",{reason:"ok"}))});
 check("seller approval",()=>{s=transition(s,sr,"approve_seller",{reason:"verified"});if(s.seller!=="approved")fail("Seller status")});
 check("no premature publication",()=>denied(()=>transition(s,pub,"place")));
 check("product submission",()=>{s=transition(s,owner,"submit_product",{title:"Test cup",description:"Handmade",kind:"physical",target:"merchandise"});if(s.product!=="pending")fail("Product pending")});
 check("no self product approval",()=>denied(()=>transition(s,owner,"approve_product",{reason:"ok"})));
 check("product approval",()=>{s=transition(s,pr,"approve_product",{reason:"checked"});if(eligible(s))fail("Merchandise gate missing")});
 check("collection gate",()=>{denied(()=>transition(s,pub,"place"));s=transition(s,cur,"approve_collection",{reason:"brand compliant"});if(!eligible(s))fail("Collection approval")});
 check("publisher only",()=>{denied(()=>transition(s,owner,"place"));s=transition(s,pub,"place");if(!s.placed)fail("Placement")});
 check("removal and reason",()=>{denied(()=>transition(s,pub,"remove"));s=transition(s,pub,"remove",{reason:"withdraw"});if(s.placed)fail("Removal")});
 check("revision revokes approvals",()=>{s=transition(s,owner,"revise_product",{title:"Revised cup",description:"Handmade",kind:"physical",target:"marketplace"});if(s.product!=="pending"||s.collection||s.placed||eligible(s))fail("Revision")});
 check("audit sequence",()=>{if(s.events.some((e,i)=>e.sequence!==i+1))fail("Audit order")});
 return Object.freeze({passed:checks.length,checks:Object.freeze(checks)});
}
root.EchoesProducerPublicationPolicyV1=Object.freeze({roles,actions,init,transition,eligible,selfTest,mode:"synthetic_only",productionAuthorization:false});
})(typeof window!=="undefined"?window:globalThis);
