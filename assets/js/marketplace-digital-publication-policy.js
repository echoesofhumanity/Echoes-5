/* Echoes digital publication policy — deterministic prelaunch validation only.
 * Client-side guidance, NOT authorization. Server must enforce all rules.
 * No network, file access, checkout, EC issuance or publication side effects.
 */
(function(root){
 "use strict";
 const allowed=Object.freeze({
  draft:Object.freeze({submit:"submitted"}),
  submitted:Object.freeze({review:"reviewed",reject:"rejected",withdraw:"withdrawn"}),
  reviewed:Object.freeze({approve:"approved",reject:"rejected",withdraw:"withdrawn"}),
  approved:Object.freeze({publish:"published",withdraw:"withdrawn"}),
  published:Object.freeze({pause:"paused",withdraw:"withdrawn"}),
  paused:Object.freeze({publish:"published",withdraw:"withdrawn"}),
  rejected:Object.freeze({revise:"draft"}),
  withdrawn:Object.freeze({revise:"draft"})
 });
 const roles=Object.freeze({
  submit:"creator",review:"reviewer",approve:"reviewer",reject:"reviewer",
  publish:"publisher",pause:"publisher",withdraw:"creator",revise:"creator"
 });
 function valid(value){return typeof value==="string"&&value.length>0;}
 function evaluate(listing,actor,action){
  if(!listing||!actor||!valid(action))return Object.freeze({ok:false,reason:"invalid_input"});
  const next=allowed[listing.status]&&allowed[listing.status][action];
  if(!next)return Object.freeze({ok:false,reason:"invalid_transition"});
  if(actor.role!==roles[action])return Object.freeze({ok:false,reason:"wrong_role"});
  if(!valid(actor.subject_id)||!valid(listing.creator_subject_id))return Object.freeze({ok:false,reason:"missing_identity"});
  if(["submit","withdraw","revise"].includes(action)&&actor.subject_id!==listing.creator_subject_id)
   return Object.freeze({ok:false,reason:"not_creator"});
  if(["review","approve","reject","publish","pause"].includes(action)&&actor.subject_id===listing.creator_subject_id)
   return Object.freeze({ok:false,reason:"self_approval_forbidden"});
  if(action==="approve"||action==="publish"){
   if(listing.creator_verified!==true||listing.publication_consent!==true)
    return Object.freeze({ok:false,reason:"creator_not_eligible"});
   if(listing.rights_reviewed!==true||listing.has_english_localization!==true||
      listing.has_approved_preview!==true||listing.has_private_deliverable!==true||
      !valid(listing.license_code)||!valid(listing.territory_policy))
    return Object.freeze({ok:false,reason:"missing_publication_requirements"});
  }
  if(action==="publish"&&listing.store_published!==true)
   return Object.freeze({ok:false,reason:"store_not_published"});
  return Object.freeze({ok:true,next_state:next,checkout_enabled:false});
 }
 root.EchoesDigitalPublicationPolicy=Object.freeze({evaluate:evaluate});
})(typeof window!=="undefined"?window:globalThis);
