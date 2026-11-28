/* Run: node tests/marketplace-digital-publication-policy.test.js */
"use strict";
const assert=require("node:assert/strict");
require("../assets/js/marketplace-digital-publication-policy.js");
const evaluate=globalThis.EchoesDigitalPublicationPolicy.evaluate;
const creator={role:"creator",subject_id:"creator-A"};
const reviewer={role:"reviewer",subject_id:"reviewer-B"};
const publisher={role:"publisher",subject_id:"publisher-D"};
const listing={
 status:"draft",creator_subject_id:"creator-A",creator_verified:true,
 publication_consent:true,rights_reviewed:true,has_english_localization:true,
 has_approved_preview:true,has_private_deliverable:true,
 license_code:"personal",territory_policy:"eligible-regions",
 store_published:true
};
let passed=0;
function test(name,input,actor,action,ok,reasonOrState){
 const result=evaluate(input,actor,action);
 assert.equal(result.ok,ok,name);
 assert.equal(ok?result.next_state:result.reason,reasonOrState,name);
 if(ok)assert.equal(result.checkout_enabled,false,name);
 passed++;
}
test("creator submits",listing,creator,"submit",true,"submitted");
test("another creator cannot submit",{...listing,creator_subject_id:"creator-X"},creator,"submit",false,"not_creator");
test("creator cannot review",{...listing,status:"submitted"},creator,"review",false,"wrong_role");
test("reviewer reviews",{...listing,status:"submitted"},reviewer,"review",true,"reviewed");
test("reviewer approves",{...listing,status:"reviewed"},reviewer,"approve",true,"approved");
test("creator cannot approve even as reviewer",{...listing,status:"reviewed"},{role:"reviewer",subject_id:"creator-A"},"approve",false,"self_approval_forbidden");
test("publisher publishes",{...listing,status:"approved"},publisher,"publish",true,"published");
test("publisher cannot publish own product",{...listing,status:"approved"},{role:"publisher",subject_id:"creator-A"},"publish",false,"self_approval_forbidden");
test("unverified creator blocked",{...listing,status:"approved",creator_verified:false},publisher,"publish",false,"creator_not_eligible");
test("consent revoked blocked",{...listing,status:"approved",publication_consent:false},publisher,"publish",false,"creator_not_eligible");
test("missing rights blocked",{...listing,status:"approved",rights_reviewed:false},publisher,"publish",false,"missing_publication_requirements");
test("missing file blocked",{...listing,status:"approved",has_private_deliverable:false},publisher,"publish",false,"missing_publication_requirements");
test("missing English blocked",{...listing,status:"approved",has_english_localization:false},publisher,"publish",false,"missing_publication_requirements");
test("unpublished store blocked",{...listing,status:"approved",store_published:false},publisher,"publish",false,"store_not_published");
test("pause",{...listing,status:"published"},publisher,"pause",true,"paused");
test("withdraw",{...listing,status:"published"},creator,"withdraw",true,"withdrawn");
test("revise",{...listing,status:"withdrawn"},creator,"revise",true,"draft");
test("invalid transition",listing,creator,"publish",false,"invalid_transition");
test("reject",{...listing,status:"reviewed"},reviewer,"reject",true,"rejected");
console.log("PASS "+passed+" synthetic publication policy checks; no server authorization tested.");
