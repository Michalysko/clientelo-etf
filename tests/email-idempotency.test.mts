import test from "node:test";
import assert from "node:assert/strict";
import { createDeliveryHandler } from "../src/lib/email/handler.ts";
import type { DeliveryDiagnostic } from "../src/lib/email/handler.ts";
import { sendResend, resendIdempotencyKey, DeliveryError, verifyTurnstile } from "../src/lib/email/providers.ts";
import type { OutgoingEmail } from "../src/lib/email/providers.ts";
import { createGuideEmail, createReport } from "../src/lib/email/content.ts";

const config = {apiKey:"fake-only", from:"unit@example.com", origin:"https://example.com", siteKey:"fake-only", turnstileSecret:"fake-only"};
const id = "12345678-1234-4234-8234-123456789abc", secondId = "12345678-1234-4234-8234-123456789abd";
const scenario = {firstTicker:"SPY",secondTicker:"SPYM",monthlyContribution:5000,years:20,grossAnnualReturnPercent:7,initialInvestment:0 as const};
const pdf = Buffer.from("%PDF-mock-only");
function message(material: "report" | "guide", requestId = id): OutgoingEmail {
  return {...(material === "guide" ? createGuideEmail() : createReport(scenario)), to:"reader@example.com", material, requestId, ...(material === "guide" ? {attachment:pdf} : {})};
}
function request(requestId: unknown = id, material: "report" | "guide" = "guide") {
  return new Request(`https://example.com/api/materials/${material}`, {method:"POST",headers:{origin:config.origin,"content-type":"application/json"},body:JSON.stringify({requestId,email:"reader@example.com",website:"",turnstileToken:"fake-token",...(material === "report" ? {scenario} : {})})});
}

for (const material of ["guide", "report"] as const) {
  test(`${material}: first request, retry, new explicit request and lost acknowledgement`, async () => {
    const stored = new Map<string,string>(); let created = 0, loseResponse = true;
    const fetcher: typeof fetch = async (_url, init) => {
      const key = (init!.headers as Record<string,string>)["Idempotency-Key"];
      const body = init!.body as string;
      if (stored.has(key) && stored.get(key) !== body) return Response.json({name:"invalid_idempotent_request"},{status:409});
      if (!stored.has(key)) { stored.set(key,body); created++; }
      if (loseResponse) { loseResponse = false; throw new DOMException("private details must not escape", "TimeoutError"); }
      return Response.json({id:"fake-provider-id"});
    };
    const handler = createDeliveryHandler(material,{config:()=>config,verify:async()=>true,guide:async()=>pdf,send:(cfg,email)=>sendResend(cfg,email,fetcher),log:()=>{}});
    assert.equal((await handler(request(id,material))).status,503);
    assert.equal((await handler(request(id,material))).status,202);
    assert.equal(created,1);
    assert.equal((await handler(request(secondId,material))).status,202);
    assert.equal(created,2);
    const original=message(material);
    assert.equal(resendIdempotencyKey(config,original),resendIdempotencyKey(config,{...original}));
    assert.notEqual(resendIdempotencyKey(config,original),resendIdempotencyKey(config,{...original,requestId:secondId}));
    // Changed payload keeps the key so Resend can reject it instead of sending twice.
    await assert.rejects(()=>sendResend(config,{...original,to:"other@example.com"},fetcher),e=>e instanceof DeliveryError && e.code === "payload_conflict");
    await assert.rejects(()=>sendResend(config,{...original,text:"changed"},fetcher),e=>e instanceof DeliveryError && e.providerStatus === 409);
    assert.equal(created,2);
  });
}

test("material namespaces cannot collide even for the same request UUID",()=>{
  assert.notEqual(resendIdempotencyKey(config,message("guide")),resendIdempotencyKey(config,message("report")));
});

test("concurrent same-identity requests: one creation, 409 while pending, safe later replay",async()=>{
  let release!:()=>void, pending=false, created=0, done=false;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  const fetcher: typeof fetch=async()=>{
    if(pending) return Response.json({name:"concurrent_idempotent_requests"},{status:409});
    if(!done){pending=true;created++;await gate;pending=false;done=true;}
    return Response.json({id:"fake-provider-id"});
  };
  const email=message("guide"), first=sendResend(config,email,fetcher);
  await assert.rejects(()=>sendResend(config,email,fetcher),e=>e instanceof DeliveryError&&e.code==="concurrent_request"&&e.providerStatus===409);
  release();await first;await sendResend(config,email,fetcher);assert.equal(created,1);
});

test("missing or malformed request identity stops before verification and Resend",async()=>{
  let verified=0,sent=0;
  const handler=createDeliveryHandler("guide",{config:()=>config,verify:async()=>{verified++;return true;},guide:async()=>pdf,send:async()=>{sent++;},log:()=>{}});
  for(const value of [null,"",123,"arbitrary","12345678-1234-1234-8234-123456789abc",id+"\n"]){assert.equal((await handler(request(value))).status,400);}
  const missing = new Request("https://example.com/api/materials/guide",{method:"POST",headers:{origin:config.origin,"content-type":"application/json"},body:JSON.stringify({email:"reader@example.com",website:"",turnstileToken:"fake-token"})});
  assert.equal((await handler(missing)).status,400);assert.equal(verified,0);assert.equal(sent,0);
});

test("diagnostics contain only allowlisted stage, material, code and numeric provider status",async()=>{
  const logs:DeliveryDiagnostic[]=[];
  const base={config:()=>config,verify:async()=>true,guide:async()=>pdf,send:async()=>{},log:(entry:DeliveryDiagnostic)=>{logs.push(entry);}};
  const secret = "reader@example.com token api-key request-id body contents";
  for(const [overrides,phase] of [
    [{config:()=>{throw new Error(secret);}},"configuration"],
    [{verify:async()=>{throw new Error(secret);}},"turnstile"],
    [{guide:async()=>{throw new Error(secret);}},"pdf"],
    [{send:async()=>{throw new Error(secret);}},"resend"],
  ] as const){const response=await createDeliveryHandler("guide",{...base,...overrides})(request());assert.equal(response.status,503);assert.equal(logs.at(-1)?.phase,phase);assert.ok(!(await response.text()).includes(secret));}
  for(const [providerStatus,name,status,code] of [[409,"concurrent_idempotent_requests",503,"concurrent_request"],[409,"invalid_idempotent_request",503,"payload_conflict"],[429,"rate_limit_exceeded",429,"provider_http"],[500,"api_error",503,"provider_http"]] as const){
    const handler=createDeliveryHandler("guide",{...base,send:(cfg,email)=>sendResend(cfg,email,async()=>Response.json({name,message:secret},{status:providerStatus}))});
    assert.equal((await handler(request())).status,status);assert.equal(logs.at(-1)?.code,code);assert.equal(logs.at(-1)?.providerStatus,providerStatus);
  }
  for(const name of ["TimeoutError","Error"]){
    const handler=createDeliveryHandler("guide",{...base,send:(cfg,email)=>sendResend(cfg,email,async()=>{throw new DOMException(secret,name);})});
    assert.equal((await handler(request())).status,503);assert.equal(logs.at(-1)?.code,name === "TimeoutError" ? "timeout" : "network");
  }
  const denied=createDeliveryHandler("guide",{...base,verify:async()=>false});assert.equal((await denied(request())).status,403);assert.equal(logs.at(-1)?.code,"verification_failed");
  for(const entry of logs){assert.ok(!JSON.stringify(entry).includes(secret));assert.ok(Object.keys(entry).every(key=>["material","phase","code","providerStatus"].includes(key)));}
  const brokenLogger=createDeliveryHandler("guide",{...base,send:async()=>{throw new Error(secret);},log:()=>{throw new Error(secret);}});
  assert.equal((await brokenLogger(request())).status,503);
});

test("Siteverify HTTP outage, invalid response and timeout fail closed with safe diagnostics",async()=>{
  for(const fetcher of [async()=>new Response("private",{status:503}),async()=>Response.json(null),async()=>{throw new DOMException("private","TimeoutError");}]){
    await assert.rejects(()=>verifyTurnstile(config,"fake-token","guide",fetcher),e=>e instanceof DeliveryError && !e.message.includes("private"));
  }
});

test("only our own pre-provider validation rejection carries the safe correction marker",async()=>{
  let sent=0;
  const base={config:()=>config,verify:async()=>true,guide:async()=>pdf,send:async()=>{sent++;},log:()=>{}};
  const handler=createDeliveryHandler("guide",base);
  const rejected=await handler(request("invalid"));
  assert.equal(rejected.status,400);assert.equal((await rejected.json()).code,"input_rejected");assert.equal(sent,0);
  const provider400=createDeliveryHandler("guide",{...base,send:(cfg,email)=>sendResend(cfg,email,async()=>Response.json({name:"validation_error",message:"private"},{status:400}))});
  const failed=await provider400(request());assert.equal(failed.status,503);assert.equal((await failed.json()).code,undefined);
});

for(const phase of ["resend","turnstile"] as const){
  for(const [failure,expected] of [["timeout","timeout"],["abort","timeout"],["stream","network"],["json","invalid_response"],["shape","unexpected_response"]] as const){
    test(`${phase}: response body ${failure} has a safe diagnostic category`,async()=>{
      const privateMessage="reader@example.com token api-secret response contents";
      const fetcher:typeof fetch=async()=>{
        if(failure === "json")return new Response("not valid json",{status:200});
        if(failure === "shape")return Response.json(phase === "resend" ? {id:123} : {success:"true"});
        const error=failure === "stream" ? new TypeError(privateMessage) : new DOMException(privateMessage,failure === "abort" ? "AbortError" : "TimeoutError");
        return new Response(new ReadableStream({start(controller){controller.error(error);}}),{status:200});
      };
      const logs:DeliveryDiagnostic[]=[];
      const handler=createDeliveryHandler("guide",{config:()=>config,verify:phase === "turnstile" ? (cfg,token,kind)=>verifyTurnstile(cfg,token,kind,fetcher) : async()=>true,guide:async()=>pdf,send:phase === "resend" ? (cfg,email)=>sendResend(cfg,email,fetcher) : async()=>{assert.fail("must not send");},log:entry=>{logs.push(entry);}});
      const response=await handler(request());assert.equal(response.status,503);
      assert.deepEqual(logs,[{material:"guide",phase,code:expected,providerStatus:200}]);
      assert.ok(!JSON.stringify(logs).includes(privateMessage));assert.ok(!(await response.text()).includes(privateMessage));
    });
  }
}

test("primitive, null and array bodies are unexpected structures for both providers",async()=>{
  for(const data of [null,[],"string",42]){
    const fetcher:typeof fetch=async()=>Response.json(data);
    for(const call of [()=>sendResend(config,message("guide"),fetcher),()=>verifyTurnstile(config,"fake-token","guide",fetcher)])await assert.rejects(call,e=>e instanceof DeliveryError&&e.code==="unexpected_response");
  }
});

test("only recognized provider conflict names become public retry instructions",async()=>{
  for(const [name,code] of [["concurrent_idempotent_requests","request_pending"],["invalid_idempotent_request","request_conflict"],["unknown",undefined]] as const){
    const handler=createDeliveryHandler("guide",{config:()=>config,verify:async()=>true,guide:async()=>pdf,send:(cfg,email)=>sendResend(cfg,email,async()=>Response.json({name,message:"private"},{status:409})),log:()=>{}});
    const response=await handler(request());assert.equal(response.status,503);const body=await response.json();assert.equal(body.code,code);assert.ok(!JSON.stringify(body).includes("private"));
  }
  const unreadable429:typeof fetch=async()=>new Response("invalid json",{status:429});
  await assert.rejects(()=>sendResend(config,message("guide"),unreadable429),e=>e instanceof DeliveryError&&e.status===429&&e.providerStatus===429);
});
